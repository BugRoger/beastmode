# Context Tree Compaction

## Value-Add Gate
- Retro walkers ALWAYS check proposed L3 against its parent L2 before creation — must add rationale, constraints, provenance, or dissenting context
- NEVER create L3 records that purely restate L2 — walker silently skips the proposal
- Gate lives inside each retro walker (retro-context.md, retro-meta.md), not in the orchestrator — walkers already have L2 in memory during deep-check
- When an L3 fails the value-add check, the walker does nothing — no L2 enrichment, no record

## Compaction Agent
- ALWAYS run compaction as a utility agent (`agents/compaction.md`) — no phase lifecycle, no retro-on-the-compactor, no gate
- Algorithm runs in fixed order: (1) staleness check, (2) L3 restatement value scan, (3) L0 promotion detection — earlier steps reduce false positives for later steps
- Staleness handling is conditional: dead-code-only L3s are removed, rationale-bearing stale L3s are flagged for human review
- L0 promotion triggers at 3+ cross-phase duplicates — 2-phase duplicates are left alone due to per-phase loading model
- ALWAYS preserve `.gitkeep` in emptied L3 directories — structural invariant maintained

## Trigger and Scheduling
- In release, compaction runs before retro — retro works against a clean baseline
- Release trigger: every 5 releases, tracked via `.beastmode/state/.last-compaction` timestamp file — count `Release v*` commits since that date
- `beastmode compact` CLI command dispatches compaction agent standalone — no worktree, always runs regardless of 5-release counter

## Reporting
- Compaction produces stdout summary plus full artifact at `artifacts/compact/YYYY-MM-DD-compaction.md`
- In release context, also written to `artifacts/release/YYYY-MM-DD-<slug>-compaction.md`
- Flagged items (ambiguous staleness) go in the report for human review — no automated resolution of ambiguous cases
