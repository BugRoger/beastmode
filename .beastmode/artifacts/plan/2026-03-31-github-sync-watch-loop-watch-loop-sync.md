---
phase: plan
epic: github-sync-watch-loop
feature: watch-loop-sync
---

# Watch Loop Sync

**Design:** .beastmode/artifacts/design/2026-03-31-github-sync-watch-loop.md

## User Stories

1. As a pipeline operator, I want the project board to reflect actual epic state after autonomous watch loop execution, so that the board is trustworthy. (US 1)

## What to Build

Wire `syncGitHubForEpic()` into the watch loop's `reconcileState()` function so that GitHub sync happens within the same load-save cycle as state machine reconciliation, eliminating the TOCTOU window between reconciliation and sync.

After the XState actor reconciliation persists the updated manifest, call `syncGitHubForEpic()` with the epic's project root and slug. The watch loop should pre-discover GitHub metadata once per scan cycle (not per-epic) and pass it as the optional `resolved` param to avoid redundant API calls during fan-out. Pass the per-epic prefixed logger so sync warnings are attributed to the correct epic in watch loop output.

No new modules or interfaces needed — this is a wiring-only change that consumes the helper extracted in `sync-helper-extract`.

## Acceptance Criteria

- [ ] `reconcileState()` calls `syncGitHubForEpic()` after persisting reconciled manifest
- [ ] GitHub discovery is performed once per watch loop scan cycle, not per-epic
- [ ] Resolved metadata is passed to helper via optional param
- [ ] Per-epic prefixed logger is passed to helper
- [ ] Sync failures in watch loop do not halt reconciliation of other epics
- [ ] Tests: reconcileState triggers GitHub sync after state persistence
- [ ] Tests: discovery is called once even when multiple epics are reconciled
