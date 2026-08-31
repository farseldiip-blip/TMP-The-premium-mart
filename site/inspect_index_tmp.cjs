const pp=require('puppeteer-core');
(async()=>{
  const browser=await pp.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:'new',args:['--no-sandbox','--disable-setuid-sandbox','--disable-gpu']});
  const page=await browser.newPage();
  await page.setViewport({width:390,height:1200});
  await page.goto('http://127.0.0.1:5173/index.html',{waitUntil:'networkidle0',timeout:30000});
  await new Promise(r=>setTimeout(r,2000));
  await page.screenshot({path:'D:/code/TMP-The premium mart/site/index_390.png',fullPage:true});
  console.log('screenshot saved');
  const data=await page.evaluate(()=>{
    const preview=document.querySelector('.tpm-preview');
    const grid=document.querySelector('.tpm-preview-grid');
    const cards=[...document.querySelectorAll('.tpm-card')];
    const get=(el)=>{
      if(!el) return null;
      const r=el.getBoundingClientRect();
      const cs=getComputedStyle(el);
      return {cls:el.className, rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top),left:Math.round(r.left)}, cs:{display:cs.display,gridColumn:cs.gridColumn,gridRow:cs.gridRow,width:cs.width,height:cs.height,gridTemplateColumns:cs.gridTemplateColumns}};
    };
    return {
      preview:preview?{rect:preview.getBoundingClientRect().toJSON()}:null,
      grid:get(grid),
      gridCS:grid?{display:getComputedStyle(grid).display,gridTemplateColumns:getComputedStyle(grid).gridTemplateColumns,gap:getComputedStyle(grid).gap}:null,
      cards:cards.map((c,i)=>get(c)),
    };
  });
  console.log(JSON.stringify(data,null,2));
  await browser.close();
})();
