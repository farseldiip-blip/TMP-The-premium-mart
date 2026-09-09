// site/admin/js/categories.js — Categories Management (Step 3A)
// Uses existing Supabase client + is_admin() RLS. No service_role.
// Preserves background_image_path/url and all DB fields.

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

// Internal slug resolution — the Slug field is hidden from the form, and
// Name accepts any language (Arabic, English, mixed):
// - English/mixed names → clean lowercase hyphenated slug (unchanged behavior).
// - Arabic-only names → keep the existing slug on edit (stable URLs);
//   on add, a safe unique fallback like "category-x7k2q9" that satisfies the
//   DB format check. The original name is always stored verbatim.
function resolveSlug(name, kind, existingSlug) {
  const base = slugify(name || "");
  if (base) return { slug: base, fallback: false };
  if (existingSlug && SLUG_RE.test(existingSlug)) return { slug: existingSlug, fallback: false };
  return { slug: `${kind}-${randomSlugSuffix()}`, fallback: true };
}

// Ensure a generated fallback slug is unique (re-check, suffix on collision).
// Only used for random fallbacks — never rejects the user's name.
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

// Toast helper — uses stack in DOM or creates one
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

// State
let categories = [];
let filtered = [];
let editingId = null; // null = add, else id
let searchTerm = "";
let typeFilter = "all";
let pendingBgFile = null;
let pendingBgPreviewUrl = null;
let bgRemoved = false;
let originalBgPath = null;
let originalBgUrl = null;

const els = {};

export async function initCategories() {
  // cache DOM refs
  els.wrap = document.getElementById("catWrap");
  els.tbody = document.getElementById("catTbody");
  els.cards = document.getElementById("catCards");
  els.empty = document.getElementById("catEmpty");
  els.stats = document.getElementById("catStats");
  els.search = document.getElementById("catSearch");
  els.typeFilter = document.getElementById("catTypeFilter");
  els.addBtn = document.getElementById("catAddBtn");
  els.refreshBtn = document.getElementById("catRefreshBtn");
  els.modal = document.getElementById("catModal");
  els.modalOverlay = els.modal?.querySelector(".admin-modal-overlay");
  els.modalClose = document.getElementById("catModalClose");
  els.modalCancel = document.getElementById("catModalCancel");
  els.modalTitle = document.getElementById("catModalTitle");
  els.form = document.getElementById("catForm");
  els.fName = document.getElementById("catName");
  els.fType = document.getElementById("catType");
  els.fActive = document.getElementById("catActive");
  els.fDesc = document.getElementById("catDesc");
  els.fBgPath = document.getElementById("catBgPath");
  els.fBgUrl = document.getElementById("catBgUrl");
  els.fBgFile = document.getElementById("catBgFile");
  els.fBgPreview = document.getElementById("catBgPreview");
  els.fBgRemove = document.getElementById("catBgRemove");
  els.fBgPathDisplay = document.getElementById("catBgPathDisplay");
  els.fId = document.getElementById("catId");
  els.deleteModal = document.getElementById("catDeleteModal");
  els.deleteName = document.getElementById("catDeleteName");
  els.deleteCancel = document.getElementById("catDeleteCancel");
  els.deleteConfirm = document.getElementById("catDeleteConfirm");
  els.deleteOverlay = els.deleteModal?.querySelector(".admin-modal-overlay");
  els.deleteClose = document.getElementById("catDeleteClose");

  if (!els.wrap || !els.tbody) {
    console.warn("[TPM categories] container not found");
    return;
  }

  // Wire events
  els.search?.addEventListener("input", (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    applyFilter();
  });
  els.typeFilter?.addEventListener("change", (e) => {
    typeFilter = e.target.value;
    applyFilter();
  });
  els.addBtn?.addEventListener("click", () => openModal(null));
  els.refreshBtn?.addEventListener("click", () => loadCategories());
  els.modalClose?.addEventListener("click", closeModal);
  els.modalCancel?.addEventListener("click", closeModal);
  els.modalOverlay?.addEventListener("click", closeModal);
  els.deleteCancel?.addEventListener("click", closeDeleteModal);
  els.deleteClose?.addEventListener("click", closeDeleteModal);
  els.deleteOverlay?.addEventListener("click", closeDeleteModal);
  els.deleteConfirm?.addEventListener("click", confirmDelete);

  // background file picker + remove button; slug auto-generates from name on save
  els.fBgFile?.addEventListener("change", handleBgFileSelect);
  els.fBgRemove?.addEventListener("click", handleBgRemove);

  // form submit
  els.form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleSubmit();
  });

  // keyboard esc
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (els.deleteModal?.classList.contains("open")) closeDeleteModal();
      else if (els.modal?.classList.contains("open")) closeModal();
    }
  });

  // Delegate table actions
  els.tbody?.addEventListener("click", handleTableClick);
  els.cards?.addEventListener("click", handleTableClick);

  // initial load
  await loadCategories();

}

function handleTableClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const id = Number(btn.dataset.id);
  if (!id) return;
  const cat = categories.find((c) => c.id === id);
  if (!cat) return;
  if (action === "edit") openModal(cat);
  else if (action === "delete") openDeleteModal(cat);
  else if (action === "toggle") toggleActive(cat);
}

export async function loadCategories() {
  const supabase = getSupabase();
  if (!els.tbody) return;
  els.tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">Loading…</td></tr>`;
  if (els.cards) els.cards.innerHTML = "";
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    categories = data || [];
    applyFilter();
  } catch (err) {
    console.error("[TPM categories] load failed", err);
    toast(err.message || "Failed to load categories", "err");
    if (els.tbody) els.tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">Failed to load: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function applyFilter() {
  filtered = categories.filter((c) => {
    const matchesSearch =
      !searchTerm ||
      c.name.toLowerCase().includes(searchTerm) ||
      c.slug.toLowerCase().includes(searchTerm) ||
      (c.description || "").toLowerCase().includes(searchTerm);
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    return matchesSearch && matchesType;
  });
  render();
}

function render() {
  // stats
  if (els.stats) {
    const total = categories.length;
    const active = categories.filter((c) => c.is_active).length;
    const market = categories.filter((c) => c.type === "market").length;
    const cafe = categories.filter((c) => c.type === "cafe").length;
    els.stats.innerHTML = `
      <span>${total} total</span>
      <span>${active} active</span>
      <span>${market} market</span>
      <span>${cafe} café</span>
      <span>${filtered.length} shown</span>
    `;
  }
  // Overview counter uses the same already-loaded data (no extra query).
  const ovStat = document.getElementById("statCategories");
  if (ovStat) ovStat.textContent = categories.length;

  if (!filtered.length) {
    if (els.tbody) els.tbody.innerHTML = `<tr><td colspan="6" class="admin-empty"><strong>No categories</strong>${searchTerm || typeFilter !== "all" ? "<br>Try adjusting search or filter." : "<br>Click “Add Category” to create the first one."}</td></tr>`;
    if (els.cards) els.cards.innerHTML = `<div class="admin-empty"><strong>No categories</strong><br>${searchTerm || typeFilter !== "all" ? "Try adjusting search or filter." : "Tap Add Category to start."}</div>`;
    if (els.empty) els.empty.style.display = "none";
    return;
  }

  // table rows
  if (els.tbody) {
    els.tbody.innerHTML = filtered
      .map((c) => {
        const typeBadge = c.type === "cafe"
          ? `<span class="admin-badge admin-badge--cafe">Café</span>`
          : `<span class="admin-badge admin-badge--market">Market</span>`;
        const activeBadge = c.is_active
          ? `<span class="admin-badge admin-badge--active">Active</span>`
          : `<span class="admin-badge admin-badge--inactive">Inactive</span>`;
        return `
          <tr>
            <td>
              <div style="font-weight:700">${escapeHtml(c.name)}</div>
              ${c.description ? `<div style="font-size:11px;color:var(--muted);max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(c.description)}</div>` : ""}
            </td>
            <td>${typeBadge}</td>
            <td class="col-slug">${escapeHtml(c.slug)}</td>
            <td>${activeBadge}</td>
            <td class="col-sort">${c.sort_order}</td>
            <td>
              <div class="admin-table-actions">
                <button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="edit" data-id="${c.id}">Edit</button>
                <button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="toggle" data-id="${c.id}">${c.is_active ? "Deactivate" : "Activate"}</button>
                <button class="admin-btn admin-btn--danger admin-btn--sm" data-action="delete" data-id="${c.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  // mobile cards
  if (els.cards) {
    els.cards.innerHTML = filtered
      .map((c) => {
        const typeBadge = c.type === "cafe"
          ? `<span class="admin-badge admin-badge--cafe">Café</span>`
          : `<span class="admin-badge admin-badge--market">Market</span>`;
        const activeBadge = c.is_active
          ? `<span class="admin-badge admin-badge--active">Active</span>`
          : `<span class="admin-badge admin-badge--inactive">Inactive</span>`;
        return `
          <div class="cat-card">
            <div class="cat-card-head">
              <strong>${escapeHtml(c.name)}</strong>
              <span style="display:flex;gap:6px">${typeBadge}${activeBadge}</span>
            </div>
            <div class="cat-card-meta">
              <span class="col-slug">${escapeHtml(c.slug)}</span>
              <span class="col-sort">Order: ${c.sort_order}</span>
            </div>
            ${c.description ? `<div style="font-size:12px;color:var(--muted);margin-bottom:8px">${escapeHtml(c.description)}</div>` : ""}
            <div class="cat-card-actions">
              <button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="edit" data-id="${c.id}">Edit</button>
              <button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="toggle" data-id="${c.id}">${c.is_active ? "Deactivate" : "Activate"}</button>
              <button class="admin-btn admin-btn--danger admin-btn--sm" data-action="delete" data-id="${c.id}">Delete</button>
            </div>
          </div>
        `;
      })
      .join("");
  }
}

function handleBgFileSelect(){
  const file = els.fBgFile?.files?.[0];
  if(!file) return;
  if(file.size > 5*1024*1024){ toast("Image must be ≤5 MiB", "err"); els.fBgFile.value=""; return; }
  if(!file.type.startsWith("image/")){ toast("Only images allowed", "err"); els.fBgFile.value=""; return; }
  if(pendingBgPreviewUrl){ URL.revokeObjectURL(pendingBgPreviewUrl); pendingBgPreviewUrl=null; }
  pendingBgFile = file;
  bgRemoved = false;
  pendingBgPreviewUrl = URL.createObjectURL(file);
  updateBgPreview();
}
function updateBgPreview(){
  if(!els.fBgPreview) return;
  // pending file takes precedence
  if(pendingBgFile && pendingBgPreviewUrl){
    els.fBgPreview.innerHTML = `<img src="${pendingBgPreviewUrl}" alt="Preview" style="max-width:160px;max-height:100px;border-radius:8px;border:1px solid var(--line);object-fit:cover" /> <span class="hint">${escapeHtml(pendingBgFile.name)} (${(pendingBgFile.size/1024).toFixed(0)} KB) — will upload on Save</span>`;
    if(els.fBgPathDisplay) els.fBgPathDisplay.textContent = `Selected: ${pendingBgFile.name}`;
    return;
  }
  if(bgRemoved){
    els.fBgPreview.innerHTML = `<span class="hint">No image — will be removed on Save</span>`;
    if(els.fBgPathDisplay) els.fBgPathDisplay.textContent = "";
    return;
  }
  const url = safeDisplayForPreview(originalBgUrl);
  const path = safeDisplayForPreview(originalBgPath);
  if(url){
    els.fBgPreview.innerHTML = `<img src="${escapeHtml(url)}" alt="Current background" style="max-width:160px;max-height:100px;border-radius:8px;border:1px solid var(--line);object-fit:cover" onerror="this.style.display='none'" /> <span class="hint">Current image</span>`;
    if(els.fBgPathDisplay) els.fBgPathDisplay.textContent = path || url;
  } else if(path){
    els.fBgPreview.innerHTML = `<span class="hint">Path: ${escapeHtml(path)}</span>`;
    if(els.fBgPathDisplay) els.fBgPathDisplay.textContent = path;
  } else {
    els.fBgPreview.innerHTML = `<span class="hint">No image</span>`;
    if(els.fBgPathDisplay) els.fBgPathDisplay.textContent = "";
  }
}
function safeDisplayForPreview(v){ return v==null||v==="undefined" ? "" : String(v); }
function handleBgRemove(){
  if(pendingBgPreviewUrl){ URL.revokeObjectURL(pendingBgPreviewUrl); pendingBgPreviewUrl=null; }
  pendingBgFile = null;
  if(els.fBgFile) els.fBgFile.value = "";
  // if there was no original and no pending, just stay No image
  // if there was original, mark removed so it will be cleared on save
  if(originalBgPath || originalBgUrl || pendingBgFile){
    bgRemoved = true;
  } else {
    bgRemoved = false;
  }
  // If editing and original exists, removing means will clear; if adding with no image, just clear
  updateBgPreview();
}

function openModal(cat) {
  editingId = cat ? cat.id : null;
  if (els.fId) els.fId.value = editingId || "";
  if (els.modalTitle) els.modalTitle.textContent = editingId ? "Edit Category" : "Add Category";
  // reset bg state
  if(pendingBgPreviewUrl){ URL.revokeObjectURL(pendingBgPreviewUrl); pendingBgPreviewUrl=null; }
  pendingBgFile = null;
  bgRemoved = false;
  originalBgPath = cat ? (cat.background_image_path || null) : null;
  originalBgUrl = cat ? (cat.background_image_url || null) : null;
  if(els.fBgFile) els.fBgFile.value = "";
  // keep hidden inputs in sync for submission fallback, but UI is file picker
  if(cat){
    els.fBgPath.value = cat.background_image_path || "";
    els.fBgUrl.value = cat.background_image_url || "";
  } else {
    els.fBgPath.value = "";
    els.fBgUrl.value = "";
  }
  // reset errors
  clearAllErrors();
  if (cat) {
    els.fName.value = cat.name || "";
    els.fType.value = cat.type || "market";
    els.fActive.checked = !!cat.is_active;
    els.fDesc.value = cat.description || "";
  } else {
    els.fName.value = "";
    els.fType.value = "market";
    els.fActive.checked = true;
    els.fDesc.value = "";
  }
  updateBgPreview();
  els.modal?.classList.add("open");
  // focus name
  setTimeout(() => els.fName?.focus(), 50);
}

function closeModal() {
  if(pendingBgPreviewUrl){ URL.revokeObjectURL(pendingBgPreviewUrl); pendingBgPreviewUrl=null; }
  pendingBgFile = null;
  bgRemoved = false;
  els.modal?.classList.remove("open");
  editingId = null;
  clearAllErrors();
}

let pendingDeleteId = null;
function openDeleteModal(cat) {
  pendingDeleteId = cat.id;
  if (els.deleteName) els.deleteName.textContent = `${cat.name} (${cat.slug})`;
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
  await deleteCategory(id);
}

function clearFieldError(field) {
  const el = document.getElementById(`field-${field}`);
  if (el) el.classList.remove("has-error");
}
function setFieldError(field, msg) {
  const wrap = document.getElementById(`field-${field}`);
  if (!wrap) return;
  wrap.classList.add("has-error");
  const err = wrap.querySelector(".error");
  if (err) err.textContent = msg;
}
function clearAllErrors() {
  document.querySelectorAll(".admin-field.has-error").forEach((e) => e.classList.remove("has-error"));
}

async function handleSubmit() {
  const name = els.fName.value.trim();
  const type = els.fType.value;
  const is_active = !!els.fActive.checked;
  const description = els.fDesc.value.trim() || null;

  clearAllErrors();
  let hasError = false;
  if (!name) { setFieldError("name", "Name is required."); hasError = true; }
  if (charLength(name) === 0) { setFieldError("name", "Name cannot be empty."); hasError = true; }
  if (!["market", "cafe"].includes(type)) { setFieldError("type", "Type must be market or cafe."); hasError = true; }

  if (hasError) return;

  // Internal slug: hidden from the form, accepts any language in Name.
  const existing = editingId ? categories.find((c) => c.id === editingId) : null;
  let { slug, fallback } = resolveSlug(name, "category", existing ? existing.slug : null);
  const supaForSlug = getSupabase();
  if (fallback) {
    try {
      slug = await ensureUniqueSlug(supaForSlug, "categories", slug, editingId);
    } catch (err) {
      console.error("[TPM categories] fallback slug check failed", err);
      // proceed — DB unique index is the backstop
    }
  } else {
    // duplicate slug check (English/mixed names keep existing reject behavior)
    try {
      const supabase = supaForSlug;
      let q = supabase.from("categories").select("id").eq("slug", slug);
      if (editingId) q = q.neq("id", editingId);
      const { data: dup, error: dupErr } = await q.limit(1);
      if (dupErr) throw dupErr;
      if (dup && dup.length) {
        setFieldError("name", "A category with this name already exists.");
        toast("A category with this name already exists", "err");
        return;
      }
    } catch (err) {
      console.error("[TPM categories] dup check failed", err);
      // allow to proceed to let DB unique handle it, but show toast
    }
  }

  // sort_order is handled internally: keep existing on edit, append at end on add
  let sort_order = 0;
  if (editingId) {
    const existing = categories.find((c) => c.id === editingId);
    sort_order = existing ? (Number(existing.sort_order) || 0) : 0;
  } else {
    sort_order = categories.reduce((m, c) => Math.max(m, Number(c.sort_order) || 0), 0) + 1;
  }

  const submitBtn = els.form.querySelector('button[type="submit"]');
  const prevText = submitBtn ? submitBtn.textContent : "";
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = editingId ? "Saving…" : "Creating…"; }

  try {
    const supabase = getSupabase();
    let background_image_path = null;
    let background_image_url = null;
    if (bgRemoved) {
      background_image_path = null;
      background_image_url = null;
    } else if (pendingBgFile) {
      const safeSlug = slugify(name) || "category";
      const ext = pendingBgFile.name.split(".").pop() || "jpg";
      const path = Date.now() + "-" + safeSlug + "." + ext;
      toast("Uploading background…", "ok");
      const { error: upErr } = await supabase.storage.from("category-backgrounds").upload(path, pendingBgFile, { upsert:false, contentType: pendingBgFile.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("category-backgrounds").getPublicUrl(path);
      background_image_path = path;
      background_image_url = pub?.publicUrl || null;
    } else if (editingId) {
      background_image_path = originalBgPath;
      background_image_url = originalBgUrl;
    } else {
      background_image_path = null;
      background_image_url = null;
    }

    const payload = {
      name,
      slug,
      type,
      sort_order,
      is_active,
      description,
      background_image_path,
      background_image_url,
    };

    let result;
    if (editingId) {
      result = await supabase.from("categories").update(payload).eq("id", editingId).select().single();
    } else {
      result = await supabase.from("categories").insert(payload).select().single();
    }
    if (result.error) throw result.error;
    toast(editingId ? "Category updated" : "Category created", "ok");
    closeModal();
    await loadCategories();
  } catch (err) {
    console.error("[TPM categories] save failed", err);
    const msg = err.message || "Save failed";
    if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("slug") && msg.toLowerCase().includes("unique")) {
      setFieldError("name", "A category with this name already exists.");
    } else if (msg.toLowerCase().includes("type") && msg.toLowerCase().includes("check")) {
      setFieldError("type", "Type must be market or cafe.");
    }
    toast(msg, "err");
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = prevText || (editingId ? "Save" : "Create"); }
  }
}

function charLength(s) { return String(s).trim().length; }

async function deleteCategory(id) {
  const cat = categories.find((c) => c.id === id);
  if (!cat) return;
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;
    toast(`Deleted ${cat.name}`, "ok");
    await loadCategories();
  } catch (err) {
    console.error("[TPM categories] delete failed", err);
    const msg = err.message || "Delete failed";
    // handle FK restriction? products ON DELETE SET NULL so should succeed, but show error if RLS
    toast(msg, "err");
  }
}

async function toggleActive(cat) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("categories").update({ is_active: !cat.is_active }).eq("id", cat.id);
    if (error) throw error;
    toast(cat.is_active ? `Deactivated ${cat.name}` : `Activated ${cat.name}`, "ok");
    await loadCategories();
  } catch (err) {
    console.error("[TPM categories] toggle failed", err);
    toast(err.message || "Toggle failed", "err");
  }
}

// expose for testing
export const _test = { slugify, validateSlug, resolveSlug, ensureUniqueSlug, randomSlugSuffix };
