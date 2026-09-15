const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const fs = require('fs');
(async()=>{
const browser = await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL ? {channel:process.env.BROWSER_CHANNEL} : {})});
const dir='docs/design-2026-09-15/screenshots/network-final';fs.mkdirSync(dir,{recursive:true});
const results=[];
for(const width of [1440,390,768,320]){
 const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1});
 const page=await context.newPage();
 for(const route of ['home','investments','advisory','about']){
  if(width===320&&route!=='home')continue;
  await page.goto('http://127.0.0.1:4173/'+(route==='home'?'':route+'/'),{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('#subscribe').scrollIntoViewIfNeeded();
  await page.frameLocator('iframe.subscription-iframe').locator('input[type="email"]').waitFor({state:'visible',timeout:25000});
  await page.waitForTimeout(500);
  const report=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,footerPadding:getComputedStyle(document.querySelector('#subscribe')).paddingTop,embed:document.querySelector('iframe').getBoundingClientRect().toJSON(),headings:[...document.querySelectorAll('h1,h2')].map(h=>({text:h.textContent,width:h.clientWidth,height:h.clientHeight})),portfolio:[...document.querySelectorAll('.portfolio-column h3,.portfolio-column table,.portfolio-column tbody')].map(e=>({tag:e.tagName,rect:e.getBoundingClientRect().toJSON()})),framework:[...document.querySelectorAll('.framework-item p')].map(e=>({height:e.clientHeight,lineHeight:getComputedStyle(e).lineHeight,width:e.clientWidth})),fonts:document.fonts.check('600 48px Fraunces')}));
  const iframe=page.frames().find(f=>f.url().includes('/embed'));
  if(iframe){report.iframeUrl=iframe.url();report.iframeContent=await iframe.locator('body').innerText().catch(e=>e.message);report.iframeLayout=await iframe.evaluate(()=>({scrollHeight:document.documentElement.scrollHeight,height:innerHeight,width:innerWidth,bodyBackground:getComputedStyle(document.body).backgroundColor,controls:[...document.querySelectorAll('input,button,a')].filter(e=>e.getBoundingClientRect().height>0).map(e=>({tag:e.tagName,text:e.textContent,rect:e.getBoundingClientRect().toJSON(),color:getComputedStyle(e).color}))})).catch(e=>({error:e.message}));}
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:`${dir}/${route}-${width}.png`,fullPage:true});
  if(width===320)await page.locator('#subscribe').screenshot({path:`${dir}/embed-320.png`});
  results.push({route,width,...report});
  fs.writeFileSync('docs/design-2026-09-15/network-final-measurements.json',JSON.stringify(results,null,2));
 }
 await context.close();
}
fs.writeFileSync('docs/design-2026-09-15/network-final-measurements.json',JSON.stringify(results,null,2));
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
