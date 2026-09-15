import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { assertValidPublication, derivePublication, publicationFirewallFlags } from "./investments.mjs";

const COPY = Object.freeze(JSON.parse(readFileSync(new URL("../../src/content/investments-interface-copy.json", import.meta.url), "utf8")));
const V3 = Object.freeze(JSON.parse(readFileSync(new URL("../../src/content/v3-work-order.json", import.meta.url), "utf8")));
const DESIGN = Object.freeze(JSON.parse(readFileSync(new URL("../../src/content/design-copy.json", import.meta.url), "utf8")));
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
  return `<div class="asof">${escapeHtml(COPY.as_of)} · ${escapeHtml(displayDate(asOfDate))} · ${escapeHtml(conventions.audit_status)} · ${escapeHtml(COPY.updated_monthly)}${overdue}</div>`;
}

function conventionsLine(derived, conventions) {
  return escapeHtml(displayDate(conventions.inception_date) + '–' + displayDate(derived.asOfDate) + ' · ' + conventions.return_currency + ' · ' + conventions.audit_status);
}

export function renderHomeProofStrip(derived, publication) {
  const c = publication.conventions;
  return `<aside class="home-investments-proof"><div class="proof-stats"><div><strong>${escapeHtml(formatPct(derived.summary.strategyCumulativePct))}</strong><span>Strategy · ${escapeHtml(c.strategy_return_basis.basis)}</span></div><div><strong>${escapeHtml(formatPct(derived.summary.benchmarkCumulativePct))}</strong><span>${escapeHtml(c.benchmark.name)} · ${escapeHtml(benchmarkBasisLabel(c.benchmark.return_basis))}</span></div></div><p class="small">${conventionsLine(derived,c)}<br>${escapeHtml(DESIGN.investments.performance.risk)}</p></aside>`;
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
  const right = 68;
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
  const latestX = x(rows.length - 1);
  const endpointLabel = (value, series, color) => {
    const valueY = y(value);
    return `<g class="chart-end-label" data-series="${series}" aria-hidden="true"><circle cx="${latestX.toFixed(2)}" cy="${valueY.toFixed(2)}" r="3" fill="${color}"/><text x="${(latestX + 8).toFixed(2)}" y="${(valueY + 3.5).toFixed(2)}" fill="${color}" font-family="IBM Plex Mono,monospace" font-size="10" font-weight="600">${escapeHtml(formatPct(value))}</text></g>`;
  };
  const endpointLabels = `${endpointLabel(latest.strategyCumulativePct, "strategy", "#8A5C05")}${endpointLabel(latest.benchmarkCumulativePct, "benchmark", "#607588")}`;

  const benchmarkName = conventions.benchmark.name;
  return `<div class="chart publication-chart">
    <div class="legend">
      <span><span class="sw strategy-swatch"></span>${escapeHtml(COPY.strategy)} · ${escapeHtml(conventions.strategy_return_basis.basis)}</span>
      <span><span class="sw benchmark-swatch"></span>${escapeHtml(benchmarkName)} · ${escapeHtml(benchmarkBasisLabel(conventions.benchmark.return_basis))}</span>
    </div>
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(copy(COPY.chart_label, { inception: displayInception(conventions.inception_date, { short: true }), benchmark: benchmarkName, period: displayPeriod(latest.period) }))}">
      <g font-family="IBM Plex Mono,monospace" font-size="10" fill="#4A5C52">${grid}${labels}</g>
      <polyline fill="none" stroke="#7D8FA0" stroke-width="2.25" stroke-dasharray="6 4" points="${benchmarkPoints}"/>
      <polyline fill="none" stroke="#8A5C05" stroke-width="2.75" points="${strategyPoints}"/>
      ${endpointLabels}
    </svg>
  </div>`;
}

function monthlyChartMarkup(rows, conventions) {
  const width = 660;
  const height = 260;
  const left = 60;
  const right = 18;
  const top = 18;
  const bottom = 38;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const values = [0, ...rows.flatMap((row) => [row.strategyMonthlyPct, row.benchmarkMonthlyPct])];
  if (!values.every(Number.isFinite)) throw new Error("Investments monthly chart received a non-finite derived value.");
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const step = niceStep(Math.max(rawMax - rawMin, 1) / 4);
  let niceMin = Math.floor(rawMin / step) * step;
  let niceMax = Math.ceil(rawMax / step) * step;
  if (niceMin === niceMax) {
    niceMin -= step;
    niceMax += step;
  }
  const niceSpan = niceMax - niceMin;
  if (![step, niceMin, niceMax, niceSpan].every(Number.isFinite) || step <= 0 || niceSpan <= 0) {
    throw new Error("Investments monthly chart scale is not finite.");
  }
  const y = (value) => top + ((niceMax - value) / niceSpan) * plotHeight;
  const ticks = [];
  for (let index = 0; index <= 20; index += 1) {
    const value = niceMin + index * step;
    if (!Number.isFinite(value) || value > niceMax) break;
    ticks.push(normalizeForDisplay(value, 6));
  }
  if (!ticks.length || ticks.length > 20) throw new Error("Investments monthly chart tick count is outside the deterministic limit.");

  const grid = ticks.map((value) => {
    const yy = y(value).toFixed(2);
    const stroke = value === 0 ? "#A9B4AA" : "#E4E8E3";
    const strokeWidth = value === 0 ? "1.5" : "1";
    return `<line x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}" stroke="${stroke}" stroke-width="${strokeWidth}"/><text x="${left - 8}" y="${(Number(yy) + 4).toFixed(2)}" text-anchor="end">${escapeHtml(formatPct(value, { sign: true }))}</text>`;
  }).join("");

  const groupWidth = plotWidth / rows.length;
  const barWidth = Math.min(12, Math.max(2, groupWidth * 0.32));
  const barGap = Math.min(3, groupWidth * 0.08);
  const zeroY = y(0);
  const bar = (value, x, fill, series, period) => {
    const valueY = y(value);
    const barY = Math.min(zeroY, valueY);
    const barHeight = Math.abs(zeroY - valueY);
    return `<rect x="${x.toFixed(2)}" y="${barY.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${barHeight.toFixed(2)}" rx="1" fill="${fill}" data-series="${series}" data-period="${escapeHtml(period)}"/>`;
  };
  const bars = rows.map((row, index) => {
    const center = left + index * groupWidth + groupWidth / 2;
    return `${bar(row.strategyMonthlyPct, center - barGap / 2 - barWidth, "#8A5C05", "strategy", row.period)}${bar(row.benchmarkMonthlyPct, center + barGap / 2, "#7D8FA0", "benchmark", row.period)}`;
  }).join("");
  const labels = rows.map((row, index) => {
    const center = left + index * groupWidth + groupWidth / 2;
    const month = Number(row.period.slice(5, 7));
    return `<text x="${center.toFixed(2)}" y="${height - 10}" text-anchor="middle">${escapeHtml(MONTHS[month - 1])}</text>`;
  }).join("");
  const benchmarkName = conventions.benchmark.name;

  return `<div class="chart publication-chart monthly-return-chart">
    <div class="legend">
      <span><span class="sw strategy-swatch"></span>${escapeHtml(COPY.strategy)} · ${escapeHtml(conventions.strategy_return_basis.basis)}</span>
      <span><span class="sw benchmark-swatch"></span>${escapeHtml(benchmarkName)} · ${escapeHtml(benchmarkBasisLabel(conventions.benchmark.return_basis))}</span>
    </div>
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(copy(COPY.monthly_chart_label, { benchmark: benchmarkName, start_period: displayPeriod(rows[0].period), end_period: displayPeriod(rows.at(-1).period) }))}">
      <g font-family="IBM Plex Mono,monospace" font-size="10" fill="#4A5C52">${grid}</g>
      <g aria-hidden="true">${bars}</g>
      <g font-family="IBM Plex Mono,monospace" font-size="9" fill="#4A5C52">${labels}</g>
    </svg>
  </div>`;
}

function performanceHistoryRows(rows) {
  return rows.map((row) => `<tr>
    <td>${escapeHtml(displayPeriod(row.period))}</td>
    <td class="mono r ${tone(row.strategyMonthlyPct)}">${escapeHtml(formatPct(row.strategyMonthlyPct))}</td>
    <td class="mono r ${tone(row.benchmarkMonthlyPct)}">${escapeHtml(formatPct(row.benchmarkMonthlyPct))}</td>
    <td class="mono r ${tone(row.strategyMonthlyPct - row.benchmarkMonthlyPct)}">${escapeHtml(formatPp(row.strategyMonthlyPct - row.benchmarkMonthlyPct))}</td>
  </tr>`).join("");
}

const PERFORMANCE_COMPARISON_COLUMNS = `<colgroup><col class="performance-period-column"><col class="performance-strategy-column"><col class="performance-benchmark-column"><col class="performance-excess-column"></colgroup>`;

function performanceHistoryTable(rows, conventions, accessibleLabel) {
  const benchmarkName = conventions.benchmark.name;
  return `<div class="tblwrap performance-comparison-table monthly-history-table"><table aria-label="${escapeHtml(accessibleLabel)}">
    ${PERFORMANCE_COMPARISON_COLUMNS}
    <thead><tr><th>${escapeHtml(COPY.period)}</th><th class="r">${escapeHtml(COPY.strategy)} · ${escapeHtml(conventions.strategy_return_basis.basis)}</th><th class="r">${escapeHtml(benchmarkName)}</th><th class="r">${escapeHtml(DESIGN.investments.performance.tableHeaders[3])}</th></tr></thead>
    <tbody>${performanceHistoryRows(rows)}</tbody>
  </table></div>`;
}

function performanceHistory(rows, conventions) {
  const newestFirst = [...rows].reverse();
  const recent = newestFirst.slice(0, 3);
  const older = newestFirst.slice(3);
  const archiveLabel = copy(COPY.show_earlier_months, { count: older.length });
  const archive = older.length
    ? `<details class="monthly-history-archive">
      <summary>${escapeHtml(archiveLabel)}</summary>
      ${performanceHistoryTable(older, conventions, `${COPY.monthly_performance_history}, ${archiveLabel}`)}
    </details>`
    : "";
  return `<div class="history publication-monthly-history">
    ${performanceHistoryTable(recent, conventions, COPY.monthly_performance_history)}
    ${archive}
  </div>`;
}

function performanceBlock(derived, publication, buildDate) {
  const { summary, performanceRows: rows, asOfDate, currentPeriod } = derived;
  const conventions = publication.conventions;
  const benchmarkName = conventions.benchmark.name;
  const monthlyHistory = performanceHistory(rows, conventions);
  const periodRows = summary.windows.map((window) => {
    const label = window.kind === "current_month"
      ? DESIGN.investments.performance.periodLabels[0]
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
        <h2 id="performance-heading">${escapeHtml(DESIGN.investments.performance.heading)}</h2>
        ${asOfMarkup(asOfDate, currentPeriod, buildDate, conventions)}
      </div>
      <div class="statgrid publication-statgrid">
        <div class="stat"><div class="val">${escapeHtml(formatPct(summary.strategyCumulativePct))}</div><div class="lbl">Strategy · ${escapeHtml(conventions.strategy_return_basis.basis)}</div></div>
        <div class="stat"><div class="val">${escapeHtml(formatPct(summary.benchmarkCumulativePct))}</div><div class="lbl">${escapeHtml(benchmarkName)} · ${escapeHtml(benchmarkBasisLabel(conventions.benchmark.return_basis))}</div></div>
        <div class="stat"><div class="val">${escapeHtml(formatPct(summary.maxDrawdownPct))}</div><div class="lbl">${escapeHtml(COPY.max_drawdown)} · ${escapeHtml(conventions.drawdown_convention === 'month_end_series' ? 'month-end' : conventions.drawdown_convention)}</div></div>
      </div>
      <div class="performance-view-control" data-performance-view-control hidden role="group" aria-label="${escapeHtml(COPY.performance_view)}">
        <button class="performance-view-button" type="button" data-performance-view-target="cumulative" aria-pressed="true" aria-controls="performance-cumulative-view">${escapeHtml(COPY.cumulative)}</button>
        <button class="performance-view-button" type="button" data-performance-view-target="monthly" aria-pressed="false" aria-controls="performance-monthly-view">${escapeHtml(COPY.monthly)}</button>
      </div>
      <div class="performance-view performance-cumulative-view" id="performance-cumulative-view" data-performance-view="cumulative" role="region" aria-label="${escapeHtml(COPY.cumulative)}">
        ${chartMarkup(rows, conventions)}
        <p class="small risk">${escapeHtml(DESIGN.investments.performance.risk)}</p>
        <div class="tblwrap performance-comparison-table publication-period-table"><table aria-labelledby="performance-heading">
          ${PERFORMANCE_COMPARISON_COLUMNS}
          <thead><tr><th>${escapeHtml(COPY.period)}</th><th class="r">${escapeHtml(COPY.strategy)} · ${escapeHtml(conventions.strategy_return_basis.basis)}</th><th class="r">${escapeHtml(benchmarkName)}</th><th class="r">${escapeHtml(DESIGN.investments.performance.tableHeaders[3])}</th></tr></thead>
          <tbody>${periodRows}</tbody>
        </table></div>
      </div>
      <div class="performance-view performance-monthly-view" id="performance-monthly-view" data-performance-view="monthly" role="region" aria-label="${escapeHtml(COPY.monthly)}">
        ${monthlyChartMarkup(rows, conventions)}
        ${monthlyHistory}
      </div>
    </div>
  </section>`;
}

export function topPublishedHoldings(derived, limit = 5) {
  // Derivation sorts equal weights alphabetically. Restore publication order for ties
  // without changing its complete holdings array or rounding any ranking weight.
  const sourceOrder = new Map(derived.latestRelease.holdings.map((holding, index) => [holding.name, index]));
  return [...derived.holdings].sort((a, b) => b.weightPct - a.weightPct || sourceOrder.get(a.name) - sourceOrder.get(b.name)).slice(0, limit);
}

function compositionBlock(derived, sleeves, publication, buildDate) {
  const labels = DESIGN.investments.portfolio;
  const composition = new Map(derived.composition.map(item => [item.sleeveId, item]));
  const rows = sleeves.map(sleeve => {
    const current = formatPct(composition.get(sleeve.id).weightPct, {sign:false, adaptive:true});
    const range = sleeve.approved_range_decimal;
    const description = sleeve.description + (range ? ' Mandated range ' + formatPct(range.minimum * 100, {sign:false}) + '–' + formatPct(range.maximum * 100, {sign:false}) + ' of NAV.' : ' No mandated range.');
    return `<tr aria-label="${escapeHtml(sleeve.name + '. ' + description + ' Current ' + current)}"><th scope="row">${escapeHtml(sleeve.name)}</th><td class="r">${escapeHtml(current)}</td></tr>`;
  }).join('');
  const holdingRows = topPublishedHoldings(derived, labels.maxPositions).map(holding => `<tr><td>${escapeHtml(holding.name)}</td><td class="r">${escapeHtml(formatPct(holding.weightPct,{sign:false,adaptive:true}))}</td></tr>`).join('');
  return `<section data-investments-block="composition"><div class="wrap"><div class="block-head"><h2>${escapeHtml(labels.heading)}</h2>${asOfMarkup(derived.asOfDate,derived.currentPeriod,buildDate,publication.conventions)}</div><div class="portfolio-grid"><div class="portfolio-column"><h3 id="sleeves-heading">${escapeHtml(labels.sleevesHeading)}</h3><table class="sleeve-table" aria-labelledby="sleeves-heading"><tbody>${rows}</tbody></table></div><div class="portfolio-column"><h3 id="named-holdings-heading">${escapeHtml(labels.positionsHeading)}</h3><table class="publication-holdings-table" aria-labelledby="named-holdings-heading"><thead><tr><th>${escapeHtml(labels.positionHeaders[0])}</th><th class="r">${escapeHtml(labels.positionHeaders[1])}</th></tr></thead><tbody>${holdingRows}</tbody></table></div></div></div></section>`;
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

function attributionBlock(derived, sleeves, publication) {
  const review = DESIGN.investments.review;
  const verified = derived.currentPeriod === V3.investments.verified_review_period;
  const label = verified ? review.ctaForVerifiedPeriod.replace('{month}', MONTHS_LONG[Number(derived.currentPeriod.slice(5))-1]) : review.fallbackCta;
  const href = verified ? V3.investments.read_full_note_url : V3.investments.all_close_notes_url;
  const paragraphs = derived.latestRelease.commentary?.paragraphs?.slice(0,2);
  const commentary = paragraphs?.length ? paragraphs.map(p => `<p>${escapeHtml(renderCommentaryParagraph(p,derived,publication.conventions.benchmark.name))}</p>`).join('') : `<p>${escapeHtml(COPY.no_commentary)}</p>`;
  return `<section class="close-note-section" data-investments-block="attribution"><div class="wrap"><article class="approved-commentary publication-commentary"><p class="eyebrow">${escapeHtml(displayPeriodLong(derived.currentPeriod))} review</p><h2>${escapeHtml(review.heading)}</h2><div class="close-note-body">${commentary}</div><a class="btn outline" href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(label)}</a></article></div></section>`;
}

function factsBlock(publication) {
  return `<aside class="facts" data-investments-facts aria-label="${escapeHtml(COPY.key_facts)}"><ul>${DESIGN.investments.hero.facts.map(fact=>`<li>${escapeHtml(fact.replace('{inceptionMonthYear}',displayInception(publication.conventions.inception_date)))}</li>`).join('')}</ul></aside>`;
}

export function assertRenderedFirewall(html, publication) {
  if (/\p{Default_Ignorable_Code_Point}/u.test(html)) {
    throw new Error("Rendered Investments firewall rejected invisible default-ignorable characters.");
  }
  let scan = html;
  // Approved column label describes instruments, not the public practice.
  scan = scan.replaceAll('<th>Company or fund</th>', '<th>Instrument</th>');
  // A validated date followed by the currency is not a currency amount.
  scan = scan.replaceAll(conventionsLine(derivePublication(publication), publication.conventions), '[performance dates and conventions]');
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
