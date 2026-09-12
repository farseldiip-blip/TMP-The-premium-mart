-- =============================================================================
-- Migration: 20250904000001_product_recommendations.sql
-- TPM — The Premium Mart — Product Recommendations foundation
-- Table: public.product_recommendations (anonymous visitor suggestions,
-- moderated by admins; only approved rows are publicly readable).
-- Reuses public.set_updated_at() and public.is_admin() — no new helpers.
-- Storage bucket intentionally NOT created here (Step 2).
-- Idempotent where Postgres requires. No existing objects modified.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: product_recommendations
-- ---------------------------------------------------------------------------
create table if not exists public.product_recommendations (
  id bigint generated always as identity primary key,
  recommendation_text text not null,
  -- Private-bucket object path (nullable). Buckets/keys enforced at upload;
  -- DB additionally requires the pending/ prefix so approved public URLs
  -- can never be spoofed through this column.
  image_path text,
  -- Public URL, set ONLY on approve after the file is copied into the
  -- existing public product-images bucket. Never set by visitors.
  image_url text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  constraint product_recommendations_text_chk check (
    char_length(btrim(recommendation_text)) > 0
    and char_length(recommendation_text) <= 500
  ),
  constraint product_recommendations_status_chk check (
    status in ('pending', 'approved', 'rejected')
  ),
  constraint product_recommendations_image_path_chk check (
    image_path is null or image_path like 'pending/%'
  )
);

drop trigger if exists trg_product_recommendations_updated_at on public.product_recommendations;
create trigger trg_product_recommendations_updated_at
  before update on public.product_recommendations
  for each row execute function public.set_updated_at();

comment on table public.product_recommendations is 'Anonymous visitor product suggestions. Only approved rows are publicly readable. Images: private recommendation-images bucket (pending/) copied to product-images on approve.';

-- ---------------------------------------------------------------------------
-- Indexes: moderation queue + public approved listing
-- ---------------------------------------------------------------------------
create index if not exists product_recommendations_pending_idx
  on public.product_recommendations (status, created_at) where status = 'pending';

create index if not exists product_recommendations_approved_idx
  on public.product_recommendations (status, created_at) where status = 'approved';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.product_recommendations enable row level security;

-- Public (anon): read ONLY approved rows
drop policy if exists "product_recommendations_public_read" on public.product_recommendations;
create policy "product_recommendations_public_read"
  on public.product_recommendations for select
  to anon
  using (status = 'approved');

-- Authenticated visitors: same public read (approved only), no moderation
drop policy if exists "product_recommendations_auth_read" on public.product_recommendations;
create policy "product_recommendations_auth_read"
  on public.product_recommendations for select
  to authenticated
  using (status = 'approved');

-- Public (anon): submit ONLY as pending (DB forces pending even if the
-- client sends another status); text/path shape re-checked here
drop policy if exists "product_recommendations_anon_insert" on public.product_recommendations;
create policy "product_recommendations_anon_insert"
  on public.product_recommendations for insert
  to anon
  with check (
    status = 'pending'
    and char_length(btrim(recommendation_text)) > 0
    and char_length(recommendation_text) <= 500
    and (image_path is null or image_path like 'pending/%')
  );

-- No UPDATE/DELETE policies for anon or ordinary authenticated users:
-- visitors can never edit or remove submissions.

-- Admins: full moderation via existing is_admin()
drop policy if exists "product_recommendations_admin_all" on public.product_recommendations;
create policy "product_recommendations_admin_all"
  on public.product_recommendations for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Grants (least privilege — RLS remains the security boundary)
-- ---------------------------------------------------------------------------
grant select, insert on public.product_recommendations to anon;
grant select, insert, update, delete on public.product_recommendations to authenticated;
grant usage, select on sequence public.product_recommendations_id_seq to anon, authenticated;
