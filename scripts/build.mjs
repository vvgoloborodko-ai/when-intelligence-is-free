import { createHash } from "node:crypto";
import { access, copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertApprovedCopy } from "./lib/approved-copy.mjs";
import {
  PUBLICATION_PATH,
  assertValidPublication,
  canonicalizePublication,
  parsePublicationBytes,
  parsePublicationText
} from "./lib/investments.mjs";
import {
  derivedEvidence,
  escapeHtml,
  injectInvestments,
  renderHomeProofStrip,
  renderInvestments
} from "./lib/render-investments.mjs";
import { previousDistinctPublicationText } from "./lib/publication-history.mjs";
import { assertInvestmentsDirectory, assertStaticDirectory, STATIC_OUTPUT_ALLOWLIST } from "./lib/repository-boundary.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");
const RELEASE = resolve(ROOT, ".release");
const TEMPLATE = resolve(ROOT, "src/site.template.html");
const CONTENT = resolve(ROOT, "src/content/approved-public-content.html");
const META = resolve(ROOT, "src/content/site-meta.json");
const SLEEVES = resolve(ROOT, "src/content/investment-sleeves.json");
const V3_WORK_ORDER = resolve(ROOT, "src/content/v3-work-order.json");
const STYLES = resolve(ROOT, "src/styles/site.css");
const CLIENT = resolve(ROOT, "src/scripts/site.js");
const SITES_WORKER = resolve(ROOT, "scripts/sites-worker.mjs");
const STATIC = resolve(ROOT, "src/static");
const IDENTITY_ASSETS = Object.freeze([
  [resolve(ROOT, "logos/wiif_lighthouse_square_master_v2.svg"), "logo.svg"],
  [resolve(ROOT, "logos/wiif_lighthouse_favicon_v2.ico"), "favicon.ico"],
  [resolve(ROOT, "logos/wiif_lighthouse_square_v2_64.png"), "favicon-64.png"],
  [resolve(ROOT, "logos/wiif_lighthouse_square_v2_180.png"), "apple-touch-icon.png"],
  [resolve(ROOT, "logos/social-logo-1200x630.png"), "social-logo.png"]
]);

function isWithinWorkspace(path) {
  const rel = relative(ROOT, path);
  return rel && !rel.startsWith("..") && !resolve(path).startsWith(`..`);
}

async function exists(path) {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function injectTemplate(template, values) {
  let output = template;
  for (const [key, value] of Object.entries(values)) {
    output = output.replaceAll(`{{${key}}}`, value);
  }
  const unresolved = output.match(/\{\{[A-Z0-9_]+\}\}/g);
  if (unresolved) throw new Error(`Unresolved template token(s): ${unresolved.join(", ")}`);
  return output;
}

function balancedElementEnd(source, tag, start) {
  const tokenPattern = new RegExp(`<\\/?${tag}\\b[^>]*>`, "g");
  tokenPattern.lastIndex = start;
  let depth = 0;
  for (let token = tokenPattern.exec(source); token; token = tokenPattern.exec(source)) {
    if (token[0].startsWith(`</${tag}`)) depth -= 1;
    else depth += 1;
    if (depth === 0) return tokenPattern.lastIndex;
  }
  throw new Error(`Could not find balanced closing ${tag}.`);
}

function replaceElementsByClass(source, tag, className, replacement) {
  const openingPattern = new RegExp(`<${tag}\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`, "g");
  let output = "";
  let cursor = 0;
  let count = 0;
  for (let opening = openingPattern.exec(source); opening; opening = openingPattern.exec(source)) {
    if (opening.index < cursor) continue;
    const end = balancedElementEnd(source, tag, opening.index);
    output += source.slice(cursor, opening.index) + replacement(count, source.slice(opening.index, end));
    cursor = end;
    openingPattern.lastIndex = end;
    count += 1;
  }
  return { content: output + source.slice(cursor), count };
}

function addSubscribeEmbeds(content, meta) {
  const embed = meta.subscription_embed;
  const replacement = () => `<div class="subscribe-embed">
        <iframe src="${escapeHtml(embed.src)}" width="480" height="320" frameborder="0" scrolling="no" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" title="${escapeHtml(embed.title)}"></iframe>
      </div>`;
  const replaced = replaceElementsByClass(content, "div", "substack", replacement);
  if (replaced.count !== 3) throw new Error(`Subscribe embed boundary expected 3 approved cards; found ${replaced.count}.`);
  return replaced.content;
}

function addBrandLogo(content, logoPath) {
  const boundary = /(<a\b[^>]*class="wordmark"[^>]*>)/g;
  if ([...content.matchAll(boundary)].length !== 1) throw new Error("Brand-logo boundary expected one approved wordmark.");
  return content.replace(boundary, `$1<img class="brand-logo" src="${escapeHtml(logoPath)}" width="38" height="38" alt="">`);
}

function replaceMarker(content, marker, replacement) {
  const token = `<!-- ${marker} -->`;
  const occurrences = content.split(token).length - 1;
  if (occurrences !== 1) throw new Error(`${marker} boundary expected once; found ${occurrences}.`);
  return content.replace(token, replacement);
}

function applyV3WorkOrder(content, workOrder, homeProof) {
  if (workOrder?.status !== "draft") throw new Error("V3 work-order content must remain explicitly marked draft on the review branch.");
  let output = replaceMarker(content, "V3_HOME_PROOF", homeProof || "");
  const advisoryCta = '<div class="hero-cta advisory-second-cta"><a class="btn" href="https://calendly.com/vlad-whenintelligenceisfree/30min" target="_blank" rel="noopener">Start a conversation</a></div>';
  output = replaceMarker(output, "V3_ADVISORY_CTA", advisoryCta);
  const oldAdvisoryLabel = ">Full story →</a>";
  if ((output.split(oldAdvisoryLabel).length - 1) !== 1) throw new Error("Home advisory-label boundary was not found exactly once.");
  output = output.replace(oldAdvisoryLabel, `>${escapeHtml(workOrder.home.advisory_link_label)}</a>`);
  const legacyPromises = [
    "New essays as they ship and quarterly thesis review.",
    "A short note at every monthly close and a full review each quarter.",
    "Essays and the quarterly watchlist, as they ship."
  ];
  let replacements = 0;
  for (const legacy of legacyPromises) {
    const count = output.split(legacy).length - 1;
    replacements += count;
    output = output.replaceAll(legacy, workOrder.subscribe_promise);
  }
  if (replacements !== 4) throw new Error(`Subscribe promise expected four replacement points; found ${replacements}.`);
  return output;
}

function addClass(tag, className) {
  if (/\sclass="/.test(tag)) return tag.replace(/\sclass="([^"]*)"/, ` class="$1 ${className}"`);
  return tag.replace(/>$/, ` class="${className}">`);
}

function selectRouteView(source, routeKey) {
  const mainOpen = '<main id="site-content">';
  const mainStart = source.indexOf(mainOpen);
  const mainEnd = source.indexOf("</main>", mainStart);
  if (mainStart < 0 || mainEnd < 0) throw new Error("Missing single site-content main boundary.");
  const innerStart = mainStart + mainOpen.length;
  const inner = source.slice(innerStart, mainEnd);
  const keys = ["home", "research", "investments", "advisory"];
  const positions = new Map(keys.map((key) => [key, inner.indexOf(`<!-- ==================== ${key.toUpperCase()} ==================== -->`)]));
  if ([...positions.values()].some((position) => position < 0)) throw new Error("Missing approved route-view marker.");
  const start = positions.get(routeKey);
  const next = [...positions.values()].filter((position) => position > start).sort((left, right) => left - right)[0] ?? inner.length;
  const selected = inner.slice(start, next).trim();
  return `${source.slice(0, innerStart)}\n${selected}\n${source.slice(mainEnd)}`;
}

function prepareRouteContent(source, routeKey, surfaces) {
  let content = source;
  for (const [key, surface] of Object.entries(surfaces)) {
    content = content.replaceAll(`href="#${key}"`, `href="${surface.path}"`);
    const expected = `<section id="${key}" class="view" data-view="${key}">`;
    if (!content.includes(expected)) throw new Error(`Missing approved ${key} view boundary.`);
    if (key === routeKey) content = content.replace(expected, `<section id="${key}" class="view active" data-view="${key}">`);
  }
  const subscribeHref = {
    home: "#subscribe",
    research: "#subscribe-research",
    investments: "#subscribe-investments",
    advisory: "/#subscribe"
  }[routeKey];
  content = content.replace(/<a\b[^>]*data-nav="subscribe"[^>]*>/g, (tag) => tag.replace(/href="[^"]*"/, `href="${subscribeHref}"`));
  const navEnd = content.indexOf("</nav>");
  if (navEnd < 0) throw new Error("Missing approved navigation boundary.");
  let navigation = content.slice(0, navEnd + 6);
  const currentPattern = new RegExp(`<a\\b[^>]*data-nav="${routeKey}"[^>]*>`, "g");
  let currentCount = 0;
  navigation = navigation.replace(currentPattern, (tag) => {
    currentCount += 1;
    return addClass(tag.replace(/\saria-current="[^"]*"/g, "").replace(/>$/, ' aria-current="page">'), "active");
  });
  if (currentCount !== 1) throw new Error(`Expected one current-page navigation link for ${routeKey}; found ${currentCount}.`);
  content = `${navigation}${content.slice(navEnd + 6)}`;
  return selectRouteView(content, routeKey);
}

function canonicalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function canonicalUrl(origin, path) {
  return `${origin}${path}`;
}

function structuredData(meta, key, surface) {
  const url = canonicalUrl(meta.canonical_origin, surface.path);
  const data = key === "home"
    ? {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: surface.title,
      description: surface.description,
      url
    }
    : {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: surface.title,
      description: surface.description,
      url,
      isPartOf: {
        "@type": "WebSite",
        name: meta.surfaces.home.title,
        url: canonicalUrl(meta.canonical_origin, meta.surfaces.home.path)
      }
    };
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}

function assertNonSyntheticConventionSources(publication) {
  const identifiers = [
    publication?.conventions?.benchmark?.series_identifier,
    publication?.conventions?.strategy_return_basis?.methodology_id
  ].filter((value) => typeof value === "string");
  if (identifiers.some((value) => /(?:^|[._ -])(?:synthetic|fixture|placeholder|example|test)(?:$|[._ -])/i.test(value))) {
    throw new Error("Release preview rejected a synthetic/test convention identifier; source identifiers must come from the official closed methodology.");
  }
}

export async function buildSite({ requirePublication = false, buildDate = process.env.WIIF_BUILD_DATE || new Date().toISOString().slice(0, 10) } = {}) {
  if (!canonicalDate(buildDate)) throw new Error("Build date must be a real canonical YYYY-MM-DD date.");
  const copyEvidence = await assertApprovedCopy();
  const [template, approvedContent, meta, sleeves, workOrder, workOrderText] = await Promise.all([
    readFile(TEMPLATE, "utf8"),
    readFile(CONTENT, "utf8"),
    readFile(META, "utf8").then(JSON.parse),
    readFile(SLEEVES, "utf8").then(JSON.parse),
    readFile(V3_WORK_ORDER, "utf8").then(JSON.parse),
    readFile(V3_WORK_ORDER, "utf8")
  ]);

  let content = approvedContent;
  let publicationEvidence = null;
  let homeProof = "";
  const publicationPath = resolve(PUBLICATION_PATH);
  await Promise.all([
    assertInvestmentsDirectory(resolve(ROOT, "data/investments")),
    assertStaticDirectory(STATIC)
  ]);
  const hasPublication = await exists(publicationPath);
  if (requirePublication && !hasPublication) {
    throw new Error(
      "Release build requires data/investments/publication.json. It must be generated by the Investment project from the official close; do not fabricate the unresolved benchmark-series basis or net methodology."
    );
  }

  if (hasPublication) {
    const actualBuildDate = new Date().toISOString().slice(0, 10);
    if (buildDate !== actualBuildDate) {
      throw new Error(`Publication builds must use the actual UTC build date ${actualBuildDate}; backdated or future staleness checks are forbidden.`);
    }
    const currentBytes = await readFile(publicationPath);
    const publication = parsePublicationBytes(currentBytes);
    assertNonSyntheticConventionSources(publication);
    if (Date.parse(publication.generated_at) > Date.now() + 5 * 60 * 1000) {
      throw new Error("Publication generated_at is in the future; release preview fails closed.");
    }
    const currentText = canonicalizePublication(publication);
    const priorText = previousDistinctPublicationText(ROOT, currentText, {
      baseRef: process.env.WIIF_PUBLICATION_BASE_REF || null
    });
    const previous = priorText ? parsePublicationText(priorText) : null;
    assertValidPublication(publication, { previous });
    const rendered = renderInvestments(publication, sleeves, { buildDate });
    content = injectInvestments(content, rendered);
    homeProof = renderHomeProofStrip(rendered.derived, publication, workOrder.home);
    publicationEvidence = {
      input_sha256: createHash("sha256").update(currentText).digest("hex"),
      ...derivedEvidence(rendered.derived)
    };
  }
  content = applyV3WorkOrder(content, workOrder, homeProof);
  content = addSubscribeEmbeds(content, meta);
  content = addBrandLogo(content, meta.identity.logo_path);

  if (!isWithinWorkspace(DIST)) throw new Error(`Refusing to replace output outside the workspace: ${DIST}`);
  await rm(DIST, { recursive: true, force: true });
  await mkdir(resolve(DIST, "assets"), { recursive: true });
  await Promise.all([
    copyFile(STYLES, resolve(DIST, "assets/site.css")),
    copyFile(CLIENT, resolve(DIST, "assets/site.js")),
    ...IDENTITY_ASSETS.map(([source, name]) => copyFile(source, resolve(DIST, "assets", name))),
    ...STATIC_OUTPUT_ALLOWLIST.map((name) => copyFile(resolve(STATIC, name), resolve(DIST, name)))
  ]);

  for (const [key, surface] of Object.entries(meta.surfaces)) {
    const routeContent = prepareRouteContent(content, key, meta.surfaces);
    const html = injectTemplate(template, {
      TITLE: escapeHtml(surface.title),
      DESCRIPTION: escapeHtml(surface.description),
      CANONICAL_URL: escapeHtml(canonicalUrl(meta.canonical_origin, surface.path)),
      SOCIAL_IMAGE_URL: escapeHtml(canonicalUrl(meta.canonical_origin, surface.social_image_path)),
      SOCIAL_IMAGE_ALT: escapeHtml(surface.social_image_alt),
      STRUCTURED_DATA: structuredData(meta, key, surface),
      INITIAL_VIEW: escapeHtml(key),
      PUBLIC_CONTENT: routeContent.trim()
    });
    const pageDirectory = key === "home" ? DIST : resolve(DIST, surface.path.slice(1));
    await mkdir(pageDirectory, { recursive: true });
    await writeFile(resolve(pageDirectory, "index.html"), html, "utf8");
  }

  const sitesClient = resolve(DIST, "client");
  await mkdir(sitesClient, { recursive: true });
  await Promise.all([
    cp(resolve(DIST, "assets"), resolve(sitesClient, "assets"), { recursive: true }),
    ...Object.values(meta.surfaces)
      .filter(({ path }) => path !== "/")
      .map(({ path }) => cp(resolve(DIST, path.slice(1)), resolve(sitesClient, path.slice(1)), { recursive: true })),
    copyFile(resolve(DIST, "index.html"), resolve(sitesClient, "index.html")),
    ...STATIC_OUTPUT_ALLOWLIST.map((name) => copyFile(resolve(DIST, name), resolve(sitesClient, name)))
  ]);
  await mkdir(resolve(DIST, "server"), { recursive: true });
  await copyFile(SITES_WORKER, resolve(DIST, "server/index.js"));

  const evidence = {
    build_mode: hasPublication ? "sanitized-publication-preview" : "approved-baseline-preview",
    build_date: buildDate,
    approved_baseline_sha256: copyEvidence.baselineHash,
    approved_copy_changes_sha256: copyEvidence.approvedCopyChangesHash,
    approved_investment_sleeves_sha256: copyEvidence.sleevesHash,
    draft_v3_work_order_sha256: createHash("sha256").update(workOrderText.replace(/\r\n/g, "\n")).digest("hex"),
    publication: publicationEvidence,
    production_ready: false,
    production_blockers: [
      "The v3 work-order content is a draft branch preview and has not been promoted to an approved source.",
      "No approved analytics configuration was supplied; production analytics and consent behavior remain a deliberate deployment decision.",
      "A known-good production deployment identifier and tested rollback procedure must be recorded before launch.",
      "Production release acceptance and principal approval have not occurred."
    ],
    production_published: false
  };
  await mkdir(RELEASE, { recursive: true });
  await writeFile(resolve(RELEASE, "release-evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`Built ${DIST} (${evidence.build_mode}).`);
  return evidence;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildSite({ requirePublication: process.argv.includes("--require-publication") });
}
