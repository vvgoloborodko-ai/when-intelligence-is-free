# Investments publication contract

## Contract identity

- Canonical implementation repository:
  `vvgoloborodko-ai/when-intelligence-is-free`
- The only monthly input:
  `data/investments/publication.json`
- Schema: `schemas/investments-publication.schema.json`
- Schema version: `1`
- Encoding/format: UTF-8 without BOM, strict JSON, two-space indentation,
  LF line endings, and one final newline as emitted by `JSON.stringify`.
  Object key order is not semantically significant.
- Maximum size: **524,288 UTF-8 bytes**. Maximum nesting depth is 24 and
  maximum parsed JSON node count is 15,000.

The JSON Schema documents structure. The JavaScript validator is also
authoritative because cross-record reconciliation, duplicate-key detection,
append-only history, public-data scanning, and deterministic calculations
cannot be expressed completely in JSON Schema alone.

There is no second snapshot, transform, chart-data file, summary file, or
operator-managed archive. The input is cumulative: the upstream publish command
carries prior sanitized records forward and appends the new effective close.

## Handoff ownership

The Investment project produces and locally sanitizes the payload, then uses
GitHub API access to create or update a website PR changing only
`data/investments/publication.json`. The website repository is intentionally
public; this final sanitized payload is approved for public disclosure before
it crosses the repository boundary. The Investment project does not need a
website checkout, website Git history, npm, Cloudflare access, or a local
website preview.

The website repository and its GitHub Actions workflows own exact validation,
append-only comparison against complete website history, deterministic
calculations, tests, the static build, and the seven-day preview artifact. CI
does not deploy production. Principal review and production are separate
actions.

## Root object

Every listed root field is required. Unknown fields fail validation.

| Field | Type | Rule |
| --- | --- | --- |
| `schema_version` | integer | Must equal `1`. |
| `generated_at` | ISO-8601 UTC timestamp | Canonical UTC with whole seconds (`YYYY-MM-DDTHH:MM:SSZ`); must not predate any effective as-of date, and a release preview rejects a future timestamp. |
| `conventions` | object | Permanent convention tuple below. |
| `performance` | array | Revisioned monthly primitive returns from January 2025. |
| `releases` | array | Revisioned public composition, holdings, attribution, and optional commentary. |
| `corrections` | array | Additive disclosures for revision 2+ records. Empty array is valid. |

Exact collection/text limits:

- `performance`: 1–2,400 records; `releases`: 1–1,200 records;
  `corrections`: 0–1,200 records;
- `holdings` and `attribution.items`: 1–200 items each;
- holding and position-attribution names: 1–120 characters;
- commentary: 1–20 paragraphs, 1–1,000 characters each and 6,000
  characters combined;
- correction reason: 20–1,000 characters; benchmark series identifier and
  methodology ID: 1–80 characters; methodology public description: 1–280
  characters;
- correction IDs are 12–64 lowercase letters/digits/hyphens and begin with
  `corr-YYYY-MM-DD-`;
- revisions are integers from 1 through 999; composition weights are
  `0.000000`–`100.000000`, holding weights are
  `0.000001`–`100.000000`, and attribution effects are
  `-1000.000000`–`1000.000000` in percentage points.

## Permanent conventions

All fields are required, unknown fields fail, and the tuple becomes immutable
after the first production publication.

```json
{
  "inception_date": "2025-01-01",
  "return_currency": "USD",
  "benchmark": {
    "name": "Nasdaq-100",
    "series_identifier": "SOURCE SERIES ID",
    "return_basis": "price_return"
  },
  "strategy_return_basis": {
    "basis": "net",
    "methodology_id": "EXISTING-CLOSED-METHODOLOGY-ID",
    "public_description": "Net of the items specified by the existing official closed owner-return methodology."
  },
  "audit_status": "unaudited",
  "period_convention": "official_calendar_month_close",
  "drawdown_convention": "month_end_series"
}
```

`benchmark.return_basis` is exactly `price_return` or `total_return`. The
Investment project must use the value defined by its actual benchmark series;
the website does not select it. `strategy_return_basis.basis` is fixed to
`net`, preserving approved baseline wording. `methodology_id` and
`public_description` must describe what that already-existing closed return is
net of; they may not create a new convention.

`series_identifier` is the exact source identifier and may contain safe single
spaces as well as letters, digits, `.`, `_`, `:`, `^`, `/`, `+`, and `-`.
Leading, trailing, repeated spaces and other characters fail.

No field exists for a book, portfolio, or public-practice name. The renderer
uses the approved generic label `Strategy` and does not invent a new label.

## Performance records

Every record has exactly these required fields:

```json
{
  "period": "2025-01",
  "as_of_date": "2025-01-31",
  "revision": 1,
  "strategy_return_pct": "1.234567",
  "benchmark_return_pct": "2.345678"
}
```

`correction_id` is the only optional field. It is forbidden on revision 1 and
required on revision 2+. Return fields are signed fixed-six-decimal strings in
percent, so `1.234567` means `+1.234567%`; scientific notation and JSON numbers
are rejected.

Validation rules:

- effective periods begin at `2025-01`, are unique by period/revision,
  contiguous, and strictly monthly through the current release;
- revision numbers start at 1 with no gaps;
- revisions are append-only; an old record is never edited or removed;
- `as_of_date` is a real date inside `period`, near the official month close,
  within its final seven calendar days, and not later than `generated_at`;
- strategy and benchmark returns share the same record, making period drift
  structurally impossible;
- returns must be from `-99.999999%` through `+1000.000000%`; a sequence that
  overflows or underflows finite deterministic arithmetic fails;
- the latest effective performance period equals the latest effective public
  release period.
- public comparison rows are derived as Month, trailing 3 months, trailing
  12 months, and Since inception; an unavailable trailing window renders as an
  explicit dash rather than being silently replaced with a different period.

## Public release records

A revision-1 release has exactly:

```json
{
  "period": "2026-07",
  "revision": 1,
  "composition": [
    {
      "sleeve_id": "physical-scarcity",
      "weight_pct_nav": "13.000000"
    },
    {
      "sleeve_id": "compute-platforms",
      "weight_pct_nav": "20.000000"
    },
    {
      "sleeve_id": "survivors-tolls-second-wave",
      "weight_pct_nav": "27.000000"
    },
    {
      "sleeve_id": "moonshots",
      "weight_pct_nav": "10.000000"
    },
    {
      "sleeve_id": "macro-scenario-bets",
      "weight_pct_nav": "10.000000"
    },
    {
      "sleeve_id": "reserve-optionality",
      "weight_pct_nav": "20.000000"
    }
  ],
  "holdings": [
    {
      "name": "Alphabet",
      "sleeve_id": "compute-platforms",
      "weight_pct_nav": "8.400000"
    }
  ],
  "attribution": {
    "level": "sleeve",
    "coverage": "selected",
    "items": [
      {
        "sleeve_id": "physical-scarcity",
        "effect_pp": "0.100000"
      }
    ]
  }
}
```

`commentary` and `correction_id` are the only optional release fields.
`correction_id` follows the same revision rule as performance.

The only sleeve IDs are:

- `physical-scarcity`
- `compute-platforms`
- `survivors-tolls-second-wave`
- `moonshots`
- `macro-scenario-bets`
- `reserve-optionality`

The approved public labels, descriptions, and range markers stay in static
approved content; monthly data supplies only weights. Exactly all six sleeves
appear once. `weight_pct_nav` is a fixed-six-decimal percent string. The sum
must equal `100%` within `0.0001` percentage point.

At least one named holding is required. Names are unique after Unicode
normalization, case folding, and whitespace collapse. No ticker, ISIN,
quantity, cost, account, broker, rank, absolute value, or top-holding flag is
accepted. A holding is greater than zero, no holding or per-sleeve published
holding subtotal may exceed its public sleeve weight, and all public holdings
together may not exceed 100%. Display order, rank, and displayed holding total
are derived.

Attribution is required for every Release-1 publication record. This is the
explicit task requirement and deliberately chooses the stricter allowed path
than the canonical rule that permits omission when attribution is unavailable.
The exporter must not publish that close until sanitized attribution is ready.
`level` is `sleeve` or `position`; `coverage` is `complete` or `selected`.

- Sleeve item: `{"sleeve_id":"physical-scarcity","effect_pp":"0.100000"}`.
- Position item: `{"holding_name":"Alphabet","effect_pp":"0.100000"}`.
- A position attribution name must match a named public holding in that same
  release after normalization; internal or undisclosed position labels cannot
  cross the publication boundary through attribution.
- Effects are signed fixed-six-decimal percentage points.
- Items are unique at their declared level.
- Complete sleeve attribution contains every sleeve once.
- Complete position attribution contains every named public holding exactly
  once. If the published holding list is not the full attribution universe,
  position coverage must be `selected`.
- Complete attribution reconciles to the same period's effective strategy monthly return
  within `0.01pp`.
- The surface explicitly labels both level and coverage: complete/selected and
  sleeve/position. A change cannot be hidden behind a generic heading.
- Selected attribution cannot contain zero-effect filler items.
- Contributor/detractor grouping and ranking are derived from the signed items.

The release contains no independent as-of date. It inherits the effective
performance record for its period, making mixed performance/composition/
holdings/attribution dates impossible by construction.

Release periods need not be contiguous. If a monthly public-release cycle is
missed, the next official close may resume without fabricating a retroactive
composition/holdings/attribution record. Performance history remains
contiguous, and the latest release must still match the latest performance
period. While no new close is published, the existing surface remains visible
with its derived overdue state.

## Optional commentary

The only form is:

```json
{
  "paragraphs": [
    "Approved plain-text Investments commentary."
  ]
}
```

Paragraphs are escaped as text. HTML, Markdown links, URLs, email addresses,
unapproved financial statistics, advice, solicitation, forward-looking return
claims, and forbidden public-data language fail. Omit commentary when approval
or sanitization is uncertain. The surface then states that no approved
Investments commentary was published for that close, so the disappearance of
an optional disclosure is not silent.

## Corrections

A correction entry has exactly:

```json
{
  "id": "corr-2026-08-15-01",
  "period": "2026-07",
  "disclosed_on": "2026-08-15",
  "reason": "Approved public explanation of why the correction was required."
}
```

To correct a published record, append the complete corrected record at the next
revision in the affected stream and reference the correction ID. Performance
and release revision streams are independent: an older performance correction
does not require inventing a release for a month that never had one. One
correction ID may be referenced at most once in `performance` and at most once
in `releases`; if both records are affected, both references may share that ID.
If a performance correction would make effective complete attribution stop
reconciling, append the necessary release correction as well. Never edit or
delete revision 1. The validator computes and the website renders safe
before/after primitive changes from revisions; corrected numbers are forbidden
in correction prose. `disclosed_on` cannot precede the affected official close.
Existing correction entries are immutable and additive.
A convention change is not an ordinary correction and fails this schema
version.

Website CI checks out complete Git history whenever the publication input
exists. On a pull request, validation reads the publication from the exact base
commit SHA; updates to an unapproved PR draft therefore remain editable and do
not become publication history. If the base commit has no publication, that
proves an explicit first publication. Outside a pull request, an empty path
history proves a first publication; otherwise validation locates the last
distinct publication and compares the candidate to it. A shallow clone, Git
error, or unreadable prior blob fails closed. Existing records must be semantically identical,
arrays may only append, `generated_at` advances, and every revision 2+ has one
matching same-period correction. The Investment project does not perform this
website-history check.

## Public-data firewall

The handoff is rejected before rendering when any layer fails:

1. strict JSON parser: UTF-8, size/depth limits, duplicate-key rejection,
   prototype-key rejection, canonical formatting, and rejection of invisible
   default-ignorable Unicode characters;
2. exact schema: `additionalProperties: false` at every object depth;
3. semantic validation and period/total/reconciliation rules;
4. normalized sensitive-key and sensitive-text scanning;
5. rendered Investments-only scan before preview output.

Rejected concepts include AUM/assets under management, currency NAV/net asset
value, absolute capital or position values, notionals, quantities/shares/units,
cost basis, cash/account balances, account or broker identifiers/data,
client/mirror/blended data, F&F/friends-and-family, managed-money framing,
standing provenance labels (`personal portfolio`, `my own capital`, `own
funds`), and `fund` applied to the public practice. Currency symbols and
numeric or spelled currency/quantity amounts fail regardless of word order or
punctuation. Publication prose also rejects digits, all spelled number words,
and non-ASCII letters that could act as homoglyphs. The sole allowed currency
convention is the literal `USD`
field.

Scanning is scoped to the Investments input and rendered Investments blocks;
it does not rewrite unrelated approved site copy such as career credentials.
Unknown fields fail even when apparently harmless. Nothing is silently stripped.

## Deterministic calculations

Only primitive monthly returns, weights, and attribution effects are accepted.
The build derives:

- growth index: `G(0) = 1`; `G(t) = G(t-1) × (1 + r(t)/100)`;
- cumulative return: `(G(t) - 1) × 100`;
- current-month, trailing 3-month, trailing 12-month, and since-inception
  returns;
- compounded Strategy minus compounded benchmark excess in percentage points;
- month-end drawdown: `(G(t) / max(G(0..t)) - 1) × 100`;
- maximum month-end drawdown and its period;
- composition/holding totals, attribution reconciliation, contributor and
  detractor groups, rankings, chart scales/coordinates, and staleness state.

Calculations keep source precision and round only for display. Ties use a
normalized-name secondary sort. Negative zero is normalized to zero. The chart
and its monthly table use the same derived rows.

Every financial block shows the one inherited as-of date and `updated monthly`.
Staleness is derived, not typed: a close becomes overdue on the 15th day of the
second calendar month after its reporting period. An old date remains visible;
the website never fabricates freshness.

## Required upstream source metadata

The website sources do not answer either item below. They are required
production metadata supplied automatically from the Investment project's
existing official sources; they are not principal decisions and do not block
the website restructure:

1. **Benchmark:** Which exact Nasdaq-100 series identifier is used by the
   Investment project's official closed-NAV benchmark history, and does that
   identifier define price return or total return?
2. **Owner return:** What exactly does the existing official closed owner-return
   methodology deduct when it labels the series `net`?

The Investment project must resolve both from its actual methodology before a
production Investments release can validate. It must not ask the principal to
choose them, substitute another series, or create a new return convention.
