import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { assertValidPublication, derivePublication, publicationFirewallFlags } from "./investments.mjs";

const COPY = Object.freeze(JSON.parse(readFileSync(new URL("../../src/content/investments-interface-copy.json", import.meta.url), "utf8")));
const V3 = Object.freeze(JSON.parse(readFileSync(new URL("../../src/content/v3-work-order.json", import.meta.url), "utf8")));
const MONTHS = COPY.months;
const MONTHS_LONG = COPY.months_long;

function copy(template, values = {}) {
  let output = template;
  for (const [key, value] of Object.entries(values)) output = output.replaceAll(`{{${key}}}`, String(value));
  if (/\{\{[^}]+\}\}/.test(output)) throw new Error(`Unresolved Investments interface-copy token in: ${output}`);
  return output;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeForDisplay(value, digits) {
  if (!Number.isFinite(value)) throw new Error("Investments display received a non-finite numeric value.");
  const factor = 10 ** digits;
  if (Math.abs(value) > Number.MAX_VALUE / factor) return value;
  const rounded = Math.round((value + Number.EPSILON * Math.sign(value)) * factor) / factor;
  return Math.abs(rounded) < 0.5 / factor ? 0 : rounded;
}

function formatNumber(value, digits = 1) {
  return Math.abs(normalizeForDisplay(value, digits)).toFixed(digits);
}

function formatPct(value, { sign = true, digits = 1, adaptive = false } = {}) {
  if (adaptive) digits = adaptiveDigits(value);
  const normalized = normalizeForDisplay(value, digits);
  const prefix = sign ? (normalized > 0 ? "+" : normalized < 0 ? "−" : "") : (normalized < 0 ? "−" : "");
  return `${prefix}${formatNumber(normalized, digits)}%`;
}

function adaptiveDigits(value) {
  const absolute = Math.abs(value);
  return absolute === 0 ? 1 : absolute >= 0.1 ? 1 : absolute >= 0.01 ? 2 : absolute >= 0.001 ? 3 : 6;
}

function formatPp(value, { sign = true, digits = 1, adaptive = false } = {}) {
  if (adaptive) digits = adaptiveDigits(value);
  const normalized = normalizeForDisplay(value, digits);
  const prefix = sign ? (normalized > 0 ? "+" : normalized < 0 ? "−" : "") : (normalized < 0 ? "−" : "");
  return `${prefix}${formatNumber(normalized, digits)}pp`;
}

function tone(value, digits = 1) {
  const normalized = normalizeForDisplay(value, digits);
  return normalized > 0 ? "pos" : normalized < 0 ? "neg" : "";
}

function displayPeriod(period) {
  const [year, month] = period.split("-").map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

function displayPeriodLong(period) {
  const [year, month] = period.split("-").map(Number);
  return `${MONTHS_LONG[month - 1]} ${year}`;
}

function chartLabelAnchor(index, lastIndex) {
  return index === 0 ? "start" : index === lastIndex ? "end" : "middle";
}

function displayDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function displayDateLong(date) {
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${MONTHS_LONG[month - 1]} ${year}`;
}

function displayInception(date, { short = false } = {}) {
  const [year, month] = date.split("-").map(Number);
  const monthName = short
    ? MONTHS[month - 1]
    : COPY.months_long[month - 1];
  return `${monthName} ${year}`;
}

function benchmarkBasisLabel(value) {
  return value === "price_return" ? COPY.basis_price_return : COPY.basis_total_return;
}

function canonicalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function staleness(period, buildDate) {
  if (!canonicalDate(buildDate)) throw new Error("Investments render build date must be a real canonical YYYY-MM-DD date.");
  const [year, month] = period.split("-").map(Number);
  const cutoff = new Date(Date.UTC(year, month + 1, 15));
  const now = new Date(`${buildDate}T00:00:00Z`);
  return {
    stale: now >= cutoff,
    cutoff: cutoff.toISOString().slice(0, 10)
  };
}

function asOfMarkup(asOfDate, period, buildDate, conventions) {
  const status = staleness(period, buildDate);
  const overdue = status.stale
    ? `<span class="stale-flag">${escapeHtml(COPY.update_overdue)} ${escapeHtml(displayDate(asOfDate))}</span>`
    : "";
  return `<div class="asof">${escapeHtml(COPY.as_of)} · ${escapeHtml(displayDate(asOfDate))} · ${escapeHtml(conventions.strategy_return_basis.basis)}, ${escapeHtml(conventions.audit_status)} · ${escapeHtml(COPY.updated_monthly)}${overdue}</div>`;
}

export function renderHomeProofStrip(derived, publication, labels) {
  const summary = derived.summary;
  const conventions = publication.conventions;
  return `<aside class="home-investments-proof">
    <div class="wrap">
      <p>${escapeHtml(labels.proof_lead)} <strong class="${tone(summary.strategyCumulativePct)}">${escapeHtml(formatPct(summary.strategyCumulativePct))}</strong> ${escapeHtml(labels.proof_versus)} <strong class="${tone(summary.benchmarkCumulativePct)}">${escapeHtml(formatPct(summary.benchmarkCumulativePct))}</strong> ${escapeHtml(conventions.benchmark.name)}. <a href="/investments/">→ ${escapeHtml(labels.proof_link)}</a></p>
    </div>
  </aside>`;
}

function niceStep(raw) {
  if (!Number.isFinite(raw) || raw <= 0) return 10;
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * power;
}

function chartMarkup(rows, conventions) {
  const width = 660;
  const height = 260;
  const left = 60;
  const right = 18;
  const top = 18;
  const bottom = 38;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const values = [0, ...rows.flatMap((row) => [row.strategyCumulativePct, row.benchmarkCumulativePct])];
  if (!values.every(Number.isFinite)) throw new Error("Investments chart received a non-finite derived value.");
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const step = niceStep(Math.max(rawMax - rawMin, 1) / 4);
  const niceMin = Math.floor(Math.min(rawMin, 0) / step) * step;
  const niceMax = Math.ceil(Math.max(rawMax, 0) / step) * step || step;
  const niceSpan = niceMax - niceMin || step;
  const useNiceScale = [step, niceMin, niceMax, niceSpan].every(Number.isFinite)
    && step > 0
    && niceSpan > 0;
  const x = (index) => left + (rows.length === 1 ? plotWidth / 2 : (index / (rows.length - 1)) * plotWidth);
  let y;
  let ticks;
  if (useNiceScale) {
    y = (value) => top + ((niceMax - value) / niceSpan) * plotHeight;
    ticks = [];
    for (let index = 0; index <= 20; index += 1) {
      const value = niceMin + index * step;
      if (!Number.isFinite(value) || value > niceMax) break;
      ticks.push(normalizeForDisplay(value, 6));
    }
  } else {
    const magnitude = Math.max(Math.abs(rawMin), Math.abs(rawMax), 1);
    const scaledMin = rawMin / magnitude;
    const scaledMax = rawMax / magnitude;
    const scaledSpan = scaledMax - scaledMin;
    if (![magnitude, scaledMin, scaledMax, scaledSpan].every(Number.isFinite) || scaledSpan <= 0) {
      throw new Error("Investments chart scale is not finite.");
    }
    y = (value) => top + ((scaledMax - value / magnitude) / scaledSpan) * plotHeight;
    ticks = Array.from({ length: 5 }, (_, index) => {
      const scaledValue = scaledMin + scaledSpan * (index / 4);
      return normalizeForDisplay(scaledValue * magnitude, 6);
    });
  }
  if (!ticks.length || ticks.length > 20) throw new Error("Investments chart tick count is outside the deterministic limit.");

  const grid = ticks.map((value) => {
    const yy = y(value).toFixed(2);
    const stroke = value === 0 ? "#C4CCC3" : "#E4E8E3";
    return `<line x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}" stroke="${stroke}"/><text x="${left - 8}" y="${(Number(yy) + 4).toFixed(2)}" text-anchor="end">${escapeHtml(formatPct(value, { sign: true }))}</text>`;
  }).join("");

  const labelIndexes = [...new Set([0, Math.floor((rows.length - 1) / 3), Math.floor(((rows.length - 1) * 2) / 3), rows.length - 1])];
  const labels = labelIndexes.map((index) => `<text x="${x(index).toFixed(2)}" y="${height - 10}" text-anchor="${chartLabelAnchor(index, rows.length - 1)}">${escapeHtml(displayPeriod(rows[index].period))}</text>`).join("");
  const strategyPoints = rows.map((row, index) => `${x(index).toFixed(2)},${y(row.strategyCumulativePct).toFixed(2)}`).join(" ");
  const benchmarkPoints = rows.map((row, index) => `${x(index).toFixed(2)},${y(row.benchmarkCumulativePct).toFixed(2)}`).join(" ");
  const latest = rows.at(-1);

  const benchmarkName = conventions.benchmark.name;
  return `<div class="chart publication-chart">
    <div class="legend">
      <span><span class="sw strategy-swatch"></span>${escapeHtml(COPY.strategy)}</span>
      <span><span class="sw benchmark-swatch"></span>${escapeHtml(benchmarkName)}</span>
    </div>
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(copy(COPY.chart_label, { inception: displayInception(conventions.inception_date, { short: true }), benchmark: benchmarkName, period: displayPeriod(latest.period) }))}">
      <g font-family="IBM Plex Mono,monospace" font-size="10" fill="#4A5C52">${grid}${labels}</g>
      <polyline fill="none" stroke="#7D8FA0" stroke-width="2.25" stroke-dasharray="6 4" points="${benchmarkPoints}"/>
      <polyline fill="none" stroke="#8A5C05" stroke-width="2.75" points="${strategyPoints}"/>
    </svg>
  </div>`;
}

function performanceHistoryRows(rows) {
  return rows.map((row) => `<tr>
    <td>${escapeHtml(displayPeriod(row.period))}</td>
    <td class="mono r ${tone(row.strategyMonthlyPct)}">${escapeHtml(formatPct(row.strategyMonthlyPct))}</td>
    <td class="mono r ${tone(row.benchmarkMonthlyPct)}">${escapeHtml(formatPct(row.benchmarkMonthlyPct))}</td>
    <td class="mono r ${tone(row.strategyCumulativePct)}">${escapeHtml(formatPct(row.strategyCumulativePct))}</td>
    <td class="mono r ${tone(row.benchmarkCumulativePct)}">${escapeHtml(formatPct(row.benchmarkCumulativePct))}</td>
  </tr>`).join("");
}

function performanceHistoryTable(rows, benchmarkName, labelledBy) {
  return `<div class="tblwrap"><table aria-labelledby="${escapeHtml(labelledBy)}">
    <thead><tr><th>${escapeHtml(COPY.period)}</th><th class="r">${escapeHtml(COPY.strategy_month)}</th><th class="r">${escapeHtml(copy(COPY.benchmark_month, { benchmark: benchmarkName }))}</th><th class="r">${escapeHtml(COPY.strategy_cumulative)}</th><th class="r">${escapeHtml(copy(COPY.benchmark_cumulative, { benchmark: benchmarkName }))}</th></tr></thead>
    <tbody>${performanceHistoryRows(rows)}</tbody>
  </table></div>`;
}

function accessiblePerformanceHistory(rows, benchmarkName) {
  const headingId = "accessible-performance-history-heading";
  return `<div class="visually-hidden publication-performance-data"><h3 id="${headingId}">${escapeHtml(COPY.monthly_performance_history)}</h3>${performanceHistoryTable(rows, benchmarkName, headingId)}</div>`;
}

function performanceBlock(derived, publication, buildDate) {
  const { summary, performanceRows: rows, asOfDate, currentPeriod } = derived;
  const conventions = publication.conventions;
  const benchmarkName = conventions.benchmark.name;
  const accessibleHistory = accessiblePerformanceHistory(rows, benchmarkName);
  const periodRows = summary.windows.map((window) => {
    const label = window.kind === "current_month"
      ? COPY.month
      : window.kind === "trailing_three_months"
        ? COPY.three_months
        : window.kind === "trailing_twelve_months"
          ? COPY.twelve_months
          : COPY.since_inception;
    const cell = (value, formatter) => window.available
      ? `<td class="mono r ${tone(value)}">${escapeHtml(formatter(value))}</td>`
      : `<td class="mono r muted">${escapeHtml(COPY.not_available)}</td>`;
    return `<tr>
    <td>${escapeHtml(label)}</td>
    ${cell(window.strategyPct, (value) => formatPct(value))}
    ${cell(window.benchmarkPct, (value) => formatPct(value))}
    ${cell(window.excessPp, (value) => formatPp(value))}
  </tr>`;
  }).join("");

  return `<section data-investments-block="performance">
    <div class="wrap">
      <div class="block-head">
        <h2 class="eyebrow" id="performance-heading">${escapeHtml(COPY.performance)}</h2>
        ${asOfMarkup(asOfDate, currentPeriod, buildDate, conventions)}
      </div>
      <div class="statgrid publication-statgrid">
        <div class="stat"><div class="lbl">${escapeHtml(COPY.since_inception)}</div><div class="val ${tone(summary.strategyCumulativePct)}">${escapeHtml(formatPct(summary.strategyCumulativePct))}</div><div class="sub">${escapeHtml(copy(COPY.from_inception, { date: displayInception(conventions.inception_date, { short: true }) }))}</div></div>
        <div class="stat"><div class="lbl">${escapeHtml(benchmarkName)}</div><div class="val ${tone(summary.benchmarkCumulativePct)}">${escapeHtml(formatPct(summary.benchmarkCumulativePct))}</div><div class="sub">${escapeHtml(COPY.same_period)}</div></div>
        <div class="stat"><div class="lbl">${escapeHtml(COPY.excess)}</div><div class="val ${tone(summary.excessCumulativePp)}">${escapeHtml(formatPp(summary.excessCumulativePp))}</div><div class="sub">${escapeHtml(COPY.versus_reference)}</div></div>
        <div class="stat"><div class="lbl">${escapeHtml(COPY.max_drawdown)}</div><div class="val ${tone(summary.maxDrawdownPct)}">${escapeHtml(formatPct(summary.maxDrawdownPct))}</div><div class="sub">${escapeHtml(COPY.month_end_series)}${summary.maxDrawdownPeriod ? ` · ${escapeHtml(displayPeriod(summary.maxDrawdownPeriod))}` : ""}</div></div>
      </div>
      ${chartMarkup(rows, conventions)}
      ${accessibleHistory}
      <div class="tblwrap publication-period-table"><table aria-labelledby="performance-heading">
        <thead><tr><th>${escapeHtml(COPY.period)}</th><th class="r">${escapeHtml(COPY.strategy)}</th><th class="r">${escapeHtml(benchmarkName)}</th><th class="r">${escapeHtml(COPY.excess)}</th></tr></thead>
        <tbody>${periodRows}</tbody>
      </table></div>
    </div>
  </section>`;
}

function compositionBlock(derived, sleeves, publication, buildDate) {
  const sleeveCopy = new Map(sleeves.map((sleeve) => [sleeve.id, sleeve]));
  const maxWeight = Math.max(...derived.composition.map((item) => item.weightPct / 100), 0.45);
  const scale = Math.max(0.45, Math.ceil(maxWeight / 0.05) * 0.05);
  const rows = derived.composition.map((item) => {
    const sleeve = sleeveCopy.get(item.sleeveId);
    const range = sleeve.approved_range_decimal;
    const band = range
      ? `<div class="cband" style="left:${(range.minimum / scale * 100).toFixed(4)}%;width:${((range.maximum - range.minimum) / scale * 100).toFixed(4)}%"></div>`
      : "";
    const current = formatPct(item.weightPct, { sign: false, adaptive: true });
    const accessible = range
      ? copy(COPY.range_accessible, {
        name: sleeve.name,
        description: sleeve.description,
        current,
        minimum: formatPct(range.minimum * 100, { sign: false, adaptive: true }),
        maximum: formatPct(range.maximum * 100, { sign: false, adaptive: true })
      })
      : copy(COPY.no_range_accessible, { name: sleeve.name, description: sleeve.description, current });
    return `<div class="comp-row" role="group" aria-label="${escapeHtml(accessible)}">
      <div><div class="nm">${escapeHtml(sleeve.name)}</div><div class="rng">${escapeHtml(sleeve.description)}</div></div>
      <div class="ctrack">${band}<div class="cfill" style="width:${Math.min(item.weightPct / (scale * 100) * 100, 100).toFixed(4)}%"></div></div>
      <div class="pc">${escapeHtml(current)}</div>
    </div>`;
  }).join("");
  const holdingRows = derived.holdings.map((holding) => `<tr>
    <td><div class="holding-identity"><span>${escapeHtml(holding.name)}</span>${holding.ticker ? `<span class="holding-ticker">${escapeHtml(holding.ticker)}</span>` : ""}</div></td>
    <td class="muted">${escapeHtml(sleeveCopy.get(holding.sleeveId).name)}</td>
    <td class="mono r">${escapeHtml(formatPct(holding.weightPct, { sign: false, adaptive: true }))}</td>
  </tr>`).join("");
  const holdingsTotal = derived.holdings.reduce((sum, holding) => sum + holding.weightPct, 0);

  return `<section data-investments-block="composition">
    <div class="wrap">
      <div class="block-head"><h2 class="eyebrow">${escapeHtml(COPY.composition)}</h2>${asOfMarkup(derived.asOfDate, derived.currentPeriod, buildDate, publication.conventions)}</div>
      <div class="publication-composition-rows">${rows}</div>
      <p class="mono small muted publication-range-note">${escapeHtml(copy(COPY.range_note, { maximum: formatNumber(scale * 100, 0) }))}</p>
      <div class="publication-holdings">
        <div class="block-head"><h3 class="eyebrow" id="named-holdings-heading">${escapeHtml(COPY.named_holdings)}</h3><div class="asof">${escapeHtml(formatPct(holdingsTotal, { sign: false, adaptive: true }))} ${escapeHtml(COPY.of_the_book)} · ${escapeHtml(displayDate(derived.asOfDate))}</div></div>
        <div class="tblwrap publication-holdings-table"><table aria-labelledby="named-holdings-heading">
          <thead><tr><th>${escapeHtml(COPY.holding)}</th><th>${escapeHtml(COPY.theme)}</th><th class="r">${escapeHtml(COPY.percent_nav)}</th></tr></thead>
          <tbody>${holdingRows}</tbody>
        </table></div>
      </div>
    </div>
  </section>`;
}

function renderCommentaryParagraph(paragraph, derived, benchmarkName) {
  const latestPerformance = derived.performanceRows.at(-1);
  const values = {
    benchmark_name: benchmarkName,
    benchmark_month_abs_pct: formatPct(Math.abs(latestPerformance.benchmarkMonthlyPct), { sign: false }),
    strategy_month_pct: formatPct(latestPerformance.strategyMonthlyPct, { digits: 2 }),
    benchmark_month_pct: formatPct(latestPerformance.benchmarkMonthlyPct, { digits: 2 }),
    strategy_month_excess_pp: formatPp(
      latestPerformance.strategyMonthlyPct - latestPerformance.benchmarkMonthlyPct,
      { digits: 2 }
    ),
    strategy_since_inception_pct: formatPct(derived.summary.strategyCumulativePct),
    benchmark_since_inception_pct: formatPct(derived.summary.benchmarkCumulativePct)
  };
  return paragraph.replace(/\{\{([^{}]+)\}\}/g, (_token, key) => {
    if (!Object.hasOwn(values, key)) throw new Error(`Unknown derived commentary token: ${key}.`);
    return values[key];
  });
}

function attributionBlock(derived, sleeves, publication, buildDate) {
  const sleeveCopy = new Map(sleeves.map((sleeve) => [sleeve.id, sleeve]));
  const items = derived.attribution.items.map((item) => ({
    ...item,
    label: item.level === "sleeve" ? sleeveCopy.get(item.sleeveId).name : item.holdingName
  }));
  const contributors = items.filter((item) => item.effectPp > 0);
  const detractors = items.filter((item) => item.effectPp < 0);
  const neutral = items.filter((item) => item.effectPp === 0);
  const renderRows = (values, emptyLabel) => values.length
    ? values.map((item) => `<tr><td>${escapeHtml(item.label)}</td><td class="mono r ${tone(item.effectPp, adaptiveDigits(item.effectPp))}">${escapeHtml(formatPp(item.effectPp, { adaptive: true }))}</td></tr>`).join("")
    : `<tr><td class="muted" colspan="2">${escapeHtml(emptyLabel)}</td></tr>`;
  const scopeLabel = COPY[`${derived.attribution.coverage}_${derived.attribution.level}_attribution`];
  const commentary = derived.latestRelease.commentary?.paragraphs?.length
    ? `<article class="approved-commentary publication-commentary" aria-labelledby="close-note-heading">
        <div class="close-note-head">
          <div><h3 id="close-note-heading">${escapeHtml(displayPeriodLong(derived.currentPeriod))} · ${escapeHtml(V3.investments.close_note_suffix)}</h3><time datetime="${escapeHtml(derived.asOfDate)}">${escapeHtml(displayDateLong(derived.asOfDate))}</time></div>
        </div>
        <div class="close-note-body">${derived.latestRelease.commentary.paragraphs.map((paragraph) => `<p>${escapeHtml(renderCommentaryParagraph(paragraph, derived, publication.conventions.benchmark.name))}</p>`).join("")}</div>
        <div class="close-note-links"><a href="${escapeHtml(V3.investments.read_full_note_url)}" target="_blank" rel="noopener">${escapeHtml(V3.investments.read_full_note_label)}</a><a href="${escapeHtml(V3.investments.all_close_notes_url)}" target="_blank" rel="noopener">${escapeHtml(V3.investments.all_close_notes_label)}</a></div>
      </article>`
    : `<div class="approved-commentary publication-commentary muted"><p>${escapeHtml(COPY.no_commentary)}</p></div>`;

  return `<section data-investments-block="attribution">
    <div class="wrap">
      <div class="block-head"><h2 class="eyebrow">${escapeHtml(scopeLabel)}</h2>${asOfMarkup(derived.asOfDate, derived.currentPeriod, buildDate, publication.conventions)}</div>
      <div class="grid2 publication-attribution-grid">
        <div class="tblwrap"><table aria-labelledby="contributors-heading"><thead><tr><th id="contributors-heading">${escapeHtml(COPY.contributors)}</th><th class="r">${escapeHtml(COPY.effect)}</th></tr></thead><tbody>${renderRows(contributors, COPY.no_positive)}</tbody></table></div>
        <div class="tblwrap"><table aria-labelledby="detractors-heading"><thead><tr><th id="detractors-heading">${escapeHtml(COPY.detractors)}</th><th class="r">${escapeHtml(COPY.effect)}</th></tr></thead><tbody>${renderRows(detractors, COPY.no_negative)}</tbody></table></div>
      </div>
      ${neutral.length ? `<div class="tblwrap publication-neutral-attribution"><table aria-labelledby="neutral-heading"><thead><tr><th id="neutral-heading">${escapeHtml(COPY.no_effect)}</th><th class="r">${escapeHtml(COPY.effect)}</th></tr></thead><tbody>${renderRows(neutral, "")}</tbody></table></div>` : ""}
      ${commentary}
    </div>
  </section>`;
}

function factsBlock(publication) {
  const conventions = publication.conventions;
  return `<aside class="facts" data-investments-facts aria-labelledby="investments-facts-heading">
    <div class="facts-h" id="investments-facts-heading">${escapeHtml(COPY.key_facts)}</div>
    <dl>
      <div class="row"><dt>${escapeHtml(COPY.inception)}</dt><dd>${escapeHtml(displayInception(conventions.inception_date))}</dd></div>
      <div class="row"><dt>${escapeHtml(COPY.universe)}</dt><dd>${escapeHtml(COPY.universe_value)}</dd></div>
      <div class="row"><dt>${escapeHtml(COPY.style)}</dt><dd>${escapeHtml(COPY.style_value)}</dd></div>
      <div class="row"><dt>${escapeHtml(COPY.leverage)}</dt><dd>${escapeHtml(COPY.none)}</dd></div>
      <div class="row"><dt>${escapeHtml(COPY.benchmark)}</dt><dd>${escapeHtml(conventions.benchmark.name)} · ${escapeHtml(benchmarkBasisLabel(conventions.benchmark.return_basis))} · ${escapeHtml(conventions.benchmark.series_identifier)}</dd></div>
    </dl>
  </aside>`;
}

export function assertRenderedFirewall(html, publication) {
  if (/\p{Default_Ignorable_Code_Point}/u.test(html)) {
    throw new Error("Rendered Investments firewall rejected invisible default-ignorable characters.");
  }
  let scan = html;
  const permittedInstrumentNames = [
    ...publication.releases.flatMap((release) => release.holdings.map((holding) => holding.name)),
    ...publication.releases.flatMap((release) => release.holdings.map((holding) => holding.ticker).filter(Boolean)),
    ...publication.releases.flatMap((release) => release.attribution.level === "position"
      ? release.attribution.items.map((item) => item.holding_name)
      : [])
  ];
  for (const name of permittedInstrumentNames) {
    scan = scan.replaceAll(escapeHtml(name), "[instrument]");
  }
  scan = scan
    .replace(/<[^>]+>/g, (tag) => [...tag.matchAll(/\s(?:aria-label|title)="([^"]*)"/g)].map((match) => match[1]).join(" "))
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/\s+/g, " ")
    .toLowerCase();
  const flags = publicationFirewallFlags(scan, { allowStandaloneNav: true, prose: true });
  if (flags.length) {
    throw new Error(`Rendered Investments firewall rejected output (${flags.join(", ")}).`);
  }
  if (publication.conventions.return_currency !== "USD") {
    throw new Error("Rendered Investments firewall rejected an unexpected return currency.");
  }
}

function replaceMarkedElement(source, tag, marker, replacement) {
  const openingPattern = new RegExp(`<${tag}\\b[^>]*${marker}(?:="[^"]*")?[^>]*>`);
  const opening = openingPattern.exec(source);
  if (!opening) throw new Error(`Could not locate ${marker} in approved content.`);
  const tokenPattern = new RegExp(`<\\/?${tag}\\b[^>]*>`, "g");
  tokenPattern.lastIndex = opening.index;
  let depth = 0;
  let end = -1;
  for (let token = tokenPattern.exec(source); token; token = tokenPattern.exec(source)) {
    if (token[0].startsWith(`</${tag}`)) depth -= 1;
    else depth += 1;
    if (depth === 0) {
      end = tokenPattern.lastIndex;
      break;
    }
  }
  if (end < 0) throw new Error(`Could not find the balanced closing ${tag} for ${marker}.`);
  return `${source.slice(0, opening.index)}${replacement}${source.slice(end)}`;
}

export function renderInvestments(publication, sleeves, { buildDate }) {
  assertValidPublication(publication);
  const derived = derivePublication(publication);
  const rendered = {
    derived,
    facts: factsBlock(publication),
    performance: performanceBlock(derived, publication, buildDate),
    composition: compositionBlock(derived, sleeves, publication, buildDate),
    attribution: attributionBlock(derived, sleeves, publication, buildDate)
  };
  assertRenderedFirewall(
    `${rendered.facts}${rendered.performance}${rendered.composition}${rendered.attribution}`,
    publication
  );
  return rendered;
}

export function injectInvestments(content, rendered) {
  let output = replaceMarkedElement(content, "aside", "data-investments-facts", rendered.facts);
  for (const block of ["performance", "composition", "attribution"]) {
    output = replaceMarkedElement(output, "section", `data-investments-block="${block}"`, rendered[block]);
  }
  return output;
}

export function derivedEvidence(derived) {
  const safe = {
    period: derived.currentPeriod,
    as_of_date: derived.asOfDate,
    performance_periods: derived.performanceRows.length,
    release_records: derived.releaseCount,
    composition_total_pct_nav: derived.composition.reduce((sum, item) => sum + item.weightPct, 0).toFixed(6),
    attribution_items: derived.attribution.items.length,
    corrections: derived.corrections.length,
    summary: derived.summary
  };
  return {
    ...safe,
    derived_sha256: createHash("sha256").update(JSON.stringify(safe)).digest("hex")
  };
}
