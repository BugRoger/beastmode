---
phase: plan
slug: 1f6b
epic: manifest-absorption
feature: xstate-store-bridge
wave: 2
---

# XState Store Bridge

**Design:** `.beastmode/artifacts/design/2026-04-04-1f6b.md`

## User Stories

1. As a **pipeline orchestrator**, I want the pipeline machine to read epic/feature state from store.json instead of .manifest.json, so that phase transitions operate on the same data as dependency queries and ready-work computation.

2. As a **pipeline runner**, I want reconciliation inlined into the 9-step execution flow reading/writing the store directly, so that post-dispatch enrichment operates on store entities without a separate reconciliation module.

## What to Build

Rewrite the pipeline machine and runner to operate on store entities, eliminating the manifest/pure.ts and manifest/reconcile.ts modules entirely:

- **Machine context = Epic entity**: Replace `EpicContext` with the store's `Epic` type directly. Machine creation reads Epic from store, machine actions write back to store, guards read store state. No adapter layer between the machine and the store.

- **Feature context = Feature entity**: Replace `FeatureContext` with the store's `Feature` type. Feature machines operate on store Feature entities.

- **Delete pure.ts**: All functions currently in `manifest/pure.ts` move into XState actions or are eliminated:
  - `markFeature` → XState action
  - `setGitHubEpic`, `setFeatureGitHubIssue`, `setEpicBodyHash`, `setFeatureBodyHash` → Eliminated (GitHub refs move to sync file in github-sync-separation feature)
  - `regress`, `regressFeatures` → XState actions
  - `getPendingFeatures` → Store query (`store.ready()` with feature filter)
  - `deriveNextAction` → Computed from XState machine snapshot metadata
  - `hydrateEpicActor` → Updated to hydrate from store Epic

- **Delete reconcile.ts**: Inline reconciliation logic into runner.ts steps 6-7:
  - Step 6: Read output.json → send appropriate XState event based on phase
  - Step 7: XState processes event → state changes accumulated in memory → single `store.transact()` persists all changes atomically

- **Pipeline machine actions rewrite**: Update `pipeline-machine/actions.ts` to operate on Epic/Feature types instead of ManifestFeature. Remove delegation to `manifest/pure.regress()` and `manifest/pure.regressFeatures()` — implement directly as XState assign actions.

- **Pipeline machine types rewrite**: Update `pipeline-machine/types.ts` to import from store types instead of manifest types.

- **Runner rewrite (steps 6-7)**: Replace the current reconciliation call chain with inline logic that:
  1. Reads phase output.json (unchanged)
  2. Sends appropriate XState event (DESIGN_COMPLETED, PLAN_COMPLETED, etc.)
  3. Machine processes event and updates context (= store Epic entity)
  4. Single `store.transact()` at end of dispatch persists everything

- **Design rename simplification**: With permanent IDs, the complex 8-step rename ceremony is eliminated. Design phase may still update `epic.slug` and `epic.name` fields, but no git artifact renaming occurs.

## Integration Test Scenarios

```gherkin
@manifest-absorption
Feature: Pipeline machine operates on store entities via XState

  The pipeline state machine reads epic and feature state from the
  store instead of manifest files. Phase transitions, dispatch
  decisions, and reconciliation all operate on store entities
  through XState. Reconciliation is inlined into the pipeline
  execution flow.

  Background:
    Given a store is initialized
    And an epic "auth-system" exists in the store at phase "design"

  Scenario: Pipeline machine reads epic state from the store
    When the pipeline machine is created for epic "auth-system"
    Then the machine context reflects the store entity state
    And the machine phase matches the epic status in the store

  Scenario: Phase transition writes updated state back to the store
    When the pipeline machine advances epic "auth-system" from "design" to "plan"
    Then the epic status in the store should be "plan"
    And the store should contain the updated phase timestamp

  Scenario: Dispatch decision derived from XState machine snapshot
    Given epic "auth-system" is at phase "implement"
    And features exist with mixed completion status
    When the machine snapshot is evaluated for dispatch
    Then the next action reflects which features are ready for dispatch

  Scenario: Reconciliation enriches store entities from dispatch output
    Given epic "auth-system" is at phase "design"
    And a dispatch has produced output with a design artifact
    When the pipeline execution flow processes the dispatch output
    Then the epic entity in the store is enriched with the artifact reference
    And no separate reconciliation module is invoked

  Scenario: Feature status updated through XState events on store entities
    Given epic "auth-system" is at phase "implement"
    And a feature "login-flow" exists with status "pending"
    When the pipeline processes a successful implementation for "login-flow"
    Then feature "login-flow" status in the store should be "completed"

  Scenario: All state changes persisted atomically at end of dispatch
    Given epic "auth-system" is at phase "implement"
    When the pipeline processes multiple feature completions in one dispatch
    Then all state changes are written to the store in a single transaction
    And no partial state is observable between individual updates

  Scenario: Full pipeline lifecycle operates entirely on store
    Given a new epic is created in the store
    When the epic progresses through design, plan, implement, validate, and release
    Then each phase transition reads from and writes to the store
    And the epic reaches the done state in the store
    And no manifest files are created or consulted at any point
```

## Acceptance Criteria

- [ ] `EpicContext` replaced by store `Epic` type in pipeline machine
- [ ] `FeatureContext` replaced by store `Feature` type in pipeline machine
- [ ] `manifest/pure.ts` deleted — all functions absorbed into XState actions or store queries
- [ ] `manifest/reconcile.ts` deleted — logic inlined into runner.ts steps 6-7
- [ ] Runner steps 6-7 read output.json, send XState events, persist via `store.transact()`
- [ ] Pipeline machine actions operate on Epic/Feature types directly
- [ ] Design rename ceremony eliminated — permanent IDs used
- [ ] `deriveNextAction` computed from XState machine snapshot metadata
- [ ] All pipeline machine tests rewritten for store types
- [ ] Full lifecycle test passes: design → plan → implement → validate → release using store only
