import puppeteer from "puppeteer-core";
const exe = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox","--disable-gpu"] });
const page = await browser.newPage();
await page.setCacheEnabled(false);
await page.setViewport({width:390, height:844, deviceScaleFactor:1});
await page.goto("http://127.0.0.1:5173/index.html?v="+Date.now(), {waitUntil:"networkidle0", timeout:15000});
await page.waitForSelector(".tpm-store-chip");
const info = await page.evaluate(async ()=>{
  const el = document.querySelector(".tpm-store-chip");
  const s = getComputedStyle(el);
  const mq = window.matchMedia("(max-width: 767px)").matches;
  const mq390 = window.matchMedia("(max-width: 390px)").matches;
  let cssText = "";
  try{ cssText = await fetch("css/style.css?v="+Date.now()).then(r=>r.text()); }catch(e){ cssText = e.message; }
  const hasMobileBorder = cssText.includes("rgba(14,26,20,.06)");
  const hasMobileBottom2 = cssText.includes("bottom:2px");
  const snippet = cssText.slice(cssText.indexOf("@media(max-width:767px)"), cssText.indexOf("@media(max-width:767px)")+1200);
  return { mq, mq390, hasMobileBorder, hasMobileBottom2, snippet: snippet.slice(0,1000), computedBorder: s.border, computedPadding: s.padding, computedFont: s.fontSize, href: document.querySelector("link[rel=stylesheet]").href };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
