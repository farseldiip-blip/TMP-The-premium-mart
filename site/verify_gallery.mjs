import puppeteer from "puppeteer-core";
const exe = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox","--disable-gpu"] });
for (const w of [390, 768, 1280]) {
  const page = await browser.newPage();
  await page.setViewport({width:w, height:900});
  await page.goto("http://127.0.0.1:5173/index.html?v="+Date.now(), {waitUntil:"networkidle0"});
  const info = await page.evaluate(()=>{
    const grid = document.querySelector(".gallery-grid");
    const items = [...document.querySelectorAll(".gallery-item")];
    const gs = getComputedStyle(grid);
    return {
      viewport: window.innerWidth,
      gridCols: gs.gridTemplateColumns,
      gap: gs.gap,
      items: items.map(el=>{
        const r=el.getBoundingClientRect();
        const s=getComputedStyle(el);
        return {w:Math.round(r.width), h:Math.round(r.height), gridColumn:s.gridColumn, aspect:s.aspectRatio}
      }),
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth
    };
  });
  console.log(JSON.stringify(info,null,2));
  await page.close();
}
await browser.close();
