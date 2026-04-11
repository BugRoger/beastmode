---
phase: plan
slug: collision-proof-slugs
epic: collision-proof-slugs
feature: slug-derivation
wave: 1
---

# slug-derivation

**Design:** `.beastmode/artifacts/design/2026-04-11-collision-proof-slugs.md`

## User Stories

1. As a pipeline operator, I want epic slugs to be structurally unique, so that two epics with similar names never overwrite each other in the store.
4. As the pipeline, I want feature slugs to include their ordinal suffix (e.g., `auth-flow-1`), so that features within the same epic are uniquely addressable without hash-based deduplication.
5. As the artifact reader, I want `filenameMatchesEpic()` to still correctly match feature-level files using `startsWith(epicSlug + "-")`, so that the hex suffix in the epic slug doesn't break boundary detection.

## What to Build

**Epic slug derivation:** Modify the store's epic creation method to always derive the slug as `slugify(name) + "-" + shortId`, where `shortId` is the first 4 hex characters of the entity ID (already generated collision-free by the ID generator's uniqueness loop). Remove the optional `slug` parameter from the epic creation interface — slugs are never user-provided.

**Feature slug derivation:** Modify the store's feature creation method to always derive the slug as `slugify(name) + "-" + ordinal`, where `ordinal` is the sequential number extracted from the feature ID suffix (the `.N` portion of `{epicId}.N`). Remove the optional `slug` parameter from the feature creation interface. Stop calling the existing hash-based deduplication functions — ordinal suffixes are inherently unique within an epic.

**Type changes:** Update the store interface types to remove the optional `slug` field from both epic and feature creation options. The slug field on the entity types themselves remains — it's still a stored field, just no longer user-supplied.

**Artifact filename matching:** Verify that the existing `filenameMatchesEpic()` boundary detection (`startsWith(epicSlug + "-")`) still correctly distinguishes epic-level from feature-level artifact files when the epic slug itself contains a hex suffix. The key insight: with slug `dashboard-redesign-f3a7`, a feature file `dashboard-redesign-f3a7-auth-flow-1.md` still matches via `startsWith("dashboard-redesign-f3a7-")`. The `hexSlug?` fallback parameter is retained for design-phase files that pre-date the rename.

**Backward compatibility:** Old-format slugs (without ID suffix) remain valid and functional. No migration. The store passes slug strings through without format enforcement, so mixed formats coexist.

## Integration Test Scenarios

```gherkin
@collision-proof-slugs @store
Feature: Collision-proof slug derivation -- epic and feature slugs embed unique suffixes

  Epic slugs embed the entity's 4-char hex short ID (e.g., dashboard-redesign-f3a7).
  Feature slugs embed their ordinal suffix (e.g., auth-flow-1). This makes slugs
  structurally unique without relying on deduplication logic.

  Background:
    Given a store is initialized

  Scenario: Epic slug includes the short ID suffix
    When a developer creates an epic named "dashboard redesign"
    Then the epic slug should match the pattern "{name}-{4-hex-chars}"
    And the slug should end with the first 4 characters of the entity's hash ID

  Scenario: Two epics with identical names receive distinct slugs
    When a developer creates an epic named "auth system"
    And a developer creates another epic named "auth system"
    Then the two epics should have different slugs
    And both slugs should start with "auth-system-"
    And each slug should end with a distinct hex suffix

  Scenario: Feature slug includes the ordinal suffix
    Given an epic exists in the store
    When the plan phase creates features "login flow" and "token cache" under the epic
    Then feature "login flow" should have slug "login-flow-1"
    And feature "token cache" should have slug "token-cache-2"

  Scenario: Feature ordinal suffixes are unique within an epic
    Given an epic exists in the store
    When the plan phase creates three features under the epic
    Then each feature slug should end with a distinct ordinal number

  Scenario Outline: Slug derivation normalizes names to kebab-case before appending suffix
    Given an epic exists in the store
    When a developer creates an epic named "<raw_name>"
    Then the epic slug should start with "<normalized_prefix>"

    Examples:
      | raw_name            | normalized_prefix    |
      | Dashboard Redesign  | dashboard-redesign-  |
      | AUTH FLOW           | auth-flow-           |
      | my--weird---name    | my-weird-name-       |
```

```gherkin
@collision-proof-slugs @pipeline
Feature: Artifact filename boundary detection -- hex suffix does not break file matching

  The artifact reader uses prefix matching to distinguish epic-level files from
  feature-level files. With the new slug format (e.g., dashboard-redesign-f3a7),
  the hex suffix must not cause false positive matches against feature filenames
  that also start with the epic slug.

  Scenario: Epic-level artifact matches its own slug
    Given an epic with slug "dashboard-redesign-f3a7"
    And a design artifact file named "2026-04-11-dashboard-redesign-f3a7.md"
    When the artifact reader checks if the file belongs to the epic
    Then the file should be recognized as an epic-level artifact

  Scenario: Feature-level artifact is distinguished from epic-level
    Given an epic with slug "dashboard-redesign-f3a7"
    And a feature with slug "auth-flow-1" under that epic
    And a plan artifact file named "2026-04-11-dashboard-redesign-f3a7-auth-flow-1.md"
    When the artifact reader checks if the file belongs to the epic
    Then the file should be recognized as a feature-level artifact
    And the file should not be recognized as an epic-level artifact

  Scenario: Design-phase hex-only slug still matches after rename
    Given an epic originally created with hex slug "f3a7"
    And the epic was renamed to slug "dashboard-redesign-f3a7" during design reconciliation
    And a design artifact file named "2026-04-11-f3a7.output.json" exists
    When the artifact reader checks if the file belongs to the renamed epic
    Then the file should be recognized as belonging to the epic via hex slug fallback
```

## Acceptance Criteria

- [ ] `addEpic()` derives slug as `slugify(name) + "-" + shortId` (4 hex chars from entity ID)
- [ ] `addEpic()` no longer accepts an optional `slug` parameter
- [ ] `addFeature()` derives slug as `slugify(name) + "-" + ordinal` (from feature ID suffix)
- [ ] `addFeature()` no longer accepts an optional `slug` parameter or calls deduplication functions
- [ ] Two epics created with identical names receive different slugs (different IDs)
- [ ] `filenameMatchesEpic()` correctly matches epic-level and feature-level files with new slug format
- [ ] `filenameMatchesEpic()` hex slug fallback still works for design-phase files
- [ ] Old-format slugs (without ID suffix) continue to work in the store without migration
- [ ] Store interface types updated to remove optional slug from creation options
