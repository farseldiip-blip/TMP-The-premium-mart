// site/js/offer-pricing.js — Centralized offer pricing engine.
// Single source of truth for compact cards, teaser, and modal.
// Business rules:
// - percent: % off EACH selected product; totals are sums of per-product finals.
// - fixed: ONE EGP subtraction from the OFFER TOTAL; never per product.
// - price: special final price per selected product (established behavior —
//   schema + Admin do not distinguish per-product vs per-offer scope).
// - badge/none: no price calculation.
// Finals never negative; money rounded to 2dp and displayed cleanly.

export function formatMoney(n) {
  const v = Math.round(Number(n) * 100) / 100;
  return `EGP ${Number.isNaN(v) ? "0" : parseFloat(v.toFixed(2))}`;
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function num(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function round2(n) {
  return Math.round(num(n) * 100) / 100;
}

export function priceOffer(offer) {
  const t = offer.discount_type || null;
  const d = num(offer.discount_value);
  const attached = (offer.products || []).map(p => ({ name: p.name, price: num(p.price) }));
  const priced = attached.filter(p => p.price > 0);
  const originalTotal = round2(priced.reduce((s, p) => s + p.price, 0));
  const base = {
    type: t,
    count: attached.length,
    pricedCount: priced.length,
    originalTotal,
    finalTotal: originalTotal,
    savings: 0,
    lines: attached.map(p => ({ name: p.name, orig: p.price, final: null, save: 0 })),
    card: null,
  };
  if (!t || t === "badge" || !priced.length) {
    if (t === "badge" && attached.length > 1) base.card = { mode: "count", count: attached.length };
    return base;
  }
  if (t === "percent") {
    base.lines = attached.map(p => {
      if (p.price <= 0) return { name: p.name, orig: p.price, final: null, save: 0 };
      const final = round2(Math.max(0, p.price - (p.price * d / 100)));
      return { name: p.name, orig: p.price, final, save: round2(Math.max(0, p.price - final)) };
    });
    base.finalTotal = round2(base.lines.reduce((s, l) => s + (l.final == null ? 0 : l.final), 0));
    base.savings = round2(Math.max(0, originalTotal - base.finalTotal));
    if (base.savings <= 0) {
      if (priced.length > 1) base.card = { mode: "count", count: priced.length };
      return base;
    }
    base.card = priced.length === 1
      ? { mode: "single", orig: priced[0].price, now: base.finalTotal, save: base.savings }
      : { mode: "totals", orig: originalTotal, total: base.finalTotal, save: base.savings, labeled: false };
    return base;
  }
  if (t === "fixed") {
    base.finalTotal = round2(Math.max(0, originalTotal - d));
    base.savings = round2(Math.max(0, originalTotal - base.finalTotal));
    base.card = { mode: "totals", orig: originalTotal, total: base.finalTotal, save: base.savings, labeled: true };
    return base;
  }
  // price: special final price per selected product (established behavior).
  base.lines = attached.map(p => {
    if (p.price <= 0) return { name: p.name, orig: p.price, final: null, save: 0 };
    const final = round2(Math.max(0, d));
    return { name: p.name, orig: p.price, final, save: round2(Math.max(0, p.price - final)) };
  });
  base.finalTotal = round2(base.lines.reduce((s, l) => s + (l.final == null ? 0 : l.final), 0));
  base.savings = round2(Math.max(0, originalTotal - base.finalTotal));
  if (priced.length === 1) {
    base.card = { mode: "single", orig: priced[0].price, now: base.finalTotal, save: base.savings };
  } else if (base.savings > 0) {
    base.card = { mode: "totals", orig: originalTotal, total: base.finalTotal, save: base.savings, labeled: false };
  } else {
    base.card = { mode: "count", count: priced.length };
  }
  return base;
}

export function cardPriceHtml(summary) {
  const c = summary.card;
  if (!c) return "";
  if (c.mode === "count") {
    return `<p class="offer-price"><span class="offer-price-count">${c.count} selected products</span></p>`;
  }
  if (c.mode === "totals" && c.labeled) {
    return `<p class="offer-price offer-price--totals">
      <span class="offer-price-row"><span class="offer-price-label">Original total</span><s class="offer-price-was">${formatMoney(c.orig)}</s></span>
      <span class="offer-price-row"><span class="offer-price-label">Offer total</span><span class="offer-price-now">${formatMoney(c.total)}</span></span>
      ${c.save > 0 ? `<span class="offer-price-save">Save ${formatMoney(c.save)}</span>` : ""}</p>`;
  }
  const now = c.mode === "totals" ? c.total : c.now;
  return `<p class="offer-price"><s class="offer-price-was">${formatMoney(c.orig)}</s><span class="offer-price-now">${formatMoney(now)}</span>${c.save > 0 ? `<span class="offer-price-save">Save ${formatMoney(c.save)}</span>` : ""}</p>`;
}

export function modalSummaryHtml(summary) {
  const show = summary.pricedCount > 0 && (summary.type === "fixed" || summary.pricedCount > 1);
  if (!show) return "";
  return `<div class="offer-modal-totals">
    <p class="offer-modal-totals-row"><span>Original total</span><s>${formatMoney(summary.originalTotal)}</s></p>
    <p class="offer-modal-totals-row"><span>Offer total</span><strong>${formatMoney(summary.finalTotal)}</strong></p>
    ${summary.savings > 0 ? `<p class="offer-modal-totals-row"><span>You save</span><strong>${formatMoney(summary.savings)}</strong></p>` : ""}</div>`;
}

export function productRowsHtml(lines) {
  return lines.map(l => {
    const showFinal = l.final != null && l.final < l.orig;
    return `<div class="offer-product">
      <span class="offer-product-name">${escapeHtml(l.name)}</span>
      <div class="offer-product-prices">
        ${showFinal ? `<span class="offer-product-orig">${formatMoney(l.orig)}</span><span class="offer-product-disc">${formatMoney(l.final)}</span>` : `<span class="offer-product-price">${formatMoney(l.orig)}</span>`}
      </div>
    </div>${showFinal && l.save > 0 ? `<p class="offer-product-save">Save ${formatMoney(l.save)}</p>` : ""}`;
  }).join("");
}
