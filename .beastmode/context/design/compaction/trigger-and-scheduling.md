# Trigger and Scheduling

## Context
Compaction should run periodically without manual intervention, but also be available on demand.

## Decision
In release, compaction runs before retro so retro works against a clean baseline. Trigger: every 5 releases, tracked via `.beastmode/state/.last-compaction` timestamp file — count `Release v*` commits since that date; if >= 5 or file missing, run compaction. `beastmode compact` CLI command dispatches the compaction agent via existing session dispatch pattern — no worktree needed, operates on the shared tree, always runs regardless of the 5-release counter.

## Rationale
- Before-retro ordering prevents creating-then-immediately-deleting files
- 5-release cadence avoids overhead on every release while keeping the tree manageable
- Standalone CLI command enables on-demand cleanup outside the release cycle
- No worktree needed because compaction operates on the shared context tree, not feature-scoped state

## Source
.beastmode/artifacts/design/2026-03-31-context-tree-compaction.md
