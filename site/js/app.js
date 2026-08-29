const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

// Drawer
const drawer = $('#drawer');
const backdrop = $('#drawerBackdrop');
const openBtn = $('#openDrawer');
const closeBtn = $('#closeDrawer');
function openDrawer(){
  if(!drawer) return;
  drawer.classList.add('open');
  backdrop.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
  backdrop.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
  closeBtn?.focus();
}
function closeDrawer(){
  if(!drawer) return;
  drawer.classList.remove('open');
  backdrop.classList.remove('open');
  drawer.setAttribute('aria-hidden','true');
  backdrop.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
  openBtn?.focus();
}
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;
$$('.drawer-nav a').forEach(a=>a.addEventListener('click', closeDrawer));
openBtn?.addEventListener('click', openDrawer);
closeBtn?.addEventListener('click', closeDrawer);
backdrop?.addEventListener('click', closeDrawer);
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){
    closeDrawer();
    closeLightbox();
    closeMenuLightbox();
    closeReserve();
  }
  if(menuLightbox?.classList.contains('open')){
    if(e.key==='ArrowLeft') showMenuPage(currentMenuIndex-1);
    if(e.key==='ArrowRight') showMenuPage(currentMenuIndex+1);
  }
});

// Active nav highlight based on page
const current = document.body.dataset.page || 'home';

// Lightbox for menu cards
const lightbox = $('#lightbox');
const lbImg = $('#lbImg');
const lbTitle = $('#lbTitle');
const lbDesc = $('#lbDesc');
const lbPrice = $('#lbPrice');
const lbBadge = $('#lbBadge');
function openLightbox({src, title, desc, price, badge}){
  if(!lightbox) return;
  lbImg.src = src;
  lbImg.alt = title;
  lbTitle.textContent = title;
  lbDesc.textContent = desc || '';
  lbPrice.textContent = price || '';
  lbPrice.style.display = price ? '' : 'none';
  lbBadge.textContent = badge || '';
  lbBadge.style.display = badge ? '' : 'none';
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
  $('#lbClose')?.focus();
}
function closeLightbox(){
  if(!lightbox) return;
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
}
$('#lbClose')?.addEventListener('click', closeLightbox);
$('#lbCloseSecondary')?.addEventListener('click', closeLightbox);
$('#lbOrder')?.addEventListener('click', (e)=>{
  e.preventDefault();
  closeLightbox();
  setTimeout(openReserve, 80);
});
lightbox?.addEventListener('click', e=>{
  if(e.target===lightbox) closeLightbox();
});
$$('[data-lightbox]').forEach(el=>{
  el.addEventListener('click', ()=>{
    const src = el.dataset.src || el.querySelector('img')?.src;
    openLightbox({
      src,
      title: el.dataset.title || 'Menu item',
      desc: el.dataset.desc || '',
      price: el.dataset.price || '',
      badge: el.dataset.badge || ''
    });
  });
  el.addEventListener('keydown', e=>{
    if(e.key==='Enter' || e.key===' '){
      e.preventDefault();
      el.click();
    }
  });
});

// Category filtering + smooth scroll on menu page
const chips = $$('.chip');
const sections = $$('.menu-section');
const sideLinks = $$('.menu-side a');
function setActiveChip(id){
  chips.forEach(c=>c.classList.toggle('active', c.dataset.target===id));
  sideLinks.forEach(a=>a.classList.toggle('active', a.getAttribute('href')==='#'+id));
}
chips.forEach(chip=>{
  chip.addEventListener('click', ()=>{
    const id = chip.dataset.target;
    const target = document.getElementById(id);
    if(target){
      target.scrollIntoView({behavior:'smooth', block:'start'});
      setActiveChip(id);
    }
  });
});
if(sections.length){
  const io = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        setActiveChip(entry.target.id);
      }
    });
  }, {rootMargin:'-45% 0px -45% 0px', threshold:0});
  sections.forEach(s=>io.observe(s));
}

// Image-based Menu — fullscreen viewer
const menuLightbox = $('#menuLightbox');
const menuLightboxImg = $('#menuLightboxImg');
const menuLightboxCounter = $('#menuLightboxCounter');
const menuLightboxBtns = $$('[data-menu-lightbox]');
const menuImages = menuLightboxBtns.map(b=>{
  const img = b.querySelector('img');
  return {src: img?.src || b.dataset.src, alt: img?.alt || 'Menu page'};
});
let currentMenuIndex = 0;
function showMenuPage(idx){
  if(!menuLightbox || !menuImages.length) return;
  if(idx < 0) idx = menuImages.length - 1;
  if(idx >= menuImages.length) idx = 0;
  currentMenuIndex = idx;
  const item = menuImages[idx];
  menuLightboxImg.src = item.src;
  menuLightboxImg.alt = item.alt;
  if(menuLightboxCounter) menuLightboxCounter.textContent = `Page ${idx+1} of ${menuImages.length}`;
}
function openMenuLightbox(idx){
  showMenuPage(idx);
  menuLightbox.classList.add('open');
  menuLightbox.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
}
function closeMenuLightbox(){
  if(!menuLightbox) return;
  menuLightbox.classList.remove('open');
  menuLightbox.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
}
menuLightboxBtns.forEach((btn,i)=>{
  btn.addEventListener('click', ()=> openMenuLightbox(i));
  btn.addEventListener('keydown', e=>{
    if(e.key==='Enter' || e.key===' '){ e.preventDefault(); openMenuLightbox(i); }
  });
});
$('#menuLightboxClose')?.addEventListener('click', closeMenuLightbox);
$('#menuLightboxPrev')?.addEventListener('click', ()=> showMenuPage(currentMenuIndex-1));
$('#menuLightboxNext')?.addEventListener('click', ()=> showMenuPage(currentMenuIndex+1));
menuLightbox?.addEventListener('click', e=>{
  if(e.target===menuLightbox || e.target.id==='menuLightboxStage') closeMenuLightbox();
});
let touchStartX = 0;
menuLightbox?.addEventListener('touchstart', e=>{ touchStartX = e.touches[0].clientX; }, {passive:true});
menuLightbox?.addEventListener('touchend', e=>{
  const dx = e.changedTouches[0].clientX - touchStartX;
  if(Math.abs(dx) > 50){
    if(dx > 0) showMenuPage(currentMenuIndex-1);
    else showMenuPage(currentMenuIndex+1);
  }
}, {passive:true});

// Reserve modal
const reserveModal = $('#reserveModal');
function openReserve(){
  if(lightbox?.classList.contains('open')) closeLightbox();
  if(menuLightbox?.classList.contains('open')) closeMenuLightbox();
  reserveModal?.classList.add('open');
  reserveModal?.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
}
function closeReserve(){
  if(!reserveModal) return;
  reserveModal.classList.remove('open');
  reserveModal.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
}
$$('[data-open-reserve]').forEach(b=>b.addEventListener('click', e=>{
  e.preventDefault();
  openReserve();
}));
$('#closeReserve')?.addEventListener('click', closeReserve);
$('#cancelReserve')?.addEventListener('click', closeReserve);
reserveModal?.addEventListener('click', e=>{ if(e.target===reserveModal) closeReserve(); });
$('#reserveForm')?.addEventListener('submit', e=>{
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const orig = btn.textContent;
  btn.textContent='Request sent ✓';
  btn.disabled=true;
  setTimeout(()=>{
    closeReserve();
    btn.textContent=orig;
    btn.disabled=false;
    e.target.reset();
    showToast('Reservation request received — we\'ll confirm shortly.');
  }, 900);
});

function showToast(msg){
  let t = $('#toast');
  if(!t){
    t=document.createElement('div');
    t.id='toast';
    t.setAttribute('role','status');
    t.style.cssText='position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);background:#1c1c18;color:#fcf9f3;padding:12px 18px;border-radius:999px;font-size:13px;font-weight:600;box-shadow:0 10px 24px rgba(0,0,0,.18);z-index:80;opacity:0;transition:opacity .25s, transform .25s;pointer-events:none';
    document.body.appendChild(t);
  }
  t.textContent=msg;
  requestAnimationFrame(()=>{
    t.style.opacity='1';
    t.style.transform='translateX(-50%) translateY(0)';
  });
  setTimeout(()=>{
    t.style.opacity='0';
    t.style.transform='translateX(-50%) translateY(6px)';
  }, 2800);
}

// ===================================================================
// PREMIUM GSAP HERO ANIMATIONS
// ===================================================================
(function initHeroAnimations() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = !window.matchMedia('(hover:hover)').matches;
  const isMobile = window.innerWidth < 768;

  // Register ScrollTrigger
  if (typeof gsap !== 'undefined' && gsap.plugins && gsap.plugins.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  // Elements
  const hero = $('.tpm-hero');
  const heroVisual = $('.tpm-hero-visual');
  const stage = $('#tpmCanStage');
  const cans = {
    mango: $('.tpm-can--mango'),
    blue: $('.tpm-can--blue'),
    strawberry: $('.tpm-can--strawberry')
  };
  const storeChip = $('.tpm-store-chip');
  const phoneMockup = null; // No phone in current hero

  // Hero copy elements
  const heroCopy = $('.tpm-hero-copy');
  const kicker = $('.tpm-hero-kicker');
  const titleLines = $$('.tpm-hero-title .line');
  const desc = $('.tpm-hero-desc');
  const ctaPrimary = $('.tpm-hero-actions .tpm-btn-primary');
  const ctaGhost = $('.tpm-hero-actions .tpm-btn-ghost');
  const metaPills = $$('.tpm-hero-meta .meta-pill');

  if (!hero || !stage || !cans.blue) return;

  // Helper: get final transform values from CSS
  const getFinalTransform = (el) => {
    const style = getComputedStyle(el);
    return style.transform;
  };

  // Store final positions for each can
  const finalPositions = {};
  Object.entries(cans).forEach(([key, el]) => {
    if (el) {
      finalPositions[key] = {
        transform: getComputedStyle(el).transform,
        opacity: 1
      };
    }
  });

  // ============================================================
  // 1. HERO ENTRANCE TIMELINE
  // ============================================================
  const entranceTL = gsap.timeline({
    defaults: { ease: 'power4.out' },
    onComplete: () => {
      // Mark as animated for any CSS fallbacks
      heroVisual.classList.add('animated');
      // Start floating animation after entrance
      if (!prefersReduced) startFloating();
      // Start mouse parallax after entrance
      if (!prefersReduced && !isTouch && !isMobile) startMouseParallax();
      // Start scroll-triggered motion
      if (!prefersReduced) initScrollMotion();
    }
  });

  // Set initial state for all animated elements
  gsap.set([kicker, ...titleLines, desc, ctaPrimary, ctaGhost, ...metaPills, storeChip], {
    opacity: 0,
    y: 30
  });

  // Cans start below viewport, grouped closer to center
  Object.entries(cans).forEach(([key, el]) => {
    if (!el) return;
    gsap.set(el, {
      opacity: 0,
      y: isMobile ? 120 : 160,
      scale: 0.92,
      rotation: key === 'mango' ? -2 : key === 'strawberry' ? 2 : 0
    });
  });

  // Hero copy reveal
  entranceTL
    .to(kicker, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.00)
    .to(titleLines, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0.10)
    .to(desc, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.25)
    .to([ctaPrimary, ctaGhost], { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out' }, 0.35)
    .to(metaPills, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out' }, 0.45)
    .to(storeChip, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.55);

  // Can entrance - staggered rise and separation
  // Blue Ocean (center, primary) - starts first
  entranceTL.to(cans.blue, {
    opacity: 1,
    y: 0,
    scale: 1,
    rotation: 0,
    duration: 1.1,
    ease: 'expo.out'
  }, 0.15);

  // Mango (left) - starts second, moves to left position
  entranceTL.to(cans.mango, {
    opacity: 1,
    y: 0,
    scale: 1,
    rotation: -7,
    duration: 1.1,
    ease: 'expo.out'
  }, 0.28);

  // Strawberry (right) - starts third, moves to right position
  entranceTL.to(cans.strawberry, {
    opacity: 1,
    y: 0,
    scale: 1,
    rotation: 7,
    duration: 1.1,
    ease: 'expo.out'
  }, 0.40);

  // Subtle separation movement (horizontal spread) - happens during rise
  // Mango moves slightly more left
  entranceTL.to(cans.mango, {
    x: isMobile ? -8 : -12,
    duration: 0.6,
    ease: 'power3.out'
  }, 0.35);

  // Strawberry moves slightly more right
  entranceTL.to(cans.strawberry, {
    x: isMobile ? 8 : 12,
    duration: 0.6,
    ease: 'power3.out'
  }, 0.45);

  // Blue stays centered (x: 0)
  entranceTL.to(cans.blue, {
    x: 0,
    duration: 0.6,
    ease: 'power3.out'
  }, 0.40);

  // Gentle settle - slight overshoot correction
  entranceTL.to([cans.mango, cans.blue, cans.strawberry], {
    scale: 1,
    duration: 0.3,
    ease: 'power2.out'
  }, 1.1);

  // ============================================================
  // 2. CONTINUOUS FLOATING ANIMATION
  // ============================================================
  let floatingTL = null;

  function startFloating() {
    if (floatingTL) floatingTL.kill();

    floatingTL = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });

    // Blue Ocean - slow vertical float
    floatingTL.to(cans.blue, {
      y: isMobile ? -4 : -6,
      duration: 4.5
    }, 0);

    // Mango - different phase, slightly different amount
    floatingTL.to(cans.mango, {
      y: isMobile ? -3 : -5,
      rotation: -6.5,
      duration: 5.2
    }, 0.3);

    // Strawberry - different phase
    floatingTL.to(cans.strawberry, {
      y: isMobile ? -3 : -5,
      rotation: 6.5,
      duration: 4.8
    }, 0.6);
  }

  // ============================================================
  // 3. MOUSE PARALLAX (Desktop only)
  // ============================================================
  let parallaxRaf = null;
  let lastMouse = { x: 0, y: 0 };
  let currentParallax = { x: 0, y: 0 };

  function startMouseParallax() {
    if (!hero || !stage) return;

    hero.addEventListener('mousemove', onMouseMove);
    hero.addEventListener('mouseleave', onMouseLeave);

    // Smooth parallax loop
    function animateParallax() {
      // Smooth interpolation
      currentParallax.x += (lastMouse.x - currentParallax.x) * 0.08;
      currentParallax.y += (lastMouse.y - currentParallax.y) * 0.08;

      // Apply to cans with depth-based multipliers
      if (cans.mango) {
        gsap.set(cans.mango, {
          x: '+=' + (currentParallax.x * 0.4),
          y: ' += ' + (currentParallax.y * 0.25)
        });
      }
      if (cans.blue) {
        gsap.set(cans.blue, {
          x: ' += ' + (currentParallax.x * 0.7),
          y: ' += ' + (currentParallax.y * 0.4)
        });
      }
      if (cans.strawberry) {
        gsap.set(cans.strawberry, {
          x: ' += ' + (currentParallax.x * 0.4),
          y: ' += ' + (currentParallax.y * 0.25)
        });
      }

      parallaxRaf = requestAnimationFrame(animateParallax);
    }
    animateParallax();
  }

  function onMouseMove(e) {
    const rect = stage.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2); // -1 to 1
    const dy = (e.clientY - cy) / (rect.height / 2);
    lastMouse.x = dx * 15;
    lastMouse.y = dy * 10;
  }

  function onMouseLeave() {
    lastMouse.x = 0;
    lastMouse.y = 0;
  }

  function stopMouseParallax() {
    hero?.removeEventListener('mousemove', onMouseMove);
    hero?.removeEventListener('mouseleave', onMouseLeave);
    if (parallaxRaf) {
      cancelAnimationFrame(parallaxRaf);
      parallaxRaf = null;
    }
    // Smoothly return to center
    gsap.to([cans.mango, cans.blue, cans.strawberry], {
      x: (i, target) => {
        if (target.classList.contains('tpm-can--mango')) return isMobile ? -8 : -12;
        if (target.classList.contains('tpm-can--strawberry')) return isMobile ? 8 : 12;
        return 0;
      },
      duration: 0.8,
      ease: 'power3.out'
    });
  }

  // ============================================================
  // 4. SCROLL-TRIGGERED HERO MOTION
  // ============================================================
  function initScrollMotion() {
    if (typeof ScrollTrigger === 'undefined') return;

    const heroHeight = hero.offsetHeight;

    // Subtle upward movement and scale reduction as user scrolls
    ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: `+=${heroHeight}`,
      scrub: 1.2,
      onUpdate: (self) => {
        const progress = self.progress;
        if (progress > 0 && progress < 1) {
          // Cans move up slightly and scale down
          const yOffset = -progress * (isMobile ? 30 : 50);
          const scaleReduce = 1 - progress * 0.03;

          gsap.set([cans.mango, cans.blue, cans.strawberry], {
            y: yOffset,
            scale: scaleReduce,
            overwrite: 'auto'
          });

          // Hero visual area subtle shift
          if (heroVisual) {
            gsap.set(heroVisual, {
              y: -progress * (isMobile ? 20 : 30),
              overwrite: 'auto'
            });
          }

          // Store chip fades out
          if (storeChip) {
            gsap.set(storeChip, {
              opacity: 1 - progress * 2,
              overwrite: 'auto'
            });
          }
        }
      }
    });

    // Refresh on resize
    window.addEventListener('resize', () => {
      ScrollTrigger.refresh();
    }, { passive: true });
  }

  // ============================================================
  // 5. CLEANUP ON RESIZE / REDUCED MOTION CHANGE
  // ============================================================
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const newIsMobile = window.innerWidth < 768;
      const newIsTouch = !window.matchMedia('(hover:hover)').matches;

      if (newIsMobile !== isMobile || newIsTouch !== isTouch) {
        // Reinitialize animations for new breakpoint
        location.reload(); // Simple approach for breakpoint change
      }

      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    }, 250);
  }, { passive: true });

  // Listen for reduced motion changes
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  motionQuery.addEventListener('change', (e) => {
    if (e.matches) {
      // Disable all motion
      entranceTL?.kill();
      floatingTL?.kill();
      stopMouseParallax();
      ScrollTrigger.getAll().forEach(st => st.kill());
      gsap.set([cans.mango, cans.blue, cans.strawberry], {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        rotation: (i, el) => {
          if (el.classList.contains('tpm-can--mango')) return -7;
          if (el.classList.contains('tpm-can--strawberry')) return 7;
          return 0;
        },
        clearProps: 'transform'
      });
      gsap.set([kicker, ...titleLines, desc, ctaPrimary, ctaGhost, ...metaPills, storeChip], {
        opacity: 1,
        y: 0,
        clearProps: 'transform'
      });
    } else {
      // Reload to re-enable animations
      location.reload();
    }
  });

  // ============================================================
  // 6. REDUCED MOTION FALLBACK (immediate)
  // ============================================================
  if (prefersReduced) {
    entranceTL.kill();
    gsap.set([cans.mango, cans.blue, cans.strawberry], {
      opacity: 1,
      y: 0,
      scale: 1,
      rotation: (i, el) => {
        if (el.classList.contains('tpm-can--mango')) return -7;
        if (el.classList.contains('tpm-can--strawberry')) return 7;
        return 0;
      }
    });
    gsap.set([kicker, ...titleLines, desc, ctaPrimary, ctaGhost, ...metaPills, storeChip], {
      opacity: 1,
      y: 0
    });
    return; // Exit early, no floating/parallax/scroll motion
  }

})();

// Contact form (visit)
$('#contactForm')?.addEventListener('submit', e=>{
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent='Message sent ✓';
  btn.disabled=true;
  setTimeout(()=>{
    btn.textContent='Send message';
    btn.disabled=false;
    e.target.reset();
    showToast('Thanks — we\'ll reply within a few hours.');
  }, 1200);
});

// Reveal animation initialization — adds .in class when elements enter viewport
(function initRevealAnimations() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return; // CSS already handles: .reveal {opacity:1;transform:none}

  const reveals = $$('.reveal');
  if (reveals.length === 0) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
      }
    });
  }); // rootMargin+threshold default: triggers when 1+ px visible

  reveals.forEach(el => observer.observe(el));
})();