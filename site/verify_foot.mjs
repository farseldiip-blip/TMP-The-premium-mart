import puppeteer from "puppeteer-core";
const exe = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox","--disable-gpu"] });
const test = async (w) => {
  const page = await browser.newPage();
  await page.setViewport({width:w, height:900});
  await page.goto("http://127.0.0.1:5174/menu.html?v="+Date.now(), {waitUntil:"networkidle0"});
  const info = await page.evaluate(()=>{
    const foot = document.querySelector(".menu-foot-note.reveal");
    const s = getComputedStyle(foot);
    const r = foot.getBoundingClientRect();
    const container = document.querySelector(".menu-images-container");
    const cr = container.getBoundingClientRect();
    const grid = getComputedStyle(container);
    const actions = document.querySelector(".menu-actions");
    const ar = actions.getBoundingClientRect();
    const p = foot.querySelector("p");
    const pr = p.getBoundingClientRect();
    return {
      viewport: window.innerWidth,
      footRect: {w:Math.round(r.width), h:Math.round(r.height), left:Math.round(r.left), right:Math.round(r.right)},
      footStyles: {width:s.width, maxWidth:s.maxWidth, gridColumn:s.gridColumn, padding:s.padding, boxSizing:s.boxSizing},
      containerRect: {w:Math.round(cr.width), left:Math.round(cr.left), right:Math.round(cr.right)},
      gridCols: grid.gridTemplateColumns,
      gridGap: grid.gap,
      actionsRect: {w:Math.round(ar.width), h:Math.round(ar.height)},
      pRect: {w:Math.round(pr.width), h:Math.round(pr.height)},
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await page.close();
};
await test(390);
await test(768);
await test(1280);
await browser.close();
