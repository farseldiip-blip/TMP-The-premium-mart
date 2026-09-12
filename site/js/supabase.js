// site/js/supabase.js — Public Supabase client (read-only, anon key, RLS)
// Reuses same anon key as admin; public can only read active categories/products.

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.8/+esm";

const SUPABASE_URL = "https://zxgnrccralodllqqcsup.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_fW_5SpuIANYlbHtdnUt6vQ_B0tvkFKA";

let _client = null;

export function getPublicSupabase() {
  if (_client) return _client;
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return _client;
}

let _anonClient = null;

// Anon-only client for public data reads: never restores a stored session,
// so a stale/expired admin login in localStorage (same origin, same project)
// can't replace the anon key and fail RLS on desktop. Always uses anon key.
export function getAnonSupabase() {
  if (_anonClient) return _anonClient;
  _anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      // Isolate from the session-aware client (auth.js): a distinct storage
      // key so the two GoTrue instances never share auth state under one key.
      storageKey: "tpm-public-anon-readonly",
    },
  });
  return _anonClient;
}
