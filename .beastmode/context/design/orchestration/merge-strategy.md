## Context
Parallel implement branches need merge coordination that avoids preventable conflicts.

## Decision
Pre-merge conflict simulation via `git merge-tree` to determine optimal merge order. Sequential merge in optimized order. Conflict resolution via dedicated Claude session. Manifest completeness verification after all merges.

## Rationale
`git merge-tree` simulation is cheap (no working directory needed) and identifies conflicts before committing to a merge order. Dedicated conflict-resolution session keeps the merge pipeline moving without human intervention.

## Source
`.beastmode/artifacts/design/2026-03-28-typescript-pipeline-orchestrator.md`
