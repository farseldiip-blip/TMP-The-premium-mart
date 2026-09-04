// site/admin/js/store_info.js — Store Information Management (singleton)
// Uses existing Supabase client + is_admin() RLS. No service_role.
// Logo upload optional via store-logo bucket (2 MiB, image/*). Preserve existing logo if no new file.

import { getSupabase } from "./supabase.js";

function escapeHtml(s){ return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function toast(msg, kind="ok"){
  let stack=document.getElementById("adminToastStack");
  if(!stack){ stack=document.createElement("div"); stack.id="adminToastStack"; stack.className="admin-toast-stack"; document.body.appendChild(stack); }
  const t=document.createElement("div"); t.className=`admin-toast ${kind}`; t.innerHTML=`<span style="flex:1">${escapeHtml(msg)}</span><button aria-label="Dismiss">×</button>`;
  t.querySelector("button").addEventListener("click",()=>t.remove()); stack.appendChild(t); setTimeout(()=>{ if(t.parentNode) t.remove(); }, 4200);
}
function isValidEmail(v){
  if(!v) return true; // optional
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
}
function isValidUrl(v){
  if(!v) return true;
  try{ const u=new URL(v); return u.protocol==="http:"||u.protocol==="https:"; }catch{ return false; }
}

let storeRow=null;
let originalShowcase={ path:null, url:null };
const els={};

export async function initStoreInfo(){
  els.wrap=document.getElementById("storeWrap");
  if(!els.wrap){ console.warn("[TPM store] wrap not found"); return; }
  els.form=document.getElementById("storeForm");
  els.loading=document.getElementById("storeLoading");
  els.content=document.getElementById("storeContent");
  els.saveBtn=document.getElementById("storeSaveBtn");
  els.refreshBtn=document.getElementById("storeRefreshBtn");
  els.preview=document.getElementById("storeLogoPreview");
  // fields
  els.fName=document.getElementById("storeName");
  els.fTagline=document.getElementById("storeTagline");
  els.fDesc=document.getElementById("storeDesc");
  els.fAddr1=document.getElementById("storeAddr1");
  els.fAddr2=document.getElementById("storeAddr2");
  els.fCity=document.getElementById("storeCity");
  els.fCountry=document.getElementById("storeCountry");
  els.fPostal=document.getElementById("storePostal");
  els.fPhone=document.getElementById("storePhone");
  els.fPhoneDisplay=document.getElementById("storePhoneDisplay");
  els.fEmail=document.getElementById("storeEmail");
  els.fMapUrl=document.getElementById("storeMapUrl");
  els.fLogoPath=document.getElementById("storeLogoPath");
  els.fLogoUrl=document.getElementById("storeLogoUrl");
  els.fLogoFile=document.getElementById("storeLogoFile");
  els.fOpening=document.getElementById("storeOpeningHours");
  els.fVideoPath=document.getElementById("storeVideoPath");
  els.fVideoUrl=document.getElementById("storeVideoUrl");

  if(!els.form) return;

  els.refreshBtn?.addEventListener("click", ()=>loadStore());
  els.fLogoFile?.addEventListener("change", handleFileSelect);
  els.fLogoPath?.addEventListener("input", updatePreview);
  els.fLogoUrl?.addEventListener("input", updatePreview);
  els.form?.addEventListener("submit", async e=>{ e.preventDefault(); await handleSave(); });

  await loadStore();
}

function handleFileSelect(){
  const file=els.fLogoFile?.files?.[0];
  if(!file) return;
  if(file.size>2*1024*1024){ toast("Logo must be ≤2 MiB", "err"); els.fLogoFile.value=""; return; }
  if(!file.type.startsWith("image/")){ toast("Only images allowed for logo", "err"); els.fLogoFile.value=""; return; }
  const url=URL.createObjectURL(file);
  if(els.preview){
    els.preview.innerHTML=`<img src="${url}" alt="Logo preview" style="max-width:120px;max-height:120px;border-radius:8px;border:1px solid var(--line)" /> <span class="hint">${escapeHtml(file.name)} (${(file.size/1024).toFixed(0)} KB) — will upload on Save</span>`;
  }
}
function updatePreview(){
  const path=els.fLogoPath?.value.trim();
  const url=els.fLogoUrl?.value.trim();
  const file=els.fLogoFile?.files?.[0];
  if(file) return; // already showing file preview
  if(els.preview){
    if(url) els.preview.innerHTML=`<img src="${escapeHtml(url)}" alt="Logo" style="max-width:120px;max-height:120px;border-radius:8px;border:1px solid var(--line)" onerror="this.style.display='none'" />`;
    else if(path) els.preview.innerHTML=`<span class="hint">Path: ${escapeHtml(path)}</span>`;
    else if(storeRow?.logo_url) els.preview.innerHTML=`<img src="${escapeHtml(storeRow.logo_url)}" alt="Current logo" style="max-width:120px;max-height:120px;border-radius:8px;border:1px solid var(--line)" />`;
    else els.preview.innerHTML=`<span class="hint">No logo</span>`;
  }
}

async function loadStore(){
  const supa=getSupabase();
  if(els.loading) els.loading.style.display="grid";
  if(els.content) els.content.style.display="none";
  try{
    const { data, error } = await supa.from("store_info").select("*").eq("singleton_key", true).maybeSingle();
    if(error) throw error;
    if(!data){
      // fallback to any row
      const { data: anyRow, error: e2 } = await supa.from("store_info").select("*").limit(1).maybeSingle();
      if(e2) throw e2;
      storeRow=anyRow;
    } else {
      storeRow=data;
    }
    if(!storeRow) throw new Error("No store_info row found (singleton missing)");
    originalShowcase.path=storeRow.showcase_video_path||null;
    originalShowcase.url=storeRow.showcase_video_url||null;
    populateForm(storeRow);
    if(els.loading) els.loading.style.display="none";
    if(els.content) els.content.style.display="block";
  }catch(err){
    console.error("[TPM store] load failed",err);
    toast(err.message||"Failed to load store info","err");
    if(els.loading) els.loading.innerHTML=`<div class="admin-empty"><strong>Failed to load</strong><br>${escapeHtml(err.message)}</div>`;
  }
}

function populateForm(row){
  if(!row) return;
  els.fName.value=row.name||"";
  els.fTagline.value=row.tagline||"";
  els.fDesc.value=row.description||"";
  els.fAddr1.value=row.address_line1||"";
  els.fAddr2.value=row.address_line2||"";
  els.fCity.value=row.city||"";
  els.fCountry.value=row.country||"US";
  els.fPostal.value=row.postal_code||"";
  els.fPhone.value=row.phone||"";
  els.fPhoneDisplay.value=row.phone_display||"";
  els.fEmail.value=row.email||"";
  els.fMapUrl.value=row.map_url||"";
  els.fLogoPath.value=row.logo_path||"";
  els.fLogoUrl.value=row.logo_url||"";
  if(els.fLogoFile) els.fLogoFile.value="";
  // opening_hours as JSON string pretty
  try{
    const oh=row.opening_hours;
    if(oh && typeof oh==="object"){
      els.fOpening.value=JSON.stringify(oh, null, 2);
    } else if(typeof oh==="string"){
      // try parse then pretty
      try{ els.fOpening.value=JSON.stringify(JSON.parse(oh), null, 2); }catch{ els.fOpening.value=oh; }
    } else {
      els.fOpening.value="{}";
    }
  }catch{ els.fOpening.value="{}"; }
  if(els.fVideoPath) els.fVideoPath.value=row.showcase_video_path||"";
  if(els.fVideoUrl) els.fVideoUrl.value=row.showcase_video_url||"";
  updatePreview();
  // clear errors
  clearAllErrors();
}

function clearFieldError(id){
  const el=document.getElementById(`field-store-${id}`);
  if(el) el.classList.remove("has-error");
}
function setFieldError(id,msg){
  const wrap=document.getElementById(`field-store-${id}`);
  if(!wrap) return;
  wrap.classList.add("has-error");
  const err=wrap.querySelector(".error");
  if(err) err.textContent=msg;
}
function clearAllErrors(){
  document.querySelectorAll("#storeForm .admin-field.has-error").forEach(e=>e.classList.remove("has-error"));
}

async function handleSave(){
  clearAllErrors();
  const name=els.fName.value.trim();
  const tagline=els.fTagline.value.trim()||null;
  const description=els.fDesc.value.trim()||null;
  const address_line1=els.fAddr1.value.trim()||null;
  const address_line2=els.fAddr2.value.trim()||null;
  const city=els.fCity.value.trim()||null;
  const country=els.fCountry.value.trim()||"US";
  const postal_code=els.fPostal.value.trim()||null;
  const phone=els.fPhone.value.trim()||null;
  const phone_display=els.fPhoneDisplay.value.trim()||null;
  const email=els.fEmail.value.trim()||null;
  const map_url=els.fMapUrl.value.trim()||null;
  let logo_path=els.fLogoPath.value.trim()||null;
  let logo_url=els.fLogoUrl.value.trim()||null;
  const openingRaw=els.fOpening.value.trim()||"{}";
  // showcase preserve/display only (read-only)
  const showcase_video_path=originalShowcase.path;
  const showcase_video_url=originalShowcase.url;

  let hasError=false;
  if(!name || name.length===0){ setFieldError("name","Name is required."); hasError=true; }
  if(!country){ setFieldError("country","Country is required."); hasError=true; }
  if(!isValidEmail(email)){ setFieldError("email","Invalid email format."); hasError=true; }
  if(!isValidUrl(map_url)){ setFieldError("mapurl","Invalid URL (must be http/https)."); hasError=true; }
  if(!isValidUrl(logo_url)){ setFieldError("logourl","Invalid URL."); hasError=true; }
  // opening_hours JSON validation
  let opening_hours=null;
  try{
    opening_hours=JSON.parse(openingRaw);
    if(opening_hours===null || typeof opening_hours!=="object" || Array.isArray(opening_hours)){
      setFieldError("opening","Opening hours must be a JSON object (e.g., {\"mon_fri\":\"7AM-7PM\"}).");
      hasError=true;
    }
  }catch(e){
    setFieldError("opening","Invalid JSON: "+e.message);
    hasError=true;
  }
  if(hasError) return;

  // handle logo upload if file selected
  const file=els.fLogoFile?.files?.[0];
  const supa=getSupabase();
  if(els.saveBtn){ els.saveBtn.disabled=true; els.saveBtn.textContent="Saving…"; }
  try{
    if(file){
      toast("Uploading logo…","ok");
      const ext=file.name.split(".").pop()||"png";
      const safeName=slugify(name)||"logo";
      const path=`${Date.now()}-${safeName}.${ext}`;
      const { error: upErr }=await supa.storage.from("store-logo").upload(path, file, { upsert:false, contentType: file.type });
      if(upErr) throw upErr;
      const { data: pub }=supa.storage.from("store-logo").getPublicUrl(path);
      logo_path=path;
      logo_url=pub?.publicUrl||null;
      els.fLogoPath.value=logo_path||"";
      els.fLogoUrl.value=logo_url||"";
      updatePreview();
    }
    // build payload — preserve singleton_key true
    const payload={
      name,
      tagline,
      description,
      address_line1,
      address_line2,
      city,
      country,
      postal_code,
      phone,
      phone_display,
      email,
      map_url,
      logo_path,
      logo_url,
      opening_hours,
      showcase_video_path,
      showcase_video_url,
      singleton_key: true,
    };
    // update singleton where singleton_key=true (or id)
    let result;
    if(storeRow?.id){
      result=await supa.from("store_info").update(payload).eq("id", storeRow.id).select().single();
    } else {
      result=await supa.from("store_info").update(payload).eq("singleton_key", true).select().single();
    }
    if(result.error) throw result.error;
    storeRow=result.data;
    originalShowcase.path=storeRow.showcase_video_path||null;
    originalShowcase.url=storeRow.showcase_video_url||null;
    toast("Store information saved","ok");
    populateForm(storeRow);
  }catch(err){
    console.error("[TPM store] save failed",err);
    const msg=err.message||"Save failed";
    if(msg.toLowerCase().includes("email") && msg.toLowerCase().includes("check")) setFieldError("email","Invalid email.");
    else if(msg.toLowerCase().includes("name")) setFieldError("name",msg);
    toast(msg,"err");
  }finally{
    if(els.saveBtn){ els.saveBtn.disabled=false; els.saveBtn.textContent="Save changes"; }
  }
}

function slugify(input){
  if(!input) return "";
  return String(input).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[\s_]+/g,"-").replace(/[^a-z0-9-]/g,"").replace(/-+/g,"-").replace(/^-|-$/g,"");
}

// expose for testing
export const _test={ isValidEmail, isValidUrl };
