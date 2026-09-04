-- =============================================================================
-- Migration: 20250902000002_storage.sql
-- Storage buckets for TPM — The Premium Mart
-- Buckets (public):
--   product-images       — product images (optional)
--   category-backgrounds — category backgrounds (optional)
--   store-logo           — store logo
--   showcase-video       — one showcase video
-- Buckets are public for read; write restricted to authenticated admins via
-- storage.objects RLS policies (see 20250902000003_rls.sql).
-- Best practices: least privilege, public read via storage policies, no anon writes.
-- =============================================================================

-- Create buckets idempotently (storage.buckets is the source of truth)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml']),
  ('category-backgrounds', 'category-backgrounds', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml']),
  ('store-logo', 'store-logo', true, 2097152, array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml']),
  ('showcase-video', 'showcase-video', true, 52428800, array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage objects RLS is enabled via Supabase defaults; we add explicit policies below.
-- Note: storage.objects policies live in storage schema. We create them here for
-- single-migration completeness, but they are also documented in the RLS migration.

-- Ensure RLS is enabled on storage.objects (Supabase enables it by default; safe to re-assert)
-- Do not use FORCE RLS on storage.objects — keep default.

-- ---------------------------------------------------------------------------
-- Helper: reuse public.is_admin() from previous migration
-- ---------------------------------------------------------------------------

-- Public read for each bucket (anon + authenticated)
do $$
declare
  b text;
begin
  foreach b in array array['product-images','category-backgrounds','store-logo','showcase-video'] loop
    -- Drop if exists then create (idempotent pattern for storage policies)
    execute format('drop policy if exists %I on storage.objects', 'Allow public read ' || b);
    execute format(
      'create policy %I on storage.objects for select to anon, authenticated using (bucket_id = %L)',
      'Allow public read ' || b, b
    );
  end loop;
end $$;

-- Admin-only writes (insert / update / delete)
do $$
declare
  b text;
begin
  foreach b in array array['product-images','category-backgrounds','store-logo','showcase-video'] loop
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

-- Showcase-video guard: ONE file only — DB enforces via singleton store_info
-- (store_info.showcase_video_path holds the single path); bucket holds single object
-- and Dashboard replaces (upsert) on upload. Duration ≤15s enforced at
-- application/Dashboard layer (client validation + optional storage hook).
-- No hard row limit on storage.objects; app-layer is source of truth.
-- NOTE: Do not COMMENT ON TABLE storage.buckets — Supabase-managed table requires owner; not permitted.
