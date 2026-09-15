# Implementation specification

Approved handoff: 15 September 2026

## Authority and deliverables

Implement the four approved surfaces in the existing repository. This package supersedes the earlier iteration notes for these surfaces. Do not use the old image-generation prompts as implementation instructions.

Design priority:
1. The final overrides below
2. APPROVED-COPY.json for exact static wording and destinations
3. This specification for behavior, bindings and responsive layout
4. The four reference PNGs for composition and visual character
5. The supplied visual-system document for brand asset handling

These priorities apply to design/copy. They do not authorize changing published financial facts or bypassing repository/environment controls.

Required result: functional responsive HTML/CSS, current data, working routes and controls, local/review preview, inspected screenshots and passing checks. Screenshots in this package are references with explicit final overrides, not updated product screenshots.

## Final changes to the references

| Reference element | Final implementation |
| --- | --- |
| Return methodology and full history link | Remove, with no replacement CTA |
| Nine published positions | Five largest published positions, ranked by current numeric % NAV |
| Published positions heading | Top 5 published positions |
| 77.3% coverage caption | Remove entirely |
| Sleeves and positions unequal block heights | Align headings, row-region starts and bottom edges on desktop |
| White Substack panel in each PNG | Exact transparent iframe from assets/substack-embed.html |
| Compressed footer top edge | 64px top padding on desktop; 40px on mobile |
| Hard-coded August figures or review text | Latest valid publication and existing rendering pipeline |

The source guarantees named/published holdings, not full disclosure. Therefore the qualifier "published" is necessary. Rank a copy of the complete derived holdings array at unrounded precision, take up to five and preserve stable source ordering for equal weights. Do not mutate upstream holdings or the globally derived data.

At the checked August close, the resulting five are Strategy Inc, iShares USD Treasury Bond 0-1yr UCITS ETF, Sprott Physical Silver Trust, Tesla Inc and Alphabet Inc Class A. Their displayed weights in that snapshot are 19.4%, 16.7%, 16.0%, 6.7% and 6.2%. These are a verification example only; use the current input at implementation time.

All six sleeves stay visible in their existing approved order. Do not renormalize the five holdings to 100%, select rows by hand, add a fake position or force equal height by hiding content. Both columns should stretch to a shared content height, with the five position rows given a little more vertical space than the six sleeve rows. On mobile the columns stack naturally and no equal-height constraint applies. Use "% NAV" for the weight column. Long source names wrap legibly.

## Product and information architecture

Home makes the reader curious about the post-AI economy, exposes four ways value moves and three phases of the capital cycle, links to the relevant essays, supplies investment evidence, then invites subscription.

Investments answers what is owned, how the strategy performed relative to the stated benchmark, and what informed the latest review. Its higher data density is intentional.

Advisory explains which company/product/capital decisions the author helps with, the possible formats, relevant operating experience and how to begin a conversation.

About introduces the author, the two research horizons and experience, then points to the work.

Do not add a fund application funnel, AUM claims, invented testimonials, a portrait, a pricing table, a fresh archive on Home, popup subscription or decorative technology imagery.

Routes:
- / is the primary research landing page. Logo and Research navigation go here.
- /investments/ and /advisory/ keep their existing destinations.
- /about/ is new. Add it throughout the build's route/view/metadata handling and preview routing.
- Existing /research/ is already public. Keep its deeper research content and existing useful anchors reachable with the shared header/footer and base styling. It is not a fifth newly designed page. Mark Research current on that route. Do not delete it or silently redirect away its content.
- Preserve existing /thesis and /thesis/ redirects.
- Preserve relevant inbound hash links; map old subscription anchors to the real footer if necessary.
- New Home IDs: framework, capital-cycle, author, subscribe.
- Each independent document may use id="subscribe"; exactly one visible subscription area per rendered page.
- No navigation item requires JavaScript to reach its page.

## Visual system and assets

Use the references for proportions and hierarchy. The final implementation should feel like the same editorial publication.

- Cream background: #FFF1E5
- Navy text/bands: #0D2231
- Amber display emphasis: approximately #B87822
- Framework red/green/amber/blue: restrained versions of the existing brand colors; supplied icons use currentColor
- Thin rules, flat sections, open editorial grids, near-square buttons and purposeful whitespace
- No rounded dashboard cards, shadows, fake texture overlays or generic gradients

Reuse the repository's Fraunces display serif, Georgia body stack and IBM Plex Mono/sans labels where available. Adjust the existing tokens so the new navy/cream design replaces the old green/card-heavy styling. Do not introduce an unnecessary font service or framework.

Desktop composition target: 1440px viewport, centered content around 1280px, roughly 64–80px outside gutters. The screenshot files have slightly different export scales; compare at equivalent viewport widths rather than blindly copying their pixel dimensions. Preserve relative hierarchy. Body text should be comfortably readable, approximately 18–20 CSS px at desktop. Eyebrows are smaller and restrained; paragraph text must not become tiny to force a line count.

Use assets/brand/WIF_brandmark_transparent_dark.png in the cream header, maintaining its full aspect ratio and clear space. The reverse PNG is supplied for legitimate dark-background uses. Do not redraw, recolor, trim, rebuild or distort the brandmark. A full wordmark replaces the old isolated lighthouse plus HTML site-title combination. Meaningful alt text: "When Intelligence Is Free". Keep existing favicons.

The four SVG route icons are ready for inline use at matching optical sizes and stroke width. Label text already names each route, so mark decorative icons aria-hidden. Substitute uses documents plus a replacement pointer; Amplify uses rising bars plus an arrow; Reprice a diamond; Unlock an open padlock. Do not use emoji.

The standalone panorama is a production asset derived with image generation from the approved composition. Use it only in the Home capital-cycle band. Keep the central river and missing span visible. Desktop can use approximately 4:1 presentation with object-fit: cover and careful object-position; the underlying file is wider than a normal photograph. On mobile prefer the full panorama or a mild crop that preserves construction, the central gap and the future city. Do not crop down to the gap alone. The page header supplies the branding; the panorama intentionally has no lettering or embedded logo.

Framework lines, phase names, dots and financial graphics are native code, not text baked into a bitmap. Never use the mockup PNG as a page background or image map.

## Home composition

Order:
1. Header
2. Hero
3. Four ways value moves
4. AI capital cycle
5. Public-book proof row
6. Author and Advisory row
7. Subscription footer

Hero: oversized three-line question, last line amber italic. Body uses the concrete wording in the copy file. No CTA, byline, latest-research link or unexplained acronym.

Framework: spacious 2×2 grid. One icon, colored route label, question, and two balanced lines of body copy per cell at the 1440px target. Read the founding essay is a visible outlined navy button below. No third sentence, extra conclusion or archive.

Cycle: navy band with cream text. At 1440px the entire "Every technology boom borrows from the future" heading must fit on one line at a readable display size. At narrower widths wrap rather than clip or force horizontal page scrolling. One panorama, an amber line with three points, three aligned phase labels and two-line captions. The center Digestion point aligns with the river/missing bridge span. The cycle represents a multiyear transition reviewed quarterly, not three quarterly trading states. No invented phase dates. The capital-cycle essay button uses a cream outline.

Investment proof row: left explanation/link; right two comparable-size cumulative figures and shared dates/conventions. Both are subordinate to the heading. Values bind to the current derived publication. No monthly case study on Home.

Author row: biography at left and compact Advisory proposition at right. Preserve exact name and biography. The repeated "partner" from old drafts must not return.

## Investments behavior and data

Keep the existing financial calculations and validation. The data entry point is data/investments/publication.json. This handoff does not supply a replacement publication file and does not authorize editing it.

- Use actual conventions for strategy net basis, benchmark identity/price or total-return basis, return currency, audit status, inception date and drawdown convention.
- Preserve the complete monthly performance series. All available points must remain in the cumulative chart; never approximate from screenshot curves or three summary values.
- Preserve the functional Cumulative/Monthly control, accessible keyboard state and readable tables/no-JS fallback.
- Keep the four performance comparison periods: 1 month, 3 months, 12 months, since inception. Preserve existing unavailable-data behavior.
- Keep the dated past-performance wording. Removing the vague methodology/history link does not remove financial conventions, available monthly history, corrections, validation or derived evidence.
- Never present price-return benchmark results as total return or claim risk-adjusted alpha.
- Limit only the holdings presentation to five. The full source must still feed validation and any legitimate totals.
- Do not change sleeve names/ranges or their source file merely to obtain a visual effect.

Latest review:
- Heading is evergreen: What drove the month. Eyebrow binds to the latest close's month/year.
- Show a concise excerpt using the first two approved commentary paragraphs from that release, with the existing safe derived-token renderer. Do not freeze the screenshot's August/macro paragraph into future months or generate new market claims at build time.
- If commentary is missing, use the repository's honest missing-commentary behavior.
- The currently verified August 2026 full-review URL is https://read.whenintelligenceisfree.com/p/2608. It is configured in src/content/v3-work-order.json, not in the publication schema.
- Only label/link an article as the current month's review when its month is verified to match. Do not invent future slug patterns or silently keep linking September data to August.
- For a later close with no verified month-specific URL, use the existing archive https://read.whenintelligenceisfree.com/t/investments with label "Read investment reviews ↗". Keep the excerpt current from the publication.
- Do not add URL fields to the financial publication schema for this redesign.

This gives the page useful current evidence without a new monthly manual editing task.

## Advisory and About

Follow their individual reference compositions and exact static copy.

Advisory has a conversation CTA in the hero and again before the subscription close. Both open the existing Calendly URL. Do not embed a booking interface, send messages, invent prices/durations or add a contact form.

About has a typographic name-led hero, no fake portrait, one navy research-process section, four experience rows and three pathways. Use the supplied biography. Avoid duplicated eyebrows that merely repeat a section heading.

On desktop, related explanation rows have balanced density and aligned buttons. On mobile, stack in a sensible reading order with comfortable spacing.

## Shared transparent subscription footer

Use the exact source snippet in assets/substack-embed.html:
<iframe src="https://read.whenintelligenceisfree.com/embed?transparent=1&light=1" width="480" height="150" style="border: 0; background: transparent" frameborder="0" scrolling="no"></iframe>

Add title="Subscribe to When Intelligence Is Free", a class, and suitable loading behavior. Preserve the supplied src and query parameters. Width may be constrained responsively by CSS to fit the container, while retaining the requested intrinsic width/height. Start with height 150px.

The native form owns its input, button text, legal notices and internal UI. Do not build a proxy subscription endpoint, recreate the form, add duplicate legal notices under it or alter its cross-origin DOM. Remove the mock's white outer card/wrapper.

Use a shared footer component/template:
- Navy background
- Top padding: 64px desktop, 40px mobile
- Main content bottom padding: approximately 48px desktop, 32px mobile
- Two desktop columns: research invitation at left, embed up to 480px at right
- Approximately 48–64px column gap; stack on narrow screens with 24–32px separation
- Compact copyright/legal/social line below a thin rule

Header Subscribe points to the local #subscribe. Account for a sticky header using scroll-margin-top. Smooth scrolling is optional and must respect prefers-reduced-motion. Normal anchors must work without JavaScript. A second click when the same hash is already selected still reveals the form.

The base embed was verified in the previous design pass. This exact transparent query variant is principal-supplied; its browser rendering/contrast and narrow-width height must be checked during implementation. Do not report real subscription delivery as tested without submitting, and do not submit a real email during QA. If the actual native iframe clips at a narrow width, document the measurement and use a minimal responsive height allowance while keeping the 150px desktop baseline and supplied URL.

## Repository integration notes

Inspected main on 15 September 2026:
797f5ccca62e5a76384319ac2071937fcc343619
("Label latest cumulative chart values", committed 3 September 2026).
This is context, not a requirement to reset a newer checkout to an older commit.

Architecture:
- Node.js 22, package type module, dependency-light static output
- src/content/approved-public-content.html: semantic content
- src/content/approved-copy-changes.json: approved exact changes
- src/content/site-meta.json: routes, identity, embed and metadata
- src/content/investment-sleeves.json: governed sleeve labels/ranges
- src/content/investments-interface-copy.json: UI wording
- src/content/v3-work-order.json: older render-time overrides and review URLs
- src/site.template.html: shell
- src/styles/site.css: visual system and responsive behavior
- src/scripts/site.js: anchors/view logic and performance enhancement
- scripts/build.mjs: shared injection, selected-route rendering, metadata and assets
- scripts/lib/approved-copy.mjs: immutable baseline and current-content validation
- scripts/lib/investments.mjs: derived financial calculations
- scripts/lib/render-investments.mjs: presentation and safe commentary tokens
- scripts/lib/publication-history.mjs: history integrity
- src/static/: redirects, sitemap, robots and llms.txt
- scripts/sites-worker.mjs and existing hosting files: preserve hosting behavior

Concrete pitfalls:
- The old build assumes exactly three subscription placeholders and only four old views; update those structural assumptions for the actual shared footer and new About route.
- Old Advisory subscription href points to /#subscribe. Replace it with the local footer anchor.
- Old active-nav checks assume the home/research split and one matching data-nav key. Update them for Research leading to / and the retained legacy /research/.
- Old render-time work-order strings reintroduce copy rejected in the mocks. Reconcile them with this approved copy rather than allowing them to overwrite it.
- The historical WIIF_Landing_v3_Mock_2026-08-18.html and its pinned checksum remain unchanged. Record this newly approved copy/link revision through the existing dated ledger mechanism. Keep validation effective.
- README still contains old statements that publication data is absent; verify real files in the checkout.
- Add About to metadata, sitemap and structured data. Preserve crawlable route output, existing social preview behavior and canonical URLs. Update stale page descriptions to the approved visible copy.
- Existing tests that encode deliberately replaced UI must be updated to the new approved behavior. Financial/schema/history/boundary tests retain their guarantees.
- Do not hand-edit dist instead of source or change the upstream single-file publication contract.

Build commands presently include npm run check, npm run build:release and npm run preview:release. Use the current README/package definitions. Full-history requirements apply to release validation; do not weaken them to accommodate a shallow checkout.

## Responsive and accessibility requirements

Desktop 1440px is the primary visual target; also inspect 768px, 390px and a 320px footer smoke check.

- Use real heading hierarchy, landmarks, links and semantic data tables.
- Preserve contrast, visible keyboard focus and adequate touch targets.
- Make the header fit using a proper compact/mobile navigation rather than shrinking links illegibly.
- Stack framework cells, phase descriptions and multi-column rows when needed.
- Keep the full cycle mechanism understandable on mobile.
- Table-only controlled horizontal scrolling is acceptable where necessary; no whole-page overflow.
- Financial and subscription content must not be clipped, hidden to match height, or reduced to unreadable type.
- At 1440px use the balanced line counts in the references. Below that, natural reflow has priority.
- Do not disable zoom or rely on hover-only information.
- No artificial loading/success state that implies a completed real subscription.

Acceptance is in ACCEPTANCE.md. Deliver a reviewable implementation and preview before any production action.

