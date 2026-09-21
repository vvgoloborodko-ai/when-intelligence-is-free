# Current brand favicons

Source: `src/assets/brand/WIF_brandmark_transparent_dark.png`, the exact
1784×368 approved header asset (also verified against the live asset). No
separate current vector master is present in this repository. The historical
`wiif_lighthouse_*` sources are not inputs to these icons.

`scripts/generate-favicons.cjs` extracts the complete lighthouse and beam from
the left of that asset, excluding the adjacent wordmark. It keeps source
colors, aspect ratio, alpha and edge pixels, then scales with Lanczos3 into a
transparent square with a small inset. The wordmark is omitted because it is
unreadable at favicon sizes. The approved header asset itself is unchanged.

Exports:

- `wif-brand-favicon.ico`: 32-bit RGBA PNG frames at 16, 32 and 64 pixels.
- `wif-brand-favicon-64.png`: 64×64 RGBA PNG.
- `wif-brand-apple-touch-icon-180.png`: 180×180 RGBA PNG.

To regenerate, run `node scripts/generate-favicons.cjs` with Sharp available
locally, or set `SHARP_MODULE_PATH` to its module path. Sharp is only needed for
asset authoring; the normal build copies the committed files without any new
dependencies. The exports were generated with Sharp 0.35.4.

The legacy source files are retained for historical use but the three legacy
favicons are no longer copied into either production output tree.
