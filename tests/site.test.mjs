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
const previewSource = await readFile(new URL("../scripts/preview.mjs", import.meta.url), "utf8");
const websiteWorkflow = await readFile(new URL("../.github/workflows/website-ci.yml", import.meta.url), "utf8");
const publicationWorkflow = await readFile(new URL("../.github/workflows/investments-publication-preview.yml", import.meta.url), "utf8");
const nodeVersion = await readFile(new URL("../.node-version", import.meta.url), "utf8");
const sleeves = JSON.parse(await readFile(new URL("../src/content/investment-sleeves.json", import.meta.url), "utf8"));
const fixtureText = await readFile(new URL("./fixtures/investments-publication.valid.json", import.meta.url), "utf8");
const workOrder = JSON.parse(await readFile(new URL("../src/content/v3-work-order.json", import.meta.url), "utf8"));

test("principal-approved hero replacement is explicit and synchronized with metadata", () => {
  const change = copyChanges.changes.find(({ id }) => id === "home-hero-premise-2026-08-20");
  assert.ok(change);
  assert.match(baseline, new RegExp(change.from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(baseline, new RegExp(change.to.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(content, new RegExp(change.to.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(meta.surfaces.home.description, change.to);
});

test("approved content has one main landmark, valid view structure, and no embedded layout", () => {
  assert.equal((content.match(/<main\b/g) || []).length, 1);
  assert.equal((content.match(/<section id="(?:home|research|investments|advisory)" class="view"/g) || []).length, 4);
  assert.equal((content.match(/<h1\b/g) || []).length, 4);
  assert.doesNotMatch(content, /\sstyle=/);
  assert.doesNotMatch(content, /<span>\s*<span class="n">[\s\S]*?<h4>/);
  assert.doesNotMatch(content, /<h4\b/);
  assert.match(content, /<h2 class="eyebrow approved-layout-17">Performance history<\/h2>/);
  assert.match(content, /<h3 class="eyebrow approved-layout-17">Top holdings<\/h3>/);
  assert.doesNotMatch(content, /mailto:|vlad@whenintelligenceisfree\.com|structure mock|internal review|Calendly embed \/ link renders here/i);
  assert.match(content, /href="https:\/\/calendly\.com\/vlad-whenintelligenceisfree\/30min"/);
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

test("static routes select one server-rendered view and remain usable without JavaScript", async () => {
  await buildSite({ buildDate: new Date().toISOString().slice(0, 10) });
  const subscribeTargets = {
    home: "#subscribe",
    research: "#subscribe-research",
    investments: "#subscribe-investments",
    advisory: "/#subscribe"
  };
  for (const [key, surface] of Object.entries(meta.surfaces)) {
    const path = key === "home"
      ? new URL("../dist/index.html", import.meta.url)
      : new URL(`../dist/${key}/index.html`, import.meta.url);
    const html = await readFile(path, "utf8");
    assert.match(html, new RegExp(`<html lang="en" data-initial-view="${key}">`));
    assert.match(html, new RegExp(`<section id="${key}" class="view active" data-view="${key}">`));
    assert.equal((html.match(/data-view="/g) || []).length, 1);
    assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
    assert.doesNotMatch(html, /href="#(?:home|research|investments|advisory)"/);
    assert.doesNotMatch(html, /class="substack"|Mock of the Substack embed/);
    assert.doesNotMatch(html, /Subscribe directly on Substack|mailto:|vlad@whenintelligenceisfree\.com|structure mock|internal review|Calendly embed \/ link renders here/i);
    assert.match(html, /<img class="brand-logo" src="\/assets\/logo\.webp" width="38" height="38" alt="">/);
    assert.match(html, new RegExp(`<meta property="og:image" content="${meta.canonical_origin}${surface.social_image_path.replaceAll("/", "\\/")}">`));
    assert.match(html, new RegExp(`<meta name="twitter:image" content="${meta.canonical_origin}${surface.social_image_path.replaceAll("/", "\\/")}">`));
    assert.equal((html.match(new RegExp(workOrder.subscribe_promise.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1);
    if (key === "advisory") {
      assert.doesNotMatch(html, /read\.whenintelligenceisfree\.com\/embed/);
      assert.equal((html.match(/href="https:\/\/calendly\.com\/vlad-whenintelligenceisfree\/30min"[^>]*>Start a conversation<\/a>/g) || []).length, 2);
    } else {
      assert.match(html, /<iframe src="https:\/\/read\.whenintelligenceisfree\.com\/embed"[^>]*title="Subscribe to When Intelligence Is Free"><\/iframe>/);
    }
    const headingLevels = [...html.matchAll(/<h([1-6])\b/g)].map((match) => Number(match[1]));
    assert.equal(headingLevels[0], 1);
    for (let index = 1; index < headingLevels.length; index += 1) {
      assert.ok(headingLevels[index] - headingLevels[index - 1] <= 1, `${key} skips from h${headingLevels[index - 1]} to h${headingLevels[index]}`);
    }
    const subscribeTags = [...html.matchAll(/<a\b[^>]*data-nav="subscribe"[^>]*>/g)].map((match) => match[0]);
    assert.ok(subscribeTags.length > 0);
    for (const tag of subscribeTags) {
      assert.match(tag, new RegExp(`href="${subscribeTargets[key].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
    }
    if (subscribeTargets[key].startsWith("#")) {
      assert.match(html, new RegExp(`id="${subscribeTargets[key].slice(1)}"`));
    }
    assert.match(html, new RegExp(`rel="canonical" href="${meta.canonical_origin}${surface.path.replaceAll("/", "\\/")}"`));
    const structured = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(structured);
    const structuredData = JSON.parse(structured[1]);
    assert.equal(structuredData.url, `${meta.canonical_origin}${surface.path}`);
    if (key === "home") {
      assert.match(html, /class="home-investments-proof"/);
      assert.match(html, /\+63\.0%[\s\S]*\+34\.6%/);
      assert.doesNotMatch(html, /since January 2025|Marked monthly, as of 31 July 2026/);
      assert.equal((html.match(/<div class="mode /g) || []).length, 4);
      assert.doesNotMatch(html, /href="\/research\/#(?:substitute|amplify|reprice|unlock)"/);
      assert.match(html, />Work with me →<\/a>/);
    }
    if (key === "research") {
      assert.doesNotMatch(html, /class="research-index"|class="pipeline-essays"/);
    }
    if (key === "investments") {
      assert.match(html, /July 2026 · close note/);
      assert.match(html, /datetime="2026-07-31">31 July 2026/);
      assert.doesNotMatch(html, /Show all 19 months|class="history history-(?:desktop|mobile)"/);
      assert.match(html, /class="visually-hidden publication-performance-data"/);
      assert.ok(html.indexOf('data-investments-block="composition"') < html.indexOf('class="finetext"'));
    }
  }
  assert.match(client, /data-initial-view/);
  assert.match(client, /aria-current/);
  assert.match(styles, /\.view\{display:none\}/);
  assert.match(styles, /\.view\.active\{display:block\}/);
  assert.equal(new Set(Object.values(meta.surfaces).map(({ title }) => title)).size, 4);
  assert.equal(new Set(Object.values(meta.surfaces).map(({ description }) => description)).size, 4);
  assert.equal(new Set(Object.values(meta.surfaces).map(({ social_image_path }) => social_image_path)).size, 4);
  for (const surface of Object.values(meta.surfaces)) {
    const socialPreview = await readFile(new URL(`../dist${surface.social_image_path}`, import.meta.url));
    assert.equal(socialPreview.readUInt32BE(16), 1200);
    assert.equal(socialPreview.readUInt32BE(20), 630);
  }
  const deployedLogo = await readFile(new URL("../dist/assets/logo.webp", import.meta.url));
  assert.ok(deployedLogo.byteLength < 100_000);
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

test("narrow-screen CSS protects navigation, charts, forms, prose, and hero gutters", () => {
  assert.match(styles, /@media \(max-width:420px\)/);
  assert.match(styles, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.chart\{overflow-x:auto\}/);
  assert.match(styles, /\.chart svg\{min-width:620px\}/);
  assert.match(styles, /\.tp-chart\{overflow-x:auto\}/);
  assert.match(styles, /\.tp-chart svg\{min-width:620px\}/);
  assert.doesNotMatch(styles, /\.tp-chart\{display:none\}/);
  assert.match(styles, /\.substack input\{flex:1;min-width:0/);
  assert.match(styles, /\.hero\{padding-block:/);
  assert.match(styles, /\.essay-row\{align-items:flex-start;flex-direction:column/);
  assert.match(styles, /\.visually-hidden\{position:absolute!important/);
  assert.doesNotMatch(styles, /@media \(max-width:[^)]+\)[\s\S]{0,300}table\{display:none/);
  assert.match(styles, /overflow-wrap:anywhere/);
  assert.doesNotMatch(styles, /body\s*\{[^}]*overflow-x\s*:\s*hidden/);
});

test("valid publication replaces every hard-coded Investments data block", () => {
  const publication = parsePublicationText(fixtureText);
  const rendered = renderInvestments(publication, sleeves, { buildDate: "2025-04-03" });
  const output = injectInvestments(content, rendered);
  assert.match(output, /SYNTHETIC-TEST-PRICE/);
  assert.match(output, /Example Compute Company/);
  assert.doesNotMatch(output, /\+63\.0%/);
  assert.doesNotMatch(output, /31 Jul 2026|30 Jun 2026/);
  assert.equal((output.match(/data-investments-block="performance"/g) || []).length, 1);
  assert.equal((output.match(/data-investments-block="composition"/g) || []).length, 1);
  assert.equal((output.match(/data-investments-block="attribution"/g) || []).length, 1);
  assert.match(output, /table aria-labelledby="performance-heading"/);
  assert.match(output, /table aria-labelledby="named-holdings-heading"/);
  assert.match(output, /table aria-labelledby="contributors-heading"/);
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
    for (const name of ["_redirects", "robots.txt", "sitemap.xml", "raw-export.json"]) {
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
