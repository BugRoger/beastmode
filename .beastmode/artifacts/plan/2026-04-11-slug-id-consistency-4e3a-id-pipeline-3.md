---
phase: plan
slug: ceceec
epic: slug-id-consistency-4e3a
feature: id-pipeline
wave: 2
---

# ID Pipeline

**Design:** `.beastmode/artifacts/design/2026-04-11-ceceec.md`

## User Stories

1. As a developer, I want every internal lookup (reconcile, mutex, store) to use entity IDs, so that I never wonder "is this a slug or an ID?"
8. As a developer, I want `store.find()` removed and all internal code to use `getEpic()`/`getFeature()`, so that there's one lookup path per identifier type.

## What to Build

### Reconcile Function Signatures

All six reconcile functions currently accept `slug: string` as their second parameter and internally call `store.find(slug)` to resolve the entity. This must change to `epicId: string` with internal calls to `store.getEpic(epicId)`.

Functions to update:
- `reconcileDesign(projectRoot, epicId, wtPath)` — currently creates epic if not found via find(); must use getEpic() and create via addEpic() with ID-based matching
- `reconcilePlan(projectRoot, epicId, wtPath)` — find() → getEpic()
- `reconcileFeature(projectRoot, epicId, featureSlug, wtPath)` — find() → getEpic()
- `reconcileImplement(projectRoot, epicId)` — find() → getEpic()
- `reconcileValidate(projectRoot, epicId, wtPath)` — find() → getEpic()
- `reconcileRelease(projectRoot, epicId, wtPath)` — find() → getEpic()

The `withLock(slug, ...)` mutex calls should also switch to using entity ID as the lock key.

### Pipeline Runner ID Passthrough

The runner currently receives `epicSlug` in `PipelineConfig` and passes it to reconcile functions. It must receive and use `epicId` for all internal operations:

- The `PipelineConfig.epicId` field (already exists as optional) becomes required for non-design phases
- All `store.find(epicSlug)` calls in runner.ts (6 occurrences) must be replaced with `store.getEpic(epicId)` or equivalent
- The runner's step 6/7 switch statement must pass `epicId` to reconcile functions
- Steps 8, 8.5, 8.7, 8.9, 9 must use `epicId` for store lookups instead of `store.find(epicSlug)`

For design phase (where no epic entity exists yet), the runner creates the epic during reconcileDesign. The design case is special: it passes the placeholder slug as a fallback identifier, and reconcileDesign handles epic creation.

### store.find() Removal

After all consumers are migrated:
- Remove `find(idOrSlug: string)` from the `TaskStore` interface
- Remove the implementation from `InMemoryTaskStore`
- Remove the implementation from `JsonFileStore`
- Update all tests that call `store.find()` to use `getEpic()` or `getFeature()`

The `resolveIdentifier()` function in `store/resolve.ts` stays unchanged — it handles CLI-level resolution (slug → entity) and uses `getEpic()`/`getFeature()` internally already.

### Cancel Logic Cleanup

The cancel-logic module already uses `resolveIdentifier()` for initial resolution and then operates on the resolved entity. Minor cleanup: ensure the resolved entity's `id` (not `slug`) is used for store operations. The module is mostly clean already.

## Integration Test Scenarios

```gherkin
@slug-id-consistency @store
Feature: Internal lookups use entity IDs -- reconcile, mutex, store

  All internal code paths (reconciliation, mutex acquisition, store
  queries) use entity IDs exclusively. No internal caller passes a
  slug where an ID is expected. This eliminates the "is this a slug
  or an ID?" ambiguity in the codebase.

  Background:
    Given a store is initialized
    And an epic exists with a known entity ID and slug

  Scenario: Reconciler uses entity ID for epic lookup
    When the pipeline reconciles a phase output
    Then the reconciler should query the store using the entity ID
    And the reconciler should not pass the slug to store lookup functions

  Scenario: Mutex acquisition uses entity ID
    When the pipeline acquires a mutex for the epic
    Then the mutex key should be derived from the entity ID
    And the mutex key should not contain the slug

  Scenario: Store getEpic retrieves by entity ID
    When a caller retrieves the epic using getEpic with the entity ID
    Then the epic should be returned successfully
    And the returned epic should have the expected slug
```

```gherkin
@slug-id-consistency @store
Feature: Single lookup path per identifier type -- getEpic and getFeature

  The store exposes getEpic() and getFeature() as the sole lookup
  methods. The generic store.find() is removed. Each function accepts
  exactly one identifier type, eliminating dispatch ambiguity.

  Background:
    Given a store is initialized
    And an epic "auth-system" exists with features "login-flow" and "token-cache"

  Scenario: getEpic retrieves an epic by its entity ID
    When a caller invokes getEpic with the epic's entity ID
    Then the store should return the epic
    And the epic should contain its slug and name

  Scenario: getFeature retrieves a feature by its entity ID
    When a caller invokes getFeature with the feature's entity ID
    Then the store should return the feature
    And the feature should contain its slug and parent epic reference

  Scenario: No generic find method exists on the store
    When a caller attempts to invoke a generic find method on the store
    Then the method should not exist
    And the caller should be directed to use getEpic or getFeature
```

## Acceptance Criteria

- [ ] All 6 reconcile functions accept `epicId: string` (not `slug: string`)
- [ ] All reconcile functions use `store.getEpic(epicId)` (not `store.find()`)
- [ ] `withLock()` uses entity ID as lock key
- [ ] `PipelineConfig.epicId` is used for all non-design store lookups in runner.ts
- [ ] `store.find()` removed from `TaskStore` interface
- [ ] `store.find()` removed from `InMemoryTaskStore` and `JsonFileStore`
- [ ] `resolveIdentifier()` unchanged (CLI layer, already correct)
- [ ] Grep: zero matches for `store.find(` in production code
- [ ] Grep: zero matches for `\.find(` in `pipeline/reconcile.ts` and `pipeline/runner.ts`
