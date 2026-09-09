// site/admin/js/social_links.js — Social Links Management
// Uses existing Supabase client + is_admin() RLS. No service_role.

import { getSupabase } from "./supabase.js";

function escapeHtml(s){ return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function toast(msg, kind="ok"){
  let stack=document.getElementById("adminToastStack");
  if(!stack){ stack=document.createElement("div"); stack.id="adminToastStack"; stack.className="admin-toast-stack"; document.body.appendChild(stack); }
  const t=document.createElement("div"); t.className=`admin-toast ${kind}`; t.innerHTML=`<span style="flex:1">${escapeHtml(msg)}</span><button aria-label="Dismiss">×</button>`;
  t.querySelector("button").addEventListener("click",()=>t.remove()); stack.appendChild(t); setTimeout(()=>{ if(t.parentNode) t.remove(); }, 4200);
}
function isValidUrl(v){
  if(!v) return false;
  try{ const u=new URL(v); return u.protocol==="http:"||u.protocol==="https:"; }catch{ return false; }
}

// Platforms supported by the project (seed data + public site hero allowlist in js/public.js).
// Values are lowercase keys: the public site resolves brand icons from the platform key,
// and existing rows store lowercase platform values.
const SOCIAL_PLATFORMS=["instagram","tiktok","facebook"];

// Brand icons — same project icon system as the public site (site/js/public.js
// maps platform key -> Simple Icons brand SVG). Resolved from the platform key
// only; the `icon` DB column is preserved but never displayed.
const SOCIAL_BRAND_ICONS={
  instagram:`<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M7.03.08c-1.277.06-2.149.26-2.911.563-.789.308-1.458.72-2.123 1.388-.665.668-1.075 1.337-1.38 2.127-.295.764-.496 1.637-.552 2.914-.056 1.278-.069 1.688-.063 4.947.006 3.259.021 3.667.083 4.947.061 1.277.264 2.148.563 2.911.308.789.72 1.457 1.388 2.123.668.666 1.337 1.074 2.129 1.38.763.295 1.636.496 2.913.552 1.277.056 1.688.069 4.946.063 3.258-.006 3.668-.021 4.948-.081 1.28-.061 2.147-.265 2.91-.563.789-.309 1.458-.72 2.123-1.388.665-.668 1.074-1.338 1.38-2.128.295-.763.496-1.636.552-2.912.056-1.281.069-1.69.063-4.948-.006-3.258-.021-3.667-.082-4.947-.061-1.28-.264-2.149-.563-2.912-.308-.789-.72-1.457-1.388-2.123C21.3 1.33 20.63.921 19.838.616 19.074.321 18.202.12 16.924.065 15.647.009 15.236-.005 11.977.001 8.718.008 8.31.022 7.03.084m.14 21.693c-1.17-.051-1.805-.245-2.229-.408-.561-.216-.96-.477-1.382-.895-.422-.418-.681-.819-.9-1.378-.164-.423-.362-1.058-.417-2.228-.06-1.265-.072-1.644-.079-4.848-.007-3.204.005-3.583.061-4.848.05-1.169.246-1.805.408-2.228.216-.561.476-.96.895-1.382.419-.422.818-.681 1.378-.9.423-.165 1.058-.361 2.227-.417 1.266-.06 1.645-.072 4.848-.079 3.203-.007 3.584.005 4.85.061 1.169.051 1.805.245 2.228.408.561.216.96.475 1.382.895.422.419.682.818.901 1.379.165.422.362 1.056.417 2.226.06 1.266.074 1.645.08 4.848.006 3.203-.006 3.583-.061 4.848-.051 1.17-.245 1.806-.408 2.229-.216.56-.476.96-.895 1.381-.419.422-.818.681-1.378.9-.422.165-1.058.362-2.226.417-1.266.06-1.645.072-4.849.079-3.205.007-3.583-.006-4.848-.061M16.953 5.586A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.442M5.84 12.012c.007 3.403 2.771 6.156 6.173 6.149 3.403-.006 6.157-2.77 6.151-6.173-.007-3.403-2.771-6.157-6.174-6.15-3.403.007-6.156 2.771-6.15 6.174M8 12.008a4 4 0 1 1 4.008 3.992A3.9996 3.9996 0 0 1 8 12.008z"/></svg>`,
  facebook:`<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg>`,
  tiktok:`<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
};
function brandIcon(platform){
  const key=String(platform||"").trim().toLowerCase();
  return SOCIAL_BRAND_ICONS[key]||`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>`;
}

// DB write path (unchanged): icon column stores the platform key.
function resolveIcon(platform){
  return String(platform||"").trim().toLowerCase();
}

// Handle is display-only (public site falls back to platform when empty).
// Derive it from the URL path so the admin never has to type it.
function deriveHandle(platform, url){
  const key=String(platform||"").trim().toLowerCase()||"platform";
  try{
    const u=new URL(url);
    const segs=u.pathname.split("/").filter(Boolean);
    let last=segs.length?decodeURIComponent(segs[segs.length-1]):"";
    if(!last) return key;
    if(key==="facebook") return last.replace(/[-_]+/g," ").trim()||key;
    if(!last.startsWith("@")) last="@"+last;
    return last;
  }catch{ return key; }
}

// Sort order is assigned automatically after the existing links (seed cadence is 10/20/30).
function nextSortOrder(){
  const max=links.reduce((m,l)=>Math.max(m,Number(l.sort_order)||0),0);
  return (Number.isFinite(max)?max:0)+10;
}

let links=[];
let filtered=[];
let editingId=null;
let editingItem=null;
let searchTerm="";

const els={};

export async function initSocialLinks(){
  els.wrap=document.getElementById("socialWrap");
  if(!els.wrap){ console.warn("[TPM social] wrap not found"); return; }
  els.tbody=document.getElementById("socialTbody");
  els.cards=document.getElementById("socialCards");
  els.stats=document.getElementById("socialStats");
  els.search=document.getElementById("socialSearch");
  els.addBtn=document.getElementById("socialAddBtn");
  els.refreshBtn=document.getElementById("socialRefreshBtn");
  els.modal=document.getElementById("socialModal");
  els.modalOverlay=els.modal?.querySelector(".admin-modal-overlay");
  els.modalClose=document.getElementById("socialModalClose");
  els.modalCancel=document.getElementById("socialModalCancel");
  els.modalTitle=document.getElementById("socialModalTitle");
  els.form=document.getElementById("socialForm");
  els.fPlatform=document.getElementById("socialPlatform");
  els.fUrl=document.getElementById("socialUrl");
  els.fActive=document.getElementById("socialActive");
  els.deleteModal=document.getElementById("socialDeleteModal");
  els.deleteName=document.getElementById("socialDeleteName");
  els.deleteCancel=document.getElementById("socialDeleteCancel");
  els.deleteConfirm=document.getElementById("socialDeleteConfirm");
  els.deleteOverlay=els.deleteModal?.querySelector(".admin-modal-overlay");
  els.deleteClose=document.getElementById("socialDeleteClose");

  if(!els.tbody) return;

  els.search?.addEventListener("input", e=>{ searchTerm=e.target.value.trim().toLowerCase(); applyFilter(); });
  els.addBtn?.addEventListener("click", ()=>openModal(null));
  els.refreshBtn?.addEventListener("click", ()=>loadSocialLinks());
  els.modalClose?.addEventListener("click", closeModal);
  els.modalCancel?.addEventListener("click", closeModal);
  els.modalOverlay?.addEventListener("click", closeModal);
  els.deleteCancel?.addEventListener("click", closeDeleteModal);
  els.deleteClose?.addEventListener("click", closeDeleteModal);
  els.deleteOverlay?.addEventListener("click", closeDeleteModal);
  els.deleteConfirm?.addEventListener("click", confirmDelete);
  els.form?.addEventListener("submit", async e=>{ e.preventDefault(); await handleSubmit(); });
  document.addEventListener("keydown", e=>{
    if(e.key==="Escape"){
      if(els.deleteModal?.classList.contains("open")) closeDeleteModal();
      else if(els.modal?.classList.contains("open")) closeModal();
    }
  });
  els.tbody?.addEventListener("click", handleTableClick);
  els.cards?.addEventListener("click", handleTableClick);

  await loadSocialLinks();
}

function handleTableClick(e){
  const btn=e.target.closest("button[data-action]");
  if(!btn) return;
  const action=btn.dataset.action;
  const id=Number(btn.dataset.id);
  const item=links.find(l=>l.id===id);
  if(!item) return;
  if(action==="edit") openModal(item);
  else if(action==="delete") openDeleteModal(item);
  else if(action==="toggle") toggleActive(item);
}

export async function loadSocialLinks(){
  const supa=getSupabase();
  if(!els.tbody) return;
  els.tbody.innerHTML=`<tr><td colspan="4" class="admin-empty">Loading…</td></tr>`;
  if(els.cards) els.cards.innerHTML="";
  try{
    const { data, error }=await supa.from("social_links").select("*").order("sort_order").order("platform");
    if(error) throw error;
    links=data||[];
    applyFilter();
  }catch(err){
    console.error("[TPM social] load failed",err);
    toast(err.message||"Failed to load social links","err");
    if(els.tbody) els.tbody.innerHTML=`<tr><td colspan="4" class="admin-empty">Failed to load: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function applyFilter(){
  filtered=links.filter(l=>{
    if(!searchTerm) return true;
    return l.platform.toLowerCase().includes(searchTerm) || l.url.toLowerCase().includes(searchTerm) || (l.handle||"").toLowerCase().includes(searchTerm) || (l.icon||"").toLowerCase().includes(searchTerm);
  });
  render();
}

function render(){
  if(els.stats){
    const total=links.length;
    const active=links.filter(l=>l.is_active).length;
    els.stats.innerHTML=`<span>${total} total</span><span>${active} active</span><span>${filtered.length} shown</span>`;
  }
  if(!filtered.length){
    if(els.tbody) els.tbody.innerHTML=`<tr><td colspan="4" class="admin-empty"><strong>No social links</strong>${searchTerm?"<br>Try adjusting search.":"<br>Click “Add Link” to create the first one."}</td></tr>`;
    if(els.cards) els.cards.innerHTML=`<div class="admin-empty"><strong>No social links</strong><br>${searchTerm?"Try adjusting search.":"Tap Add Link to start."}</div>`;
    return;
  }
  if(els.tbody){
    els.tbody.innerHTML=filtered.map(l=>{
      const activeBadge=l.is_active?`<span class="admin-badge admin-badge--active">Active</span>`:`<span class="admin-badge admin-badge--inactive">Inactive</span>`;
      return `<tr>
        <td><div class="soc-name"><span class="soc-ico">${brandIcon(l.platform)}</span><div><div style="font-weight:700">${escapeHtml(l.platform)}</div><div style="font-size:11px;color:var(--muted)">${escapeHtml(l.handle||"")}</div></div></div></td>
        <td><a href="${escapeHtml(l.url)}" target="_blank" rel="noopener" style="color:var(--tpm-green);font-size:12px;word-break:break-all">${escapeHtml(l.url)}</a></td>
        <td>${activeBadge}</td>
        <td><div class="admin-table-actions"><button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="edit" data-id="${l.id}">Edit</button><button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="toggle" data-id="${l.id}">${l.is_active?"Deactivate":"Activate"}</button><button class="admin-btn admin-btn--danger admin-btn--sm" data-action="delete" data-id="${l.id}">Delete</button></div></td>
      </tr>`;
    }).join("");
  }
  if(els.cards){
    els.cards.innerHTML=filtered.map(l=>{
      const activeBadge=l.is_active?`<span class="admin-badge admin-badge--active">Active</span>`:`<span class="admin-badge admin-badge--inactive">Inactive</span>`;
      return `<div class="cat-card">
        <div class="cat-card-head"><span class="soc-name"><span class="soc-ico">${brandIcon(l.platform)}</span><strong>${escapeHtml(l.platform)}</strong></span>${activeBadge}</div>
        <div class="soc-url"><a href="${escapeHtml(l.url)}" target="_blank" rel="noopener" style="color:var(--tpm-green)">${escapeHtml(l.url)}</a></div>
        <div class="cat-card-actions"><button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="edit" data-id="${l.id}">Edit</button><button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="toggle" data-id="${l.id}">${l.is_active?"Deactivate":"Activate"}</button><button class="admin-btn admin-btn--danger admin-btn--sm" data-action="delete" data-id="${l.id}">Delete</button></div>
      </div>`;
    }).join("");
  }
}

function setPlatformValue(platform){
  // The select only lists supported platforms. Preserve a legacy/custom stored
  // value (if any) via a temporary option so editing never loses data.
  const key=String(platform||"").trim().toLowerCase();
  let opt=[...els.fPlatform.options].find(o=>o.value===key);
  if(!opt && key){
    opt=document.createElement("option");
    opt.value=key;
    opt.textContent=platform;
    els.fPlatform.appendChild(opt);
  }
  els.fPlatform.value=key||SOCIAL_PLATFORMS[0];
}

function openModal(item){
  editingId=item?item.id:null;
  editingItem=item||null;
  if(els.modalTitle) els.modalTitle.textContent=editingId?"Edit Social Link":"Add Social Link";
  clearAllErrors();
  // Drop any legacy temporary option from a previous edit
  [...els.fPlatform.options].forEach(o=>{
    if(!SOCIAL_PLATFORMS.includes(o.value)) o.remove();
  });
  if(item){
    setPlatformValue(item.platform);
    els.fUrl.value=item.url||"";
    els.fActive.checked=!!item.is_active;
  }else{
    els.fPlatform.value=SOCIAL_PLATFORMS[0]; els.fUrl.value=""; els.fActive.checked=true;
  }
  els.modal?.classList.add("open");
  setTimeout(()=>els.fPlatform?.focus(),50);
}
function closeModal(){ els.modal?.classList.remove("open"); editingId=null; editingItem=null; clearAllErrors(); }

let pendingDeleteId=null;
function openDeleteModal(item){
  pendingDeleteId=item.id;
  if(els.deleteName) els.deleteName.textContent=`${item.platform} (${item.url})`;
  els.deleteModal?.classList.add("open");
}
function closeDeleteModal(){ pendingDeleteId=null; els.deleteModal?.classList.remove("open"); }
async function confirmDelete(){
  if(!pendingDeleteId) return;
  const id=pendingDeleteId;
  closeDeleteModal();
  await deleteLink(id);
}

function clearFieldError(field){
  const el=document.getElementById(`field-social-${field}`);
  if(el) el.classList.remove("has-error");
}
function setFieldError(field,msg){
  const wrap=document.getElementById(`field-social-${field}`);
  if(!wrap) return;
  wrap.classList.add("has-error");
  const err=wrap.querySelector(".error");
  if(err) err.textContent=msg;
}
function clearAllErrors(){ document.querySelectorAll("#socialForm .admin-field.has-error").forEach(e=>e.classList.remove("has-error")); }

async function handleSubmit(){
  const platform=els.fPlatform.value.trim().toLowerCase();
  const url=els.fUrl.value.trim();
  const is_active=!!els.fActive.checked;

  clearAllErrors();
  let hasError=false;
  if(!platform || platform.length===0){ setFieldError("platform","Platform is required."); hasError=true; }
  if(!url){ setFieldError("url","URL is required."); hasError=true; }
  else if(!isValidUrl(url)){ setFieldError("url","URL must be http/https (e.g., https://...)."); hasError=true; }
  if(hasError) return;

  // duplicate (platform,url) check
  try{
    const supa=getSupabase();
    let q=supa.from("social_links").select("id").eq("platform",platform).eq("url",url);
    if(editingId) q=q.neq("id",editingId);
    const {data:dup,error:dupErr}=await q.limit(1);
    if(dupErr) throw dupErr;
    if(dup&&dup.length){ setFieldError("url","This platform + URL already exists."); toast("Duplicate platform + URL","err"); return; }
  }catch(err){ console.error("[TPM social] dup check",err); }

  const payload={ platform, url, is_active };
  if(editingId && editingItem){
    // Edit: preserve current data unless the admin explicitly changed it.
    // URL change -> re-derive handle; platform change -> re-resolve icon.
    payload.handle=(url!==editingItem.url)?deriveHandle(platform,url):(editingItem.handle??null);
    payload.icon=(platform!==String(editingItem.platform||"").trim().toLowerCase())
      ?resolveIcon(platform)
      :(editingItem.icon??resolveIcon(platform));
    payload.sort_order=editingItem.sort_order??0;
  }else{
    // Add: handle derived from URL, icon from platform, order appended last.
    payload.handle=deriveHandle(platform,url);
    payload.icon=resolveIcon(platform);
    payload.sort_order=nextSortOrder();
  }

  const btn=els.form.querySelector('button[type="submit"]');
  const prev=btn?btn.textContent:"";
  if(btn){ btn.disabled=true; btn.textContent=editingId?"Saving…":"Creating…"; }
  try{
    const supa=getSupabase();
    let result;
    if(editingId){
      result=await supa.from("social_links").update(payload).eq("id",editingId).select().single();
    } else {
      result=await supa.from("social_links").insert(payload).select().single();
    }
    if(result.error) throw result.error;
    toast(editingId?"Social link updated":"Social link created","ok");
    closeModal();
    await loadSocialLinks();
  }catch(err){
    console.error("[TPM social] save failed",err);
    const msg=err.message||"Save failed";
    if(msg.toLowerCase().includes("duplicate")||msg.toLowerCase().includes("platform")&&msg.toLowerCase().includes("url")) setFieldError("url","Duplicate platform + URL.");
    else if(msg.toLowerCase().includes("url") && msg.toLowerCase().includes("https")) setFieldError("url",msg);
    toast(msg,"err");
  }finally{
    if(btn){ btn.disabled=false; btn.textContent=prev|| (editingId?"Save":"Create"); }
  }
}

async function deleteLink(id){
  const item=links.find(l=>l.id===id);
  if(!item) return;
  try{
    const supa=getSupabase();
    const {error}=await supa.from("social_links").delete().eq("id",id);
    if(error) throw error;
    toast(`Deleted ${item.platform}`,"ok");
    await loadSocialLinks();
  }catch(err){
    console.error("[TPM social] delete failed",err);
    toast(err.message||"Delete failed","err");
  }
}
async function toggleActive(item){
  try{
    const supa=getSupabase();
    const {error}=await supa.from("social_links").update({is_active:!item.is_active}).eq("id",item.id);
    if(error) throw error;
    toast(item.is_active?`Deactivated ${item.platform}`:`Activated ${item.platform}`,"ok");
    await loadSocialLinks();
  }catch(err){
    console.error("[TPM social] toggle failed",err);
    toast(err.message||"Toggle failed","err");
  }
}
