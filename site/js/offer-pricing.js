// site/js/offer-pricing.js — Centralized offer pricing engine.
// Percentage discounts ONLY (single source of truth for cards and modal).
// Rules:
// - percent: discount applied ONCE to the SUBTOTAL of selected products.
//   discountAmount = subtotal * percentage / 100; finalTotal = subtotal - discountAmount.
// - Product rows show original prices only (no per-product discounted prices).
// - badge/none/legacy: no price calculation (rows show original prices only).
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

function fmtPct(n) {
  const v = num(n);
  return Number.isInteger(v) ? String(v) : String(parseFloat(v.toFixed(2)));
}

export function priceOffer(offer) {
  const isPercent = (offer.discount_type || null) === "percent";
  const d = num(offer.discount_value);
  const attached = (offer.products || []).map(p => ({ name: p.name, price: num(p.price) }));
  const priced = attached.filter(p => p.price > 0);
  const originalTotal = round2(priced.reduce((s, p) => s + p.price, 0));
  const base = {
    type: isPercent ? "percent" : null,
    pct: isPercent ? d : null,
    count: attached.length,
    pricedCount: priced.length,
    originalTotal,
    finalTotal: originalTotal,
    savings: 0,
    lines: attached.map(p => ({ name: p.name, orig: p.price, final: null, save: 0 })),
    card: null,
  };
  if (!isPercent || !priced.length) return base;
  base.savings = round2(originalTotal * d / 100);
  base.finalTotal = round2(Math.max(0, originalTotal - base.savings));
  if (base.savings <= 0) return base;
  base.card = priced.length === 1
    ? { mode: "single", orig: priced[0].price, now: base.finalTotal, save: base.savings }
    : { mode: "totals", orig: originalTotal, total: base.finalTotal, save: base.savings };
  return base;
}

export function cardPriceHtml(summary) {
  const c = summary.card;
  if (!c) return "";
  const now = c.mode === "totals" ? c.total : c.now;
  return `<p class="offer-price"><s class="offer-price-was">${formatMoney(c.orig)}</s><span class="offer-price-now">${formatMoney(now)}</span>${c.save > 0 ? `<span class="offer-price-save">Save ${formatMoney(c.save)}</span>` : ""}</p>`;
}

export function modalSummaryHtml(summary) {
  if (summary.type !== "percent" || summary.pricedCount <= 1) return "";
  return `<div class="offer-modal-totals">
    <p class="offer-modal-totals-row"><span>Original total</span><s>${formatMoney(summary.originalTotal)}</s></p>
    <p class="offer-modal-totals-row"><span>Discount</span><strong>${fmtPct(summary.pct)}%</strong></p>
    ${summary.savings > 0 ? `<p class="offer-modal-totals-row"><span>You save</span><strong>${formatMoney(summary.savings)}</strong></p>` : ""}
    <p class="offer-modal-totals-row"><span>Offer total</span><strong>${formatMoney(summary.finalTotal)}</strong></p></div>`;
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
