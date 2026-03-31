# Trigger and Scheduling

## Context
Compaction is decoupled from the release pipeline and runs on-demand only.

## Decision
`beastmode compact` CLI command dispatches the compaction agent via existing session dispatch pattern — no worktree needed, operates on the shared tree. Compaction is manual-only and decoupled from the release pipeline — no automatic 5-release trigger, no `.last-compaction` tracking file needed.

## Rationale
- Manual-only trigger avoids overhead on every release while keeping the tree manageable
- Standalone CLI command enables on-demand cleanup outside the release cycle
- No worktree needed because compaction operates on the shared context tree, not feature-scoped state

## Source
.beastmode/artifacts/design/2026-03-31-context-tree-compaction.md
