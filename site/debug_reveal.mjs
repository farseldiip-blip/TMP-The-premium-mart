import puppeteer from "puppeteer-core";
const exe = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({width:390, height:844});
page.on('console', msg=> console.log("PAGE LOG:", msg.text()));
await page.goto("http://127.0.0.1:5174/index.html?v="+Date.now(), {waitUntil:"networkidle0"});
await new Promise(r=>setTimeout(r, 1500));
const info = await page.evaluate(()=>{
  const el = document.querySelector('.tpm-preview-head.reveal');
  const s = getComputedStyle(el);
  return {
    hasReveal: !!el,
    hasIn: el.classList.contains('in'),
    opacity: s.opacity,
    transform: s.transform,
    rect: el.getBoundingClientRect(),
    prefersReduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    heroAnimationsInitialized: !!window.heroAnimationsInitialized
  };
});
console.log(JSON.stringify(info,null,2));
await page.evaluate(()=> window.scrollTo(0, 700));
await new Promise(r=>setTimeout(r, 800));
const info2 = await page.evaluate(()=>{
  const el = document.querySelector('.tpm-preview-head.reveal');
  return {
    hasIn: el.classList.contains('in'),
    opacity: getComputedStyle(el).opacity,
    rect: el.getBoundingClientRect()
  };
});
console.log("after scroll 700:", JSON.stringify(info2,null,2));
await browser.close();
