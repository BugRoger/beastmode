---
phase: implement
epic: xstate-pipeline-machine
feature: consumer-swap
status: completed
---

# Implementation Deviations: consumer-swap

**Date:** 2026-03-31
**Feature Plan:** .beastmode/artifacts/plan/2026-03-31-xstate-pipeline-machine-consumer-swap.md
**Tasks completed:** 6/6
**Deviations:** 2 total

## Auto-Fixed
- Task 2: state-scanner `NextAction` type moved from manifest.ts to state-scanner.ts (local definition), watch-types.ts import updated accordingly
- Task 4: Could not delete `shouldAdvance()`, `advancePhase()`, `regressPhase()`, `checkBlocked()` — still consumed by `watch-command.ts` reconcileState() and `state-scanner.ts` preReconcile(). Only `deriveNextAction()` and `cancel()` were fully dead and removed.

## Blocking
None.

## Architectural
None.
