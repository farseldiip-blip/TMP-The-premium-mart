// site/admin/js/config.example.js — TPM Admin Dashboard
// Copy to config.js and set your Supabase project values.
// DO NOT commit config.js with real secrets. Keep service_role out of the browser.
// Frontend uses ONLY the publishable anon key.

export const SUPABASE_URL = "http://127.0.0.1:54321";
export const SUPABASE_ANON_KEY = "REPLACE_WITH_YOUR_SUPABASE_ANON_KEY";

// For local dev: get keys via `npx supabase status` after `npx supabase start`
// For cloud: https://supabase.com/dashboard/project/<project-id>/settings/api
// Never expose SUPABASE_SERVICE_ROLE_KEY in the browser.
