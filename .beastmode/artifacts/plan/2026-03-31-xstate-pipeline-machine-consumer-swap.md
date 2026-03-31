---
phase: plan
epic: xstate-pipeline-machine
feature: consumer-swap
---

# Consumer Swap

**Design:** `.beastmode/artifacts/design/2026-03-31-xstate-pipeline-machine.md`

## User Stories

3. As a developer, I want to hook side effects (persist, GitHub sync, slug rename) into specific transitions declaratively, so that business logic is attached to transitions rather than scattered in orchestration code.
4. As a developer, I want the watch loop to read dispatch instructions from state metadata rather than a separate `deriveNextAction()` function, so there's a single source of truth for what each state means.
8. As a developer, I want `post-dispatch.ts` reduced to a thin event router that sends events to the machine, so that orchestration logic lives in the machine definition.

## What to Build

### Wire Real Implementations

Connect the stubbed action and service implementations from `machine-definition` to the actual codebase:
- `persist` action → calls `manifest-store.save()`
- `enrichManifest` action → uses enrichment logic currently in `post-dispatch.ts`
- `renameSlug` action → updates slug in context + renames manifest file via `manifest-store`
- `syncGitHub` service → wraps existing `github-sync.ts` `syncGitHub()` function as `fromPromise`
- `setFeatures` / `resetFeatures` / `markFeatureCompleted` → pure context mutations via `assign()`

### Rewrite `post-dispatch.ts`

Transform from a procedural orchestrator to a thin event router:
1. Load phase output from worktree artifacts (unchanged)
2. Load or create machine actor from manifest snapshot
3. Determine event type from phase + output (design completed → `DESIGN_COMPLETED`, etc.)
4. Send event to actor — machine handles enrichment, advancement, persistence, and GitHub sync internally
5. No more conditional branching for validate regression, feature marking, or phase advancement — machine owns all transitions

### Rewrite Watch Loop Dispatch Logic

Replace `deriveNextAction()` calls in the watch loop with machine state metadata:
1. Load machine actor from manifest snapshot
2. Read `actor.getSnapshot().getMeta()` to get `dispatchType` for current state
3. If `dispatchType === 'single'`: dispatch phase session
4. If `dispatchType === 'fan-out'`: derive pending features from context, dispatch per-feature sessions
5. If `dispatchType === 'skip'`: no dispatch (terminal state)
6. Remove `deriveNextAction()` and `shouldAdvance()` calls from watch loop

### Delete Dead Code

Remove functions from `manifest.ts` that are now fully replaced by the machine:
- `deriveNextAction()` — replaced by state metadata
- `shouldAdvance()` — replaced by guard conditions on transitions
- `advancePhase()` — replaced by machine transitions
- `regressPhase()` — replaced by `VALIDATE_FAILED` transition
- `cancel()` — replaced by `CANCEL` event
- `checkBlocked()` — replaced by machine guards (or kept if gates remain external)

Preserve functions that are still needed:
- `enrich()` — may still be useful as a pure helper called by the machine's `enrichManifest` action
- `markFeature()` — may be absorbed into machine context mutation
- `getPendingFeatures()` — may be useful for watch loop fan-out feature list derivation

### Update Commands

Update `commands/cancel.ts` to send `CANCEL` event to machine actor instead of calling `manifest.cancel()` directly.

### Verify No Regressions

Run existing test suites (`manifest.test.ts`, `post-dispatch.test.ts`, `phase-dispatch.test.ts`) and fix any failures. Tests that tested replaced functions should be removed or updated to test the new machine-based equivalents.

## Acceptance Criteria

- [ ] `post-dispatch.ts` is a thin event router — no phase advancement, no validate regression, no feature marking logic; just load output → determine event → send to machine
- [ ] Watch loop reads dispatch type from machine state metadata instead of calling `deriveNextAction()`
- [ ] `deriveNextAction()` and `shouldAdvance()` are deleted from `manifest.ts`
- [ ] All existing tests pass or are updated to reflect the new machine-based architecture
- [ ] Existing `.manifest.json` files load correctly through the new machine (backward compatible, no migration)
