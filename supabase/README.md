# Supabase — TPM The Premium Mart

Backend foundation. **No frontend files were touched.** The static site in `site/` is not yet connected.

## What was created

- `config.toml` — local Supabase config (API 54321, DB 54322, Studio 54323, Inbucket 54324)
- `migrations/20250902000001_schema.sql` — tables, constraints, indexes, triggers
- `migrations/20250902000002_storage.sql` — 4 public buckets + storage RLS
- `migrations/20250902000003_rls.sql` — Row Level Security (public read / admin write)
- `migrations/20250902000004_auth.sql` — auth hardening + `promote_admin_by_email()`
- `seed.sql` — idempotent sample data (9 categories, 14 products, singletons)
- `client.example.js` — sample JS client (not wired to site)
- `README.md` — this file

## Tables

| Table | PK | Purpose | Storage |
|-------|----|---------|---------|
| `categories` | `bigint identity` | Product categories | `category-backgrounds` (optional) |
| `products` | `bigint identity` | Menu items, FK → categories | `product-images` (optional) |
| `store_info` | `bigint identity` + singleton guard | Brand meta (one row) | `store-logo` + `showcase-video` |
| `contact_info` | `bigint identity` + singleton guard | Contact channels (one row) | — |
| `social_links` | `bigint identity` | Instagram etc. | — |
| `admin_users` | `uuid → auth.users` | Allowlist for `is_admin()` | — |

## Relationships

- `products.category_id → categories.id ON DELETE SET NULL` (deleting a category keeps products, nulls the FK)
- `admin_users.id → auth.users.id ON DELETE CASCADE`
- `store_info` / `contact_info` are singleton tables (`singleton_key = true` unique). Seed upserts keep exactly one row.
- FK columns are indexed (`products_category_id_idx`) per `schema-foreign-key-indexes`.

## Indexes (Supabase best practices)

- **Unique**: `categories.slug`, `products.slug`, `social_links(platform,url)`, singleton guards
- **Partial active-only**: `categories_active_idx where is_active=true`, `products_active_idx`, `social_links_active_sort_idx`
- **Composite**: `products_category_active_sort_idx (category_id, is_active, sort_order) where is_active=true` for `WHERE category_id = $1 AND is_active AND ORDER BY sort_order`
- **Sort**: `categories_sort_order_idx`, `products_sort_order_idx`
- All indexes use `IF NOT EXISTS` for idempotency.

## Storage buckets (public read, admin write)

| Bucket | Public | Size limit | Mime filter |
|--------|--------|------------|-------------|
| `product-images` | true | 5 MiB | jpeg/png/webp/avif/svg |
| `category-backgrounds` | true | 5 MiB | jpeg/png/webp/avif/svg |
| `store-logo` | true | 2 MiB | jpeg/png/webp/avif/svg |
| `showcase-video` | true | 50 MiB | mp4/webm/quicktime |

Policies: `Allow public read <bucket>` → `anon, authenticated`; `Allow admin insert/update/delete <bucket>` → `authenticated where is_admin()` (wrapped as `(select public.is_admin())` for RLS perf). `showcase-video` is **ONE file** — DB singleton `store_info.showcase_video_path` + Dashboard replace; **15 s max duration enforced at application/Dashboard layer**.

## Auth

- **Signup disabled** (`config.toml` `enable_signup = false`) — admins are invite-only.
- **Confirmations enabled** (`double_confirm_changes = true`).
- **Admin model**: `admin_users` allowlist + `SECURITY DEFINER is_admin()` (revoked from `anon`/`public`, granted to `authenticated, service_role`). RLS policies use `(select public.is_admin())` caching.
- **First admin bootstrap** (local):
  ```sql
  -- 1. Create user via Studio > Auth > Users  or  supabase auth sign-up
  -- 2. Promote (run as service_role / postgres):
  select public.promote_admin_by_email('admin@tpm.cafe');
  ```
- Future dashboard will use email+password, optional TOTP MFA (enable in dashboard).

## RLS

| Table | Public read | Admin write |
|-------|-------------|-------------|
| `categories` | `is_active=true` | `ALL where is_admin()` |
| `products` | `is_active=true` | `ALL where is_admin()` |
| `store_info` | `true` (singleton) | `ALL where is_admin()` |
| `contact_info` | `true` (singleton) | `ALL where is_admin()` |
| `social_links` | `is_active=true` | `ALL where is_admin()` |
| `admin_users` | none (self-read + admin-read) | admin insert/delete |

Grants: `anon, authenticated` get `USAGE` + `SELECT` on app tables; `authenticated` gets `INSERT/UPDATE/DELETE` (gated by RLS). `service_role` bypasses RLS.

## Local dev

```bash
# 1. Install CLI (once)
npm i -g supabase  # or: npx supabase --version

# 2. Start (creates local Postgres, Auth, Storage, Studio)
npx supabase start

# 3. Apply migrations + seed
npx supabase db reset   # runs migrations + seed.sql

# 4. Open Studio
# http://127.0.0.1:54323

# 5. Verify (requires DATABASE_URL from `npx supabase status`)
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "
  select 'categories' as tbl, count(*) from categories
  union all select 'products', count(*) from products
  union all select 'store_info', count(*) from store_info
  union all select 'contact_info', count(*) from contact_info
  union all select 'social_links', count(*) from social_links;
"

# 6. Env — copy .env.example to .env when needed (gitignored)
```

Cloud deploy: `npx supabase link --project-ref <id>` then `npx supabase db push` (migrations run in order).

## Connecting the frontend (intentionally NOT done)

When ready, create a separate branch that:
- Adds `site/js/supabase-client.js` using `SUPABASE_URL` / `SUPABASE_ANON_KEY`
- Reads via `select where is_active=true` queries
- Never exposes `service_role` in the browser

Do not bundle keys in git; use env injection at build/deploy.

## Files not changed

All `site/**` files (HTML/CSS/JS), `AGENTS.md`, root `README.md` aside from this Supabase addition — verified via `git status`.
