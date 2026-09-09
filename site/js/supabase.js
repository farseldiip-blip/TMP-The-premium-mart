// site/js/supabase.js — Public Supabase client (read-only, anon key, RLS)
// Reuses same anon key as admin; public can only read active categories/products.

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.8/+esm";

const SUPABASE_URL = "https://zxgnrccralodllqqcsup.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4Z25yY2NyYWxvZGxscXFjc3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMTc5MDEsImV4cCI6MjEwMzg5MzkwMX0.IGuqpT0RTbzd6qYPzyuXWIhXsqlVQRjxd7dq1bohh-c";

let _client = null;

export function getPublicSupabase() {
  if (_client) return _client;
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return _client;
}
