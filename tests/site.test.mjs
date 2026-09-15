import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildSite } from "../scripts/build.mjs";
import { assertValidPublication, parsePublicationBytes, parsePublicationText } from "../scripts/lib/investments.mjs";
import { previousDistinctPublicationText, selectPreviousDistinctPublicationText } from "../scripts/lib/publication-history.mjs";
import { assertInvestmentsDirectory, assertStaticDirectory } from "../scripts/lib/repository-boundary.mjs";
import { injectInvestments, renderInvestments } from "../scripts/lib/render-investments.mjs";
import sitesWorker, { isWhatsAppPreviewRequest, rewriteSocialPreviewForWhatsApp } from "../scripts/sites-worker.mjs";

const contentUrl = new URL("../src/content/approved-public-content.html", import.meta.url);
const publicationUrl = new URL("../data/investments/publication.json", import.meta.url);
const content = await readFile(contentUrl, "utf8");
const baseline = await readFile(new URL("../WIIF_Landing_v3_Mock_2026-08-18.html", import.meta.url), "utf8");
const copyChanges = JSON.parse(await readFile(new URL("../src/content/approved-copy-changes.json", import.meta.url), "utf8"));
const styles = await readFile(new URL("../src/styles/site.css", import.meta.url), "utf8");
const client = await readFile(new URL("../src/scripts/site.js", import.meta.url), "utf8");
const template = await readFile(new URL("../src/site.template.html", import.meta.url), "utf8");
const meta = JSON.parse(await readFile(new URL("../src/content/site-meta.json", import.meta.url), "utf8"));
const redirects = await readFile(new URL("../src/static/_redirects", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../src/static/sitemap.xml", import.meta.url), "utf8");
const llms = await readFile(new URL("../src/static/llms.txt", import.meta.url), "utf8");
const previewSource = await readFile(new URL("../scripts/preview.mjs", import.meta.url), "utf8");
const websiteWorkflow = await readFile(new URL("../.github/workflows/website-ci.yml", import.meta.url), "utf8");
const publicationWorkflow = await readFile(new URL("../.github/workflows/investments-publication-preview.yml", import.meta.url), "utf8");
const nodeVersion = await readFile(new URL("../.node-version", import.meta.url), "utf8");
const sleeves = JSON.parse(await readFile(new URL("../src/content/investment-sleeves.json", import.meta.url), "utf8"));
const fixtureText = await readFile(new URL("./fixtures/investments-publication.valid.json", import.meta.url), "utf8");
const workOrder = JSON.parse(await readFile(new URL("../src/content/v3-work-order.json", import.meta.url), "utf8"));

test("approved September handoff is dated and synchronized with visible metadata", () => {
  const change = copyChanges.changes.find(({id}) => id === 'approved-four-page-design-2026-09-15');
  assert.equal(change.approved_on, '2026-09-15');
  assert.match(content, /AI transforms the economy/);
  assert.match(meta.surfaces.home.description, /I research where those profits move next/);
  assert.ok(copyChanges.changes.some(({id}) => id === 'home-hero-premise-2026-08-20'));
});

test("approved content has five views, one shared footer, and semantic content", () => {
  assert.equal((content.match(/<main\b/g)||[]).length,1);
  assert.equal((content.match(/class="view"/g)||[]).length,5);
  assert.equal((content.match(/<h1\b/g)||[]).length,5);
  assert.equal((content.match(/<iframe\b/g)||[]).length,1);
  assert.match(content,/width="480" height="150" style="border: 0; background: transparent"/);
  assert.match(content,/id="about"/);
  assert.doesNotMatch(content,/class="substack"|<input|Return methodology and full history|77\.3%/);
});

test("all source hash links resolve and IDs are unique", () => {
  const ids = [...content.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  const targets = new Set(ids);
  const hashes = [...content.matchAll(/\shref="#([^"]+)"/g)].map((match) => match[1]);
  assert.ok(hashes.length > 0);
  for (const hash of hashes) assert.ok(targets.has(hash), `Missing target for #${hash}`);
  assert.doesNotMatch(content, /href="#"/);
});

test("canonical thesis routing, metadata, sitemap, and preview share one source of truth", () => {
  assert.match(content, new RegExp(meta.thesis_url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(redirects, new RegExp(meta.thesis_url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(previewSource, /meta\.thesis_url/);
  assert.doesNotMatch(previewSource, /read\.whenintelligenceisfree\.com\/p\/thesis/);
  for (const surface of Object.values(meta.surfaces)) {
    assert.match(sitemap, new RegExp(`${meta.canonical_origin}${surface.path}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  const governedSources = `${content}\n${redirects}\n${sitemap}\n${previewSource}`;
  assert.doesNotMatch(governedSources, /essays\.whenintelligenceisfree\.com|who-gets-rich-when-intelligence-is/);
  assert.match(template, /rel="canonical"/);
});

test("external new-tab links carry safe relationship attributes", () => {
  const tags = [...content.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)].map((match) => match[0]);
  assert.ok(tags.length > 0);
  for (const tag of tags) assert.match(tag, /rel="[^"]*noopener[^"]*"/);
});

test("static routes select one view and share accessible navigation, metadata and native subscription", async () => {
  await buildSite({buildDate:new Date().toISOString().slice(0,10)});
  for(const [key,surface] of Object.entries(meta.surfaces)) {
    const html=await readFile(new URL('../dist/'+(key==='home'?'':key+'/')+'index.html',import.meta.url),'utf8');
    assert.equal((html.match(/data-view="/g)||[]).length,1);
    assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
    assert.match(html,new RegExp('data-view="'+key+'"'));
    assert.match(html,/href="#subscribe" data-nav="subscribe"/);
    assert.equal((html.match(/id="subscribe"/g)||[]).length,1);
    assert.equal((html.match(/<iframe /g)||[]).length,1);
    assert.ok(html.includes('src="https://read.whenintelligenceisfree.com/embed?transparent=1&light=1"'));
    assert.match(html,/title="Subscribe to When Intelligence Is Free"/);
    assert.match(html,/class="brand-logo"[^>]*alt="When Intelligence Is Free"/);
    assert.ok(html.includes('rel="canonical" href="'+meta.canonical_origin+surface.path+'"'));
    assert.ok(html.includes('<meta property="og:image" content="'+meta.canonical_origin+surface.social_image_path+'">'));
    assert.ok(html.includes('<meta name="twitter:image" content="'+meta.canonical_origin+surface.social_image_path+'">'));
    const structured=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(structured['@graph'].find(e=>e['@type']==='WebPage').url,meta.canonical_origin+surface.path);
    const levels=[...html.matchAll(/<h([1-6])\b/g)].map(m=>Number(m[1]));
    assert.equal(levels[0],1);
    for(let i=1;i<levels.length;i++)assert.ok(levels[i]-levels[i-1]<=1,key+' heading hierarchy');
    const ids=[...html.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size,key+' unique IDs');
    for(const m of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(m[1]),key+' missing anchor '+m[1]);
    const social=await readFile(new URL('../dist'+surface.social_image_path,import.meta.url));
    assert.equal(social.readUInt32BE(16),surface.social_image_width);
    assert.equal(social.readUInt32BE(20),surface.social_image_height);
    if(key==='home') {
      assert.equal((html.match(/class="framework-item /g)||[]).length,4);
      const hero=html.slice(html.indexOf('class="hero wrap"'),html.indexOf('id="framework"'));
      assert.doesNotMatch(hero,/<a |Vladimir|>WIF</);
      assert.match(html,/class="home-investments-proof"/);
    }
    if(key==='investments') {
      assert.match(html,/Top 5 published positions/);
      assert.doesNotMatch(html,/Return methodology and full history|77\.3%/);
      assert.match(html,/What drove the month/);
      assert.match(html,/data-performance-view-control hidden role="group"/);
      assert.doesNotMatch(html,/class="performance-view [^"]*"[^>]* hidden/);
      assert.match(html,/class="history publication-monthly-history"/);
    }
    if(key==='advisory')assert.equal((html.match(/href="https:\/\/calendly.com\/vlad-whenintelligenceisfree\/30min"/g)||[]).length,2);
  }
  const worker=await readFile(new URL('../dist/server/index.js',import.meta.url),'utf8');
  assert.equal(await readFile(new URL('../dist/_worker.js',import.meta.url),'utf8'),worker);
  assert.match(worker,/env\.ASSETS\.fetch\(request\)/);
  const mirrored=await readFile(new URL('../dist/client/about/index.html',import.meta.url),'utf8');
  assert.match(mirrored,/data-view="about"/);
  assert.match(mirrored,/\/assets\/site\.css\?v=[a-f0-9]{12}/);
  assert.match(llms,/https:\/\/whenintelligenceisfree\.com\/research\//);
});

test("GitHub CI owns publication history checks, build, and preview artifacts", () => {
  assert.equal(nodeVersion.trim(), "22");
  assert.match(websiteWorkflow, /fetch-depth: 0/);
  assert.match(websiteWorkflow, /WIIF_PUBLICATION_BASE_REF/);
  assert.match(websiteWorkflow, /npm run check/);
  assert.match(publicationWorkflow, /data\/investments\/publication\.json/);
  assert.doesNotMatch(publicationWorkflow, /github\.event\.repository\.private|private\/restricted|restricted review/i);
  assert.match(publicationWorkflow, /git diff --name-only/);
  assert.match(publicationWorkflow, /WIIF_PUBLICATION_BASE_REF/);
  assert.match(publicationWorkflow, /npm run validate:publication/);
  assert.match(publicationWorkflow, /npm run build:release/);
  assert.match(publicationWorkflow, /actions\/upload-artifact@v4/);
  assert.doesNotMatch(publicationWorkflow, /deploy-pages|cloudflare|wrangler|production deploy/i);
});

test("local preview serves the lighthouse identity with browser-safe MIME types", () => {
  assert.match(previewSource, /\["\.svg", "image\/svg\+xml"\]/);
  assert.match(previewSource, /\["\.ico", "image\/x-icon"\]/);
});

test("WhatsApp receives the logo card while Telegram keeps page-specific previews", async () => {
  const researchHtml = await readFile(new URL("../dist/research/index.html", import.meta.url), "utf8");
  const whatsappHtml = rewriteSocialPreviewForWhatsApp(researchHtml);
  assert.match(whatsappHtml, /<meta property="og:image" content="https:\/\/whenintelligenceisfree\.com\/assets\/social-logo\.png">/);
  assert.match(whatsappHtml, /<meta property="og:image:width" content="1200">/);
  assert.match(whatsappHtml, /<meta property="og:image:height" content="630">/);
  assert.match(whatsappHtml, /<meta property="og:image:alt" content="When Intelligence Is Free lighthouse logo">/);
  assert.doesNotMatch(whatsappHtml, /<meta property="og:image" content="[^\"]*social-research\.png">/);
  assert.match(researchHtml, /<meta property="og:image" content="https:\/\/whenintelligenceisfree\.com\/assets\/social-research\.png">/);
  assert.equal(isWhatsAppPreviewRequest(new Request("https://whenintelligenceisfree.com/research/", {
    headers: { "User-Agent": "WhatsApp/2.26.1" }
  })), true);
  assert.equal(isWhatsAppPreviewRequest(new Request("https://whenintelligenceisfree.com/research/", {
    headers: { "User-Agent": "TelegramBot (like TwitterBot)" }
  })), false);
  const assets = {
    fetch: async () => new Response(researchHtml, {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    })
  };
  const whatsappResponse = await sitesWorker.fetch(new Request("https://whenintelligenceisfree.com/research/", {
    headers: { "User-Agent": "WhatsApp/2.26.1" }
  }), { ASSETS: assets });
  assert.equal(whatsappResponse.headers.get("Vary"), "User-Agent");
  assert.match(await whatsappResponse.text(), /<meta property="og:image" content="https:\/\/whenintelligenceisfree\.com\/assets\/social-logo\.png">/);
  const telegramResponse = await sitesWorker.fetch(new Request("https://whenintelligenceisfree.com/research/", {
    headers: { "User-Agent": "TelegramBot (like TwitterBot)" }
  }), { ASSETS: assets });
  assert.equal(telegramResponse.headers.get("Vary"), "User-Agent");
  assert.match(await telegramResponse.text(), /<meta property="og:image" content="https:\/\/whenintelligenceisfree\.com\/assets\/social-research\.png">/);
});

test("responsive CSS and progressive enhancement protect navigation and data", () => {
  assert.match(styles,/@media \(max-width:600px\)/);
  assert.match(styles,/\.chart\{overflow-x:auto\}/);
  assert.match(styles,/\[hidden\]\{display:none!important\}/);
  assert.match(styles,/prefers-reduced-motion:no-preference/);
  assert.match(styles,/overflow-wrap:anywhere/);
  assert.doesNotMatch(styles,/body\s*\{[^}]*overflow-x\s*:\s*hidden/);
  assert.doesNotMatch(styles,/\.view\{display:none/);
  assert.match(client,/event.key === 'ArrowRight'/);
  assert.match(client,/aria-pressed/);
  assert.match(client,/aria-expanded/);
});

test("valid publication replaces every hard-coded Investments data block", () => {
  const publication = parsePublicationText(fixtureText);
  const rendered = renderInvestments(publication, sleeves, { buildDate: "2025-04-03" });
  const output = injectInvestments(content, rendered);
  // Principal review removes the display-only methodology/date block; validation still checks conventions.
  assert.equal(publication.conventions.benchmark.series_identifier, 'SYNTHETIC-TEST-PRICE');
  assert.doesNotMatch(output, /SYNTHETIC-TEST-PRICE|class="conventions small"/);
  assert.doesNotMatch(rendered.performance, /class="conventions-date small"/);
  assert.match(output, /Example Compute Company/);
  assert.doesNotMatch(output, /\+63\.0%/);
  assert.doesNotMatch(output, /31 Jul 2026|30 Jun 2026/);
  assert.equal((output.match(/data-investments-block="performance"/g) || []).length, 1);
  assert.equal((output.match(/data-investments-block="composition"/g) || []).length, 1);
  assert.equal((output.match(/data-investments-block="attribution"/g) || []).length, 1);
  assert.match(output, /table aria-labelledby="performance-heading"/);
  assert.match(output, /table[^>]* aria-labelledby="named-holdings-heading"/);
  assert.match(output, /What drove the month/);
});

test("the canonical monthly handoff is optional before launch and validated whenever present", async () => {
  try {
    const publication = parsePublicationBytes(await readFile(publicationUrl));
    assert.doesNotThrow(() => assertValidPublication(publication));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await assert.rejects(
      buildSite({ requirePublication: true, buildDate: new Date().toISOString().slice(0, 10) }),
      /requires data\/investments\/publication\.json/i
    );
  }
});

test("repository boundaries reject extra Investments inputs and unlisted static output", async () => {
  await assertInvestmentsDirectory(fileURLToPath(new URL("../data/investments", import.meta.url)));
  await assertStaticDirectory(fileURLToPath(new URL("../src/static", import.meta.url)));
  const temporary = await mkdtemp(join(tmpdir(), "wiif-boundary-"));
  const staticTemporary = await mkdtemp(join(tmpdir(), "wiif-static-boundary-"));
  try {
    await writeFile(resolve(temporary, "README.md"), "safe\n", "utf8");
    await writeFile(resolve(temporary, "raw-nav.csv"), "must not cross boundary\n", "utf8");
    await assert.rejects(assertInvestmentsDirectory(temporary), /unexpected file/i);
    for (const name of ["_redirects", "llms.txt", "robots.txt", "sitemap.xml", "raw-export.json"]) {
      await writeFile(resolve(staticTemporary, name), "safe fixture\n", "utf8");
    }
    await assert.rejects(assertStaticDirectory(staticTemporary), /unexpected file/i);
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(staticTemporary, { recursive: true, force: true });
  }
});

test("Git history selection skips identical blobs and chooses the last distinct publication", () => {
  assert.equal(selectPreviousDistinctPublicationText("current\n", ["current\n", "current\n", "prior\n"]), "prior\n");
  assert.equal(selectPreviousDistinctPublicationText("current\n", ["current\n"]), null);
  const result = (stdout = "", status = 0, stderr = "") => ({ stdout, status, stderr });
  const firstPublicationGit = (_root, args) => args[0] === "rev-parse" ? result("false\n") : result("");
  assert.equal(previousDistinctPublicationText("unused", "current\n", { runGit: firstPublicationGit }), null);
  const shallowGit = () => result("true\n");
  assert.throws(
    () => previousDistinctPublicationText("unused", "current\n", { runGit: shallowGit }),
    /shallow clone/i
  );
  const brokenGit = () => result("", 128, "repository unavailable");
  assert.throws(
    () => previousDistinctPublicationText("unused", "current\n", { runGit: brokenGit }),
    /cannot prove append-only/i
  );
  const invalidStateGit = () => result("unknown\n");
  assert.throws(
    () => previousDistinctPublicationText("unused", "current\n", { runGit: invalidStateGit }),
    /invalid shallow-history state/i
  );
  const logFailureGit = (_root, args) => args[0] === "rev-parse"
    ? result("false\n")
    : result("", 128, "log unavailable");
  assert.throws(
    () => previousDistinctPublicationText("unused", "current\n", { runGit: logFailureGit }),
    /publication log failed/i
  );
  const blobFailureGit = (_root, args) => args[0] === "rev-parse"
    ? result("false\n")
    : args[0] === "log"
      ? result("abc123\n")
      : result("", 128, "blob unavailable");
  assert.throws(
    () => previousDistinctPublicationText("unused", "current\n", { runGit: blobFailureGit }),
    /reading publication at commit abc123 failed/i
  );

  const baseSha = "a".repeat(40);
  const baseCalls = [];
  const basePublicationGit = (_root, args) => {
    baseCalls.push(args);
    if (args[0] === "rev-parse") return result("false\n");
    if (args[0] === "ls-tree") return result("data/investments/publication.json\n");
    if (args[0] === "show") return result("approved-base-publication\n");
    return result("draft-branch-history-must-not-be-read\n");
  };
  assert.equal(
    previousDistinctPublicationText("unused", "current-draft\n", { runGit: basePublicationGit, baseRef: baseSha }),
    "approved-base-publication\n"
  );
  assert.equal(baseCalls.some((args) => args[0] === "log"), false);

  const unchangedBaseGit = (_root, args) => {
    if (args[0] === "rev-parse") return result("false\n");
    if (args[0] === "ls-tree") return result("data/investments/publication.json\n");
    if (args[0] === "show") return result("current-draft\n");
    return result("unexpected\n");
  };
  assert.equal(
    previousDistinctPublicationText("unused", "current-draft\n", { runGit: unchangedBaseGit, baseRef: baseSha }),
    null
  );

  const firstBasePublicationGit = (_root, args) => args[0] === "rev-parse"
    ? result("false\n")
    : args[0] === "ls-tree"
      ? result("")
      : result("unexpected\n");
  assert.equal(
    previousDistinctPublicationText("unused", "first\n", { runGit: firstBasePublicationGit, baseRef: baseSha }),
    null
  );

  const brokenBaseGit = (_root, args) => args[0] === "rev-parse"
    ? result("false\n")
    : result("", 128, "base unavailable");
  assert.throws(
    () => previousDistinctPublicationText("unused", "current\n", { runGit: brokenBaseGit, baseRef: baseSha }),
    /pull-request base failed/i
  );
  assert.throws(
    () => previousDistinctPublicationText("unused", "current\n", { runGit: firstBasePublicationGit, baseRef: "main" }),
    /full Git commit SHA/i
  );
});

test("JSON Schema rejects unknown objects and mirrors identifier rules", async () => {
  const schema = JSON.parse(await readFile(new URL("../schemas/investments-publication.schema.json", import.meta.url), "utf8"));
  assert.equal(schema.additionalProperties, false);
  for (const [name, definition] of Object.entries(schema.$defs)) {
    if (definition.type === "object") assert.equal(definition.additionalProperties, false, `${name} must reject unknown fields`);
  }
  const identifierPattern = new RegExp(schema.$defs.conventions.properties.benchmark.properties.series_identifier.pattern);
  assert.equal(identifierPattern.test("NDX Index"), true);
  assert.equal(identifierPattern.test("NDX<script>"), false);
  const tickerPattern = new RegExp(schema.$defs.holding.properties.ticker.pattern);
  assert.equal(tickerPattern.test("BRK.B"), true);
  assert.equal(tickerPattern.test("bad ticker"), false);
});
