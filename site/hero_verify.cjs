const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const BREAKPOINTS = [390, 767, 1024, 1440, 1920];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1'],
  });
  const results = [];
  for (const width of BREAKPOINTS) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    await page.goto('http://127.0.0.1:5173/index.html', { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 5000));

    const metrics = await page.evaluate(() => {
      const cans = {};
      document.querySelectorAll('.tpm-can').forEach((el) => {
        const r = el.getBoundingClientRect();
        const img = el.querySelector('img');
        const src = img ? img.getAttribute('src') : el.className;
        cans[src] = {
          cls: el.className,
          x: Math.round(r.x), y: Math.round(r.y),
          w: Math.round(r.width), h: Math.round(r.height),
          right: Math.round(r.right), left: Math.round(r.left),
          bottom: Math.round(r.bottom),
        };
      });
      return {
        viewport: window.innerWidth,
        scrollW: document.documentElement.scrollWidth,
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        cans,
      };
    });

    // Check overlap: Blueberry right should be < Beef left
    const canKeys = Object.keys(metrics.cans);
    const blueKey = canKeys.find(k => k.includes('BLUE'));
    const beefKey = canKeys.find(k => k.includes('beef'));
    const mangoKey = canKeys.find(k => k.includes('mango'));
    const strawKey = canKeys.find(k => k.includes('strawberry'));

    let overlap = 'N/A';
    if (blueKey && beefKey) {
      const blue = metrics.cans[blueKey];
      const beef = metrics.cans[beefKey];
      overlap = beef.left < blue.right ? 'OVERLAP!' : 'OK';
    }

    console.log(`=== ${width}px ===`);
    console.log(`  ScrollW > Viewport: ${metrics.overflow}`);
    if (blueKey) console.log(`  Blueberry: x=${metrics.cans[blueKey].x} right=${metrics.cans[blueKey].right}`);
    if (beefKey) console.log(`  Beef: x=${metrics.cans[beefKey].x} left=${metrics.cans[beefKey].left}`);
    if (mangoKey) console.log(`  Mango: x=${metrics.cans[mangoKey].x} right=${metrics.cans[mangoKey].right}`);
    if (strawKey) console.log(`  Strawberry: x=${metrics.cans[strawKey].x} right=${metrics.cans[strawKey].right}`);
    console.log(`  Overlap: ${overlap}`);
    console.log('');

    await page.screenshot({ path: `hero_${width}.png` });
    results.push({ width, metrics, overlap });
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error('FATAL: ' + e.message); process.exit(1); });
