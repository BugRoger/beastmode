# Compaction Agent

## Context
The context tree grows monotonically because nothing ever folds content back up. A dedicated cleanup mechanism is needed alongside prevention.

## Decision
Compaction is an agent (`agents/compaction.md`) with utility weight class — no phase lifecycle, no retro-on-the-compactor, no gate. Algorithm runs in fixed order: (1) staleness check (remove dead-code-only L3s, flag rationale-bearing stale L3s), (2) L3 restatement value scan (fold redundant L3s), (3) L0 promotion detection (rules duplicated across 3+ phases). Empty L3 directories preserve `.gitkeep`.

## Rationale
- Fixed order reduces false positives — staleness removal simplifies restatement scan
- Utility weight class avoids recursive self-improvement (no retro on the compactor)
- No gate keeps the agent lightweight — report goes to human for flagged items
- 3-phase threshold for L0 promotion respects the per-phase loading model

## Source
.beastmode/artifacts/design/2026-03-31-context-tree-compaction.md
