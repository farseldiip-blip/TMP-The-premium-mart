// site/admin/js/contact_info.js — Contact Information Management (singleton)
// Uses existing Supabase client + is_admin() RLS. No service_role.

import { getSupabase } from "./supabase.js";

function escapeHtml(s){ return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function toast(msg, kind="ok"){
  let stack=document.getElementById("adminToastStack");
  if(!stack){ stack=document.createElement("div"); stack.id="adminToastStack"; stack.className="admin-toast-stack"; document.body.appendChild(stack); }
  const t=document.createElement("div"); t.className=`admin-toast ${kind}`; t.innerHTML=`<span style="flex:1">${escapeHtml(msg)}</span><button aria-label="Dismiss">×</button>`;
  t.querySelector("button").addEventListener("click",()=>t.remove()); stack.appendChild(t); setTimeout(()=>{ if(t.parentNode) t.remove(); }, 4200);
}
function isValidEmail(v){ if(!v) return true; return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v); }
function isValidUrl(v){ if(!v) return true; try{ const u=new URL(v); return u.protocol==="http:"||u.protocol==="https:"; }catch{ return false; } }

let contactRow=null;
const els={};

export async function initContactInfo(){
  els.wrap=document.getElementById("contactWrap");
  if(!els.wrap){ console.warn("[TPM contact] wrap not found"); return; }
  els.form=document.getElementById("contactForm");
  els.loading=document.getElementById("contactLoading");
  els.content=document.getElementById("contactContent");
  els.saveBtn=document.getElementById("contactSaveBtn");
  els.refreshBtn=document.getElementById("contactRefreshBtn");
  els.fPhone=document.getElementById("contactPhone");
  els.fPhoneDisplay=document.getElementById("contactPhoneDisplay");
  els.fEmail=document.getElementById("contactEmail");
  els.fAddress=document.getElementById("contactAddress");
  els.fAddressDisplay=document.getElementById("contactAddressDisplay");
  els.fWhatsapp=document.getElementById("contactWhatsapp");
  els.fMapUrl=document.getElementById("contactMapUrl");
  els.fExtra=document.getElementById("contactExtra");

  if(!els.form) return;
  els.refreshBtn?.addEventListener("click", ()=>loadContact());
  els.form?.addEventListener("submit", async e=>{ e.preventDefault(); await handleSave(); });
  await loadContact();
}

async function loadContact(){
  const supa=getSupabase();
  if(els.loading) els.loading.style.display="grid";
  if(els.content) els.content.style.display="none";
  try{
    const { data, error } = await supa.from("contact_info").select("*").eq("singleton_key", true).maybeSingle();
    if(error) throw error;
    if(!data){
      const { data: anyRow, error: e2 } = await supa.from("contact_info").select("*").limit(1).maybeSingle();
      if(e2) throw e2;
      contactRow=anyRow;
    } else {
      contactRow=data;
    }
    if(!contactRow) throw new Error("No contact_info row found (singleton missing)");
    populateForm(contactRow);
    if(els.loading) els.loading.style.display="none";
    if(els.content) els.content.style.display="block";
  }catch(err){
    console.error("[TPM contact] load failed",err);
    toast(err.message||"Failed to load contact info","err");
    if(els.loading) els.loading.innerHTML=`<div class="admin-empty"><strong>Failed to load</strong><br>${escapeHtml(err.message)}</div>`;
  }
}

function populateForm(row){
  if(!row) return;
  els.fPhone.value=row.phone||"";
  els.fPhoneDisplay.value=row.phone_display||"";
  els.fEmail.value=row.email||"";
  els.fAddress.value=row.address||"";
  els.fAddressDisplay.value=row.address_display||"";
  els.fWhatsapp.value=row.whatsapp||"";
  els.fMapUrl.value=row.map_url||"";
  // extra_contacts as JSON
  try{
    const ec=row.extra_contacts;
    if(ec && typeof ec==="object"){
      els.fExtra.value=JSON.stringify(ec, null, 2);
    } else if(typeof ec==="string"){
      try{ els.fExtra.value=JSON.stringify(JSON.parse(ec), null, 2); }catch{ els.fExtra.value=ec; }
    } else {
      els.fExtra.value="[]";
    }
  }catch{ els.fExtra.value="[]"; }
  clearAllErrors();
}

function clearFieldError(id){
  const el=document.getElementById(`field-contact-${id}`);
  if(el) el.classList.remove("has-error");
}
function setFieldError(id,msg){
  const wrap=document.getElementById(`field-contact-${id}`);
  if(!wrap) return;
  wrap.classList.add("has-error");
  const err=wrap.querySelector(".error");
  if(err) err.textContent=msg;
}
function clearAllErrors(){
  document.querySelectorAll("#contactForm .admin-field.has-error").forEach(e=>e.classList.remove("has-error"));
}

async function handleSave(){
  clearAllErrors();
  const phone=els.fPhone.value.trim()||null;
  const phone_display=els.fPhoneDisplay.value.trim()||null;
  const email=els.fEmail.value.trim()||null;
  const address=els.fAddress.value.trim()||null;
  const address_display=els.fAddressDisplay.value.trim()||null;
  const whatsapp=els.fWhatsapp.value.trim()||null;
  const map_url=els.fMapUrl.value.trim()||null;
  const extraRaw=els.fExtra.value.trim()||"[]";

  let hasError=false;
  if(!isValidEmail(email)){ setFieldError("email","Invalid email format."); hasError=true; }
  if(!isValidUrl(map_url)){ setFieldError("mapurl","Invalid URL (must be http/https)."); hasError=true; }
  // extra_contacts JSON validation
  let extra_contacts=null;
  try{
    extra_contacts=JSON.parse(extraRaw);
    // allow array or object, but must be object/array not primitive
    if(extra_contacts===null || typeof extra_contacts!=="object"){
      setFieldError("extra","extra_contacts must be a valid JSON object or array.");
      hasError=true;
    }
  }catch(e){
    setFieldError("extra","Invalid JSON: "+e.message);
    hasError=true;
  }
  // whatsapp is optional text, no URL validation, but if it looks like URL validate?
  // phone/whatsapp are optional

  if(hasError) return;

  const supa=getSupabase();
  if(els.saveBtn){ els.saveBtn.disabled=true; els.saveBtn.textContent="Saving…"; }
  try{
    const payload={
      phone,
      phone_display,
      email,
      address,
      address_display,
      whatsapp,
      map_url,
      extra_contacts,
      singleton_key: true,
    };
    let result;
    if(contactRow?.id){
      result=await supa.from("contact_info").update(payload).eq("id", contactRow.id).select().single();
    } else {
      result=await supa.from("contact_info").update(payload).eq("singleton_key", true).select().single();
    }
    if(result.error) throw result.error;
    contactRow=result.data;
    toast("Contact information saved","ok");
    populateForm(contactRow);
  }catch(err){
    console.error("[TPM contact] save failed",err);
    const msg=err.message||"Save failed";
    if(msg.toLowerCase().includes("email")) setFieldError("email",msg);
    toast(msg,"err");
  }finally{
    if(els.saveBtn){ els.saveBtn.disabled=false; els.saveBtn.textContent="Save changes"; }
  }
}

export const _test={ isValidEmail, isValidUrl };
