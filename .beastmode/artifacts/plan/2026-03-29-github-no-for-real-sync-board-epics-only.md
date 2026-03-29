---
phase: plan
epic: github-no-for-real-sync
feature: board-epics-only
---

# board-epics-only

**Design:** .beastmode/artifacts/design/2026-03-29-github-no-for-real-sync.md

## User Stories

7. As a pipeline operator, I want only epics on the Projects V2 board (no features), so the board remains a high-level pipeline view.

## What to Build

Remove all feature-to-board sync from the GitHub sync engine while preserving feature label sync.

**Remove feature board calls:** In the `syncFeature()` function, remove the call to `syncProjectStatus()` for features. Features should still get their `type/feature` and `status/*` labels synced — only the Projects V2 board item creation and status field update are removed.

**Remove helper:** The `featureStatusToBoardStatus()` mapping function becomes dead code after this change — remove it.

**Epic board sync unchanged:** Epic → board sync in the main `syncGitHub()` function stays exactly as-is. Epics still get added to the board and their status field updated based on manifest phase.

This is a surgical removal — the sync engine's feature label logic is untouched, only the board projection changes.

## Acceptance Criteria

- [ ] Features are NOT added to the Projects V2 board
- [ ] Features still receive `type/feature` and `status/*` labels
- [ ] Epics are still added to the board with correct status
- [ ] `featureStatusToBoardStatus()` is removed (no dead code)
- [ ] Existing feature label sync behavior is preserved
