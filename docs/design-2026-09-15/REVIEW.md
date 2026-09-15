# Four-page implementation and principal review

15 September 2026. The principal approved the design, requested six final refinements, and explicitly authorized merging to main and deploying to production.

## Final refinements

- Preserved both supplied PNG identity assets and their visual-system document in src/assets/brand. The dark asset contains low-alpha grey background pixels; an SVG alpha transfer clears this backdrop at render time while retaining the supplied artwork. Header rendering was inspected at desktop and mobile sizes.
- Home Research eyebrow now matches the navigation. Home author and About biography use the principal's Fortune 500 wording; About metadata agrees.
- Investments hero places its four facts in a right-hand column on desktop and stacks them on small screens. Inception remains derived from the publication.
- Removed only the requested Investments date/conventions lines and detailed methodology/risk block. Home proof conventions and the chart's shorter warning remain. Publication inputs, schemas, financial calculations and history rules are unchanged.
- About places Substack beside LinkedIn.
- The dated copy ledger and pinned design/work-order files record these explicit approvals; the immutable baseline is unchanged.

## Verification

- Node 22.23.2: all 62 tests, approved-copy validation, publication/schema/history validation and build passed.
- Browser functional checks passed on all five routes at 1440, 768, 390 and 320px, including no-JavaScript content/navigation, repeated Subscribe links, keyboard performance controls and direct routes. No page overflow.
- Inspected all four desktop and mobile screenshots with real Fraunces fonts. Network measurements additionally cover all four pages at 768px and Home at 320px.
- Native Substack form loaded successfully throughout; body background is transparent and scroll height equals its 150px frame at 480, 350 and 280px widths. The dedicated 320px footer screenshot shows email, Subscribe and legal links without clipping. No subscription or booking was submitted. Full-page browser captures can omit offscreen iframe painting; use the dedicated footer screenshot to assess the form.
- The same derived financial source supplies Home and Investments. The full source contains all holdings, while presentation selects five using full precision and stable source order. Commentary uses approved token rendering and the verified-month link/archive fallback.

## Release

The configured existing Site is used with its current audience preserved. Before this release, the saved production version was 12, with source 797f5ccca62e5a76384319ac2071937fcc343619 and deployment appgdep_6a99351099448191b4a96eed6ecdd935. The saved archive/version remains available for rollback by redeploying it. No analytics, access-policy or DNS change is requested. Build evidence deliberately describes build output and does not itself authorize publication; the principal's explicit approval governs this release.
