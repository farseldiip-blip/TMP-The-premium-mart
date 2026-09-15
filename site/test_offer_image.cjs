const puppeteer = require("puppeteer-core");
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 5201;
const SITE_DIR = path.join(__dirname);
const EDGE = "C:\\PROGRA~2\\MICROS~1\\Edge\\Application\\msedge.exe";

const server = http.createServer((req, res) => {
  let urlPath = req.url.split("?")[0];
  let filePath = path.join(SITE_DIR, urlPath === "/" ? "index.html" : urlPath);
  const ext = path.extname(filePath);
  const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
  try {
    if (!fs.existsSync(filePath)) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": types[ext] || "text/plain" });
    res.end(fs.readFileSync(filePath));
  } catch (e) { res.writeHead(404); res.end("Not found"); }
});
server.listen(PORT, "127.0.0.1", async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, args: ["--no-sandbox", "--disable-gpu"] });

  const viewports = [320, 390, 480, 768, 1024, 1440];
  const results = [];

  for (const w of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: 900 });
    const errors = [];
    page.on("console", msg => { if (msg.type() === "error") errors.push(`${msg.type()}: ${msg.text()} [${msg.location()?.url || "?"}]`); });
    page.on("pageerror", err => errors.push(err.message));
    page.on("requestfailed", req => { if (req.response() && req.response().status() === 404) errors.push(`404: ${req.url()}`); });

    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load" });
    await new Promise(r => setTimeout(r, 1500));

    const section = await page.$(".tpm-offers-home");
    const hasSection = !!section;
    const cards = await page.$$(".home-offer-card");
    const cardCount = cards.length;

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

    const tpmPreview = await page.$(".tpm-preview");
    const hasPreview = !!tpmPreview;

    results.push({ w, section: hasSection, cards: cardCount, overflow, tpmPreview: hasPreview, errors: errors.length, errorList: errors });
    await page.close();
  }

  console.log("\n=== SUMMARY ===");
  for (const r of results) {
    console.log(`[${r.w}] section=${r.section}, cards=${r.cards}, overflow=${r.overflow}, tpmPreview=${r.tpmPreview}, errors=${r.errors}`);
    if (r.errorList) r.errorList.forEach(e => console.log(`  ERROR: ${e}`));
  }

  const allPass = results.every(r => r.section && r.cards >= 1 && !r.overflow && r.tpmPreview && r.errors === 0);
  console.log(`\n=== ALL PASS: ${allPass} ===`);

  await browser.close();
  server.close();
});
