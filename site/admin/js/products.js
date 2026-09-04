// site/admin/js/products.js — Products Management (Step 3B)
// Uses existing Supabase client + is_admin() RLS. No service_role.
// Image OPTIONAL — uses product-images bucket if file selected, never required.

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
function validateSlug(s) { return SLUG_RE.test(s); }
function escapeHtml(s) {
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function toast(msg, kind="ok"){
  let stack=document.getElementById("adminToastStack");
  if(!stack){ stack=document.createElement("div"); stack.id="adminToastStack"; stack.className="admin-toast-stack"; document.body.appendChild(stack); }
  const t=document.createElement("div"); t.className=`admin-toast ${kind}`; t.innerHTML=`<span style="flex:1">${escapeHtml(msg)}</span><button aria-label="Dismiss">×</button>`;
  t.querySelector("button").addEventListener("click",()=>t.remove()); stack.appendChild(t); setTimeout(()=>{if(t.parentNode)t.remove();},4200);
}
function formatPrice(p){
  if(p===null || p===undefined || p==="") return "—";
  const n=Number(p);
  if(Number.isNaN(n)) return String(p);
  return `$${n.toFixed(2)}`;
}

// State
let products=[];
let categories=[];
let filtered=[];
let editingId=null;
let searchTerm="";
let categoryFilter="all";
let typeFilter="all";
let slugManuallyEdited=false;
const els={};

export async function initProducts(){
  els.wrap=document.getElementById("prodWrap");
  els.tbody=document.getElementById("prodTbody");
  els.cards=document.getElementById("prodCards");
  els.stats=document.getElementById("prodStats");
  els.search=document.getElementById("prodSearch");
  els.catFilter=document.getElementById("prodCatFilter");
  els.typeFilter=document.getElementById("prodTypeFilter");
  els.addBtn=document.getElementById("prodAddBtn");
  els.refreshBtn=document.getElementById("prodRefreshBtn");
  els.modal=document.getElementById("prodModal");
  els.modalOverlay=els.modal?.querySelector(".admin-modal-overlay");
  els.modalClose=document.getElementById("prodModalClose");
  els.modalCancel=document.getElementById("prodModalCancel");
  els.modalTitle=document.getElementById("prodModalTitle");
  els.form=document.getElementById("prodForm");
  els.fName=document.getElementById("prodName");
  els.fSlug=document.getElementById("prodSlug");
  els.fCat=document.getElementById("prodCategory");
  els.fDesc=document.getElementById("prodDesc");
  els.fPrice=document.getElementById("prodPrice");
  els.fBadge=document.getElementById("prodBadge");
  els.fSort=document.getElementById("prodSort");
  els.fActive=document.getElementById("prodActive");
  els.fImgPath=document.getElementById("prodImgPath");
  els.fImgUrl=document.getElementById("prodImgUrl");
  els.fImgFile=document.getElementById("prodImgFile");
  els.fImgPreview=document.getElementById("prodImgPreview");
  els.deleteModal=document.getElementById("prodDeleteModal");
  els.deleteName=document.getElementById("prodDeleteName");
  els.deleteCancel=document.getElementById("prodDeleteCancel");
  els.deleteConfirm=document.getElementById("prodDeleteConfirm");
  els.deleteOverlay=els.deleteModal?.querySelector(".admin-modal-overlay");
  els.deleteClose=document.getElementById("prodDeleteClose");

  if(!els.wrap || !els.tbody){ console.warn("[TPM products] container not found"); return; }

  els.search?.addEventListener("input", e=>{ searchTerm=e.target.value.trim().toLowerCase(); applyFilter(); });
  els.catFilter?.addEventListener("change", e=>{ categoryFilter=e.target.value; applyFilter(); });
  els.typeFilter?.addEventListener("change", e=>{ typeFilter=e.target.value; applyFilter(); });
  els.addBtn?.addEventListener("click", ()=>openModal(null));
  els.refreshBtn?.addEventListener("click", ()=>loadProducts());
  els.modalClose?.addEventListener("click", closeModal);
  els.modalCancel?.addEventListener("click", closeModal);
  els.modalOverlay?.addEventListener("click", closeModal);
  els.deleteCancel?.addEventListener("click", closeDeleteModal);
  els.deleteClose?.addEventListener("click", closeDeleteModal);
  els.deleteOverlay?.addEventListener("click", closeDeleteModal);
  els.deleteConfirm?.addEventListener("click", confirmDelete);

  els.fSlug?.addEventListener("input", ()=>{ slugManuallyEdited=true; });
  els.fName?.addEventListener("input", ()=>{
    if(editingId===null && !slugManuallyEdited){
      els.fSlug.value=slugify(els.fName.value);
      clearFieldError("prod-slug");
    }
  });
  els.fImgFile?.addEventListener("change", handleFileSelect);
  // clear preview when path manually edited
  els.fImgPath?.addEventListener("input", updatePreview);
  els.fImgUrl?.addEventListener("input", updatePreview);

  els.form?.addEventListener("submit", async e=>{ e.preventDefault(); await handleSubmit(); });

  document.addEventListener("keydown", e=>{
    if(e.key==="Escape"){
      if(els.deleteModal?.classList.contains("open")) closeDeleteModal();
      else if(els.modal?.classList.contains("open")) closeModal();
    }
  });

  els.tbody?.addEventListener("click", handleTableClick);
  els.cards?.addEventListener("click", handleTableClick);

  await loadCategories();
  await loadProducts();
}

function handleFileSelect(){
  const file=els.fImgFile?.files?.[0];
  if(!file) return;
  if(file.size>5*1024*1024){ toast("Image must be ≤5 MiB", "err"); els.fImgFile.value=""; return; }
  if(!file.type.startsWith("image/")){ toast("Only images allowed", "err"); els.fImgFile.value=""; return; }
  const url=URL.createObjectURL(file);
  if(els.fImgPreview){
    els.fImgPreview.innerHTML=`<img src="${url}" alt="Preview" style="max-width:120px;max-height:120px;border-radius:8px;border:1px solid var(--line)" /> <span class="hint">${escapeHtml(file.name)} (${(file.size/1024).toFixed(0)} KB)</span>`;
  }
}

function updatePreview(){
  const path=els.fImgPath?.value.trim();
  const url=els.fImgUrl?.value.trim();
  if(els.fImgPreview){
    if(url) els.fImgPreview.innerHTML=`<img src="${escapeHtml(url)}" alt="Preview" style="max-width:120px;max-height:120px;border-radius:8px;border:1px solid var(--line)" onerror="this.style.display='none'" />`;
    else if(path) els.fImgPreview.innerHTML=`<span class="hint">Path: ${escapeHtml(path)}</span>`;
    else els.fImgPreview.innerHTML=`<span class="hint">No image</span>`;
  }
}

function handleTableClick(e){
  const btn=e.target.closest("button[data-action]");
  if(!btn) return;
  const action=btn.dataset.action;
  const id=Number(btn.dataset.id);
  const prod=products.find(p=>p.id===id);
  if(!prod) return;
  if(action==="edit") openModal(prod);
  else if(action==="delete") openDeleteModal(prod);
  else if(action==="toggle") toggleActive(prod);
}

export async function loadCategories(){
  const supa=getSupabase();
  try{
    const {data,error}=await supa.from("categories").select("id,name,slug,type").order("sort_order").order("name");
    if(error) throw error;
    categories=data||[];
    populateCategorySelect();
  }catch(err){
    console.error("[TPM products] loadCategories failed",err);
    toast(err.message||"Failed to load categories","err");
  }
}

function populateCategorySelect(){
  if(!els.fCat || !els.catFilter) return;
  // form select
  const formSel=els.fCat;
  const prevVal=formSel.value;
  formSel.innerHTML=`<option value="">— No category —</option>`+
    `<optgroup label="Market">${categories.filter(c=>c.type==='market').map(c=>`<option value="${c.id}">${escapeHtml(c.name)} (${escapeHtml(c.slug)})</option>`).join("")}</optgroup>`+
    `<optgroup label="Café">${categories.filter(c=>c.type==='cafe').map(c=>`<option value="${c.id}">${escapeHtml(c.name)} (${escapeHtml(c.slug)})</option>`).join("")}</optgroup>`;
  if(prevVal) formSel.value=prevVal;

  // filter select
  const filterSel=els.catFilter;
  const prevFilter=categoryFilter;
  filterSel.innerHTML=`<option value="all">All categories</option>`+categories.map(c=>`<option value="${c.id}">${escapeHtml(c.name)} — ${c.type==='cafe'?'Café':'Market'}</option>`).join("");
  filterSel.innerHTML+=`<option value="none">— No category —</option>`;
  categoryFilter=prevFilter;
  filterSel.value=categoryFilter;
}

export async function loadProducts(){
  const supa=getSupabase();
  if(!els.tbody) return;
  els.tbody.innerHTML=`<tr><td colspan="7" class="admin-empty">Loading…</td></tr>`;
  if(els.cards) els.cards.innerHTML="";
  try{
    const {data,error}=await supa.from("products").select("*, categories(id,name,slug,type)").order("sort_order").order("name");
    if(error) throw error;
    products=data||[];
    applyFilter();
  }catch(err){
    console.error("[TPM products] load failed",err);
    toast(err.message||"Failed to load products","err");
    if(els.tbody) els.tbody.innerHTML=`<tr><td colspan="7" class="admin-empty">Failed to load: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function applyFilter(){
  filtered=products.filter(p=>{
    const cat=p.categories;
    const matchesSearch=!searchTerm || p.name.toLowerCase().includes(searchTerm) || p.slug.toLowerCase().includes(searchTerm) || (p.description||"").toLowerCase().includes(searchTerm) || (p.badge||"").toLowerCase().includes(searchTerm);
    const matchesCat=categoryFilter==="all" || (categoryFilter==="none" ? !p.category_id : String(p.category_id)===String(categoryFilter));
    const matchesType=typeFilter==="all" || (cat && cat.type===typeFilter);
    // if type filter is not all and product has no category, it fails
    if(typeFilter!=="all" && !cat) return false;
    return matchesSearch && matchesCat && matchesType;
  });
  render();
}

function render(){
  if(els.stats){
    const total=products.length;
    const active=products.filter(p=>p.is_active).length;
    const market=products.filter(p=>p.categories?.type==="market").length;
    const cafe=products.filter(p=>p.categories?.type==="cafe").length;
    const unc=products.filter(p=>!p.category_id).length;
    els.stats.innerHTML=`<span>${total} total</span><span>${active} active</span><span>${market} market</span><span>${cafe} café</span><span>${unc} uncategorized</span><span>${filtered.length} shown</span>`;
  }
  if(!filtered.length){
    if(els.tbody) els.tbody.innerHTML=`<tr><td colspan="7" class="admin-empty"><strong>No products</strong>${searchTerm||categoryFilter!=="all"||typeFilter!=="all"?"<br>Try adjusting filters.":"<br>Click “Add Product” to create the first one."}</td></tr>`;
    if(els.cards) els.cards.innerHTML=`<div class="admin-empty"><strong>No products</strong><br>${searchTerm||categoryFilter!=="all"||typeFilter!=="all"?"Try adjusting filters.":"Tap Add Product to start."}</div>`;
    return;
  }
  if(els.tbody){
    els.tbody.innerHTML=filtered.map(p=>{
      const cat=p.categories;
      const catBadge=cat? (cat.type==="cafe"?`<span class="admin-badge admin-badge--cafe">${escapeHtml(cat.name)} • Café</span>`:`<span class="admin-badge admin-badge--market">${escapeHtml(cat.name)}</span>`) : `<span class="admin-badge" style="background:rgba(14,26,20,.06)">No category</span>`;
      const typeBadge=cat? (cat.type==="cafe"?`<span class="admin-badge admin-badge--cafe">Café</span>`:`<span class="admin-badge admin-badge--market">Market</span>`) : `<span class="admin-badge admin-badge--inactive">Uncat</span>`;
      const activeBadge=p.is_active?`<span class="admin-badge admin-badge--active">Active</span>`:`<span class="admin-badge admin-badge--inactive">Inactive</span>`;
      const price=formatPrice(p.price);
      const badge=p.badge?`<span class="admin-badge" style="background:var(--cream-2);border-color:var(--line-strong)">${escapeHtml(p.badge)}</span>`:"—";
      const img=p.image_url||p.image_path?`<span style="font-size:11px;color:var(--muted)">img</span>`:"";
      return `<tr>
        <td><div style="font-weight:700">${escapeHtml(p.name)}</div>${p.description?`<div style="font-size:11px;color:var(--muted);max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.description)}</div>`:""}${img}</td>
        <td>${catBadge}<div style="margin-top:4px">${typeBadge}</div></td>
        <td>${price}</td>
        <td>${badge}</td>
        <td>${activeBadge}</td>
        <td class="col-sort">${p.sort_order}</td>
        <td><div class="admin-table-actions"><button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="edit" data-id="${p.id}">Edit</button><button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="toggle" data-id="${p.id}">${p.is_active?"Deactivate":"Activate"}</button><button class="admin-btn admin-btn--danger admin-btn--sm" data-action="delete" data-id="${p.id}">Delete</button></div></td>
      </tr>`;
    }).join("");
  }
  if(els.cards){
    els.cards.innerHTML=filtered.map(p=>{
      const cat=p.categories;
      const catName=cat?cat.name:"No category";
      const typeBadge=cat? (cat.type==="cafe"?"Café":"Market") : "Uncat";
      const activeBadge=p.is_active?"Active":"Inactive";
      return `<div class="cat-card">
        <div class="cat-card-head"><strong>${escapeHtml(p.name)}</strong><span style="display:flex;gap:6px"><span class="admin-badge ${cat?.type==="cafe"?"admin-badge--cafe":"admin-badge--market"}">${escapeHtml(typeBadge)}</span><span class="admin-badge ${p.is_active?"admin-badge--active":"admin-badge--inactive"}">${activeBadge}</span></span></div>
        <div class="cat-card-meta"><span>${escapeHtml(catName)}</span><span>${formatPrice(p.price)}</span></div>
        ${p.badge?`<div style="margin:4px 0"><span class="admin-badge">${escapeHtml(p.badge)}</span></div>`:""}
        ${p.description?`<div style="font-size:12px;color:var(--muted);margin-bottom:8px">${escapeHtml(p.description)}</div>`:""}
        <div class="cat-card-row"><span>Slug</span><span class="col-slug">${escapeHtml(p.slug)}</span></div>
        <div class="cat-card-row"><span>Order</span><span>${p.sort_order}</span></div>
        <div class="cat-card-actions"><button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="edit" data-id="${p.id}">Edit</button><button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="toggle" data-id="${p.id}">${p.is_active?"Deactivate":"Activate"}</button><button class="admin-btn admin-btn--danger admin-btn--sm" data-action="delete" data-id="${p.id}">Delete</button></div>
      </div>`;
    }).join("");
  }
}

function openModal(prod){
  editingId=prod?prod.id:null;
  if(els.modalTitle) els.modalTitle.textContent=editingId?"Edit Product":"Add Product";
  clearAllErrors();
  if(prod){
    slugManuallyEdited=true;
    els.fName.value=prod.name||"";
    els.fSlug.value=prod.slug||"";
    els.fCat.value=prod.category_id||"";
    els.fDesc.value=prod.description||"";
    els.fPrice.value=prod.price ?? "";
    els.fBadge.value=prod.badge||"";
    els.fSort.value=prod.sort_order??0;
    els.fActive.checked=!!prod.is_active;
    els.fImgPath.value=prod.image_path||"";
    els.fImgUrl.value=prod.image_url||"";
    if(els.fImgFile) els.fImgFile.value="";
    updatePreview();
  } else {
    els.fName.value=""; els.fSlug.value=""; els.fCat.value=""; els.fDesc.value=""; els.fPrice.value=""; els.fBadge.value=""; els.fSort.value=0; els.fActive.checked=true; els.fImgPath.value=""; els.fImgUrl.value=""; if(els.fImgFile) els.fImgFile.value=""; slugManuallyEdited=false; updatePreview();
  }
  els.modal?.classList.add("open");
  setTimeout(()=>els.fName?.focus(),50);
}
function closeModal(){ els.modal?.classList.remove("open"); editingId=null; clearAllErrors(); }

let pendingDeleteId=null;
function openDeleteModal(prod){
  pendingDeleteId=prod.id;
  if(els.deleteName) els.deleteName.textContent=`${prod.name} (${prod.slug})`;
  els.deleteModal?.classList.add("open");
}
function closeDeleteModal(){ pendingDeleteId=null; els.deleteModal?.classList.remove("open"); }
async function confirmDelete(){
  if(!pendingDeleteId) return;
  const id=pendingDeleteId;
  closeDeleteModal();
  await deleteProduct(id);
}

function clearFieldError(field){
  const el=document.getElementById(`field-prod-${field}`);
  if(el) el.classList.remove("has-error");
}
function setFieldError(field,msg){
  const wrap=document.getElementById(`field-prod-${field}`);
  if(!wrap) return;
  wrap.classList.add("has-error");
  const err=wrap.querySelector(".error");
  if(err) err.textContent=msg;
}
function clearAllErrors(){ document.querySelectorAll("#prodForm .admin-field.has-error").forEach(e=>e.classList.remove("has-error")); }

async function handleSubmit(){
  const name=els.fName.value.trim();
  const rawSlug=els.fSlug.value.trim().toLowerCase();
  const slug=slugify(rawSlug||name);
  const category_id=els.fCat.value?Number(els.fCat.value):null;
  const description=els.fDesc.value.trim()||null;
  let priceVal=els.fPrice.value.trim();
  let price=null;
  if(priceVal!==""){
    price=Number(priceVal);
    if(Number.isNaN(price)) price=null;
  }
  const badge=els.fBadge.value.trim()||null;
  const sort_order=parseInt(els.fSort.value,10);
  const is_active=!!els.fActive.checked;
  let image_path=els.fImgPath.value.trim()||null;
  let image_url=els.fImgUrl.value.trim()||null;

  clearAllErrors();
  let hasError=false;
  if(!name){ setFieldError("name","Name is required."); hasError=true; }
  if(!slug){ setFieldError("slug","Slug is required."); hasError=true; }
  else if(!validateSlug(slug)){ setFieldError("slug","Slug must be a-z, 0-9, hyphens (e.g., my-product)."); hasError=true; }
  if(isNaN(sort_order)||sort_order<0){ setFieldError("sort","Sort order must be >=0."); hasError=true; }
  if(price!==null && (isNaN(price) || price<0)){ setFieldError("price","Price must be >=0."); hasError=true; }
  if(category_id!==null && !categories.find(c=>c.id===category_id)){ setFieldError("category","Invalid category."); hasError=true; }

  if(els.fSlug.value!==slug) els.fSlug.value=slug;
  if(hasError) return;

  // duplicate slug check
  try{
    const supa=getSupabase();
    let q=supa.from("products").select("id").eq("slug",slug);
    if(editingId) q=q.neq("id",editingId);
    const {data:dup,error:dupErr}=await q.limit(1);
    if(dupErr) throw dupErr;
    if(dup&&dup.length){ setFieldError("slug","Slug already exists."); toast("Slug already exists","err"); return; }
  }catch(err){ console.error("[TPM products] dup check",err); }

  const submitBtn=els.form.querySelector('button[type="submit"]');
  const prevText=submitBtn?submitBtn.textContent:"";
  if(submitBtn){ submitBtn.disabled=true; submitBtn.textContent=editingId?"Saving…":"Creating…"; }

  // handle image upload if file selected
  try{
    const file=els.fImgFile?.files?.[0];
    if(file){
      const supa=getSupabase();
      const safeSlug=slugify(name)||"product";
      const ext=file.name.split(".").pop()||"jpg";
      const path=`${Date.now()}-${safeSlug}.${ext}`;
      toast("Uploading image…","ok");
      const { error: upErr }=await supa.storage.from("product-images").upload(path, file, { upsert:false, contentType:file.type });
      if(upErr) throw upErr;
      const { data: pub }=supa.storage.from("product-images").getPublicUrl(path);
      image_path=path;
      image_url=pub?.publicUrl||null;
      // reflect back to inputs
      els.fImgPath.value=image_path||"";
      els.fImgUrl.value=image_url||"";
      updatePreview();
    }
  }catch(err){
    console.error("[TPM products] upload failed",err);
    toast("Image upload failed: "+(err.message||""),"err");
    if(submitBtn){ submitBtn.disabled=false; submitBtn.textContent=prevText; }
    return;
  }

  // preserve existing image if editing and no new file and fields blank but original had value?
  // Our form is prefilled, so blank means intentionally cleared. That's per spec: do not delete automatically — but clearing via empty field is intentional.
  // If editing and user didn't touch image fields, they remain prefilled, so preserved.

  const payload={ name, slug, category_id, description, price, badge, sort_order, is_active, image_path, image_url };

  try{
    const supa=getSupabase();
    let result;
    if(editingId){
      result=await supa.from("products").update(payload).eq("id",editingId).select().single();
    } else {
      result=await supa.from("products").insert(payload).select().single();
    }
    if(result.error) throw result.error;
    toast(editingId?"Product updated":"Product created","ok");
    closeModal();
    await loadProducts();
  }catch(err){
    console.error("[TPM products] save failed",err);
    const msg=err.message||"Save failed";
    if(msg.toLowerCase().includes("duplicate")||msg.toLowerCase().includes("slug")) setFieldError("slug","Slug already exists.");
    else if(msg.toLowerCase().includes("price")) setFieldError("price",msg);
    toast(msg,"err");
  }finally{
    if(submitBtn){ submitBtn.disabled=false; submitBtn.textContent=prevText|| (editingId?"Save":"Create"); }
  }
}

async function deleteProduct(id){
  const prod=products.find(p=>p.id===id);
  if(!prod) return;
  try{
    const supa=getSupabase();
    const {error}=await supa.from("products").delete().eq("id",id);
    if(error) throw error;
    // do NOT delete image from storage automatically per spec
    toast(`Deleted ${prod.name}`,"ok");
    await loadProducts();
  }catch(err){
    console.error("[TPM products] delete failed",err);
    toast(err.message||"Delete failed","err");
  }
}
async function toggleActive(prod){
  try{
    const supa=getSupabase();
    const {error}=await supa.from("products").update({is_active:!prod.is_active}).eq("id",prod.id);
    if(error) throw error;
    toast(prod.is_active?`Deactivated ${prod.name}`:`Activated ${prod.name}`,"ok");
    await loadProducts();
  }catch(err){
    console.error("[TPM products] toggle failed",err);
    toast(err.message||"Toggle failed","err");
  }
}

export const _test={slugify,validateSlug};
