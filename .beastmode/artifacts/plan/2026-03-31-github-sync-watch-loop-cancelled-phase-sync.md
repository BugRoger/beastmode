---
phase: plan
epic: github-sync-watch-loop
feature: cancelled-phase-sync
---

# Cancelled Phase Sync

**Design:** .beastmode/artifacts/design/2026-03-31-github-sync-watch-loop.md

## User Stories

1. As a pipeline operator, I want cancelled epics to be closed on GitHub and moved to the Done column, so that terminal states are consistently represented. (US 2)

## What to Build

The sync engine's phase-to-board mapping and label list have no entry for the `cancelled` terminal state introduced by the XState Pipeline Machine. Three constants and one condition need updating in the sync module:

- Add `cancelled: "Done"` to the `PHASE_TO_BOARD_STATUS` mapping so cancelled epics land in the Done column on the project board.
- Add `"phase/cancelled"` to `ALL_PHASE_LABELS` so the label blast-replace logic can clean up stale labels when an epic reaches cancelled.
- Expand the epic close condition from `=== "done"` to `=== "done" || === "cancelled"` so cancelled epics are closed on GitHub just like completed ones.

No new GitHub API functions are needed — existing `ghIssueClose()` and `ghIssueEdit()` handle the operations. No manifest schema changes.

## Acceptance Criteria

- [ ] `PHASE_TO_BOARD_STATUS` includes `cancelled: "Done"`
- [ ] `ALL_PHASE_LABELS` includes `"phase/cancelled"`
- [ ] Epic close logic fires for both `done` and `cancelled` phases
- [ ] Tests: board status mapping returns "Done" for cancelled
- [ ] Tests: epic close fires when phase is cancelled
- [ ] Tests: label blast-replace includes phase/cancelled in removal set
