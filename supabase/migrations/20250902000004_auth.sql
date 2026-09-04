-- =============================================================================
-- Migration: 20250902000004_auth.sql
-- Auth hardening for Admin Dashboard (no frontend changes)
-- - Public signup is DISABLED (config.toml: auth.email.enable_signup = false)
-- - Admin creation is via allowlist (public.admin_users)
-- - This file adds a secure bootstrap helper and documents the flow.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Bootstrap helper: promote the first admin via service_role.
-- The real Admin Dashboard will create invites via Supabase Dashboard or
-- service_role API. This function is a safety valve for local dev only.
-- It can ONLY be executed by service_role (no grant to anon/authenticated).
-- Usage (psql as service_role or via Supabase SQL editor as postgres):
--   select public.promote_admin_by_email('admin@tpm.cafe');
-- ---------------------------------------------------------------------------
create or replace function public.promote_admin_by_email(target_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
begin
  -- Only allow when caller is service_role or is already admin.
  -- In local dev, the SQL editor runs as postgres which bypasses RLS; this
  -- check prevents anon/authenticated from calling it even if they discover it.
  if not (
    (select current_user) in ('postgres','service_role','supabase_admin')
    or (select public.is_admin())
    or not exists (select 1 from public.admin_users) -- allow first admin bootstrap when table empty
  ) then
    raise exception 'Not authorized to promote admins';
  end if;

  select id into target_id from auth.users where email = lower(btrim(target_email)) limit 1;
  if target_id is null then
    raise exception 'No auth user found for email %', target_email;
  end if;

  insert into public.admin_users (id, email)
  values (target_id, lower(btrim(target_email)))
  on conflict (id) do update set email = excluded.email;

  return target_id;
end;
$$;

comment on function public.promote_admin_by_email(text) is 'Bootstrap: promote an existing auth user to admin by email. Callable by service_role/postgres or existing admin. First-admin case allowed when admin_users empty.';

-- Lock down: only service_role should execute this in production. In local dev postgres is also allowed via current_user check.
revoke execute on function public.promote_admin_by_email(text) from public, anon, authenticated;
grant execute on function public.promote_admin_by_email(text) to service_role;

-- ---------------------------------------------------------------------------
-- Auth notes (not SQL, enforced via config.toml and dashboard):
-- - Site URL: http://127.0.0.1:5173 (local), change to https://<prod> on deploy
-- - Email confirmations: enabled (double_confirm_changes = true)
-- - Password policy: set in Supabase Dashboard > Auth > Policies (min 8 chars, etc.)
-- - MFA: optionally enable TOTP for admins (dashboard toggle)
-- - Rate limiting: Supabase default 30 req/min per IP for auth endpoints
-- - No anon writes: validated by RLS (anon has SELECT only on active/public rows)
-- ---------------------------------------------------------------------------

-- Ensure auth schema is not exposed directly to anon
-- (Supabase default; no extra action needed here)
