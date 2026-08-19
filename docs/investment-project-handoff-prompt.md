# Ready-to-paste prompt for the Investment project

```text
Implement one `/publish-website` command in the Investment project. After each
official monthly close it must read the project's canonical close sources,
sanitize there, and generate the cumulative payload defined by:
- vvgoloborodko-ai/when-intelligence-is-free/schemas/investments-publication.schema.json
- vvgoloborodko-ai/when-intelligence-is-free/docs/investments-publication-contract.md

Include reporting dates; Strategy and actual Nasdaq-100 monthly returns;
composition as % NAV; sanitized named holdings and weights; required
percentage-point attribution; and approved commentary only when safe. Populate
from existing methodology the exact benchmark series identifier and its
price/total-return basis, plus the official net owner-return methodology ID and
public deductions description. Do not ask the principal to define, invent, or
change these conventions.

Before handoff, reject AUM, currency NAV, absolute capital/position values,
quantities, cost basis, balances, account IDs, broker/client/mirror/F&F data,
managed-money framing, and “fund” applied to the practice. Never transfer raw
exports, logs, snapshots, rejected payloads, or intermediate files.

Validate the JSON against the schema where practical. With GitHub API access,
create/update `investments/YYYY-MM-publication` and its PR in the public
repository `vvgoloborodko-ai/when-intelligence-is-free`. The PR must change
exactly one file:

data/investments/publication.json

The command itself must complete every upstream step through creating or
updating the PR. Do not require manual snapshots, transformations, uploads,
branch management, or intermediate website files.

The final sanitized JSON may be publicly visible in its branch/PR. Additional
access is limited to GitHub read/write permission for the contract/schema,
branch, file, and PR. Do not require a website checkout/history, npm,
Cloudflare, or local preview.

Website CI owns append-only history validation, calculations, tests, the static
build, and preview artifact. Report the PR URL and only safe validation evidence.
Never merge or deploy; principal review and production are separate actions.
```
