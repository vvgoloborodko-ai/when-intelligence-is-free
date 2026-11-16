# Home and Invest release — 16 November 2026

Owner supplied the PROD Home and Invest PNG mocks and authorized production deployment. Follow-up confirms Home at `/`, Invest at `/invest/`, only About redirects to Home, and native Substack embeds. Other former partner routes are removed, without new redirects. Build links to the Home experience section; Contact links to the Home contact section.

Owner explicitly chose “gross” for displayed strategy performance. Published historical returns, corrections, methodology and financial inputs remain unchanged. Presentation says gross of fees, after trading costs, before fees; this is a display convention approved for this release, not a recalculation or amendment of the upstream net-labelled publication contract.

The existing real portrait, research URLs, LinkedIn and Calendly are reused. Return charts, risk metrics, allocation, top five positions and as-of dates derive from the revision-resolved publication. Content and layout follow the supplied mocks; native Substack forms are retained rather than replaced by decorative fields.

Validate with `npm run check` and `npm run build:release`. Merge to GitHub main for Cloudflare Pages production. Verify Home, Invest and About on the public domain. Roll back by reverting this release commit, preserving unrelated later work.

Follow-up: restored the existing shared stylesheet and typography (Georgia body,
Fraunces headings, IBM Plex Mono labels), brand palette, asset-based lighthouse
wordmark and full-width BUILD. RESEARCH. INVEST. line. Portrait is hidden on
mobile, only the first experience case starts open, and Contact uses Calendly
plus a copy-email button with transient feedback. Invest uses the standard
light Substack embed with consistent headings and removes the redundant label
and section-link strip. The output copier now copies static file contents
without fs.cp's post-copy chmod, avoiding intermittent Windows build failures.

Second follow-up: removed the added brand tagline, separated and centered the
footer disclaimer, and used the owner's exact transparent=1 Substack embed
(480 × 150, no frame or scrolling). Restored the existing cumulative/monthly
performance control, monthly grouped bars and expandable monthly history using
the established renderer and keyboard interaction. Monthly chart SVG values
are checked against the underlying publication renderer. Output copies retry
brief transient Windows EPERM/EBUSY locks, while other errors still fail.
