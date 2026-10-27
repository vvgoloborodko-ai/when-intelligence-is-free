import { readFile, writeFile, mkdir, copyFile, cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { renderInvestments, escapeHtml as e } from './render-investments.mjs';
import { responsiveCharts } from './partner-charts.mjs';

const CALL = 'https://calendly.com/vlad-whenintelligenceisfree/30min';
const RESEARCH = 'https://read.whenintelligenceisfree.com/';
const button = (position='close') => `<a class="btn" href="${CALL}?utm_source=site&amp;utm_medium=cta&amp;utm_content=__PAGE__-${position}" target="_blank" rel="noopener">Book a call ↗</a>`;
const link = (href, text) => `<a class="text-link" href="${href}">${text}</a>`;
const section = (eyebrow, title, body, cls='') => `<section class="${cls}"><div class="wrap">${eyebrow ? `<p class="eyebrow">${eyebrow}</p>`:''}${title ? `<h2>${title}</h2>`:''}${body}</div></section>`;
const table = (heads,rows,cls='') => `<div class="v7-table ${cls}" tabindex="0" role="region" aria-label="${heads.join(', ')}"><table><thead><tr>${heads.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((c,i)=>i===0?`<th scope="row">${c}</th>`:`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const close = () => `<section class="advisory-close"><div class="wrap"><div><p class="eyebrow">Next step</p><h2>Is it a fit for your clients?</h2><p>A 30-minute call with the portfolio manager: the track record, the client materials and how we could work together.</p></div>${button()}</div></section>`;
const hero = (label,title,body,facts=[]) => `<div class="hero wrap ${facts.length?'investment-hero':''}"><div><p class="eyebrow">${label}</p><h1>${title}</h1><p class="premise">${body}</p></div>${facts.length?`<aside class="facts"><ul>${facts.map(f=>`<li>${f}</li>`).join('')}</ul></aside>`:''}</div>`;
const pct = (n,sign=true) => `${n<0?'−':sign&&n>0?'+':''}${Math.abs(n).toFixed(1)}%`;

// Uses the same full-precision, revision-resolved public series as production.
export function partnerMetrics(rows) {
  const s=rows.map(x=>x.strategyReturnPct), b=rows.map(x=>x.benchmarkReturnPct);
  const mean=a=>a.reduce((v,x)=>v+x,0)/a.length;
  const cov=(a,b)=>a.reduce((v,x,i)=>v+(x-mean(a))*(b[i]-mean(b)),0)/(a.length-1);
  const compound=a=>(a.reduce((v,x)=>v*(1+x/100),1)-1)*100;
  const dd=a=>{let peak=1,value=1,result=0;for(const x of a){value*=1+x/100;peak=Math.max(peak,value);result=Math.min(result,(value/peak-1)*100);}return result;};
  return {s,b,compound,annual:a=>((1+compound(a)/100)**(12/a.length)-1)*100,vol:a=>Math.sqrt(cov(a,a)*12),dd,beta:cov(s,b)/cov(b,b),correlation:cov(s,b)/Math.sqrt(cov(s,s)*cov(b,b))};
}

export async function renderPartnerPages(root, {production=false}={}) {
  const read = p=>readFile(resolve(root,p),'utf8');
  const v7=JSON.parse(await read('src/content/partner-v7.json'));
  const aboutCopy=JSON.parse(await read('src/content/about-v10.json'));
  const assetVersion=createHash('sha256').update(await read('src/styles/partner-v7.css')).update(await read('src/scripts/partner-v7.js')).digest('hex').slice(0,12);
  const publication=JSON.parse(await read('data/investments/publication.json'));
  const sleeves=JSON.parse(await read('src/content/investment-sleeves.json'));
  const rendered=renderInvestments(publication,sleeves,{buildDate:'2026-10-22'});
  const d=rendered.derived, m=partnerMetrics(d.effectivePerformance);
  const original=await read('dist/index.html');
  const header=original.slice(original.indexOf('<a class="skip-link"'),original.indexOf('<main id="site-content">'));
  const nav=header.replace(/<nav class="nav-links"[\s\S]*?<\/nav>/,`<nav class="nav-links" id="primary-navigation" aria-label="Main navigation">${['Strategy','Performance','Certificate','About'].map(x=>`<a href="/${x.toLowerCase()}/" data-nav="${x.toLowerCase()}">${x}</a>`).join('')}<a href="${RESEARCH}" target="_blank" rel="noopener">Research ↗</a>${button('nav')}</nav>`).replace('class="nav"','class="nav v7-navigation"').replace('alt="When Intelligence Is Free">','alt="When Intelligence Is Free"><span class="brand-strategy">AI Capital Cycle Strategy</span>');
  const footer=original.slice(original.indexOf('<footer'),original.indexOf('</footer>')+9)
    .replace('Follow the thesis and<br>the decisions it changes','The monthly letter')
    .replace('Get new research on emerging opportunities, evidence that changes the outlook and the reasoning behind portfolio moves.','What changed, what we decided and why.')
    .replace('Personal views ·','For professional investors ·')
    .replace(/<a[^>]*href="https:[/][/]www\.linkedin\.com[^"]*"[^>]*>[\s\S]*?<\/a>/g,'');
  const displayDate=(value,long=false)=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:long?'long':'short',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T00:00:00Z')).replace('Sept ','Sep ');
  const periodLabel=`${displayDate(publication.conventions.inception_date)}–${displayDate(d.asOfDate)}`;
  const auditLabel=publication.conventions.audit_status[0].toUpperCase()+publication.conventions.audit_status.slice(1);
  const resultContext=`${periodLabel} · ${e(publication.conventions.return_currency)} · ${e(auditLabel)}`;
  const stats=(letter=false)=>`<div class="${letter?'v7-letter-stats':'publication-statgrid'}">${(letter?[[pct(m.s.at(-1)),'Strategy, September'],[pct(m.b.at(-1)),'Nasdaq-100, September'],[pct(d.summary.strategyCumulativePct),'Strategy since Jan 2025'],[pct(d.summary.benchmarkCumulativePct),'Nasdaq-100 since Jan 2025']]:[[pct(d.summary.strategyCumulativePct),'Strategy · net'],[pct(d.summary.benchmarkCumulativePct),'Nasdaq-100 · price return'],[pct(m.dd(m.s)),'Max drawdown · month-end']]).map(([n,l])=>`<div class="stat"><div class="val">${n}</div><div class="lbl">${l}</div></div>`).join('')}</div>`;
  const homeBasis=`<p class="small conventions-date">${resultContext} · Past performance does not predict future returns.</p>`;
  const letterBasis='<p class="small conventions-date">1 Jan 2025–30 Sep 2026 · USD · Unaudited · Past performance does not predict future returns.</p>';
  const preview=`<a class="v7-letter-preview" href="/letter/" aria-label="Read the sample client letter for September 2026"><p class="eyebrow">Monthly letter · September 2026</p><h3>${v7.letter.title}</h3><div class="v7-mini-stats"><strong>${pct(m.s.at(-1))}<small>Strategy</small></strong><strong>${pct(m.b.at(-1))}<small>Nasdaq-100</small></strong></div><h4>Why</h4><p>Strategy Inc rose 15%, but silver fell 11% and chip-stock protection lost value as chips rallied.</p><h4>What we did</h4><p>Sold Cleveland-Cliffs 12% above its August close and bought transformer maker Hyosung Heavy Industries.</p><h4>What we watch</h4><p>Late-October results from the largest AI spenders, and US long-term rates above 5%.</p></a>`;
  const numberedColumns=items=>`<div class="columns three v8-numbered">${items.map(([title,body],i)=>`<article><p class="eyebrow">0${i+1}</p><h3>${title}</h3><p>${body}</p></article>`).join('')}</div>`;
  const home=hero('For wealth managers, private banks and family offices','<span>Investing in the economy</span><span class="emphasis">AI is creating</span>','AI is reshaping the economy and eroding the profits of businesses we own today. We research where those profits move next, what is worth owning and when to invest.')
    +`<div class="wrap v7-home-actions"><div class="about-actions">${button('hero')}<a class="btn outline" href="/strategy/">Explore the strategy</a></div></div>`
    +section('Track record · Live portfolio','',stats()+homeBasis+link('/performance/','Performance and holdings →'),'navy v7-proof')
    +section('Why this exists','Your clients want to benefit from the AI transformation',numberedColumns([
      ['The beneficiaries will change','The businesses leading AI today are only part of the opportunity. As adoption spreads, profits can move to suppliers, established businesses and new entrants across the economy.'],
      ['Growth is not enough','A business can grow fast while its shares disappoint. The price paid matters as much as the opportunity.'],
      ['The portfolio must evolve','As technology, competition and demand change, each investment case has to be tested again.']]))
    +section('How it invests','AI Capital Cycle Strategy',numberedColumns([
      ['Find where profits move','Research which businesses gain pricing power as AI changes costs, competition and demand across the economy.'],
      ['Pay the right price','Assess each business and its valuation against the capital cycle. Keep a reserve when prices run ahead of the opportunity.'],
      ['Review every month','Test every investment case against new results, valuations and financing conditions. Hold, add, reduce or exit as the evidence warrants.']])+link('/strategy/','Explore the strategy →'),'navy')
    +section('Working with us','Easy to hold, easy to explain',`<div class="v7-working"><div class="decision-grid">${[
      ['One security',"An actively managed certificate, in preparation, designed to sit alongside other securities at your clients' banks."],
      ['A letter to forward',`One page after each month-end: what changed, what we decided and why. Ready to share in your firm's name.</p><p>${link('/letter/','View sample client letter →')}`],
      ['A plan for changing markets','How the portfolio responds to rising markets, corrections and broken investment cases is set out in advance, with what to tell clients in each case.'],
      ['The portfolio manager on call','Direct access for your investment committee and client meetings.']].map(([t,b],i)=>`<article><span class="number">0${i+1}</span><div><h3>${t}</h3><p>${b}</p></div></article>`).join('')}</div>${preview}</div>${link('/certificate/','Certificate details →')}`)+close();
  const essay=(title,body,url)=>`<div class="v7-essay"><h3>${title}</h3><p>${body}</p>${link(url,'Read the essay ↗')}</div>`;
  // Preserve the phase marked as current in the approved source; this edit does not set a new phase.
  const approvedSource=await read('src/content/approved-public-content.html');
  const currentPhase=approvedSource.match(/<div class="n">Phase [^<]*\bnow<\/div>\s*<h[23]>([^<]+)<\/h[23]>/i)?.[1];
  const phases=[['Buildout','Capital finances new capacity before its returns are proven.'],['Digestion','Cash flows must justify the investment already made.'],['Diffusion','Adoption spreads and changes profits across the economy.']];
  const strategy=hero('Strategy','AI Capital Cycle <span class="emphasis">Strategy</span>','A concentrated portfolio across the AI transition, from the infrastructure AI depends on to the businesses it makes more profitable, reviewed every month against the evidence and the capital cycle.',['Global equities, ETFs and options','Concentrated, long-biased','No leverage'])
    +section('01 · What it owns','Six parts across the AI transition','<p>AI changes what businesses can charge for, what they need to operate and which new services become viable. The portfolio invests across that change, alongside Macro positions and a reserve.</p>'+table(['Part','What it holds','Long-term range'],v7.sleeves.map(([,n,b,r])=>[n,b,r]),'v7-parts')+essay('Who Gets Rich When Intelligence Is Free?','Where profits move as AI erodes the businesses we own today, and how to invest through the change.',RESEARCH+'p/thesis'))
    +section('02 · Investing through the cycle','The opportunity changes with the cycle','<p class="cycle-intro">Railways, electricity and the internet showed how investment booms can run ahead of the profits they create. AI brings the same question: which businesses will earn lasting returns, and what price makes them worth owning? The strategy assesses both the opportunity and the conditions for investing in it.</p><img class="cycle-panorama" src="/assets/illustrations/ai-capital-cycle-panorama.png" width="2172" height="724" alt="An unfinished bridge above a river gorge, with construction on the near bank and a sunlit city across the missing span." loading="lazy">'+`<ol class="cycle-phases">${phases.map(([name,body])=>`<li${name===currentPhase?' aria-current="step"':''}><h3>${name}${name===currentPhase?' · Now':''}</h3><p>${body}</p></li>`).join('')}</ol>`+table(['Conditions','Portfolio response','In the monthly letter'],[
      ['Prices run ahead of fundamentals','Stay selective and keep a reserve','Why returns can trail an AI index meanwhile'],
      ['A correction brings attractive valuations','Add researched investments in stages','What we bought, and why the price now makes sense'],
      ['Financing conditions change','Reassess exposures, entry prices and the reserve','Which exposures changed, and why'],
      ['An investment case stops working','Reduce or exit the position','What changed in the business, and why it changed the decision']],'v7-conditions')+essay('Every Technology Boom Borrows From the Future','Why AI can be one of the best technologies of our time and one of the worst investments of its first decade.',RESEARCH+'p/time-path'),'navy')
    +section('03 · Decisions and risk','Rules set before decisions','<div class="method-grid v8-decisions">'+[
      ['A case before capital','Every investment starts with a written case: the business, its price and what it has to deliver.'],
      ['Exit conditions','The evidence that would weaken or end each case is defined in advance.'],
      ['A monthly review','Results, valuations and financing conditions are checked against each case. The review can change a holding or confirm it.'],
      ['Exposure checks','Shared sensitivities across holdings, such as AI spending, interest rates and financing, are measured together.'],
      ['Staged buying','The reserve is invested in stages, never all at once.'],
      ['One decision-maker','AI tools support research and monitoring. The portfolio manager makes every investment decision.']].map(([t,b])=>`<article><h3>${t}</h3><p>${b}</p></article>`).join('')+'</div>')+close();
  const latestYear=Number(d.currentPeriod.slice(0,4));
  const rowFor=(name,rows,annual=false)=>[name,...['strategyReturnPct','benchmarkReturnPct'].map(key=>pct((annual?m.annual:m.compound)(rows.map(row=>row[key]))))];
  const calendarYears=[...new Set(d.effectivePerformance.map(row=>Number(row.period.slice(0,4))))].filter(year=>year<latestYear&&d.effectivePerformance.filter(row=>row.period.startsWith(year+'-')).length===12);
  const returnGroups=[
    ['Recent periods',[
      rowFor('Last month',d.effectivePerformance.slice(-1)),
      rowFor('Last 3 months',d.effectivePerformance.slice(-3)),
      rowFor('Year to date',d.effectivePerformance.filter(row=>row.period.startsWith(latestYear+'-'))),
      rowFor('Last 12 months',d.effectivePerformance.slice(-12))]],
    ['Since inception',[rowFor('Cumulative',d.effectivePerformance),rowFor('Annualised',d.effectivePerformance,true)]],
    ['Calendar years',calendarYears.map(year=>rowFor(String(year),d.effectivePerformance.filter(row=>row.period.startsWith(year+'-'))))]
  ];
  const returns=`<div class="v7-table v7-numeric v7-returns" tabindex="0" role="region" aria-label="Returns"><table><thead><tr><th scope="col">Period</th><th scope="col">Strategy</th><th scope="col">Nasdaq-100</th></tr></thead>${returnGroups.map(([group,rows])=>`<tbody><tr class="v7-return-group"><th colspan="3" scope="rowgroup">${group}</th></tr>${rows.map(([name,s,b])=>`<tr><th scope="row">${name}</th><td>${s}</td><td>${b}</td></tr>`).join('')}</tbody>`).join('')}</table></div>`;
  const risk=table(['Risk','Strategy','Nasdaq-100'],[['Volatility, annualised',pct(m.vol(m.s),false),pct(m.vol(m.b),false)],['Max drawdown, month-end',pct(m.dd(m.s)),pct(m.dd(m.b))],['Beta',m.beta.toFixed(2),'1.00'],['Correlation',m.correlation.toFixed(2),'1.00']],'v7-numeric');
  const allocation=`<div class="v7-allocation"><p class="small v7-allocation-key"><span><i class="v7-current-key"></i>Current weight</span><span><i class="v7-range-key"></i>Long-term range</span></p>${v7.sleeves.map(([id,n,,r])=>{const weight=Number(d.latestRelease.composition.find(x=>x.sleeve_id===id).weight_pct_nav);const [lo,hi]=r.replace('%','').split('–').map(Number);return `<div class="v7-allocation-row"><div class="v7-allocation-label"><span>${n}</span><strong>${pct(weight,false)}</strong><span class="small">${r}</span></div><div class="v7-allocation-track" role="img" aria-label="${n}: current ${pct(weight,false)}, long-term range ${r}"><span class="v7-allocation-current" style="width:${weight/50*100}%"></span><span class="v7-allocation-range" style="left:${lo/50*100}%;width:${(hi-lo)/50*100}%"></span></div></div>`}).join('')}<div class="v7-allocation-scale small"><span>0%</span><span>25%</span><span>50%</span></div></div>`;
  const holdings=table(['Holding','Part','Weight'],[...d.latestRelease.holdings].sort((a,b)=>Number(b.weight_pct_nav)-Number(a.weight_pct_nav)).slice(0,5).map(h=>[e(h.name),v7.sleeves.find(s=>s[0]===h.sleeve_id)[1],pct(Number(h.weight_pct_nav),false)]));
  const reviews=section('','Monthly updates',`<div class="v7-reviews"><article><p class="eyebrow">September 2026</p><div><h3>Behind the index in a month led by the AI platforms</h3><p>Silver, pipelines and chip-stock protection fell, while the portfolio held little of the AI platforms leading the index.</p><div class="v7-update-links">${link('/letter/','Client letter →')}<a class="text-link" href="${RESEARCH}p/2609" target="_blank" rel="noopener">Full review ↗</a></div></div></article>${v7.reviews.slice(1).map(([date,title,body,url])=>`<article><p class="eyebrow">${date}</p><div><h3><a href="${url}" target="_blank" rel="noopener">${title} ↗</a></h3><p>${body}</p></div></article>`).join('')}</div>${link(RESEARCH+'archive','All reviews ↗')}`);
  const performanceCharts=responsiveCharts(rendered.performance
    .replace(/<div class="block-head">[\s\S]*?<\/div>\s*<\/div>/,`<h2 id="performance-heading" class="v7-sr-only">Performance</h2>`)
    .replace(/<div class="statgrid publication-statgrid">[\s\S]*?(?=<div class="performance-view-control")/,'')
    .replace(/<p class="small risk">[^<]*<\/p>/,'')
    .replace(/<div class="tblwrap performance-comparison-table publication-period-table">[\s\S]*?<\/table><\/div>/,''),d.performanceRows.map(row=>row.period));
  const performance=hero('Performance','Track record','The live portfolio run on the AI Capital Cycle Strategy since January 2025, updated after each month-end close.')
    +`<p class="wrap small v7-performance-context">${resultContext}</p>`
    +performanceCharts
    +section('','Returns and risk',`<div class="portfolio-grid v7-results"><div class="portfolio-column"><h3>Returns</h3>${returns}</div><div class="portfolio-column"><h3>Risk</h3>${risk}</div></div><p class="small v7-results-warning">Past performance does not predict future returns.</p><details class="v7-calculation-notes"><summary>Calculation notes</summary><p>Returns are those of the live portfolio, net of the trading costs recorded in it. They are not returns of the planned certificate. The Nasdaq-100 comparison uses the price index, which excludes dividends. Risk figures use month-end observations; losses within a month can be larger.</p></details>`)
    +section(`Current weights · ${displayDate(d.latestRelease.as_of_date||d.asOfDate,true)}`,'Where the portfolio stands','<p>Today the portfolio holds less in AI than its long-term ranges, with the balance in Macro and the reserve.</p>'+`<div class="portfolio-grid v7-portfolio"><div class="portfolio-column"><h3>Current allocation and long-term ranges</h3>${allocation}</div><div class="portfolio-column v7-positioning"><h3>What each part does</h3><p><strong>AI-related investments</strong><br>Businesses positioned to gain as AI changes production, services and competition.</p><p><strong>Macro</strong><br>Positions on money, financing and geopolitics. They carry their own risk and can fall with equities.</p><p><strong>Reserve</strong><br>Capital held for future purchases, with put options for protection.</p>${link('/strategy/','Explore the strategy →')}<div class="v7-holdings"><h3>Largest positions</h3>${holdings}</div></div></div>`)+reviews+close();
  const terms=[['Issuer','GenTwo'],['Broker','Interactive Brokers'],['Identifier','Swiss ISIN'],['Currency','USD'],['Minimum investment','USD 100,000'],['Subscriptions','Monthly'],['Redemptions','Quarterly'],['Valuation','Monthly, at net asset value'],['Management fee','1% a year'],['Performance fee','20% of returns above the fee benchmark, with a high-water mark'],['Fee benchmark','Nasdaq-100 Total Return'],['Eligible investors','Professional and qualified investors']];
  const certificate=hero('Certificate','One security <span class="emphasis">for your clients</span>','The AI Capital Cycle Strategy in an actively managed certificate, designed to be held alongside other securities in your clients’ portfolios.')
    +`<div class="wrap v7-certificate-intro"><p class="eyebrow v7-certificate-status">In preparation · Terms subject to final documents</p></div>`
    +section('Portfolio fit','Alongside core equity','<p>A satellite allocation for clients who want to benefit from the AI transformation. The portfolio changes as investment cases, valuations and financing conditions evolve, so returns can differ materially from an AI index.</p>')
    +section('','Key terms','<div class="v7-terms" id="terms">'+[terms.slice(0,6),terms.slice(6)].map(rows=>`<dl class="engagement-terms">${rows.map(([t,b])=>`<div><dt>${t}</dt><dd>${b}</dd></div>`).join('')}</dl>`).join('')+'</div>')
    +section('','How it is held','<ol class="v7-structure">'+[
      ['Client account','The client holds the certificate at their bank or custodian.'],
      ['Certificate','One security represents the value of the managed portfolio.'],
      ['Underlying portfolio','The portfolio manager selects and manages the investments held through the broker.']].map(([t,b])=>`<li><h3>${t}</h3><p>${b}</p></li>`).join('')+'</ol><p class="small v7-issuer-note">The certificate is a debt instrument of its issuer.</p>')+close();
  const about=`<div class="hero wrap about-hero v10-about-hero"><p class="eyebrow">${e(aboutCopy.eyebrow)}</p><div class="v7-about-intro"><div><h1><span>Vladimir</span><span>Goloborodko</span></h1><p class="premise">${e(aboutCopy.premise)}</p><div class="about-actions">${button('hero')}${link('https://www.linkedin.com/in/vgoloborodko','LinkedIn ↗')}</div></div><img class="v7-portrait" src="/assets/portrait.jpeg" alt="Vladimir Goloborodko" width="800" height="1000"></div></div>`
    +section('The experience',e(aboutCopy.experience_heading),`<p class="v10-experience-intro">${e(aboutCopy.experience_intro)}</p><div class="v10-seats">${aboutCopy.seats.map(seat=>`<article><p class="eyebrow v10-company">${e(seat.company)}</p><h3>${e(seat.title)}</h3><p class="eyebrow v10-role">${e(seat.role)}</p><p class="v10-seat-body">${e(seat.body)}</p><div class="v10-application"><p class="eyebrow">In the strategy</p><p>${e(seat.application)}</p></div></article>`).join('')}</div>${link('/strategy/','How the strategy works →')}`,'v10-experience')+close();
  const chart=responsiveCharts(rendered.performance.match(/<div class="chart publication-chart"[\s\S]*?<\/svg>\s*<\/div>/)?.[0]||'');
  const letter=`<div class="wrap v7-letter-document"><header class="v7-letter-heading"><p class="eyebrow">When Intelligence Is Free · AI Capital Cycle Strategy</p><p class="eyebrow v8-prepared-for">Prepared for clients of [your firm]</p><div class="v7-letter-meta"><p>Sample client letter</p><span>September 2026</span></div><h1>${v7.letter.title}</h1><div class="v7-letter-actions"><a class="btn outline" href="/assets/sample-client-letter-september-2026.pdf" download>Download PDF ↓</a></div></header>${stats(true)}${letterBasis}<div class="v7-letter-body">${v7.letter.sections.map(([t,b])=>`<article><h2>${t}</h2><p>${b}</p></article>`).join('')}</div>${chart}<p class="small v7-letter-footer">${link(RESEARCH+'p/2609','Full September review ↗')} · ${link('/performance/','Track record and holdings →')}</p></div>`+close();
  const pages={home,strategy,performance,certificate,about,letter};
  const descriptions={home:'Investing in the economy AI is creating. AI is reshaping the economy and eroding the profits of businesses we own today.',strategy:'What the AI Capital Cycle Strategy owns, how it invests through the cycle and how decisions are made.',performance:'Returns, risk, allocation and largest positions from the official monthly close of the live strategy.',certificate:'AI Capital Cycle Strategy certificate in preparation: proposed terms, ownership and due diligence.',about:'Vladimir Goloborodko, portfolio manager of the AI Capital Cycle Strategy. Four seats in a technology cycle: enterprise adoption, founding, scale and committed capital.',letter:'Sample monthly letter for September 2026: result, reasons, actions and what comes next.'};
  for(const [key,body] of Object.entries(pages)) {
    const path=key==='home'?'/':`/${key}/`;
    const title=key==='home'?'AI Capital Cycle Strategy — When Intelligence Is Free':`${key[0].toUpperCase()+key.slice(1)} — When Intelligence Is Free`;
    const activeNav=nav.replace(`data-nav="${key}"`,`data-nav="${key}" aria-current="page"`);
    let html=original.replace(/<title>[\s\S]*?<\/title>/,`<title>${title}</title>`)
      .replace(/(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*"/g,`$1${e(descriptions[key])}"`)
      .replace(/(<meta (?:name|property)="(?:og:title|twitter:title)" content=")[^"]*"/g,`$1${e(title)}"`)
      .replace(/(<meta property="og:url" content=")[^"]*"/,`$1https://whenintelligenceisfree.com${path}"`)
      .replace(/<link rel="canonical"[^>]+>/,`<link rel="canonical" href="https://whenintelligenceisfree.com${path}">`)
      .replace(/<meta name="robots"[^>]+>/,`<meta name="robots" content="${production?'index,follow,max-image-preview:large':'noindex,nofollow'}">`)
      .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,'')
      .replace(/<body>[\s\S]*?<script src="\/assets\/site.js/,`<body>${activeNav}<main id="site-content"><section id="${key}" class="view active v7-view" data-view="${key}">${body}</section></main>${footer}<script src="/assets/site.js`)
      .replace('</head>',`<link rel="stylesheet" href="/assets/partner-v7.css?v=${assetVersion}"></head>`)
      .replace('</body>',`<script src="/assets/partner-v7.js?v=${assetVersion}" defer></script></body>`)
      .replace('data-initial-view="home"',`data-initial-view="${key}"`).replaceAll('__PAGE__',key);
    const dest=resolve(root,'dist',key==='home'?'':key); await mkdir(dest,{recursive:true}); await writeFile(resolve(dest,'index.html'),html);
  }
  await copyFile(resolve(root,'src/documents/sample-client-letter-september-2026.pdf'),resolve(root,'dist/assets/sample-client-letter-september-2026.pdf'));
  await copyFile(resolve(root,'src/styles/partner-v7.css'),resolve(root,'dist/assets/partner-v7.css'));
  await copyFile(resolve(root,'src/scripts/partner-v7.js'),resolve(root,'dist/assets/partner-v7.js'));
  const redirects=await read('src/static/_redirects');
  await writeFile(resolve(root,'dist/_redirects'),redirects+'\n/investments /performance/ 301\n/investments/ /performance/ 301\n/investments/index.html /performance/ 301\n');
  await writeFile(resolve(root,'dist/robots.txt'),production?await read('src/static/robots.txt'):'User-agent: *\nDisallow: /\n');
  const worker=(await read('scripts/sites-worker.mjs')).replace('const url = new URL(request.url);',`const url = new URL(request.url);\n    if (["/investments", "/investments/", "/investments/index.html"].includes(url.pathname)) { url.pathname="/performance/"; return Response.redirect(url.href,301); }`);
  for(const file of ['dist/_worker.js','dist/server/index.js']) await writeFile(resolve(root,file),worker);
  await writeFile(resolve(root,'dist/sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.keys(pages).map(k=>`<url><loc>https://whenintelligenceisfree.com/${k==='home'?'':k+'/'}</loc></url>`).join('')}</urlset>`);
  for(const key of Object.keys(pages).filter(k=>k!=='home')) await cp(resolve(root,'dist',key),resolve(root,'dist/client',key),{recursive:true});
  await cp(resolve(root,'dist/assets'),resolve(root,'dist/client/assets'),{recursive:true});
  for(const file of ['index.html','_redirects','robots.txt','sitemap.xml']) await copyFile(resolve(root,'dist',file),resolve(root,'dist/client',file));
  await writeFile(resolve(root,'.release/partner-evidence.json'),JSON.stringify({preview_only:!production,source_revision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),publication_basis:publication.conventions,summary:d.summary,metrics:{annualStrategy:m.annual(m.s),annualBenchmark:m.annual(m.b),volatilityStrategy:m.vol(m.s),volatilityBenchmark:m.vol(m.b),beta:m.beta,correlation:m.correlation},routes:Object.keys(pages)},null,2));
  if(production){
    const evidence=JSON.parse(await read('.release/release-evidence.json'));
    Object.assign(evidence,{build_mode:'partner-production',production_ready:true,production_blockers:[],approval_record:'docs/partner-release-2026-10-27.md',production_published:false});
    await writeFile(resolve(root,'.release/release-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
  }
  console.log(`Built partner ${production?'production':'preview'} site with unchanged base CSS.`);
}
