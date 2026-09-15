-- =============================================================================
-- Migration: 20250916000001_percent_only_offers.sql
-- Simplify offers to percentage discounts only.
-- Existing rows are test-only data: incompatible (non-percent) test offers are
-- removed (cascades to public.offer_products via FK). No legacy compat needed.
-- Does NOT touch products, categories, or any other table.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Clean incompatible test data (cascades to memberships)
-- ---------------------------------------------------------------------------
delete from public.offers
where discount_type is not null and discount_type <> 'percent';

-- ---------------------------------------------------------------------------
-- 2. Lock discount_type to percent (NULL still means "no discount")
-- ---------------------------------------------------------------------------
alter table public.offers drop constraint if exists offers_discount_type_chk;
alter table public.offers add constraint offers_discount_type_chk
  check (discount_type is null or discount_type = 'percent');

alter table public.offers drop constraint if exists offers_discount_value_chk;
alter table public.offers add constraint offers_discount_value_chk check (
  (discount_type is null and discount_value is null)
  or (discount_type = 'percent' and discount_value is not null and discount_value >= 0 and discount_value <= 100)
);

-- ---------------------------------------------------------------------------
-- 3. Document the simplified model
-- ---------------------------------------------------------------------------
comment on column public.offers.discount_type is 'Percentage-only discount type (or NULL for no discount). Legacy fixed/price/badge types removed; badge text lives in the separate badge column.';
comment on column public.offers.discount_value is 'Percentage value 0–100 when discount_type is percent; NULL otherwise. No pricing math in SQL.';
