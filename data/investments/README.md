# Investments publication handoff

The only monthly website input is:

`data/investments/publication.json`

That file is generated only by the Investment project's `/publish-website`
command from its official close, including the actual closed-series benchmark
identifier/basis and existing owner-return `net` methodology. Do not create it
manually and do not place raw operational
exports, snapshots, working files, or intermediate transformations here.
Repository validation rejects every other file in this directory. The final
input must be UTF-8/LF canonical JSON and no larger than 524,288 bytes.

The exact contract is documented in
`docs/investments-publication-contract.md`. The JSON Schema is its
machine-readable structural companion; the dependency-free JavaScript
validator is authoritative for strict parsing, schema shape, cross-record
semantics, transitions, firewall rules, and deterministic arithmetic.

The upstream command opens or updates a GitHub PR containing only this file
change. This repository is public because the file is already sanitized and
approved for public disclosure before it crosses the repository boundary.
Website CI—not the Investment project—uses complete website Git history, runs
the validator/build, and produces the review artifact. Production deployment
is not part of that workflow.
