import puppeteer from "puppeteer-core";
const exe = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox","--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({width:390, height:844});
await page.goto("http://127.0.0.1:5174/index.html?v="+Date.now(), {waitUntil:"networkidle0"});
await new Promise(r=>setTimeout(r, 1500));
let before = await page.evaluate(()=> document.querySelectorAll('.reveal.in').length);
console.log("reveal.in before scroll:", before);
// scroll gradually
for(let y=0; y<2500; y+=400){
  await page.evaluate(y=>window.scrollTo(0,y), y);
  await new Promise(r=>setTimeout(r, 300));
}
await new Promise(r=>setTimeout(r, 800));
let after = await page.evaluate(()=> document.querySelectorAll('.reveal.in').length);
console.log("reveal.in after scroll to bottom:", after);
let total = await page.evaluate(()=> document.querySelectorAll('.reveal').length);
console.log("total reveal:", total);
let imgs = await page.evaluate(()=>{
  const imgs=[...document.querySelectorAll('img')];
  return imgs.filter(i=>i.loading==='lazy').length + " lazy, " + imgs.filter(i=>i.complete).length + " complete of " + imgs.length;
});
console.log("images:", imgs);
let overflow = await page.evaluate(()=> document.documentElement.scrollWidth + " vs " + window.innerWidth);
console.log("overflow:", overflow);
await browser.close();
