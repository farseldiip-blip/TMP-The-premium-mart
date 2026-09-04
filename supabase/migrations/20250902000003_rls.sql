-- =============================================================================
-- Migration: 20250902000003_rls.sql
-- Row Level Security for TPM — The Premium Mart
-- Policy model:
--   Public (anon + authenticated) can READ active/public rows.
--   Only authenticated admins (public.is_admin()) can INSERT/UPDATE/DELETE.
--   Singletons (store_info, contact_info) are public read (single row).
-- Best practices:
--   security-rls-basics, security-rls-performance (wrap auth.uid() in select),
--   security-privileges (least privilege, revoke public defaults is NOT done here
--   because Supabase anon/authenticated roles rely on grants; RLS is the gate).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS on all app tables + admin_users
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.store_info enable row level security;
alter table public.contact_info enable row level security;
alter table public.social_links enable row level security;
alter table public.admin_users enable row level security;

-- Do NOT force RLS on app tables for table owners beyond default; keep standard.

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read"
  on public.categories for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "categories_admin_all" on public.categories;
create policy "categories_admin_all"
  on public.categories for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
  on public.products for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all"
  on public.products for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Store_info (singleton) — public read all (single row, always public)
-- ---------------------------------------------------------------------------
drop policy if exists "store_info_public_read" on public.store_info;
create policy "store_info_public_read"
  on public.store_info for select
  to anon, authenticated
  using (true);

drop policy if exists "store_info_admin_all" on public.store_info;
create policy "store_info_admin_all"
  on public.store_info for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Contact_info (singleton) — public read all
-- ---------------------------------------------------------------------------
drop policy if exists "contact_info_public_read" on public.contact_info;
create policy "contact_info_public_read"
  on public.contact_info for select
  to anon, authenticated
  using (true);

drop policy if exists "contact_info_admin_all" on public.contact_info;
create policy "contact_info_admin_all"
  on public.contact_info for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Social_links — public read only active
-- ---------------------------------------------------------------------------
drop policy if exists "social_links_public_read" on public.social_links;
create policy "social_links_public_read"
  on public.social_links for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "social_links_admin_all" on public.social_links;
create policy "social_links_admin_all"
  on public.social_links for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Admin_users — only admins can read; no public read. Self-read allowed for bootstrapping?
-- For RLS performance, is_admin() bypasses RLS via SECURITY DEFINER, so these
-- policies do not affect that function. They protect direct table access.
-- ---------------------------------------------------------------------------
drop policy if exists "admin_users_admin_read" on public.admin_users;
create policy "admin_users_admin_read"
  on public.admin_users for select
  to authenticated
  using ((select public.is_admin()));

-- Allow authenticated users to read their own row (for bootstrap check without being admin yet)
drop policy if exists "admin_users_self_read" on public.admin_users;
create policy "admin_users_self_read"
  on public.admin_users for select
  to authenticated
  using (id = (select auth.uid()));

-- Only existing admins can insert new admins (invite flow)
drop policy if exists "admin_users_admin_insert" on public.admin_users;
create policy "admin_users_admin_insert"
  on public.admin_users for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "admin_users_admin_delete" on public.admin_users;
create policy "admin_users_admin_delete"
  on public.admin_users for delete
  to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Grants (least privilege — rely on RLS; keep anon/authenticated usage)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select on public.categories, public.products, public.store_info, public.contact_info, public.social_links to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.store_info, public.contact_info, public.social_links to authenticated;
grant select, insert, delete on public.admin_users to authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Service_role bypasses RLS, no extra grants needed.

-- ---------------------------------------------------------------------------
-- Indexes to accelerate RLS (columns used in policies)
-- Already created in schema migration, but re-assert for audit:
--   categories.is_active, products.is_active, social_links.is_active
--   admin_users.id (PK already)
-- ---------------------------------------------------------------------------
