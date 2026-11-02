import assert from 'node:assert/strict';
import {readFile,access,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSite} from './build.mjs';
import {renderPartnerPages,partnerMetrics} from './lib/render-partner.mjs';
import {renderInvestments} from './lib/render-investments.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=p=>readFile(resolve(root,p),'utf8');
await buildSite({requirePublication:true});
const baselinePerformance=await read('dist/investments/index.html');
const chart=baselinePerformance.match(/<div class="chart publication-chart"[\s\S]*?<\/svg>\s*<\/div>/)[0];
const publication=JSON.parse(await read('data/investments/publication.json'));
const content=JSON.parse(await read('src/content/partner-v7.json'));
const samplePublication={...publication,
 performance:publication.performance.filter(row=>row.period<=content.letter.period),
 releases:publication.releases.filter(row=>row.period<=content.letter.period),
 corrections:publication.corrections.filter(row=>row.period<=content.letter.period)};
const sampleRendered=renderInvestments(samplePublication,JSON.parse(await read('src/content/investment-sleeves.json')),{buildDate:new Date().toISOString().slice(0,10)});
const sampleChart=sampleRendered.performance.match(/<div class="chart publication-chart"[\s\S]*?<\/svg>\s*<\/div>/)[0];
await renderPartnerPages(root);
let links=new Set(),results=[];
for(const key of ['home','strategy','performance','certificate','about','letter']){
 const html=await read(`dist/${key==='home'?'':key+'/'}index.html`);
 assert.equal((html.match(/<h1>/g)||[]).length,1,key+' one h1');
 assert.ok(html.includes('src="https://read.whenintelligenceisfree.com/embed?transparent=1&light=1"'),key+' working Substack embed');
 assert.ok(html.includes('https://calendly.com/vlad-whenintelligenceisfree/30min'));
 const calls=[...html.matchAll(/<a class="btn" href="([^"]+)" target="_blank" rel="noopener">Book a call ↗<\/a>/g)].map(match=>new URL(match[1].replaceAll('&amp;','&')));
 assert.deepEqual(calls.map(url=>url.searchParams.get('utm_content')),[`${key}-nav`,...(['home','about'].includes(key)?[`${key}-hero`]:[]),`${key}-close`],key+' tracked call positions');
 for(const url of calls){assert.equal(url.searchParams.get('utm_source'),'site');assert.equal(url.searchParams.get('utm_medium'),'cta');}
 assert.ok(html.includes('noindex,nofollow'),key+' stays a preview');
 assert.ok(!/href="#"/i.test(html));
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,key+' unique IDs');
 for(const m of html.matchAll(/(?:href|src)="([^"?#]+)(?:[?#][^"]*)?"/g)){
  let url=m[1];if(url.startsWith('/')){if(url.endsWith('/'))url+='index.html';await access(resolve(root,'dist',url.slice(1)));}else if(url.startsWith('https:'))links.add(url);
 }
 if(['performance','letter'].includes(key)){
  const originalSvg=(key==='letter'?sampleChart:chart).match(/<svg[\s\S]*?<\/svg>/)[0];
  const desktopSvg=html.match(/<svg class="v7-chart-desktop"[\s\S]*?<\/svg>/)[0].replace(' class="v7-chart-desktop"','');
  assert.equal(desktopSvg,originalSvg,key+' exact desktop production chart');
  const mobileSvg=html.match(/<svg class="v7-chart-mobile"[\s\S]*?<\/svg>/)[0];
  const points=svg=>[...svg.matchAll(/points="([^"]+)"/g)].map(x=>x[1].split(' ').map(p=>p.split(',').map(Number)));
  const before=points(originalSvg),after=points(mobileSvg);
  assert.deepEqual(after.map(series=>series.map(p=>p[1])),before.map(series=>series.map(p=>p[1])),key+' mobile series keeps every value and period');
  for(let j=0;j<before.length;j++)for(let i=0;i<before[j].length;i++)assert.ok(Math.abs(after[j][i][0]-(36+(before[j][i][0]-60)*252/532))<0.006,key+' mobile x mapping');
  const endpointValues=[...originalSvg.matchAll(/<g class="chart-end-label"[\s\S]*?<text[^>]*>([^<]+)<\/text>/g)].map(match=>match[1]);
  assert.equal(endpointValues.length,2,key+' both endpoint labels present');
  for(const value of endpointValues)assert.ok(mobileSvg.includes(value),key+' both endpoint results');
 }
 if(key==='performance'){
  assert.equal((html.match(/class="v7-return-group"/g)||[]).length,3,'three return groups in one table');
  assert.equal((html.match(/class="v7-allocation-track"/g)||[]).length,6,'six allocation ranges');
  assert.ok(html.includes('31 Oct 2026'),'October close context');
  assert.match(html,/<th scope="row">Last month<\/th><td>−2\.3%<\/td><td>−6\.7%<\/td>/,'October monthly returns');
  assert.match(html,/<span>Reserve<\/span><strong>33\.9%<\/strong>/,'October allocation');
  assert.match(html,/<th scope="row">iShares USD Treasury Bond 0-1yr UCITS ETF<\/th><td>Reserve<\/td><td>15\.7%<\/td>/,'October holdings');
  assert.ok(html.indexOf('https://read.whenintelligenceisfree.com/p/2610')<html.indexOf('https://read.whenintelligenceisfree.com/p/2609'),'October review precedes September');
 }
 if(key==='letter'){
  assert.match(html,/<div class="val">−0\.8%<\/div><div class="lbl">Strategy, September/,'September sample monthly result retained');
  assert.match(html,/<div class="val">\+3\.2%<\/div><div class="lbl">Nasdaq-100, September/,'September sample benchmark retained');
  assert.ok(html.includes('+77.8%')&&html.includes('+44.7%'),'September cumulative results retained');
  assert.ok(!html.includes('Oct 2026'),'September sample chart excludes October');
 }
 if(key==='home'){
  assert.ok(html.includes('31 Oct 2026'),'home uses October close');
  assert.match(html,/<strong>−0\.8%<small>Strategy<\/small>/,'sample preview retains September figures');
 }
 results.push({route:key,status:'passed'});
}
assert.equal(await read('dist/assets/site.css'),await read('src/styles/site.css'));
assert.equal(await read('dist/assets/site.js'),await read('src/scripts/site.js'));
const up=partnerMetrics([{strategyReturnPct:10,benchmarkReturnPct:5},{strategyReturnPct:10,benchmarkReturnPct:5}]);
assert.ok(Math.abs(up.compound(up.s)-21)<1e-10);assert.equal(up.dd(up.s),0);
const down=partnerMetrics([{strategyReturnPct:25,benchmarkReturnPct:20},{strategyReturnPct:-20,benchmarkReturnPct:-10}]);
assert.ok(Math.abs(down.compound(down.s))<1e-10);assert.ok(Math.abs(down.dd(down.s)+20)<1e-10);
const worker=await import('../dist/_worker.js?qa');
for(const path of ['/investments','/investments/','/investments/index.html']){
 const r=await worker.default.fetch(new Request('https://example.test'+path+'?source=old'),{});assert.equal(r.status,301);assert.equal(r.headers.get('Location'),'https://example.test/performance/?source=old');
}
await buildSite({requirePublication:true});
await renderPartnerPages(root,{production:true});
for(const key of ['home','strategy','performance','certificate','about','letter']){
 const path=key==='home'?'/':`/${key}/`;
 const html=await read(`dist/${key==='home'?'':key+'/'}index.html`);
 assert.ok(html.includes('content="index,follow,max-image-preview:large"'),key+' production indexing');
 assert.ok(html.includes(`rel="canonical" href="https://whenintelligenceisfree.com${path}"`),key+' canonical');
 assert.ok(!html.includes('brand-strategy'),key+' logo has no strategy subtitle');
 assert.ok((await read('dist/sitemap.xml')).includes(`<loc>https://whenintelligenceisfree.com${path}</loc>`),key+' in sitemap');
}
assert.equal(await read('dist/robots.txt'),await read('src/static/robots.txt'));
const about=await read('dist/about/index.html');
for(const title of ['Enterprise adoption','The founder','The scale-up and the merger','Committed capital']) assert.ok(about.includes(title),'v10 seat '+title);
assert.equal((about.match(/class="v10-application"/g)||[]).length,4,'four experience applications');
assert.ok(!about.includes('How the strategy is run'),'old About process removed');
const evidence={results,production_indexing:true,about_v10:true,production_css_unchanged:true,production_js_unchanged:true,charts_match_production_renderer:true,old_investments_redirects:true,external_links:[...links]};
await writeFile(resolve(root,'.release/partner-checks.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
