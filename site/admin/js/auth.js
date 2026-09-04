// site/admin/js/auth.js — authentication + authorization using existing Supabase Auth + is_admin()
// Reuses existing admin_users table and public.is_admin() SECURITY DEFINER function.
// Do not duplicate or bypass it. Every protected check calls the DB function.

import { getSupabase } from "./supabase.js";

/**
 * Returns { user, isAdmin, session } or throws.
 * Uses existing is_admin() — wrapped as (select auth.uid()) internally for perf (security-rls-performance).
 */
export async function getAuthState() {
  const supabase = getSupabase();
  const { data: { session }, error: sessErr } = await supabase.auth.getSession();
  if (sessErr) throw sessErr;
  if (!session?.user) return { user: null, isAdmin: false, session: null };

  // Call existing DB helper — do not re-implement allowlist logic
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error) throw error;
  return { user: session.user, isAdmin: !!isAdmin, session };
}

export async function requireAdmin({ redirectToLogin = true } = {}) {
  const state = await getAuthState();
  if (!state.user) {
    if (redirectToLogin) window.location.replace("./login.html");
    return { ...state, allowed: false, reason: "unauthenticated" };
  }
  if (!state.isAdmin) {
    return { ...state, allowed: false, reason: "not_admin" };
  }
  return { ...state, allowed: true };
}

export async function signOutAndRedirect() {
  const supabase = getSupabase();
  await supabase.auth.signOut();
  // Clear any cached is_admin result and go to login
  window.location.replace("./login.html");
}

// Keep session fresh and protect against stale tabs
export function watchAuth(handlers = {}) {
  const supabase = getSupabase();
  return supabase.auth.onAuthStateChange((event, session) => {
    if (handlers.onChange) handlers.onChange(event, session);
    // If user signed out in another tab, force guarded pages to re-check
    if (event === "SIGNED_OUT" && handlers.redirectOnSignOut) {
      window.location.replace("./login.html");
    }
  });
}
