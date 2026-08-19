import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

export const INVESTMENTS_DIRECTORY_ALLOWLIST = Object.freeze([
  "README.md",
  "publication.json"
]);

export const STATIC_OUTPUT_ALLOWLIST = Object.freeze([
  "_redirects",
  "robots.txt",
  "sitemap.xml"
]);

async function assertFlatAllowlist(directory, allowed, label) {
  const allowedNames = new Set(allowed);
  const entries = await readdir(directory, { withFileTypes: true });
  const errors = [];
  for (const entry of entries) {
    if (!entry.isFile() || entry.isSymbolicLink()) {
      errors.push(`${entry.name}: only ordinary files are allowed.`);
    }
    if (!allowedNames.has(entry.name)) errors.push(`${entry.name}: unexpected file.`);
  }
  if (errors.length) {
    throw new Error(`${label} boundary rejected repository contents:\n${errors.join("\n")}`);
  }
  return entries.map((entry) => entry.name).sort();
}

export async function assertInvestmentsDirectory(directory) {
  return assertFlatAllowlist(resolve(directory), INVESTMENTS_DIRECTORY_ALLOWLIST, "Investments handoff");
}

export async function assertStaticDirectory(directory) {
  const names = await assertFlatAllowlist(resolve(directory), STATIC_OUTPUT_ALLOWLIST, "Static output");
  const expected = [...STATIC_OUTPUT_ALLOWLIST].sort();
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(`Static output boundary requires exactly: ${expected.join(", ")}.`);
  }
  return names;
}
