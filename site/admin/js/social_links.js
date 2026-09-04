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

let links=[];
let filtered=[];
let editingId=null;
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
  els.fHandle=document.getElementById("socialHandle");
  els.fIcon=document.getElementById("socialIcon");
  els.fSort=document.getElementById("socialSort");
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
  els.tbody.innerHTML=`<tr><td colspan="6" class="admin-empty">Loading…</td></tr>`;
  if(els.cards) els.cards.innerHTML="";
  try{
    const { data, error }=await supa.from("social_links").select("*").order("sort_order").order("platform");
    if(error) throw error;
    links=data||[];
    applyFilter();
  }catch(err){
    console.error("[TPM social] load failed",err);
    toast(err.message||"Failed to load social links","err");
    if(els.tbody) els.tbody.innerHTML=`<tr><td colspan="6" class="admin-empty">Failed to load: ${escapeHtml(err.message)}</td></tr>`;
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
    if(els.tbody) els.tbody.innerHTML=`<tr><td colspan="6" class="admin-empty"><strong>No social links</strong>${searchTerm?"<br>Try adjusting search.":"<br>Click “Add Link” to create the first one."}</td></tr>`;
    if(els.cards) els.cards.innerHTML=`<div class="admin-empty"><strong>No social links</strong><br>${searchTerm?"Try adjusting search.":"Tap Add Link to start."}</div>`;
    return;
  }
  if(els.tbody){
    els.tbody.innerHTML=filtered.map(l=>{
      const activeBadge=l.is_active?`<span class="admin-badge admin-badge--active">Active</span>`:`<span class="admin-badge admin-badge--inactive">Inactive</span>`;
      return `<tr>
        <td><div style="font-weight:700">${escapeHtml(l.platform)}</div><div style="font-size:11px;color:var(--muted)">${escapeHtml(l.handle||"")}</div></td>
        <td><a href="${escapeHtml(l.url)}" target="_blank" rel="noopener" style="color:var(--tpm-green);font-size:12px;word-break:break-all">${escapeHtml(l.url)}</a>${l.icon?`<div style="font-size:11px;color:var(--muted)">icon: ${escapeHtml(l.icon)}</div>`:""}</td>
        <td class="col-sort">${l.sort_order}</td>
        <td>${activeBadge}</td>
        <td><div class="admin-table-actions"><button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="edit" data-id="${l.id}">Edit</button><button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="toggle" data-id="${l.id}">${l.is_active?"Deactivate":"Activate"}</button><button class="admin-btn admin-btn--danger admin-btn--sm" data-action="delete" data-id="${l.id}">Delete</button></div></td>
      </tr>`;
    }).join("");
  }
  if(els.cards){
    els.cards.innerHTML=filtered.map(l=>{
      const activeBadge=l.is_active?`<span class="admin-badge admin-badge--active">Active</span>`:`<span class="admin-badge admin-badge--inactive">Inactive</span>`;
      return `<div class="cat-card">
        <div class="cat-card-head"><strong>${escapeHtml(l.platform)}</strong>${activeBadge}</div>
        <div style="font-size:12px;word-break:break-all;margin-bottom:6px"><a href="${escapeHtml(l.url)}" target="_blank" rel="noopener" style="color:var(--tpm-green)">${escapeHtml(l.url)}</a></div>
        ${l.handle?`<div style="font-size:11px;color:var(--muted)">Handle: ${escapeHtml(l.handle)}</div>`:""}
        ${l.icon?`<div style="font-size:11px;color:var(--muted)">Icon: ${escapeHtml(l.icon)}</div>`:""}
        <div class="cat-card-row"><span>Order</span><span>${l.sort_order}</span></div>
        <div class="cat-card-actions"><button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="edit" data-id="${l.id}">Edit</button><button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="toggle" data-id="${l.id}">${l.is_active?"Deactivate":"Activate"}</button><button class="admin-btn admin-btn--danger admin-btn--sm" data-action="delete" data-id="${l.id}">Delete</button></div>
      </div>`;
    }).join("");
  }
}

function openModal(item){
  editingId=item?item.id:null;
  if(els.modalTitle) els.modalTitle.textContent=editingId?"Edit Social Link":"Add Social Link";
  clearAllErrors();
  if(item){
    els.fPlatform.value=item.platform||"";
    els.fUrl.value=item.url||"";
    els.fHandle.value=item.handle||"";
    els.fIcon.value=item.icon||"";
    els.fSort.value=item.sort_order??0;
    els.fActive.checked=!!item.is_active;
  }else{
    els.fPlatform.value=""; els.fUrl.value=""; els.fHandle.value=""; els.fIcon.value=""; els.fSort.value=0; els.fActive.checked=true;
  }
  els.modal?.classList.add("open");
  setTimeout(()=>els.fPlatform?.focus(),50);
}
function closeModal(){ els.modal?.classList.remove("open"); editingId=null; clearAllErrors(); }

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
  const platform=els.fPlatform.value.trim();
  const url=els.fUrl.value.trim();
  const handle=els.fHandle.value.trim()||null;
  const icon=els.fIcon.value.trim()||null;
  const sort_order=parseInt(els.fSort.value,10);
  const is_active=!!els.fActive.checked;

  clearAllErrors();
  let hasError=false;
  if(!platform || platform.length===0){ setFieldError("platform","Platform is required."); hasError=true; }
  if(!url){ setFieldError("url","URL is required."); hasError=true; }
  else if(!isValidUrl(url)){ setFieldError("url","URL must be http/https (e.g., https://...)."); hasError=true; }
  if(isNaN(sort_order)||sort_order<0){ setFieldError("sort","Sort order must be >=0."); hasError=true; }
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

  const payload={ platform, url, handle, icon, sort_order, is_active };

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
