---
phase: plan
epic: plan-wave-sequencing
feature: dispatch-wave-gating
wave: 2
---

# Dispatch Wave Gating

**Design:** `.beastmode/artifacts/design/2026-03-31-plan-wave-sequencing.md`

## User Stories

2. As a developer, I want the watch loop to dispatch features wave-by-wave, so that independent features run in parallel while dependent ones wait.

## What to Build

Modify the watch loop's fan-out dispatch to respect wave ordering. The state machine (`deriveNextAction`) stays unchanged — all filtering happens in `dispatchFanOut()`.

**Wave-aware dispatch in `dispatchFanOut()`:** Before dispatching features, determine the current active wave. Find the lowest wave number among features with status `pending` or `in-progress`. Only dispatch features from that wave. Features in higher waves remain untouched until all features in the current wave reach `completed` status.

**Strict blocking:** If any feature in wave N has status `blocked`, wave N is considered incomplete. Wave N+1 features do not dispatch. A blocked feature requires human intervention (fix, complete, or cancel) before later waves proceed. This matches the PRD's explicit design decision.

**State machine unchanged:** `deriveNextAction()` continues to return all pending/in-progress features in its action. `dispatchFanOut()` applies the wave filter as a second pass, selecting only the current-wave subset for actual dispatch.

**Fan-out feature filtering in `deriveNextAction()`:** The state scanner also filters features for the fan-out action. This filter must also be wave-aware — only include features from the lowest incomplete wave in the returned action's feature list. Otherwise the watch loop would see "no features to dispatch" when all current-wave features are in-progress, even though higher-wave features are pending.

## Acceptance Criteria

- [ ] `dispatchFanOut()` only dispatches features from the lowest incomplete wave
- [ ] Features in wave N+1 do not dispatch while any wave N feature is pending, in-progress, or blocked
- [ ] A blocked feature in wave N prevents all wave N+1 dispatch
- [ ] When all wave N features complete, wave N+1 features begin dispatching on next scan
- [ ] State machine definition is unchanged
- [ ] Features without a `wave` field default to wave 1 and dispatch as before
