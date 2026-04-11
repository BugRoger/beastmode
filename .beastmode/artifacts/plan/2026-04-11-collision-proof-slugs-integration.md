# Integration Test Artifact: collision-proof-slugs

Epic: **collision-proof-slugs**
Date: 2026-04-11

---

## New Scenarios

### Feature: slug-derivation

Covers user stories [1, 4, 5].

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

### Feature: reconcile-in-place

Covers user stories [3].

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

### Feature: prefix-resolution

Covers user stories [2, 8].

```gherkin
@collision-proof-slugs @cli
Feature: CLI prefix resolution -- human-readable prefix resolves to full slug

  CLI users can type the human-readable portion of an epic slug (e.g.,
  "dashboard-redesign") and have it resolve to the full collision-proof
  slug (e.g., "dashboard-redesign-f3a7"). This is opt-in at the CLI
  entry point only; internal callers retain exact-match semantics.

  Background:
    Given a store is initialized
    And an epic exists with slug "dashboard-redesign-f3a7"
    And an epic exists with slug "auth-system-b2c4"

  Scenario: Exact slug match takes priority over prefix match
    When the CLI resolves identifier "dashboard-redesign-f3a7"
    Then the resolution should return the epic with slug "dashboard-redesign-f3a7"

  Scenario: Prefix match resolves to full slug
    When the CLI resolves identifier "dashboard-redesign" with prefix matching enabled
    Then the resolution should return the epic with slug "dashboard-redesign-f3a7"

  Scenario: Prefix match works with partial name
    When the CLI resolves identifier "dashboard" with prefix matching enabled
    Then the resolution should return the epic with slug "dashboard-redesign-f3a7"

  Scenario: Ambiguous prefix match returns an error
    Given an epic exists with slug "dashboard-metrics-e5f6"
    When the CLI resolves identifier "dashboard" with prefix matching enabled
    Then the resolution should fail with an ambiguity error
    And the error should list both matching slugs

  Scenario: Exact entity ID match takes priority over prefix
    When the CLI resolves identifier "bm-f3a7" with prefix matching enabled
    Then the resolution should match by entity ID, not by prefix

  Scenario: Internal callers use exact match only
    When an internal caller resolves identifier "dashboard-redesign" without prefix matching
    Then the resolution should fail with a not-found error
    And no prefix expansion should be attempted
```

---

## Consolidation

##### Update: Design phase renames hex slug to readable epic name

**File:** `cli/features/design-slug-rename.feature`
**Action:** update
**Reason:** The existing scenario tests the design rename flow with delete/recreate semantics (asserts old slug manifest "should not exist"). With the collision-proof-slugs epic, `reconcileDesign()` performs an in-place update via `updateEpic()`, preserving the entity ID. The scenario must verify entity ID stability and the new slug format (name + hex suffix) instead of asserting the old entity was deleted.

```gherkin
@collision-proof-slugs @pipeline
Feature: Design slug rename end-to-end

  The design phase creates an epic with a hex-only slug for isolation.
  When the designer chooses a readable epic name (e.g., "oauth-redesign"),
  the reconciler updates the slug in-place, preserving the entity ID.
  The slug becomes the name plus the hex suffix (e.g., "oauth-redesign-d1e2").
  Subsequent phases operate on the new slug.

  Scenario: Design phase renames hex slug to readable epic name with stable entity ID

    # -- Setup: hex slug with isolated worktree --
    Given the initial epic slug is "d1e2f3a4b5c6"
    And a manifest is seeded for slug "d1e2f3a4b5c6"
    And the entity ID is recorded

    # -- Design with epic name different from slug --
    When the dispatch will write a design artifact:
      | field    | value                              |
      | phase    | design                             |
      | slug     | d1e2f3a4b5c6                       |
      | epic     | oauth-redesign                     |
      | problem  | OAuth flow is outdated             |
      | solution | Implement modern OAuth2 with PKCE  |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the manifest slug should start with "oauth-redesign-"
    And the manifest phase should be "plan"
    And the manifest summary problem should be "OAuth flow is outdated"
    And the entity ID should be unchanged
    And the worktree should exist for the new slug
    And the git branch should match the new slug

    # -- Plan on renamed slug --
    When the dispatch will write plan artifacts:
      | feature        | wave | description           |
      | oauth-provider | 1    | OAuth provider config |
      | pkce-flow      | 1    | PKCE authorization    |
      | token-endpoint | 2    | Token endpoint impl   |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the manifest phase should be "implement"
    And the manifest should have 3 features
    And all features should have status "pending"

    # -- Implement first feature on renamed slug --
    When the dispatch will write an implement artifact for feature "oauth-provider"
    And the pipeline runs the "implement" phase for feature "oauth-provider"
    Then the pipeline result should be successful
    And feature "oauth-provider" should have status "completed"
```

##### Remove: Duplicate slug receives a disambiguating suffix

**File:** `cli/features/store/store-schema-extension.feature`
**Action:** remove
**Reason:** This scenario tests the `deduplicateSlug()` behavior — appending a disambiguating suffix when two features share the same slug. The collision-proof-slugs epic deletes `deduplicateSlug()` as dead code, replacing it with structurally unique ordinal-suffixed slugs. The behavior described by this scenario no longer exists in the system. The replacement behavior (ordinal suffixes) is covered by the new "Feature slug includes the ordinal suffix" scenario in the slug-derivation feature above.

##### Update: Epic entity carries slug and name fields

**File:** `cli/features/store/store-schema-extension.feature`
**Action:** update
**Reason:** The existing scenario asserts "the epic slug should be immutable after creation." With collision-proof-slugs, the design reconciler explicitly mutates the slug in-place (from hex-only to name+suffix). The slug is immutable after the design phase completes, but not after creation. The assertion needs to be relaxed to reflect the design-phase rename as the one allowed mutation.

```gherkin
@collision-proof-slugs @store
Feature: Store schema supports feature slugs and slug utilities

  Features carry a slug field following the three-tier identity model
  (id, slug, name). Slugs are derived from the entity name plus a
  unique suffix and are immutable after the design phase completes.

  Background:
    Given a store is initialized

  Scenario: Epic entity carries slug and name fields
    Given a store is initialized
    When a developer creates an epic with name "Manifest Absorption"
    Then the epic should have a slug starting with "manifest-absorption-"
    And the epic should have name "Manifest Absorption"
    And the epic slug should be immutable after design phase completion
```

No other consolidation actions identified. The remaining existing scenarios (`pipeline-happy-path.feature`, `regression-loop.feature`, `cancel-flow.feature`) use old-format slugs in their test data, but this is correct behavior -- old-format slugs continue to work without migration per the design decision. These scenarios serve as implicit backward-compatibility coverage.
