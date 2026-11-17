import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSite} from './build.mjs';
import {renderPartnerPages} from './lib/render-partner.mjs';
import {allocationTenths,chartAxisLabels} from './lib/render-landing.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=p=>readFile(resolve(root,p),'utf8');
await buildSite({requirePublication:true});
const baseline=await read('dist/investments/index.html');
const baselineMonthly=baseline.match(/<div class="chart publication-chart monthly-return-chart"[\s\S]*?<\/svg>/)[0].match(/<svg[\s\S]*?<\/svg>/)[0];
const points=[...baseline.match(/<div class="chart publication-chart"[\s\S]*?<\/svg>/)[0].matchAll(/points="([^"]+)"/g)].map(x=>x[1]);
await renderPartnerPages(root,{production:true});
for(const route of ['', 'invest/']){
 const html=await read(`dist/${route}index.html`);
 assert.equal((html.match(/<h1>/g)||[]).length,1);
 assert.match(html,/index,follow/);
 assert.ok(html.includes(`rel="canonical" href="https://whenintelligenceisfree.com/${route}"`));
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length,'unique ids');
 for(const match of html.matchAll(/(?:href|src)="([^"?]+)(?:\?[^"]*)?"/g)){
  const url=match[1];
  if(url.startsWith('#'))assert.ok(ids.includes(url.slice(1)),`anchor ${url}`);
  if(url.startsWith('/')){
   const path=url.split('#')[0];
   await access(resolve(root,'dist',path.slice(1)+(path.endsWith('/')?'index.html':'')));
   if(url.includes('#'))assert.ok((await read(`dist/${path.slice(1)}${path.endsWith('/')?'index.html':''}`)).includes(`id="${url.split('#')[1]}"`));
  }
 }
 assert.ok(!/href="\/(strategy|performance|certificate|letter|about)\//.test(html));
 assert.equal(html,await read(`dist/client/${route}index.html`));
 assert.match(html,/assets\/site.css/);
 assert.ok(!html.includes('brand-tagline'));
 assert.match(html,/<p class="footer-disclaimer">Not investment advice or an offer<\/p>/);
 assert.match(html,/WIF_brandmark_transparent_dark.png/);
 assert.ok(!html.includes('viewBox="0 0 36 48"'));
 if(route){
  assert.match(html,/src="https:\/\/read.whenintelligenceisfree.com\/embed\?transparent=1"/);
  assert.ok(!html.includes('Free, by email, via Substack'));
  assert.ok(!html.includes('The research behind it'));
  assert.ok(!html.includes('Invest sections'));
  assert.equal((html.match(/<h2>Follow the cycle<\/h2>/g)||[]).length,1);
  assert.match(html,/title="Subscribe to the monthly review"/);
  const positions=['invest-hero','id="performance"','id="portfolio"','id="reviews"','id="monthly-letter"'].map(marker=>html.indexOf(marker));
  assert.ok(positions.every((p,i)=>p>=0&&(!i||p>positions[i-1])),'proof precedes reviews and the single subscription');
  assert.ok(html.indexOf('Who gets rich when intelligence is free?')>html.indexOf('id="reviews"'));
  assert.match(html,/September 2026/);
  assert.ok(!/<h3>[^<]*↗/.test(html));
  assert.match(html,/<th colspan="3" scope="rowgroup">Recent periods<\/th>/);
  assert.match(html,/aria-describedby="cumulative-description"/);
  assert.match(html,/aria-describedby="monthly-description"/);
  assert.match(html,/Strategy · gross of fees/);
  assert.equal((html.match(/class="allocation-track"/g)||[]).length,6);
  const desktop=html.match(/<svg[^>]*class="v7-chart-desktop"[\s\S]*?<\/svg>/)[0];
  assert.deepEqual([...desktop.matchAll(/points="([^"]+)"/g)].map(x=>x[1]),points,'financial chart points unchanged');
  assert.match(html,/31 Oct 2026/);
  assert.match(html,/data-performance-view-target="monthly"/);
  assert.match(html,/monthly-return-chart/);
  assert.match(html,/monthly-history-table/);
  const monthlyDesktop=html.match(/<div class="chart publication-chart monthly-return-chart"[\s\S]*?<\/svg>/)[0].match(/<svg[\s\S]*?<\/svg>/)[0].replace(' class="v7-chart-desktop"','').replace(' aria-describedby="monthly-description"','');
  assert.equal(monthlyDesktop,chartAxisLabels(baselineMonthly),'monthly bars and values unchanged; axis labels standardised');
  assert.match(html,/<th scope="row">Last month<\/th><td>−2.3%<\/td><td>−6.7%<\/td>/);
 }else{
  assert.equal((html.match(/<details class="seat" open>/g)||[]).length,1);
  assert.match(html,/assets\/portrait.jpeg/);
  assert.match(html,/href="mailto:&#118;/);
  assert.match(html,/>Email<\/a>/);
  assert.ok(html.indexOf('>Email</a>')<html.indexOf('>Book a call ↗</a>'));
  assert.match(html,/id="record"/);assert.ok(!html.includes('#build'));
  assert.ok(!html.includes('Why it matters now'));
  assert.match(html,/<h3>A live portfolio since January 2025<\/h3>/);
  const person=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
  assert.equal(person['@type'],'Person');assert.ok(!('jobTitle' in person));
  assert.ok(!html.includes('Works internationally'));
  assert.match(html,/>Book a call ↗<\/a>/);
 }
 assert.ok(!html.includes('—'),'no em dashes in published HTML');
 assert.match(html,/property="og:locale" content="en_GB"/);
 assert.ok(!/\b(?:clients|fund|certificate|LeverageAI)\b/i.test(html));
 assert.match(html,/rel="apple-touch-icon"/);assert.match(html,/rel="icon"/);
}
const weights=[13.103518,12.798137,9.020065,1.953474,29.269537,33.855269];
assert.deepEqual(allocationTenths(weights),[13.1,12.8,9,1.9,29.3,33.9]);
assert.equal(allocationTenths(weights).reduce((sum,v)=>sum+Math.round(v*10),0),1000);
assert.deepEqual(allocationTenths([1,1,1]),[33.4,33.3,33.3],'stable tie order');
for(const old of ['about','strategy','performance','certificate','letter','investments']){
 await assert.rejects(access(resolve(root,`dist/${old}/index.html`)));
}
const sitemap=await read('dist/sitemap.xml');
assert.equal((sitemap.match(/<loc>/g)||[]).length,2);
const worker=await import('../dist/_worker.js?landing');
for(const path of ['/about','/about/','/about/index.html']){
 const response=await worker.default.fetch(new Request('https://example.test'+path+'?from=old'),{});
 assert.equal(response.status,301);assert.equal(response.headers.get('Location'),'https://example.test/?from=old');
}
console.log('Landing checks passed: routes, anchors, assets, embeds, chart provenance, allocation, indexing and About redirects.');
