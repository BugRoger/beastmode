# Report Structure

## Context
Validation reports need a consistent, scannable format for both human readers and any future automation. Across 41+ reports, a universal skeleton emerged.

## Decision
Every validation report follows a fixed structure: header (date, feature, PASS/FAIL status), standard gates section (tests/lint/types with results or skip rationale), custom gates table with pass/fail per gate, acceptance criteria matrix, feature completion tracking (for multi-feature deliveries), and gate count summary.

## Rationale
Consistent structure makes reports scannable and comparable across features. Missing sections would be ambiguous — did the check not apply, or was it forgotten? The gate count summary ("10/10 criteria verified") gives quick pass/fail without reading every row. Feature completion tracking lists sub-features and their status for multi-part deliveries.

## Source
- .beastmode/state/validate/2026-03-04-implement-v2.md
- .beastmode/state/validate/2026-03-05-design-approval-summary.md
- .beastmode/state/validate/2026-03-06-hierarchy-cleanup.md
- .beastmode/state/validate/2026-03-29-cmux-integration-revisited.md
