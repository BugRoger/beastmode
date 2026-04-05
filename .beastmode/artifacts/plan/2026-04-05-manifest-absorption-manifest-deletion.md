---
phase: plan
slug: 1f6b
epic: manifest-absorption
feature: manifest-deletion
wave: 3
---

# Manifest Deletion

**Design:** `.beastmode/artifacts/design/2026-04-04-1f6b.md`

## User Stories

1. As a **developer**, I want the manifest/ module deleted after migration, so that there is exactly one state management module in the codebase.

## What to Build

Delete the entire manifest module and all associated test files after all consumers have been migrated:

- **Delete manifest module files**:
  - `manifest/store.ts` (669 lines — filesystem boundary, types, CRUD, rename ceremony)
  - `manifest/pure.ts` (315 lines — pure state machine functions)
  - `manifest/reconcile.ts` (288 lines — output.json → manifest enrichment)

- **Delete manifest test files**:
  - `__tests__/manifest-store.test.ts` — manifest store operations
  - `__tests__/manifest.test.ts` — manifest integration tests
  - `__tests__/manifest-pure.test.ts` — pure state transition tests
  - `__tests__/manifest-store-find.test.ts` — slug/epic lookup tests
  - `__tests__/manifest-store-rename.test.ts` — 8-step rename tests
  - `__tests__/reconcile-poisoning.test.ts` — reconciliation safety tests
  - `__tests__/backfill-enrichment.test.ts` — legacy migration tests (if backfill script deleted)

- **Verify no lingering imports**: Run a codebase-wide grep for:
  - `from.*manifest/` — any remaining imports from the manifest module
  - `PipelineManifest` — any remaining type references
  - `ManifestFeature` — any remaining type references
  - `EnrichedManifest` — any remaining type references
  - `ManifestGitHub` — any remaining type references

- **Update barrel exports**: If any `index.ts` files re-export from manifest module, remove those exports.

- **Update test configuration**: If test runner config (vitest, jest, etc.) references manifest test files or patterns, update.

- **Verify clean build**: Run full build and test suite to confirm no compilation errors from missing manifest module.

## Integration Test Scenarios

```gherkin
@manifest-absorption
Feature: Manifest module removed after migration

  After all manifests are imported into the store, the manifest
  module is deleted entirely. The codebase has exactly one state
  management module. No code references manifest types or imports.

  Scenario: No manifest module exists after migration
    Given all manifests have been imported into the store
    When a developer inspects the codebase
    Then no manifest module exists
    And no code imports from a manifest module

  Scenario: Pipeline operates without manifest module
    Given the manifest module has been removed
    When an epic progresses through the full pipeline lifecycle
    Then all phase transitions succeed using only the store
    And no errors reference missing manifest functionality

  Scenario: Manifest type references replaced with store types
    Given the manifest module has been removed
    When a developer examines pipeline type definitions
    Then epic state uses store entity types
    And feature state uses store entity types
    And no manifest-era type aliases remain
```

## Acceptance Criteria

- [ ] `manifest/store.ts`, `manifest/pure.ts`, `manifest/reconcile.ts` deleted
- [ ] All manifest test files deleted
- [ ] No `from.*manifest/` imports remain in the codebase
- [ ] No `PipelineManifest`, `ManifestFeature`, `EnrichedManifest`, `ManifestGitHub` type references remain
- [ ] Full build succeeds with no compilation errors
- [ ] Full test suite passes
- [ ] Exactly one state management module exists (the store)
