# Retro Reconciliation

## Context
The original retro context walker ran an exhaustive audit on every checkpoint, scanning the entire phase tree regardless of what changed. Confidence-scored gap detection added complexity without proportional value.

## Decision
Artifact-scoped reconciliation: context walker takes the new state artifact as input, quick-checks L1 as a fast exit, deep-checks only flagged L2 files. No confidence scoring. No gap detection. Single `retro.context-write` gate replaces per-category gates. Meta walker runs independently for learnings/SOPs/overrides.

## Rationale
- Artifact scoping eliminates wasted checks on unaffected docs
- L1 quick-check provides fast exit for most checkpoints
- Single gate simplifies approval flow
- Gap detection added decision overhead without clear benefit

## Source
state/design/2026-03-06-retro-reconciliation.md
