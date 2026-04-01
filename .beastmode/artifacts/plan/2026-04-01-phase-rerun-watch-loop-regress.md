---
phase: plan
slug: phase-rerun
epic: phase-rerun
feature: watch-loop-regress
wave: 2
---

# Watch Loop Regress

**Design:** .beastmode/artifacts/design/2026-04-01-phase-rerun.md

## User Stories

1. As a user, I want the watch loop to auto-regress from validate to implement on failure, so that automated pipelines self-heal without manual intervention.

## What to Build

Migration of the watch loop's validate-failure handling from the removed VALIDATE_FAILED event to the new generic REGRESS event.

**Post-dispatch event mapping:** In the post-dispatch module's validate case, replace `{ type: "VALIDATE_FAILED" }` with `{ type: "REGRESS", targetPhase: "implement" }`. The behavior is identical — validate failure regresses to implement — but now uses the unified regression mechanism.

**Non-interactive context:** The watch loop operates without a human. The phase detection module's confirmation prompt must be skipped in watch-loop context. The watch loop already dispatches phases through a different code path (direct session factory), but if the phase command is reused, it must propagate a non-interactive flag that suppresses the prompt.

**Tag cleanup:** During automated regression, downstream phase tags (validate and beyond) are deleted via the tag management module before the machine regress. This is handled by the same regression flow used by manual CLI regression.

**Re-scan:** After regression, the watch loop's existing re-scan mechanism detects the epic is now at implement with pending features and dispatches implement sessions. No change needed to re-scan logic.

## Acceptance Criteria

- [ ] Validate failure in post-dispatch sends REGRESS with targetPhase "implement"
- [ ] VALIDATE_FAILED event emission fully removed from post-dispatch
- [ ] No confirmation prompt during watch-loop regression
- [ ] Downstream tags cleaned up during automated regression
- [ ] Watch loop re-dispatches implement after regression (existing behavior preserved)
- [ ] GitHub sync reflects regressed phase correctly
