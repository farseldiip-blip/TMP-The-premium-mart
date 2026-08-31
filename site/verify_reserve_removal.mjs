import puppeteer from "puppeteer-core";
const exe = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox","--disable-gpu"] });
const test = async (url, name) => {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if(msg.type()==='error') errors.push(msg.text()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({width:1280, height:800});
  await page.goto(url, {waitUntil:"networkidle0"});
  const result = await page.evaluate(()=>{
    const hasReserveModal = !!document.getElementById('reserveModal');
    const hasReserveForm = !!document.getElementById('reserveForm');
    const hasDataOpenReserve = document.querySelectorAll('[data-open-reserve]').length;
    const hasBtnReservations = document.querySelectorAll('.btn-reservations').length;
    const hasBookATable = [...document.querySelectorAll('button')].filter(b=>b.textContent.includes('Book a table')).length;
    const hasReserveATable = [...document.querySelectorAll('*')].filter(e=>e.textContent.includes('Reserve a table')).length;
    const hasRequestBooking = [...document.querySelectorAll('button')].filter(b=>b.textContent.includes('Request booking')).length;
    const hasReservationsText = [...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Reservations').length;
    const hasContactForm = !!document.getElementById('contactForm');
    const hasDrawer = !!document.getElementById('drawer');
    const hasMenuLightbox = !!document.getElementById('menuLightbox');
    const visitActions = document.querySelector('.visit-actions');
    const visitActionsHTML = visitActions ? visitActions.innerHTML.slice(0,500) : 'no visit-actions';
    return { hasReserveModal, hasReserveForm, hasDataOpenReserve, hasBtnReservations, hasBookATable, hasReserveATable, hasRequestBooking, hasReservationsText, hasContactForm, hasDrawer, hasMenuLightbox, visitActionsHTML };
  });
  console.log(`=== ${name} ${url} ===`);
  console.log(JSON.stringify(result, null, 2));
  console.log("Console errors:", errors.length ? errors : "none");
  await page.close();
  return result;
};
await test("http://127.0.0.1:5174/index.html", "index");
await test("http://127.0.0.1:5174/menu.html", "menu");
// Mobile test
const pageM = await browser.newPage();
await pageM.setViewport({width:390, height:844});
await pageM.goto("http://127.0.0.1:5174/index.html", {waitUntil:"networkidle0"});
const mobile = await pageM.evaluate(()=>{
  return {
    hasReserveModal: !!document.getElementById('reserveModal'),
    hasDataOpenReserve: document.querySelectorAll('[data-open-reserve]').length,
    visitActions: document.querySelector('.visit-actions')?.innerHTML.includes('Book a table')
  };
});
console.log("=== mobile index ===", JSON.stringify(mobile, null, 2));
await browser.close();
