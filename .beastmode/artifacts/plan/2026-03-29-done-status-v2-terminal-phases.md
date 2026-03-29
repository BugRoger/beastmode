---
phase: plan
epic: done-status-v2
feature: terminal-phases
---

# Terminal Phases

**Design:** .beastmode/artifacts/design/2026-03-29-done-status-v2.md

## User Stories

1. As a pipeline operator, I want completed epics to have an explicit "done" phase so I can distinguish between in-progress releases and successfully shipped work
5. As a pipeline operator, I want `cancelled` to be a proper Phase type so the cancel function doesn't need a type cast workaround
6. As a watch loop, I want `deriveNextAction("done")` to return null so done epics are naturally skipped without special-case logic
7. As a developer, I want `isValidPhase("done")` and `isValidPhase("cancelled")` to return true so manifests with terminal phases pass validation

## What to Build

Extend the Phase type union to include `"done"` and `"cancelled"` as first-class terminal values. Add both to the `VALID_PHASES` array so `isValidPhase` accepts them and `store.validate` passes manifests with terminal phases.

Add `release: "done"` to `PHASE_SEQUENCE` so the existing `shouldAdvance` code path automatically transitions manifests from release to done when the output status is "completed" — no special-case logic needed.

Update `deriveNextAction` to return null for both `"done"` and `"cancelled"` phases, making terminal epics naturally inert in the watch loop.

Simplify the `cancel()` function by removing the `as Phase` type cast — `"cancelled"` is now a valid Phase value.

Remove the manual `phase: "done"` assignment in the watch command's release teardown block. The `shouldAdvance` pipeline through `reconcileState` now handles this transition automatically.

## Acceptance Criteria

- [ ] Phase type union includes `"done"` and `"cancelled"`
- [ ] VALID_PHASES array contains both terminal phases
- [ ] `isValidPhase("done")` returns true
- [ ] `isValidPhase("cancelled")` returns true
- [ ] `shouldAdvance` returns `"done"` when release phase output is completed
- [ ] `deriveNextAction("done")` returns null
- [ ] `deriveNextAction("cancelled")` returns null
- [ ] `cancel()` sets phase to `"cancelled"` without type cast
- [ ] `store.validate` accepts manifests with done/cancelled phases
- [ ] Watch command release teardown no longer manually sets `phase: "done"`
- [ ] Unit tests for shouldAdvance, deriveNextAction, cancel, isValidPhase with terminal phases
