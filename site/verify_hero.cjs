const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = 'http://127.0.0.1:5173/index.html';
const OUTPUT_DIR = path.join(__dirname, 'hero_screenshots');

const BREAKPOINTS = [
  { name: '320', width: 320, height: 900 },
  { name: '375', width: 375, height: 900 },
  { name: '390', width: 390, height: 900 },
  { name: '414', width: 414, height: 900 },
  { name: '480', width: 480, height: 900 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1440', width: 1440, height: 900 },
];

(async () => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const bp of BREAKPOINTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: bp.width, height: bp.height, deviceScaleFactor: 2 });
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 15000 });
    // Wait for GSAP animation to settle
    await new Promise(r => setTimeout(r, 2500));

    const file = path.join(OUTPUT_DIR, `hero_${bp.name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`✓ ${bp.name}px → ${file}`);
    await page.close();
  }

  await browser.close();
  console.log('\nDone. Screenshots in hero_screenshots/');
})();
