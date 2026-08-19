import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertApprovedCopy } from "./lib/approved-copy.mjs";
import {
  PUBLICATION_PATH,
  assertValidPublication,
  canonicalizePublication,
  parsePublicationBytes
} from "./lib/investments.mjs";
import { previousDistinctPublicationText } from "./lib/publication-history.mjs";
import { assertInvestmentsDirectory, assertStaticDirectory } from "./lib/repository-boundary.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

await assertApprovedCopy();
console.log("Approved-copy boundary: valid");
await Promise.all([
  assertInvestmentsDirectory(resolve(ROOT, "data/investments")),
  assertStaticDirectory(resolve(ROOT, "src/static"))
]);
console.log("Repository publication/output boundaries: valid");

try {
  await access(PUBLICATION_PATH, constants.R_OK);
  const publication = parsePublicationBytes(await readFile(PUBLICATION_PATH));
  const currentText = canonicalizePublication(publication);
  const priorText = previousDistinctPublicationText(ROOT, currentText, {
    baseRef: process.env.WIIF_PUBLICATION_BASE_REF || null
  });
  const previous = priorText ? parsePublicationBytes(Buffer.from(priorText, "utf8")) : null;
  assertValidPublication(publication, { previous });
  console.log("Investments publication: valid");
} catch (error) {
  if (error?.code === "ENOENT") {
    console.log("Investments publication: not present (approved-baseline preview mode)");
  } else {
    throw error;
  }
}
