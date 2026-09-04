// site/js/public.js — Public Website Supabase Integration (Part 1: Categories & Products)
// Loads active categories/products via RLS (anon), respects market/cafe type, preserves design.

import { getPublicSupabase } from "./supabase.js";

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=900&q=80&auto=format&fit=crop",
];

function escapeHtml(s){
  return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function slugify(s){
  return String(s).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[\s_]+/g,"-").replace(/[^a-z0-9-]/g,"").replace(/-+/g,"-").replace(/^-|-$/g,"");
}

// Keep existing HTML structure, replace only data inside .tpm-preview-grid
async function loadAndRender(){
  const supa = getPublicSupabase();
  const grid = document.querySelector(".tpm-preview-grid");
  if(!grid) return;

  // Add filter UI for market/cafe if not exists (minimal, preserves design)
  const head = document.querySelector(".tpm-preview-head");
  if(head && !head.querySelector("#publicTypeFilter")){
    const filterWrap = document.createElement("div");
    filterWrap.style.cssText = "margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center";
    filterWrap.innerHTML = `
      <span style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">Filter:</span>
      <button data-filter="all" class="chip active" style="min-height:32px;padding:0 12px;font-size:11px">All</button>
      <button data-filter="market" class="chip" style="min-height:32px;padding:0 12px;font-size:11px">Market</button>
      <button data-filter="cafe" class="chip" style="min-height:32px;padding:0 12px;font-size:11px">Café</button>
    `;
    head.appendChild(filterWrap);
    filterWrap.querySelectorAll("button[data-filter]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        filterWrap.querySelectorAll("button").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
        renderFiltered(btn.dataset.filter);
      });
    });
  }

  let categories = [];
  let products = [];
  try{
    // Load active categories and active products via RLS (anon)
    const [catRes, prodRes] = await Promise.all([
      supa.from("categories").select("id,name,slug,description,type,sort_order,is_active,background_image_url,background_image_path").eq("is_active", true).order("sort_order").order("name"),
      supa.from("products").select("id,name,slug,description,price,badge,sort_order,is_active,category_id,image_url,image_path, categories!inner(type)").eq("is_active", true).order("sort_order").order("name")
        // Note: for products without category, the inner join would exclude them; use left join for products without category
        // So we do two queries: one for products with category, one without, or just do a single query without inner
    ]);
    // If the above products query with inner excludes uncategorized, fallback to left join
    if(catRes.error) throw catRes.error;
    categories = catRes.data || [];
    // For products, do a more permissive query without inner to include uncategorized
    const prodAll = await supa.from("products").select("id,name,slug,description,price,badge,sort_order,is_active,category_id,image_url,image_path").eq("is_active", true).order("sort_order").order("name");
    if(prodAll.error) throw prodAll.error;
    products = prodAll.data || [];
    // Also fetch category types for filtering products by market/cafe via category
    // Build map for quick lookup
    const catMap = new Map(categories.map(c=>[c.id, c]));
    // Filter products to only those whose category (if any) is active and of correct type? For public, we already filtered active products, but we should also ensure their category is active if they have one
    // For simplicity, keep all active products; filtering by type will use catMap
  }catch(err){
    console.warn("[TPM public] Supabase load failed, keeping hardcoded fallback", err);
    return; // keep hardcoded HTML, don't break
  }

  if(!categories.length){
    console.warn("[TPM public] No active categories, keeping fallback");
    return;
  }

  // Store for filtering
  window._tpmCategories = categories;
  window._tpmProducts = products;

  // Initial render with 'all'
  renderFiltered("all");

  function renderFiltered(typeFilter){
    const filteredCats = typeFilter==="all" ? categories : categories.filter(c=>c.type===typeFilter);
    // If no cats for filter, show empty state but keep grid
    if(!filteredCats.length){
      grid.innerHTML = `<div class="admin-empty" style="grid-column:1/-1;text-align:center;padding:32px;background:var(--surface);border:1px solid var(--line);border-radius:22px"><strong>No ${escapeHtml(typeFilter)} categories</strong><br><span style="font-size:12px;color:var(--muted)">Try All.</span></div>`;
      return;
    }
    // Show up to 4 categories (preserve 4-card layout); if more, show first 4
    const toShow = filteredCats.slice(0,4);
    // Group products by category for display
    const catMap = new Map(categories.map(c=>[c.id, c]));
    grid.innerHTML = toShow.map((cat, idx)=>{
      const cardClass = ["a","b","c","d"][idx] || "a";
      const kickerClass = cat.type==="cafe" ? "mint" : idx===2 ? "orange" : idx===3 ? "blue" : "";
      const productsForCat = products.filter(p=>p.category_id===cat.id).slice(0,2);
      const hasBg = cat.background_image_url || cat.background_image_path;
      const bgUrl = cat.background_image_url || cat.background_image_path || FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
      // Use product image if available and category has no bg? Prefer category bg, fallback to product image, then fallback
      let imgUrl = bgUrl;
      if(!hasBg && productsForCat.length && (productsForCat[0].image_url || productsForCat[0].image_path)){
        imgUrl = productsForCat[0].image_url || productsForCat[0].image_path;
      }
      // If still no valid URL (maybe relative path), use fallback
      if(!imgUrl || !imgUrl.startsWith("http")) imgUrl = FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];

      const productSnippet = productsForCat.length
        ? `<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">${productsForCat.map(p=>`<span style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(6px);padding:3px 7px;border-radius:999px;color:#fff">${escapeHtml(p.name)}${p.price!=null?` $${Number(p.price).toFixed(2)}`:""}</span>`).join("")}</div>`
        : "";

      // Preserve existing card structure and classes for animations
      return `
        <a class="tpm-card tpm-card--${cardClass} reveal ${idx===0?'in':''}" role="listitem" href="menu.html" aria-label="${escapeHtml(cat.name)} — View menu" style="transition-delay:${(0.04+idx*0.04).toFixed(2)}s">
          <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(cat.name)}" width="900" height="675" loading="${idx<2?'eager':'lazy'}" decoding="async" fetchpriority="${idx<2?'high':'low'}" onerror="this.src='${FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length]}'" />
          <div class="tpm-card-content">
            <span class="tpm-card-kicker ${kickerClass}">${escapeHtml(cat.type==="cafe"?"Café":"Market")} • ${escapeHtml(cat.name)}</span>
            <h3>${escapeHtml(cat.name)}</h3>
            <p>${escapeHtml(cat.description||"")}</p>
            ${productSnippet}
            <div class="tpm-card-meta"><span>View in menu →</span></div>
          </div>
        </a>
      `;
    }).join("");

    // Re-trigger reveal animation for new cards (preserve GSAP)
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      grid.querySelectorAll(".reveal").forEach(el=>el.classList.add("in"));
    } else if(typeof IntersectionObserver!=="undefined"){
      const obs=new IntersectionObserver(entries=>{
        entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("in"); obs.unobserve(e.target); }});
      }, {rootMargin:'0px 0px -8% 0px', threshold:0.05});
      grid.querySelectorAll(".reveal").forEach(el=>obs.observe(el));
    } else {
      grid.querySelectorAll(".reveal").forEach(el=>el.classList.add("in"));
    }

    // If products without category and filter is all, maybe show uncategorized count in console
    const uncatCount = products.filter(p=>!p.category_id).length;
    if(uncatCount && typeFilter==="all"){
      console.log(`[TPM public] ${uncatCount} uncategorized active products`);
    }
  }

  // Expose for testing
  window._tpmRenderFiltered = renderFiltered;
}

// --- Store Information Integration (Part 2) ---
async function loadStoreInfo(){
  const supa = getPublicSupabase();
  try{
    const { data, error } = await supa.from("store_info").select("*").eq("singleton_key", true).maybeSingle();
    if(error) throw error;
    if(!data) return;
    // Helper to update text if value exists
    const setText = (sel, val) => {
      if(val==null || val==="") return;
      const el=document.querySelector(sel);
      if(el) el.textContent=val;
    };
    const setHtml = (sel, val) => {
      if(val==null || val==="") return;
      const el=document.querySelector(sel);
      if(el) el.innerHTML=val;
    };
    // Name - header brand, hero kicker, footer, structured data
    if(data.name){
      setText(".brand-wordmark .long", data.name);
      setText(".brand-wordmark .short", data.name.split("—")[0]?.trim() || "TPM");
      // hero kicker contains name after dot
      const kicker=document.querySelector(".tpm-hero-kicker");
      if(kicker && data.name){
        // keep dot, replace text after
        kicker.innerHTML=`<span class="dot" aria-hidden="true"></span> ${escapeHtml(data.name)}`;
      }
      setText(".footer-brand", data.name.split("—")[0]?.trim() || data.name);
      // Visit card name
      const visitName=document.querySelector("#visit-heading");
      // keep Visit heading as is, but address card name is in visit-value
    }
    // Tagline - not directly displayed, but story kicker could be tagline
    if(data.tagline){
      const storyKicker=document.getElementById("story-heading");
      if(storyKicker){
        // story kicker is "A premium mart.<br/>A lifestyle stop." - keep fallback if tagline is different
        // Only replace if tagline is not empty and different
        // For now, keep existing unless tagline is more descriptive
      }
    }
    // Description - hero desc and story text
    if(data.description){
      setText(".tpm-hero-desc", data.description);
      const storyText=document.querySelector(".story-content .story-text");
      if(storyText) storyText.textContent=data.description;
      // structured data description
      const ldJson=document.querySelector('script[type="application/ld+json"]');
      if(ldJson){
        try{
          const ld=JSON.parse(ldJson.textContent);
          ld.description=data.description;
          ldJson.textContent=JSON.stringify(ld, null, 2);
        }catch(e){}
      }
    }
    // Address - visit card and footer and drawer
    const fullAddress = [data.address_line1, data.address_line2, data.city].filter(Boolean).join(", ") || null;
    const shortAddress = [data.address_line1, data.city].filter(Boolean).join(", ") || null;
    if(fullAddress){
      // Visit address
      const visitAddr=document.querySelector(".visit-card .visit-value");
      if(visitAddr){
        // First visit-value is address
        const addrEl=document.querySelectorAll(".visit-card .visit-value")[0];
        if(addrEl){
          const mapUrl=data.map_url || "https://maps.google.com/?q="+encodeURIComponent(fullAddress);
          addrEl.innerHTML=`${escapeHtml(data.name||"TPM — The Premium Mart")}<br/>${escapeHtml(fullAddress)}<br/><a href="${escapeHtml(mapUrl)}" target="_blank" rel="noopener">Get directions →</a>`;
        }
      }
      // Footer tagline second line
      const footerTagline=document.querySelector(".footer-tagline");
      if(footerTagline){
        const namePart=data.name||"TPM — The Premium Mart";
        footerTagline.innerHTML=`${escapeHtml(namePart)}<br/>${escapeHtml(fullAddress)}`;
      }
      // Drawer foot
      const drawerFoot=document.querySelector(".drawer-foot p");
      if(drawerFoot){
        const phoneDisplay=data.phone_display || data.phone || "+1 (555) 123-4567";
        drawerFoot.innerHTML=`<strong>${escapeHtml(data.name||"TPM — The Premium Mart")}</strong><br/>${escapeHtml(fullAddress)}<br/><a href="tel:${escapeHtml(data.phone||"+15551234567")}" style="color:var(--primary);font-weight:700">${escapeHtml(phoneDisplay)}</a>`;
      }
      // Structured data address
      const ldJson2=document.querySelector('script[type="application/ld+json"]');
      if(ldJson2){
        try{
          const ld=JSON.parse(ldJson2.textContent);
          if(ld.address){
            ld.address.streetAddress=data.address_line1||ld.address.streetAddress;
            ld.address.addressLocality=data.city||ld.address.addressLocality;
            ld.address.addressCountry=data.country||ld.address.addressCountry;
          }
          ldJson2.textContent=JSON.stringify(ld, null, 2);
        }catch(e){}
      }
    }
    // Phone
    if(data.phone){
      const phoneDisplay=data.phone_display || data.phone;
      document.querySelectorAll('a[href^="tel:"]').forEach(a=>{
        a.href=`tel:${data.phone}`;
        a.textContent=phoneDisplay;
      });
      const ldJson3=document.querySelector('script[type="application/ld+json"]');
      if(ldJson3){
        try{ const ld=JSON.parse(ldJson3.textContent); ld.telephone=data.phone; ldJson3.textContent=JSON.stringify(ld, null, 2); }catch(e){}
      }
    }
    // Email
    if(data.email){
      document.querySelectorAll('a[href^="mailto:"]').forEach(a=>{
        a.href=`mailto:${data.email}`;
        a.textContent=data.email;
      });
      const ldJson4=document.querySelector('script[type="application/ld+json"]');
      if(ldJson4){
        try{ const ld=JSON.parse(ldJson4.textContent); ld.email=data.email; ldJson4.textContent=JSON.stringify(ld, null, 2); }catch(e){}
      }
    }
    // Map URL - update Get directions and Open Maps
    if(data.map_url){
      document.querySelectorAll('a[href*="maps.google.com"]').forEach(a=>{
        a.href=data.map_url;
      });
    }
    // Opening hours - visit hours list and structured data
    if(data.opening_hours && typeof data.opening_hours==="object"){
      const hoursList=document.querySelector(".hours-list");
      if(hoursList){
        // Map opening_hours keys to display
        const oh=data.opening_hours;
        const mapping=[
          {key:"mon_fri", label:"Mon — Fri"},
          {key:"sat_sun", label:"Sat — Sun"},
          {key:"brunch", label:"Brunch"},
          {key:"mon", label:"Mon"},
          {key:"tue", label:"Tue"},
          {key:"wed", label:"Wed"},
          {key:"thu", label:"Thu"},
          {key:"fri", label:"Fri"},
          {key:"sat", label:"Sat"},
          {key:"sun", label:"Sun"},
        ];
        const rows=mapping.filter(m=>oh[m.key]).map(m=>`<li class="hours-row"><span class="hours-day">${escapeHtml(m.label)}</span><span class="hours-time">${escapeHtml(oh[m.key])}</span></li>`).join("");
        if(rows){
          hoursList.innerHTML=rows;
        } else {
          // Fallback: show all keys as is
          const fallback=Object.entries(oh).filter(([k,v])=>k!=="timezone" && typeof v==="string").map(([k,v])=>`<li class="hours-row"><span class="hours-day">${escapeHtml(k)}</span><span class="hours-time">${escapeHtml(v)}</span></li>`).join("");
          if(fallback) hoursList.innerHTML=fallback;
        }
      }
      const ldJson5=document.querySelector('script[type="application/ld+json"]');
      if(ldJson5){
        try{
          const ld=JSON.parse(ldJson5.textContent);
          // openingHoursSpecification is array, we can update if needed, but keep fallback
          ldJson5.textContent=JSON.stringify(ld, null, 2);
        }catch(e){}
      }
    }
    // Logo - if existing site displays a store logo (check for .brand-mark img or header logo)
    // Current site uses text "TPM" as brand-mark, not an image, so we preserve fallback
    // If logo_url exists and there's an img with logo, update it
    if(data.logo_url){
      const logoImg=document.querySelector('img[alt*="TPM logo"], img[src*="logo.jpg"]');
      if(logoImg && logoImg.src.includes("logo.jpg")){
        // Keep favicon as is, but if there's a visible logo, update
        // For now, don't change favicon, only visible logo if exists
      }
    }

    console.log("[TPM public] Store info loaded", data.name);
  }catch(err){
    console.warn("[TPM public] Store info load failed, keeping fallback", err);
  }
}

// --- Contact Information Integration (Part 3) ---
async function loadContactInfo(){
  const supa = getPublicSupabase();
  try{
    const { data, error } = await supa.from("contact_info").select("*").eq("singleton_key", true).maybeSingle();
    if(error) throw error;
    if(!data) return;
    // Phone
    if(data.phone){
      const phoneDisplay=data.phone_display || data.phone;
      document.querySelectorAll('a[href^="tel:"]').forEach(a=>{
        // Only update if contact phone is different from store phone? For now, contact takes precedence for contact section
        // Keep the first tel link as contact phone
        a.href=`tel:${data.phone}`;
        // Only update text if it's the contact section's phone (second visit-value)
        // The visit card has two tel links: one in visit-card and one in drawer and footer; we update all for consistency
        a.textContent=phoneDisplay;
      });
    } else if(data.phone_display){
      // If phone is null but display exists, still update text
      document.querySelectorAll('a[href^="tel:"]').forEach(a=>{
        a.textContent=data.phone_display;
      });
    }
    // Email
    if(data.email){
      document.querySelectorAll('a[href^="mailto:"]').forEach(a=>{
        a.href=`mailto:${data.email}`;
        a.textContent=data.email;
      });
    }
    // Address - use address_display if exists, else address
    const fullAddress = data.address_display || data.address || null;
    const shortAddress = data.address || null;
    if(fullAddress){
      // Update visit address (first visit-value)
      const addrEls=document.querySelectorAll(".visit-card .visit-value");
      if(addrEls.length){
        // First is address, second is contact
        const addrEl=addrEls[0];
        if(addrEl){
          const mapUrl=data.map_url || "https://maps.google.com/?q="+encodeURIComponent(fullAddress);
          // Try to preserve name if store_info already set it, else use TPM
          const nameEl=document.querySelector(".brand-wordmark .long");
          const name=nameEl?.innerText || "TPM — The Premium Mart";
          addrEl.innerHTML=`${escapeHtml(name)}<br/>${escapeHtml(fullAddress)}<br/><a href="${escapeHtml(mapUrl)}" target="_blank" rel="noopener">Get directions →</a>`;
        }
      }
      // Footer and drawer
      const footerTagline=document.querySelector(".footer-tagline");
      if(footerTagline && fullAddress){
        const namePart=document.querySelector(".brand-wordmark .long")?.innerText || "TPM — The Premium Mart";
        footerTagline.innerHTML=`${escapeHtml(namePart)}<br/>${escapeHtml(fullAddress)}`;
      }
      const drawerFoot=document.querySelector(".drawer-foot p");
      if(drawerFoot && fullAddress){
        const namePart=document.querySelector(".brand-wordmark .long")?.innerText || "TPM — The Premium Mart";
        const phoneDisplay=data.phone_display || data.phone || "+1 (555) 123-4567";
        const phone=data.phone || "+15551234567";
        drawerFoot.innerHTML=`<strong>${escapeHtml(namePart)}</strong><br/>${escapeHtml(fullAddress)}<br/><a href="tel:${escapeHtml(phone)}" style="color:var(--primary);font-weight:700">${escapeHtml(phoneDisplay)}</a>`;
      }
    } else if(shortAddress){
      // Fallback to short address
      const addrEls=document.querySelectorAll(".visit-card .visit-value");
      if(addrEls.length){
        const addrEl=addrEls[0];
        if(addrEl){
          const mapUrl=data.map_url || "https://maps.google.com/?q="+encodeURIComponent(shortAddress);
          const nameEl=document.querySelector(".brand-wordmark .long");
          const name=nameEl?.innerText || "TPM — The Premium Mart";
          addrEl.innerHTML=`${escapeHtml(name)}<br/>${escapeHtml(shortAddress)}<br/><a href="${escapeHtml(mapUrl)}" target="_blank" rel="noopener">Get directions →</a>`;
        }
      }
    }
    // Map URL
    if(data.map_url){
      document.querySelectorAll('a[href*="maps.google.com"]').forEach(a=>{
        a.href=data.map_url;
      });
      const mapFooter=document.querySelector(".map-footer a[href*='maps.google.com']");
      if(mapFooter) mapFooter.href=data.map_url;
    }
    // WhatsApp - if exists, add or update a whatsapp link in the contact section
    if(data.whatsapp){
      // Check if there's already a whatsapp link
      let whatsappLink=document.querySelector('a[href*="wa.me"], a[href*="whatsapp"]');
      const contactValueEl=document.querySelectorAll(".visit-card .visit-value")[1]; // second is contact (phone/email)
      if(!whatsappLink && contactValueEl){
        // Create a whatsapp link and append to contact section
        const isUrl=data.whatsapp.startsWith("http");
        const href=isUrl ? data.whatsapp : `https://wa.me/${data.whatsapp.replace(/[^0-9]/g,"")}`;
        const link=document.createElement("a");
        link.href=href;
        link.target="_blank";
        link.rel="noopener";
        link.textContent=data.whatsapp;
        link.style.display="block";
        link.style.marginTop="4px";
        link.style.color="var(--primary)";
        link.style.fontWeight="600";
        contactValueEl.appendChild(document.createElement("br"));
        contactValueEl.appendChild(link);
      } else if(whatsappLink){
        const isUrl=data.whatsapp.startsWith("http");
        whatsappLink.href=isUrl ? data.whatsapp : `https://wa.me/${data.whatsapp.replace(/[^0-9]/g,"")}`;
        whatsappLink.textContent=data.whatsapp;
      }
    }
    // Extra contacts - display in contact section if not empty
    if(data.extra_contacts && Array.isArray(data.extra_contacts) && data.extra_contacts.length){
      const contactValueEl=document.querySelectorAll(".visit-card .visit-value")[1];
      if(contactValueEl){
        // Check if already rendered extra
        if(!contactValueEl.querySelector(".extra-contacts")){
          const extraDiv=document.createElement("div");
          extraDiv.className="extra-contacts";
          extraDiv.style.marginTop="8px";
          extraDiv.style.fontSize="12px";
          extraDiv.innerHTML=data.extra_contacts.map(item=>{
            const label=escapeHtml(item.label||"Contact");
            const value=escapeHtml(item.value||"");
            const type=item.type||"";
            if(type==="email"){
              return `<div><strong>${label}:</strong> <a href="mailto:${value}" style="color:var(--primary)">${value}</a></div>`;
            } else if(value.startsWith("http")){
              return `<div><strong>${label}:</strong> <a href="${value}" target="_blank" rel="noopener" style="color:var(--primary)">${value}</a></div>`;
            } else {
              return `<div><strong>${label}:</strong> ${value}</div>`;
            }
          }).join("");
          contactValueEl.appendChild(extraDiv);
        }
      }
    }

    console.log("[TPM public] Contact info loaded", data.email || data.phone);
  }catch(err){
    console.warn("[TPM public] Contact info load failed, keeping fallback", err);
  }
}

// --- Social Links Integration (Part 4) ---
async function loadSocialLinks(){
  const supa = getPublicSupabase();
  try{
    const { data, error } = await supa.from("social_links").select("platform,url,handle,icon,sort_order,is_active").eq("is_active", true).order("sort_order").order("platform");
    if(error) throw error;
    if(!data || !data.length) return;
    // Map platform -> link data (lowercase)
    const map=new Map();
    data.forEach(row=>{
      const key=row.platform.trim().toLowerCase();
      if(!map.has(key)) map.set(key, row);
    });
    // Helper to update an existing anchor by platform
    const updateAnchor = (selector, platformKey) => {
      const row=map.get(platformKey);
      if(!row) return false;
      const el=document.querySelector(selector);
      if(!el) return false;
      // Preserve existing icons and structure, only update href and visible handle/text
      const newUrl=row.url;
      const handle=row.handle || row.platform;
      // Update href
      el.href=newUrl;
      // Update visible text only if it already contains platform/handle
      // For footer: "Instagram @tpm_thepremiummart" -> update to handle if exists
      if(el.textContent.includes("@") || el.textContent.toLowerCase().includes(platformKey)){
        // Keep "Instagram" prefix if present
        if(el.textContent.includes("Instagram")){
          el.innerHTML=`Instagram ${escapeHtml(handle)}`;
          // Preserve style
          el.style.color="rgba(255,255,255,.66)";
          el.style.textDecoration="underline";
          el.style.textUnderlineOffset="3px";
        } else {
          el.textContent=handle;
        }
      } else {
        // For contact button which just says "Instagram", keep as is but update href
        // Only update text if handle is more specific
        if(handle && handle!==platformKey){
          // Keep original text "Instagram" for button, don't change
        }
      }
      return true;
    };

    // Footer: render ALL active social links dynamically, preserving design
    // Existing HTML has one Instagram link plus Menu; we replace its innerHTML to show all active
    const footerSocialP=document.querySelector('footer p[style*="Instagram"]')?.parentElement || document.querySelector('footer p:last-of-type');
    // Find the <p> that contains Instagram and Menu
    const footerP=document.evaluate("//p[contains(.,'Instagram')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if(footerP && data.length){
      // Build links for all active, preserving Menu at end
      const linksHtml=data.map(r=>{
        const label=r.platform.charAt(0).toUpperCase()+r.platform.slice(1);
        const handle=r.handle ? ` ${escapeHtml(r.handle)}` : '';
        return `<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener" style="color:rgba(255,255,255,.66);text-decoration:underline;text-underline-offset:3px">${escapeHtml(label)}${handle?` ${escapeHtml(handle)}`:''}</a>`;
      }).join(' • ');
      // Keep Menu link at end
      footerP.innerHTML=`${linksHtml} • <a href="menu.html" style="color:rgba(255,255,255,.66)">Menu</a>`;
    } else if(footerInstagram){
      // Fallback: update single Instagram if footerP not found
      const insta=map.get("instagram");
      if(insta){
        footerInstagram.href=insta.url;
        const handle=insta.handle || "@tpm_thepremiummart";
        footerInstagram.textContent=`Instagram ${handle}`;
      }
    }

    // Contact form Instagram button - also handle multiple: if more than one active, keep first, but update href
    const contactInstagramBtn=document.querySelector('a.btn-secondary[href*="instagram.com"]');
    if(contactInstagramBtn){
      const insta=map.get("instagram");
      if(insta){
        contactInstagramBtn.href=insta.url;
      } else if(data.length){
        // If no instagram but other active, use first active
        contactInstagramBtn.href=data[0].url;
        contactInstagramBtn.textContent=data[0].platform.charAt(0).toUpperCase()+data[0].platform.slice(1);
      }
    }
    // For any other platform that already has an anchor, update it
    data.forEach(row=>{
      const platform=row.platform.toLowerCase();
      if(platform==="facebook"){
        const fb=document.querySelector('a[href*="facebook.com"]');
        if(fb) fb.href=row.url;
      }
      if(platform==="tiktok"){
        const tk=document.querySelector('a[href*="tiktok.com"]');
        if(tk) tk.href=row.url;
      }
    });

    // Hero social icons (replace static tags) — show only instagram/facebook/tiktok active
    const heroMeta=document.getElementById('heroSocialLinks');
    if(heroMeta){
      const allowed=new Set(['instagram','facebook','tiktok']);
      const heroLinks=data.filter(r=>allowed.has(r.platform.trim().toLowerCase()));
      if(heroLinks.length){
        // Icons - professional brand icons from Simple Icons (via CDN, no new npm dep)
        // Using Simple Icons paths (MIT) for accurate brand recognition, keep circular button design
        const icons={
          instagram:`<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M7.03.08c-1.277.06-2.149.26-2.911.563-.789.308-1.458.72-2.123 1.388-.665.668-1.075 1.337-1.38 2.127-.295.764-.496 1.637-.552 2.914-.056 1.278-.069 1.688-.063 4.947.006 3.259.021 3.667.083 4.947.061 1.277.264 2.148.563 2.911.308.789.72 1.457 1.388 2.123.668.666 1.337 1.074 2.129 1.38.763.295 1.636.496 2.913.552 1.277.056 1.688.069 4.946.063 3.258-.006 3.668-.021 4.948-.081 1.28-.061 2.147-.265 2.91-.563.789-.309 1.458-.72 2.123-1.388.665-.668 1.074-1.338 1.38-2.128.295-.763.496-1.636.552-2.912.056-1.281.069-1.69.063-4.948-.006-3.258-.021-3.667-.082-4.947-.061-1.28-.264-2.149-.563-2.912-.308-.789-.72-1.457-1.388-2.123C21.3 1.33 20.63.921 19.838.616 19.074.321 18.202.12 16.924.065 15.647.009 15.236-.005 11.977.001 8.718.008 8.31.022 7.03.084m.14 21.693c-1.17-.051-1.805-.245-2.229-.408-.561-.216-.96-.477-1.382-.895-.422-.418-.681-.819-.9-1.378-.164-.423-.362-1.058-.417-2.228-.06-1.265-.072-1.644-.079-4.848-.007-3.204.005-3.583.061-4.848.05-1.169.246-1.805.408-2.228.216-.561.476-.96.895-1.382.419-.422.818-.681 1.378-.9.423-.165 1.058-.361 2.227-.417 1.266-.06 1.645-.072 4.848-.079 3.203-.007 3.584.005 4.85.061 1.169.051 1.805.245 2.228.408.561.216.96.475 1.382.895.422.419.682.818.901 1.379.165.422.362 1.056.417 2.226.06 1.266.074 1.645.08 4.848.006 3.203-.006 3.583-.061 4.848-.051 1.17-.245 1.806-.408 2.229-.216.56-.476.96-.895 1.381-.419.422-.818.681-1.378.9-.422.165-1.058.362-2.226.417-1.266.06-1.645.072-4.849.079-3.205.007-3.583-.006-4.848-.061M16.953 5.586A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.442M5.84 12.012c.007 3.403 2.771 6.156 6.173 6.149 3.403-.006 6.157-2.77 6.151-6.173-.007-3.403-2.771-6.157-6.174-6.15-3.403.007-6.156 2.771-6.15 6.174M8 12.008a4 4 0 1 1 4.008 3.992A3.9996 3.9996 0 0 1 8 12.008z"/></svg>`,
          facebook:`<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg>`,
          tiktok:`<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
        };
        heroMeta.innerHTML=heroLinks.map(row=>{
          const key=row.platform.trim().toLowerCase();
          const icon=icons[key]||`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/></svg>`;
          const label=row.platform.charAt(0).toUpperCase()+row.platform.slice(1);
          return `<a href="${escapeHtml(row.url)}" target="_blank" rel="noopener" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" class="meta-pill" style="padding:0;width:38px;height:38px;display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:#fff;border:1px solid rgba(14,26,20,.08);box-shadow:0 4px 12px rgba(14,26,20,.04);color:var(--tpm-green);transition:transform .2s, box-shadow .2s">${icon}</a>`;
        }).join('');
        // Keep flex layout from .tpm-hero-meta
        heroMeta.style.display='flex';
        heroMeta.style.flexWrap='wrap';
        heroMeta.style.gap='10px';
      } else {
        heroMeta.innerHTML=`<span class="meta-pill" style="opacity:.6">No social links</span>`;
        heroMeta.style.display='none';
      }
    }

    // Update structured data sameAs
    const ldJson=document.querySelector('script[type="application/ld+json"]');
    if(ldJson){
      try{
        const ld=JSON.parse(ldJson.textContent);
        if(Array.isArray(ld.sameAs)){
          // Replace sameAs with active social links URLs
          const urls=data.map(r=>r.url).filter(Boolean);
          if(urls.length) ld.sameAs=urls;
          ldJson.textContent=JSON.stringify(ld, null, 2);
        }
      }catch(e){}
    }

    console.log("[TPM public] Social links loaded", data.map(r=>r.platform).join(", "));
  }catch(err){
    console.warn("[TPM public] Social links load failed, keeping fallback", err);
  }
}

// --- Showcase Video / Gallery Integration (Part 5) ---
// Replaces the 6-image gallery-grid with ONE showcase video from store_info
async function loadShowcaseVideo(){
  const supa = getPublicSupabase();
  const section = document.querySelector('section[aria-labelledby="gallery-heading"]');
  const grid = document.querySelector('.gallery-grid');
  if(!section || !grid) return;
  try{
    const { data, error } = await supa.from("store_info").select("showcase_video_path,showcase_video_url").eq("singleton_key", true).maybeSingle();
    if(error) throw error;
    if(!data || !data.showcase_video_url){
      // No video - keep fallback without broken UI
      // Show a subtle placeholder that matches design language
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px 20px;background:var(--surface);border:1px solid var(--line);border-radius:22px"><p style="font-family:'Space Grotesk',sans-serif;font-weight:700;color:var(--muted)">Showcase video coming soon</p><p style="font-size:13px;color:var(--muted)">Our space in motion — soon here as one 15-second loop.</p></div>`;
      grid.style.display="grid";
      console.log("[TPM public] No showcase video, fallback shown");
      return;
    }
    const url = data.showcase_video_url;
    const path = data.showcase_video_path || "showcase video";
    // Replace grid content with single video, keep section position and heading
    // Preserve responsive behavior and animations
    grid.innerHTML = `
      <div class="showcase-video-wrap" style="grid-column:1/-1;position:relative;border-radius:22px;overflow:hidden;background:#0e1a14;box-shadow:var(--shadow-soft);aspect-ratio:16/9;max-height:520px">
        <video src="${escapeHtml(url)}" controls autoplay muted loop playsinline preload="metadata" poster="" style="width:100%;height:100%;object-fit:cover;display:block;background:#0e1a14" aria-label="TPM showcase video — ${escapeHtml(path)}"></video>
        <div style="position:absolute;left:12px;bottom:12px;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);padding:8px 12px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--tpm-green);display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 14px rgba(0,0,0,.12)">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--c-mint);display:inline-block;box-shadow:0 0 0 6px rgba(0,196,138,.15)"></span> Showcase • 15s loop
        </div>
      </div>
    `;
    // Ensure grid is single column for video
    grid.style.display="grid";
    grid.style.gridTemplateColumns="1fr";
    grid.style.gap="16px";
    // Reveal animation
    const wrap = grid.querySelector('.showcase-video-wrap');
    if(wrap){
      wrap.classList.add('reveal');
      // Trigger reveal immediately or via observer
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        wrap.classList.add('in');
      } else {
        // Use same reveal logic as other sections
        const obs=new IntersectionObserver(entries=>{
          entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); obs.unobserve(e.target); }});
        }, {rootMargin:'0px 0px -8% 0px', threshold:0.05});
        obs.observe(wrap);
        // Fallback: add in after short delay if not observed
        setTimeout(()=> wrap.classList.add('in'), 600);
      }
    }
    console.log("[TPM public] Showcase video loaded", path);
  }catch(err){
    console.warn("[TPM public] Showcase video load failed, keeping fallback", err);
    // Keep fallback placeholder
    const grid2 = document.querySelector('.gallery-grid');
    if(grid2 && !grid2.querySelector('video')){
      grid2.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px 20px;background:var(--surface);border:1px solid var(--line);border-radius:22px"><p style="font-family:'Space Grotesk',sans-serif;font-weight:700;color:var(--muted)">Showcase video coming soon</p></div>`;
    }
  }
}

// Keep existing animations
function initPublicIntegration(){
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded", ()=>{
      loadAndRender();
      loadStoreInfo();
      loadContactInfo();
      loadSocialLinks();
      loadShowcaseVideo();
    });
  } else {
    loadAndRender();
    loadStoreInfo();
    loadContactInfo();
    loadSocialLinks();
    loadShowcaseVideo();
  }
  // Also reload on hash change if needed
  window.addEventListener("hashchange", ()=>{
    if(location.hash.includes("type=")){
      const params=new URLSearchParams(location.hash.split("?")[1]||"");
      const t=params.get("type");
      if(t && window._tpmRenderFiltered) window._tpmRenderFiltered(t);
    }
  });
}

initPublicIntegration();
