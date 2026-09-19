-- =============================================================================
-- Migration: 20250917000001_offers_optional_title.sql
-- Allow truly image-only Offers: offers.title becomes optional (NULL allowed).
-- Existing rows keep their titles; new rows may set title = NULL.
-- Does NOT touch products, categories, Market/Café, or Recommendations.
-- Does NOT change discount behavior, RLS, or any other offers column.
-- =============================================================================

-- 1. Allow NULL title (was NOT NULL)
alter table public.offers alter column title drop not null;

-- 2. Relax non-empty check to permit NULL (still forbids empty/blank strings)
alter table public.offers drop constraint if exists offers_title_not_empty_chk;
alter table public.offers add constraint offers_title_not_empty_chk
  check (title is null or char_length(btrim(title)) > 0);

comment on column public.offers.title is 'Optional offer name. NULL means image-only (or otherwise untitled) offer; when present it must be non-blank.';
