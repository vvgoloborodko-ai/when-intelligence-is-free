# When Intelligence Is Free website

This repository is a dependency-light static website. The principal-approved
single-file mock remains unchanged at
`WIIF_Landing_v3_Mock_2026-08-18.html`; its line-ending-normalized SHA-256 is
enforced before every build on Windows and Linux. The restructured source separates approved public content from layout,
styling, client behavior, and monthly Investments data.

## Architecture

- `src/content/approved-public-content.html` — approved visible copy and
  semantic content, mechanically extracted from the baseline.
- `src/content/site-meta.json` — approved site name, canonical URLs, and a
  per-surface metadata grounded in approved copy.
- `src/content/investment-sleeves.json` — approved public sleeve labels,
  descriptions, and the already-approved range-marker disclosure.
- `src/content/investments-interface-copy.json` — proposed Release-1 labels
  kept outside the renderer so technical edits cannot silently rewrite them.
- `src/site.template.html` — document shell only.
- `src/styles/site.css` — visual system and responsive behavior.
- `src/scripts/site.js` — optional deep-link and subscription-anchor
  enhancement. The build server-selects one visible view per route, so the
  route remains readable when this script fails or is blocked.
- `data/investments/publication.json` — the one and only monthly Investments
  handoff. It is generated upstream and is intentionally absent for now.
- `schemas/investments-publication.schema.json` — machine-readable contract.
- `scripts/` — copy guard, validator, deterministic calculations, static
  renderer, preview server, and release evidence.
- `logos/` — supplied identity sources. The build deploys only the optimized
  WebP logo, purpose-sized icon, and 1200×630 social preview.
- `.github/workflows/` — general website CI plus the publication-only PR
  validator and restricted preview-artifact build.
- `dist/` — generated Cloudflare Pages output for `/`, `/research/`,
  `/investments/`, and `/advisory/`; never production-published by these
  scripts.
- `.release/release-evidence.json` — local, ignored build evidence; it is never
  copied into deployable output.

The baseline extractor is retained so the split is reproducible. Running it
does not authorize a new baseline: approval and the pinned hash must be updated
deliberately before a future approved baseline can replace the current one.

## Commands

The repository has no runtime or package dependencies beyond Node.js 22,
pinned in `.node-version` for local, GitHub, and later Cloudflare builds.

```text
npm run validate          # approved-copy guard; validates publication if present
npm test                  # validator, firewall, calculation, and renderer tests
npm run build             # baseline preview, or publication preview when input exists
npm run build:release     # requires the one valid sanitized publication input
npm run preview           # build and serve locally on 127.0.0.1:4173
npm run preview:release   # require publication, build, validate, and serve
npm run check             # validate + test + build
```

Cloudflare Pages can later use `npm run build:release` with output directory
`dist` after the remaining blockers in `.release/release-evidence.json` are
deliberately resolved. A
successful build is preview evidence, not production approval. DNS, hosting
configuration, and production publication remain deliberate principal actions.
Website CI fetches complete Git history; release validation fails closed on a
shallow clone because it cannot prove append-only history or distinguish a true
first publication.

## Monthly Investments handoff

The Investment project owns one `/publish-website` command. After the official
close it sanitizes its source data, generates and validates the cumulative
publication, then creates or updates a dedicated branch/PR changing only:

```text
data/investments/publication.json
```

The Investment project does not need a website checkout, website Git history,
npm, Cloudflare access, or the ability to run a website preview. It needs only
its canonical close sources plus GitHub read/write access sufficient to read
the contract/schema and create or update the publication-only PR. The target
repository must remain private/restricted before unapproved release data enters
a branch.

Website CI verifies that the PR changes exactly that one path, validates the
incoming file against complete website history, derives all calculated values,
runs tests, builds the static site, and uploads a seven-day restricted preview
artifact. The principal reviews that artifact. Merge and production deployment
are separate deliberate principal actions.

The website never reads a Master Sheet, brokerage state, raw ledger, client or
mirror data, or an Investment-project working export. No person manually
manages snapshots or transformations in this repository. Historical releases
and corrections are append-only records inside the same publication file.

The current approved mock cannot seed that file: its performance is dated July
2026 while composition, holdings, and attribution are dated June 2026. The
website does not choose the actual benchmark series identifier/basis or what
the official `net` owner return is net of. Both are required production
metadata supplied automatically from the Investment project's existing closed
methodology. They are not principal decisions and do not block this website
architecture.

See `docs/investments-publication-contract.md` for the exact contract and
`docs/investment-project-handoff-prompt.md` for the ready-to-paste upstream task.
See `docs/publication-pr-and-release-workflow.md` for CI preview, privacy,
production separation, and rollback ownership.
See `docs/preview-approval-notes.md` for the small set of proposed interface
labels and unresolved production blockers that still require principal review.
