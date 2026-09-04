// site/js/market.js — Dynamic Market + Café Market (Part 5)
// Loads active categories (type market/cafe) and active products, renders in editorial rows.
// Uses existing getPublicSupabase() from site/js/supabase.js, respects RLS, no new client.

import { getPublicSupabase } from "./supabase.js";

function escapeHtml(s){
  return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

let allCategories=[];
let allProducts=[];
let currentFilter='all';

function renderCategoryHeader(cat){
  const catBg = cat.background_image_url || cat.background_image_path;
  let headerStyle = '';
  if(catBg && catBg.startsWith('http')){
    headerStyle = ` style="background-image:url('${escapeHtml(catBg)}');background-size:cover;background-position:center"`;
  }
  const descHtml = cat.description ? `<p class="market-cat-desc">${escapeHtml(cat.description)}</p>` : '';
  return `
    <section class="market-category" id="cat-${escapeHtml(cat.slug)}" data-type="${escapeHtml(cat.type)}">
      <div class="market-cat-head"${headerStyle}>
        <div class="market-cat-head-inner">
          <h2>${escapeHtml(cat.name)}</h2>
          ${descHtml}
        </div>
      </div>
      <div class="market-products" data-category="${escapeHtml(cat.id)}"></div>
    </section>
  `;
}

function renderProductRow(p){
  const priceHtml = p.price!=null ? `<span class="market-row-price">$${Number(p.price).toFixed(2)}</span>` : '';
  const descHtml = p.description ? `<p class="market-row-desc">${escapeHtml(p.description)}</p>` : '';
  const badgeHtml = p.badge ? `<span class="market-row-badge">${escapeHtml(p.badge)}</span>` : '';
  return `
    <article class="market-row" tabindex="0" role="button" aria-label="${escapeHtml(p.name)} ${p.price!=null?'$'+Number(p.price).toFixed(2):''}">
      <div class="market-row-left">
        <span class="market-row-name">${escapeHtml(p.name)}</span>
        ${badgeHtml}
      </div>
      <div class="market-row-right">
        ${priceHtml}
      </div>
      <div class="market-row-body">
        ${descHtml}
      </div>
      <div class="market-row-sep" aria-hidden="true"></div>
    </article>
  `;
}

function renderCategoryProducts(cat, products){
  const container = document.querySelector(`.market-products[data-category="${cat.id}"]`);
  if(!container) return;
  if(!products.length){
    container.innerHTML = `<p class="market-empty">No products available yet.</p>`;
    return;
  }
  container.innerHTML = products.map(renderProductRow).join('');
  // Wire lightbox
  container.querySelectorAll('.market-row').forEach(row=>{
    row.addEventListener('click', ()=>{
      const name = row.querySelector('.market-row-name')?.textContent || '';
      const desc = row.querySelector('.market-row-desc')?.textContent || '';
      const price = row.querySelector('.market-row-price')?.textContent || '';
      const badge = row.querySelector('.market-row-badge')?.textContent || '';
      if(window.openLightbox) window.openLightbox({src:'', title:name, desc, price, badge});
    });
    row.addEventListener('keydown', (e)=>{
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); row.click(); }
    });
  });
}

function render(){
  const wrap = document.querySelector('.menu-images-container');
  if(!wrap) return;
  const filteredCats = currentFilter==='all' ? allCategories : allCategories.filter(c=>c.type===currentFilter);

  if(!filteredCats.length){
    wrap.innerHTML = `
      <div class="market-empty-state">
        <h2>No ${escapeHtml(currentFilter)} categories</h2>
        <p>Try selecting All.</p>
      </div>
      <div class="menu-foot-note reveal in">
        <p>All items subject to seasonal availability. Please inform our team of allergies — full allergen list available on request.</p>
        <div class="menu-actions">
          <a href="tel:+15551234567" class="btn btn-primary">Call to order</a>
          <a href="index.html#visit" class="btn btn-secondary">Find us</a>
        </div>
      </div>
    `;
    return;
  }

  const html = filteredCats.map(cat=>{
    const products = allProducts.filter(p=>p.category_id===cat.id);
    return renderCategoryHeader(cat) + renderCategoryProducts(cat, products);
  }).join('') + `
    <div class="menu-foot-note reveal in" style="transition-delay:.18s">
      <p>All items subject to seasonal availability. Please inform our team of allergies — full allergen list available on request.</p>
      <div class="menu-actions">
        <a href="tel:+15551234567" class="btn btn-primary">Call to order</a>
        <a href="index.html#visit" class="btn btn-secondary">Find us</a>
      </div>
    </div>
  `;

  wrap.innerHTML = html;
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '0';

  // Reveal animations
  wrap.querySelectorAll('.reveal').forEach(el=>el.classList.add('in'));
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches && typeof IntersectionObserver!=="undefined"){
    const obs = new IntersectionObserver(entries=>{
      entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); obs.unobserve(e.target); }});
    }, {rootMargin:'0px 0px -8% 0px', threshold:0.05});
    wrap.querySelectorAll('.reveal:not(.in)').forEach(el=>obs.observe(el));
  }
}

async function loadMarket(){
  const wrap = document.querySelector('.menu-images-container');
  if(!wrap) return;

  // Inject filter buttons if not exists
  const filterEl = document.getElementById('menuTypeFilter');
  if(filterEl && !filterEl.querySelector('button')){
    filterEl.innerHTML = `
      <button data-filter="all" class="chip active">All</button>
      <button data-filter="market" class="chip">Market</button>
      <button data-filter="cafe" class="chip">Café</button>
    `;
    filterEl.querySelectorAll('button[data-filter]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        filterEl.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        render();
      });
    });
  }

  wrap.innerHTML = `<div class="admin-loading" style="min-height:120px"><span class="admin-spinner"></span> Loading market…</div>`;

  const supa = getPublicSupabase();
  try{
    const [catRes, prodRes] = await Promise.all([
      supa.from('categories').select('id,name,slug,description,type,sort_order,is_active,background_image_url,background_image_path').eq('is_active',true).order('sort_order').order('name'),
      supa.from('products').select('id,name,slug,description,price,badge,sort_order,is_active,category_id,image_url,image_path').eq('is_active',true).order('sort_order').order('name')
    ]);
    if(catRes.error) throw catRes.error;
    if(prodRes.error) throw prodRes.error;
    allCategories = catRes.data||[];
    allProducts = prodRes.data||[];
    render();
  }catch(err){
    console.warn('[TPM market] load failed', err);
    wrap.innerHTML = `<div class="market-empty-state"><h2>Market unavailable</h2><p>Please try again later.</p></div>`;
  }
}

// Expose for testing
window._marketLoadMenu = loadMarket;

// Init on DOM ready
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded", loadMarket);
} else {
  loadMarket();
}
