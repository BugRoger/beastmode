---
phase: plan
slug: unified-hook-context
epic: unified-hook-context
feature: pre-create-entity
wave: 1
---

# pre-create-entity

**Design:** `.beastmode/artifacts/design/2026-04-11-unified-hook-context.md`

## User Stories

4. As the pipeline, I want the store entity pre-created before design dispatch, so that `BEASTMODE_EPIC_ID` is always available from the first hook invocation regardless of phase.
5. As the reconcile module, I want the `addEpic` create-if-missing fallback removed from `reconcileDesign`, so that there is exactly one code path for entity creation (pre-dispatch) instead of two.

## What to Build

**Pre-dispatch entity creation:** In the pipeline runner, before Step 3 (settings.create) for design phase, add a step that creates the store entity via `store.addEpic()`. This gives the entity a stable ID (e.g., `bm-f3a7`) that can be passed into the hook context for all subsequent steps. The runner should load the store, call `addEpic`, save, and capture the entity ID. For non-design phases, the entity already exists — load it and read its ID.

**Pass entity ID into PipelineConfig:** The `PipelineConfig` interface already has an optional `epicId` field. Ensure the runner resolves this to the store entity ID before Step 3 so it's available for hook context construction. For design phase, this comes from the newly created entity. For other phases, look up the entity by slug.

**Remove reconcileDesign create-if-missing fallback:** The `reconcileDesign` function currently has a `store.find(slug)` check followed by `store.addEpic()` if not found (lines 166-173 of reconcile.ts). Remove this fallback. If the entity doesn't exist at reconciliation time, that's an error — the pre-dispatch step should have created it. Replace the create-if-missing block with an early return or error if the entity is not found.

**Store the worktree metadata on creation:** When creating the entity in the pre-dispatch step, also set the worktree path and branch so downstream consumers (GitHub sync, branch linking) have it immediately.

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] Design phase creates store entity before dispatch (Step 0/pre-Step 3)
- [ ] Entity ID is available in PipelineConfig before hook context is built
- [ ] Non-design phases look up existing entity by slug and read its ID
- [ ] `reconcileDesign` no longer calls `store.addEpic()` — create-if-missing block removed
- [ ] `reconcileDesign` returns undefined (or logs warning) if entity not found instead of creating
- [ ] Worktree path and branch are set on entity at creation time
- [ ] Unit tests verify entity exists before reconciliation for design phase
- [ ] Unit tests verify reconcileDesign with missing entity returns gracefully
