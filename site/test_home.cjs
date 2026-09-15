const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

// Start server
const server = spawn('python', ['-m', 'http.server', '5173', '--bind', '127.0.0.1'], {
  cwd: 'D:\\code\\TMP-The premium mart\\site',
  shell: true,
  detached: true,
  stdio: 'ignore'
});
server.unref();
console.log('Server started');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function testViewport(vp) {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: EDGE_PATH,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height });
  
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  
  await page.goto('http://127.0.0.1:5173/index.html', { waitUntil: 'networkidle0', timeout: 15000 });
  await sleep(1500);
  
  const result = await page.evaluate(() => {
    const section = document.getElementById('homeOffersSection');
    const grid = document.getElementById('homeOffersGrid');
    const cards = document.querySelectorAll('.home-offer-card');
    const tpmPreview = document.querySelector('.tpm-preview');
    const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;
    return {
      sectionVisible: section ? section.style.display !== 'none' : false,
      tpmPreviewExists: !!tpmPreview,
      cardsCount: cards.length,
      gridChildren: grid ? grid.children.length : 0,
      horizontalOverflow: overflow,
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      sectionPosition: section ? section.previousElementSibling?.className : '',
      sectionBeforePreview: section && tpmPreview ? section.compareDocumentPosition(tpmPreview) & 4 : false
    };
  });
  
  await page.screenshot({ path: `home_offers_${vp.label}.png`, fullPage: true });
  await browser.close();
  
  console.log(`[${vp.label}] section=${result.sectionVisible}, cards=${result.cardsCount}, overflow=${result.horizontalOverflow}, tpmPreview=${result.tpmPreviewExists}, errors=${errors.length}`);
  if (errors.length) console.log(`  Errors: ${errors.join(' | ').slice(0,200)}`);
  return { ...vp, ...result, errors };
}

async function main() {
  await sleep(2000);
  
  const viewports = [
    { width: 320, height: 568, label: '320' },
    { width: 375, height: 667, label: '375' },
    { width: 390, height: 667, label: '390' },
    { width: 414, height: 736, label: '414' },
    { width: 480, height: 640, label: '480' },
    { width: 767, height: 700, label: '767' },
    { width: 768, height: 700, label: '768' },
    { width: 1024, height: 700, label: '1024' },
    { width: 1440, height: 700, label: '1440' },
  ];

  const results = [];
  for (const vp of viewports) {
    try {
      const r = await testViewport(vp);
      results.push(r);
    } catch(e) {
      console.log(`[${vp.label}] ERROR: ${e.message?.slice(0,150)}`);
      results.push({ ...vp, errors: [e.message], cardsCount: -1 });
    }
  }
  
  console.log('\n=== SUMMARY ===');
  for (const r of results) {
    const status = r.errors.length > 0 ? 'FAIL' : 'PASS';
    console.log(`${r.label}: ${status} (section=${r.sectionVisible}, cards=${r.cardsCount}, overflow=${r.horizontalOverflow})`);
  }
  
  try { process.kill(-server.pid); } catch(e) {}
}

main().catch(e => { console.error(e); try { process.kill(-server.pid); } catch(e2) {} });
