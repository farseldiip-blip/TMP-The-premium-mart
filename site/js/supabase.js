// site/js/supabase.js — Public Supabase client (read-only, anon key, RLS)
// Reuses same anon key as admin; public can only read active categories/products.

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.8/+esm";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

let _client = null;

export function getPublicSupabase() {
  if (_client) return _client;
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
