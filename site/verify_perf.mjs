import puppeteer from "puppeteer-core";
const exe = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox","--disable-gpu"] });

const testMobile = async () => {
  const page = await browser.newPage();
  const errors = [];
  const consoleLogs = [];
  page.on('console', msg => { if(msg.type()==='error') errors.push(msg.text()); else consoleLogs.push(msg.text()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({width:390, height:844, deviceScaleFactor:1});
  await page.goto("http://127.0.0.1:5174/index.html?v="+Date.now(), {waitUntil:"networkidle0", timeout:15000});
  // Wait for hero animations to start (idle callback 800ms)
  await new Promise(r=>setTimeout(r, 1200));
  const result = await page.evaluate(async ()=>{
    const checks = {};
    // Images
    const imgs = [...document.querySelectorAll('img')];
    checks.totalImages = imgs.length;
    checks.lazyImages = imgs.filter(i=>i.loading==='lazy').length;
    checks.eagerImages = imgs.filter(i=>i.loading==='eager').length;
    checks.asyncDecoding = imgs.filter(i=>i.decoding==='async').length;
    checks.withSrcset = imgs.filter(i=>i.srcset).length;
    checks.broken = imgs.filter(i=>!i.complete || i.naturalWidth===0).map(i=>i.src.slice(0,80));
    // Check hero cans visible
    const cans = {
      mango: document.querySelector('.tpm-can--mango'),
      blue: document.querySelector('.tpm-can--blue'),
      strawberry: document.querySelector('.tpm-can--strawberry')
    };
    checks.cansVisible = {
      mango: cans.mango ? getComputedStyle(cans.mango).opacity : 'missing',
      blue: cans.blue ? getComputedStyle(cans.blue).opacity : 'missing',
      strawberry: cans.strawberry ? getComputedStyle(cans.strawberry).opacity : 'missing'
    };
    checks.cansTransform = {
      mango: cans.mango ? getComputedStyle(cans.mango).transform : 'missing',
    };
    // Check layout overflow
    checks.scrollWidth = document.documentElement.scrollWidth;
    checks.innerWidth = window.innerWidth;
    checks.overflow = document.documentElement.scrollWidth > window.innerWidth ? 'OVERFLOW' : 'ok';
    checks.bodyOverflow = getComputedStyle(document.body).overflowX;
    // Check animations
    const reveals = [...document.querySelectorAll('.reveal')];
    checks.revealCount = reveals.length;
    // Trigger one reveal by scrolling
    window.scrollTo(0, 800);
    await new Promise(r=>setTimeout(r, 400));
    checks.revealInAfterScroll = document.querySelectorAll('.reveal.in').length;
    // Check nav
    const drawer = document.getElementById('drawer');
    const openBtn = document.getElementById('openDrawer');
    checks.drawerExists = !!drawer;
    checks.openBtnExists = !!openBtn;
    // Check buttons
    const cta = document.querySelector('.tpm-preview-cta .btn');
    checks.ctaExists = !!cta;
    checks.ctaText = cta ? cta.innerText : 'missing';
    checks.ctaRect = cta ? cta.getBoundingClientRect().width : 0;
    // Check gallery
    const galleryGrid = document.querySelector('.gallery-grid');
    const galleryItems = document.querySelectorAll('.gallery-item');
    checks.galleryGridCols = getComputedStyle(galleryGrid).gridTemplateColumns;
    checks.galleryItemCount = galleryItems.length;
    checks.galleryItemHeights = [...galleryItems].slice(0,2).map(e=>Math.round(e.getBoundingClientRect().height));
    // Check preview grid
    const previewGrid = document.querySelector('.tpm-preview-grid');
    checks.previewGridCols = getComputedStyle(previewGrid).gridTemplateColumns;
    // Check hero
    const hero = document.querySelector('.tpm-hero');
    checks.heroExists = !!hero;
    checks.heroHeight = hero ? Math.round(hero.getBoundingClientRect().height) : 0;
    // Check content-visibility
    const preview = document.querySelector('.tpm-preview');
    checks.previewContentVisibility = getComputedStyle(preview).contentVisibility;
    return checks;
  });
  console.log("=== MOBILE 390 ===");
  console.log(JSON.stringify(result, null, 2));
  console.log("Console errors:", errors.length ? errors : "none");
  // Test drawer interaction
  await page.click('#openDrawer');
  await new Promise(r=>setTimeout(r, 300));
  const drawerOpen = await page.evaluate(()=> document.getElementById('drawer').classList.contains('open'));
  console.log("Drawer open after click:", drawerOpen);
  await page.click('#closeDrawer');
  await new Promise(r=>setTimeout(r, 300));
  const drawerClosed = await page.evaluate(()=> !document.getElementById('drawer').classList.contains('open'));
  console.log("Drawer closed after click:", drawerClosed);
  await page.close();
  return {result, errors};
};

const testDesktop = async () => {
  const page = await browser.newPage();
  await page.setViewport({width:1280, height:800});
  await page.goto("http://127.0.0.1:5174/index.html?v="+Date.now(), {waitUntil:"networkidle0"});
  await new Promise(r=>setTimeout(r, 1200));
  const result = await page.evaluate(()=>{
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      overflow: document.documentElement.scrollWidth > window.innerWidth ? 'OVERFLOW' : 'ok',
      previewCols: getComputedStyle(document.querySelector('.tpm-preview-grid')).gridTemplateColumns,
      galleryCols: getComputedStyle(document.querySelector('.gallery-grid')).gridTemplateColumns,
      heroHeight: Math.round(document.querySelector('.tpm-hero').getBoundingClientRect().height),
      cansVisible: getComputedStyle(document.querySelector('.tpm-can--blue')).opacity
    };
  });
  console.log("=== DESKTOP 1280 ===");
  console.log(JSON.stringify(result, null, 2));
  await page.close();
};

await testMobile();
await testDesktop();
await browser.close();
