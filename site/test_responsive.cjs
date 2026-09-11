const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const viewports = [320, 375, 390, 414, 480, 768, 1024, 1280, 1440];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1'],
  });

  const testCss = `
    .tpm-hero-visual {
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: center !important;
      padding: 16px 0 24px !important;
      min-height: 480px !important;
    }
    @media(max-width: 767px) {
      .tpm-hero-visual {
        min-height: 310px !important;
        padding: 10px 0 20px !important;
      }
    }
    .tpm-can-stage {
      position: relative !important;
      top: auto !important;
      transform: none !important;
      width: 100% !important;
      max-width: 540px !important;
      aspect-ratio: 540 / 390 !important;
      height: auto !important;
      margin: 0 auto !important;
      display: block !important;
    }
    @media(max-width: 767px) {
      .tpm-can-stage {
        max-width: 350px !important;
      }
    }
    @media(max-width: 360px) {
      .tpm-can-stage {
        max-width: 300px !important;
      }
    }
    .tpm-can-stage::after {
      content: "" !important;
      position: absolute !important;
      left: 50% !important;
      bottom: 10% !important;
      transform: translateX(-50%) !important;
      width: 86% !important;
      height: 7% !important;
      background: radial-gradient(ellipse at center, rgba(14,26,20,.18) 0%, rgba(14,26,20,.08) 45%, transparent 72%) !important;
      filter: blur(12px) !important;
      z-index: 0 !important;
      opacity: 0.85 !important;
      pointer-events: none !important;
    }
    .tpm-store-chip {
      position: absolute !important;
      bottom: 0 !important;
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
      bottom: 31% !important;
      width: 26% !important;
      aspect-ratio: 976 / 1612 !important;
      height: auto !important;
      z-index: 1 !important;
      transform: rotate(-3deg) !important;
    }
    /* 2. STRAWBERRY — CENTER/MAIN VERTICAL ANCHOR */
    .tpm-can--strawberry {
      left: 26% !important;
      bottom: 23% !important;
      width: 50% !important;
      aspect-ratio: 1 / 1 !important;
      height: auto !important;
      margin: 0 !important;
      z-index: 2 !important;
      transform: rotate(0deg) !important;
      filter: drop-shadow(0 18px 28px rgba(14,26,20,.16)) drop-shadow(0 6px 12px rgba(14,26,20,.09)) !important;
    }
    /* 3. BLUEBERRY — LOWER-LEFT FOREGROUND */
    .tpm-can--blue {
      left: 4% !important;
      bottom: 12% !important;
      width: 41% !important;
      aspect-ratio: 1448 / 1086 !important;
      height: auto !important;
      margin: 0 !important;
      z-index: 3 !important;
      transform: rotate(-10deg) !important;
    }
    /* 4. BEEF — LOWER-RIGHT FOREGROUND */
    .tpm-can--beef {
      right: 4% !important;
      bottom: 12% !important;
      width: 41% !important;
      aspect-ratio: 1448 / 1086 !important;
      height: auto !important;
      margin: 0 !important;
      z-index: 4 !important;
      transform: rotate(10deg) !important;
    }
  `;

  for (const w of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: 900 });
    await page.goto('http://127.0.0.1:5173/index.html', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 4500));

    await page.evaluate((css) => {
      const style = document.createElement('style');
      style.id = 'responsive-test-css';
      style.textContent = css;
      document.head.appendChild(style);

      if (window.gsap) {
        const mango = document.querySelector('.tpm-can--mango');
        const straw = document.querySelector('.tpm-can--strawberry');
        const blue = document.querySelector('.tpm-can--blue');
        const beef = document.querySelector('.tpm-can--beef');
        gsap.killTweensOf([mango, straw, blue, beef]);
        gsap.set([mango, straw, blue, beef], { clearProps: 'transform', x: 0, y: 0 });
      }
    }, testCss);

    await new Promise(r => setTimeout(r, 400));

    const metrics = await page.evaluate((vpW) => {
      const cans = {};
      ['mango', 'strawberry', 'blue', 'beef'].forEach(k => {
        const el = document.querySelector('.tpm-can--' + k);
        const r = el.getBoundingClientRect();
        cans[k] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom), r: Math.round(r.right) };
      });
      const chip = document.querySelector('.tpm-store-chip').getBoundingClientRect();
      const stage = document.getElementById('tpmCanStage').getBoundingClientRect();
      const scrollW = document.documentElement.scrollWidth;

      return {
        vpW,
        scrollW,
        overflow: scrollW > vpW,
        stage: { x: Math.round(stage.x), y: Math.round(stage.y), w: Math.round(stage.width), h: Math.round(stage.height) },
        chip: { y: Math.round(chip.y), b: Math.round(chip.bottom) },
        cans,
        baselineDiff: Math.abs(cans.blue.b - cans.beef.b),
        chipClearance: Math.round(chip.y) - Math.max(cans.blue.b, cans.beef.b)
      };
    }, w);

    console.log(`[${w}px] overflow=${metrics.overflow} blue_b=${metrics.cans.blue.b} beef_b=${metrics.cans.beef.b} baseDiff=${metrics.baselineDiff} chipClearance=${metrics.chipClearance} mango_x=${metrics.cans.mango.x} beef_r=${metrics.cans.beef.r}`);

    await page.screenshot({ path: `responsive_${w}.png` });
    await page.close();
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
