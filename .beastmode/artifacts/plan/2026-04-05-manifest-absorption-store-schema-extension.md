---
phase: plan
slug: 1f6b
epic: manifest-absorption
feature: store-schema-extension
wave: 1
---

# Store Schema Extension

**Design:** `.beastmode/artifacts/design/2026-04-04-1f6b.md`

## User Stories

1. As a **developer**, I want a single `store.json` file as the sole pipeline state, so that I don't need to understand two persistence formats or worry about drift between them.

## What to Build

Extend the store module's type system and API to support the full manifest-absorption migration:

- **Feature slug field**: Add a required `slug` field to the `Feature` interface. Update `addFeature()` to accept an optional slug parameter. Update `FeaturePatch` to allow slug updates.

- **Slug utilities**: Move `slugify()` and `isValidSlug()` from `manifest/store.ts` into the store module. Add slug deduplication logic: when a slug collision is detected during entity creation, append a suffix derived from the entity's ID hash.

- **Enriched query types**: Define `EnrichedEpic` (Epic + XState-derived `nextAction` field) to replace `EnrichedManifest`. Define `NextAction` type (phase, args, type, features) within the store module so downstream consumers import from one place.

- **Store find enhancement**: Ensure `store.find()` can resolve features by slug (not just epics). This enables commands and the watch loop to look up features by human-readable identifier.

- **Epic artifact fields**: Verify the existing `design`, `plan`, `implement`, `validate`, `release` fields on `Epic` can carry artifact path arrays (currently typed as optional strings — may need to become `string[]` to match `manifest.artifacts`).

- **Summary field**: Verify `epic.summary` supports the `{ problem: string; solution: string }` shape from manifests (currently typed as optional string — may need a type change).

All changes are additive — no breaking changes to existing store consumers.

## Integration Test Scenarios

```gherkin
@manifest-absorption
Feature: Store schema supports feature slugs and slug utilities

  Features carry a slug field following the three-tier identity model
  (id, slug, name). The store provides slug normalization and
  deduplication so that human-readable identifiers are unique across
  all entities.

  Background:
    Given a store is initialized

  Scenario: Feature entity carries a slug field
    Given an epic "auth-system" exists in the store
    When a developer creates a feature "login-flow" under "auth-system" with slug "login-flow"
    Then the feature should have slug "login-flow"
    And the feature should be retrievable by slug "login-flow"

  Scenario: Slug is normalized to kebab-case
    Given an epic "auth-system" exists in the store
    When a developer creates a feature with raw slug "Login Flow!"
    Then the feature slug should be normalized to "login-flow"

  Scenario: Duplicate slug receives a disambiguating suffix
    Given an epic "auth-system" exists in the store
    And a feature with slug "login-flow" already exists
    When a developer creates another feature with slug "login-flow"
    Then the new feature slug should have a unique suffix appended
    And both features should be retrievable by their distinct slugs

  Scenario: Store is the sole pipeline state file
    Given a store contains epics with features, dependencies, and phase status
    When a developer inspects the pipeline state
    Then all pipeline state is contained in a single store file
    And no separate manifest files are required

  Scenario: Epic entity carries slug and name fields
    Given a store is initialized
    When a developer creates an epic with slug "manifest-absorption" and name "Manifest Absorption"
    Then the epic should have slug "manifest-absorption"
    And the epic should have name "Manifest Absorption"
    And the epic slug should be immutable after creation
```

## Acceptance Criteria

- [ ] `Feature` interface has a required `slug: string` field
- [ ] `addFeature()` accepts optional `slug` parameter and normalizes via `slugify()`
- [ ] `slugify()` and `isValidSlug()` exported from store module
- [ ] Slug deduplication appends suffix on collision during entity creation
- [ ] `store.find()` resolves features by slug in addition to epics
- [ ] `EnrichedEpic` and `NextAction` types defined in store module
- [ ] Epic `summary` field supports `{ problem: string; solution: string }` shape
- [ ] All existing store tests still pass
