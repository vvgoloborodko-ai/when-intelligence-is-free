# Website finishing pass: 17 November 2026

Owner authorised the full attached brief and explicitly approved renaming Build
to Record. The earlier agentic-system sentence remains. The owner subsequently
said to use the current sharing card; M1 is therefore skipped by instruction.

## Item disposition

| Item | Status | Result |
| --- | --- | --- |
| H1 | Done | Nav and section label are Record; career anchor and hero link use #record. Logo line stays Build. Research. Invest. |
| H2 | Done | Section 03 is How I work. |
| H3 | Done | Three outcome cards: $7M → $15M, 2×, 0 → 3M+. Wording follows the claims ledger. Thin spaces surround arrows; stat values are paragraphs rather than headings. |
| H4 | Done | Consulting case separates seven years delivering programmes from three running the unit, 2014–2017. Role label says programme lead, then unit head. |
| H5 | Done | Four repeated explanations removed. One three-sentence closing paragraph connects economics, stopping weak bets, operating change and what still earns. |
| H6 | Done | Heading is Where I found trapped value. |
| H7 | Done | Roles that fit: interim COO/transformation lead; portfolio-company operating role; COO/CPO in fintech. CEO removed. |
| H8 | Done | Portfolio card heading is A live portfolio since January 2025. Returns and full period, fee, currency, benchmark and unaudited basis sit in the body and derive from the same publication as Invest. |
| H9 | Done | Intro names unclear economics, weak demand and an outgrown operating model. Closing sentence explicitly connects the economic view and operating experience. |
| H10 | Done | Email is the first contact action; Calendly is second. |
| H11 | Changed | Current site had a copy-email button rather than the brief's obfuscated link. Replaced it with an entity-encoded mailto link labelled Email. Works without JavaScript. |
| I1 | Done | Hero, Returns and risk, portfolio, Monthly reviews with essays first, one final subscribe block. |
| I2 | Done | No visible embed URL; sole iframe title is Subscribe to the monthly review. |
| I3 | Done | October, September and August 2026; Latest only on October; September keeps /p/2609. |
| I4 | Done | Sentence-case titles; external arrows are on Read links outside H3 text. |
| I5 | Done | Largest-remainder allocation rounding sums to 100.0%: 13.1, 12.8, 9.0, 1.9, 29.3, 33.9. Full-precision source unchanged. |
| I6 | Done | Long-term range in table and legend; full-width space removed. |
| I7 | Done | Returns groups use separate tbody elements with a full-width scoped rowgroup header. |
| I8 | Done | Percentage axis labels consistently show one decimal place on desktop and mobile, in both chart views. |
| I9 | Done | Notes name the AI parts and macro weight. |
| I10 | Done | Full-precision and displayed-month compounding reconciled below; no financial data edited. |
| M1 | Skipped | Owner said to use current card during this task. Both pages retain AI Capital Cycle. |
| M2 | Done | Titles, Open Graph, Twitter metadata, alt text and generated page HTML contain no em dashes. |
| M3 | Done | Both pages publish en_GB. |
| M4 | Done | Home Person JSON-LD has name, Home URL, current portrait and LinkedIn/publication sameAs; no job title. |
| M5 | Done | Replaced the obsolete PNG tagline with Build. Research. Invest. Removed the CSS clipping that hid the old line. |
| M6 | Done | Existing ICO, PNG favicon and 180px apple-touch-icon are included in both page heads and build output. |
| M7 | Done | Each chart has a text description stating series, period, USD, gross fees/after trading costs and unaudited basis, connected by aria-describedby. Monthly description and table live inside the monthly view. |

## Claims and performance evidence

Verified against canonical Board Strategy §8 on 17 November 2026. Public claims
used: consulting revenue $7M to $15M in 2014–2017, margin ~breakeven to ~30%,
~200-person unit, leaders scaling to 1,000+ people, four SmartPay pivots, DEGIRO
three teams to 12 squads and product/engineering doubled to ~60, five integrated
businesses and 3M+ acquired users. Career dates and two decades follow §8.1 and
§8.2. Omitted the €100M headline and the five-portfolio count because those
numbers were not in the inspected claims table. Structural section/card numbers
are labels rather than career or financial claims.

Both pages use data/investments/publication.json through renderInvestments.
The summary, charts, returns groups and monthly history all use the same
revision-resolved monthly series. No independent annual figures, flows or
manual overrides enter the landing renderer.

| Strategy period | Compounded full precision | Displayed headline | Compounded one-decimal displayed months |
| --- | ---: | ---: | ---: |
| Calendar 2025 | 70.18067714589233% | +70.2% | 70.5077180338618% |
| January 2025 to October 2026 | 73.71121226385489% | +73.7% | 74.11634658926167% |

The gap is fully reproduced by rounding each monthly return to one decimal
before compounding. It is a display-rounding effect, not a separate flow-timing
calculation. The frozen publication and its methodology are unchanged. Both
pages show strategy +73.7% versus Nasdaq-100 price return +35.1%, 1 January 2025
to 31 October 2026, USD, gross of fees, unaudited.

## Validation and release

Run npm run check and npm run build:release before publishing. The expanded
landing checks cover section order, anchors, assets, one embed, email ordering,
metadata, Person data, allocation arithmetic, table groups, chart descriptions,
monthly-chart geometry and unchanged financial values. All 64 regression tests
also run. Financial inputs, investment ranges, theme colour, portrait and
typography are unchanged. CSS changes adapt existing components to three cards,
the removed hero form and semantic table groups.

Production verification and sharing-debugger results are recorded after release.
Rollback: revert the finishing-pass implementation commit without overwriting
later unrelated changes.

## Screenshots

Captured at 1440 × 1000 desktop and 390 × 844 mobile. Baseline is the public
site before this pass; after images show the released public site.

| Surface | Before | After |
| --- | --- | --- |
| Home desktop | [Before](screenshots/before-home-desktop.jpg) | [After](screenshots/after-home-desktop.jpg) |
| Home mobile | [Before](screenshots/before-home-mobile.jpg) | [After](screenshots/after-home-mobile.jpg) |
| Invest desktop | [Before](screenshots/before-invest-desktop.jpg) | [After](screenshots/after-invest-desktop.jpg) |
| Invest mobile | [Before](screenshots/before-invest-mobile.jpg) | [After](screenshots/after-invest-mobile.jpg) |
