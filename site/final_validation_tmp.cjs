const pp=require('puppeteer-core');
(async()=>{
  const browser=await pp.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:'new',args:['--no-sandbox','--disable-setuid-sandbox','--disable-gpu']});
  const vps=[320,375,390,414,480,767,768,1024,1440,1920];
  const results=[];
  for(const vp of vps){
    // index.html hero
    const page=await browser.newPage();
    await page.setViewport({width:vp,height:900});
    await page.goto('http://127.0.0.1:5173/index.html',{waitUntil:'networkidle0',timeout:30000});
    await new Promise(r=>setTimeout(r,2500));
    const hero=await page.evaluate(()=>{
      const stage=document.querySelector('.tpm-can-stage');
      const cans=[...document.querySelectorAll('.tpm-can')];
      const heroEl=document.querySelector('.tpm-hero');
      const visual=document.querySelector('.tpm-hero-visual');
      const inner=document.querySelector('.tpm-hero-inner');
      const get=(el)=>el?{w:Math.round(el.getBoundingClientRect().width),h:Math.round(el.getBoundingClientRect().height),x:Math.round(el.getBoundingClientRect().x),y:Math.round(el.getBoundingClientRect().y),display:getComputedStyle(el).display,opacity:getComputedStyle(el).opacity,transform:getComputedStyle(el).transform}:null;
      return {
        viewport:innerWidth,
        hero:get(heroEl),
        inner:get(inner),
        visual:get(visual),
        stage:get(stage),
        stageRect:stage?stage.getBoundingClientRect().toJSON():null,
        cans:cans.map(c=>({cls:c.className, rect:c.getBoundingClientRect().toJSON(), cs:{display:getComputedStyle(c).display,width:getComputedStyle(c).width,height:getComputedStyle(c).height,left:getComputedStyle(c).left,top:getComputedStyle(c).top,transform:getComputedStyle(c).transform,opacity:getComputedStyle(c).opacity}})),
        heroCount:document.querySelectorAll('.tpm-hero').length,
        canCount:document.querySelectorAll('.tpm-can').length,
        docWidth:document.documentElement.scrollWidth,
        clientWidth:document.documentElement.clientWidth,
        overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth?document.documentElement.scrollWidth-document.documentElement.clientWidth:0,
        consoleErrors:window.__errors||0,
        hasGSAP: typeof gsap!=='undefined',
        revealIn:document.querySelectorAll('.tpm-hero-visual.reveal.in').length,
      };
    });
    // menu page
    const page2=await browser.newPage();
    await page2.setViewport({width:vp,height:900});
    await page2.goto('http://127.0.0.1:5173/menu.html',{waitUntil:'networkidle0',timeout:30000});
    await new Promise(r=>setTimeout(r,2500));
    const menu=await page2.evaluate(()=>{
      const container=document.querySelector('.menu-images-container');
      const figs=[...document.querySelectorAll('.menu-page-figure')];
      const foot=document.querySelector('.menu-foot-note');
      return {
        container:container?{display:getComputedStyle(container).display,gridTemplateColumns:getComputedStyle(container).gridTemplateColumns,gap:getComputedStyle(container).gap,w:Math.round(container.getBoundingClientRect().width)}:null,
        figures:figs.map((f,i)=>({idx:i+1, rect:f.getBoundingClientRect().toJSON(), cs:{display:getComputedStyle(f).display,gridColumn:getComputedStyle(f).gridColumn,gridRow:getComputedStyle(f).gridRow,width:getComputedStyle(f).width}})),
        foot:foot?{rect:foot.getBoundingClientRect().toJSON(),cs:{gridColumn:getComputedStyle(foot).gridColumn,width:getComputedStyle(foot).width}}:null,
        docWidth:document.documentElement.scrollWidth,
        clientWidth:document.documentElement.clientWidth,
        overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth?document.documentElement.scrollWidth-document.documentElement.clientWidth:0,
      };
    });
    // screenshot
    await page.screenshot({path:`D:\\code\\TMP-The premium mart\\site\\val_${vp}_index.png`,fullPage:false});
    await page2.screenshot({path:`D:\\code\\TMP-The premium mart\\site\\val_${vp}_menu.png`,fullPage:false});
    // visual check hero cans grouped? check if cans' x overlap stage
    const heroOK = hero.heroCount===1 && hero.canCount===3 && hero.overflow===0 && hero.stage && hero.stage.w>0;
    const menuMobileOK = (vp<=767) ? (menu.figures.length===3 && Math.abs(menu.figures[1].rect.top - menu.figures[2].rect.top)<5 && menu.figures[0].rect.width>menu.figures[1].rect.width*1.3) : (menu.figures[0].rect.width===menu.figures[1].rect.width);
    const menuFootOK = (vp<=767) ? (menu.foot && menu.foot.cs.gridColumn==='1 / -1') : true;
    console.log(`VP ${vp} | HERO ${heroOK?'OK':'FAIL'} canCount=${hero.canCount} stage=${hero.stage?w=hero.stage.w+'x'+hero.stage.h:'?' } overflow=${hero.overflow} | MENU ${menuMobileOK?'OK':'FAIL'} figs:${menu.figures.map(f=>Math.round(f.rect.width)+'x'+Math.round(f.rect.height)).join(' ')} foot:${menu.foot?menu.foot.cs.gridColumn:'?'} overflow=${menu.overflow} | ${menuMobileOK&&heroOK&&menuFootOK?'PASS':'FAIL'}`);
    results.push({vp,hero,menu,heroOK,menuMobileOK,menuFootOK});
    await page.close(); await page2.close();
  }
  await browser.close();
  const allPass=results.every(r=>r.heroOK&&r.menuMobileOK&&r.menuFootOK&&r.hero.overflow===0&&r.menu.overflow===0);
  console.log('\\nOVERALL: '+(allPass?'PASS':'PARTIAL/FAIL'));
  // reduced motion check
  const browser2=await pp.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:'new',args:['--no-sandbox','--disable-setuid-sandbox','--disable-gpu']});
  const pageR=await browser2.newPage();
  await pageR.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await pageR.setViewport({width:390,height:900});
  await pageR.goto('http://127.0.0.1:5173/index.html',{waitUntil:'networkidle0',timeout:30000});
  await new Promise(r=>setTimeout(r,1500));
  const reduced=await pageR.evaluate(()=>({heroVisualOpacity:getComputedStyle(document.querySelector('.tpm-hero-visual')).opacity, revealOpacity:getComputedStyle(document.querySelector('.tpm-hero-copy')).opacity}));
  console.log('REDUCED MOTION: heroVisual opacity',reduced.heroVisualOpacity,'copy opacity',reduced.revealOpacity);
  await browser2.close();
})();
