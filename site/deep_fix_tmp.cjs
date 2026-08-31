const pp=require('puppeteer-core');
const fs=require('fs');
const http=require('http');
function fetchText(url){return new Promise((res,rej)=>{http.get(url,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res({status:r.statusCode,headers:r.headers,body:d}))}).on('error',rej)})}
(async()=>{
  const browser=await pp.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:'new',args:['--no-sandbox','--disable-setuid-sandbox','--disable-gpu']});
  // 1. HTML structure
  for(const pg of ['index.html','menu.html']){
    const page=await browser.newPage();
    await page.setViewport({width:390,height:900});
    await page.goto(`http://127.0.0.1:5173/${pg}`,{waitUntil:'networkidle0',timeout:30000});
    await new Promise(r=>setTimeout(r,1500));
    const htmlInfo=await page.evaluate(()=>{
      const q=s=>document.querySelector(s);
      const qa=s=>[...document.querySelectorAll(s)];
      return {
        url:location.href,
        menuContainers:qa('.menu-images-container').map(e=>({html:e.outerHTML.slice(0,200), cls:e.className, inline:e.getAttribute('style')})),
        menuFigs:qa('.menu-page-figure').map(e=>({cls:e.className, inline:e.getAttribute('style')})),
        hero:qa('.tpm-hero').length, visual:qa('.tpm-hero-visual').length, stage:qa('.tpm-can-stage').length, cans:qa('.tpm-can').length,
        stylesheets:[...document.querySelectorAll('link[rel=\"stylesheet\"]')].map(l=>l.href),
        inlineStyles:[...document.querySelectorAll('style')].map(s=>s.textContent.slice(0,120).replace(/\n/g,' ')),
        scripts:[...document.querySelectorAll('script[src]')].map(s=>s.src),
      };
    });
    console.log(`\n=== ${pg} HTML ===`);
    console.log(JSON.stringify(htmlInfo,null,2));
    await page.close();
  }
  // 2. CSS rules affecting menu
  const page=await browser.newPage();
  await page.setViewport({width:390,height:900});
  await page.goto('http://127.0.0.1:5173/menu.html',{waitUntil:'networkidle0',timeout:30000});
  await new Promise(r=>setTimeout(r,1500));
  const cssRules=await page.evaluate(()=>{
    const out=[];
    for(const sheet of document.styleSheets){
      try{
        for(const rule of sheet.cssRules){
          if(rule.selectorText && (rule.selectorText.includes('menu-images-container')||rule.selectorText.includes('menu-page-figure')||rule.selectorText.includes('menu-foot-note'))){
            out.push({selector:rule.selectorText, cssText:rule.cssText, parent: rule.parentRule?rule.parentRule.conditionText||rule.parentRule.cssText.slice(0,60):'top-level'});
          }
          if(rule.conditionText && rule.conditionText.includes('max-width:767px')){
            for(const r2 of rule.cssRules){
              if(r2.selectorText && (r2.selectorText.includes('menu-images-container')||r2.selectorText.includes('menu-page-figure')||r2.selectorText.includes('menu-foot-note'))){
                out.push({selector:r2.selectorText, cssText:r2.cssText, parent:rule.conditionText});
              }
            }
          }
          if(rule.conditionText && rule.conditionText.includes('min-width:768px')){
            for(const r2 of rule.cssRules){
              if(r2.selectorText && (r2.selectorText.includes('menu-images-container')||r2.selectorText.includes('menu-page-figure'))){
                out.push({selector:r2.selectorText, cssText:r2.cssText, parent:rule.conditionText});
              }
            }
          }
        }
      }catch(e){}
    }
    return out;
  });
  console.log('\n=== CSS RULES AFFECTING MENU ===');
  cssRules.forEach(r=>console.log(`${r.parent} => ${r.selector} => ${r.cssText}`));
  // 3. Computed styles at 390,767,768
  for(const vp of [390,767,768]){
    const p=await browser.newPage();
    await p.setViewport({width:vp,height:900});
    await p.goto('http://127.0.0.1:5173/menu.html',{waitUntil:'networkidle0',timeout:30000});
    await new Promise(r=>setTimeout(r,1200));
    const comp=await p.evaluate(()=>{
      const c=document.querySelector('.menu-images-container');
      const figs=[...document.querySelectorAll('.menu-page-figure')];
      const cs=(el)=>{const s=getComputedStyle(el);return {display:s.display,gridTemplateColumns:s.gridTemplateColumns,gridTemplateRows:s.gridTemplateRows,flexDirection:s.flexDirection,gap:s.gap,width:s.width,gridColumn:s.gridColumn,gridRow:s.gridRow}};
      return {
        vp:innerWidth,
        container: c?{display:cs(c).display, gridTemplateColumns:cs(c).gridTemplateColumns, flexDirection:cs(c).flexDirection, gap:cs(c).gap, width:cs(c).width, rect:c.getBoundingClientRect().toJSON()}:null,
        figs: figs.map((f,i)=>{const r=f.getBoundingClientRect();return {idx:i+1, x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height), gridColumn:cs(f).gridColumn, gridRow:cs(f).gridRow, display:cs(f).display}}),
        foot: document.querySelector('.menu-foot-note')?{gridColumn:getComputedStyle(document.querySelector('.menu-foot-note')).gridColumn, rect:document.querySelector('.menu-foot-note').getBoundingClientRect().toJSON()}:null,
      };
    });
    console.log(`\n=== COMPUTED @${vp} ===`);
    console.log(JSON.stringify(comp,null,2));
    await p.close();
  }
  // 4. Hero inspection
  for(const vp of [390,1024]){
    const p=await browser.newPage();
    await p.setViewport({width:vp,height:900});
    await p.goto('http://127.0.0.1:5173/index.html',{waitUntil:'networkidle0',timeout:30000});
    await new Promise(r=>setTimeout(r,2000));
    const hero=await p.evaluate(()=>{
      const q=s=>document.querySelector(s);
      const cs=(el)=>{if(!el) return null; const s=getComputedStyle(el); return {display:s.display,visibility:s.visibility,opacity:s.opacity,width:s.width,height:s.height,position:s.position,transform:s.transform,zIndex:s.zIndex,overflow:s.overflow}};
      const heroEl=q('.tpm-hero'), visual=q('.tpm-hero-visual'), stage=q('.tpm-can-stage'), cans=[...document.querySelectorAll('.tpm-can')];
      return {
        vp:innerWidth,
        hero:cs(heroEl),
        heroRect:heroEl?heroEl.getBoundingClientRect().toJSON():null,
        visual:cs(visual),
        visualRect:visual?visual.getBoundingClientRect().toJSON():null,
        visualInline:visual?visual.getAttribute('style'):null,
        visualClasses:visual?visual.className:null,
        stage:cs(stage),
        stageRect:stage?stage.getBoundingClientRect().toJSON():null,
        cans:cans.map(c=>({cls:c.className, cs:cs(c), rect:c.getBoundingClientRect().toJSON(), inline:c.getAttribute('style')})),
        heroCount:document.querySelectorAll('.tpm-hero').length,
        hasGSAP:typeof gsap!=='undefined',
        hasScrollTrigger: typeof ScrollTrigger!=='undefined',
      };
    });
    console.log(`\n=== HERO @${vp} ===`);
    console.log(JSON.stringify(hero,null,2));
    await p.close();
  }
  // 5. JS disabled test
  const pNoJS=await browser.newPage();
  await pNoJS.setJavaScriptEnabled(false);
  await pNoJS.setViewport({width:390,height:900});
  await pNoJS.goto('http://127.0.0.1:5173/index.html',{waitUntil:'networkidle0',timeout:30000});
  await new Promise(r=>setTimeout(r,1000));
  const nojs=await pNoJS.evaluate(()=>{
    const visual=document.querySelector('.tpm-hero-visual');
    const stage=document.querySelector('.tpm-can-stage');
    const cans=[...document.querySelectorAll('.tpm-can')];
    return {
      visual:visual?{opacity:getComputedStyle(visual).opacity, visibility:getComputedStyle(visual).visibility, display:getComputedStyle(visual).display, rect:visual.getBoundingClientRect().toJSON(), cls:visual.className}:null,
      stage:stage?{rect:stage.getBoundingClientRect().toJSON()}:null,
      cans:cans.map(c=>({cls:c.className, opacity:getComputedStyle(c).opacity, rect:c.getBoundingClientRect().toJSON()})),
    };
  });
  console.log('\n=== JS DISABLED @390 ===');
  console.log(JSON.stringify(nojs,null,2));
  await pNoJS.close();
  await browser.close();
  // 6. File vs served comparison
  const served=await fetchText('http://127.0.0.1:5173/css/style.css');
  const file=fs.readFileSync('D:/code/TMP-The premium mart/site/css/style.css','utf8');
  console.log('\n=== SERVED vs FILE ===');
  console.log('served status',served.status,'len',served.body.length,'file len',file.length,'match',served.body===file);
  if(served.body!==file){
    for(let i=0;i<Math.min(served.body.length,file.length);i++){ if(served.body[i]!==file[i]){ console.log('first diff at',i,'served',JSON.stringify(served.body.slice(i,i+80)),'file',JSON.stringify(file.slice(i,i+80))); break; } }
  }
  const servedIdx=await fetchText('http://127.0.0.1:5173/index.html');
  const fileIdx=fs.readFileSync('D:/code/TMP-The premium mart/site/index.html','utf8');
  console.log('index match',servedIdx.body===fileIdx);
  const servedMenu=await fetchText('http://127.0.0.1:5173/menu.html');
  const fileMenu=fs.readFileSync('D:/code/TMP-The premium mart/site/menu.html','utf8');
  console.log('menu match',servedMenu.body===fileMenu);
  const servedJS=await fetchText('http://127.0.0.1:5173/js/app.js');
  const fileJS=fs.readFileSync('D:/code/TMP-The premium mart/site/js/app.js','utf8');
  console.log('app.js match',servedJS.body===fileJS,'served len',servedJS.body.length,'file len',fileJS.length);
})();
