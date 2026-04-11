---
phase: plan
slug: collision-proof-slugs
epic: collision-proof-slugs
feature: reconcile-in-place
wave: 2
---

# reconcile-in-place

**Design:** `.beastmode/artifacts/design/2026-04-11-collision-proof-slugs.md`

## User Stories

3. As the design phase, I want `reconcileDesign()` to update the slug in-place via `updateEpic()` instead of delete/recreate, so that the entity ID remains stable throughout the epic lifecycle.

## What to Build

**Remove slug immutability guard:** The store's epic update method currently hardcodes slug as immutable at runtime (overwriting any slug in the patch with the existing value). Remove this override so that slug patches are applied. The type system already allows it — `EpicPatch` does not exclude `slug`.

**Rewrite reconcileDesign slug rename:** Replace the current delete-old-epic/create-new-epic pattern with a single `updateEpic()` call that patches the slug field. The entity ID (`bm-XXXX`) stays stable. All other fields (status, summary, design artifact path, worktree info) are set on the same update call.

**Git tag rename:** When the slug changes during design reconciliation, rename the existing `beastmode/{oldSlug}/design` tag to `beastmode/{newSlug}/design`. The tag rename function already exists in the git tag module.

**Entity ID stability:** After reconciliation, the epic must be retrievable by its original ID. Child features (if any existed, though unlikely at design phase) remain linked via the parent ID field, which does not change.

## Integration Test Scenarios

```gherkin
@collision-proof-slugs @pipeline
Feature: Design reconciliation updates slug in-place -- entity ID remains stable

  When the design agent picks a human-readable name for an epic, the reconciler
  updates the slug on the existing entity rather than deleting and recreating it.
  This preserves the entity ID, hash-based references, and any metadata accumulated
  during the design phase.

  Scenario: Reconcile design updates slug without changing entity ID
    Given an epic is seeded with hex-only slug and a known entity ID
    When the design phase completes with epic name "oauth-redesign"
    And the pipeline reconciles the design output
    Then the epic slug should be "oauth-redesign" followed by a hex suffix
    And the entity ID should be identical to the original seeded ID
    And the epic should be retrievable by its original entity ID

  Scenario: Reconcile design updates associated git tags
    Given an epic is seeded with hex-only slug "a1b2"
    And a design phase tag exists for slug "a1b2"
    When the design phase completes with epic name "oauth-redesign"
    And the pipeline reconciles the design output
    Then the old tag for slug "a1b2" should be replaced by a tag for the new slug

  Scenario: Reconcile design preserves summary metadata
    Given an epic is seeded with hex-only slug
    When the design phase writes a problem statement and solution
    And the pipeline reconciles the design output
    Then the epic should retain the problem and solution in its summary
    And the entity ID should remain unchanged
```

## Acceptance Criteria

- [ ] `updateEpic()` allows slug field mutation (runtime guard removed)
- [ ] `reconcileDesign()` uses `updateEpic()` instead of `deleteEpic()` + `addEpic()`
- [ ] Entity ID is stable across design reconciliation (same `bm-XXXX` before and after)
- [ ] Epic is retrievable by original entity ID after slug rename
- [ ] Git tags are renamed from old slug to new slug during reconciliation
- [ ] Summary, status, and artifact path fields are preserved through the slug rename
- [ ] No orphaned entities are left in the store after reconciliation
