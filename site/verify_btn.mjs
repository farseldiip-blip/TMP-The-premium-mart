import puppeteer from "puppeteer-core";
const exe = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox","--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({width:390, height:844, deviceScaleFactor:1});
await page.goto("http://127.0.0.1:5173/index.html?v="+Date.now(), {waitUntil:"networkidle0"});
await page.waitForSelector(".tpm-preview-cta .btn");
const info = await page.evaluate(()=>{
  const btn = document.querySelector(".tpm-preview-cta .btn");
  const s = getComputedStyle(btn);
  const rect = btn.getBoundingClientRect();
  const text = btn.innerText;
  const html = btn.innerHTML;
  return {
    text,
    html: html.slice(0,200),
    rect: {w:rect.width, h:rect.height},
    display: s.display,
    fontSize: s.fontSize,
    color: s.color,
    backgroundColor: s.backgroundColor,
    visibility: s.visibility,
    opacity: s.opacity,
    overflow: s.overflow,
    whiteSpace: s.whiteSpace,
    textAlign: s.textAlign,
    justifyContent: s.justifyContent,
    alignItems: s.alignItems,
    width: s.width,
    minWidth: s.minWidth,
    maxWidth: s.maxWidth,
    clipPath: s.clipPath
  };
});
console.log(JSON.stringify(info,null,2));
await browser.close();
