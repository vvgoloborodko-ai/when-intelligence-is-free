# Preview approval notes

The principal-approved `WIIF_Landing_v3_Mock_2026-08-18.html` remains the
immutable visual/content baseline. Its public text, links, form labels, and
line-ending-normalized SHA-256 are guarded before every build. The source
baseline still contains its review-only subscription mock, while the generated
preview now replaces each mock card with the principal-supplied Substack iframe
and a plain canonical fallback link. The generated preview also uses the
supplied optimized logo/icon/social assets.

The following Release-1 interface additions are explicit proposals for
principal preview approval; none is authorized for production by this change:

- A valid monthly publication replaces only the Investments facts and data
  blocks. It adds the source benchmark identifier and price/total-return basis,
  USD, the existing net-methodology description, audit/period/drawdown
  conventions, one shared close date, monthly cadence, and a derived overdue
  state.
- The live data block uses the truthful neutral label **Named holdings** rather
  than the baseline's **Top holdings**. The contract guarantees sanitized named
  holdings but does not claim that an undisclosed position is smaller.
- Corrections show the approved nonnumeric reason plus deterministic
  before/after primitive changes. Corrected cumulative figures are never typed
  into the publication input.
- Attribution headings explicitly state complete/selected and sleeve/position.
  When commentary is omitted, the surface explicitly says no approved
  commentary was published for that close.
- The site has crawlable `/`, `/research/`, `/investments/`, and `/advisory/`
  routes with per-surface titles and descriptions using exact approved page
  sentences rather than paraphrased copy.
- Holdings use `% NAV`, and unavailable trailing 3-/12-month comparison windows
  show an explicit dash. The displayed comparison rows otherwise preserve the
  approved Month / 3 months / 12 months / Since inception structure.
- The performance chart intentionally becomes horizontally scrollable on small
  screens so its labels remain readable instead of being shrunk. The complete
  monthly table remains immediately available on the same surface.
- The Research time-path diagram likewise remains available through a deliberate
  horizontal mobile viewport instead of disappearing below 640px; its phase
  cards continue to provide the full textual equivalent.
- New Release-1 interface wording is isolated in
  `src/content/investments-interface-copy.json`, separate from templates,
  styling, validation, and calculation code.

The approved body contains two archive links without the canonical trailing
slash (`https://read.whenintelligenceisfree.com`). They are intentionally left
unchanged during the restructure. Normalizing those two approved attributes to
`https://read.whenintelligenceisfree.com/` is a future approval-level copy/link
change.

The following are required upstream metadata, not principal decisions or
blockers for the website architecture:

1. Which exact Nasdaq-100 series identifier is used by the Investment
   project's official closed-NAV benchmark history, and whether it is price
   return or total return.
2. What the existing official closed owner-return methodology deducts when it
   labels the series `net`.

They must be supplied automatically from the Investment project's official
sources before the first production Investments release; the website does not
invent them.

Structural heading tags were corrected without changing their words or visual
classes. The real Subscribe embed and supplied identity assets were explicitly
provided for this iteration and are not treated as inferred copy changes.

Production remains blocked on principal acceptance, removal/replacement of the
mock review strip and version strings, the Calendly placeholder, an approved
anti-harvesting contact treatment, an approved analytics/consent setup, and a
recorded/tested known-good rollback target. The build and CI preview workflows
do not deploy production.
