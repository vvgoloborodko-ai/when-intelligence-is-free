# Publication PR and release workflow

## Monthly operator path

```text
official close
→ Investment project `/publish-website`
→ sanitize and validate one cumulative JSON payload upstream
→ create/update a publication-only website PR
→ website CI validates history/schema/firewall and builds
→ CI uploads a seven-day static preview artifact
→ principal reviews
→ production remains a separate principal action
```

The Investment project requires its canonical close sources and GitHub access
that can read the website contract/schema, update
`investments/YYYY-MM-publication`, and create/update its PR. It does not need a
website checkout, website Git history, npm, Cloudflare access, or preview
runtime.

The website repository is intentionally public. The final publication JSON is
sanitized and approved for public disclosure before it crosses the repository
boundary, so it may be visible in its branch and PR before website production
deployment. Raw investment data, intermediate exports, logs, snapshots,
rejected payloads, and operational/private investment data never cross that
boundary.

## Website CI

`.github/workflows/website-ci.yml` runs the full dependency-free validation,
test, and build suite on every PR and on `main`.

`.github/workflows/investments-publication-preview.yml` additionally:

1. checks out complete website history;
2. rejects any PR that changes a path other than
   `data/investments/publication.json`;
3. validates the strict publication and append-only transition against the
   PR's website base commit—not against an earlier unapproved draft on the PR;
4. runs the regression tests and release build;
5. uploads `dist/` plus safe release evidence as an artifact retained
   for seven days.

It has read-only repository permissions and contains no deploy step. The
principal downloads the artifact from the workflow run and reviews
`investments/index.html`. A merge does not itself represent principal approval
to deploy unless a separately approved hosting workflow is introduced later.

## Production and rollback preconditions

No production deployment workflow exists in this repository. Before the first
launch, the principal must approve the remaining blockers and the hosting setup
must record both the known-good production Git commit SHA and the corresponding
platform deployment identifier in a principal-controlled release record.

For a visible incident, restore that known-good deployment first, then
diagnose. A wrong financial figure or forbidden field also requires an additive
public correction after rollback. Do not reconstruct an old state from current
source files.

No approved analytics/tag-manager configuration was supplied. The restructure
therefore introduces no tracking. Analytics, consent behavior, cross-domain
attribution, and post-launch traffic verification remain explicit production
setup work rather than an inferred last-minute integration.
