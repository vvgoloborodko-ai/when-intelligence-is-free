import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const BASELINE_PATH = resolve(ROOT, "WIIF_Landing_v3_Mock_2026-08-18.html");
export const APPROVED_CONTENT_PATH = resolve(ROOT, "src/content/approved-public-content.html");
export const APPROVED_COPY_CHANGES_PATH = resolve(ROOT, "src/content/approved-copy-changes.json");
export const APPROVED_SLEEVES_PATH = resolve(ROOT, "src/content/investment-sleeves.json");
export const BASELINE_SHA256 = "97623de9935415c9fa1dd24c77bf5c41590a46f85031929e257f9f15d51c6b67";
export const APPROVED_SLEEVES_SHA256 = "801e06689459950fb0d20c600a41c3ef5b4afee4639073ec03725b4ac4494ff4";

function assertExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} must contain exactly: ${wanted.join(", ")}.`);
  }
}

export function applyApprovedCopyChanges(source, ledger) {
  if (!ledger || typeof ledger !== "object" || Array.isArray(ledger)) throw new Error("Approved-copy change ledger must be an object.");
  assertExactKeys(ledger, ["version", "changes"], "Approved-copy change ledger");
  if (ledger.version !== 1 || !Array.isArray(ledger.changes)) throw new Error("Approved-copy change ledger must use version 1 and a changes array.");
  const ids = new Set();
  let output = source;
  for (const [index, change] of ledger.changes.entries()) {
    const label = `Approved-copy change ${index + 1}`;
    if (!change || typeof change !== "object" || Array.isArray(change)) throw new Error(`${label} must be an object.`);
    assertExactKeys(change, ["id", "approved_on", "from", "to"], label);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(change.id) || ids.has(change.id)) throw new Error(`${label} must have a unique kebab-case id.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(change.approved_on)) throw new Error(`${label} must have a canonical approval date.`);
    if (typeof change.from !== "string" || !change.from || typeof change.to !== "string" || !change.to || change.from === change.to) {
      throw new Error(`${label} must define distinct non-empty from/to strings.`);
    }
    ids.add(change.id);
    const occurrences = output.split(change.from).length - 1;
    if (occurrences !== 1) throw new Error(`${label} expected its source text exactly once; found ${occurrences}.`);
    output = output.replace(change.from, change.to);
  }
  return output;
}

function extractBaselineBody(source) {
  const match = source.match(/<body>\s*([\s\S]*?)\s*<script>/);
  if (!match) {
    throw new Error("Could not extract the approved baseline body.");
  }
  return match[1].trim();
}

function publicText(source) {
  return source
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, (svg) => svg.replace(/<[^>]+>/g, " "))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function governedAttributes(source) {
  const values = [];
  const pattern = /\s(href|aria-label|placeholder|alt|title)=(?:"([^"]*)"|'([^']*)')/gi;
  for (const match of source.matchAll(pattern)) {
    values.push(`${match[1].toLowerCase()}=${match[2] ?? match[3] ?? ""}`);
  }
  return values;
}

export async function verifyApprovedCopy() {
  const [baseline, approvedContent, approvedCopyChangesText, approvedSleeves] = await Promise.all([
    readFile(BASELINE_PATH, "utf8"),
    readFile(APPROVED_CONTENT_PATH, "utf8"),
    readFile(APPROVED_COPY_CHANGES_PATH, "utf8"),
    readFile(APPROVED_SLEEVES_PATH, "utf8")
  ]);
  const normalizedBaseline = baseline.replace(/\r\n/g, "\n");
  const hash = createHash("sha256").update(normalizedBaseline).digest("hex");
  const errors = [];
  if (hash !== BASELINE_SHA256) {
    errors.push(`Approved baseline hash changed: expected ${BASELINE_SHA256}, received ${hash}.`);
  }
  const sleevesHash = createHash("sha256").update(approvedSleeves.replace(/\r\n/g, "\n")).digest("hex");
  if (sleevesHash !== APPROVED_SLEEVES_SHA256) {
    errors.push(`Approved Investments sleeve copy/ranges changed: expected ${APPROVED_SLEEVES_SHA256}, received ${sleevesHash}.`);
  }

  const approvedCopyChanges = JSON.parse(approvedCopyChangesText);
  const approvedCopyChangesHash = createHash("sha256").update(approvedCopyChangesText.replace(/\r\n/g, "\n")).digest("hex");
  const baselineBody = applyApprovedCopyChanges(extractBaselineBody(baseline), approvedCopyChanges);
  if (publicText(baselineBody) !== publicText(approvedContent)) {
    errors.push("Approved public text no longer matches the principal-approved baseline.");
  }
  if (JSON.stringify(governedAttributes(baselineBody)) !== JSON.stringify(governedAttributes(approvedContent))) {
    errors.push("Approved public links or accessibility/form labels no longer match the baseline.");
  }

  return { errors, baselineHash: hash, approvedCopyChangesHash, sleevesHash };
}

export async function assertApprovedCopy() {
  const result = await verifyApprovedCopy();
  if (result.errors.length) {
    throw new Error(result.errors.join("\n"));
  }
  return result;
}
