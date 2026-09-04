// site/admin/js/supabase.js — reuse existing Supabase project, no second auth system
// Uses the existing anon key + existing admin_users / is_admin() logic.
// Never imports service_role. RLS remains enforced; is_admin() is the source of truth.

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.8/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

let _client = null;

export function getSupabase() {
  if (_client) return _client;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("placeholder")) {
    console.warn("[TPM admin] Supabase config is placeholder — set real anon key in site/admin/js/config.js (see config.example.js)");
  }
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}
