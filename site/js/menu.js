// site/js/menu.js — Dynamic Market + Café Menu (Part 5)
// Loads active categories (type market/cafe) and active products, renders inside .menu-images-container
// Uses existing getPublicSupabase() from site/js/supabase.js, respects RLS, no new client.

import { getPublicSupabase } from "./supabase.js";

function escapeHtml(s){
  return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// Local fallback visual — clean, no external Unsplash
// Uses a simple SVG data URI with TPM colors, or a local asset
const FALLBACK_CATEGORY_BG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#FFFBF0"/><rect x="20" y="20" width="360" height="260" rx="18" fill="#fff" stroke="rgba(14,26,20,.08)"/><text x="200" y="150" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="16" font-weight="700" fill="#004e36">TPM</text></svg>'
);
const FALLBACK_PRODUCT_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#FFF6E6"/><circle cx="200" cy="130" r="48" fill="#fff" stroke="rgba(14,26,20,.08)"/><text x="200" y="210" text-anchor="middle" font-family="Space Grotesk" font-size="13" font-weight="700" fill="#6F7D77">No image</text></svg>'
);

let allCategories=[];
let allProducts=[];
let currentFilter='all';

async function loadMenu(){
  const container=document.querySelector('.menu-images-container');
  if(!container) return;

  // Add filter UI if not exists (minimal, reuses .chip)
  const hero=document.querySelector('.menu-page-hero .container');
  if(hero && !hero.querySelector('#menuTypeFilter')){
    const filterWrap=document.createElement('div');
    filterWrap.id='menuTypeFilter';
    filterWrap.style.cssText='display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap';
    filterWrap.innerHTML=`
      <button data-filter="all" class="chip active" style="min-height:36px;padding:0 18px">All</button>
      <button data-filter="market" class="chip" style="min-height:36px;padding:0 18px">Market</button>
      <button data-filter="cafe" class="chip" style="min-height:36px;padding:0 18px">Café</button>
    `;
    hero.appendChild(filterWrap);
    filterWrap.querySelectorAll('button[data-filter]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        filterWrap.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter=btn.dataset.filter;
        render();
      });
    });
  }

  // Show loading state inside container (preserve shell)
  container.innerHTML=`<div class="admin-loading" style="grid-column:1/-1;min-height:120px"><span class="admin-spinner"></span> Loading menu…</div>`;

  const supa=getPublicSupabase();
  try{
    const [catRes, prodRes]=await Promise.all([
      supa.from('categories').select('id,name,slug,description,type,sort_order,is_active,background_image_url,background_image_path').eq('is_active',true).order('sort_order').order('name'),
      supa.from('products').select('id,name,slug,description,price,badge,sort_order,is_active,category_id,image_url,image_path').eq('is_active',true).order('sort_order').order('name')
    ]);
    if(catRes.error) throw catRes.error;
    if(prodRes.error) throw prodRes.error;
    allCategories=catRes.data||[];
    allProducts=prodRes.data||[];
    // Filter out categories with no active products? No, show all active categories even if empty, but don't create broken grid
    render();
    // Update intro counts
    const intro=document.querySelector('.menu-intro');
    if(intro){
      const marketCount=allCategories.filter(c=>c.type==='market').length;
      const cafeCount=allCategories.filter(c=>c.type==='cafe').length;
      intro.textContent=`${allCategories.length} categories • ${allProducts.length} products • ${marketCount} Market • ${cafeCount} Café — tap a product to view details.`;
    }
    // Remove old menu lightbox dependency if no longer needed (keep for product lightbox)
  }catch(err){
    console.warn('[TPM menu] load failed', err);
    container.innerHTML=`<div class="admin-empty" style="grid-column:1/-1;text-align:center;padding:32px;background:var(--surface);border:1px solid var(--line);border-radius:18px"><strong>Menu unavailable</strong><br><span style="font-size:12px;color:var(--muted)">Please try again later.</span></div>`;
  }
}

function render(){
  const container=document.querySelector('.menu-images-container');
  if(!container) return;
  const filteredCats=currentFilter==='all' ? allCategories : allCategories.filter(c=>c.type===currentFilter);
  if(!filteredCats.length){
    container.innerHTML=`<div class="admin-empty" style="grid-column:1/-1;text-align:center;padding:32px;background:var(--surface);border:1px solid var(--line);border-radius:22px"><strong>No ${escapeHtml(currentFilter)} categories</strong><br><span style="font-size:12px;color:var(--muted)">Try All.</span></div><div class="menu-foot-note reveal in" style="transition-delay:.18s"><p>All items subject to seasonal availability.</p><div class="menu-actions"><a href="tel:+15551234567" class="btn btn-primary">Call to order</a><a href="index.html#visit" class="btn btn-secondary">Find us</a></div></div>`;
    return;
  }

  // Build HTML for each category with its products
  const html=filteredCats.map(cat=>{
    const productsForCat=allProducts.filter(p=>p.category_id===cat.id);
    // Skip empty product grid message but keep category header
    const hasProducts=productsForCat.length>0;
    const catBg=cat.background_image_url || cat.background_image_path;
    // Use category background as section header visual if available (optional, not breaking)
    const headerBg = catBg && catBg.startsWith('http') ? ` style="background-image:url('${escapeHtml(catBg)}');background-size:cover;background-position:center"` : '';

    const productsHtml = hasProducts ? `
      <div class="menu-grid">
        ${productsForCat.map(p=>{
          // Determine image: product image > category bg > local fallback
          let imgUrl=p.image_url || p.image_path || cat.background_image_url || cat.background_image_path || '';
          // Validate image url
          const isValidImg = imgUrl && (imgUrl.startsWith('http') || imgUrl.startsWith('data:') || imgUrl.startsWith('/'));
          const finalImg = isValidImg ? imgUrl : FALLBACK_PRODUCT_IMG;
          const badgeHtml = p.badge ? `<span class="menu-card-badge">${escapeHtml(p.badge)}</span>` : '';
          const priceHtml = p.price!=null ? `<span class="price-chip" style="font-size:12px;font-weight:700;background:rgba(255,255,255,.9);padding:6px 10px;border-radius:999px;border:1px solid rgba(14,26,20,.08)">$${Number(p.price).toFixed(2)}</span>` : '';
          const descHtml = p.description ? `<p>${escapeHtml(p.description)}</p>` : '';
          return `
            <article class="menu-card" data-lightbox data-src="${escapeHtml(finalImg)}" data-title="${escapeHtml(p.name)}" data-desc="${escapeHtml(p.description||'')}" data-price="${p.price!=null?`$${Number(p.price).toFixed(2)}`:''}" data-badge="${escapeHtml(p.badge||'')}" tabindex="0" role="button" aria-label="${escapeHtml(p.name)}">
              <div class="menu-card-media">
                <img src="${escapeHtml(finalImg)}" alt="${escapeHtml(p.name)}" width="400" height="300" loading="lazy" decoding="async" onerror="this.src='${FALLBACK_PRODUCT_IMG}'" />
                ${badgeHtml}
              </div>
              <div class="menu-card-body">
                <div class="menu-card-top">
                  <h3>${escapeHtml(p.name)}</h3>
                  ${priceHtml}
                </div>
                ${descHtml}
              </div>
            </article>
          `;
        }).join('')}
      </div>
    ` : `<p style="font-size:13px;color:var(--muted);padding:12px 0">No products in this category yet.</p>`;

    return `
      <section class="menu-section reveal" id="cat-${escapeHtml(cat.slug)}" data-type="${escapeHtml(cat.type)}" style="transition-delay:.04s">
        <div class="menu-section-head"${headerBg}>
          <h2>${escapeHtml(cat.name)}</h2>
          ${cat.description ? `<p style="font-size:13px;color:var(--muted);max-width:40ch">${escapeHtml(cat.description)}</p>` : ''}
        </div>
        ${productsHtml}
      </section>
    `;
  }).join('') + `
    <div class="menu-foot-note reveal in" style="transition-delay:.18s">
      <p>All items subject to seasonal availability. Please inform our team of allergies — full allergen list available on request.</p>
      <div class="menu-actions">
        <a href="tel:+15551234567" class="btn btn-primary">Call to order</a>
        <a href="index.html#visit" class="btn btn-secondary">Find us</a>
      </div>
    </div>
  `;

  container.innerHTML=html;
  container.style.display='grid';
  // Ensure reveal animations — add .in immediately so above-fold content is visible
  container.querySelectorAll('.reveal').forEach(el=>el.classList.add('in'));
  // Also observe for scroll-triggered animations (enhancement, not required for visibility)
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches && typeof IntersectionObserver!=="undefined"){
    const obs=new IntersectionObserver(entries=>{
      entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); obs.unobserve(e.target); }});
    }, {rootMargin:'0px 0px -8% 0px', threshold:0.05});
    container.querySelectorAll('.reveal:not(.in)').forEach(el=>obs.observe(el));
  }

  // Re-wire lightbox for new cards (reuse existing app.js lightbox)
  // app.js already has data-lightbox handling, but we need to ensure new cards are handled
  // We can dispatch a custom event or just rely on the existing delegated handler in app.js which uses $$('[data-lightbox]')
  // Since we used data-lightbox, the existing handler should work if we re-initialize or use event delegation
  // For now, trigger a re-init by dispatching an event
  document.querySelectorAll('.menu-card[data-lightbox]').forEach(el=>{
    // Ensure the existing app.js handler will work (it uses $$('[data-lightbox]').forEach at load time, so new elements won't have listeners)
    // Add direct listener as fallback
    if(!el._hasLightboxListener){
      el.addEventListener('click', ()=>{
        const src=el.dataset.src || el.querySelector('img')?.src;
        if(window.openLightbox) window.openLightbox({
          src,
          title: el.dataset.title || 'Menu item',
          desc: el.dataset.desc || '',
          price: el.dataset.price || '',
          badge: el.dataset.badge || ''
        });
        else {
          // Fallback: use existing lightbox directly
          const lb=document.getElementById('lightbox');
          const lbImg=document.getElementById('lbImg');
          const lbTitle=document.getElementById('lbTitle');
          const lbDesc=document.getElementById('lbDesc');
          const lbPrice=document.getElementById('lbPrice');
          const lbBadge=document.getElementById('lbBadge');
          if(lb && lbImg){
            lbImg.src=src;
            lbTitle.textContent=el.dataset.title||'';
            lbDesc.textContent=el.dataset.desc||'';
            lbPrice.textContent=el.dataset.price||'';
            lbBadge.textContent=el.dataset.badge||'';
            lb.classList.add('open');
            lb.setAttribute('aria-hidden','false');
            document.body.style.overflow='hidden';
          }
        }
      });
      el._hasLightboxListener=true;
    }
  });
}

// Expose for testing
window._menuLoadMenu=loadMenu;

// Init on DOM ready
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded", loadMenu);
} else {
  loadMenu();
}
