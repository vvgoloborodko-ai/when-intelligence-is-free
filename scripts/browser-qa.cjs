const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const fs=require('fs');const assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL ? {channel:process.env.BROWSER_CHANNEL} : {})});
 const results=[];
 for(const width of [1440,768,390,320]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4173/')?r.continue():r.abort());
  const page=await context.newPage();
  for(const route of ['home','investments','advisory','about','research']){
   await page.goto('http://127.0.0.1:4173/'+(route==='home'?'':route+'/'));
   await page.evaluate(()=>document.fonts.ready);
   const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,overflowElements:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left< -1)&&!e.closest('.chart,.tblwrap,.tp-chart')}).map(e=>({tag:e.tagName,cls:e.className,rect:e.getBoundingClientRect().toJSON()})),portfolio:[...document.querySelectorAll('.portfolio-column h3,.portfolio-column tbody')].map(e=>({tag:e.tagName,rect:e.getBoundingClientRect().toJSON()}))}));
   results.push({route,width,...layout});
   assert.equal(layout.overflow,false,route+' at '+width+'px has page overflow');
   if(route==='home'){
    const labelStyles=await page.evaluate(()=>['#author .eyebrow','.home-proof .eyebrow'].map(selector=>{
     const style=getComputedStyle(document.querySelector(selector));return [style.fontSize,style.fontFamily,style.letterSpacing];
    }));
    assert.deepEqual(labelStyles[0],labelStyles[1],'About and Investments section labels match');
   }
   if(route==='about'){
    const cases=page.locator('.additional-case');assert.equal(await cases.count(),3);
    for(let i=0;i<3;i++){
     const item=cases.nth(i),summary=item.locator('summary'),body=item.locator('.case-expansion');
     assert.equal(await body.isVisible(),false);
     await summary.click();assert.equal(await body.isVisible(),true);
     assert.equal(await body.locator('p').count(),2);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'expanded case fits at '+width+'px');
     await summary.press('Enter');assert.equal(await body.isVisible(),false);
     await summary.press('Space');assert.equal(await body.isVisible(),true);
     await summary.press('Space');assert.equal(await body.isVisible(),false);
    }
    for(const link of await page.locator('.about-anchor-links a').all()){
     const href=await link.getAttribute('href');await link.click();
     const top=await page.locator(href).evaluate(el=>el.getBoundingClientRect().top);
     assert.ok(top>=0&&top<1000,'section index reaches '+href);
    }
   }
   if(route==='investments' && width===1440) {
    assert.ok(Math.abs(layout.portfolio[0].rect.top-layout.portfolio[2].rect.top)<1,'portfolio heading alignment');
    assert.ok(Math.abs(layout.portfolio[1].rect.top-layout.portfolio[3].rect.top)<1,'portfolio row-region alignment');
    assert.ok(Math.abs(layout.portfolio[1].rect.bottom-layout.portfolio[3].rect.bottom)<1,'portfolio bottom alignment');
   }
   if(width<=800){await page.getByRole('button',{name:'Menu',exact:true}).click();assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'true');}
   await page.locator('a[data-nav="subscribe"]').click();
   assert.equal(new URL(page.url()).hash,'#subscribe');
   assert.equal(new URL(page.url()).pathname,route==='home'||route==='research'?'/':route==='advisory'?'/about/':'/'+route+'/');
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
   if(width<=800)await page.getByRole('button',{name:'Menu',exact:true}).click();
   await page.locator('a[data-nav="subscribe"]').click();
   assert.ok(await page.evaluate(()=>document.querySelector('#subscribe').getBoundingClientRect().top<innerHeight));
   if(route==='investments'){
    await page.getByRole('button',{name:'Monthly',exact:true}).click();
    assert.equal(await page.locator('#performance-cumulative-view').isVisible(),false);
    assert.equal(await page.locator('#performance-monthly-view').isVisible(),true);
    await page.getByRole('button',{name:'Monthly',exact:true}).press('ArrowLeft');
    assert.equal(await page.getByRole('button',{name:'Cumulative',exact:true}).getAttribute('aria-pressed'),'true');
   }
  }
  await context.close();
 }
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}});
 await nojs.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4173/')?r.continue():r.abort());
 const page=await nojs.newPage();
 for(const route of ['home','investments','advisory','about','research']){
  await page.goto('http://127.0.0.1:4173/'+(route==='home'?'':route+'/'));
  assert.equal(await page.locator('h1').isVisible(),true);
  assert.equal(await page.locator('#primary-navigation').isVisible(),true);
  if(route==='about'){
   for(const item of await page.locator('.additional-case').all()){
    await item.locator('summary').click();assert.equal(await item.locator('.case-expansion').isVisible(),true);
   }
  }
  await page.locator('a[data-nav="subscribe"]').click();
  if(route==='investments'){assert.equal(await page.locator('#performance-monthly-view').isVisible(),true);assert.equal(await page.locator('#performance-cumulative-view').isVisible(),true);}
 }
 const thesis=await page.request.get('http://127.0.0.1:4173/thesis',{maxRedirects:0});assert.equal(thesis.status(),302);assert.equal(thesis.headers().location,'https://read.whenintelligenceisfree.com/p/thesis');
 fs.writeFileSync('.release/browser-qa.json',JSON.stringify({checks:'Native navigation; local and repeated Subscribe; keyboard performance control; five no-JS routes; thesis redirect',results},null,2));
 console.log(JSON.stringify(results.filter(r=>r.overflow),null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
