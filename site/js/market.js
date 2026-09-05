// site/js/market.js — Dynamic Market + Café Market (single-category view)
// Loads active categories and active products, renders ONE selected category at a time.

import { getPublicSupabase } from "./supabase.js";

function escapeHtml(s){
  return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function safeDisplay(val){
  if(val===null||val===undefined||val==="undefined") return "";
  return String(val);
}

let allCategories=[];
let allProducts=[];
let selectedSlug=null;

function renderCategoryHeader(cat, count){
  const catBg = safeDisplay(cat.background_image_url) || safeDisplay(cat.background_image_path);
  let headerStyle = '';
  let hasWallpaper = false;
  if(catBg && catBg.startsWith('http')){
    headerStyle = ` style="background-image:url('${escapeHtml(catBg)}');background-size:cover;background-position:center"`;
    hasWallpaper = true;
  }
  const descHtml = safeDisplay(cat.description) ? `<p class="market-cat-desc">${escapeHtml(cat.description)}</p>` : '';
  const countHtml = typeof count === 'number' && count > 0 ? `<span class="market-cat-count">${count} ${count===1?'item':'items'}</span>` : '';
  const metaHtml = countHtml ? `<div class="market-cat-meta">${countHtml}</div>` : '';
  return `
    <section class="market-category active" id="cat-${escapeHtml(safeDisplay(cat.slug))}" data-type="${escapeHtml(safeDisplay(cat.type))}" data-category="${escapeHtml(String(cat.id))}">
      <div class="market-cat-head${hasWallpaper?' has-wallpaper':''}"${headerStyle}>
        <div class="market-cat-head-inner">
          <h2>${escapeHtml(safeDisplay(cat.name))}</h2>
          ${metaHtml}
          ${descHtml}
        </div>
      </div>
      <div class="market-products" data-category="${escapeHtml(String(cat.id))}"></div>
    </section>
  `;
}

function renderProductRow(p, idx){
  const priceHtml = p.price!=null && !isNaN(Number(p.price)) ? `<span class="market-row-price">$${Number(p.price).toFixed(2)}</span>` : '';
  const nameVal = safeDisplay(p.name);
  const nameHtml = nameVal ? `<span class="market-row-name">${escapeHtml(nameVal)}</span>` : '';
  const badgeVal = safeDisplay(p.badge);
  const badgeHtml = badgeVal ? `<span class="market-row-badge">${escapeHtml(badgeVal)}</span>` : '';
  const descVal = safeDisplay(p.description);
  const descHtml = descVal ? `<p class="market-row-desc">${escapeHtml(descVal)}</p>` : '';
  const indexHtml = typeof idx === 'number' ? `<span class="market-row-index">${String(idx+1).padStart(2,'0')}</span>` : '';
  return `
    <article class="market-row" tabindex="0" role="button" aria-label="${escapeHtml(nameVal)} ${p.price!=null?'$'+Number(p.price).toFixed(2):''}">
      ${indexHtml}
      <div class="market-row-content">
        <div class="market-row-head">
          <div class="market-row-left">
            ${nameHtml}
          </div>
          <div class="market-row-right">
            ${priceHtml}
            ${badgeHtml}
          </div>
        </div>
        <div class="market-row-body">
          ${descHtml}
        </div>
      </div>
      <div class="market-row-sep" aria-hidden="true"></div>
    </article>
  `;
}

function getProductRowsHtml(products){
  if(!products.length) return `<p class="market-empty">No products available yet.</p>`;
  return products.map((p,i)=> renderProductRow(p,i)).join('');
}

function setActiveStates(slug){
  document.querySelectorAll('.market-sidebar a').forEach(a=>a.classList.remove('active'));
  document.querySelectorAll('.categories-drawer-nav a').forEach(a=>a.classList.remove('active'));
  if(!slug) return;
  const sideLink = document.querySelector(`.market-sidebar a[data-target="cat-${CSS.escape(slug)}"]`) || document.querySelector(`.market-sidebar a[data-target="cat-${slug}"]`);
  if(sideLink) sideLink.classList.add('active');
  const drawerLink = document.querySelector(`.categories-drawer-nav a[data-target="cat-${CSS.escape(slug)}"]`) || document.querySelector(`.categories-drawer-nav a[data-target="cat-${slug}"]`);
  if(drawerLink) drawerLink.classList.add('active');
}

function selectCategory(slug){
  if(!slug) return;
  selectedSlug = slug;
  render();
  // smooth scroll to top of market content
  const wrap = document.querySelector('.menu-images-container');
  const target = document.getElementById(`cat-${slug}`);
  if(target){
    target.scrollIntoView({behavior:'smooth', block:'start'});
  } else if(wrap){
    wrap.scrollIntoView({behavior:'smooth', block:'start'});
  }
}

function renderSidebar(){
  const sidebar = document.getElementById('marketSidebar');
  const list = document.getElementById('marketSidebarList');
  const countEl = document.getElementById('marketSidebarCount');
  if(!sidebar || !list) return;
  if(countEl) countEl.textContent = allCategories.length ? `${allCategories.length} ${allCategories.length===1?'category':'categories'}` : '0 categories';
  sidebar.removeAttribute('hidden');
  sidebar.style.display='';
  if(!allCategories.length){
    list.innerHTML = `<li style="padding:10px 4px;font-size:13px;color:var(--muted)">No categories</li>`;
    return;
  }
  list.innerHTML = allCategories.map(cat=>{
    const slug = safeDisplay(cat.slug);
    const name = safeDisplay(cat.name);
    const count = allProducts.filter(p=> String(p.category_id)===String(cat.id)).length;
    const countHtml = count>0 ? `<span class="market-sidebar-item-count">${count}</span>` : '';
    return `<li><a href="#cat-${escapeHtml(slug)}" data-target="cat-${escapeHtml(slug)}"><span class="market-sidebar-item-name">${escapeHtml(name)}</span>${countHtml}</a></li>`;
  }).join('');
  // set active
  setActiveStates(selectedSlug);
}

function renderDrawer(){
  const nav = document.querySelector('.categories-drawer-nav');
  if(!nav) return;
  if(!allCategories.length){
    nav.innerHTML = `<p class="market-empty" style="padding:12px">No categories</p>`;
    return;
  }
  nav.innerHTML = allCategories.map(cat=>{
    const slug = safeDisplay(cat.slug);
    const name = safeDisplay(cat.name);
    const count = allProducts.filter(p=> String(p.category_id)===String(cat.id)).length;
    const countHtml = count>0 ? `<span class="market-sidebar-item-count">${count}</span>` : '';
    return `<a href="#cat-${escapeHtml(slug)}" data-target="cat-${escapeHtml(slug)}"><span>${escapeHtml(name)}</span>${countHtml}</a>`;
  }).join('');
  setActiveStates(selectedSlug);
}

function render(){
  const wrap = document.querySelector('.menu-images-container');
  if(!wrap) return;
  if(!allCategories.length){
    wrap.innerHTML = `
      <div class="market-empty-state">
        <h2>No categories</h2>
        <p>Categories will appear here soon.</p>
      </div>
    `;
    renderSidebar();
    renderDrawer();
    return;
  }
  // ensure selectedSlug is valid, default to first
  if(!selectedSlug || !allCategories.some(c=> safeDisplay(c.slug)===selectedSlug)){
    selectedSlug = safeDisplay(allCategories[0].slug);
  }
  const selectedCat = allCategories.find(c=> safeDisplay(c.slug)===selectedSlug) || allCategories[0];
  const products = allProducts.filter(p=>String(p.category_id)===String(selectedCat.id));
  const headerHtml = renderCategoryHeader(selectedCat, products.length);
  const productsHtml = getProductRowsHtml(products);
  const html = headerHtml.replace(`<div class="market-products" data-category="${escapeHtml(String(selectedCat.id))}"></div>`, `<div class="market-products" data-category="${escapeHtml(String(selectedCat.id))}">${productsHtml}</div>`);
  wrap.innerHTML = html;
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '0';

  // Wire product lightbox
  wrap.querySelectorAll('.market-row').forEach(row=>{
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

  // Reveal animations
  wrap.querySelectorAll('.reveal').forEach(el=>el.classList.add('in'));
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches && typeof IntersectionObserver!=="undefined"){
    const obs = new IntersectionObserver(entries=>{
      entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); obs.unobserve(e.target); }});
    }, {rootMargin:'0px 0px -8% 0px', threshold:0.05});
    wrap.querySelectorAll('.reveal:not(.in)').forEach(el=>obs.observe(el));
  }

  renderSidebar();
  renderDrawer();
}

// Drawer helpers
function getCategoriesElements(){
  const drawer = document.getElementById('categoriesDrawer');
  const backdrop = document.getElementById('categoriesBackdrop') || document.getElementById('drawerBackdrop');
  const openBtn = document.getElementById('categoriesButton');
  return {drawer, backdrop, openBtn};
}
function openCategoriesDrawer(){
  const {drawer, backdrop} = getCategoriesElements();
  if(!drawer) return;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
  if(backdrop){ backdrop.classList.add('open'); backdrop.setAttribute('aria-hidden','false'); }
  document.body.style.overflow='hidden';
  const focusEl = drawer.querySelector('.categories-drawer-close');
  if(focusEl) focusEl.focus();
}
function closeCategoriesDrawer(){
  const {drawer, backdrop, openBtn} = getCategoriesElements();
  if(!drawer) return;
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden','true');
  if(backdrop){ backdrop.classList.remove('open'); backdrop.setAttribute('aria-hidden','true'); }
  const mainDrawer = document.getElementById('drawer');
  const mainOpen = mainDrawer && mainDrawer.classList.contains('open');
  if(!mainOpen) document.body.style.overflow='';
  if(openBtn) openBtn.focus();
}

async function loadMarket(){
  const wrap = document.querySelector('.menu-images-container');
  if(!wrap) return;

  // Wire categories button / drawer once
  const catBtn = document.getElementById('categoriesButton');
  const catDrawer = document.getElementById('categoriesDrawer');
  const catBackdrop = document.getElementById('categoriesBackdrop');
  const catClose = catDrawer ? catDrawer.querySelector('.categories-drawer-close') : null;
  if(catBtn && catDrawer && !catBtn.dataset.wired){
    catBtn.dataset.wired='1';
    catBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      renderDrawer();
      openCategoriesDrawer();
    });
  }
  if(catClose && !catClose.dataset.wired){
    catClose.dataset.wired='1';
    catClose.addEventListener('click', closeCategoriesDrawer);
    const footClose = catDrawer.querySelector('.categories-drawer-foot .categories-drawer-close');
    if(footClose && !footClose.dataset.wired){
      footClose.dataset.wired='1';
      footClose.addEventListener('click', closeCategoriesDrawer);
    }
  }
  if(catBackdrop && !catBackdrop.dataset.wired){
    catBackdrop.dataset.wired='1';
    catBackdrop.addEventListener('click', closeCategoriesDrawer);
  }
  const fallbackBackdrop = document.getElementById('drawerBackdrop');
  if(fallbackBackdrop && !fallbackBackdrop.dataset.catWired){
    fallbackBackdrop.dataset.catWired='1';
    fallbackBackdrop.addEventListener('click', ()=>{
      const d = document.getElementById('categoriesDrawer');
      if(d && d.classList.contains('open')) closeCategoriesDrawer();
    });
  }
  if(catDrawer && !catDrawer.dataset.wired){
    catDrawer.dataset.wired='1';
    catDrawer.addEventListener('click', (e)=>{
      const link = e.target.closest('a[data-target]');
      if(!link) return;
      e.preventDefault();
      const targetId = link.getAttribute('data-target') || '';
      const slug = targetId.replace(/^cat-/, '');
      closeCategoriesDrawer();
      setTimeout(()=> selectCategory(slug), 120);
    });
  }
  const sidebar = document.getElementById('marketSidebar');
  if(sidebar && !sidebar.dataset.wired){
    sidebar.dataset.wired='1';
    sidebar.addEventListener('click', (e)=>{
      const link = e.target.closest('a[data-target]');
      if(!link) return;
      e.preventDefault();
      const targetId = link.getAttribute('data-target') || '';
      const slug = targetId.replace(/^cat-/, '');
      selectCategory(slug);
    });
  }
  if(!window._marketEscWired){
    window._marketEscWired = true;
    document.addEventListener('keydown', (e)=>{
      if(e.key==='Escape'){
        const d = document.getElementById('categoriesDrawer');
        if(d && d.classList.contains('open')){
          closeCategoriesDrawer();
        }
      }
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
    // select first category by default
    if(allCategories.length) selectedSlug = safeDisplay(allCategories[0].slug);
    render();
  }catch(err){
    console.warn('[TPM market] load failed', err);
    wrap.innerHTML = `<div class="market-empty-state"><h2>Market unavailable</h2><p>Please try again later.</p></div>`;
  }
}

// Expose for testing
window._marketLoadMenu = loadMarket;

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded", loadMarket);
} else {
  loadMarket();
}
