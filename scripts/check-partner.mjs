import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSite} from './build.mjs';
import {renderPartnerPages} from './lib/render-partner.mjs';
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
  assert.equal((html.match(/<h2>Follow the cycle<\/h2>/g)||[]).length,2);
  assert.match(html,/Strategy · gross of fees/);
  assert.equal((html.match(/class="allocation-track"/g)||[]).length,6);
  const desktop=html.match(/<svg class="v7-chart-desktop"[\s\S]*?<\/svg>/)[0];
  assert.deepEqual([...desktop.matchAll(/points="([^"]+)"/g)].map(x=>x[1]),points,'financial chart points unchanged');
  assert.match(html,/31 Oct 2026/);
  assert.match(html,/data-performance-view-target="monthly"/);
  assert.match(html,/monthly-return-chart/);
  assert.match(html,/monthly-history-table/);
  const monthlyDesktop=html.match(/<div class="chart publication-chart monthly-return-chart"[\s\S]*?<\/svg>/)[0].match(/<svg[\s\S]*?<\/svg>/)[0].replace(' class="v7-chart-desktop"','');
  assert.equal(monthlyDesktop,baselineMonthly,'monthly bars and values unchanged');
  assert.match(html,/<th scope="row">Last month<\/th><td>−2.3%<\/td><td>−6.7%<\/td>/);
 }else{
  assert.equal((html.match(/<details class="seat" open>/g)||[]).length,1);
  assert.match(html,/assets\/portrait.jpeg/);
  assert.match(html,/data-copy-email="vlad@whenintelligenceisfree.com"/);
  assert.ok(!html.includes('Works internationally'));
  assert.match(html,/>Book a call ↗<\/a>/);
 }
}
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
