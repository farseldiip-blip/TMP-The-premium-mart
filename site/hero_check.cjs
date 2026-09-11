// Desktop hero QA: screenshots + overflow checks at 1024 and 1440.
const puppeteer = require('puppeteer-core');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1'],
  });
  const results = [];
  for (const width of [1024, 1440]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    await page.goto('http://127.0.0.1:5173/index.html', { waitUntil: 'load', timeout: 30000 });
    // Let GSAP entrance finish (entrance ~1.5s + idle-deferred start)
    await new Promise((r) => setTimeout(r, 4500));

    const metrics = await page.evaluate(() => {
      const hero = document.querySelector('.tpm-hero');
      const stage = document.getElementById('tpmCanStage');
      const heroRect = hero.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      const cans = {};
      document.querySelectorAll('.tpm-can').forEach((el) => {
        const r = el.getBoundingClientRect();
        const img = el.querySelector('img');
        cans[img ? img.getAttribute('src') : el.className] = {
          cls: el.className,
          x: Math.round(r.x), y: Math.round(r.y),
          w: Math.round(r.width), h: Math.round(r.height),
          right: Math.round(r.right), bottom: Math.round(r.bottom),
          opacity: getComputedStyle(el).opacity,
        };
      });
      return {
        viewport: window.innerWidth,
        scrollW: document.documentElement.scrollWidth,
        bodyScrollW: document.body.scrollWidth,
        hero: { x: Math.round(heroRect.x), w: Math.round(heroRect.width), right: Math.round(heroRect.right) },
        stage: { x: Math.round(stageRect.x), w: Math.round(stageRect.width), right: Math.round(stageRect.right) },
        cans,
      };
    });

    await page.screenshot({ path: `hero_check_${width}.png` });
    // Hero-only crop
    const heroEl = await page.$('.tpm-hero');
    await heroEl.screenshot({ path: `hero_check_${width}_hero.png` });
    results.push({ width, metrics, errors });
    console.log(`=== ${width}px ===`);
    console.log(JSON.stringify(metrics, null, 1));
    console.log('errors: ' + (errors.length ? errors.join(' | ') : 'none'));
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error('FATAL: ' + e.message); process.exit(1); });
