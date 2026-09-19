// site/admin/js/offers.js — Offers Management (promotional layer)
// Offers are independent of Market/Café departments: products keep their
// category/department; membership is via offer_products only.
// Uses existing Supabase client + is_admin() RLS. No service_role.
// Image support via offer-images bucket (admin upload only).

import { getSupabase } from "./supabase.js";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input) {
  if (!input) return "";
  return String(input)
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function validateSlug(slug) {
  return SLUG_RE.test(slug);
}

function randomSlugSuffix(len = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  try {
    const buf = new Uint32Array(len);
    crypto.getRandomValues(buf);
    for (let i = 0; i < len; i++) s += chars[buf[i] % chars.length];
  } catch {
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function resolveSlug(name, kind, existingSlug) {
  const base = slugify(name || "");
  if (base) return { slug: base, fallback: false };
  if (existingSlug && SLUG_RE.test(existingSlug)) return { slug: existingSlug, fallback: false };
  return { slug: `${kind}-${randomSlugSuffix()}`, fallback: true };
}

async function ensureUniqueSlug(supa, table, slug, editingId) {
  let candidate = slug;
  for (let i = 0; i < 5; i++) {
    let q = supa.from(table).select("id").eq("slug", candidate);
    if (editingId) q = q.neq("id", editingId);
    const { data, error } = await q.limit(1);
    if (error) throw error;
    if (!data || !data.length) return candidate;
    candidate = `${slug}-${i + 2}`;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toast(msg, kind = "ok") {
  let stack = document.getElementById("adminToastStack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "adminToastStack";
    stack.className = "admin-toast-stack";
    document.body.appendChild(stack);
  }
  const t = document.createElement("div");
  t.className = `admin-toast ${kind}`;
  t.innerHTML = `<span style="flex:1">${escapeHtml(msg)}</span><button aria-label="Dismiss">×</button>`;
  t.querySelector("button").addEventListener("click", () => t.remove());
  stack.appendChild(t);
  setTimeout(() => { if (t.parentNode) t.remove(); }, 4200);
}

function trimNum(n) {
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : String(v);
}

function fmtDiscount(o) {
  if (!o) return "—";
  if (o.discount_type === "percent" && o.discount_value != null) return `${trimNum(o.discount_value)}% OFF`;
  return "—";
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function offerStatus(o) {
  const now = Date.now();
  if (!o.is_active) return { key: "off", label: "Off" };
  if (o.starts_at && new Date(o.starts_at).getTime() > now) return { key: "scheduled", label: "Scheduled" };
  if (o.ends_at && new Date(o.ends_at).getTime() < now) return { key: "expired", label: "Expired" };
  return { key: "live", label: "Live" };
}

function statusBadge(o) {
  const st = offerStatus(o);
  const cls = st.key === "live" ? "admin-badge admin-badge--active" : "admin-badge admin-badge--inactive";
  return `<span class="${cls}">${st.label}</span>`;
}

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// State
let offers = [];
let memberships = new Map();
let products = [];
let filtered = [];
let editingId = null;
let searchTerm = "";
let statusFilter = "all";
let pickerSearch = "";
let pickerSelected = [];
let imgRemoved = false;
let originalImgPath = null;
let originalImgUrl = null;
let pendingImgPreviewUrl = null;

const els = {};

export async function initOffers() {
  els.wrap = document.getElementById("offerWrap");
  els.tbody = document.getElementById("offerTbody");
  els.cards = document.getElementById("offerCards");
  els.stats = document.getElementById("offerStats");
  els.search = document.getElementById("offerSearch");
  els.statusFilter = document.getElementById("offerStatusFilter");
  els.addBtn = document.getElementById("offerAddBtn");
  els.refreshBtn = document.getElementById("offerRefreshBtn");
  els.modal = document.getElementById("offerModal");
  els.modalClose = document.getElementById("offerModalClose");
  els.modalCancel = document.getElementById("offerModalCancel");
  els.modalTitle = document.getElementById("offerModalTitle");
  els.form = document.getElementById("offerForm");
  els.fTitle = document.getElementById("offerTitle");
  els.fDesc = document.getElementById("offerDesc");
  els.fBadge = document.getElementById("offerBadge");
  els.fValue = document.getElementById("offerDiscountValue");
  els.fStarts = document.getElementById("offerStartsAt");
  els.fEnds = document.getElementById("offerEndsAt");
  els.fActive = document.getElementById("offerActive");
  els.fSort = document.getElementById("offerSortOrder");
  els.fId = document.getElementById("offerId");
  // Image fields
  els.fImgFile = document.getElementById("offerImgFile");
  els.fImgPreview = document.getElementById("offerImgPreview");
  els.fImgRemove = document.getElementById("offerImgRemove");
  // Product picker
  els.pickerSearch = document.getElementById("offerProductSearch");
  els.pickerPool = document.getElementById("offerProductPool");
  els.pickerSelected = document.getElementById("offerProductSelected");
  els.addSelectedBtn = document.getElementById("offerAddSelected");
  // Delete modal
  els.deleteModal = document.getElementById("offerDeleteModal");
  els.deleteName = document.getElementById("offerDeleteName");
  els.deleteCancel = document.getElementById("offerDeleteCancel");
  els.deleteConfirm = document.getElementById("offerDeleteConfirm");
  els.deleteClose = document.getElementById("offerDeleteClose");

  if (!els.wrap || !els.tbody) {
    console.warn("[TPM offers] container not found");
    return;
  }

  els.search?.addEventListener("input", (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    applyFilter();
  });
  els.statusFilter?.addEventListener("change", (e) => {
    statusFilter = e.target.value;
    applyFilter();
  });
  els.addBtn?.addEventListener("click", () => openModal(null));
  els.refreshBtn?.addEventListener("click", () => loadAll());
  els.modalClose?.addEventListener("click", closeModal);
  els.modalCancel?.addEventListener("click", closeModal);
  els.modal?.querySelector(".admin-modal-overlay")?.addEventListener("click", closeModal);
  els.deleteCancel?.addEventListener("click", closeDeleteModal);
  els.deleteClose?.addEventListener("click", closeDeleteModal);
  els.deleteModal?.querySelector(".admin-modal-overlay")?.addEventListener("click", closeDeleteModal);
  els.deleteConfirm?.addEventListener("click", confirmDelete);

  els.form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleSubmit();
  });

  els.fImgFile?.addEventListener("change", handleFileSelect);
  els.fImgRemove?.addEventListener("click", handleImgRemove);

  els.pickerSearch?.addEventListener("input", (e) => {
    pickerSearch = e.target.value.trim().toLowerCase();
    renderPicker();
  });

  els.addSelectedBtn?.addEventListener("click", addSelectedProducts);

  els.pickerPool?.addEventListener("change", handlePoolChange);
  els.pickerSelected?.addEventListener("click", handleSelectedClick);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (els.deleteModal?.classList.contains("open")) closeDeleteModal();
      else if (els.modal?.classList.contains("open")) closeModal();
    }
  });

  els.tbody?.addEventListener("click", handleTableClick);
  els.cards?.addEventListener("click", handleTableClick);

  await loadAll();
}

function handleTableClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const id = Number(btn.dataset.id);
  if (!id) return;
  const offer = offers.find((o) => o.id === id);
  if (!offer) return;
  if (action === "edit") openModal(offer);
  else if (action === "delete") openDeleteModal(offer);
}

export async function loadAll() {
  if (els.tbody) els.tbody.innerHTML = `<tr><td colspan="9" class="admin-empty">Loading…</td></tr>`;
  if (els.cards) els.cards.innerHTML = "";
  try {
    const supabase = getSupabase();
    const [offerRes, memberRes, prodRes] = await Promise.all([
      supabase.from("offers").select("*").order("sort_order").order("title"),
      supabase.from("offer_products").select("offer_id,product_id,sort_order").order("offer_id").order("sort_order"),
      supabase.from("products").select("id,name,slug,price,is_active,category_id,sort_order,categories(id,name,type)").order("sort_order").order("name"),
    ]);
    if (offerRes.error) throw offerRes.error;
    if (memberRes.error) throw memberRes.error;
    if (prodRes.error) throw prodRes.error;
    offers = offerRes.data || [];
    memberships = new Map();
    (memberRes.data || []).forEach((m) => {
      if (!memberships.has(m.offer_id)) memberships.set(m.offer_id, []);
      memberships.get(m.offer_id).push({ product_id: m.product_id, sort_order: m.sort_order });
    });
    memberships.forEach((list) => list.sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0)));
    products = prodRes.data || [];
    applyFilter();
  } catch (err) {
    console.error("[TPM offers] load failed", err);
    toast(err.message || "Failed to load offers", "err");
    if (els.tbody) els.tbody.innerHTML = `<tr><td colspan="9" class="admin-empty">Failed to load: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function memberCount(id) {
  return (memberships.get(id) || []).length;
}

function applyFilter() {
  filtered = offers.filter((o) => {
    const title = (o.title || "").toLowerCase();
    const slug = (o.slug || "").toLowerCase();
    const matchesSearch =
      !searchTerm ||
      title.includes(searchTerm) ||
      slug.includes(searchTerm) ||
      (o.description || "").toLowerCase().includes(searchTerm) ||
      (o.badge || "").toLowerCase().includes(searchTerm);
    const matchesStatus = statusFilter === "all" || offerStatus(o).key === statusFilter;
    return matchesSearch && matchesStatus;
  });
  render();
}

function productName(id) {
  const p = products.find((p) => p.id === id);
  return p ? p.name : `#${id}`;
}

function render() {
  if (els.stats) {
    const total = offers.length;
    const live = offers.filter((o) => offerStatus(o).key === "live").length;
    els.stats.innerHTML = `
      <span>${total} total</span>
      <span>${live} live</span>
      <span>${filtered.length} shown</span>
    `;
  }
  const ovStat = document.getElementById("statOffers");
  if (ovStat) ovStat.textContent = offers.length;

  if (!filtered.length) {
    if (els.tbody) els.tbody.innerHTML = `<tr><td colspan="9" class="admin-empty"><strong>No offers</strong><br>Click "Add Offer" to create the first one.</td></tr>`;
    if (els.cards) els.cards.innerHTML = `<div class="admin-empty"><strong>No offers</strong><br>Tap Add Offer to start.</div>`;
    return;
  }

  if (els.tbody) {
    els.tbody.innerHTML = filtered
      .map((o) => {
        const n = memberCount(o.id);
        const imgHtml = o.image_url ? `<img src="${escapeHtml(o.image_url)}" alt="" style="width:36px;height:36px;object-fit:cover;border-radius:6px;border:1px solid var(--line)" />` : `<span style="color:var(--muted);font-size:18px">—</span>`;
        const titleHtml = o.title
          ? escapeHtml(o.title)
          : `<span style="color:var(--muted);font-weight:400">No title</span>`;
        return `
          <tr>
            <td style="display:flex;align-items:center;gap:10px">
              <div style="width:36px;height:36px;border-radius:6px;overflow:hidden;border:1px solid var(--line);display:grid;place-items:center;background:var(--surface-2);flex:none">${imgHtml}</div>
              <div>
                <div style="font-weight:700">${titleHtml}</div>
                ${o.description ? `<div style="font-size:11px;color:var(--muted);max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(o.description)}</div>` : ""}
              </div>
            </td>
            <td style="font-size:12px">${fmtDiscount(o)}</td>
            <td style="font-size:12px">${fmtDate(o.starts_at)} → ${fmtDate(o.ends_at)}</td>
            <td>${statusBadge(o)}</td>
            <td class="col-sort">${o.sort_order}</td>
            <td>${n}</td>
            <td>
              <div class="admin-table-actions">
                <button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="edit" data-id="${o.id}">Edit</button>
                <button class="admin-btn admin-btn--danger admin-btn--sm" data-action="delete" data-id="${o.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  if (els.cards) {
    els.cards.innerHTML = filtered
      .map((o) => {
        const n = memberCount(o.id);
        const imgHtml = o.image_url ? `<img src="${escapeHtml(o.image_url)}" alt="" style="max-width:120px;max-height:80px;object-fit:cover;border-radius:8px" />` : "";
        const cardTitle = o.title
          ? escapeHtml(o.title)
          : `<span style="color:var(--muted);font-weight:400">No title</span>`;
        return `
          <div class="cat-card">
            ${imgHtml ? `<div style="margin-bottom:8px;border-radius:8px;overflow:hidden;border:1px solid var(--line)">${imgHtml}</div>` : ""}
            <div class="cat-card-head">
              <strong>${cardTitle}</strong>
              <span style="display:flex;gap:6px">${statusBadge(o)}</span>
            </div>
            <div class="cat-card-meta">
              <span>${fmtDiscount(o)}</span>
              <span class="col-sort">Order: ${o.sort_order}</span>
            </div>
            <div style="font-size:12px;color:var(--muted);margin-bottom:8px">${fmtDate(o.starts_at)} → ${fmtDate(o.ends_at)} · ${n} ${n === 1 ? "product" : "products"}</div>
            <div class="cat-card-actions">
              <button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="edit" data-id="${o.id}">Edit</button>
              <button class="admin-btn admin-btn--danger admin-btn--sm" data-action="delete" data-id="${o.id}">Delete</button>
            </div>
          </div>
        `;
      })
      .join("");
  }
}

// ---------- Image handling ----------

function handleFileSelect() {
  const file = els.fImgFile?.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast("Image must be ≤5 MiB", "err"); els.fImgFile.value = ""; return; }
  if (!file.type.startsWith("image/")) { toast("Only images allowed", "err"); els.fImgFile.value = ""; return; }
  if (pendingImgPreviewUrl) { URL.revokeObjectURL(pendingImgPreviewUrl); pendingImgPreviewUrl = null; }
  imgRemoved = false;
  pendingImgPreviewUrl = URL.createObjectURL(file);
  updateImgPreview();
}

function handleImgRemove() {
  if (pendingImgPreviewUrl) { URL.revokeObjectURL(pendingImgPreviewUrl); pendingImgPreviewUrl = null; }
  if (els.fImgFile) els.fImgFile.value = "";
  imgRemoved = !!(originalImgPath || originalImgUrl);
  updateImgPreview();
}

function updateImgPreview() {
  if (!els.fImgPreview) return;
  const file = els.fImgFile?.files?.[0];
  if (file && pendingImgPreviewUrl) {
    els.fImgPreview.innerHTML = `<img src="${pendingImgPreviewUrl}" alt="Preview" style="max-width:120px;max-height:120px;border-radius:8px;border:1px solid var(--line)" /> <span class="hint">${escapeHtml(file.name)} (${(file.size / 1024).toFixed(0)} KB) — will upload on Save</span>`;
    return;
  }
  if (imgRemoved) {
    els.fImgPreview.innerHTML = `<span class="hint">No image — will be removed on Save</span>`;
    return;
  }
  if (originalImgUrl) {
    els.fImgPreview.innerHTML = `<img src="${escapeHtml(originalImgUrl)}" alt="Current image" style="max-width:120px;max-height:120px;border-radius:8px;border:1px solid var(--line)" onerror="this.style.display='none'" /> <span class="hint">Current image</span>`;
  } else {
    els.fImgPreview.innerHTML = `<span class="hint">No image</span>`;
  }
}

// ---------- Product picker (simple: search existing products, add selected) ----------

function pickerPool() {
  if (!pickerSearch) return products;
  return products.filter((p) => p.name.toLowerCase().includes(pickerSearch) || p.slug.toLowerCase().includes(pickerSearch));
}

function renderPicker() {
  if (!els.pickerPool || !els.pickerSelected) return;
  const selected = new Set(pickerSelected);
  const pool = pickerPool();

  if (!pool.length) {
    els.pickerPool.innerHTML = `<span class="hint">No products found.</span>`;
  } else {
    els.pickerPool.innerHTML = pool.map((p) => `
      <label style="display:flex;align-items:center;gap:8px;padding:6px 4px;font-size:13px;cursor:pointer;border-bottom:1px solid var(--line)">
        <input type="checkbox" data-product-id="${p.id}" ${selected.has(p.id) ? "checked" : ""} style="width:16px;height:16px;accent-color:var(--tpm-green)" />
        <span style="flex:1">${escapeHtml(p.name)}</span>
        <span style="font-size:11px;color:var(--muted)">${p.price != null ? `EGP${Number(p.price).toFixed(2)}` : "—"}</span>
      </label>
    `).join("");
  }

  els.pickerSelected.innerHTML = pickerSelected.length
    ? `<div style="display:flex;flex-direction:column;gap:4px">
        ${pickerSelected.map((id, i) => `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;font-size:13px;border-bottom:1px solid var(--line);background:var(--surface-2);border-radius:8px">
            <span style="font-weight:800;color:var(--muted);min-width:20px;font-size:11px">${i + 1}</span>
            <span style="flex:1">${escapeHtml(productName(id))}</span>
            <button type="button" class="admin-btn admin-btn-ghost admin-btn--sm" data-remove="${i}" aria-label="Remove" style="min-height:30px;padding:0 8px;font-size:11px">×</button>
          </div>
        `).join("")}
      </div>`
    : `<span class="hint">No products selected yet. Search, check products, and click "Add Selected".</span>`;
}

function handlePoolChange(e) {
  const box = e.target.closest("input[type=checkbox][data-product-id]");
  if (!box) return;
  const id = Number(box.dataset.productId);
  if (!id || !products.some((p) => p.id === id)) return;
  if (box.checked) {
    if (!pickerSelected.includes(id)) pickerSelected.push(id);
  } else {
    pickerSelected = pickerSelected.filter((x) => x !== id);
  }
  renderPicker();
}

function handleSelectedClick(e) {
  const rmBtn = e.target.closest("button[data-remove]");
  if (rmBtn) {
    const i = Number(rmBtn.dataset.remove);
    if (i >= 0 && i < pickerSelected.length) pickerSelected.splice(i, 1);
    renderPicker();
  }
}

async function addSelectedProducts() {
  // Selected products are already in pickerSelected order; just re-render
  // The sort_order will be set on save based on pickerSelected order
  renderPicker();
  toast(`${pickerSelected.length} product${pickerSelected.length !== 1 ? "s" : ""} selected`, "ok");
}

// ---------- Modal ----------

function openModal(offer) {
  editingId = offer ? offer.id : null;
  if (els.fId) els.fId.value = editingId || "";
  if (els.modalTitle) els.modalTitle.textContent = editingId ? "Edit Offer" : "Add Offer";
  clearAllErrors();
  imgRemoved = false;
  originalImgPath = null;
  originalImgUrl = null;
  pendingImgPreviewUrl = null;
  if (els.fImgFile) els.fImgFile.value = "";
  pickerSearch = "";
  if (els.pickerSearch) els.pickerSearch.value = "";

  if (offer) {
    els.fTitle.value = offer.title || "";
    els.fDesc.value = offer.description || "";
    els.fBadge.value = offer.badge || "";
    els.fValue.value = offer.discount_value ?? "";
    els.fStarts.value = toLocalInput(offer.starts_at);
    els.fEnds.value = toLocalInput(offer.ends_at);
    els.fActive.checked = !!offer.is_active;
    els.fSort.value = offer.sort_order ?? 0;
    originalImgPath = offer.image_path || null;
    originalImgUrl = offer.image_url || null;
    pickerSelected = (memberships.get(offer.id) || [])
      .slice()
      .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
      .map((m) => m.product_id)
      .filter((id) => products.some((p) => p.id === id));
  } else {
    els.fTitle.value = "";
    els.fDesc.value = "";
    els.fBadge.value = "";
    els.fValue.value = "";
    els.fStarts.value = "";
    els.fEnds.value = "";
    els.fActive.checked = true;
    els.fSort.value = offers.reduce((m, o) => Math.max(m, Number(o.sort_order) || 0), 0) + 1;
    pickerSelected = [];
  }
  updateImgPreview();
  renderPicker();
  els.modal?.classList.add("open");
  setTimeout(() => els.fTitle?.focus(), 50);
}

function closeModal() {
  if (pendingImgPreviewUrl) { URL.revokeObjectURL(pendingImgPreviewUrl); pendingImgPreviewUrl = null; }
  els.modal?.classList.remove("open");
  editingId = null;
  pickerSelected = [];
  clearAllErrors();
}

let pendingDeleteId = null;
function openDeleteModal(offer) {
  pendingDeleteId = offer.id;
  const label = offer.title || offer.slug || "this offer";
  if (els.deleteName) els.deleteName.textContent = `${label} (${memberCount(offer.id)} products)`;
  els.deleteModal?.classList.add("open");
}
function closeDeleteModal() {
  pendingDeleteId = null;
  els.deleteModal?.classList.remove("open");
}
async function confirmDelete() {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;
  closeDeleteModal();
  await deleteOffer(id);
}

function clearAllErrors() {
  document.querySelectorAll("#offerForm .admin-field.has-error").forEach((e) => e.classList.remove("has-error"));
}
function setFieldError(field, msg) {
  const wrap = document.getElementById(`field-offer-${field}`);
  if (!wrap) return;
  wrap.classList.add("has-error");
  const err = wrap.querySelector(".error");
  if (err) err.textContent = msg;
}
function charLength(s) { return String(s).trim().length; }

async function handleSubmit() {
  const titleRaw = els.fTitle.value.trim();
  const title = titleRaw || null;
  const description = els.fDesc.value.trim() || null;
  const badge = els.fBadge.value.trim() || null;

  // Discount is optional. When provided it is always a percentage 0–100
  // (mirrors DB CHECK constraint). When empty, no discount is stored.
  const valueRaw = els.fValue.value.trim();
  const startsRaw = els.fStarts.value;
  const endsRaw = els.fEnds.value;
  const is_active = !!els.fActive.checked;
  const sortRaw = els.fSort.value.trim();

  clearAllErrors();
  let hasError = false;

  // Discount value mirrors DB CHECK constraints (optional)
  let discount_type = null;
  let discount_value = null;
  if (valueRaw === "") {
    discount_type = null;
    discount_value = null;
  } else {
    const n = Number(valueRaw);
    if (!Number.isFinite(n) || n < 0 || n > 100) { setFieldError("value", "Discount must be between 0 and 100."); hasError = true; }
    else { discount_type = "percent"; discount_value = n; }
  }

  // Dates
  let starts_at = null;
  let ends_at = null;
  if (startsRaw) {
    starts_at = fromLocalInput(startsRaw);
    if (!starts_at) { setFieldError("starts", "Invalid start date."); hasError = true; }
  }
  if (endsRaw) {
    ends_at = fromLocalInput(endsRaw);
    if (!ends_at) { setFieldError("ends", "Invalid end date."); hasError = true; }
  }
  if (starts_at && ends_at && new Date(ends_at).getTime() < new Date(starts_at).getTime()) {
    setFieldError("ends", "End date must be on or after the start date."); hasError = true;
  }

  // Sort order
  let sort_order = 0;
  if (sortRaw === "") {
    sort_order = editingId
      ? (Number((offers.find((o) => o.id === editingId) || {}).sort_order) || 0)
      : offers.reduce((m, o) => Math.max(m, Number(o.sort_order) || 0), 0) + 1;
  } else {
    const n = Number(sortRaw);
    if (!Number.isInteger(n) || n < 0) { setFieldError("sort", "Sort order must be a whole number 0 or higher."); hasError = true; }
    else sort_order = n;
  }

  if (hasError) return;

  // Prevent a completely empty offer: require at least a title, description,
  // badge, discount, image, or product. Dates/sort alone do not count.
  const hasNewImage = !!(els.fImgFile?.files?.[0]);
  const hasExistingImage = !imgRemoved && !!(originalImgPath || originalImgUrl);
  const hasContent = !!title || !!description || !!badge || discount_value != null
    || hasNewImage || hasExistingImage || pickerSelected.length > 0;
  if (!hasContent) {
    setFieldError("title", "Add at least a title, description, badge, discount, image, or product.");
    toast("Add at least a title, discount, image, or product for the offer", "err");
    return;
  }

  // Internal slug (title may be null for image-only offers; then a fallback
  // slug such as offer-xxxxxx is generated and kept stable on edit)
  const existing = editingId ? offers.find((o) => o.id === editingId) : null;
  let { slug, fallback } = resolveSlug(titleRaw, "offer", existing ? existing.slug : null);
  const supaForSlug = getSupabase();
  if (fallback) {
    try { slug = await ensureUniqueSlug(supaForSlug, "offers", slug, editingId); }
    catch (err) { console.error("[TPM offers] fallback slug check failed", err); }
  } else {
    try {
      let q = supaForSlug.from("offers").select("id").eq("slug", slug);
      if (editingId) q = q.neq("id", editingId);
      const { data: dup, error: dupErr } = await q.limit(1);
      if (dupErr) throw dupErr;
      if (dup && dup.length) {
        setFieldError("title", "An offer with this title already exists.");
        toast("An offer with this title already exists", "err");
        return;
      }
    } catch (err) { console.error("[TPM offers] dup check failed", err); }
  }

  // Image upload
  let image_path = null;
  let image_url = null;
  if (!imgRemoved) {
    const file = els.fImgFile?.files?.[0];
    if (file) {
      try {
        const supa = getSupabase();
        const safeSlug = slug || slugify(titleRaw) || "offer";
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${Date.now()}-${safeSlug}.${ext}`;
        toast("Uploading offer image…", "ok");
        const { error: upErr } = await supa.storage.from("offer-images").upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        const { data: pub } = supa.storage.from("offer-images").getPublicUrl(path);
        image_path = path;
        image_url = pub?.publicUrl || null;
      } catch (err) {
        console.error("[TPM offers] image upload failed", err);
        toast("Image upload failed: " + (err.message || ""), "err");
        return;
      }
    } else if (editingId) {
      image_path = originalImgPath;
      image_url = originalImgUrl;
    }
  } else if (editingId) {
    image_path = null;
    image_url = null;
  }

  const submitBtn = els.form.querySelector('button[type="submit"]');
  const prevText = submitBtn ? submitBtn.textContent : "";
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = editingId ? "Saving…" : "Creating…"; }

  try {
    const supabase = getSupabase();
    const payload = { title, slug, description, badge, discount_type, discount_value, starts_at, ends_at, is_active, sort_order, image_path, image_url };
    let offerId = editingId;
    if (editingId) {
      const { error } = await supabase.from("offers").update(payload).eq("id", editingId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("offers").insert(payload).select("id").single();
      if (error) throw error;
      offerId = data.id;
    }
    await syncMemberships(supabase, offerId);
    toast(editingId ? "Offer updated" : "Offer created", "ok");
    closeModal();
    await loadAll();
  } catch (err) {
    console.error("[TPM offers] save failed", err);
    const msg = err.message || "Save failed";
    if (msg.toLowerCase().includes("duplicate") || (msg.toLowerCase().includes("slug") && msg.toLowerCase().includes("unique"))) {
      setFieldError("title", "An offer with this title already exists.");
    }
    toast(msg, "err");
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = prevText || (editingId ? "Save" : "Create"); }
  }
}

async function syncMemberships(supabase, offerId) {
  const current = new Map((memberships.get(offerId) || []).map((m) => [m.product_id, m.sort_order]));
  const wanted = pickerSelected.filter((id) => products.some((p) => p.id === id));
  const wantedSet = new Set(wanted);
  const removed = [...current.keys()].filter((id) => !wantedSet.has(id));
  if (removed.length) {
    const { error } = await supabase.from("offer_products").delete().eq("offer_id", offerId).in_("product_id", removed);
    if (error) throw error;
  }
  if (wanted.length) {
    const rows = wanted.map((product_id, i) => ({ offer_id: offerId, product_id, sort_order: i }));
    const { error } = await supabase.from("offer_products").upsert(rows, { onConflict: "offer_id,product_id" });
    if (error) throw error;
  }
}

async function deleteOffer(id) {
  const offer = offers.find((o) => o.id === id);
  if (!offer) return;
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("offers").delete().eq("id", id);
    if (error) throw error;
    toast(`Deleted ${offer.title || offer.slug || "offer"}`, "ok");
    await loadAll();
  } catch (err) {
    console.error("[TPM offers] delete failed", err);
    toast(err.message || "Delete failed", "err");
  }
}

export const _test = { slugify, validateSlug, resolveSlug, fmtDiscount, fmtDate, offerStatus };
