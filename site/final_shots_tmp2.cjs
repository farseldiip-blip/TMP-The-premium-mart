const pp=require('puppeteer-core');
(async()=>{
  const browser=await pp.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:'new',args:['--no-sandbox','--disable-setuid-sandbox','--disable-gpu']});
  const shots=[
    {vp:390,pg:'menu.html',name:'final_390_menu.png'},
    {vp:767,pg:'menu.html',name:'final_767_menu.png'},
    {vp:768,pg:'menu.html',name:'final_768_menu.png'},
    {vp:390,pg:'index.html',name:'final_390_index.png'},
    {vp:1024,pg:'index.html',name:'final_1024_index.png'},
  ];
  for(const s of shots){
    const page=await browser.newPage();
    await page.setViewport({width:s.vp,height:900});
    await page.goto('http://127.0.0.1:5173/'+s.pg,{waitUntil:'networkidle0',timeout:30000});
    await new Promise(r=>setTimeout(r,1500));
    await page.screenshot({path:'D:/code/TMP-The premium mart/site/'+s.name,fullPage:true});
    console.log('saved '+s.name);
    await page.close();
  }
  await browser.close();
})();
