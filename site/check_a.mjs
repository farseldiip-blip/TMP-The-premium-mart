import puppeteer from "puppeteer-core";
const exe = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox","--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({width:390, height:844, deviceScaleFactor:1});
await page.goto("http://127.0.0.1:5173/index.html?v="+Date.now(), {waitUntil:"networkidle0"});
await page.waitForSelector(".tpm-card--a");
const info = await page.evaluate(()=>{
  const el = document.querySelector(".tpm-card.tpm-card--a.reveal");
  const s = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const container = document.querySelector(".tpm-preview .container");
  const cs = getComputedStyle(container);
  const cRect = container.getBoundingClientRect();
  const grid = document.querySelector(".tpm-preview-grid");
  const gs = getComputedStyle(grid);
  const gRect = grid.getBoundingClientRect();
  return {
    viewport: window.innerWidth,
    cardRect: {w:rect.width, h:rect.height, left:rect.left, right:rect.right, x:rect.x},
    cardStyles: {width:s.width, minWidth:s.minWidth, maxWidth:s.maxWidth, margin:s.margin, marginLeft:s.marginLeft, marginRight:s.marginRight, transform:s.transform, aspectRatio:s.aspectRatio, minHeight:s.minHeight, boxSizing:s.boxSizing, display:s.display, gridColumn:s.gridColumn},
    containerRect: {w:cRect.width, left:cRect.left, right:cRect.right},
    containerStyles: {width:cs.width, maxWidth:cs.maxWidth, paddingLeft:cs.paddingLeft, paddingRight:cs.paddingRight, marginLeft:cs.marginLeft},
    gridRect: {w:gRect.width, left:gRect.left},
    gridStyles: {display:gs.display, gridTemplateColumns:gs.gridTemplateColumns, gap:gs.gap, width:gs.width},
    gutter: getComputedStyle(document.documentElement).getPropertyValue('--gutter'),
    htmlOverflow: getComputedStyle(document.documentElement).overflowX,
    bodyOverflow: getComputedStyle(document.body).overflowX
  };
});
console.log(JSON.stringify(info,null,2));
const htmlW = await page.evaluate(()=> document.documentElement.scrollWidth + " vs " + window.innerWidth);
console.log("scrollWidth vs innerWidth:", htmlW);
await browser.close();
