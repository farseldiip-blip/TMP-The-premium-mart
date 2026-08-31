const pp=require('puppeteer-core');
const fs=require('fs');
(async()=>{
  const browser=await pp.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:'new',args:['--no-sandbox','--disable-setuid-sandbox','--disable-gpu']});
  const vps=[320,375,390,414,480,767,768,1024,1440,1920];
  const pages=['index.html','menu.html'];
  for(const pg of pages){
    for(const vp of vps){
      const page=await browser.newPage();
      await page.setViewport({width:vp,height:900});
      const url=`http://127.0.0.1:5173/${pg}`;
      await page.goto(url,{waitUntil:'networkidle0',timeout:30000});
      await new Promise(r=>setTimeout(r,1800));
      const out=`D:\\code\\TMP-The premium mart\\site\\forensic_${pg.replace('.html','')}_${vp}.png`;
      await page.screenshot({path:out,fullPage:true});
      const info=await page.evaluate(()=>{
        const sheets=[...document.styleSheets].map(s=>({href:s.href, count:(()=>{try{return s.cssRules.length}catch{return -1}})()}));
        const hero=document.querySelector('.tpm-hero');
        const stage=document.querySelector('.tpm-can-stage');
        const cans=[...document.querySelectorAll('.tpm-can')];
        const menuContainer=document.querySelector('.menu-images-container');
        const menuFigs=[...document.querySelectorAll('.menu-page-figure')];
        const css=(el,props)=>{ if(!el) return null; const cs=getComputedStyle(el); const o={}; props.forEach(p=>o[p]=cs[p]); return o; };
        return {
          url:location.href,
          sheets,
          hero: hero?{rect:hero.getBoundingClientRect().toJSON(), cs:css(hero,['display','position','width','height','overflow','background']) }:null,
          heroInner: document.querySelector('.tpm-hero-inner')?{rect:document.querySelector('.tpm-hero-inner').getBoundingClientRect().toJSON(), cs:css(document.querySelector('.tpm-hero-inner'),['display','gridTemplateColumns','gap'])}:null,
          visual: document.querySelector('.tpm-hero-visual')?{rect:document.querySelector('.tpm-hero-visual').getBoundingClientRect().toJSON(), cs:css(document.querySelector('.tpm-hero-visual'),['display','width','height','minHeight','opacity','visibility','transform'])}:null,
          stage: stage?{rect:stage.getBoundingClientRect().toJSON(), cs:css(stage,['display','width','height','perspective','transformStyle'])}:null,
          cans: cans.map(c=>({cls:c.className, rect:c.getBoundingClientRect().toJSON(), cs:css(c,['display','position','width','height','left','top','transform','opacity','zIndex','filter']), inline:c.getAttribute('style')||''})),
          menuContainer: menuContainer?{rect:menuContainer.getBoundingClientRect().toJSON(), cs:css(menuContainer,['display','gridTemplateColumns','gap','width']), childCount:menuContainer.children.length}:null,
          menuFigs: menuFigs.map((f,i)=>({idx:i+1, rect:f.getBoundingClientRect().toJSON(), cs:css(f,['display','gridColumn','gridRow','width','height','opacity']), hasIn:f.classList.contains('in'), hasReveal:f.classList.contains('reveal')})),
          doc:{scrollW:document.documentElement.scrollWidth, clientW:document.documentElement.clientWidth, bodyOverflow:getComputedStyle(document.body).overflowX},
          js:{hasGSAP:typeof gsap!=='undefined', heroInit: window.heroAnimationsInitialized?true:false},
          htmlCounts:{hero:document.querySelectorAll('.tpm-hero').length, stage:document.querySelectorAll('.tpm-can-stage').length, cans:document.querySelectorAll('.tpm-can').length, legacyCans:document.querySelectorAll('.can-mango,.can-blue,.can-strawberry').length, menuContainers:document.querySelectorAll('.menu-images-container').length, menuFigs:document.querySelectorAll('.menu-page-figure').length}
        };
      });
      console.log(`CAPTURED ${pg} @ ${vp} hero:${info.htmlCounts.cans}cans stage:${info.stage?Math.round(info.stage.rect.width)+'x'+Math.round(info.stage.rect.height):'?'} menu:${info.menuFigs.length?info.menuFigs.map(f=>Math.round(f.rect.width)+'x'+Math.round(f.rect.height)).join(' '):'n/a'} overflow:${info.doc.scrollW-info.doc.clientW} sheets:${info.sheets.map(s=>(s.href||'inline').split('/').pop()+':'+s.count).join(',')}`);
      await page.close();
    }
  }
  await browser.close();
  console.log('ALL CAPTURES DONE');
})();
