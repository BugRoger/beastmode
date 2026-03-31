---
phase: plan
epic: context-tree-compaction
feature: retro-value-gate
---

# Retro Value-Add Gate

**Design:** .beastmode/artifacts/design/2026-03-31-context-tree-compaction.md

## User Stories

1. As a retro walker, I want to check whether a proposed L3 record adds value beyond the L2 summary, so that redundant records are never created.

## What to Build

Add a value-add check to both retro walker agents (`retro-context.md` and `retro-meta.md`) that gates L3 proposal creation.

**Context walker (`retro-context.md`):** Before proposing an L3 record in the New Area Recognition step (step 4) and the L3 Completeness Check step (step 5), the walker evaluates whether the proposed L3 adds at least one of:
- (a) Rationale not already captured in the L2 summary
- (b) Constraints or edge cases that narrow the L2 rule
- (c) Source provenance that would be lost without the record
- (d) Dissenting context where the rule was debated or overridden

If none apply, the walker silently skips the L3 proposal. No L2 enrichment occurs — the L2 already covers the finding.

**Meta walker (`retro-meta.md`):** Before proposing a new L3 record in the L3 Record Management step (step 4), the walker applies the same four-criteria value-add check against the parent L2 (`process.md` or `workarounds.md`). Appending observations to existing L3 records is exempt — accumulation of observations is inherently value-additive.

The check is performed inside each walker because walkers already have L2 content in memory during deep-check. The orchestrator (`retro.md`) does not change.

The existing "every L2 section MUST have a matching L3 record" invariant in `retro-context.md` is relaxed: L2 sections MAY exist without an L3 record if the L3 would be a pure restatement.

## Acceptance Criteria

- [ ] Context walker skips L3 proposals that are pure restatements of L2 content
- [ ] Meta walker skips new L3 records that are pure restatements of L2 content
- [ ] Meta walker still appends observations to existing L3 records without the value-add check
- [ ] Walker algorithm documentation includes the four value-add criteria
- [ ] The "every L2 section MUST have a matching L3 record" rule is relaxed to "SHOULD have" with the value-add exception
- [ ] Orchestrator (`retro.md`) remains unchanged
