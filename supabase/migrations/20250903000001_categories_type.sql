-- =============================================================================
-- Migration: 20250903000001_categories_type.sql
-- Add categories.type discriminator for Market vs Café
-- - type text NOT NULL DEFAULT 'market' (existing rows default to market)
-- - CHECK constraint allows only 'market' and 'cafe'
-- - Partial index for active category filtering by type
-- No changes to products.category_id, RLS, frontend, or admin UI.
-- =============================================================================

-- Add column if not exists; existing categories default to 'market'
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'categories' and column_name = 'type'
  ) then
    alter table public.categories add column type text not null default 'market';
  end if;
end $$;

-- Ensure default is 'market' for future inserts (idempotent)
alter table public.categories alter column type set default 'market';

-- Ensure NOT NULL (idempotent; already not null after add, but safe for manual fixes)
do $$
begin
  -- If column exists as nullable, set it not null (covers edge case where column added nullable externally)
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='categories' and column_name='type' and is_nullable='YES'
  ) then
    -- Fill any nulls with default before enforcing
    execute 'update public.categories set type = ''market'' where type is null';
    execute 'alter table public.categories alter column type set not null';
  end if;
end $$;

-- CHECK constraint: only market/cafe
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'categories_type_chk' and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories add constraint categories_type_chk check (type in ('market','cafe'));
  end if;
end $$;

-- Partial index for active filtering by type (used by dashboard / public listing)
create index if not exists categories_type_active_idx on public.categories (type) where is_active = true;

comment on column public.categories.type is 'Category discriminator: market vs cafe. Default market for existing rows; check constraint enforces only market/cafe.';
