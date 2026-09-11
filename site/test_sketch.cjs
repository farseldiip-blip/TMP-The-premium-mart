const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 900 });
  await page.goto('http://127.0.0.1:5173/index.html', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 4500));

  const testCss = `
    .tpm-hero-visual {
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: center !important;
      padding: 20px 0 35px !important;
      min-height: 540px !important;
    }
    .tpm-can-stage {
      position: relative !important;
      top: auto !important;
      transform: none !important;
      width: 100% !important;
      max-width: 560px !important;
      height: 400px !important;
      margin: 0 auto !important;
      display: block !important;
    }
    .tpm-can-stage::after {
      content: "" !important;
      position: absolute !important;
      left: 50% !important;
      bottom: 42px !important;
      transform: translateX(-50%) !important;
      width: 86% !important;
      height: 26px !important;
      background: radial-gradient(ellipse at center, rgba(14,26,20,.18) 0%, rgba(14,26,20,.08) 45%, transparent 72%) !important;
      filter: blur(12px) !important;
      z-index: 0 !important;
      opacity: 0.85 !important;
      pointer-events: none !important;
    }
    .tpm-store-chip {
      position: absolute !important;
      bottom: 2px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      z-index: 10 !important;
    }
    .tpm-can {
      position: absolute !important;
      padding: 0 !important;
      display: block !important;
      transform-origin: center center !important;
    }
    /* 1. MIXED FRUITS — LEFT/BACK */
    .tpm-can--mango {
      left: 12% !important;
      bottom: 125px !important;
      width: 140px !important;
      height: 231px !important;
      z-index: 1 !important;
      transform: rotate(-3deg) !important;
    }
    /* 2. STRAWBERRY — CENTER/MAIN VERTICAL ANCHOR */
    .tpm-can--strawberry {
      left: 27% !important;
      bottom: 92px !important;
      width: 270px !important;
      height: 270px !important;
      margin: 0 !important;
      z-index: 2 !important;
      transform: rotate(0deg) !important;
      filter: drop-shadow(0 18px 28px rgba(14,26,20,.16)) drop-shadow(0 6px 12px rgba(14,26,20,.09)) !important;
    }
    /* 3. BLUEBERRY — LOWER-LEFT FOREGROUND */
    .tpm-can--blue {
      left: 4% !important;
      bottom: 48px !important;
      width: 220px !important;
      height: 165px !important;
      margin: 0 !important;
      z-index: 3 !important;
      transform: rotate(-10deg) !important;
    }
    /* 4. BEEF — LOWER-RIGHT FOREGROUND */
    .tpm-can--beef {
      right: 4% !important;
      bottom: 48px !important;
      width: 220px !important;
      height: 165px !important;
      margin: 0 !important;
      z-index: 4 !important;
      transform: rotate(10deg) !important;
    }
  `;

  await page.evaluate((css) => {
    const style = document.createElement('style');
    style.id = 'sketch-test-css';
    style.textContent = css;
    document.head.appendChild(style);

    // Cancel GSAP on cans to test pure layout
    if (window.gsap) {
      const mango = document.querySelector('.tpm-can--mango');
      const straw = document.querySelector('.tpm-can--strawberry');
      const blue = document.querySelector('.tpm-can--blue');
      const beef = document.querySelector('.tpm-can--beef');
      gsap.killTweensOf([mango, straw, blue, beef]);
      gsap.set(mango, { clearProps: 'transform', x: 0, y: 0 });
      gsap.set(straw, { clearProps: 'transform', x: 0, y: 0 });
      gsap.set(blue, { clearProps: 'transform', x: 0, y: 0 });
      gsap.set(beef, { clearProps: 'transform', x: 0, y: 0 });
    }
  }, testCss);

  await new Promise(r => setTimeout(r, 600));

  const heroEl = await page.$('.tpm-hero');
  await heroEl.screenshot({ path: 'sketch_test_1024.png' });

  const metrics = await page.evaluate(() => {
    const cans = {};
    ['mango', 'strawberry', 'blue', 'beef'].forEach(k => {
      const el = document.querySelector('.tpm-can--' + k);
      const r = el.getBoundingClientRect();
      cans[k] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom), r: Math.round(r.right) };
    });
    const chip = document.querySelector('.tpm-store-chip').getBoundingClientRect();
    const stage = document.getElementById('tpmCanStage').getBoundingClientRect();
    return { stage: { x: Math.round(stage.x), y: Math.round(stage.y), w: Math.round(stage.width), h: Math.round(stage.height) }, chip: { y: Math.round(chip.y), b: Math.round(chip.bottom) }, cans };
  });

  console.log(JSON.stringify(metrics, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
