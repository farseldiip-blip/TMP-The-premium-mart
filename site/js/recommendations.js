// site/js/recommendations.js — Public product recommendations (anon, moderated)
// Visitors suggest a product (+optional image). Only approved rows are ever
// displayed. Uses the sessionless anon client pattern (no auth/session use).
// Table: public.product_recommendations (status forced pending).
// Bucket: recommendation-images (private; uploads under pending/<uuid>.<ext>).

import { getAnonSupabase } from "./supabase.js";

const BUCKET = "recommendation-images";
const MAX_BYTES = 2 * 1024 * 1024; // 2 MiB, matches bucket limit
const MAX_CHARS = 500; // matches DB check
const COOLDOWN_MS = 30 * 1000; // short client-side cooldown after success
const APPROVED_LIMIT = 3;

const MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

function escapeHtml(s){
  return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function newUuid(){
  try{
    if(typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  }catch(_){}
  return "id-" + Date.now().toString(36) + "-" + Math.floor(Math.random()*1e9).toString(36);
}

let submitting = false;
let lastSuccessAt = 0;

function showError(form, msg){
  const el = form.querySelector("#recError");
  if(!el) return;
  el.textContent = msg;
  el.hidden = false;
}

function clearError(form){
  const el = form.querySelector("#recError");
  if(!el) return;
  el.textContent = "";
  el.hidden = true;
}

function setSubmitting(form, on){
  submitting = on;
  const btn = form.querySelector("#recSubmit");
  if(btn){
    btn.disabled = on;
    btn.textContent = on ? "Sending…" : "Recommend a Product";
  }
}

// Public approved carousel only (status=approved). Never pending/rejected.
// Images render from image_url only — never from private image_path.
let slides = [];
let slideIdx = 0;

function slideEls(){
  return {
    stage: document.getElementById("recStage"),
    track: document.getElementById("recTrack"),
    viewport: document.getElementById("recViewport"),
    prev: document.getElementById("recPrev"),
    next: document.getElementById("recNext"),
    counter: document.getElementById("recCounter"),
    empty: document.getElementById("recEmpty"),
  };
}

function slideHtml(row){
  const text = escapeHtml(row.recommendation_text || "");
  const img = (row.image_url && String(row.image_url).startsWith("http"))
    ? `<div class="tpm-rec-media"><img src="${escapeHtml(row.image_url)}" alt="" loading="lazy" decoding="async" /></div><p class="tpm-rec-text">${text}</p>`
    : `<p class="tpm-rec-quote">“${text}”</p>`;
  return `<div class="tpm-rec-slide" role="group" aria-roledescription="slide">${img}</div>`;
}

function updateCarousel(){
  const { track, counter } = slideEls();
  if(!track || !slides.length) return;
  track.style.transform = `translateX(-${slideIdx * 100}%)`;
  [...track.children].forEach((el, i)=> el.setAttribute("aria-hidden", i === slideIdx ? "false" : "true"));
  if(counter) counter.textContent = `${slideIdx + 1} / ${slides.length}`;
}

function stepCarousel(d){
  if(slides.length < 2) return;
  slideIdx = (slideIdx + d + slides.length) % slides.length;
  updateCarousel();
}

function renderCarousel(){
  const { stage, track, prev, next, counter } = slideEls();
  if(!stage || !track) return;
  track.innerHTML = slides.map(slideHtml).join("");
  track.style.transform = "translateX(0%)";
  slideIdx = 0;
  const multi = slides.length > 1;
  if(prev) prev.style.display = multi ? "" : "none";
  if(next) next.style.display = multi ? "" : "none";
  if(counter) counter.hidden = !multi;
  updateCarousel();
}

async function loadApproved(){
  const { stage, empty } = slideEls();
  if(!stage) return;
  try{
    const supa = getAnonSupabase();
    const { data, error } = await supa.from("product_recommendations")
      .select("id,recommendation_text,image_url,created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(APPROVED_LIMIT);
    if(error) throw error;
    if(!data || !data.length){
      stage.hidden = true;
      if(empty) empty.hidden = false;
      return;
    }
    slides = data;
    renderCarousel();
    stage.hidden = false;
    if(empty) empty.hidden = true;
  }catch(err){
    console.warn("[TPM recommendations] approved list failed", err);
    stage.hidden = true;
    if(empty) empty.hidden = true;
  }
}

async function handleSubmit(e){
  e.preventDefault();
  const form = e.target;
  if(submitting) return;
  clearError(form);

  // Cooldown after a successful submission
  const waited = Date.now() - lastSuccessAt;
  if(lastSuccessAt && waited < COOLDOWN_MS){
    showError(form, `Thanks — please wait ${Math.ceil((COOLDOWN_MS - waited)/1000)}s before recommending again.`);
    return;
  }

  const textEl = form.querySelector("#rec-text");
  const fileEl = form.querySelector("#rec-image");
  const text = (textEl?.value || "").trim();
  if(!text){
    showError(form, "Please write your recommendation first.");
    textEl?.focus();
    return;
  }
  if(text.length > MAX_CHARS){
    showError(form, `Keep it under ${MAX_CHARS} characters.`);
    textEl?.focus();
    return;
  }

  const file = fileEl?.files?.[0] || null;
  if(file){
    if(!MIME_TO_EXT[file.type]){
      showError(form, "Image must be JPG, PNG, WebP, AVIF or SVG.");
      return;
    }
    if(file.size > MAX_BYTES){
      showError(form, "Image must be 2 MiB or smaller.");
      return;
    }
  }

  setSubmitting(form, true);
  const supa = getAnonSupabase();
  let imagePath = null;
  try{
    // 1) Optional image upload to the private bucket (never public)
    if(file){
      imagePath = `pending/${newUuid()}.${MIME_TO_EXT[file.type]}`;
      const { error: upErr } = await supa.storage.from(BUCKET).upload(imagePath, file, {
        contentType: file.type,
        upsert: false,
      });
      if(upErr) throw upErr;
    }
    // 2) Insert as pending (DB re-forces pending even if tampered).
    // Never send image_url from the public frontend.
    const { error: insErr } = await supa.from("product_recommendations").insert({
      recommendation_text: text,
      status: "pending",
      image_path: imagePath,
    });
    if(insErr) throw insErr;

    lastSuccessAt = Date.now();
    form.reset();
    const count = form.querySelector("#recCount");
    if(count) count.textContent = `0 / ${MAX_CHARS}`;
    const success = document.getElementById("recSuccess");
    if(success) success.hidden = false;
    form.hidden = true;
  }catch(err){
    // Best-effort orphan cleanup (anon delete is denied; ignore failure)
    if(imagePath){
      try{ await supa.storage.from(BUCKET).remove([imagePath]); }catch(_){}
    }
    console.warn("[TPM recommendations] submit failed", err);
    showError(form, "Could not send your recommendation. Please try again.");
  }finally{
    setSubmitting(form, false);
  }
}

function initRecommendations(){
  const form = document.getElementById("recommendForm");
  if(!form) return;
  const textEl = form.querySelector("#rec-text");
  const count = form.querySelector("#recCount");
  textEl?.addEventListener("input", ()=>{
    if(count) count.textContent = `${textEl.value.length} / ${MAX_CHARS}`;
  });
  form.addEventListener("submit", handleSubmit);
  document.getElementById("recAgain")?.addEventListener("click", ()=>{
    const success = document.getElementById("recSuccess");
    if(success) success.hidden = true;
    form.hidden = false;
  });
  // Carousel controls
  document.getElementById("recPrev")?.addEventListener("click", ()=> stepCarousel(-1));
  document.getElementById("recNext")?.addEventListener("click", ()=> stepCarousel(1));
  document.getElementById("recViewport")?.addEventListener("keydown", (e)=>{
    if(e.key === "ArrowLeft"){ e.preventDefault(); stepCarousel(-1); }
    if(e.key === "ArrowRight"){ e.preventDefault(); stepCarousel(1); }
  });
  // Light touch swipe (buttons remain the primary control)
  const viewport = document.getElementById("recViewport");
  let touchX = null;
  viewport?.addEventListener("touchstart", (e)=>{ touchX = e.touches[0]?.clientX ?? null; }, { passive: true });
  viewport?.addEventListener("touchend", (e)=>{
    if(touchX === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX;
    touchX = null;
    if(Math.abs(dx) > 40) stepCarousel(dx < 0 ? 1 : -1);
  }, { passive: true });
  // CTA reveals the form inline; close collapses it
  const wrap = document.getElementById("recFormWrap");
  document.getElementById("recOpen")?.addEventListener("click", ()=>{
    if(!wrap) return;
    wrap.hidden = false;
    document.getElementById("recOpen")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "nearest",
    });
    textEl?.focus({ preventScroll: true });
  });
  document.getElementById("recClose")?.addEventListener("click", ()=>{
    if(wrap) wrap.hidden = true;
  });
  loadApproved();
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", initRecommendations);
} else {
  initRecommendations();
}
