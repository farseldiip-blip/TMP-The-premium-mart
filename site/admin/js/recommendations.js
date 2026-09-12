// site/admin/js/recommendations.js — Product Recommendation moderation
// Uses existing Supabase client + is_admin() RLS. No service_role.
// Private pending images preview via short-lived signed URLs (never stored).
// On approve, the file is copied into the existing public product-images
// bucket; rejected/pending files never become public. Rows are never deleted.

import { getSupabase } from "./supabase.js";

const PRIVATE_BUCKET = "recommendation-images";
const PUBLIC_BUCKET = "product-images";
const SIGNED_URL_TTL = 300; // seconds, admin preview only
const EXT_TO_TYPE = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  webp: "image/webp", avif: "image/avif", svg: "image/svg+xml",
};

function escapeHtml(s){ return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function toast(msg, kind="ok"){
  let stack=document.getElementById("adminToastStack");
  if(!stack){ stack=document.createElement("div"); stack.id="adminToastStack"; stack.className="admin-toast-stack"; document.body.appendChild(stack); }
  const t=document.createElement("div"); t.className=`admin-toast ${kind}`; t.innerHTML=`<span style="flex:1">${escapeHtml(msg)}</span><button aria-label="Dismiss">×</button>`;
  t.querySelector("button").addEventListener("click",()=>t.remove()); stack.appendChild(t); setTimeout(()=>{ if(t.parentNode) t.remove(); }, 4200);
}
function fmtDate(v){
  if(!v) return "—";
  try{ return new Date(v).toLocaleString(); }catch{ return String(v); }
}
function extOf(path){
  const m = String(path||"").toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}
function baseName(path){
  return String(path||"").split("/").pop() || "";
}

let items = [];
let busyId = null;

const els = {};

function statusBadge(status){
  if(status === "approved") return `<span class="admin-badge admin-badge--active">Approved</span>`;
  if(status === "rejected") return `<span class="admin-badge admin-badge--inactive">Rejected</span>`;
  return `<span class="admin-badge admin-badge--cafe">Pending</span>`;
}

async function previewUrl(path){
  if(!path) return null;
  try{
    const supa = getSupabase();
    const { data, error } = await supa.storage.from(PRIVATE_BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
    if(error) throw error;
    return data?.signedUrl || null;
  }catch(err){
    console.warn("[TPM recs] signed preview failed", err);
    return null;
  }
}

function render(){
  // Pending-only queue: moderated rows leave this list immediately.
  const list = items;
  if(els.stats){
    els.stats.textContent = `${list.length} pending`;
  }
  if(els.tbody){
    els.tbody.innerHTML = list.map((r)=>{
      const busy = busyId === r.id;
      const actions = `<button class="admin-btn admin-btn-primary admin-btn--sm" data-action="approve" data-id="${r.id}" ${busy?"disabled":""}>${busy?"Working…":"Approve"}</button>
           <button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="reject" data-id="${r.id}" ${busy?"disabled":""}>Reject</button>`;
      const imgCell = r.image_path
        ? `<img data-preview="${escapeHtml(r.image_path)}" alt="" width="64" height="64" style="width:64px;height:64px;border-radius:10px;object-fit:cover;background:var(--surface-2);border:1px solid var(--line)" />`
        : `<span class="admin-muted">—</span>`;
      return `<tr>
        <td style="max-width:320px"><div style="font-weight:600;white-space:pre-wrap">${escapeHtml(r.recommendation_text)}</div></td>
        <td>${imgCell}</td>
        <td style="white-space:nowrap;font-size:12px">${escapeHtml(fmtDate(r.created_at))}</td>
        <td>${statusBadge(r.status)}</td>
        <td><div style="display:flex;gap:6px;flex-wrap:wrap">${actions}</div></td>
      </tr>`;
    }).join("") || `<tr><td colspan="5"><div class="admin-empty"><strong>No pending recommendations</strong><br><span>New visitor suggestions will appear here for review.</span></div></td></tr>`;
  }
  if(els.cards){
    els.cards.innerHTML = list.map((r)=>{
      const busy = busyId === r.id;
      const img = r.image_path
        ? `<img data-preview="${escapeHtml(r.image_path)}" alt="" style="width:100%;height:140px;border-radius:10px;object-fit:cover;background:var(--surface-2);border:1px solid var(--line);margin-bottom:8px" />`
        : "";
      return `<div class="cat-card">
        <div class="cat-card-head"><strong style="font-weight:600">${escapeHtml((r.recommendation_text||"").slice(0,60))}${(r.recommendation_text||"").length>60?"…":""}</strong>${statusBadge(r.status)}</div>
        ${img}
        <div style="font-size:13px;white-space:pre-wrap;margin-bottom:6px">${escapeHtml(r.recommendation_text)}</div>
        <div class="cat-card-row"><span>Submitted</span><span>${escapeHtml(fmtDate(r.created_at))}</span></div>
        <div class="cat-card-actions"><button class="admin-btn admin-btn-primary admin-btn--sm" data-action="approve" data-id="${r.id}" ${busy?"disabled":""}>${busy?"Working…":"Approve"}</button><button class="admin-btn admin-btn-ghost admin-btn--sm" data-action="reject" data-id="${r.id}" ${busy?"disabled":""}>Reject</button></div>
      </div>`;
    }).join("");
  }
  hydratePreviews();
}

// Fill private image previews via short-lived signed URLs (display only).
async function hydratePreviews(){
  const imgs = [...document.querySelectorAll("#recTbody img[data-preview], #recCards img[data-preview]")];
  await Promise.all(imgs.map(async (img)=>{
    const path = img.getAttribute("data-preview");
    if(!path || img.dataset.done) return;
    img.dataset.done = "1";
    const url = await previewUrl(path);
    if(url) img.src = url;
    else { img.alt = "Preview unavailable"; img.style.objectFit = "contain"; }
  }));
}

async function loadQueue(){
  if(els.refreshBtn){ els.refreshBtn.disabled = true; }
  try{
    const supa = getSupabase();
    const { data, error } = await supa.from("product_recommendations")
      .select("id,recommendation_text,image_path,image_url,status,created_at,reviewed_at,reviewed_by")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if(error) throw error;
    items = data || [];
    render();
  }catch(err){
    console.error("[TPM recs] load failed", err);
    toast(err?.message || "Failed to load recommendations", "err");
  }finally{
    if(els.refreshBtn){ els.refreshBtn.disabled = false; }
  }
}

async function currentUid(){
  try{
    const supa = getSupabase();
    const { data: { user } } = await supa.auth.getUser();
    return user?.id || null;
  }catch{ return null; }
}

// Copy the private pending object into the public product-images bucket.
// Returns the public URL. Throws on any failure (caller must not approve).
async function publishImage(imagePath){
  const supa = getSupabase();
  const { data: blob, error: dlErr } = await supa.storage.from(PRIVATE_BUCKET).download(imagePath);
  if(dlErr) throw dlErr;
  const ext = extOf(imagePath);
  let dest = `recommendations/${baseName(imagePath)}`;
  const contentType = EXT_TO_TYPE[ext] || blob?.type || "image/jpeg";
  let up = await supa.storage.from(PUBLIC_BUCKET).upload(dest, blob, { contentType, upsert: false });
  if(up.error && /duplicate|exists|conflict/i.test(up.error.message || "")){
    dest = `recommendations/${Date.now()}-${baseName(imagePath)}`;
    up = await supa.storage.from(PUBLIC_BUCKET).upload(dest, blob, { contentType, upsert: false });
  }
  if(up.error) throw up.error;
  const { data: pub } = supa.storage.from(PUBLIC_BUCKET).getPublicUrl(dest);
  if(!pub?.publicUrl) throw new Error("Could not build public image URL");
  return pub.publicUrl;
}

async function bestEffortDeletePrivate(imagePath){
  if(!imagePath) return;
  try{
    const supa = getSupabase();
    const { error } = await supa.storage.from(PRIVATE_BUCKET).remove([imagePath]);
    if(error) throw error;
  }catch(err){
    console.warn("[TPM recs] private cleanup failed (non-blocking)", err);
    toast("Moderated, but the private file could not be removed.", "err");
  }
}

async function approveItem(id){
  const row = items.find(r=>String(r.id)===String(id));
  if(!row || row.status !== "pending" || busyId) return;
  busyId = row.id;
  render();
  const supa = getSupabase();
  try{
    let imageUrl = null;
    if(row.image_path){
      imageUrl = await publishImage(row.image_path); // throws → never approved
    }
    const payload = {
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: await currentUid(),
    };
    if(imageUrl) payload.image_url = imageUrl; // never a signed URL
    const { error: updErr } = await supa.from("product_recommendations").update(payload).eq("id", row.id);
    if(updErr) throw updErr; // DB failed → never approved
    toast("Recommendation approved", "ok");
    if(row.image_path) await bestEffortDeletePrivate(row.image_path);
    await loadQueue();
  }catch(err){
    console.error("[TPM recs] approve failed", err);
    toast(err?.message || "Approve failed — nothing was changed.", "err");
    await loadQueue();
  }finally{
    busyId = null;
    render();
  }
}

async function rejectItem(id){
  const row = items.find(r=>String(r.id)===String(id));
  if(!row || row.status !== "pending" || busyId) return;
  busyId = row.id;
  render();
  const supa = getSupabase();
  try{
    const { error: updErr } = await supa.from("product_recommendations").update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: await currentUid(),
      // image_url intentionally untouched (stays NULL); rejected files are
      // never copied into product-images.
    }).eq("id", row.id);
    if(updErr) throw updErr;
    toast("Recommendation rejected", "ok");
    if(row.image_path) await bestEffortDeletePrivate(row.image_path);
    await loadQueue();
  }catch(err){
    console.error("[TPM recs] reject failed", err);
    toast(err?.message || "Reject failed — nothing was changed.", "err");
    await loadQueue();
  }finally{
    busyId = null;
    render();
  }
}

export async function initRecommendations(){
  els.wrap = document.getElementById("recWrap");
  if(!els.wrap){ console.warn("[TPM recs] wrap not found"); return; }
  els.tbody = document.getElementById("recTbody");
  els.cards = document.getElementById("recCards");
  els.stats = document.getElementById("recStats");
  els.refreshBtn = document.getElementById("recRefreshBtn");
  els.refreshBtn?.addEventListener("click", ()=>loadQueue());
  els.wrap.addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-action][data-id]");
    if(!btn || btn.disabled) return;
    if(btn.dataset.action === "approve") approveItem(btn.dataset.id);
    else if(btn.dataset.action === "reject") rejectItem(btn.dataset.id);
  });
  await loadQueue();
}
