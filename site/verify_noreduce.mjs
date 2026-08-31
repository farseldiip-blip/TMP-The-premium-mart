import puppeteer from "puppeteer-core";
const exe = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.emulateMediaFeatures([{name:'prefers-reduced-motion', value:'no-preference'}]);
await page.setViewport({width:390, height:844});
await page.goto("http://127.0.0.1:5174/index.html?v="+Date.now(), {waitUntil:"networkidle0"});
await new Promise(r=>setTimeout(r, 1800));
let info = await page.evaluate(()=>{
  return {
    prefersReduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    heroInit: !!window.heroAnimationsInitialized,
    revealTotal: document.querySelectorAll('.reveal').length,
    revealIn: document.querySelectorAll('.reveal.in').length,
    cansOpacity: getComputedStyle(document.querySelector('.tpm-can--blue')).opacity
  };
});
console.log("initial:", JSON.stringify(info,null,2));
for(let y=0;y<2000;y+=500){
  await page.evaluate(y=>window.scrollTo(0,y), y);
  await new Promise(r=>setTimeout(r, 400));
}
let after = await page.evaluate(()=>{
  return {
    revealIn: document.querySelectorAll('.reveal.in').length,
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
    previewCols: getComputedStyle(document.querySelector('.tpm-preview-grid')).gridTemplateColumns
  };
});
console.log("after scroll:", JSON.stringify(after,null,2));
await browser.close();
