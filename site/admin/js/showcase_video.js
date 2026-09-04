// site/admin/js/showcase_video.js — Showcase Video Management (ONE file, 15s, 50 MiB)
// Uses store_info.showcase_video_path/url + showcase-video bucket. No service_role.
// Preserves all other store_info fields.

import { getSupabase } from "./supabase.js";

function escapeHtml(s){ return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function toast(msg, kind="ok"){
  let stack=document.getElementById("adminToastStack");
  if(!stack){ stack=document.createElement("div"); stack.id="adminToastStack"; stack.className="admin-toast-stack"; document.body.appendChild(stack); }
  const t=document.createElement("div"); t.className=`admin-toast ${kind}`; t.innerHTML=`<span style="flex:1">${escapeHtml(msg)}</span><button aria-label="Dismiss">×</button>`;
  t.querySelector("button").addEventListener("click",()=>t.remove()); stack.appendChild(t); setTimeout(()=>{ if(t.parentNode) t.remove(); }, 4200);
}

const ALLOWED_MIME = ["video/mp4","video/webm","video/quicktime"];
const MAX_SIZE = 52428800; // 50 MiB
const MAX_DURATION = 15; // seconds

let storeRow=null;
let currentPath=null;
let currentUrl=null;
const els={};

export async function initShowcaseVideo(){
  els.wrap=document.getElementById("videoWrap");
  if(!els.wrap){ console.warn("[TPM video] wrap not found"); return; }
  els.loading=document.getElementById("videoLoading");
  els.content=document.getElementById("videoContent");
  els.empty=document.getElementById("videoEmpty");
  els.previewWrap=document.getElementById("videoPreviewWrap");
  els.preview=document.getElementById("videoPreview");
  els.info=document.getElementById("videoInfo");
  els.fileInput=document.getElementById("videoFile");
  els.uploadBtn=document.getElementById("videoUploadBtn");
  els.deleteBtn=document.getElementById("videoDeleteBtn");
  els.refreshBtn=document.getElementById("videoRefreshBtn");
  els.pathDisplay=document.getElementById("videoPathDisplay");
  els.urlDisplay=document.getElementById("videoUrlDisplay");
  els.hint=document.getElementById("videoHint");

  if(!els.fileInput) return;

  els.refreshBtn?.addEventListener("click", ()=>loadVideo());
  els.fileInput?.addEventListener("change", handleFileSelect);
  els.uploadBtn?.addEventListener("click", handleUpload);
  els.deleteBtn?.addEventListener("click", handleDelete);

  await loadVideo();
}

async function loadVideo(){
  const supa=getSupabase();
  if(els.loading) els.loading.style.display="grid";
  if(els.content) els.content.style.display="none";
  try{
    const { data, error }=await supa.from("store_info").select("id, showcase_video_path, showcase_video_url, name").eq("singleton_key", true).maybeSingle();
    if(error) throw error;
    if(!data){
      const { data: anyRow, error: e2 }=await supa.from("store_info").select("id, showcase_video_path, showcase_video_url, name").limit(1).maybeSingle();
      if(e2) throw e2;
      storeRow=anyRow;
    } else {
      storeRow=data;
    }
    if(!storeRow) throw new Error("No store_info row");
    currentPath=storeRow.showcase_video_path||null;
    currentUrl=storeRow.showcase_video_url||null;
    // if url missing but path exists, try to get public url
    if(currentPath && !currentUrl){
      const { data: pub }=supa.storage.from("showcase-video").getPublicUrl(currentPath);
      currentUrl=pub?.publicUrl||null;
    }
    render();
    if(els.loading) els.loading.style.display="none";
    if(els.content) els.content.style.display="block";
  }catch(err){
    console.error("[TPM video] load failed",err);
    toast(err.message||"Failed to load video","err");
    if(els.loading) els.loading.innerHTML=`<div class="admin-empty"><strong>Failed to load</strong><br>${escapeHtml(err.message)}</div>`;
  }
}

function render(){
  if(!currentPath || !currentUrl){
    if(els.empty) els.empty.style.display="block";
    if(els.previewWrap) els.previewWrap.style.display="none";
    if(els.info) els.info.innerHTML=`<span class="admin-badge admin-badge--inactive">No video</span> <span style="font-size:11px;color:var(--muted)">One video max — 15s, 50 MiB, mp4/webm/mov</span>`;
    if(els.pathDisplay) els.pathDisplay.textContent="—";
    if(els.urlDisplay) els.urlDisplay.textContent="—";
    if(els.deleteBtn) els.deleteBtn.disabled=true;
    return;
  }
  if(els.empty) els.empty.style.display="none";
  if(els.previewWrap) els.previewWrap.style.display="block";
  if(els.deleteBtn) els.deleteBtn.disabled=false;
  if(els.pathDisplay) els.pathDisplay.textContent=currentPath;
  if(els.urlDisplay) els.urlDisplay.innerHTML=`<a href="${escapeHtml(currentUrl)}" target="_blank" rel="noopener" style="color:var(--tpm-green);word-break:break-all">${escapeHtml(currentUrl)}</a>`;
  if(els.preview){
    // use video element with controls
    els.preview.innerHTML=`<video src="${escapeHtml(currentUrl)}" controls preload="metadata" style="width:100%;max-width:520px;border-radius:12px;border:1px solid var(--line);background:#000;max-height:320px"></video>`;
    // try to get duration for info
    const vid=els.preview.querySelector("video");
    if(vid){
      vid.addEventListener("loadedmetadata", ()=>{
        const dur=vid.duration;
        if(els.info) els.info.innerHTML=`<span class="admin-badge admin-badge--active">Active</span> <span style="font-size:11px;color:var(--muted)">${dur?dur.toFixed(1)+"s":""} • ${escapeHtml(currentPath)}</span>`;
      });
      vid.addEventListener("error", ()=>{
        if(els.info) els.info.innerHTML=`<span class="admin-badge admin-badge--market">Video</span> <span style="font-size:11px;color:var(--muted)">Preview failed — check URL</span>`;
      });
    }
  }
  if(els.info && !els.preview.querySelector("video")) {
    els.info.innerHTML=`<span class="admin-badge admin-badge--active">Active</span> <span style="font-size:11px;color:var(--muted)">${escapeHtml(currentPath)}</span>`;
  }
}

function handleFileSelect(){
  const file=els.fileInput?.files?.[0];
  if(!file) return;
  // immediate validation for size and mime (duration checked before upload)
  if(file.size>MAX_SIZE){
    toast(`File too large: ${(file.size/1024/1024).toFixed(1)} MiB > 50 MiB`, "err");
    els.fileInput.value="";
    return;
  }
  if(!ALLOWED_MIME.includes(file.type)){
    toast(`Invalid type ${file.type}. Allowed: mp4, webm, mov`, "err");
    els.fileInput.value="";
    return;
  }
  if(els.hint) els.hint.innerHTML=`Selected: <strong>${escapeHtml(file.name)}</strong> ${(file.size/1024/1024).toFixed(2)} MiB • ${file.type} — will validate duration (≤15s) on upload`;
}

async function getVideoDuration(file){
  return new Promise((resolve, reject)=>{
    const url=URL.createObjectURL(file);
    const v=document.createElement("video");
    v.preload="metadata";
    v.src=url;
    v.muted=true;
    v.playsInline=true;
    v.style.display="none";
    document.body.appendChild(v);
    const cleanup=()=>{ URL.revokeObjectURL(url); v.remove(); };
    v.onloadedmetadata=()=>{
      let d=v.duration;
      if(d===Infinity){
        v.currentTime=1e101;
        v.ontimeupdate=()=>{
          v.ontimeupdate=null;
          d=v.duration;
          cleanup();
          resolve(d);
        };
        setTimeout(()=>{
          if(v.duration!==Infinity){
            const dd=v.duration;
            cleanup();
            resolve(dd);
          }
        }, 800);
      } else {
        cleanup();
        resolve(d);
      }
    };
    v.onerror=()=>{
      cleanup();
      reject(new Error("Cannot load video metadata — invalid file"));
    };
    setTimeout(()=>{ cleanup(); reject(new Error("Timeout loading video metadata")); }, 8000);
  });
}

async function handleUpload(){
  const file=els.fileInput?.files?.[0];
  if(!file){
    toast("Select a video file first", "err");
    return;
  }
  // validate size
  if(file.size>MAX_SIZE){
    toast(`File too large: ${(file.size/1024/1024).toFixed(1)} MiB > 50 MiB`, "err");
    return;
  }
  if(!ALLOWED_MIME.includes(file.type)){
    toast(`Invalid MIME ${file.type}. Allowed: ${ALLOWED_MIME.join(", ")}`, "err");
    return;
  }
  // validate duration
  let duration;
  try{
    toast("Checking video duration…","ok");
    duration=await getVideoDuration(file);
    if(!isFinite(duration) || duration<=0){
      toast("Cannot determine video duration", "err");
      return;
    }
    if(duration>MAX_DURATION){
      toast(`Video too long: ${duration.toFixed(1)}s > 15s`, "err");
      return;
    }
  }catch(err){
    toast(err.message||"Duration check failed","err");
    return;
  }

  const supa=getSupabase();
  if(els.uploadBtn){ els.uploadBtn.disabled=true; els.uploadBtn.textContent="Uploading…"; }
  try{
    // preserve other store fields — we only update showcase fields, but need to fetch current row id
    if(!storeRow){
      await loadVideo();
      if(!storeRow) throw new Error("No store row");
    }
    const oldPath=currentPath;
    // generate new path: showcase/<timestamp>-<sanitized>.<ext>
    const ext=file.name.split(".").pop()?.toLowerCase()||"mp4";
    const base=file.name.replace(/\.[^/.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,30)||"video";
    const newPath=`showcase/${Date.now()}-${base}.${ext}`;

    toast(`Uploading ${file.name} (${duration.toFixed(1)}s)…`,"ok");
    const { error: upErr }=await supa.storage.from("showcase-video").upload(newPath, file, { upsert:false, contentType: file.type });
    if(upErr) throw upErr;
    const { data: pub }=supa.storage.from("showcase-video").getPublicUrl(newPath);
    const newUrl=pub?.publicUrl||null;
    if(!newUrl) throw new Error("Failed to get public URL");

    // update store_info singleton (preserve other fields!)
    // Use update only showcase fields to avoid overwriting other store fields
    const { error: updErr, data: updated }=await supa.from("store_info").update({ showcase_video_path: newPath, showcase_video_url: newUrl }).eq("id", storeRow.id).select().single();
    if(updErr) throw updErr;
    storeRow=updated;
    currentPath=newPath;
    currentUrl=newUrl;
    // delete old file if different and exists
    if(oldPath && oldPath!==newPath){
      try{
        await supa.storage.from("showcase-video").remove([oldPath]);
      }catch(e){ console.warn("[TPM video] failed to delete old", oldPath, e); }
    }
    toast(`Video uploaded (${duration.toFixed(1)}s)`, "ok");
    if(els.fileInput) els.fileInput.value="";
    render();
  }catch(err){
    console.error("[TPM video] upload failed",err);
    toast(err.message||"Upload failed","err");
  }finally{
    if(els.uploadBtn){ els.uploadBtn.disabled=false; els.uploadBtn.textContent="Upload / Replace"; }
  }
}

async function handleDelete(){
  if(!currentPath){
    toast("No video to delete","err");
    return;
  }
  if(!confirm(`Delete showcase video?\n${currentPath}\nThis will clear store_info and remove the file.`)) return;
  const supa=getSupabase();
  if(els.deleteBtn){ els.deleteBtn.disabled=true; els.deleteBtn.textContent="Deleting…"; }
  try{
    const oldPath=currentPath;
    // clear store_info first
    const { error: updErr }=await supa.from("store_info").update({ showcase_video_path: null, showcase_video_url: null }).eq("id", storeRow.id);
    if(updErr) throw updErr;
    // then delete from storage
    if(oldPath){
      const { error: delErr }=await supa.storage.from("showcase-video").remove([oldPath]);
      if(delErr) console.warn("[TPM video] storage delete failed", delErr);
    }
    currentPath=null;
    currentUrl=null;
    storeRow.showcase_video_path=null;
    storeRow.showcase_video_url=null;
    if(els.fileInput) els.fileInput.value="";
    toast("Video deleted","ok");
    render();
  }catch(err){
    console.error("[TPM video] delete failed",err);
    toast(err.message||"Delete failed","err");
  }finally{
    if(els.deleteBtn){ els.deleteBtn.disabled=false; els.deleteBtn.textContent="Delete video"; }
  }
}

// expose for testing
export const _test={ ALLOWED_MIME, MAX_SIZE, MAX_DURATION, getVideoDuration };
