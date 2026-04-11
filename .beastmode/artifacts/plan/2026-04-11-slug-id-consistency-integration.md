# Integration Test Artifact: slug-id-consistency

Epic: **slug-id-consistency**
Date: 2026-04-11

---

## New Scenarios

### Feature: slug-foundation

Covers user stories [4, 5, 9, 10].

```gherkin
@slug-id-consistency @store
Feature: Slug-ID bijection -- hex suffix encodes entity ID

  The hex suffix appended to every slug is derived from the entity's
  hash ID. A developer can mentally extract the suffix to determine
  the ID without a store lookup, and vice versa. This bijection is
  the structural guarantee that makes slugs collision-proof.

  Background:
    Given a store is initialized

  Scenario: Epic slug suffix matches the entity's short ID
    When a developer creates an epic named "auth system"
    Then the epic slug suffix should equal the first characters of the entity's hash ID
    And the entity should be retrievable by extracting the suffix from the slug

  Scenario: Entity ID is recoverable from the slug alone
    Given an epic exists with a known slug and hash ID
    When a developer extracts the hex suffix from the slug
    Then the extracted suffix should match the entity's short ID
    And the entity should be locatable by that short ID without a store query

  Scenario: Bijection holds across multiple epics
    When a developer creates epics named "auth system" and "data pipeline"
    Then each epic's slug suffix should match its own short ID
    And no two epics should share the same suffix
```

```gherkin
@slug-id-consistency @store
Feature: Design-phase placeholder names -- human-friendly from the start

  Epics created during the design phase receive a memorable placeholder
  name instead of a raw hex string. Worktree directories and branch
  names are human-readable immediately, not just after design rename.

  Scenario: New epic receives a memorable placeholder name
    When a developer seeds an epic for the design phase
    Then the epic slug should contain a human-readable word
    And the epic slug should not be a bare hex string

  Scenario: Placeholder name appears in worktree directory
    When a developer seeds an epic for the design phase
    Then the worktree directory name should contain the placeholder slug
    And the directory name should be human-readable

  Scenario: Placeholder name appears in git branch
    When a developer seeds an epic for the design phase
    Then the git branch name should contain the placeholder slug
    And the branch name should not contain a bare hex string
```

```gherkin
@slug-id-consistency @store
Feature: Slugify deduplication -- single canonical import

  All slug formatting flows through a single slugify function imported
  from one canonical module. No duplicate slug-formatting logic exists
  elsewhere in the codebase.

  Scenario: Slug formatting produces consistent output regardless of call site
    Given a raw name "My Epic Name!"
    When the slug is computed by the store module
    And the slug is computed by any other consumer
    Then both results should be identical

  Scenario: Slug validation accepts dots for feature ID suffixes
    Given a feature slug containing a dot suffix like "auth-flow.2"
    When the slug is validated
    Then the validation should pass
    And the slug should be accepted by all slug-consuming APIs
```

### Feature: env-frontmatter-contract

Covers user stories [2, 3, 6, 7].

```gherkin
@slug-id-consistency @pipeline
Feature: Human-facing surfaces use slugs -- filenames, branches, CLI, dashboard

  Every surface a human reads or types uses slugs, never raw entity IDs.
  Entity IDs are reserved for internal lookups. This separation ensures
  developers never encounter opaque identifiers in their daily workflow.

  Scenario: Artifact filenames embed the epic slug
    Given an epic with a known slug
    When the pipeline writes a design artifact for the epic
    Then the artifact filename should contain the epic slug
    And the artifact filename should not contain the raw entity ID

  Scenario: Git branch names use the epic slug
    Given an epic with a known slug
    When the pipeline creates a worktree for the epic
    Then the branch name should be derived from the epic slug
    And the branch name should not contain the raw entity ID

  Scenario: Feature slugs embed the parent epic name
    Given an epic with slug containing "auth-system"
    When the plan phase creates a feature under the epic
    Then the feature slug should contain "auth-system"
    And the feature should be identifiable as belonging to the epic from its slug alone
```

```gherkin
@slug-id-consistency @pipeline
Feature: Frontmatter contract -- id, epic, and feature fields

  Artifact frontmatter uses `id:`, `epic:`, and `feature:` fields
  consistently across all phases. The `id:` field carries the entity
  ID, while `epic:` and `feature:` carry slugs. This contract makes
  artifact-to-entity matching unambiguous.

  Scenario: Design artifact frontmatter includes id and epic fields
    When the design phase writes an artifact
    Then the frontmatter should contain an "id" field with the entity ID
    And the frontmatter should contain an "epic" field with the epic slug
    And the "id" field should not equal the "epic" field

  Scenario: Plan artifact frontmatter includes feature field
    Given an epic in the plan phase with features
    When the plan phase writes a feature artifact
    Then the frontmatter should contain a "feature" field with the feature slug
    And the frontmatter should contain an "epic" field with the parent epic slug
    And the frontmatter should contain an "id" field with the feature entity ID

  Scenario: Implement artifact frontmatter carries all three fields
    Given an epic with a feature in the implement phase
    When the implement phase writes an artifact for the feature
    Then the frontmatter should contain "id", "epic", and "feature" fields
    And the "id" field should be the feature's entity ID
    And the "epic" field should be the parent epic's slug
    And the "feature" field should be the feature's slug
```

```gherkin
@slug-id-consistency @pipeline
Feature: Environment variable contract -- BEASTMODE_ID, BEASTMODE_EPIC, BEASTMODE_FEATURE

  Skills receive environment variables that clearly distinguish
  identifier types. BEASTMODE_ID carries the entity ID for internal
  lookups. BEASTMODE_EPIC carries the epic slug. BEASTMODE_FEATURE
  carries the feature slug when applicable.

  Scenario: Design phase dispatch sets BEASTMODE_ID and BEASTMODE_EPIC
    When the pipeline dispatches a design phase session
    Then the environment should contain BEASTMODE_ID with the entity ID
    And the environment should contain BEASTMODE_EPIC with the epic slug
    And the environment should not contain a BEASTMODE_FEATURE variable

  Scenario: Implement phase dispatch sets all three environment variables
    Given an epic with a feature ready for implementation
    When the pipeline dispatches an implement phase session for the feature
    Then the environment should contain BEASTMODE_ID with the feature entity ID
    And the environment should contain BEASTMODE_EPIC with the epic slug
    And the environment should contain BEASTMODE_FEATURE with the feature slug

  Scenario Outline: Environment variables are set for all applicable phases
    When the pipeline dispatches a "<phase>" phase session
    Then the environment should contain BEASTMODE_ID
    And the environment should contain BEASTMODE_EPIC

    Examples:
      | phase     |
      | design    |
      | plan      |
      | implement |
      | validate  |
      | release   |
```

### Feature: id-pipeline

Covers user stories [1, 8].

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

---

## Consolidation

##### Update: Referencing an epic by hash ID

**File:** `cli/features/store/store-dual-reference.feature`
**Action:** update
**Reason:** The existing dual-reference feature tests `store.find()` semantics where both hash ID and slug resolve to the same entity. With slug-id-consistency, `store.find()` is removed (user story 8). Lookups are now type-specific: `getEpic()` for ID-based access, and CLI prefix resolution for slug-based access. The scenarios must reflect the new lookup API rather than a generic find path.

```gherkin
@slug-id-consistency @store
Feature: Entities accessed by typed lookup methods

  Epics are retrieved by entity ID via getEpic(). The CLI layer
  provides slug-based resolution for human callers. Internal code
  never mixes identifier types in a single call.

  Background:
    Given a store is initialized
    And an epic exists with slug "auth-system" and entity ID tracked

  Scenario: Retrieving an epic by entity ID via getEpic
    When a developer retrieves the epic using getEpic with its entity ID
    Then the store should return the epic with slug "auth-system"

  Scenario: CLI resolves slug to entity then uses getEpic
    When a developer enters slug "auth-system" at the CLI
    Then the CLI should resolve the slug to an entity ID
    And the CLI should retrieve the epic via getEpic with that entity ID

  Scenario: Internal callers cannot pass a slug to getEpic
    When an internal caller passes slug "auth-system" to getEpic
    Then the lookup should fail because slugs are not entity IDs

  Scenario: Both identifier types ultimately reference the same entity
    When a developer retrieves the epic by entity ID via getEpic
    And the CLI resolves slug "auth-system" to an entity ID and retrieves via getEpic
    Then both retrievals should return the same epic entity
```

##### Update: Feature entity carries a slug field

**File:** `cli/features/store/store-schema-extension.feature`
**Action:** update
**Reason:** Two changes from this epic affect this feature file. First, user story 9 (deduplicated slugify) means slug normalization behavior is now governed by the canonical `slugify()` from `store/slug.ts`, not a store-internal utility. Second, user story 10 (dots in slugs) means validation must accept dots. The scenario asserting normalization and the feature slug scenario need updating to reflect these constraints.

```gherkin
@slug-id-consistency @store
Feature: Store schema supports feature slugs and slug utilities

  Features carry a slug field following the identity model (id, slug, name).
  Slugs are derived via the canonical slugify function and may contain dots
  for feature ordinal suffixes. Slug normalization and validation are
  consistent across all call sites.

  Background:
    Given a store is initialized

  Scenario: Feature entity carries a slug field
    Given an epic "auth-system" exists in the store
    When a developer creates a feature "login-flow" under "auth-system" with slug "login-flow"
    Then the feature should have slug "login-flow"
    And the feature should be retrievable by slug "login-flow"

  Scenario: Slug is normalized to kebab-case via canonical slugify
    Given an epic "auth-system" exists in the store
    When a developer creates a feature with raw slug "Login Flow!"
    Then the feature slug should be normalized to "login-flow"

  Scenario: Slug validation accepts dots for feature suffixes
    Given an epic "auth-system" exists in the store
    When a developer creates a feature with slug "login-flow.2"
    Then the slug validation should pass
    And the feature should be retrievable by slug "login-flow.2"

  Scenario: Store is the sole pipeline state file
    Given a store contains epics with features, dependencies, and phase status
    When a developer inspects the pipeline state
    Then all pipeline state is contained in a single store file
    And no separate manifest files are required

  Scenario: Epic entity carries slug and name fields
    Given a store is initialized
    When a developer creates an epic with name "Manifest Absorption"
    Then the epic should have a slug starting with "manifest-absorption-"
    And the epic should have name "Manifest Absorption"
    And the epic slug should be immutable after design phase completion
```

No other consolidation actions identified. The remaining existing scenarios (`pipeline-happy-path.feature`, `regression-loop.feature`, `validate-feedback-loop.feature`, `cancel-flow.feature`) use old-format slugs in their test data, which is correct -- old-format slugs continue to work as backward-compatible input. The collision-proof-slugs integration artifact already handles design-slug-rename.feature consolidation. The store-hash-ids.feature remains valid as-is because it tests hash ID generation mechanics, which are unchanged by this epic.
