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
  // Idempotency guard — skip if already initialized
  if (window.heroAnimationsInitialized) return;
  window.heroAnimationsInitialized = true;

  console.log('[initHeroAnimations] START');

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = !window.matchMedia('(hover:hover)').matches;
  const isMobile = window.innerWidth < 768;

  // Register ScrollTrigger
  if (typeof gsap !== 'undefined' && gsap.plugins && gsap.plugins.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  // Elements
  const hero = $('.tpm-hero');
  console.log('[initHeroAnimations] hero:', hero ? 'found' : 'NOT FOUND');
  const heroVisual = $('.tpm-hero-visual');
  console.log('[initHeroAnimations] heroVisual:', heroVisual ? 'found' : 'NOT FOUND');
  const stage = $('#tpmCanStage');
  console.log('[initHeroAnimations] stage:', stage ? 'found' : 'NOT FOUND');
  const cans = {
    mango: $('.tpm-can--mango'),
    blue: $('.tpm-can--blue'),
    strawberry: $('.tpm-can--strawberry')
  };
  console.log('[initHeroAnimations] cans.mango:', cans.mango ? 'found' : 'NOT FOUND');
  console.log('[initHeroAnimations] cans.blue:', cans.blue ? 'found' : 'NOT FOUND');
  console.log('[initHeroAnimations] cans.strawberry:', cans.strawberry ? 'found' : 'NOT FOUND');
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

if (!hero || !stage || !cans.blue) {
  console.log('[initHeroAnimations] EARLY RETURN — missing elements');
  console.log('[initHeroAnimations] hero:',!!hero, 'stage:',!!stage, 'cans.blue:',!!cans.blue);
  return;
}

// Ensure the hero visual is visible for CSS fallback.
//
// Architecture (per design-system spec #12): CSS must render stage + cans
// visible and positioned correctly. JavaScript animates the existing visible
// state — it must NOT begin with the stage/cans hidden and "hopefully" make
// them visible later, which is the source of the fragile behavior you observed.
//
// The .reveal class on .tpm-hero-visual sets opacity:0 / transform:translateY(12px)
// in the non-reduced-motion stylesheet, which causes the initial hidden state.
// This block guarantees a visible CSS fallback so the animation enhances an
// already-visible element rather than pulling a hidden state into view.
heroVisual.style.opacity = '1';
heroVisual.style.visibility = 'visible';
heroVisual.style.transform = 'none';

// Set z-index depth hierarchy for the can composition.
// Blue is the visual anchor (z-index:3); side cans support (z-index:2).
// This creates intentional depth perception without CSS transform conflicts.
if (cans.blue) cans.blue.style.zIndex = '3';
if (cans.mango) cans.mango.style.zIndex = '2';
if (cans.strawberry) cans.strawberry.style.zIndex = '2';

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

  console.log('[initHeroAnimations] GSAP set cans initial state');

  // Cans start tightly grouped below the center, slightly lower than final position
  // so the entrance can play as: rise → center establishes → spread outward → rotate → settle
  gsap.set([cans.mango, cans.blue, cans.strawberry], {
    opacity: 1,  // CHANGED FROM 0 to 1 for diagnostic test
    y: isMobile ? 130 : 150,
    x: 0,
    scale: 1.5,
    rotation: (el) => {
      if (el === cans.mango) return -3;
      if (el === cans.strawberry) return 3;
      return 0;
    }
  });

  // Verify the GSAP state
  const mangoStyle = getComputedStyle(cans.mango);
  const blueStyle = getComputedStyle(cans.blue);
  const strawStyle = getComputedStyle(cans.strawberry);
  console.log('[initHeroAnimations] computed mango opacity:', mangoStyle.opacity, 'transform:', mangoStyle.transform);
  console.log('[initHeroAnimations] computed blue opacity:', blueStyle.opacity, 'transform:', blueStyle.transform);
  console.log('[initHeroAnimations] computed straw opacity:', strawStyle.opacity, 'transform:', strawStyle.transform);

  // Hero copy reveal
  entranceTL
    .to(kicker, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.00)
    .to(titleLines, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0.10)
    .to(desc, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.25)
    .to([ctaPrimary, ctaGhost], { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out' }, 0.35)
    .to(metaPills, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out' }, 0.45)
    .to(storeChip, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.55);

  // === 1. COMPACT RISE ===
  // All three cans rise together from the grouped position
  entranceTL.to([cans.mango, cans.blue, cans.strawberry], {
    y: isMobile ? 60 : 80,
    scale: 1.425,
    ease: 'power2.out'
  }, 0.00);

  // === 2. CENTER ESTABLISHES FIRST ===
  // Blue (center) rises to its final position, scales up
  entranceTL.to(cans.blue, {
    y: 0,
    scale: 1.5,
    rotation: 0,
    ease: 'power3.out'
  }, 0.20);

  // === 3. BOUQUET OPEN ===
  // Blue establishes itself first as the center anchor.
  // Mango and Strawberry gently move outward to frame Blue.
  // The movement is controlled — the cans stay close enough to read as one group.
  // (Blue's y/scale final state was set in Phase 2 above.)
  entranceTL.to(cans.mango, {
    x: isMobile ? -6 : -8,
    rotation: isMobile ? -6 : -8,
    scale: 1.38,
    ease: 'power3.out'
  }, 0.40);

  // Strawberry (right): moves gently right + rotates into final angle
  entranceTL.to(cans.strawberry, {
    x: isMobile ? 6 : 8,
    rotation: isMobile ? 6 : 8,
    scale: 1.38,
    ease: 'power3.out'
  }, 0.40);

  // === 4. GENTLE SETTLE ===
  // All cans settle into their final positioned state
  // Blue already at final y/scale/rotation from step 2;
  // Mango/strawberry now at their final x/rotation from step 3.
  // This last tweak ensures perfect alignment.
  entranceTL.to([cans.mango, cans.blue, cans.strawberry], {
    scale: 1.5,
    ease: 'power2.out'
  }, 0.80);

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
      rotation: isMobile ? -5 : -8,
      duration: 5.2
    }, 0.3);

    // Strawberry - different phase
    floatingTL.to(cans.strawberry, {
      y: isMobile ? -3 : -5,
      rotation: isMobile ? 5 : 8,
      duration: 4.8
    }, 0.6);
  }

  // ============================================================
  // 3. MOUSE PARALLAX (Desktop only)
  // ============================================================
  let moveStageX = null;
  let moveStageY = null;

  function startMouseParallax() {
    if (!hero || !stage) return;

    hero.addEventListener('mousemove', onMouseMove);
    hero.addEventListener('mouseleave', onMouseLeave);

    // Move the stage as one unit. Updating individual cans with relative
    // values on every animation frame made their offsets accumulate, which
    // eventually pulled the composition apart.
    moveStageX = gsap.quickTo(stage, 'x', { duration: 0.7, ease: 'power3.out' });
    moveStageY = gsap.quickTo(stage, 'y', { duration: 0.7, ease: 'power3.out' });
  }

  function onMouseMove(e) {
    const rect = stage.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2); // -1 to 1
    const dy = (e.clientY - cy) / (rect.height / 2);
    moveStageX?.(dx * 14);
    moveStageY?.(dy * 9);
  }

  function onMouseLeave() {
    moveStageX?.(0);
    moveStageY?.(0);
  }

  function stopMouseParallax() {
    hero?.removeEventListener('mousemove', onMouseMove);
    hero?.removeEventListener('mouseleave', onMouseLeave);
    gsap.killTweensOf(stage);
    gsap.set(stage, { x: 0, y: 0 });
    moveStageX = null;
    moveStageY = null;
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
           const scaleReduce = 1.5 * (1 - progress * 0.03);

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
       scale: 1.5,
       rotation: (el) => el === cans.mango ? -8 : el === cans.strawberry ? 8 : 0,
       clearProps: 'transform'
     });
       gsap.set([kicker, ...titleLines, desc, ctaPrimary, ctaGhost, ...metaPills, storeChip], {
         opacity: 1,
         y: 0,
         clearProps: 'transform'
       });
     } else {
       // Reduced motion re-enabled — re-apply final positioned state
       // without reloading the page. The entrance timeline and
       // floating/parallax will be re-created on the next page visit.
       gsap.set([cans.mango, cans.blue, cans.strawberry], {
         opacity: 1,
         y: 0,
         x: 0,
         scale: 1.5,
         rotation: (el) => el === cans.mango ? -8 : el === cans.strawberry ? 8 : 0,
         clearProps: 'transform'
       });
      gsap.set([kicker, ...titleLines, desc, ctaPrimary, ctaGhost, ...metaPills, storeChip], {
        opacity: 1,
        y: 0,
        clearProps: 'transform'
      });
    }
  });

  // ============================================================
  // 6. REDUCED MOTION FALLBACK (short, subtle animations)
  // ============================================================
  if (prefersReduced) {
    entranceTL.kill();

    // Reduced motion can animation: gentle rise + subtle spread + settle
    // Animate from initial GSAP-set positions to final CSS values over 600ms
    const reducedCanTL = gsap.timeline({
      defaults: { ease: 'power2.out' }
    });
    reducedCanTL.to([cans.mango, cans.blue, cans.strawberry], {
      y: 0,
      scale: 1.5,
      rotation: (el) => el === cans.mango ? -5 : el === cans.strawberry ? 5 : 0,
      duration: 0.6
    });

    // Reduced motion hero entrance: subtle fade + minimal movement
    // Animate from initial GSAP-set positions (opacity:0, y:30) to visible over 500ms
    const reducedHeroTL = gsap.timeline({
      defaults: { ease: 'power3.out' }
    });
    reducedHeroTL.to([kicker, ...titleLines, desc, ctaPrimary, ctaGhost, ...metaPills, storeChip], {
      opacity: 1,
      y: 0,
      duration: 0.5
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
