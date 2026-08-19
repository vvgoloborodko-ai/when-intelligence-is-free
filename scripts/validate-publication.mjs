import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PUBLICATION_PATH,
  assertValidPublication,
  canonicalizePublication,
  parsePublicationBytes
} from "./lib/investments.mjs";
import { previousDistinctPublicationText } from "./lib/publication-history.mjs";
import { assertInvestmentsDirectory } from "./lib/repository-boundary.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const path = resolve(PUBLICATION_PATH);
await assertInvestmentsDirectory(resolve(root, "data/investments"));
const publication = parsePublicationBytes(await readFile(path));
const currentText = canonicalizePublication(publication);
const priorText = previousDistinctPublicationText(root, currentText, {
  baseRef: process.env.WIIF_PUBLICATION_BASE_REF || null
});
const previous = priorText ? parsePublicationBytes(Buffer.from(priorText, "utf8")) : null;
assertValidPublication(publication, { previous });
console.log(`Valid Investments publication: ${path}`);
