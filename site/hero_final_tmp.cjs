const pp=require('puppeteer-core');
(async()=>{
  const browser=await pp.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:'new',args:['--no-sandbox','--disable-setuid-sandbox','--disable-gpu']});
  const vps=[320,375,390,414,480,767,768,1024,1440,1920];
  for(const vp of vps){
    const page=await browser.newPage();
    await page.setViewport({width:vp,height:900});
    await page.goto('http://127.0.0.1:5173/index.html',{waitUntil:'networkidle0',timeout:30000});
    await new Promise(r=>setTimeout(r,2000));
    const data=await page.evaluate(()=>{
      const qs=s=>document.querySelector(s);
      const qsa=s=>[...document.querySelectorAll(s)];
      const cs=(el,props)=>{ if(!el) return null; const s=getComputedStyle(el); const o={}; props.forEach(p=>o[p]=s[p]); return o; };
      const hero=qs('.tpm-hero'), inner=qs('.tpm-hero-inner'), visual=qs('.tpm-hero-visual'), stage=qs('.tpm-can-stage');
      const cans=qsa('.tpm-can');
      const getRect=e=>{ const r=e.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top),left:Math.round(r.left),right:Math.round(r.right),bottom:Math.round(r.bottom)} };
      return {
        vp:innerWidth,
        counts:{hero:qsa('.tpm-hero').length, visual:qsa('.tpm-hero-visual').length, stage:qsa('.tpm-can-stage').length, cans:cans.length, mango:qsa('.tpm-can--mango').length, blue:qsa('.tpm-can--blue').length, straw:qsa('.tpm-can--strawberry').length},
        hero: hero?{rect:getRect(hero), cs:cs(hero,['display','position','width','height','overflow','visibility','opacity'])}:null,
        inner: inner?{rect:getRect(inner), cs:cs(inner,['display','gridTemplateColumns','gap','width','height'])}:null,
        visual: visual?{rect:getRect(visual), cs:cs(visual,['display','width','height','minHeight','opacity','visibility','transform','position']), inline:visual.getAttribute('style'), cls:visual.className}:null,
        stage: stage?{rect:getRect(stage), cs:cs(stage,['display','width','height','position','perspective','transformStyle','overflow']), inline:stage.getAttribute('style')}:null,
        cans: cans.map(c=>({cls:c.className, rect:getRect(c), cs:cs(c,['display','position','width','height','left','top','transform','opacity','visibility','zIndex','filter']), inline:c.getAttribute('style')})),
        overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
        hasGSAP:typeof gsap!=='undefined',
        heroVisualOpacity: visual?parseFloat(getComputedStyle(visual).opacity):null,
        canOpacities:cans.map(c=>parseFloat(getComputedStyle(c).opacity)),
      };
    });
    console.log(`\n=== ${vp} ===`);
    console.log(`counts hero${data.counts.hero} visual${data.counts.visual} stage${data.counts.stage} cans${data.counts.cans} mango${data.counts.mango} blue${data.counts.blue} straw${data.counts.straw} overflow${data.overflow} gsap${data.hasGSAP}`);
    if(data.visual) console.log(`visual ${data.visual.rect.w}x${data.visual.rect.h} @${data.visual.rect.x},${data.visual.rect.y} opacity${data.visual.cs.opacity} vis${data.visual.cs.visibility} display${data.visual.cs.display} transform:${data.visual.cs.transform}`);
    if(data.stage) console.log(`stage ${data.stage.rect.w}x${data.stage.rect.h} @${data.stage.rect.x},${data.stage.rect.y} display${data.stage.cs.display}`);
    data.cans.forEach(c=>console.log(`  ${c.cls.split(' ')[1]} ${c.rect.w}x${c.rect.h} @${c.rect.x},${c.rect.y} left${c.cs.left} top${c.cs.top} opacity${c.cs.opacity} vis${c.cs.visibility} disp${c.cs.display} z${c.cs.zIndex} transform:${c.cs.transform} inline:${c.inline}`));
    // check inside stage
    if(data.stage && data.cans.length===3){
      const stageRect=data.stage.rect;
      const inside=data.cans.every(c=> c.rect.x >= stageRect.x-2 && c.rect.x + c.rect.w <= stageRect.x + stageRect.w + 2 && c.rect.y >= stageRect.y-5 && c.rect.y + c.rect.h <= stageRect.y + stageRect.h + 20);
      const overlapping=data.cans[0].rect.x + data.cans[0].rect.w > data.cans[1].rect.x && data.cans[1].rect.x + data.cans[1].rect.w > data.cans[2].rect.x;
      console.log(`  insideStage:${inside} overlapping:${overlapping} blueFront:${data.cans[1].cs.zIndex==='3'}`);
    }
    await page.screenshot({path:`D:/code/TMP-The premium mart/site/hero_${vp}.png`,fullPage:false});
    await page.close();
  }
  await browser.close();
})();
