---
phase: plan
slug: unified-hook-context
epic: unified-hook-context
feature: store-pre-creation
wave: 1
---

# store-pre-creation

**Design:** `.beastmode/artifacts/design/2026-04-11-unified-hook-context.md`

## User Stories

4. As the pipeline, I want the store entity pre-created before design dispatch, so that `BEASTMODE_EPIC_ID` is always available from the first hook invocation regardless of phase.
5. As the reconcile module, I want the `addEpic` create-if-missing fallback removed from `reconcileDesign`, so that there is exactly one code path for entity creation (pre-dispatch) instead of two.

## What to Build

**Runner pre-creation step.** Add a "step 0" in the pipeline runner that runs before worktree setup (step 1). For the design phase, the runner loads the store, calls `store.addEpic({ name: epicSlug })` to create the entity, saves the store, and captures the entity ID. This ID is set on `config.epicId` so subsequent steps (settings write, hook builders) can include it in env vars.

For non-design phases, the runner resolves the existing entity by slug and reads its ID. If the entity doesn't exist for a non-design phase, that's an error — the pipeline should log a warning and continue (the entity should have been created during design).

**Idempotency guard.** The store's `addEpic` should be called only if `store.find(epicSlug)` returns no result. If the entity already exists (re-run scenario), use the existing entity's ID.

**Remove reconcileDesign fallback.** The `reconcileDesign` function currently has a create-if-missing block at lines 166-173 that calls `store.addEpic` when the entity doesn't exist. This fallback is removed. `reconcileDesign` now expects the entity to exist — if `store.find(slug)` returns nothing, it returns `undefined` (same as when output is missing or incomplete).

**PipelineResult update.** The `PipelineResult` or intermediate state should carry the `epicId` so that post-dispatch steps (GitHub sync, commit-issue-ref) can use it without re-resolving from the store.

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] Design phase pipeline creates the store entity before worktree setup
- [ ] The entity ID is available in `PipelineConfig.epicId` for all subsequent steps
- [ ] `reconcileDesign` no longer calls `store.addEpic` — the create-if-missing block is removed
- [ ] `reconcileDesign` returns `undefined` when entity is not found (instead of creating one)
- [ ] Non-design phases resolve the existing entity by slug and read its ID
- [ ] Re-running design for an existing epic reuses the existing entity (idempotent)
- [ ] Unit tests verify entity pre-creation in the runner
- [ ] Unit tests verify reconcileDesign behavior when entity is missing (returns undefined)
