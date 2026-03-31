---
phase: plan
epic: remove-dead-gates
feature: slug-gate-collapse
---

# Slug Gate Collapse

**Design:** `.beastmode/artifacts/design/2026-03-31-remove-dead-gates.md`

## User Stories

2. As a user, I want design checkpoint to auto-derive slugs without prompting, so that the naming step doesn't interrupt flow

## What to Build

In the design checkpoint phase, collapse the `[GATE|design.slug-proposal]` (step 1) to its auto-derive behavior only:

- Remove the gate syntax wrapper and both GATE-OPTION subsections
- Keep the auto-derive behavior inline: Claude synthesizes a slug from the problem statement and uses it directly, no prompt
- The conditional logic from step 0 (hex temp slug detection) remains — it just flows into the auto-derive behavior instead of a gate
- Renumber remaining steps if needed to maintain sequential order

## Acceptance Criteria

- [ ] No `[GATE|design.slug-proposal]` syntax in design checkpoint
- [ ] No `GATE-OPTION` subsections in design checkpoint
- [ ] Slug auto-derivation logic is preserved (synthesize from problem statement, use directly)
- [ ] Hex temp slug detection in step 0 still triggers slug derivation
- [ ] Steps are numbered sequentially
