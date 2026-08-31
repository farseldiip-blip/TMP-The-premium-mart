const pp=require('puppeteer-core');
(async()=>{
  const browser=await pp.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:'new',args:['--no-sandbox','--disable-setuid-sandbox','--disable-gpu']});
  const vps=[320,375,414,480,1920];
  for(const vp of vps){
    const page=await browser.newPage();
    await page.setViewport({width:vp,height:900});
    await page.goto('http://127.0.0.1:5173/index.html',{waitUntil:'networkidle0',timeout:30000});
    await new Promise(r=>setTimeout(r,1200));
    const hero=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth, cans:[...document.querySelectorAll('.tpm-can')].length}));
    const page2=await browser.newPage();
    await page2.setViewport({width:vp,height:900});
    await page2.goto('http://127.0.0.1:5173/menu.html',{waitUntil:'networkidle0',timeout:30000});
    await new Promise(r=>setTimeout(r,1200));
    const menu=await page2.evaluate(()=>{const figs=[...document.querySelectorAll('.menu-page-figure')];return {figs:figs.map(f=>{const r=f.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)+' top'+Math.round(r.top)}), overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}});
    console.log('VP '+vp+' hero canCount '+hero.cans+' overflow '+hero.overflow+' menu '+menu.figs.join(' | ')+' overflow '+menu.overflow);
    await page.close(); await page2.close();
  }
  await browser.close();
})();