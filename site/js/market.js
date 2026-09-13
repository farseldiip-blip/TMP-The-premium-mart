// site/js/market.js — Dynamic Market + Café Market (single-category view)
// Loads active categories and active products, renders ONE selected category at a time.

import { getAnonSupabase as getPublicSupabase } from "./supabase.js";
import { readCatalogCache, writeCatalogCache, isCatalogChanged } from "./catalog-cache.js";

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
let selectedDept='market';
let lastSelectedByDept={};

function normType(t){
  return t==='cafe' ? 'cafe' : 'market';
}
function deptLabel(dept){
  return dept==='cafe' ? 'Café' : 'Market';
}
function getDeptCategories(dept){
  const d = normType(dept || selectedDept);
  return allCategories.filter(c=> normType(c.type)===d);
}
function countProductsFor(catId){
  return allProducts.filter(p=> String(p.category_id)===String(catId)).length;
}

/* ---------- Bilingual search (client-side only, no network) ----------
   Lightweight normalized index over the already-loaded catalog.
   - Arabic: strip tashkeel/tatweel, unify alef/hamza forms, ة→ه, ى→ي.
   - English: lowercase, light singularization (berries→berry, grapes→grape).
   - Cross-language: small reusable alias sets (vocabulary, never product names).
   Both index and query go through the same pipeline, so matching works in
   both directions even for monolingual product names. */
const SEARCH_ALIASES = [
  ['mango','مانجو','مانجا','منجا'],
  ['kiwi','كيوي'],
  ['strawberry','فراولة'],
  ['blueberry','بلوبيري','توت ازرق'],
  ['berry','بيري'],
  ['coffee','قهوة'],
  ['orange','برتقال'],
  ['apple','تفاح'],
  ['banana','موز'],
  ['lemon','ليمون'],
  ['mint','نعناع'],
  ['chocolate','شوكولاتة','شوكليت'],
  ['matcha','ماتشا'],
  ['mojito','موهيتو'],
  ['milk','ميلك'],
  ['shake','شيك'],
  ['milkshake','ميلك','شيك'],
  ['smoothie','سموذي'],
  ['avocado','افوكادو'],
  ['grapes','grape','عنب'],
  ['peach','خوخ'],
  ['watermelon','بطيخ'],
  ['guava','جوافة'],
  ['pineapple','اناناس'],
  ['pomegranate','رمان'],
  ['melon','شمام'],
  ['cantaloupe','كنتالوب'],
  ['fig','تين'],
  ['pear','كمثري'],
  ['plum','برقوق'],
  ['apricot','مشمش'],
  ['nectarine','نكتارين'],
  ['dragon','دراجون'],
  ['passion','باشون'],
  ['coconut','جوز','هند'],
  ['caramel','كراميل'],
  ['vanilla','فانيلا'],
  ['latte','لاتيه'],
  ['espresso','اسبريسو'],
  ['cappuccino','كابتشينو'],
  ['mocha','موكا'],
  ['frappe','فرابيه'],
  ['tea','شاي'],
  ['meat','لحم'],
  ['minced','مفروم'],
  ['chicken','فراخ','دجاج'],
  ['beef','بيف'],
  ['sausage','سجق'],
  ['kofta','كفتة'],
  ['burger','برجر'],
  ['spicy','سبايسي'],
  ['strips','استربس'],
  ['juice','عصير'],
  ['mixed','ميكس'],
  ['sugar','sugary','سكر','سكري'],
  ['red','احمر'],
  ['green','اخضر'],
  ['black','اسود'],
  ['white','ابيض'],
  ['yellow','اصفر'],
  ['blue','ازرق','بلو'],
  ['classic','كلاسيك'],
  ['salted','سولتد'],
  ['spanish','سبانيش'],
  ['turkish','تركي'],
  ['french','فرنساوي'],
  ['iced','ice','ايس'],
  ['hot','هوت']
];

function normSearchToken(raw){
  let s = String(raw || '').toLowerCase();
  s = s.replace(/[ً-ٰٟـ]/g, '');
  s = s.replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
  return s;
}
function stemEnToken(t){
  if(!/^[a-z]+$/.test(t)) return t;
  if(t.endsWith('ies') && t.length > 4) return t.slice(0, -3) + 'y';
  if((t.endsWith('ches') || t.endsWith('shes') || t.endsWith('sses') || t.endsWith('xes') || t.endsWith('zes')) && t.length > 5) return t.slice(0, -2);
  if(t.endsWith('s') && t.length > 3 && !t.endsWith('ss')) return t.slice(0, -1);
  return t;
}
function searchTokens(text){
  return String(text || '').split(/[^0-9A-Za-z؀-ۿ]+/).map(t => stemEnToken(normSearchToken(t))).filter(t => t.length > 0);
}
const aliasMap = new Map();
SEARCH_ALIASES.forEach(set => {
  const ns = [...new Set(set.map(normSearchToken).filter(t => t.length > 0))];
  ns.forEach(t => {
    if(!aliasMap.has(t)) aliasMap.set(t, new Set());
    ns.forEach(u => aliasMap.get(t).add(u));
  });
});
function expandSearchToken(t){
  return aliasMap.get(t) || new Set([t]);
}
let searchIndex = new Map(); // productId (string) -> Set(normalized tokens incl. aliases)
function indexProductTokens(p){
  const toks = new Set();
  const add = (text) => {
    searchTokens(text).forEach(t => {
      toks.add(t);
      expandSearchToken(t).forEach(u => toks.add(u));
    });
  };
  add(safeDisplay(p.name));
  add(safeDisplay(p.description));
  return toks;
}
function rebuildSearchIndex(){
  searchIndex = new Map();
  allProducts.forEach(p => searchIndex.set(String(p.id), indexProductTokens(p)));
}
function productMatchesQuery(prodTokens, queryTokens){
  // AND over query tokens: every token must hit (exact, alias, or prefix).
  let score = 0;
  for(const q of queryTokens){
    let best = 0;
    for(const e of expandSearchToken(q)){
      if(prodTokens.has(e)){ best = Math.max(best, e === q ? 2 : 1.5); break; }
    }
    if(!best && q.length >= 3){
      for(const pt of prodTokens){ if(pt.startsWith(q)){ best = 1; break; } }
    }
    if(!best) return { match: false, score: 0 };
    score += best;
  }
  return { match: true, score };
}
function searchProductsIn(query, list){
  const qts = searchTokens(query);
  if(!qts.length) return null; // empty query → normal browsing
  const out = [];
  list.forEach((p, idx) => {
    const r = productMatchesQuery(searchIndex.get(String(p.id)) || new Set(), qts);
    if(r.match) out.push({ p, score: r.score, order: idx });
  });
  out.sort((a, b) => (b.score - a.score) || (a.order - b.order));
  return out.map(x => x.p);
}
let searchQuery = '';
let searchNarrowSlug = null; // rail/sidebar facet while searching; null = whole department
function isSearching(){
  return searchTokens(searchQuery).length > 0;
}
function deptProducts(dept){
  const ids = new Set(getDeptCategories(dept).map(c => String(c.id)));
  return allProducts.filter(p => ids.has(String(p.category_id)));
}
function ensureDeptSelection(){
  // Keep selectedDept valid and selectedSlug inside current department.
  const depts = ['market','cafe'];
  if(!depts.includes(selectedDept)) selectedDept='market';
  let filtered = getDeptCategories(selectedDept);
  if(!filtered.length){
    // Fall back to whichever department has categories (never hardcode names).
    const other = selectedDept==='market' ? 'cafe' : 'market';
    const otherCats = getDeptCategories(other);
    if(otherCats.length){
      selectedDept = other;
      filtered = otherCats;
    } else if(allCategories.length){
      selectedDept = normType(allCategories[0].type);
      filtered = getDeptCategories(selectedDept);
    }
  }
  const valid = filtered.some(c=> safeDisplay(c.slug)===selectedSlug);
  if(!valid){
    const remembered = lastSelectedByDept[selectedDept];
    const rememberedValid = remembered && filtered.some(c=> safeDisplay(c.slug)===remembered);
    if(rememberedValid){
      selectedSlug = remembered;
    } else if(filtered.length){
      selectedSlug = safeDisplay(filtered[0].slug);
    } else {
      selectedSlug = null;
    }
  }
  if(selectedSlug) lastSelectedByDept[selectedDept]=selectedSlug;
}

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
  const priceHtml = p.price!=null && !isNaN(Number(p.price)) ? `<span class="market-row-price">EGP${Number(p.price).toFixed(2)}</span>` : '';
  const nameVal = safeDisplay(p.name);
  const nameHtml = nameVal ? `<span class="market-row-name">${escapeHtml(nameVal)}</span>` : '';
  const badgeVal = safeDisplay(p.badge);
  const badgeHtml = badgeVal ? `<span class="market-row-badge">${escapeHtml(badgeVal)}</span>` : '';
  const descVal = safeDisplay(p.description);
  const descHtml = descVal ? `<p class="market-row-desc">${escapeHtml(descVal)}</p>` : '';
  const indexHtml = typeof idx === 'number' ? `<span class="market-row-index">${String(idx+1).padStart(2,'0')}</span>` : '';
  const imgVal = safeDisplay(p.image_url);
  return `
    <article class="market-row" tabindex="0" role="button" data-img="${escapeHtml(imgVal)}" aria-label="${escapeHtml(nameVal)} ${p.price!=null?'EGP'+Number(p.price).toFixed(2):''}">
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
  const searching = isSearching();
  document.querySelectorAll('.categories-drawer-nav a').forEach(a=>a.classList.remove('active'));
  document.querySelectorAll('.market-sidebar a').forEach(a=>a.classList.remove('active'));
  document.querySelectorAll('.market-rail-btn').forEach(b=>{
    const s = b.dataset.slug || '';
    let on;
    if(s === '') on = searching && searchNarrowSlug == null;
    else if(searching) on = searchNarrowSlug === s;
    else on = !!slug && s === slug;
    b.classList.toggle('active', on);
    if(on) b.setAttribute('aria-current','true');
    else b.removeAttribute('aria-current');
  });
  document.querySelectorAll('.market-dept-btn').forEach(b=>{
    const on = normType(b.dataset.dept)===normType(selectedDept);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  if(!slug && !searching) return;
  const activeSlug = searching ? searchNarrowSlug : slug;
  if(!activeSlug) return;
  const sideLink = document.querySelector(`.market-sidebar a[data-target="cat-${CSS.escape(activeSlug)}"]`) || document.querySelector(`.market-sidebar a[data-target="cat-${activeSlug}"]`);
  if(sideLink) sideLink.classList.add('active');
  const drawerLink = document.querySelector(`.categories-drawer-nav a[data-target="cat-${CSS.escape(activeSlug)}"]`) || document.querySelector(`.categories-drawer-nav a[data-target="cat-${activeSlug}"]`);
  if(drawerLink) drawerLink.classList.add('active');
}

function renderDeptSwitcher(){
  const btns = document.querySelectorAll('.market-dept-btn');
  if(!btns.length) return;
  const marketCount = getDeptCategories('market').length;
  const cafeCount = getDeptCategories('cafe').length;
  btns.forEach(b=>{
    const dept = normType(b.dataset.dept);
    const on = dept===normType(selectedDept);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    const countEl = b.querySelector('[data-dept-count]');
    const n = dept==='cafe' ? cafeCount : marketCount;
    if(countEl) countEl.textContent = n ? `${n}` : '';
    const name = deptLabel(dept);
    b.setAttribute('aria-label', `${name} department, ${n} ${n===1?'category':'categories'}`);
  });
}

function matchCountsByCategory(query){
  // product matches per category id (strings) within the current department
  const counts = new Map();
  if(!isSearching()) return counts;
  const matches = searchProductsIn(query, deptProducts(selectedDept)) || [];
  matches.forEach(p => {
    const k = String(p.category_id);
    counts.set(k, (counts.get(k) || 0) + 1);
  });
  return counts;
}

function renderRail(){
  const list = document.getElementById('marketRailList');
  const label = document.getElementById('marketRailLabel');
  const rail = document.querySelector('.market-rail');
  const filtered = getDeptCategories(selectedDept);
  const dLabel = deptLabel(selectedDept);
  const searching = isSearching();
  if(label) label.textContent = `${dLabel} categories · ${filtered.length}`;
  if(!list) return;
  if(!filtered.length){
    list.innerHTML = `<li style="padding:10px 4px;font-size:13px;color:var(--muted)">No categories</li>`;
    return;
  }
  const counts = searching ? matchCountsByCategory(searchQuery) : null;
  const allOn = searching && searchNarrowSlug == null;
  const allHtml = searching
    ? `<li><button type="button" class="market-rail-btn${allOn?' active':''}" data-slug=""${allOn?' aria-current="true"':''} aria-label="All categories">All</button></li>`
    : '';
  list.innerHTML = allHtml + filtered.map(cat=>{
    const slug = safeDisplay(cat.slug);
    const name = safeDisplay(cat.name);
    const count = countProductsFor(cat.id);
    const on = searching ? (searchNarrowSlug === slug) : (slug === selectedSlug);
    const m = counts ? (counts.get(String(cat.id)) || 0) : 0;
    const aria = searching
      ? (m > 0 ? `${name}, ${m} ${m===1?'result':'results'}` : `${name}, no results`)
      : (count>0 ? `${name}, ${count} ${count===1?'item':'items'}` : name);
    return `<li><button type="button" class="market-rail-btn${on?' active':''}" data-slug="${escapeHtml(slug)}"${on?' aria-current="true"':''} aria-label="${escapeHtml(aria)}">${escapeHtml(name)}</button></li>`;
  }).join('');
  // Keep the selected rail item visible without moving the page.
  if(rail){
    const active = list.querySelector('.market-rail-btn.active');
    if(active){
      const railRect = rail.getBoundingClientRect();
      const btnRect = active.getBoundingClientRect();
      const outLeft = btnRect.left < railRect.left;
      const outRight = btnRect.right > railRect.right;
      if(outLeft || outRight){
        rail.scrollLeft += (btnRect.left - railRect.left) - 12;
      }
    }
  }
}

function scrollRailToStart(){
  const rail = document.querySelector('.market-rail');
  if(rail) rail.scrollLeft = 0;
}

function selectCategory(slug, opts={}){
  if(!slug) return;
  const cat = allCategories.find(c=> safeDisplay(c.slug)===slug);
  if(cat) selectedDept = normType(cat.type);
  selectedSlug = slug;
  lastSelectedByDept[selectedDept]=slug;
  if(isSearching()) searchNarrowSlug = slug;
  render();
  if(opts.scroll===false) return;
  // smooth scroll to top of market content
  const wrap = document.querySelector('.menu-images-container');
  const target = document.getElementById(`cat-${slug}`);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(target){
    target.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block:'start'});
  } else if(wrap){
    wrap.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block:'start'});
  }
}

function clearSearchNarrow(){
  searchNarrowSlug = null;
  render();
}

function setSearchQuery(value, opts={}){
  const next = String(value ?? '');
  const was = isSearching();
  searchQuery = next;
  const now = isSearching();
  if(!now) searchNarrowSlug = null;
  else if(!was) searchNarrowSlug = null; // typing broadens to the whole department
  syncSearchChrome();
  render();
  if(opts.scroll===false) return;
}

function clearSearch(focusInput){
  searchQuery = '';
  searchNarrowSlug = null;
  const input = document.getElementById('marketSearch');
  if(input && input.value !== '') input.value = '';
  syncSearchChrome();
  render();
  if(focusInput && input) input.focus();
}

function syncSearchChrome(){
  const input = document.getElementById('marketSearch');
  const clearBtn = document.getElementById('marketSearchClear');
  const status = document.getElementById('marketSearchStatus');
  const has = !!(input && input.value);
  if(clearBtn){
    if(has) clearBtn.removeAttribute('hidden');
    else clearBtn.setAttribute('hidden', '');
  }
  if(status && !isSearching()) status.setAttribute('hidden', '');
}

function selectDept(dept, opts={}){
  const d = normType(dept);
  if(d===normType(selectedDept) && opts.reselect!==true){
    // Re-selecting the active department resets to its first category.
  }
  selectedDept = d;
  if(isSearching()) searchNarrowSlug = null; // dept switch broadens an active search
  ensureDeptSelection();
  // Prefer the remembered category for this department, else first.
  const filtered = getDeptCategories(selectedDept);
  if(filtered.length && !opts.keepSlug){
    const remembered = lastSelectedByDept[selectedDept];
    const ok = remembered && filtered.some(c=> safeDisplay(c.slug)===remembered);
    selectedSlug = ok ? remembered : safeDisplay(filtered[0].slug);
    lastSelectedByDept[selectedDept]=selectedSlug;
  }
  render();
  scrollRailToStart();
  if(opts.scroll===false) return;
  const browse = document.querySelector('.market-browse');
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(browse){
    browse.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block:'start'});
  }
}

function renderSidebar(){
  const sidebar = document.getElementById('marketSidebar');
  const list = document.getElementById('marketSidebarList');
  const countEl = document.getElementById('marketSidebarCount');
  const labelEl = sidebar ? sidebar.querySelector('.market-sidebar-label') : null;
  const filtered = getDeptCategories(selectedDept);
  const searching = isSearching();
  const counts = searching ? matchCountsByCategory(searchQuery) : null;
  if(!sidebar || !list) return;
  if(labelEl) labelEl.textContent = `Browse · ${deptLabel(selectedDept)}`;
  if(countEl) countEl.textContent = filtered.length ? `${filtered.length} ${filtered.length===1?'category':'categories'}` : '0 categories';
  sidebar.removeAttribute('hidden');
  sidebar.style.display='';
  if(!filtered.length){
    list.innerHTML = `<li style="padding:10px 4px;font-size:13px;color:var(--muted)">No categories</li>`;
    return;
  }
  list.innerHTML = filtered.map(cat=>{
    const slug = safeDisplay(cat.slug);
    const name = safeDisplay(cat.name);
    const shown = searching ? (counts.get(String(cat.id)) || 0) : countProductsFor(cat.id);
    const countHtml = shown>0 ? `<span class="market-sidebar-item-count">${shown}</span>` : '';
    return `<li><a href="#cat-${escapeHtml(slug)}" data-target="cat-${escapeHtml(slug)}"><span class="market-sidebar-item-name">${escapeHtml(name)}</span>${countHtml}</a></li>`;
  }).join('');
  if(searching){
    const total = [...counts.values()].reduce((a,b)=>a+b,0);
    const allOn = searchNarrowSlug == null;
    list.innerHTML = `<li><a href="#" data-search-all="1"${allOn?' class="active"':''}><span class="market-sidebar-item-name">All categories</span>${total>0?`<span class="market-sidebar-item-count">${total}</span>`:''}</a></li>` + list.innerHTML;
  }
  // set active
  setActiveStates(selectedSlug);
}

function renderDrawer(){
  const nav = document.querySelector('.categories-drawer-nav');
  if(!nav) return;
  const filtered = getDeptCategories(selectedDept);
  const searching = isSearching();
  if(!filtered.length){
    nav.innerHTML = `<p class="market-empty" style="padding:12px">No categories</p>`;
    return;
  }
  const counts = searching ? matchCountsByCategory(searchQuery) : null;
  nav.innerHTML = filtered.map(cat=>{
    const slug = safeDisplay(cat.slug);
    const name = safeDisplay(cat.name);
    const shown = searching ? (counts.get(String(cat.id)) || 0) : countProductsFor(cat.id);
    const countHtml = shown>0 ? `<span class="market-sidebar-item-count">${shown}</span>` : '';
    return `<a href="#cat-${escapeHtml(slug)}" data-target="cat-${escapeHtml(slug)}"><span>${escapeHtml(name)}</span>${countHtml}</a>`;
  }).join('');
  if(searching){
    const total = [...counts.values()].reduce((a,b)=>a+b,0);
    const allOn = searchNarrowSlug == null;
    nav.innerHTML = `<a href="#" data-search-all="1"${allOn?' class="active"':''}><span>All categories</span>${total>0?`<span class="market-sidebar-item-count">${total}</span>`:''}</a>` + nav.innerHTML;
  }
  setActiveStates(selectedSlug);
}

function wireProductRows(wrap){
  // Wire product lightbox (existing behavior, unchanged)
  wrap.querySelectorAll('.market-row').forEach(row=>{
    row.addEventListener('click', ()=>{
      const name = row.querySelector('.market-row-name')?.textContent || '';
      const desc = row.querySelector('.market-row-desc')?.textContent || '';
      const price = row.querySelector('.market-row-price')?.textContent || '';
      const badge = row.querySelector('.market-row-badge')?.textContent || '';
      const img = row.getAttribute('data-img') || '';
      if(window.openLightbox) window.openLightbox({src:img, title:name, desc, price, badge});
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
}

function renderSearchResults(){
  const wrap = document.querySelector('.menu-images-container');
  const status = document.getElementById('marketSearchStatus');
  if(!wrap) return;
  const q = searchQuery.trim();
  const dLabel = deptLabel(selectedDept);
  const deptList = deptProducts(selectedDept);
  const matches = searchProductsIn(searchQuery, deptList) || [];
  const narrowed = searchNarrowSlug
    ? allCategories.find(c => safeDisplay(c.slug) === searchNarrowSlug && normType(c.type) === normType(selectedDept))
    : null;
  const shownCats = narrowed
    ? [narrowed]
    : getDeptCategories(selectedDept).filter(c => matches.some(p => String(p.category_id) === String(c.id)));
  const shownMatches = narrowed
    ? matches.filter(p => String(p.category_id) === String(narrowed.id))
    : matches;
  const scope = narrowed ? safeDisplay(narrowed.name) : dLabel;
  if(status){
    const n = narrowed ? shownMatches.length : matches.length;
    status.textContent = `${n} ${n===1?'result':'results'} for “${q}” in ${scope}`;
    status.removeAttribute('hidden');
  }
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '0';
  if(!matches.length){
    wrap.innerHTML = `
      <div class="market-empty-state">
        <h2>No results for “${escapeHtml(q)}”</h2>
        <p>Nothing in ${escapeHtml(dLabel)} matches. Try the other department or a different spelling.</p>
        <p style="margin-top:14px"><button type="button" class="btn btn-secondary" data-clear-search style="min-height:44px">Clear search</button></p>
      </div>
    `;
    const btn = wrap.querySelector('[data-clear-search]');
    if(btn) btn.addEventListener('click', () => clearSearch(true));
    return;
  }
  if(narrowed && !shownMatches.length){
    const headerHtml = renderCategoryHeader(narrowed, 0);
    wrap.innerHTML = headerHtml.replace(
      `<div class="market-products" data-category="${escapeHtml(String(narrowed.id))}"></div>`,
      `<div class="market-products" data-category="${escapeHtml(String(narrowed.id))}"><p class="market-empty">No matches in this category.</p><p style="margin-top:12px"><button type="button" class="btn btn-secondary" data-show-all style="min-height:44px">Show all ${matches.length} ${matches.length===1?'result':'results'}</button></p></div>`
    );
    const all = wrap.querySelector('[data-show-all]');
    if(all) all.addEventListener('click', clearSearchNarrow);
    return;
  }
  wrap.innerHTML = shownCats.map(cat => {
    const list = matches.filter(p => String(p.category_id) === String(cat.id));
    if(!list.length) return '';
    const headerHtml = renderCategoryHeader(cat, list.length);
    return headerHtml.replace(
      `<div class="market-products" data-category="${escapeHtml(String(cat.id))}"></div>`,
      `<div class="market-products" data-category="${escapeHtml(String(cat.id))}">${getProductRowsHtml(list)}</div>`
    );
  }).join('');
  wireProductRows(wrap);
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
    renderDeptSwitcher();
    renderRail();
    renderSidebar();
    renderDrawer();
    return;
  }
  // Department → category → products. Never present one category as the whole catalog.
  ensureDeptSelection();
  if(isSearching()){
    renderSearchResults();
    renderDeptSwitcher();
    renderRail();
    renderSidebar();
    renderDrawer();
    return;
  }
  const filtered = getDeptCategories(selectedDept);
  if(!filtered.length){
    wrap.innerHTML = `
      <div class="market-empty-state">
        <h2>No ${escapeHtml(deptLabel(selectedDept))} categories</h2>
        <p>Try the other department.</p>
      </div>
    `;
    renderDeptSwitcher();
    renderRail();
    renderSidebar();
    renderDrawer();
    return;
  }
  const selectedCat = allCategories.find(c=> safeDisplay(c.slug)===selectedSlug) || filtered[0];
  const products = allProducts.filter(p=>String(p.category_id)===String(selectedCat.id));
  const headerHtml = renderCategoryHeader(selectedCat, products.length);
  const productsHtml = getProductRowsHtml(products);
  const html = headerHtml.replace(`<div class="market-products" data-category="${escapeHtml(String(selectedCat.id))}"></div>`, `<div class="market-products" data-category="${escapeHtml(String(selectedCat.id))}">${productsHtml}</div>`);
  wrap.innerHTML = html;
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '0';

  wireProductRows(wrap);

  renderDeptSwitcher();
  renderRail();
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
      const all = e.target.closest('a[data-search-all]');
      if(all){
        e.preventDefault();
        closeCategoriesDrawer();
        setTimeout(()=> clearSearchNarrow(), 120);
        return;
      }
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
      const all = e.target.closest('a[data-search-all]');
      if(all){
        e.preventDefault();
        clearSearchNarrow();
        return;
      }
      const link = e.target.closest('a[data-target]');
      if(!link) return;
      e.preventDefault();
      const targetId = link.getAttribute('data-target') || '';
      const slug = targetId.replace(/^cat-/, '');
      selectCategory(slug);
    });
  }
  const deptWrap = document.querySelector('.market-dept');
  if(deptWrap && !deptWrap.dataset.wired){
    deptWrap.dataset.wired='1';
    deptWrap.addEventListener('click', (e)=>{
      const btn = e.target.closest('.market-dept-btn');
      if(!btn) return;
      selectDept(btn.dataset.dept);
    });
  }
  const railList = document.getElementById('marketRailList');
  if(railList && !railList.dataset.wired){
    railList.dataset.wired='1';
    railList.addEventListener('click', (e)=>{
      const btn = e.target.closest('.market-rail-btn');
      if(!btn) return;
      if(btn.dataset.slug === ''){ clearSearchNarrow(); return; }
      if(!btn.dataset.slug) return;
      selectCategory(btn.dataset.slug);
    });
    // Arrow-key travel across the rail without leaving the control.
    railList.addEventListener('keydown', (e)=>{
      if(e.key!=='ArrowRight' && e.key!=='ArrowLeft') return;
      const btns = [...railList.querySelectorAll('.market-rail-btn')];
      const idx = btns.indexOf(document.activeElement);
      if(idx<0) return;
      e.preventDefault();
      const next = e.key==='ArrowRight' ? btns[idx+1] : btns[idx-1];
      if(next) next.focus();
    });
  }
  const searchInput = document.getElementById('marketSearch');
  const searchClear = document.getElementById('marketSearchClear');
  if(searchInput && !searchInput.dataset.wired){
    searchInput.dataset.wired='1';
    let deb = null;
    searchInput.addEventListener('input', ()=>{
      clearTimeout(deb);
      deb = setTimeout(()=> setSearchQuery(searchInput.value, { scroll: false }), 160);
    });
    searchInput.addEventListener('keydown', (e)=>{
      if(e.key==='Escape' && searchInput.value){
        e.stopPropagation();
        clearSearch(true);
      }
    });
  }
  if(searchClear && !searchClear.dataset.wired){
    searchClear.dataset.wired='1';
    searchClear.addEventListener('click', ()=> clearSearch(true));
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

  const supa = getPublicSupabase();
  // Fail visibly instead of spinning forever: without a timeout a stalled
  // request leaves the static "Loading market…" placeholder on screen.
  const withTimeout = (p, ms=15000) => Promise.race([p, new Promise((_, rej)=> setTimeout(()=> rej(new Error("Supabase request timed out")), ms))]);
  // Exactly one retry after 1.5s on transient failure; same query/client.
  const delay = (ms) => new Promise((res)=> setTimeout(res, ms));
  const fetchCatalog = () => Promise.all([
    withTimeout(supa.from('categories').select('id,name,slug,description,type,sort_order,is_active,background_image_url,background_image_path').eq('is_active',true).order('sort_order').order('name')),
    withTimeout(supa.from('products').select('id,name,slug,description,price,badge,sort_order,is_active,category_id,image_url,image_path').eq('is_active',true).order('sort_order').order('name'))
  ]);
  const loadCatalogWithRetry = async () => {
    try {
      return await fetchCatalog();
    } catch (firstErr) {
      await delay(1500);
      return await fetchCatalog();
    }
  };
  const applyCatalog = (cats, prods) => {
    allCategories = cats || [];
    allProducts = prods || [];
    rebuildSearchIndex();
    initSelectionFromHashOrDefault();
  };
  const initSelectionFromHashOrDefault = () => {
    // Deep link (e.g. #cat-mojito) wins; otherwise default to the Market department.
    const hash = (location.hash || '').replace(/^#/, '');
    const hashSlug = hash.startsWith('cat-') ? hash.replace(/^cat-/, '') : '';
    const hashCat = hashSlug && allCategories.find(c=> safeDisplay(c.slug)===hashSlug);
    if(hashCat){
      selectedDept = normType(hashCat.type);
      selectedSlug = safeDisplay(hashCat.slug);
      lastSelectedByDept[selectedDept]=selectedSlug;
      return;
    }
    if(!selectedDept) selectedDept='market';
    // Default department is Market (page title is The Market).
    if(!allCategories.some(c=> normType(c.type)===normType(selectedDept))){
      selectedDept = allCategories.length ? normType(allCategories[0].type) : 'market';
    } else if(!selectedSlug){
      selectedDept = 'market';
      if(!allCategories.some(c=> normType(c.type)==='market') && allCategories.length){
        selectedDept = normType(allCategories[0].type);
      }
    }
    ensureDeptSelection();
  };
  // Fresh cache → render instantly, revalidate in background with the same
  // timeout+retry stack; re-render only when data actually changed.
  try {
    const cached = readCatalogCache();
    if (cached && cached.fresh && cached.categories.length) {
      applyCatalog(cached.categories, cached.products);
      render();
      loadCatalogWithRetry().then(([catRes, prodRes]) => {
        if (catRes.error || prodRes.error) return;
        const freshCats = catRes.data || [];
        const freshProds = prodRes.data || [];
        if (isCatalogChanged({ categories: allCategories, products: allProducts }, { categories: freshCats, products: freshProds })) {
          applyCatalog(freshCats, freshProds);
          writeCatalogCache(freshCats, freshProds);
          render();
        }
      }).catch((e) => console.warn("[TPM market] background refresh failed", e));
      return;
    }
  } catch (_) { /* fall through to network path */ }

  wrap.innerHTML = `<div class="admin-loading market-loading"><span class="admin-spinner"></span> Loading market…</div>`;

  try{
    const [catRes, prodRes] = await loadCatalogWithRetry();
    if(catRes.error) throw catRes.error;
    if(prodRes.error) throw prodRes.error;
    allCategories = catRes.data||[];
    allProducts = prodRes.data||[];
    writeCatalogCache(allCategories, allProducts);
    rebuildSearchIndex();
    // Default to the Market department; deep link (#cat-xxx) wins.
    initSelectionFromHashOrDefault();
    render();
  }catch(err){
    const errInfo = err && typeof err === "object"
      ? `message=${err.message ?? "N/A"} details=${err.details ?? "N/A"} hint=${err.hint ?? "N/A"} code=${err.code ?? "N/A"}`
      : String(err);
    console.error("[TPM market] load FAILED", errInfo);
    console.warn('[TPM market] load failed', err);
    // Last resort: render expired-but-present cache instead of an error.
    const stale = readCatalogCache();
    if (stale && stale.categories.length) {
      applyCatalog(stale.categories, stale.products);
      render();
      return;
    }
    wrap.innerHTML = `<div class="market-empty-state"><h2>Market unavailable</h2><p>Please try again later.</p></div>`;
  }
}

// Expose for testing
window._marketLoadMenu = loadMarket;
window._marketSelectDept = selectDept;
window._marketSelectCategory = selectCategory;
window._marketSetSearch = (q) => setSearchQuery(q, { scroll: false });
window._marketClearSearch = () => clearSearch(false);
window._marketClearNarrow = () => clearSearchNarrow();
window._tpmSearch = { searchTokens, normSearchToken, expandSearchToken, productMatchesQuery, searchProductsIn };

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded", loadMarket);
} else {
  loadMarket();
}
