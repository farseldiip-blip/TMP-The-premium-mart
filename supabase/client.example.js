// supabase/client.example.js — TPM The Premium Mart
// Example Supabase client for future Admin Dashboard. NOT wired to site/ yet.
// Keep service_role out of the browser. Use anon for public reads, authenticated+is_admin for writes.
//
// Usage (when frontend connection is approved):
//   import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
//   import { getSupabase } from "./client.example.js"

const SUPABASE_URL = typeof process !== 'undefined' ? process.env?.SUPABASE_URL : 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = typeof process !== 'undefined' ? process.env?.SUPABASE_ANON_KEY : '';

// Do NOT import/create client at top-level if keys missing — guard for static site build.
export function getSupabase(createClient) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Missing SUPABASE_URL / SUPABASE_ANON_KEY');
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
    db: { schema: 'public' },
    // Best practice: use connection pooling via Supabase pooler (conn-pooling)
    // Frontend uses anon pooler; server-side admin actions use service_role via env only.
  });
}

// Public read examples (RLS allows anon to read active rows)
export async function fetchActiveCategories(supabase) {
  return supabase
    .from('categories')
    .select('id, slug, name, description, background_image_url, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
}

export async function fetchActiveProductsByCategory(supabase, categoryId) {
  return supabase
    .from('products')
    // cursor-based pagination pattern (data-pagination) — start with limit 20, then where id > lastId
    .select('id, slug, name, description, price, badge, image_url, sort_order')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
    .limit(20);
}

export async function fetchStoreInfo(supabase) {
  return supabase.from('store_info').select('*').limit(1).maybeSingle();
}

// Admin write example (requires authenticated + is_admin())
export async function adminUpsertCategory(supabase, row) {
  // row: { slug, name, ... }
  return supabase.from('categories').upsert(row, { onConflict: 'slug' }).select().single();
}

// Storage helpers
export function publicUrlFor(supabase, bucket, path) {
  if (!path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
