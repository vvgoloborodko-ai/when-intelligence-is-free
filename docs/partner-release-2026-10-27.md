# Partner site release — 27 October 2026

The owner approved transferring the reviewed local partner site to production
on 27 October 2026, with About replaced by the supplied v10 “Four seats in a
technology cycle” mockup. The shared header, footer, real portrait, subscription
embed and call links are retained. The brand gains the subtitle “AI Capital
Cycle Strategy”. This authorization supersedes the earlier preview-only request.

The six public pages are Home, Strategy, Performance, Certificate, About and
Letter. The previously reviewed v8 copy and PDF remain unchanged outside the
new About and shared brand subtitle. The original portfolio publication,
historical records, calculation conventions and baseline design sources remain
unchanged. The separate About copy is in `src/content/about-v10.json`.

## Release and rollback

`npm run check` validates the protected sources and publication, runs the
regression suite and partner checks, and builds the six production pages.
`npm run build:release` is the Cloudflare Pages production build; its output is
`dist`. The exported baseline builder remains available to regression tests.
`npm run build:partner` produces a noindex local preview instead.

Publish through GitHub `main` in `vvgoloborodko-ai/when-intelligence-is-free`;
Cloudflare Pages deploys it to `https://whenintelligenceisfree.com`. Verify the
public domain after deployment. The separate private Sites deployment is not
the production target.

Previous production source: `2e1001db8ec34f2d1cd7d8cf000ad5e28a94bb75`, including
the independently updated social preview asset. Roll back by reverting this
release commit on main and letting Cloudflare redeploy; retain unrelated later
changes. No hosting credentials or private source documents are in this release.

Follow-up on 27 October: the owner requested removal of the added strategy
subtitle from the shared logo and immediate production publication. The original
lighthouse and wordmark remain, with no tagline beneath the name.
