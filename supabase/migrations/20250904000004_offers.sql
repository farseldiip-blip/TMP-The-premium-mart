-- =============================================================================
-- Migration: 20250904000004_offers.sql
-- TPM — The Premium Mart — Offers foundation (promotional layer)
-- Tables: offers, offer_products (junction)
-- Design notes:
-- - Offers are a promotional layer INDEPENDENT of departments. Products keep
--   their existing category/department; membership is via offer_products only.
-- - categories.type, categories.sort_order, categories.homepage_order and
--   products.category_id are untouched by this migration.
-- - Offer validity is query/render-time only (is_active + starts_at/ends_at);
--   NOTHING here mutates is_active on expiry. No cron, no workers.
-- - IDs follow the project convention (bigint identity, like categories and
--   products) so foreign keys type-match. No existing objects modified.
-- - Idempotent where Postgres requires. Safe to run; non-destructive.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: offers
-- ---------------------------------------------------------------------------
create table if not exists public.offers (
  id bigint generated always as identity primary key,
  slug text not null,
  title text not null,
  description text,
  badge text,
  discount_type text,
  discount_value numeric(10,2),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_slug_format_chk check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint offers_title_not_empty_chk check (char_length(btrim(title)) > 0),
  constraint offers_sort_order_chk check (sort_order >= 0),
  constraint offers_discount_type_chk check (discount_type is null or discount_type in ('percent', 'fixed', 'price', 'badge')),
  -- Per-type value rules: percent 0–100, fixed/price >= 0, badge and empty
  -- offers carry no value. No pricing calculations in SQL.
  constraint offers_discount_value_chk check (
    (discount_type is null and discount_value is null)
    or (discount_type = 'percent' and discount_value is not null and discount_value >= 0 and discount_value <= 100)
    or (discount_type in ('fixed', 'price') and discount_value is not null and discount_value >= 0)
    or (discount_type = 'badge' and discount_value is null)
  ),
  constraint offers_dates_chk check (starts_at is null or ends_at is null or ends_at >= starts_at)
);

-- Unique slug (lowercase snake-safe, no quotes needed)
create unique index if not exists offers_slug_key on public.offers (slug);
-- Active-only ordering support (public valid-offer listing)
create index if not exists offers_active_sort_idx on public.offers (is_active, sort_order) where is_active = true;

drop trigger if exists trg_offers_updated_at on public.offers;
create trigger trg_offers_updated_at
  before update on public.offers
  for each row execute function public.set_updated_at();

comment on table public.offers is 'Promotional offers (e.g., 20% OFF, Weekend Deal). Independent layer: member products keep their category/department via offer_products.';
comment on column public.offers.discount_type is 'One of percent/fixed/price/badge, or NULL for an empty neutral offer (then discount_value must also be NULL).';
comment on column public.offers.discount_value is 'Meaning depends on discount_type; validated per-type by offers_discount_value_chk. No pricing math in SQL.';

-- ---------------------------------------------------------------------------
-- Table: offer_products — membership junction (one product, many offers)
-- ---------------------------------------------------------------------------
create table if not exists public.offer_products (
  offer_id bigint not null references public.offers (id) on delete cascade,
  product_id bigint not null references public.products (id) on delete cascade,
  sort_order integer not null default 0,
  constraint offer_products_pkey primary key (offer_id, product_id),
  constraint offer_products_sort_order_chk check (sort_order >= 0)
);

-- FK index (schema-foreign-key-indexes: Postgres does NOT auto-index FKs).
-- offer_id is already leftmost in the composite PK; product_id needs its own.
create index if not exists offer_products_product_id_idx on public.offer_products (product_id);

comment on table public.offer_products is 'Offer membership: which products participate in which offer. Composite PK prevents duplicate membership. Cascades remove memberships when an offer or product is deleted.';

-- ---------------------------------------------------------------------------
-- RLS — same model as categories/products: public reads, admin writes
-- ---------------------------------------------------------------------------
alter table public.offers enable row level security;
alter table public.offer_products enable row level security;

-- Public (anon + authenticated): read ONLY currently valid active offers
drop policy if exists "offers_public_read" on public.offers;
create policy "offers_public_read"
  on public.offers for select
  to anon, authenticated
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

drop policy if exists "offers_admin_all" on public.offers;
create policy "offers_admin_all"
  on public.offers for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Public (anon + authenticated): read ONLY memberships of currently visible
-- offers. No public INSERT/UPDATE/DELETE policies: visitors can never modify
-- offers or memberships.
drop policy if exists "offer_products_public_read" on public.offer_products;
create policy "offer_products_public_read"
  on public.offer_products for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.offers o
      where o.id = offer_id
        and o.is_active = true
        and (o.starts_at is null or o.starts_at <= now())
        and (o.ends_at is null or o.ends_at >= now())
    )
  );

drop policy if exists "offer_products_admin_all" on public.offer_products;
create policy "offer_products_admin_all"
  on public.offer_products for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Grants (least privilege — RLS remains the security boundary)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select on public.offers, public.offer_products to anon, authenticated;
grant insert, update, delete on public.offers, public.offer_products to authenticated;
-- Identity sequence for admin inserts (older global sequence grants predate
-- this table, so grant its sequence explicitly).
grant usage, select on sequence public.offers_id_seq to authenticated;
