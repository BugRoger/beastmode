---
phase: plan
epic: github-no-for-real-sync
feature: terminal-states
---

# terminal-states

**Design:** .beastmode/artifacts/design/2026-03-29-github-no-for-real-sync.md

## User Stories

5. As a pipeline operator, I want cancelled epics to have their GitHub issue closed with a "cancelled" comment, so the board stays clean.
6. As a pipeline operator, I want done epics to close all child feature issues, so there are no zombie open features from shipped work.

## What to Build

Extend the sync engine's terminal state handling to close the full issue hierarchy (epic + all child features) when a manifest reaches `done` or `cancelled`.

**Done state:** When `manifest.phase === "done"`, after the existing epic close logic, iterate all features in the manifest and close their GitHub issues. Set the epic's board status to "Done". Features that are already closed or have no issue number are skipped gracefully.

**Cancelled state:** When `manifest.phase === "cancelled"`, close the epic issue with a comment ("Cancelled"). Close all child feature issues. Set the epic's board status to "Done" (no "Cancelled" column exists on the board). The comment distinguishes cancelled from done in the issue history.

**Idempotency:** Closing an already-closed issue is a no-op in the GitHub API. The sync engine should not treat this as an error.

**Guard ordering:** Terminal state handling runs after all feature sync, so any features that were just created in this sync pass will have issue numbers available for closing.

## Acceptance Criteria

- [ ] Done epics close the epic issue
- [ ] Done epics close ALL child feature issues
- [ ] Cancelled epics close the epic issue with a "Cancelled" comment
- [ ] Cancelled epics close all child feature issues
- [ ] Already-closed issues don't cause warnings or errors
- [ ] Board status is set to "Done" for both done and cancelled epics
- [ ] Features without issue numbers are skipped without error
