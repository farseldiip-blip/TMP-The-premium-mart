-- =============================================================================
-- Migration: 20250902000001_schema.sql
-- TPM — The Premium Mart — Backend Foundation
-- Tables: categories, products, store_info, contact_info, social_links
-- Admin helper: admin_users + is_admin()
-- Best practices applied:
--   schema-data-types, schema-primary-keys, schema-constraints,
--   schema-foreign-key-indexes, schema-lowercase-identifiers,
--   query-missing-indexes, query-partial-indexes, query-composite-indexes
-- No frontend files modified. Safe to run; idempotent where Postgres requires.
-- =============================================================================

-- Enable required extensions (idempotent)
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Helper: auto-update updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Helper: is_admin() — checks admin_users allowlist
-- Uses (select auth.uid()) pattern for RLS performance (security-rls-performance)
-- SECURITY DEFINER intentionally bypasses RLS on admin_users itself so the
-- function can read the allowlist even when the calling role has no direct
-- SELECT grant. The function does NOT expose data — it returns boolean only.
-- Revoke EXECUTE from anon for defense-in-depth; authenticated + service_role keep it.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
comment on table public.admin_users is 'Allowlist of admin user ids. Populated manually or via invite flow. Used by is_admin().';

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.admin_users
    where id = (select auth.uid())
  );
$$;
comment on function public.is_admin() is 'Returns true if the current authenticated user is in admin_users. SECURITY DEFINER bypasses RLS on admin_users by design.';

-- Hardening: revoke from anon, keep for authenticated/service_role
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Table: categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id bigint generated always as identity primary key,
  slug text not null,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  -- Storage references (optional): category background image
  background_image_path text,
  background_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_format_chk check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint categories_name_not_empty_chk check (char_length(btrim(name)) > 0),
  constraint categories_sort_order_chk check (sort_order >= 0)
);

-- Unique slug (lowercase snake-safe, no quotes needed)
create unique index if not exists categories_slug_key on public.categories (slug);
-- Partial index: only active categories (common public query filter)
create index if not exists categories_active_idx on public.categories (is_active) where is_active = true;
-- Sort order index for ordering
create index if not exists categories_sort_order_idx on public.categories (sort_order, name);

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

comment on table public.categories is 'Product categories (e.g., Signature Drinks, Fresh Favorites). Storage: category-backgrounds bucket.';
comment on column public.categories.background_image_path is 'Storage object path in category-backgrounds bucket (optional).';
comment on column public.categories.background_image_url is 'Public URL or cached URL for background image (optional, derived from path).';

-- ---------------------------------------------------------------------------
-- Table: products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id bigint generated always as identity primary key,
  category_id bigint references public.categories (id) on delete set null,
  slug text not null,
  name text not null,
  description text,
  price numeric(10,2),
  badge text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  -- Storage references (optional): product image
  image_path text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_slug_format_chk check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint products_name_not_empty_chk check (char_length(btrim(name)) > 0),
  constraint products_price_chk check (price is null or price >= 0),
  constraint products_sort_order_chk check (sort_order >= 0)
);

-- Unique slug
create unique index if not exists products_slug_key on public.products (slug);
-- FK index (schema-foreign-key-indexes: Postgres does NOT auto-index FKs)
create index if not exists products_category_id_idx on public.products (category_id);
-- Partial index: only active products
create index if not exists products_active_idx on public.products (is_active) where is_active = true;
-- Composite index for common query: list active products by category ordered by sort_order
create index if not exists products_category_active_sort_idx
  on public.products (category_id, is_active, sort_order) where is_active = true;
-- Convenience: sort_order + name for global listing
create index if not exists products_sort_order_idx on public.products (sort_order, name);
-- Price index for range/filter queries if needed (partial: only where price not null)
create index if not exists products_price_idx on public.products (price) where price is not null;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

comment on table public.products is 'Products / menu items. FK -> categories. Storage: product-images bucket.';
comment on column public.products.price is 'Price in store currency, numeric(10,2). Null = not priced / display only.';
comment on column public.products.image_path is 'Storage object path in product-images bucket (optional).';
comment on column public.products.badge is 'Small badge label (e.g., New, Popular) optional.';

-- ---------------------------------------------------------------------------
-- Table: store_info — singleton (enforced via single-row check)
-- ---------------------------------------------------------------------------
create table if not exists public.store_info (
  id bigint generated always as identity primary key,
  -- Singleton enforcement: only one row allowed where singleton_key = true
  singleton_key boolean not null default true,
  name text not null default 'TPM — The Premium Mart',
  tagline text,
  description text,
  address_line1 text,
  address_line2 text,
  city text,
  country text not null default 'US',
  postal_code text,
  phone text,
  phone_display text,
  email text,
  map_url text,
  logo_path text,
  logo_url text,
  showcase_video_path text,
  showcase_video_url text,
  -- Opening hours as JSONB for flexibility (e.g., { "mon_fri": "7:00-19:00", ... })
  opening_hours jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_info_singleton_uniq unique (singleton_key),
  constraint store_info_singleton_true_chk check (singleton_key = true),
  constraint store_info_email_chk check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint store_info_name_not_empty_chk check (char_length(btrim(name)) > 0)
);

-- Ensure only one row can exist (idempotent seed will upsert)
create unique index if not exists store_info_singleton_idx on public.store_info (singleton_key) where singleton_key = true;

drop trigger if exists trg_store_info_updated_at on public.store_info;
create trigger trg_store_info_updated_at
  before update on public.store_info
  for each row execute function public.set_updated_at();

comment on table public.store_info is 'Singleton: brand / store meta. One row only. Storage: store-logo + showcase-video buckets.';
comment on column public.store_info.logo_path is 'Storage path in store-logo bucket.';
comment on column public.store_info.showcase_video_path is 'Storage path in showcase-video bucket (one video).';

-- ---------------------------------------------------------------------------
-- Table: contact_info — singleton (separate from store_info per spec)
-- ---------------------------------------------------------------------------
create table if not exists public.contact_info (
  id bigint generated always as identity primary key,
  singleton_key boolean not null default true,
  phone text,
  phone_display text,
  email text,
  address text,
  address_display text,
  whatsapp text,
  map_url text,
  -- JSONB for arbitrary extra contacts (e.g., [{label, value, type}])
  extra_contacts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_info_singleton_uniq unique (singleton_key),
  constraint contact_info_singleton_true_chk check (singleton_key = true),
  constraint contact_info_email_chk check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create unique index if not exists contact_info_singleton_idx on public.contact_info (singleton_key) where singleton_key = true;

drop trigger if exists trg_contact_info_updated_at on public.contact_info;
create trigger trg_contact_info_updated_at
  before update on public.contact_info
  for each row execute function public.set_updated_at();

comment on table public.contact_info is 'Singleton: contact channels. One row only. Split from store_info per approved spec.';

-- ---------------------------------------------------------------------------
-- Table: social_links
-- ---------------------------------------------------------------------------
create table if not exists public.social_links (
  id bigint generated always as identity primary key,
  platform text not null,
  url text not null,
  handle text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_links_platform_not_empty_chk check (char_length(btrim(platform)) > 0),
  constraint social_links_url_chk check (url ~ '^https?://'),
  constraint social_links_sort_order_chk check (sort_order >= 0)
);

create index if not exists social_links_active_sort_idx
  on public.social_links (is_active, sort_order) where is_active = true;
create index if not exists social_links_platform_idx on public.social_links (platform);
create unique index if not exists social_links_platform_url_key on public.social_links (platform, url);

drop trigger if exists trg_social_links_updated_at on public.social_links;
create trigger trg_social_links_updated_at
  before update on public.social_links
  for each row execute function public.set_updated_at();

comment on table public.social_links is 'Social links (Instagram, etc.). Public read when is_active=true.';
