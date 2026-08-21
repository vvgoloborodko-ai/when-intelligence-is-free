import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyApprovedCopyChanges } from "./lib/approved-copy.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = resolve(ROOT, "WIIF_Landing_v3_Mock_2026-08-18.html");
const CONTENT = resolve(ROOT, "src/content/approved-public-content.html");
const COPY_CHANGES = resolve(ROOT, "src/content/approved-copy-changes.json");
const STYLES = resolve(ROOT, "src/styles/site.css");
const CLIENT = resolve(ROOT, "src/scripts/site.js");

function capture(source, pattern, label) {
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Could not extract ${label} from the approved baseline.`);
  }
  return match[1].trim();
}

function markInvestmentBlocks(body) {
  const start = body.indexOf("<!-- ==================== INVESTMENTS ==================== -->");
  const end = body.indexOf("<!-- ==================== ADVISORY ==================== -->");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("Could not locate the Investments view in the approved baseline.");
  }

  let investments = body.slice(start, end);
  let sectionIndex = 0;
  const names = new Map([
    [2, "performance"],
    [3, "composition"],
    [4, "attribution"]
  ]);

  investments = investments.replace(/<section(?=[\s>])/g, (tag) => {
    sectionIndex += 1;
    const block = names.get(sectionIndex);
    return block ? `${tag} data-investments-block="${block}"` : tag;
  });
  investments = investments.replace(
    '<aside class="facts">',
    '<aside class="facts" data-investments-facts>'
  );

  if (sectionIndex !== 7 || !investments.includes("data-investments-facts")) {
    throw new Error("The approved Investments structure changed; review the extractor before regenerating.");
  }

  return `${body.slice(0, start)}${investments}${body.slice(end)}`;
}

function makeProgressive(body) {
  let output = body
    .replace(/<main id="view-([^"]+)" class="view">/g, '<section id="$1" class="view" data-view="$1">')
    .replace(/<main id="view-([^"]+)" class="view active">/g, '<section id="$1" class="view active" data-view="$1">')
    .replace(/<\/main>/g, "</section>")
    .replace(/<span><span class="n">/g, '<div><span class="n">')
    .replace(/<\/h4><\/span>/g, "</h4></div>")
    .replaceAll("<h4>", "<h2>")
    .replaceAll("</h4>", "</h2>")
    .replace(/(<div class="step"><div class="k">[^<]*<\/div>)<h3>([^<]*)<\/h3>/g, "$1<h2>$2</h2>")
    .replace(/<div class="eyebrow" style="margin-bottom:0">(Performance|Composition|Attribution)<\/div>/g, '<h2 class="eyebrow" style="margin-bottom:0">$1</h2>')
    .replace('<div class="eyebrow" style="margin-bottom:0">Top holdings</div>', '<h3 class="eyebrow" style="margin-bottom:0">Top holdings</h3>')
    .replace("<h2>A living map of the post-AI economy</h2>", '<h1 class="surface-title">A living map of the post-AI economy</h1>')
    .replace("<h2>The thesis, held as positions</h2>", '<h1 class="surface-title">The thesis, held as positions</h1>')
    .replace("<h2>Turn the AI shift into a clearer strategic choice</h2>", '<h1 class="surface-title">Turn the AI shift into a clearer strategic choice</h1>');

  const firstView = output.indexOf("<!-- ==================== HOME ==================== -->");
  const footer = output.indexOf("<footer>");
  if (firstView < 0 || footer < 0 || footer <= firstView) {
    throw new Error("Could not form the single main landmark around the approved views.");
  }
  output = `${output.slice(0, firstView)}<main id="site-content">\n${output.slice(firstView, footer)}</main>\n\n${output.slice(footer)}`;
  return output;
}

function separateInlineLayout(body) {
  const declarations = new Map();
  const html = body.replace(/<([A-Za-z][A-Za-z0-9:-]*)([^<>]*?)\sstyle="([^"]*)"([^<>]*?)>/g, (tag, name, before, style, after) => {
    if (!declarations.has(style)) declarations.set(style, `approved-layout-${String(declarations.size + 1).padStart(2, "0")}`);
    const className = declarations.get(style);
    let attributes = `${before}${after}`;
    if (/\sclass="[^"]*"/.test(attributes)) {
      attributes = attributes.replace(/\sclass="([^"]*)"/, ` class="$1 ${className}"`);
    } else {
      attributes = `${attributes} class="${className}"`;
    }
    return `<${name}${attributes}>`;
  });
  if (/\sstyle=/.test(html)) throw new Error("Could not separate every approved inline layout declaration.");
  const css = [...declarations].map(([style, className]) => `.${className}{${style}}`).join("\n");
  return { html, css };
}

function makeProgressiveStyles(css) {
  let progressive = css.replace(
    /\.view\{display:none\}\r?\n\.view\.active\{display:block\}/,
    ".view{display:none}\n.view.active{display:block}"
  );
  if (!progressive.includes(".view.active{display:block}")) {
    throw new Error("Could not make the approved view styles progressively enhanced.");
  }
  progressive = progressive
    .replace(
      ".wordmark{font-family:var(--serif);font-weight:700;font-size:17px;text-decoration:none;white-space:nowrap;cursor:pointer}",
      ".wordmark{font-family:var(--serif);font-weight:700;font-size:17px;text-decoration:none;white-space:nowrap;cursor:pointer;display:flex;align-items:center;gap:9px}"
    )
    .replace(
      ".eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--amber-ink);margin-bottom:14px}",
      ".eyebrow{font-family:var(--mono);font-size:12px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:var(--amber-ink);margin:0 0 14px}"
    )
    .replace(
      ".mode h4{font-family:var(--serif);font-size:17.5px;font-weight:600;line-height:1.2;margin-top:2px}",
      ".mode h2{font-family:var(--serif);font-size:17.5px;font-weight:600;line-height:1.2;margin:2px 0 0}"
    )
    .replace(
      ".tp-card h4{font-family:var(--serif);font-size:21px;font-weight:700;line-height:1.15;margin:2px 0 2px}",
      ".tp-card h2{font-family:var(--serif);font-size:21px;font-weight:700;line-height:1.15;margin:2px 0}"
    )
    .replace(
      ".golink{font-family:var(--mono);font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;color:var(--ink);border-bottom:2px solid var(--amber);padding-bottom:2px;cursor:pointer}",
      ".golink{font-family:var(--mono);font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;color:var(--ink);border-bottom:2px solid var(--amber);padding-bottom:2px;cursor:pointer;display:inline-flex;align-items:center;min-height:24px}"
    )
    .replace(
      ".pillar a.go{font-family:var(--mono);font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;color:var(--ink);border-bottom:2px solid var(--amber);align-self:flex-start;padding-bottom:2px;cursor:pointer}",
      ".pillar a.go{font-family:var(--mono);font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;color:var(--ink);border-bottom:2px solid var(--amber);align-self:flex-start;padding-bottom:2px;cursor:pointer;display:inline-flex;align-items:center;min-height:24px}"
    )
    .replace(
      ".foot-in a{text-decoration:none;border-bottom:1px solid var(--line)}",
      ".foot-in a{text-decoration:none;border-bottom:1px solid var(--line);display:inline-flex;align-items:center;min-height:24px}"
    )
    .replace(".hero{padding:64px 0 22px}", ".hero{padding-block:64px 22px}")
    .replace(".hero{padding:44px 0 12px}", ".hero{padding-block:44px 12px}")
    .replace(".substack input{flex:1;", ".substack input{flex:1;min-width:0;");
  progressive = progressive.replace("  .tp-chart{display:none}", "  .tp-chart{overflow-x:auto}\n  .tp-chart svg{min-width:620px}");
  return `${progressive}

[id]{scroll-margin-top:96px}
.brand-logo{width:38px;height:38px;object-fit:contain;flex:none}
h1.surface-title{font-family:var(--serif);font-weight:700;font-size:clamp(27px,3.8vw,38px);line-height:1.16;letter-spacing:-.01em;margin-bottom:14px}
.step h2{font-size:20px;line-height:1.3;margin-bottom:8px}
.block-head{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:10px}
.block-head .eyebrow{margin-bottom:0}
.stale-flag{display:block;color:var(--neg);font-weight:600;margin-top:4px}
.history{margin-top:28px;border-top:1px solid var(--line);padding-top:16px}
.history summary{font-family:var(--mono);font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink);cursor:pointer;margin-bottom:14px}
.approved-commentary{margin-top:20px;color:var(--ink2)}
.publication-commentary{width:100%;max-width:none;padding-top:20px;border-top:1px solid var(--line)}
.comp-row:last-child{border-bottom:none}
.substack .st{display:block}
.facts dd,.approved-commentary{overflow-wrap:anywhere}
.publication-chart,.publication-statgrid{margin-top:20px}
.strategy-swatch{background:var(--amber-ink)}
.benchmark-swatch{background:#7D8FA0}
.publication-period-table{margin-top:24px}
.publication-composition-rows,.publication-attribution-grid{margin-top:18px}
.publication-range-note{margin-top:14px}
.publication-holdings{margin-top:34px}
.publication-holdings-table{margin-top:14px}
.holding-identity{display:flex;align-items:center;flex-wrap:wrap;gap:7px}
.holding-ticker{display:inline-flex;align-items:center;min-height:20px;padding:1px 6px;border:1px solid #D6C69F;border-radius:4px;background:#FFF7E5;color:var(--amber-ink);font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.06em}
.publication-attribution-grid{align-items:start}
.publication-neutral-attribution{margin-top:16px;max-width:520px}
.subscribe-embed{max-width:520px;margin:22px auto 0;text-align:center}
.subscribe-embed iframe{display:block;width:480px;max-width:100%;height:320px;margin:0 auto;border:1px solid #EEE;background:#fff}

.home-investments-proof{padding:18px 0;background:var(--card);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.home-investments-proof p{font-family:var(--mono);font-size:12.5px;line-height:1.7;color:var(--ink2)}
.home-investments-proof strong{font-weight:600}
.home-investments-proof a{color:var(--ink);font-style:italic;text-decoration:none;border-bottom:2px solid var(--amber);white-space:nowrap}
.mode[href]{color:inherit;text-decoration:none}
.mode[href]:focus-visible{outline:2px solid var(--amber-ink);outline-offset:3px}
.unlock-subcopy{font-family:var(--serif);font-weight:600;color:var(--unl)!important;margin-bottom:7px}
.research-index-grid{display:grid;grid-template-columns:1.3fr .7fr;gap:42px}
.essay-index-row{display:flex;justify-content:space-between;gap:20px;padding:18px 0;border-bottom:1px solid var(--line);color:inherit;text-decoration:none}
.essay-index-row:first-child{border-top:1px solid var(--line)}
.essay-index-copy{display:flex;flex-direction:column;gap:5px}
.essay-index-title{font-family:var(--serif);font-weight:600;font-size:19px}
.essay-index-standfirst{color:var(--ink2);font-size:14.5px;line-height:1.45}
.essay-index-row time{flex:none;font-family:var(--mono);font-size:11.5px;color:var(--ink2);white-space:nowrap}
.pipeline-intro{margin-bottom:13px}
.pipeline-essays{display:flex;flex-wrap:wrap;gap:10px;list-style:none}
.pipeline-essays li{font-family:var(--serif);font-weight:600;border:1px solid var(--line);border-radius:8px;background:var(--card);padding:12px 16px}
.history-heading{font-family:var(--mono);font-size:12px;line-height:1.4;letter-spacing:.08em;text-transform:uppercase;color:var(--ink);margin-bottom:14px}
.history-mobile{display:none}
.mobile-history-archive{margin-top:14px}
.mobile-history-archive summary{font-family:var(--mono);font-size:12px;letter-spacing:.06em;color:var(--ink);cursor:pointer;padding:10px 0}
.close-note-head{display:flex;justify-content:space-between;gap:16px;align-items:baseline}
.close-note-head h3{font-size:24px;margin:0}
.close-note-head time{display:block;margin-top:4px;font-family:var(--mono);font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink2)}
.close-note-body{font-size:16px;line-height:1.65}
.close-note-links{display:flex;flex-wrap:wrap;gap:12px 24px;margin-top:20px}
.close-note-links a{font-family:var(--mono);font-size:12.5px;letter-spacing:.06em;color:var(--ink);text-decoration:none;border-bottom:2px solid var(--amber);padding-bottom:2px}
.advisory-second-cta{margin-top:28px}
@media (max-width:767px){
  .research-index-grid{grid-template-columns:1fr;gap:34px}
  .essay-index-row{flex-direction:column;gap:7px}
  .history-desktop{display:none}
  .history-mobile{display:block}
}

@media (max-width:640px){
  .chart{overflow-x:auto}
  .chart svg{min-width:620px}
  .history{margin-top:22px}
}
@media (max-width:420px){
  [id]{scroll-margin-top:130px}
  .nav-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 8px}
  .nav-links a{text-align:center}
  .nav-links a.btn{display:block}
  .wrap{padding-left:16px;padding-right:16px}
  .foot-in{padding-left:16px;padding-right:16px}
  .essay-row{align-items:flex-start;flex-direction:column;gap:4px}
  .essay-row .d{white-space:normal}
}
`;
}

function makeProgressiveClient(js) {
  const progressive = js
    .replace(
      "var views={home:document.getElementById('view-home'),research:document.getElementById('view-research'),investments:document.getElementById('view-investments'),advisory:document.getElementById('view-advisory')};",
      "var views={home:document.getElementById('home'),research:document.getElementById('research'),investments:document.getElementById('investments'),advisory:document.getElementById('advisory')};\n  var routes={home:'/',research:'/research/',investments:'/investments/',advisory:'/advisory/'};\n  Object.keys(views).forEach(function(k){if(!views[k]){delete views[k];}});"
    )
    .replace("if(!views[key]){key='home';}", "if(!views[key]){key=document.documentElement.getAttribute('data-initial-view')||Object.keys(views)[0];}if(!views[key]){key=Object.keys(views)[0];}")
    .replace("var k='home';", "var k=Object.keys(views)[0]||'home';")
    .replace(
      "return m?m.id.replace('view-',''):'home';",
      "return m?(m.getAttribute('data-view')||m.id):'home';"
    )
    .replace("var m=el.closest?el.closest('main'):null;", "var m=el.closest?el.closest('[data-view]'):null;")
    .replace("var raw=(location.hash||'#home').slice(1);", "var raw=(location.hash||('#'+(document.documentElement.getAttribute('data-initial-view')||'home'))).slice(1);")
    .replace("if(views[raw]){show(raw);window.scrollTo(0,0);return;}", "if(views[raw]){show(raw);window.scrollTo(0,0);return;}if(routes[raw]){location.replace(routes[raw]);return;}")
    .replace(
      "navLinks.forEach(function(a){a.classList.toggle('active',a.getAttribute('data-nav')===key);});",
      "navLinks.forEach(function(a){var current=a.getAttribute('data-nav')===key;a.classList.toggle('active',current);if(current){a.setAttribute('aria-current','page');}else{a.removeAttribute('aria-current');}});"
    )
    .replace(
      /  render\(\);\r?\n\}\)\(\);/,
      "  render();\n  document.documentElement.classList.add('js-ready');\n})();"
    );
  if (!progressive.includes("document.documentElement.classList.add('js-ready')")) {
    throw new Error("Could not make the approved client behavior progressively enhanced.");
  }
  return progressive;
}

const baseline = await readFile(BASELINE, "utf8");
const css = capture(baseline, /<style>\s*([\s\S]*?)\s*<\/style>/, "styles");
const copyChanges = JSON.parse(await readFile(COPY_CHANGES, "utf8"));
const body = applyApprovedCopyChanges(capture(baseline, /<body>\s*([\s\S]*?)\s*<script>/, "body content"), copyChanges);
const client = capture(baseline, /<script>\s*([\s\S]*?)\s*<\/script>\s*<\/body>/, "client script");
const separated = separateInlineLayout(makeProgressive(markInvestmentBlocks(body)));

await Promise.all([
  mkdir(dirname(CONTENT), { recursive: true }),
  mkdir(dirname(STYLES), { recursive: true }),
  mkdir(dirname(CLIENT), { recursive: true })
]);

await Promise.all([
  writeFile(CONTENT, `${separated.html}\n`, "utf8"),
  writeFile(STYLES, `${makeProgressiveStyles(`${css}\n\n${separated.css}`)}\n`, "utf8"),
  writeFile(CLIENT, `${makeProgressiveClient(client)}\n`, "utf8")
]);

console.log("Extracted approved body content, styles, and progressive enhancement from the immutable baseline.");
