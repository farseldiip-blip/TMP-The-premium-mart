-- =============================================================================
-- Migration: 20250904000003_categories_homepage_order.sql
-- Add categories.homepage_order for homepage tpm-preview priority
-- - homepage_order integer NULL (optional; NULL = excluded from homepage preview)
-- - Lower numbers appear first (1 before 2, etc.)
-- - sort_order is untouched and keeps controlling Market/Café ordering
-- - RLS/grants are table-level, so no policy changes are required
-- - No data changes; existing rows default to NULL (excluded until set)
-- =============================================================================

-- Add column if not exists; existing categories stay NULL (excluded from preview)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'categories' and column_name = 'homepage_order'
  ) then
    alter table public.categories add column homepage_order integer;
  end if;
end $$;

-- Optional values only: NULL or positive (>= 1)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'categories_homepage_order_chk' and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories add constraint categories_homepage_order_chk check (homepage_order is null or homepage_order >= 1);
  end if;
end $$;

comment on column public.categories.homepage_order is 'Homepage tpm-preview priority (nullable). Lower numbers appear first; NULL excludes the category from the homepage preview. sort_order still controls Market/Café ordering.';
