# Retro Reconciliation

## Context
The original retro context walker ran an exhaustive audit on every checkpoint, scanning the entire phase tree regardless of what changed. Confidence-scored gap detection added complexity without proportional value.

## Decision
Artifact-scoped reconciliation: context walker takes phase artifacts as input, quick-checks L1 as a fast exit, deep-checks only flagged L2 files. No confidence scoring. No gap detection. Single `retro.beastmode` gate for L0 updates; L3/L2/L1 changes apply automatically. Context walker is the sole retro agent — runs once at release with all phase artifacts.

## Rationale
- Artifact scoping eliminates wasted checks on unaffected docs
- L1 quick-check provides fast exit for most checkpoints
- Single gate simplifies approval flow — only L0 changes need human review
- Gap detection added decision overhead without clear benefit
- Per-phase retro produced fragmented updates; release-only pass gives coherent cross-phase view

## Source
- state/design/2026-03-06-retro-reconciliation.md (original design)
- .beastmode/artifacts/design/2026-03-31-retro-consolidation.md (consolidated to release-only, single gate)
