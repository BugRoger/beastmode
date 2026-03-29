# Merge Strategy

## Context
The release phase needs to merge feature branch work onto main. The strategy evolved across three iterations during early development.

## Decision
Squash merge onto main with no rebase. `git merge --squash` directly, resolve conflicts once. Rebase was tried and abandoned.

## Rationale
v0.3.7 added a rebase-sync step to avoid version file conflicts, but rebase replays each commit individually, causing repeated conflict resolution. v0.6.1 dropped rebase entirely — merge resolves conflicts once instead of per-commit replay.

## Source
- .beastmode/artifacts/release/2026-03-04-v0.3.7.md (added rebase-sync step)
- .beastmode/artifacts/release/2026-03-04-v0.6.1.md (dropped rebase, merge-only)
