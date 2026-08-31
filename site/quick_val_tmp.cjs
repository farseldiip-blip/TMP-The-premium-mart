const pp=require('puppeteer-core');
(async()=>{
  const browser=await pp.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:'new',args:['--no-sandbox','--disable-setuid-sandbox','--disable-gpu']});
  const vps=[390,767,768,1024,1440];
  for(const vp of vps){
    const page=await browser.newPage();
    await page.setViewport({width:vp,height:900});
    await page.goto('http://127.0.0.1:5173/index.html',{waitUntil:'networkidle0',timeout:30000});
    await new Promise(r=>setTimeout(r,1500));
    const hero=await page.evaluate(()=>{
      const stage=document.querySelector('.tpm-can-stage');
      const cans=[...document.querySelectorAll('.tpm-can')];
      return {
        heroCount:document.querySelectorAll('.tpm-hero').length,
        canCount:cans.length,
        stage:stage?{w:Math.round(stage.getBoundingClientRect().width),h:Math.round(stage.getBoundingClientRect().height)}:null,
        overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
        canRects:cans.map(c=>{const r=c.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)+'@'+Math.round(r.left)+','+Math.round(r.top)}),
      };
    });
    const page2=await browser.newPage();
    await page2.setViewport({width:vp,height:900});
    await page2.goto('http://127.0.0.1:5173/menu.html',{waitUntil:'networkidle0',timeout:30000});
    await new Promise(r=>setTimeout(r,1500));
    const menu=await page2.evaluate(()=>{
      const figs=[...document.querySelectorAll('.menu-page-figure')];
      const foot=document.querySelector('.menu-foot-note');
      return {
        figs:figs.map(f=>{const r=f.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top),left:Math.round(r.left),gridCol:getComputedStyle(f).gridColumn,gridRow:getComputedStyle(f).gridRow}}),
        foot:foot?{w:Math.round(foot.getBoundingClientRect().width),gridCol:getComputedStyle(foot).gridColumn}:null,
        overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
        containerDisplay:getComputedStyle(document.querySelector('.menu-images-container')).display,
      };
    });
    const heroOK=hero.heroCount===1 && hero.canCount===3 && hero.overflow===0;
    const menuOK=(vp<=767)? (menu.figs.length===3 && Math.abs(menu.figs[1].top-menu.figs[2].top)<5 && menu.figs[0].w>menu.figs[1].w*1.5) : (menu.figs[0].w===menu.figs[1].w);
    const footOK=(vp<=767)?(menu.foot&&menu.foot.gridCol==='1 / -1'):true;
    console.log(`VP ${vp} HERO ${heroOK?'OK':'FAIL'} stage ${hero.stage?hero.stage.w+'x'+hero.stage.h:'?'} cans ${hero.canRects.join(' | ')} overflow ${hero.overflow} | MENU ${menuOK?'OK':'FAIL'} figs ${menu.figs.map(f=>f.w+'x'+f.h).join(' ')} foot ${menu.foot?menu.foot.gridCol:'?'} disp ${menu.containerDisplay} overflow ${menu.overflow} | ${(heroOK&&menuOK&&footOK)?'PASS':'FAIL'}`);
    await page.close(); await page2.close();
  }
  await browser.close();
  console.log('DONE');
})();
