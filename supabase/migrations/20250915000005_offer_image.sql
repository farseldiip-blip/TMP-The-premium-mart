-- =============================================================================
-- Migration: 20250915000005_offer_image.sql
-- Add image_path / image_url to offers table for admin-uploaded offer images.
-- Uses existing Supabase Storage architecture (offers-images bucket).
-- Does NOT modify product/category schema.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Storage bucket for offer images (idempotent)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('offer-images', 'offer-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage objects RLS: public read, admin-only write
do $$
begin
  execute format('drop policy if exists %I on storage.objects', 'Allow public read offer-images');
  execute format(
    'create policy %I on storage.objects for select to anon, authenticated using (bucket_id = %L)',
    'Allow public read offer-images', 'offer-images'
  );

  execute format('drop policy if exists %I on storage.objects', 'Allow admin insert offer-images');
  execute format(
    'create policy %I on storage.objects for insert to authenticated with check (bucket_id = %L and (select public.is_admin()))',
    'Allow admin insert offer-images', 'offer-images'
  );

  execute format('drop policy if exists %I on storage.objects', 'Allow admin update offer-images');
  execute format(
    'create policy %I on storage.objects for update to authenticated using (bucket_id = %L and (select public.is_admin())) with check (bucket_id = %L and (select public.is_admin()))',
    'Allow admin update offer-images', 'offer-images', 'offer-images'
  );

  execute format('drop policy if exists %I on storage.objects', 'Allow admin delete offer-images');
  execute format(
    'create policy %I on storage.objects for delete to authenticated using (bucket_id = %L and (select public.is_admin()))',
    'Allow admin delete offer-images', 'offer-images'
  );
end $$;

-- ---------------------------------------------------------------------------
-- Table: offers — add image columns
-- ---------------------------------------------------------------------------
alter table public.offers
  add column if not exists image_path text,
  add column if not exists image_url text;

-- Update comment
comment on column public.offers.image_path is 'Storage object path in offer-images bucket (optional). Admin-uploaded image for the offer.';
comment on column public.offers.image_url is 'Public URL for the offer image (optional, derived from path).';

-- Ensure existing offers have null image fields (no migration data needed)
update public.offers set image_path = null, image_url = null where image_path is not null or image_url is not null;

-- ---------------------------------------------------------------------------
-- Grants (least privilege)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select on public.offers, public.offer_products to anon, authenticated;
grant insert, update, delete on public.offers, public.offer_products to authenticated;
grant usage, select on sequence public.offers_id_seq to authenticated;
