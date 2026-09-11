// Runs the admin i18n form harness at desktop + mobile widths.
const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  let fail = 0;
  for (const width of [1280, 360]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:5173/admin/__test__/forms.html', { waitUntil: 'networkidle0', timeout: 45000 });
    await page.waitForFunction(() => document.title === 'FORMTEST PASS' || document.title === 'FORMTEST FAIL', { timeout: 180000 });
    const text = await page.$eval('#results', (el) => el.textContent);
    console.log(`===== ${width}px =====\n` + text);
    console.log('pageerrors: ' + (errors.join('|') || 'none'));
    if (text.includes('FAIL')) fail = 1;
    await page.close();
  }
  await browser.close();
  process.exit(fail);
})().catch((e) => { console.error('FATAL: ' + (e && e.message)); process.exit(2); });
