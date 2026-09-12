-- =============================================================================
-- Migration: 20250904000002_recommendation_images_storage.sql
-- TPM — The Premium Mart — Product Recommendations image storage
-- Bucket: recommendation-images (PRIVATE). Holds visitor-uploaded
-- recommendation images under pending/ until moderated. Pending files are
-- never publicly readable; on approve the Dashboard copies the file into
-- the existing public product-images bucket (no new public surface).
-- Follows supabase/migrations/20250902000002_storage.sql conventions.
-- Does NOT touch existing buckets, table RLS, or frontend/Dashboard code.
-- =============================================================================

-- Create the private bucket idempotently (storage.buckets is source of truth)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recommendation-images', 'recommendation-images', false, 2097152,
  array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage objects RLS is enabled via Supabase defaults; explicit policies below.
-- Do not use FORCE RLS on storage.objects — keep default.

-- ---------------------------------------------------------------------------
-- Public visitors (anon): INSERT ONLY into recommendation-images.
-- No anon SELECT / UPDATE / DELETE: pending images stay private.
-- Size (2 MiB) and MIME allowlist are enforced by the bucket itself.
-- ---------------------------------------------------------------------------
do $$
declare
  b text;
begin
  foreach b in array array['recommendation-images'] loop
    execute format('drop policy if exists %I on storage.objects', 'Allow anon insert ' || b);
    execute format(
      'create policy %I on storage.objects for insert to anon with check (bucket_id = %L)',
      'Allow anon insert ' || b, b
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Admins: full management via existing public.is_admin()
-- ---------------------------------------------------------------------------
do $$
declare
  b text;
begin
  foreach b in array array['recommendation-images'] loop
    execute format('drop policy if exists %I on storage.objects', 'Allow admin read ' || b);
    execute format(
      'create policy %I on storage.objects for select to authenticated using (bucket_id = %L and (select public.is_admin()))',
      'Allow admin read ' || b, b
    );

    execute format('drop policy if exists %I on storage.objects', 'Allow admin insert ' || b);
    execute format(
      'create policy %I on storage.objects for insert to authenticated with check (bucket_id = %L and (select public.is_admin()))',
      'Allow admin insert ' || b, b
    );

    execute format('drop policy if exists %I on storage.objects', 'Allow admin update ' || b);
    execute format(
      'create policy %I on storage.objects for update to authenticated using (bucket_id = %L and (select public.is_admin())) with check (bucket_id = %L and (select public.is_admin()))',
      'Allow admin update ' || b, b, b
    );

    execute format('drop policy if exists %I on storage.objects', 'Allow admin delete ' || b);
    execute format(
      'create policy %I on storage.objects for delete to authenticated using (bucket_id = %L and (select public.is_admin()))',
      'Allow admin delete ' || b, b
    );
  end loop;
end $$;

-- NOTE: Do not COMMENT ON TABLE storage.buckets — Supabase-managed table requires owner; not permitted.
