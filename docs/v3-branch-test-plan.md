# V3 branch test plan

This plan applies to `codex/v3-copy-structure`. It is a draft review branch,
not production approval. It does not change DNS, hosting, Cloudflare Pages, the
Investments schema, or any published financial primitive.

## Start the local preview

From the repository root:

```powershell
git fetch origin
git switch codex/v3-copy-structure
npm run check
npm run preview:release
```

Open `http://127.0.0.1:4173/`. Stop the preview with `Ctrl+C`.

The automated check includes an in-memory synchronization regression: it
advances a synthetic fixture's close date and one primitive return without
writing that fixture into the repository, then confirms that Home and
Investments render the same derived cumulative result.

## Home

Test at 1280 px and 380 px:

1. Confirm the proof strip sits directly below the hero and above the map.
2. Confirm its two cumulative returns match Investments and that it does not
   show the inception or as-of date phrase.
3. Confirm Substitute, Amplify, Reprice, and Unlock remain static,
   non-clickable tiles.
4. Confirm there is no extra Unlock subcopy.
5. Confirm the biography link says “Work with me →” and opens `/advisory/`.

## Investments

Open `http://127.0.0.1:4173/investments/`:

1. Confirm the section heading reads “Performance history”. At both widths,
   confirm “Monthly performance history” shows the latest three months in
   newest-first order. Expand “Show earlier months” and confirm the remaining
   Strategy / Nasdaq-100 / Excess series appears. At 380 px, both comparison
   tables must share column positions and fit without horizontal scrolling.
2. Confirm the close note heading is “July 2026 · close note”, its date is
   “31 July 2026”, the existing body is unchanged, and the two links appear in
   the required order.
3. Confirm the standing disclaimer is below Composition and is not clipped at
   either width.

## Advisory and subscribe promise

Open `http://127.0.0.1:4173/advisory/`. Confirm both “Start a conversation”
buttons use the same Calendly target, with the second directly after Why me.

Across `/`, `/research/`, `/investments/`, and `/advisory/`, confirm each
subscribe ask says exactly:

> Essays as they ship, a short note at every monthly close, and a full review each quarter.

## Head tags and social cards

Use View Source on each route and verify its distinct title, description,
self-referential canonical URL, `og:image`, and `twitter:image`. The four local
cards are:

- `http://127.0.0.1:4173/assets/social-home.png`
- `http://127.0.0.1:4173/assets/social-research.png`
- `http://127.0.0.1:4173/assets/social-investments.png`
- `http://127.0.0.1:4173/assets/social-advisory.png`

Each is a 1200 × 630 PNG. External card validators require an HTTPS-accessible
branch preview URL; local addresses cannot be fetched by those services.

## Governance flags confirmed

- Inception is already a required publication field at
  `conventions.inception_date`; the current published value is `2025-01-01`.
  This branch does not change it.
- Performance, benchmark, proof-strip, composition, holdings, attribution, and
  close-note dates all derive from `data/investments/publication.json`.
- Current rendered financial blocks share the same close date; no mixed-date
  figures appear in the same eyeline.
