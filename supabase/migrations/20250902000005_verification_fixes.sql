-- =============================================================================
-- Migration: 20250902000005_verification_fixes.sql
-- Verification-only fixes — no frontend changes, no destructive reset
-- 1. Ensure products.description exists as nullable text (approved schema)
-- 2. Document showcase-video ONE file + 15s app-layer enforcement
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. products.description — approved nullable text
-- Already present in 20250902000001_schema.sql:107 as `description text` (nullable),
-- but re-assert idempotently for verification compliance.
-- No data loss, no NOT NULL, no default — safe on local and cloud.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='products' and column_name='description'
  ) then
    alter table public.products add column description text;
  end if;
end $$;

comment on column public.products.description is 'Approved field — nullable text — product description for menu/admin. No NOT NULL constraint; empty allowed.';

-- ---------------------------------------------------------------------------
-- 2. Showcase video — ONE file, 15s max duration enforced at app/Dashboard layer
-- DB enforces ONE file via singleton store_info (one row) with single path columns.
-- Storage bucket `showcase-video` holds the object; app replaces (upsert) rather than
-- appending. Duration limit (≤15s) is validated client-side (Dashboard) and
-- optionally via upload hook — NOT via DB trigger, to keep DB agnostic of media probing.
-- Documented here for audit and for future storage hook.
-- ---------------------------------------------------------------------------
comment on column public.store_info.showcase_video_path is 'Storage path in showcase-video bucket. ONE file only — enforced via singleton store_info (single row) + Dashboard upsert/replace. Max duration 15s enforced at application/Dashboard layer (client validation + optional storage hook).';
comment on column public.store_info.showcase_video_url is 'Public URL for showcase video (derived from showcase_video_path). ONE video only; 15s max enforced at application layer.';

-- Clarify bucket intent (storage.buckets comment already set; update to include 15s)
-- NOTE: Do not COMMENT ON TABLE storage.buckets — Supabase-managed table requires owner; not permitted.
-- Intent was: 'TPM buckets: product-images, category-backgrounds, store-logo, showcase-video — showcase-video is ONE file, 15s max, enforced at application/Dashboard layer (see store_info.showcase_video_path).'
