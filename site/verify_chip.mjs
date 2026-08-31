import puppeteer from "puppeteer-core";
const exe = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox","--disable-gpu"] });
const page = await browser.newPage();
await page.setCacheEnabled(false);
await page.setViewport({width:390, height:844, deviceScaleFactor:1});
await page.goto("http://127.0.0.1:5173/index.html", {waitUntil:"networkidle0", timeout:15000});
await page.waitForSelector(".tpm-store-chip");
// Force reload stylesheet with cache bust
await page.evaluate(()=>{
  const link = document.querySelector('"'"'link[rel="stylesheet"]'"'"');
  if(link){ link.href = '"'"'css/style.css?v='"'"' + Date.now(); return link.href; }
  return null;
});
await page.waitForTimeout(800);
const info = await page.evaluate(()=>{
  const el = document.querySelector(".tpm-store-chip");
  const s = getComputedStyle(el);
  return { border: s.border, borderColor: s.borderColor, padding: s.padding, fontSize: s.fontSize, bottom: s.bottom };
});
console.log("Mobile after fix:", JSON.stringify(info, null, 2));
await page.setViewport({width:1280, height:800, deviceScaleFactor:1});
await page.goto("http://127.0.0.1:5173/index.html", {waitUntil:"networkidle0", timeout:15000});
await page.waitForSelector(".tpm-store-chip");
await page.evaluate(()=>{
  const link = document.querySelector('"'"'link[rel="stylesheet"]'"'"');
  if(link){ link.href = '"'"'css/style.css?v='"'"' + Date.now(); }
});
await page.waitForTimeout(800);
const desk = await page.evaluate(()=>{
  const el = document.querySelector(".tpm-store-chip");
  const s = getComputedStyle(el);
  return { border: s.border, borderColor: s.borderColor };
});
console.log("Desktop after fix:", JSON.stringify(desk, null, 2));
await browser.close();
