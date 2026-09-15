// site/js/offers.js — Public Offers Listing
// Loads active, currently-running offers via RLS (anon).
// Uses getAnonSupabase() from supabase.js and sessionStorage caching.

import { getAnonSupabase as getPublicSupabase } from "./supabase.js";
import { escapeHtml, priceOffer, cardPriceHtml, modalSummaryHtml, productRowsHtml } from "./offer-pricing.js";

const CACHE_KEY = "tpm-offers-v2";
const CACHE_TTL = 10 * 60 * 1000;

function slugify(s) {
  return String(s).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

let modalEls = null;
let modalOpenSlug = null;
let lastTrigger = null;

function ensureModal() {
  if (modalEls) return modalEls;
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="offer-modal-backdrop" id="offerModalBackdrop" hidden>
      <div class="offer-modal" role="dialog" aria-modal="true" aria-labelledby="offerModalTitle" id="offerModal">
        <button type="button" class="offer-modal-close" id="offerModalClose" aria-label="Close offer details">×</button>
        <div class="offer-modal-media" id="offerModalMedia"></div>
        <div class="offer-modal-body" id="offerModalBody"></div>
      </div>
    </div>`;
  const backdrop = wrap.firstElementChild;
  document.body.appendChild(backdrop);
  const modal = backdrop.querySelector("#offerModal");
  const media = backdrop.querySelector("#offerModalMedia");
  const body = backdrop.querySelector("#offerModalBody");
  const close = backdrop.querySelector("#offerModalClose");
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeOfferModal(); });
  close.addEventListener("click", closeOfferModal);
  backdrop.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); closeOfferModal(); return; }
    if (e.key !== "Tab") return;
    const f = [...modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-"])')]
      .filter(el => !el.disabled && el.getClientRects().length);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  modalEls = { backdrop, modal, media, body, close };
  return modalEls;
}

function openOfferModal(o) {
  if (!o) return;
  const els = ensureModal();
  const pricing = priceOffer(o);
  const slug = o.slug || slugify(o.title);
  const discount = fmtDiscount(o);
  const status = statusLabel(o);
  const statusCls = statusClass(o);
  const img = imageUrl(o);
  const seal = discount || "Offer";
  els.media.innerHTML = `
    ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(o.title)}" width="1000" height="625" decoding="async" />` : `<div class="offer-noimg" role="img" aria-label="${escapeHtmlAttr(o.title)}"><span class="offer-noimg-value">${seal}</span><span class="offer-noimg-mark" aria-hidden="true">TPM</span></div>`}
    ${discount ? `<span class="offer-seal">${discount}</span>` : ""}
    ${statusCls !== "live" ? `<span class="offer-status offer-status--${statusCls}">${status}</span>` : ""}`;
  els.body.innerHTML = `
    ${o.badge ? `<p class="offer-kicker">${escapeHtml(o.badge)}</p>` : ""}
    <h3 class="offer-modal-title" id="offerModalTitle">${escapeHtml(o.title)}</h3>
    ${cardPriceHtml(pricing)}
    ${o.description ? `<p class="offer-modal-desc">${escapeHtml(o.description)}</p>` : ""}
    <p class="offer-card-dates">
      <span class="offer-date">${fmtDate(o.starts_at)}</span>
      <span class="offer-arrow" aria-hidden="true">→</span>
      <span class="offer-date">${fmtDate(o.ends_at)}</span>
    </p>
    ${pricing.count ? `<p class="offer-modal-subtitle">Included products</p><div class="offer-card-products">${productRowsHtml(pricing.lines)}</div>${modalSummaryHtml(pricing)}` : ""}`;
  lastTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modalOpenSlug = slug;
  els.backdrop.hidden = false;
  document.body.dataset.offerModalScroll = document.body.style.overflow || "";
  document.body.style.overflow = "hidden";
  const main = document.getElementById("main");
  if (main) main.setAttribute("aria-hidden", "true");
  try { els.close.focus({ preventScroll: true }); } catch (_) { try { els.close.focus(); } catch (_) {} }
}

function closeOfferModal() {
  if (!modalOpenSlug && !modalEls) return;
  modalOpenSlug = null;
  if (modalEls) modalEls.backdrop.hidden = true;
  const main = document.getElementById("main");
  if (main) main.removeAttribute("aria-hidden");
  try {
    document.body.style.overflow = document.body.dataset.offerModalScroll || "";
    delete document.body.dataset.offerModalScroll;
  } catch (_) {}
  if (window.location.hash.startsWith("#offer-")) {
    try { history.replaceState(null, "", window.location.pathname + window.location.search); } catch (_) {}
  }
  if (lastTrigger && document.contains(lastTrigger)) {
    try { lastTrigger.focus({ preventScroll: true }); } catch (_) {}
  }
  lastTrigger = null;
}

function openOfferBySlug(slug, push) {
  const o = (offers || []).find(x => (x.slug || slugify(x.title)) === slug);
  if (!o) return;
  if (push) { try { history.pushState(null, "", `#offer-${slug}`); } catch (_) {} }
  openOfferModal(o);
}

const HIGHLIGHT_FLAG = "tpm-offer-highlight-only";

function spotlightCard(slug) {
  const card = document.querySelector(`.offer-card[data-slug="${slug}"]`);
  if (!card) return;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  card.classList.add("offer-card--spotlight");
  try { card.focus({ preventScroll: true }); } catch (_) { try { card.focus(); } catch (_) {} }
  setTimeout(() => card.classList.remove("offer-card--spotlight"), 2600);
}

function openHashOffer() {
  const hash = window.location.hash;
  if (!hash) return;
  const match = hash.match(/^#offer-(.+)$/);
  if (!match) return;
  const slug = decodeURIComponent(match[1]);
  let highlightOnly = false;
  try {
    if (sessionStorage.getItem(HIGHLIGHT_FLAG) === slug) {
      sessionStorage.removeItem(HIGHLIGHT_FLAG);
      highlightOnly = true;
    }
  } catch (_) {}
  if (highlightOnly) {
    spotlightCard(slug);
    return;
  }
  openOfferBySlug(slug, false);
}

function fmtDiscount(o) {
  if (!o) return "";
  if (o.discount_type === "percent" && o.discount_value != null) return `${trimNum(o.discount_value)}% OFF`;
  return "";
}

function trimNum(n) {
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : String(v);
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusLabel(o) {
  const now = Date.now();
  if (!o.is_active) return "Off";
  if (o.starts_at && new Date(o.starts_at).getTime() > now) return "Scheduled";
  if (o.ends_at && new Date(o.ends_at).getTime() < now) return "Expired";
  return "Live";
}

function statusClass(o) {
  const now = Date.now();
  if (!o.is_active) return "off";
  if (o.starts_at && new Date(o.starts_at).getTime() > now) return "scheduled";
  if (o.ends_at && new Date(o.ends_at).getTime() < now) return "expired";
  return "live";
}

function escapeHtmlAttr(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function imageUrl(o) {
  if (o.image_url) return o.image_url;
  if (o.image_path) return `https://zxgnrccralodllqqcsup.supabase.co/storage/v1/object/public/offer-images/${encodeURIComponent(o.image_path)}`;
  return null;
}

function readOffersCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > CACHE_TTL) return null;
    return parsed;
  } catch (_) { return null; }
}

function writeOffersCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), ...data }));
  } catch (_) { /* storage unavailable */ }
}

function clearOffersCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch (_) { /* ignore */ }
}

function revalidateOffers(offersList) {
  const now = Date.now();
  return (offersList || []).filter(o => {
    if (!o.is_active) return false;
    if (o.starts_at && new Date(o.starts_at).getTime() > now) return false;
    if (o.ends_at && new Date(o.ends_at).getTime() < now) return false;
    return true;
  });
}

let offers = [];
let products = [];

function renderOffers() {
  const grid = document.getElementById("offersGrid");
  const empty = document.getElementById("offersEmpty");
  if (!grid) return;

  if (!offers.length) {
    grid.innerHTML = "";
    if (empty) empty.style.display = "";
    return;
  }
  if (empty) empty.style.display = "none";

  grid.innerHTML = offers.map((o) => {
    const slug = o.slug || slugify(o.title);
    const status = statusLabel(o);
    const statusCls = statusClass(o);
    const discount = fmtDiscount(o);
    const startStr = fmtDate(o.starts_at);
    const endStr = fmtDate(o.ends_at);
    const img = imageUrl(o);
    const seal = discount || "Offer";

    const mediaHtml = img
      ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(o.title)}" width="800" height="500" loading="lazy" decoding="async" />`
      : `<div class="offer-noimg" role="img" aria-label="${escapeHtmlAttr(o.title)}"><span class="offer-noimg-value">${seal}</span><span class="offer-noimg-mark" aria-hidden="true">TPM</span></div>`;

    const fullDesc = o.description || "";
    const pricing = priceOffer(o);

    return `
      <a href="offers.html#offer-${slug}" class="offer-card" data-slug="${escapeHtmlAttr(slug)}">
        <div class="offer-card-media">
          ${mediaHtml}
          ${discount ? `<span class="offer-seal">${discount}</span>` : ""}
          ${statusCls !== "live" ? `<span class="offer-status offer-status--${statusCls}">${status}</span>` : ""}
        </div>
        <div class="offer-card-body">
          ${o.badge ? `<p class="offer-kicker">${escapeHtml(o.badge)}</p>` : ""}
          <h3 class="offer-card-title">${escapeHtml(o.title)}</h3>
          ${cardPriceHtml(pricing)}
          ${fullDesc ? `<p class="offer-card-desc">${escapeHtml(fullDesc)}</p>` : ""}
          <p class="offer-card-dates">
            <span class="offer-date">${startStr}</span>
            <span class="offer-arrow" aria-hidden="true">→</span>
            <span class="offer-date">${endStr}</span>
          </p>
          <span class="offer-cta">View offer <span aria-hidden="true">→</span></span>
        </div>
      </a>`;
  }).join("");
}

function setupDeepLink() {
  openHashOffer();
  window.addEventListener("hashchange", () => {
    if (window.location.hash.startsWith("#offer-")) openHashOffer();
    else closeOfferModal();
  });
}

function setupCardClicks() {
  const grid = document.getElementById("offersGrid");
  if (!grid || grid.dataset.modalBound) return;
  grid.dataset.modalBound = "1";
  grid.addEventListener("click", (e) => {
    if (e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const card = e.target.closest(".offer-card");
    if (!card || !card.dataset.slug) return;
    e.preventDefault();
    openOfferBySlug(card.dataset.slug, true);
  });
}

async function loadOffers() {
  try {
    const supa = getPublicSupabase();

    const cached = readOffersCache();
    let offerData, memberData, productData;

    if (cached) {
      offerData = { data: cached.offers || [], error: null };
      memberData = { data: cached.memberships || [], error: null };
      productData = { data: cached.products || [], error: null };
    } else {
      [offerData, memberData, productData] = await Promise.all([
supa.from("offers")
           .select("id,title,description,discount_type,discount_value,badge,starts_at,ends_at,is_active,slug,sort_order,image_path,image_url")
           .eq("is_active", true)
           .order("sort_order", { ascending: true })
           .order("title"),
        supa.from("offer_products").select("offer_id,product_id,sort_order").order("offer_id").order("sort_order"),
        supa.from("products").select("id,name,slug,price,is_active,category_id,sort_order,categories(id,name,type)").eq("is_active", true).order("sort_order").order("name"),
      ]);

      if (!offerData.error && !memberData.error && !productData.error) {
        writeOffersCache({
          offers: offerData.data || [],
          memberships: memberData.data || [],
          products: productData.data || []
        });
      }
    }

    if (offerData.error) throw offerData.error;
    if (memberData.error) throw memberData.error;
    if (productData.error) throw productData.error;

    const rawOffers = revalidateOffers((offerData.data || []).map(o => ({
      ...o,
      products: []
    })));
    offers = rawOffers;
    products = productData.data || [];

    const memberships = new Map();
    (memberData.data || []).forEach(m => {
      if (!memberships.has(m.offer_id)) memberships.set(m.offer_id, []);
      memberships.get(m.offer_id).push({ product_id: m.product_id, sort_order: m.sort_order });
    });

    offers.forEach(o => {
      const ids = (memberships.get(o.id) || []).sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
      o.products = ids.map(m => {
        const p = products.find(pr => pr.id === m.product_id);
        return p ? { ...p, price: Number(p.price) } : { id: m.product_id, name: `#${m.product_id}`, price: 0 };
      });
    });

    renderOffers();
    setupDeepLink();
  } catch (err) {
    console.error("[TPM offers] Load failed", err);
    const grid = document.getElementById("offersGrid");
    if (grid) grid.innerHTML = `<div class="admin-empty"><strong>Failed to load offers</strong><br>${escapeHtml(err.message || "Unknown error")}</div>`;
  }
}

async function init() {
  setupCardClicks();
  await loadOffers();
}

init();
