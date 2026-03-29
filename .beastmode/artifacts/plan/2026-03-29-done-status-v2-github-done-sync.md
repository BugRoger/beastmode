---
phase: plan
epic: done-status-v2
feature: github-done-sync
---

# GitHub Done Sync

**Design:** .beastmode/artifacts/design/2026-03-29-done-status-v2.md

## User Stories

4. As a GitHub user, I want the epic issue to close and move to the "Done" column when the pipeline finishes so the project board reflects reality

## What to Build

Extend the `PHASE_TO_BOARD_STATUS` mapping in the github-sync module to include `done: "Done"`. This enables the existing board sync logic to move epics to the Done column when the manifest reaches the done phase.

Remove the `(manifest.phase as string)` type cast in the epic close logic. Now that `"done"` is a proper Phase value in the type system (from the terminal-phases feature), the comparison `manifest.phase === "done"` works without casting. The existing close and board sync logic is otherwise correct and needs no behavioral changes.

## Acceptance Criteria

- [ ] `PHASE_TO_BOARD_STATUS` includes `done: "Done"` entry
- [ ] Epic close check uses `manifest.phase === "done"` without type cast
- [ ] Done epics move to "Done" column on the project board
- [ ] Done epics have their GitHub issue closed
