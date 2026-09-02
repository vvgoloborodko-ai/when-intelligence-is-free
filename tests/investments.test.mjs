import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  MAX_PUBLICATION_BYTES,
  assertValidPublication,
  derivePublication,
  parsePublicationBytes,
  parsePublicationText,
  validatePublication
} from "../scripts/lib/investments.mjs";
import { assertRenderedFirewall, escapeHtml, renderHomeProofStrip, renderInvestments } from "../scripts/lib/render-investments.mjs";
import { verifyApprovedCopy } from "../scripts/lib/approved-copy.mjs";

const fixtureText = await readFile(new URL("./fixtures/investments-publication.valid.json", import.meta.url), "utf8");
const canonicalPublicationText = await readFile(new URL("../data/investments/publication.json", import.meta.url), "utf8");
const sleeves = JSON.parse(await readFile(new URL("../src/content/investment-sleeves.json", import.meta.url), "utf8"));

function fixture() {
  return structuredClone(parsePublicationText(fixtureText));
}

function correctedFixture(reason = "The source close was corrected after reconciliation.") {
  const publication = fixture();
  const correctionId = "corr-2025-04-10-01";
  publication.generated_at = "2025-04-10T12:00:00Z";
  publication.corrections.push({
    id: correctionId,
    period: "2025-03",
    disclosed_on: "2025-04-10",
    reason
  });
  publication.performance.push({
    ...structuredClone(publication.performance[2]),
    revision: 2,
    strategy_return_pct: "2.500000",
    correction_id: correctionId
  });
  const release = structuredClone(publication.releases[0]);
  release.revision = 2;
  release.correction_id = correctionId;
  release.attribution.items.forEach((item, index) => {
    item.effect_pp = index === 0 ? "2.500000" : "0.000000";
  });
  publication.releases.push(release);
  return publication;
}

test("approved public copy equals the immutable baseline plus explicit approved changes", async () => {
  const result = await verifyApprovedCopy();
  assert.deepEqual(result.errors, []);
});

test("valid synthetic publication passes strict and semantic validation", () => {
  const publication = fixture();
  assert.equal(validatePublication(publication).errors.length, 0);
  assert.equal(assertValidPublication(publication), publication);
});

test("derived performance compounds primitives and calculates month-end drawdown", () => {
  const derived = derivePublication(fixture());
  assert.equal(derived.currentPeriod, "2025-03");
  assert.equal(derived.asOfDate, "2025-03-31");
  assert.ok(Math.abs(derived.summary.strategyCumulativePct - 4.0094) < 1e-10);
  assert.ok(Math.abs(derived.summary.benchmarkCumulativePct - 1.9898) < 1e-10);
  assert.ok(Math.abs(derived.summary.excessCumulativePp - 2.0196) < 1e-10);
  assert.ok(Math.abs(derived.summary.maxDrawdownPct - -1) < 1e-10);
  assert.equal(derived.summary.maxDrawdownPeriod, "2025-02");
  assert.deepEqual(derived.holdings.map((item) => item.name), ["Example Compute Company", "Example Grid Company"]);
  assert.deepEqual(derived.summary.windows.map((window) => window.kind), [
    "current_month",
    "trailing_three_months",
    "trailing_twelve_months",
    "since_inception"
  ]);
  assert.equal(derived.summary.windows[2].available, false);
});

test("an all-positive series has no invented max-drawdown period", () => {
  const publication = fixture();
  publication.performance[1].strategy_return_pct = "1.000000";
  const derived = derivePublication(publication);
  assert.equal(derived.summary.maxDrawdownPct, 0);
  assert.equal(derived.summary.maxDrawdownPeriod, null);
  const rendered = renderInvestments(publication, sleeves, { buildDate: "2025-04-03" });
  assert.match(rendered.performance, /Max drawdown[\s\S]*?\+?0\.0%[\s\S]*?month-end series<\/div>/);
});

test("unknown fields fail instead of being stripped", () => {
  const publication = fixture();
  publication.releases[0].holdings[0].quantity = "100";
  assert.throws(() => assertValidPublication(publication), /unknown|quantity|forbidden/i);
});

test("public holding tickers are optional, strict, and preserved for rendering", () => {
  const publication = fixture();
  assert.equal(assertValidPublication(publication), publication);
  publication.releases[0].holdings[0].ticker = "bad ticker";
  assert.throws(() => assertValidPublication(publication), /ticker.*invalid string format/i);
});

test("duplicate JSON keys fail before ordinary parsing", () => {
  const duplicate = fixtureText.replace('  "schema_version": 1,', '  "schema_version": 1,\n  "schema_version": 1,');
  assert.throws(() => parsePublicationText(duplicate, { canonical: false }), /duplicate/i);
});

test("invalid UTF-8 fails before JSON parsing", () => {
  assert.throws(() => parsePublicationBytes(Uint8Array.from([0xff, 0xfe, 0xfd])), /utf-8/i);
});

test("strict parser enforces exact size, nesting, and node limits", () => {
  assert.throws(() => parsePublicationText(" ".repeat(MAX_PUBLICATION_BYTES + 1), { canonical: false }), /exceeds 524288 bytes/i);
  assert.throws(() => parsePublicationText(`${"[".repeat(26)}0${"]".repeat(26)}`, { canonical: false }), /nesting depth/i);
  assert.throws(() => parsePublicationText(`[${Array.from({ length: 15001 }, () => "0").join(",")}]`, { canonical: false }), /node count/i);
});

test("currency amounts and client framing fail the publication firewall", () => {
  const currency = fixture();
  currency.releases[0].commentary.paragraphs[0] = "The position was worth €1,000.";
  assert.throws(() => assertValidPublication(currency), /currency|forbidden|€|amount/i);

  const client = fixture();
  client.releases[0].commentary.paragraphs[0] = "Client mirror results were strong.";
  assert.throws(() => assertValidPublication(client), /client|mirror|forbidden/i);
});

test("worded absolute values and every provenance framing fail across prose fields", () => {
  const cases = [
    ["commentary", "Eight shares were held."],
    ["commentary", "The family & friends capital performed well."],
    ["commentary", "The mirrored portfolio performed well."],
    ["description", "Net of fees on five million dollars of capital."],
    ["description", "Net after broker statement adjustment."],
    ["description", "Net of costs; account identifier ABCD-EFGH."]
  ];
  for (const [field, value] of cases) {
    const publication = fixture();
    if (field === "commentary") publication.releases[0].commentary.paragraphs[0] = value;
    else publication.conventions.strategy_return_basis.public_description = value;
    assert.throws(() => assertValidPublication(publication), /forbidden|currency|quantit|provenance|operational|broker|account/i, value);
  }
});

test("bare magnitudes, spelled statistics, and homoglyph prose fail closed", () => {
  const cases = [
    "Returns are net of costs; the book stands at 3,500,000.",
    "Returns are net of costs; the book stands at three million.",
    "Returns are net of costs; the book stands at three.",
    "Returns are net. The strategy gained ten percent.",
    "Returns are net. Results for our \u0441lients were solid.",
    "Returns are net. \u0410UM is undisclosed.",
    "Returns are net. \u043Ewn funds only.",
    "Returns are net. Personal p\u043Ertfolio."
  ];
  for (const description of cases) {
    const publication = fixture();
    publication.conventions.strategy_return_basis.public_description = description;
    assert.throws(
      () => assertValidPublication(publication),
      /numbers|statistics|magnitude|Latin-script|public-data|forbidden/i,
      description
    );
    assert.throws(
      () => renderInvestments(publication, sleeves, { buildDate: "2025-04-03" }),
      /numbers|statistics|magnitude|Latin-script|public-data|forbidden/i,
      description
    );
  }
});

test("punctuation and word-order variants cannot bypass either firewall layer", () => {
  const descriptions = [
    "Returns are net after USD 100 of charges.",
    "Returns are net after USD100 of charges.",
    "Returns are net after 100 US dollars of charges.",
    "Returns are net after shares: 100 were adjusted.",
    "Returns are net; assets-under-management are undisclosed.",
    "Returns are net; net-asset-value is undisclosed.",
    "Returns are net; F and F information is excluded.",
    "Returns are net; friends/family information is excluded."
  ];
  for (const description of descriptions) {
    const publication = fixture();
    publication.conventions.strategy_return_basis.public_description = description;
    assert.throws(
      () => assertValidPublication(publication),
      /currency|quantit|public-data|provenance|forbidden/i,
      description
    );
    assert.throws(
      () => assertRenderedFirewall(`<div>${escapeHtml(description)}</div>`, publication),
      /rendered investments firewall rejected/i,
      description
    );
  }
});

test("advice, solicitation, and forward-return promises fail commentary", () => {
  for (const paragraph of [
    "You should invest in AI.",
    "Buy AI stocks.",
    "Contact us to invest.",
    "The Strategy is likely to outperform.",
    "Returns will be strong.",
    "We expect gains.",
    "Enquiries about participating are welcome.",
    "The coming period looks favourable for the book.",
    "The book returned twelve percent since inception."
  ]) {
    const publication = fixture();
    publication.releases[0].commentary.paragraphs[0] = paragraph;
    assert.throws(() => assertValidPublication(publication), /solicitation|advice|forward-return|statistics/i, paragraph);
  }
});

test("imperative and euphemistic advice fails in methodology prose and rendered output", () => {
  for (const phrase of [
    "Hold Alphabet.",
    "Purchase Alphabet.",
    "Consider buying Alphabet.",
    "This is a buy."
  ]) {
    const publication = fixture();
    const description = `Returns are net. ${phrase}`;
    publication.conventions.strategy_return_basis.public_description = description;
    assert.throws(() => assertValidPublication(publication), /solicitation|advice|forward-return/i, phrase);
    assert.throws(
      () => assertRenderedFirewall(`<div>${escapeHtml(description)}</div>`, publication),
      /rendered investments firewall rejected/i,
      phrase
    );
  }
});

test("fund language remains permitted only inside disclosed instrument names", () => {
  const publication = fixture();
  publication.releases[0].holdings[0].name = "Example Index Fund";
  publication.releases[0].holdings[0].ticker = "FUND";
  assert.doesNotThrow(() => assertValidPublication(publication));
  assert.doesNotThrow(() => assertRenderedFirewall("<div>Example Index Fund</div>", publication));

  publication.conventions.strategy_return_basis.public_description = "Returns are net for a fund.";
  assert.throws(() => assertValidPublication(publication), /fund/i);
});

test("invisible Unicode cannot split forbidden public-data language", () => {
  const publication = fixture();
  publication.releases[0].commentary.paragraphs[0] = "A\u200bUM increased.";
  assert.throws(() => assertValidPublication(publication), /invisible|format|forbidden/i);

  const variationSelector = fixture();
  variationSelector.releases[0].commentary.paragraphs[0] = "f\uFE0Fund framing.";
  assert.throws(() => assertValidPublication(variationSelector), /invisible|ignorable|forbidden/i);
});

test("position attribution cannot introduce an undisclosed instrument name", () => {
  const publication = fixture();
  publication.releases[0].attribution = {
    level: "position",
    coverage: "complete",
    items: [{ holding_name: "When Intelligence Is Free Fund", effect_pp: "2.000000" }]
  };
  assert.throws(
    () => assertValidPublication(publication),
    /position attribution must reference a named public holding/i
  );
  assert.throws(
    () => renderInvestments(publication, sleeves, { buildDate: "2025-04-03" }),
    /position attribution must reference a named public holding/i
  );
});

test("missing attribution and mixed-period as-of dates fail", () => {
  const noAttribution = fixture();
  delete noAttribution.releases[0].attribution;
  assert.throws(() => assertValidPublication(noAttribution), /attribution|required/i);

  const mixed = fixture();
  mixed.performance[2].as_of_date = "2025-02-28";
  assert.throws(() => assertValidPublication(mixed), /as_of|period|date/i);

  const earlyClose = fixture();
  earlyClose.performance[2].as_of_date = "2025-03-20";
  assert.throws(() => assertValidPublication(earlyClose), /final seven calendar days/i);
});

test("composition and complete attribution reconcile", () => {
  const composition = fixture();
  composition.releases[0].composition[0].weight_pct_nav = "19.000000";
  assert.throws(() => assertValidPublication(composition), /composition|100|sum/i);

  const attribution = fixture();
  attribution.releases[0].attribution.items[0].effect_pp = "0.000000";
  assert.throws(() => assertValidPublication(attribution), /attribution|reconcile/i);

  attribution.releases[0].attribution.coverage = "selected";
  attribution.releases[0].attribution.items = attribution.releases[0].attribution.items.filter((item) => item.effect_pp !== "0.000000");
  assert.doesNotThrow(() => assertValidPublication(attribution));

  const zeroSelected = fixture();
  zeroSelected.releases[0].attribution.coverage = "selected";
  assert.throws(() => assertValidPublication(zeroSelected), /selected attribution.*zero-effect/i);
});

test("complete position attribution covers every named public holding", () => {
  const publication = fixture();
  publication.releases[0].attribution = {
    level: "position",
    coverage: "complete",
    items: [{ holding_name: publication.releases[0].holdings[0].name, effect_pp: "3.000000" }]
  };
  assert.throws(() => assertValidPublication(publication), /every named public holding/i);
});

test("benchmark source identifiers may preserve safe internal spaces", () => {
  const publication = fixture();
  publication.conventions.benchmark.series_identifier = "NDX Index";
  assert.doesNotThrow(() => assertValidPublication(publication));
});

test("permanent conventions cannot change across publication versions", () => {
  const previous = fixture();
  const current = fixture();
  current.conventions.benchmark.return_basis = "total_return";
  assert.throws(() => assertValidPublication(current, { previous }), /convention|return_basis|immutable/i);
});

test("a normal monthly update is append-only and transition-valid", () => {
  const previous = fixture();
  const current = fixture();
  current.generated_at = "2025-05-02T12:00:00Z";
  current.performance.push({
    period: "2025-04",
    as_of_date: "2025-04-30",
    revision: 1,
    strategy_return_pct: "1.000000",
    benchmark_return_pct: "0.500000"
  });
  const release = structuredClone(current.releases[0]);
  release.period = "2025-04";
  release.attribution.items.forEach((item, index) => {
    item.effect_pp = index === 0 ? "1.000000" : "0.000000";
  });
  current.releases.push(release);
  assert.doesNotThrow(() => assertValidPublication(current, { previous }));
});

test("a missed public release cycle does not require a fabricated backfill", () => {
  const publication = fixture();
  publication.generated_at = "2025-06-02T12:00:00Z";
  publication.performance.push(
    {
      period: "2025-04",
      as_of_date: "2025-04-30",
      revision: 1,
      strategy_return_pct: "1.000000",
      benchmark_return_pct: "0.500000"
    },
    {
      period: "2025-05",
      as_of_date: "2025-05-30",
      revision: 1,
      strategy_return_pct: "2.000000",
      benchmark_return_pct: "1.000000"
    }
  );
  const mayRelease = structuredClone(publication.releases[0]);
  mayRelease.period = "2025-05";
  mayRelease.attribution.items.forEach((item, index) => {
    item.effect_pp = index === 0 ? "2.000000" : "0.000000";
  });
  publication.releases.push(mayRelease);
  assert.doesNotThrow(() => assertValidPublication(publication));
});

test("a correction appends revisions and a same-period disclosure", () => {
  const previous = fixture();
  const current = fixture();
  const correctionId = "corr-2025-04-10-01";
  current.generated_at = "2025-04-10T12:00:00Z";
  current.corrections.push({
    id: correctionId,
    period: "2025-03",
    disclosed_on: "2025-04-10",
    reason: "The source close was corrected after reconciliation."
  });
  current.performance.push({
    ...structuredClone(current.performance[2]),
    revision: 2,
    strategy_return_pct: "2.500000",
    correction_id: correctionId
  });
  const release = structuredClone(current.releases[0]);
  release.revision = 2;
  release.correction_id = correctionId;
  release.attribution.items.forEach((item, index) => {
    item.effect_pp = index === 0 ? "2.500000" : "0.000000";
  });
  current.releases.push(release);
  assert.doesNotThrow(() => assertValidPublication(current, { previous }));

  const silentRewrite = fixture();
  silentRewrite.generated_at = "2025-04-10T12:00:00Z";
  silentRewrite.performance[2].strategy_return_pct = "2.500000";
  assert.throws(() => assertValidPublication(silentRewrite, { previous }), /immutable|append|history/i);
});

test("performance and release corrections may be independent but each disclosure is one-use", () => {
  const oldPerformanceOnly = fixture();
  oldPerformanceOnly.generated_at = "2025-04-10T12:00:00Z";
  oldPerformanceOnly.corrections.push({
    id: "corr-2025-04-10-older",
    period: "2025-01",
    disclosed_on: "2025-04-10",
    reason: "The benchmark source close was corrected after reconciliation."
  });
  oldPerformanceOnly.performance.push({
    ...structuredClone(oldPerformanceOnly.performance[0]),
    revision: 2,
    benchmark_return_pct: "1.100000",
    correction_id: "corr-2025-04-10-older"
  });
  assert.doesNotThrow(() => assertValidPublication(oldPerformanceOnly));

  const releaseOnly = fixture();
  releaseOnly.generated_at = "2025-04-10T12:00:00Z";
  releaseOnly.corrections.push({
    id: "corr-2025-04-10-release",
    period: "2025-03",
    disclosed_on: "2025-04-10",
    reason: "The approved public commentary was corrected after review."
  });
  releaseOnly.releases.push({
    ...structuredClone(releaseOnly.releases[0]),
    revision: 2,
    correction_id: "corr-2025-04-10-release",
    commentary: { paragraphs: ["Approved corrected fixture commentary only."] }
  });
  assert.doesNotThrow(() => assertValidPublication(releaseOnly));

  const mismatchedId = correctedFixture();
  mismatchedId.releases[1].correction_id = "corr-2025-04-10-02";
  assert.throws(
    () => assertValidPublication(mismatchedId),
    /same correction_id|does not reference/i
  );
});

test("a correction ID cannot be reused for a later revision bundle", () => {
  const publication = correctedFixture();
  publication.performance.push({
    ...structuredClone(publication.performance.at(-1)),
    revision: 3,
    strategy_return_pct: "2.400000"
  });
  const release = structuredClone(publication.releases.at(-1));
  release.revision = 3;
  release.attribution.items[0].effect_pp = "2.400000";
  publication.releases.push(release);
  assert.throws(
    () => assertValidPublication(publication),
    /used exactly once|correction/i
  );
});

test("correction reasons cannot independently type figures", () => {
  const publication = correctedFixture("A 1 percent discrepancy was found.");
  assert.throws(
    () => assertValidPublication(publication),
    /reasons must not independently type digits|financial figures/i
  );
  assert.throws(() => assertValidPublication(correctedFixture("Correction.")), /invalid string length/i);
  const premature = correctedFixture();
  premature.corrections[0].disclosed_on = "2025-03-01";
  assert.throws(() => assertValidPublication(premature), /before its official close date/i);
});

test("derived corrections expose safe structured primitive before and after changes", () => {
  const derived = derivePublication(correctedFixture());
  assert.equal(derived.corrections.length, 1);
  const correction = derived.corrections[0];
  assert.equal(correction.performance_revision, 2);
  assert.equal(correction.release_revision, 2);
  assert.equal(correction.disclosed_on, "2025-04-10");
  const performanceChange = correction.changes.find((change) =>
    change.scope === "performance" && change.field === "strategy_return_pct");
  assert.deepEqual(performanceChange, {
    scope: "performance",
    field: "strategy_return_pct",
    subject: null,
    unit: "percent",
    before: "3.000000",
    after: "2.500000"
  });
  assert.ok(correction.changes.some((change) =>
    change.scope === "attribution"
      && change.field === "effect_pp"
      && change.before === "1.000000"
      && change.after === "2.500000"));
  for (const change of correction.changes) {
    assert.ok([null, "string", "number", "boolean"].includes(change.before === null ? null : typeof change.before));
    assert.ok([null, "string", "number", "boolean"].includes(change.after === null ? null : typeof change.after));
  }
});

test("cumulative overflow is rejected and derivation never returns Infinity", () => {
  const publication = fixture();
  publication.performance = [];
  for (let index = 0; index < 310; index += 1) {
    const close = new Date(Date.UTC(2025, index + 1, 0));
    const period = `${close.getUTCFullYear()}-${String(close.getUTCMonth() + 1).padStart(2, "0")}`;
    const asOfDate = `${period}-${String(close.getUTCDate()).padStart(2, "0")}`;
    publication.performance.push({
      period,
      as_of_date: asOfDate,
      revision: 1,
      strategy_return_pct: "1000.000000",
      benchmark_return_pct: "1000.000000"
    });
  }
  const finalRecord = publication.performance.at(-1);
  publication.generated_at = `${finalRecord.as_of_date}T12:00:00Z`;
  publication.releases[0].period = finalRecord.period;
  publication.releases[0].attribution.items.forEach((item, index) => {
    item.effect_pp = index === 0 ? "1000.000000" : "0.000000";
  });

  assert.throws(() => assertValidPublication(publication), /overflows finite numeric output/i);
  assert.throws(() => derivePublication(publication), /finite numeric output|non-finite/i);
});

test("largest accepted finite cumulative values remain finite through rendering", () => {
  for (const firstReturn of ["20.000000", "-1.000000"]) {
    const publication = fixture();
    publication.performance = [];
    for (let index = 0; index < 295; index += 1) {
      const close = new Date(Date.UTC(2025, index + 1, 0));
      const period = `${close.getUTCFullYear()}-${String(close.getUTCMonth() + 1).padStart(2, "0")}`;
      const asOfDate = `${period}-${String(close.getUTCDate()).padStart(2, "0")}`;
      const monthlyReturn = index === 0 ? firstReturn : "1000.000000";
      publication.performance.push({
        period,
        as_of_date: asOfDate,
        revision: 1,
        strategy_return_pct: monthlyReturn,
        benchmark_return_pct: monthlyReturn
      });
    }
    const finalRecord = publication.performance.at(-1);
    publication.generated_at = `${finalRecord.as_of_date}T12:00:00Z`;
    publication.releases[0].period = finalRecord.period;
    publication.releases[0].attribution.items.forEach((item, index) => {
      item.effect_pp = index === 0 ? "1000.000000" : "0.000000";
    });
    assert.doesNotThrow(() => assertValidPublication(publication));
    const rendered = renderInvestments(publication, sleeves, { buildDate: finalRecord.as_of_date });
    assert.doesNotMatch(`${rendered.performance}${rendered.attribution}`, /(?:Infinity|NaN)/);
  }
});

test("cumulative underflow is rejected before later positive returns can hide it", () => {
  const publication = fixture();
  publication.performance = [];
  for (let index = 0; index < 450; index += 1) {
    const close = new Date(Date.UTC(2025, index + 1, 0));
    const period = `${close.getUTCFullYear()}-${String(close.getUTCMonth() + 1).padStart(2, "0")}`;
    const asOfDate = `${period}-${String(close.getUTCDate()).padStart(2, "0")}`;
    const monthly = index < 50 ? "-99.999999" : "1000.000000";
    publication.performance.push({
      period,
      as_of_date: asOfDate,
      revision: 1,
      strategy_return_pct: monthly,
      benchmark_return_pct: monthly
    });
  }
  const finalRecord = publication.performance.at(-1);
  publication.generated_at = `${finalRecord.as_of_date}T12:00:00Z`;
  publication.releases[0].period = finalRecord.period;
  publication.releases[0].attribution.items.forEach((item, index) => {
    item.effect_pp = index === 0 ? "1000.000000" : "0.000000";
  });
  assert.throws(() => assertValidPublication(publication), /underflows deterministic numeric output/i);
  assert.throws(() => derivePublication(publication), /underflows deterministic numeric output/i);
});

test("renderer uses derived rows, current as-of date, and escaped text", () => {
  const publication = fixture();
  const rendered = renderInvestments(publication, sleeves, { buildDate: "2025-04-03" });
  assert.match(rendered.performance, /Monthly performance history/);
  assert.match(rendered.performance, /31 Mar 2025/);
  assert.match(rendered.performance, /\+4\.0%/);
  assert.match(rendered.performance, />Month<\/td>/);
  assert.match(rendered.performance, />3 months<\/td>/);
  assert.match(rendered.performance, />12 months<\/td>/);
  assert.doesNotMatch(rendered.performance, /YTD/);
  assert.match(rendered.composition, /Example Compute Company/);
  assert.match(rendered.facts, /Global listed equities, ETFs, options/);
  assert.match(rendered.facts, /Thematic, concentrated, long-biased with a hedging overlay/);
  assert.match(rendered.composition, /Named holdings/);
  assert.match(rendered.composition, /aria-label="Physical scarcity/);
  assert.match(rendered.performance, /<div class="history publication-monthly-history">/);
  assert.match(rendered.performance, /aria-label="Monthly performance history"/);
  assert.doesNotMatch(rendered.performance, /class="history-heading"/);
  assert.doesNotMatch(rendered.performance, /<details class="monthly-history-archive"/);
  assert.match(rendered.performance, /text-anchor="end">Mar 2025<\/text>/);
  assert.match(rendered.attribution, /Synthetic validator fixture only\./);
  assert.match(rendered.attribution, /Sleeve attribution/);
  assert.doesNotMatch(rendered.attribution, /Complete sleeve attribution/);
  assert.match(rendered.attribution, /March 2025 · close note/);
  assert.match(rendered.attribution, /class="close-note-title"/);
  assert.match(rendered.attribution, /class="close-note-date"/);
  assert.match(rendered.attribution, /class="block-head attribution-block-head"/);
  assert.match(rendered.attribution, /datetime="2025-03-31">31 March 2025/);
  assert.match(rendered.attribution, /read\.whenintelligenceisfree\.com\/p\/2608/);
  assert.match(rendered.attribution, />All close notes →<\/a>/);
  assert.match(rendered.composition, /class="holding-ticker">EXCO<\/span>/);
  for (const removedFact of ["Return currency", "Return basis", "Audit status", "Official calendar-month close", "Drawdown"]) {
    assert.doesNotMatch(rendered.facts, new RegExp(removedFact, "i"));
  }
  assert.equal(escapeHtml('<script>alert("x")</script>'), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
});

test("monthly history shows the latest three rows first and collapses the older Excess series", () => {
  const publication = parsePublicationText(canonicalPublicationText);
  const rendered = renderInvestments(publication, sleeves, { buildDate: "2026-08-21" });
  const history = rendered.performance.slice(rendered.performance.indexOf('<div class="history publication-monthly-history">'));
  assert.equal((history.match(/<tr>/g) || []).length - 2, 20);
  assert.match(history, /Jan 2025/);
  assert.match(history, /Aug 2026/);
  assert.match(history, /<th class="r">Strategy<\/th><th class="r">Nasdaq-100<\/th><th class="r">Excess<\/th>/);
  assert.match(history, /\+5\.4pp/);
  assert.match(history, /Show earlier months \(17\)/);
  assert.ok(history.indexOf("Aug 2026") < history.indexOf("Jul 2026"));
  assert.ok(history.indexOf("Jul 2026") < history.indexOf("Jun 2026"));
  assert.ok(history.indexOf("Jun 2026") < history.indexOf("May 2026"));
});

test("Home proof and Investments use the same changed publication primitives", () => {
  const publication = fixture();
  publication.generated_at = "2025-05-01T08:00:00Z";
  publication.performance.push({
    period: "2025-04",
    as_of_date: "2025-04-30",
    revision: 1,
    strategy_return_pct: "4.000000",
    benchmark_return_pct: "1.000000"
  });
  publication.releases[0].period = "2025-04";
  publication.releases[0].attribution.items[0].effect_pp = "2.000000";
  assert.doesNotThrow(() => assertValidPublication(publication));
  const derived = derivePublication(publication);
  const proof = renderHomeProofStrip(derived, publication, {
    proof_lead: "The thesis, held as positions:",
    proof_versus: "vs",
    proof_link: "See the book"
  });
  const investments = renderInvestments(publication, sleeves, { buildDate: "2025-05-01" });
  assert.match(proof, /\+8\.2%/);
  assert.match(investments.performance, /\+8\.2%/);
  assert.doesNotMatch(proof, /January 2025|30 April 2025|Marked monthly/);
  assert.match(investments.performance, /30 Apr 2025/);
});

test("approved commentary derives benchmark, monthly, excess, and cumulative tokens", () => {
  const publication = fixture();
  publication.releases[0].commentary.paragraphs = ["The strategy returned {{strategy_month_pct}} against {{benchmark_month_pct}} for the {{benchmark_name}}, a {{strategy_month_excess_pp}} beat. Since inception, the numbers are {{strategy_since_inception_pct}} against {{benchmark_since_inception_pct}}."];
  const rendered = renderInvestments(publication, sleeves, { buildDate: "2025-04-03" });
  assert.match(rendered.attribution, /returned \+3\.00% against −1\.00% for the Nasdaq-100, a \+4\.00pp beat\./);
  assert.match(rendered.attribution, /Since inception, the numbers are \+4\.0% against \+2\.0%\./);
  assert.match(rendered.attribution, /class="approved-commentary publication-commentary"/);
  publication.releases[0].commentary.paragraphs = ["Unknown {{typed_statistic}}."];
  assert.throws(() => assertValidPublication(publication), /unknown derived commentary token/i);
});

test("optional commentary absence and attribution scope remain explicit", () => {
  const publication = fixture();
  delete publication.releases[0].commentary;
  const rendered = renderInvestments(publication, sleeves, { buildDate: "2025-04-03" });
  assert.match(rendered.attribution, /No approved Investments commentary for this close\./);
  assert.match(rendered.attribution, /Sleeve attribution/);
});

test("rendered firewall scans screen-reader-visible attributes", () => {
  const publication = fixture();
  assert.throws(
    () => assertRenderedFirewall('<div aria-label="Client mirror data">Safe text</div>', publication),
    /rendered Investments firewall rejected/i
  );
});

test("renderer normalizes display zero and preserves very small public weights", () => {
  const publication = fixture();
  publication.performance[2].strategy_return_pct = "-0.040000";
  publication.releases[0].attribution.items.forEach((item, index) => {
    item.effect_pp = index === 0 ? "-0.040000" : "0.000000";
  });
  publication.releases[0].holdings[1].weight_pct_nav = "0.000001";
  const rendered = renderInvestments(publication, sleeves, { buildDate: "2025-04-03" });
  assert.doesNotMatch(rendered.performance, /−0\.0%/);
  assert.match(rendered.composition, /0\.000001%/);
  assert.match(rendered.attribution, /−0\.04pp/);
  assert.doesNotMatch(rendered.attribution, /−0\.0pp/);
});

test("correction integrity remains derived but is not rendered as a public section", () => {
  const publication = correctedFixture();
  const rendered = renderInvestments(publication, sleeves, { buildDate: "2025-04-11" });
  assert.equal(derivePublication(publication).corrections.length, 1);
  assert.doesNotMatch(rendered.attribution, /Corrections|Changed:|Strategy monthly return/);
});

test("staleness is derived from the period rather than typed in the input", () => {
  const publication = fixture();
  const fresh = renderInvestments(publication, sleeves, { buildDate: "2025-05-14" });
  const stale = renderInvestments(publication, sleeves, { buildDate: "2025-05-15" });
  assert.doesNotMatch(fresh.performance, /Update overdue/);
  assert.match(stale.performance, /Update overdue/);
  assert.throws(() => renderInvestments(publication, sleeves, { buildDate: "not-a-date" }), /canonical YYYY-MM-DD/i);
});
