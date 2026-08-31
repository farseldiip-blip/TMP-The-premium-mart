import puppeteer from "puppeteer-core";
const exe = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await puppeteer.launch({
  executablePath: exe,
  headless: true,
  args: ["--no-sandbox","--disable-gpu"]
});
const page = await browser.newPage();

// mobile
await page.setViewport({width:390, height:844, deviceScaleFactor:2});
await page.goto("http://127.0.0.1:5173/index.html", {waitUntil:"networkidle0", timeout:15000});
await page.waitForSelector(".tpm-store-chip", {timeout:5000});
const mobile = await page.evaluate(()=>{
  const el = document.querySelector(".tpm-store-chip");
  const s = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const parent = el.parentElement;
  const ps = getComputedStyle(parent);
  return {
    rect:{w:rect.width, h:rect.height, top:rect.top, left:rect.left},
    border: s.border,
    borderWidth: s.borderWidth,
    borderColor: s.borderColor,
    borderRadius: s.borderRadius,
    outline: s.outline,
    boxShadow: s.boxShadow,
    background: s.backgroundColor,
    transform: s.transform,
    gap: s.gap,
    padding: s.padding,
    fontSize: s.fontSize,
    overflow: s.overflow,
    parentOverflow: ps.overflow,
    parentPerspective: ps.perspective,
    parentTransformStyle: ps.transformStyle,
    parentFilter: ps.filter,
    className: el.className,
    outerHTML: el.outerHTML.slice(0,500)
  };
});
console.log(JSON.stringify(mobile, null, 2));

// Also take screenshot of chip
const chipHandle = await page.$(".tpm-store-chip");
await chipHandle.screenshot({path:"chip_mobile.png"});
console.log("saved chip_mobile.png");

// desktop
await page.setViewport({width:1280, height:800, deviceScaleFactor:1});
await page.goto("http://127.0.0.1:5173/index.html", {waitUntil:"networkidle0", timeout:15000});
await page.waitForSelector(".tpm-store-chip");
const desktop = await page.evaluate(()=>{
  const el = document.querySelector(".tpm-store-chip");
  const s = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const parent = el.parentElement;
  const ps = getComputedStyle(parent);
  return {
    rect:{w:rect.width, h:rect.height},
    border: s.border,
    borderWidth: s.borderWidth,
    borderColor: s.borderColor,
    borderRadius: s.borderRadius,
    boxShadow: s.boxShadow,
    transform: s.transform,
    parentPerspective: ps.perspective,
    parentTransformStyle: ps.transformStyle,
  };
});
console.log("DESKTOP:", JSON.stringify(desktop, null, 2));
const chip2 = await page.$(".tpm-store-chip");
await chip2.screenshot({path:"chip_desktop.png"});
console.log("saved chip_desktop.png");

await browser.close();
