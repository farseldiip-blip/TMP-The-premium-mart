// site/js/homeOffers.js — Homepage Offers Teaser Rail
// Reuses tpm-offers-v2 cache and validates against is_active/starts_at/ends_at.
// Shows max 4 currently valid active offers as a horizontal editorial rail.

import { getAnonSupabase as getPublicSupabase } from "./supabase.js";
import { escapeHtml } from "./offer-pricing.js";

const CACHE_KEY = "tpm-offers-v2";
const CACHE_TTL = 10 * 60 * 1000;

function escapeHtmlAttr(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function slugify(s) {
  return String(s).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function imageUrl(o) {
  if (o.image_url) return o.image_url;
  if (o.image_path) return `https://zxgnrccralodllqqcsup.supabase.co/storage/v1/object/public/offer-images/${encodeURIComponent(o.image_path)}`;
  return null;
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > CACHE_TTL) return null;
    return parsed;
  } catch (_) { return null; }
}

function writeCache(data) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), ...data })); } catch (_) { /* ignore */ }
}

function revalidate(offersList) {
  const now = Date.now();
  return (offersList || []).filter(o => {
    if (!o.is_active) return false;
    if (o.starts_at && new Date(o.starts_at).getTime() > now) return false;
    if (o.ends_at && new Date(o.ends_at).getTime() < now) return false;
    return true;
  });
}

async function loadValidOffers() {
  const supa = getPublicSupabase();
  const cached = readCache();
  let offerRows, memberRows, productRows;

  if (cached && cached.offers) {
    offerRows = cached.offers || [];
    memberRows = cached.memberships || [];
    productRows = cached.products || [];
  } else {
    const [offerRes, memberRes, productRes] = await Promise.all([
      supa.from("offers")
        .select("id,title,description,discount_type,discount_value,badge,slug,sort_order,is_active,starts_at,ends_at,image_path,image_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("title"),
      supa.from("offer_products").select("offer_id,product_id,sort_order").order("offer_id").order("sort_order"),
      supa.from("products").select("id,name,price").eq("is_active", true).order("sort_order").order("name"),
    ]);

    if (offerRes.error) throw offerRes.error;
    if (memberRes.error) throw memberRes.error;
    if (productRes.error) throw productRes.error;

    offerRows = offerRes.data || [];
    memberRows = memberRes.data || [];
    productRows = productRes.data || [];
    writeCache({ offers: offerRows, memberships: memberRows, products: productRows });
  }

  const valid = revalidate(offerRows);
  const byId = new Map((productRows || []).map(p => [p.id, p]));
  const mem = new Map();
  (memberRows || []).forEach(m => {
    if (!mem.has(m.offer_id)) mem.set(m.offer_id, []);
    mem.get(m.offer_id).push(m.product_id);
  });
  valid.forEach(o => {
    o.products = (mem.get(o.id) || [])
      .map(pid => byId.get(pid))
      .filter(Boolean)
      .map(p => ({ ...p, price: Number(p.price) }));
  });
  return valid.slice(0, 4);
}

function renderRail(offers) {
  const grid = document.getElementById("homeOffersGrid");
  if (!grid) return;
  if (!offers.length) {
    const section = document.getElementById("homeOffersSection");
    if (section) section.style.display = "none";
    return;
  }

  const cards = offers.map((o) => {
    const slug = o.slug || slugify(o.title);
    const img = imageUrl(o);
    const badge = o.badge && String(o.badge).trim() ? String(o.badge).trim() : "";
    return `
      <a href="offers.html#offer-${slug}" class="home-offer-teaser" data-slug="${escapeHtmlAttr(slug)}">
        ${img
          ? `<img class="home-offer-teaser-img" src="${escapeHtml(img)}" alt="${escapeHtml(o.title)}" width="600" height="400" loading="lazy" decoding="async" />`
          : `<span class="home-offer-teaser-blank" aria-hidden="true"></span>`}
        ${badge ? `<span class="home-offer-teaser-badge">${escapeHtml(badge)}</span>` : ""}
        <h3 class="home-offer-teaser-title">${escapeHtml(o.title)}</h3>
      </a>`;
  }).join("");

  grid.innerHTML = cards;
}

function setupPrevNext() {
  const rail = document.getElementById("homeOffersRail");
  const prev = document.getElementById("homeOffersPrev");
  const next = document.getElementById("homeOffersNext");
  if (!rail || !prev || !next) return;

  function scroll(dir) {
    const scrollAmount = rail.offsetWidth * 0.6;
    rail.scrollBy({ left: dir * scrollAmount, behavior: "smooth" });
  }
  prev.addEventListener("click", () => scroll(-1));
  next.addEventListener("click", () => scroll(1));

  // Hide arrows when not needed
  const observer = new MutationObserver(() => {
    prev.style.display = rail.scrollLeft <= 8 ? "none" : "flex";
    next.style.display = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 8 ? "none" : "flex";
  });
  observer.observe(rail, { childList: true, subtree: true, characterData: true });
  setTimeout(() => observer.disconnect(), 2000);
}

export async function init() {
  try {
    const offers = await loadValidOffers();
    const section = document.getElementById("homeOffersSection");
    if (!section) return;

    if (!offers.length) {
      section.style.display = "none";
      return;
    }

    renderRail(offers);
    setupPrevNext();
  } catch (err) {
    console.error("[TPM homeOffers] Failed", err?.message || String(err));
    const section = document.getElementById("homeOffersSection");
    if (section) section.style.display = "none";
  }
}


