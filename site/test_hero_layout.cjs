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

  // Let's test styles applied dynamically
  const testStyle = `
    .tpm-hero-visual {
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: center !important;
      padding: 24px 0 16px !important;
    }
    .tpm-can-stage {
      position: relative !important;
      top: auto !important;
      transform: none !important;
      padding-bottom: 56px !important;
      max-width: 660px !important;
      width: 100% !important;
      display: flex !important;
      align-items: flex-end !important;
      justify-content: center !important;
      gap: 16px !important;
    }
    .tpm-can-stage::after {
      bottom: 46px !important;
      width: 90% !important;
    }
    .tpm-store-chip {
      bottom: 6px !important;
      z-index: 5 !important;
    }
    .tpm-can {
      flex: 0 0 auto !important;
      transform: none !important;
    }
    .tpm-can--mango {
      width: 130px !important;
      height: 215px !important;
      margin-bottom: 0 !important;
      z-index: 2 !important;
    }
    .tpm-can--strawberry {
      width: 220px !important;
      height: 220px !important;
      margin-left: -60px !important;
      margin-right: -60px !important;
      margin-bottom: -15px !important;
      z-index: 3 !important;
    }
    .tpm-can--blue {
      width: 200px !important;
      height: 150px !important;
      margin-bottom: 0 !important;
      z-index: 2 !important;
    }
    .tpm-can--beef {
      width: 200px !important;
      height: 150px !important;
      margin-bottom: -7px !important;
      z-index: 1 !important;
    }
  `;

  await page.evaluate((css) => {
    const style = document.createElement('style');
    style.id = 'test-override';
    style.textContent = css;
    document.head.appendChild(style);

    // Cancel GSAP transforms on cans so CSS layout rules
    if (window.gsap) {
      const mango = document.querySelector('.tpm-can--mango');
      const straw = document.querySelector('.tpm-can--strawberry');
      const blue = document.querySelector('.tpm-can--blue');
      const beef = document.querySelector('.tpm-can--beef');
      gsap.set([mango, straw, blue, beef], { x: 0, y: 0, scale: 1, rotation: 0 });
    }
  }, testStyle);

  await new Promise(r => setTimeout(r, 500));

  const metrics = await page.evaluate(() => {
    const insets = {
      mango: { l: 0.061, r: 0.072, t: 0.100, b: 0.018 },
      strawberry: { l: 0.344, r: 0.336, t: 0.114, b: 0.070 },
      blue: { l: 0.099, r: 0.051, t: 0.004, b: 0.000 },
      beef: { l: 0.073, r: 0.072, t: 0.073, b: 0.050 }
    };

    const keys = ['mango', 'strawberry', 'blue', 'beef'];
    const cans = {};
    keys.forEach(k => {
      const el = document.querySelector('.tpm-can--' + k);
      const r = el.getBoundingClientRect();
      const ins = insets[k];
      const visX = Math.round(r.x + r.width * ins.l);
      const visRight = Math.round(r.right - r.width * ins.r);
      const visY = Math.round(r.y + r.height * ins.t);
      const visBottom = Math.round(r.bottom - r.height * ins.b);
      cans[k] = {
        dom: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom), right: Math.round(r.right) },
        vis: { x: visX, y: visY, w: visRight - visX, h: visBottom - visY, bottom: visBottom, right: visRight }
      };
    });

    const hv = document.querySelector('.tpm-hero-visual').getBoundingClientRect();
    const st = document.getElementById('tpmCanStage').getBoundingClientRect();
    const chip = document.querySelector('.tpm-store-chip').getBoundingClientRect();

    return {
      visual: { y: Math.round(hv.y), h: Math.round(hv.height), bottom: Math.round(hv.bottom) },
      stage: { y: Math.round(st.y), h: Math.round(st.height), bottom: Math.round(st.bottom) },
      chip: { y: Math.round(chip.y), bottom: Math.round(chip.bottom) },
      cans,
      gaps: {
        mango_to_strawberry: cans.strawberry.vis.x - cans.mango.vis.right,
        strawberry_to_blue: cans.blue.vis.x - cans.strawberry.vis.right,
        blue_to_beef: cans.beef.vis.x - cans.blue.vis.right
      },
      baselines: {
        mango: cans.mango.vis.bottom,
        strawberry: cans.strawberry.vis.bottom,
        blue: cans.blue.vis.bottom,
        beef: cans.beef.vis.bottom
      },
      chipClearance: Math.round(chip.y) - Math.max(...keys.map(k => cans[k].vis.bottom))
    };
  });

  console.log(JSON.stringify(metrics, null, 2));

  await page.screenshot({ path: 'test_1024_result.png' });
  const heroEl = await page.$('.tpm-hero');
  await heroEl.screenshot({ path: 'test_1024_hero.png' });

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
