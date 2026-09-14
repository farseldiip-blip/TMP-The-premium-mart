// site/js/catalog-cache.js — client-side cache for the PUBLIC catalog only
// (active categories + products). Rendered output, never auth/session/token
// or private data. sessionStorage (shared across tabs, cleared on tab close
// of the session) + an in-memory mirror for the current page.
//
// Nothing here performs network I/O: callers keep their existing Supabase
// request with its 15s timeout + single retry, and call writeCatalogCache
// only after a successful fetch.

// Bumped to v2 when categories gained homepage_order, so cached entries saved
// without the field are ignored instead of rendering an empty homepage preview.
const KEY = "tpm-catalog-v2";
const TTL_MS = 10 * 60 * 1000; // 10 minutes

// In-memory mirror for this page only. Falls back to this automatically
// when sessionStorage is unavailable (private mode, disabled storage, …).
let memory = null; // { savedAt, categories, products } | null

function isValidPayload(v) {
  return !!v && typeof v.savedAt === "number" && Array.isArray(v.categories) && Array.isArray(v.products);
}

function readSession() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidPayload(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

// Returns { categories, products, fresh } or null when nothing usable exists.
// `fresh` is false for expired-but-present entries (usable as last resort).
export function readCatalogCache() {
  try {
    const now = Date.now();
    if (memory && isValidPayload(memory)) {
      return { categories: memory.categories, products: memory.products, fresh: (now - memory.savedAt) < TTL_MS };
    }
    const stored = readSession();
    if (stored) {
      memory = stored;
      return { categories: stored.categories, products: stored.products, fresh: (now - stored.savedAt) < TTL_MS };
    }
  } catch (_) {
    // fall through to null — callers use the network path
  }
  return null;
}

export function writeCatalogCache(categories, products) {
  const entry = { savedAt: Date.now(), categories: categories || [], products: products || [] };
  memory = entry;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(entry));
  } catch (_) {
    // storage unavailable — memory mirror still serves this page
  }
}

// Structural compare so background refreshes re-render only on real change.
export function isCatalogChanged(prev, next) {
  try {
    return JSON.stringify(prev || null) !== JSON.stringify(next || null);
  } catch (_) {
    return true;
  }
}
