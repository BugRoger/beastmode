# Integration Test Artifact: structured-task-store

Epic: `structured-task-store`
Date: 2026-04-04
User Stories: 10
Existing Feature Files Reviewed: 13

---

## New Scenarios

### US-1: Query unblocked features

```gherkin
@structured-task-store
Feature: Store ready command returns unblocked features

  Agents query the store for features that have no unmet dependencies
  and are not in a terminal or blocked status. The command returns
  only features whose prerequisite features (if any) are completed.

  Background:
    Given a store is initialized

  Scenario: Ready returns features with no dependencies
    Given an epic "auth-system" exists in the store
    And a feature "login-flow" exists under "auth-system" with no dependencies
    And feature "login-flow" has status "pending"
    When an agent queries for ready features
    Then the result should include feature "login-flow"

  Scenario: Ready excludes features with incomplete dependencies
    Given an epic "auth-system" exists in the store
    And a feature "token-cache" exists under "auth-system" depending on "login-flow"
    And feature "login-flow" has status "pending"
    When an agent queries for ready features
    Then the result should not include feature "token-cache"

  Scenario: Ready includes features whose dependencies are all completed
    Given an epic "auth-system" exists in the store
    And a feature "login-flow" exists under "auth-system" with no dependencies
    And a feature "token-cache" exists under "auth-system" depending on "login-flow"
    And feature "login-flow" has status "completed"
    And feature "token-cache" has status "pending"
    When an agent queries for ready features
    Then the result should include feature "token-cache"
    And the result should not include feature "login-flow"

  Scenario: Ready returns empty when all features are blocked or completed
    Given an epic "auth-system" exists in the store
    And a feature "login-flow" exists under "auth-system" with no dependencies
    And feature "login-flow" has status "completed"
    When an agent queries for ready features
    Then the result should be empty

  Scenario: Ready spans multiple epics
    Given an epic "auth-system" exists in the store
    And an epic "data-pipeline" exists in the store
    And a feature "login-flow" exists under "auth-system" with no dependencies and status "pending"
    And a feature "ingestion" exists under "data-pipeline" with no dependencies and status "pending"
    When an agent queries for ready features
    Then the result should include feature "login-flow"
    And the result should include feature "ingestion"
```

### US-2: Create and update features with hash-based IDs

```gherkin
@structured-task-store
Feature: Hash-based entity identifiers for collision-free concurrency

  All entities in the store receive deterministic hash-based IDs
  derived from their content. Concurrent worktree agents creating
  entities at the same time never produce colliding identifiers.

  Background:
    Given a store is initialized

  Scenario: Creating an epic generates a hash-based ID
    When a developer creates an epic with slug "auth-system"
    Then the epic should have a hash-based ID matching the pattern "bm-" followed by a hex string
    And the epic should be retrievable by its hash ID

  Scenario: Creating a feature generates a unique hash-based ID
    Given an epic "auth-system" exists in the store
    When a developer creates a feature "login-flow" under "auth-system"
    Then the feature should have a hash-based ID distinct from the epic ID
    And the feature ID should match the pattern "bm-" followed by a hex string

  Scenario: Two features with different names produce different IDs
    Given an epic "auth-system" exists in the store
    When a developer creates a feature "login-flow" under "auth-system"
    And a developer creates a feature "token-cache" under "auth-system"
    Then feature "login-flow" and feature "token-cache" should have different hash IDs

  Scenario: Updating a feature preserves its hash ID
    Given an epic "auth-system" exists in the store
    And a feature "login-flow" exists under "auth-system"
    When a developer updates feature "login-flow" with status "in-progress"
    Then the feature hash ID should remain unchanged

  Scenario: Creating an epic via CLI returns the hash ID
    When a developer creates an epic with slug "data-pipeline" via the store CLI
    Then the command output should contain the hash ID of the created epic
```

### US-3: Cross-epic dependency modeling

```gherkin
@structured-task-store
Feature: Cross-epic dependency modeling for pipeline orchestration

  Epics can declare dependencies on features from other epics using
  the depends_on field. The watch loop uses these dependencies to
  detect when one epic is blocked by another epic's incomplete work.

  Background:
    Given a store is initialized

  Scenario: Epic B is blocked when it depends on an incomplete feature in epic A
    Given an epic "auth-system" exists in the store
    And a feature "auth-provider" exists under "auth-system" with status "pending"
    And an epic "user-dashboard" exists in the store
    And epic "user-dashboard" depends on feature "auth-provider" from "auth-system"
    When the orchestrator evaluates epic readiness
    Then epic "user-dashboard" should be marked as blocked

  Scenario: Epic B becomes unblocked when its cross-epic dependency completes
    Given an epic "auth-system" exists in the store
    And a feature "auth-provider" exists under "auth-system" with status "completed"
    And an epic "user-dashboard" exists in the store
    And epic "user-dashboard" depends on feature "auth-provider" from "auth-system"
    When the orchestrator evaluates epic readiness
    Then epic "user-dashboard" should not be marked as blocked

  Scenario: Multiple cross-epic dependencies must all be satisfied
    Given an epic "auth-system" exists with feature "auth-provider" status "completed"
    And an epic "data-pipeline" exists with feature "ingestion" status "pending"
    And an epic "reporting" exists in the store
    And epic "reporting" depends on feature "auth-provider" from "auth-system"
    And epic "reporting" depends on feature "ingestion" from "data-pipeline"
    When the orchestrator evaluates epic readiness
    Then epic "reporting" should be marked as blocked

  Scenario: Circular dependencies are detected and reported
    Given an epic "epic-a" exists in the store
    And an epic "epic-b" exists in the store
    And epic "epic-a" depends on a feature from "epic-b"
    And epic "epic-b" depends on a feature from "epic-a"
    When the orchestrator evaluates epic readiness
    Then both epics should be reported as having a circular dependency
```

### US-4: Entity hierarchy browsing via store tree

```gherkin
@structured-task-store
Feature: Store tree displays full entity hierarchy

  Developers can browse the complete entity hierarchy using the
  store tree command. The output shows epics, their features,
  statuses, dependencies, and artifact references in a single view.

  Background:
    Given a store is initialized

  Scenario: Tree shows a single epic with its features
    Given an epic "auth-system" exists in the store
    And a feature "login-flow" exists under "auth-system" with status "pending"
    And a feature "token-cache" exists under "auth-system" with status "completed"
    When a developer runs the store tree command
    Then the output should show epic "auth-system"
    And the output should show feature "login-flow" with status "pending" under "auth-system"
    And the output should show feature "token-cache" with status "completed" under "auth-system"

  Scenario: Tree shows multiple epics
    Given an epic "auth-system" exists in the store
    And an epic "data-pipeline" exists in the store
    When a developer runs the store tree command
    Then the output should show both epics

  Scenario: Tree shows dependency relationships
    Given an epic "auth-system" exists in the store
    And a feature "login-flow" exists under "auth-system" with no dependencies
    And a feature "token-cache" exists under "auth-system" depending on "login-flow"
    When a developer runs the store tree command
    Then the output should indicate that "token-cache" depends on "login-flow"

  Scenario: Tree shows empty store
    When a developer runs the store tree command on an empty store
    Then the output should indicate no entities exist
```

### US-5: Dual reference by hash ID or human slug

```gherkin
@structured-task-store
Feature: Entities referenced by hash ID or human slug

  All phase commands accept either the hash ID (e.g., "bm-a3f8") or
  the human-readable slug (e.g., "cli-restructure") when referencing
  an epic. Both resolve to the same entity.

  Background:
    Given a store is initialized
    And an epic exists with slug "auth-system" and hash ID "bm-a3f8"

  Scenario: Referencing an epic by hash ID
    When a developer queries the epic using ID "bm-a3f8"
    Then the store should return the epic with slug "auth-system"

  Scenario: Referencing an epic by human slug
    When a developer queries the epic using slug "auth-system"
    Then the store should return the epic with ID "bm-a3f8"

  Scenario: Phase command accepts hash ID
    When a developer runs a phase command targeting "bm-a3f8"
    Then the command should resolve to epic "auth-system"

  Scenario: Phase command accepts human slug
    When a developer runs a phase command targeting "auth-system"
    Then the command should resolve to epic with ID "bm-a3f8"

  Scenario: Ambiguous reference returns an error
    Given an epic exists with slug "bm-a3f8" and a different hash ID
    When a developer queries using "bm-a3f8"
    Then the store should report an ambiguous reference
    And suggest using the fully qualified identifier
```

### US-6: Dependency-based ordering replaces static wave numbers

```gherkin
@structured-task-store
Feature: Dependency-based feature ordering

  Features declare explicit dependencies on other features rather
  than being assigned static wave numbers. The orchestrator derives
  execution order from the dependency graph. Partial failures and
  re-planning do not require manual wave reassignment.

  Background:
    Given a store is initialized

  Scenario: Features with no dependencies are immediately available
    Given an epic "auth-system" exists in the store
    And a feature "auth-provider" exists with no dependencies
    And a feature "login-flow" exists with no dependencies
    When the orchestrator computes execution order
    Then "auth-provider" and "login-flow" should both be available for dispatch

  Scenario: Dependent feature waits for its prerequisite
    Given an epic "auth-system" exists in the store
    And a feature "auth-provider" exists with no dependencies
    And a feature "token-cache" exists depending on "auth-provider"
    When the orchestrator computes execution order
    Then "auth-provider" should be available for dispatch
    And "token-cache" should not be available for dispatch

  Scenario: Completing a prerequisite unblocks its dependents
    Given an epic "auth-system" exists in the store
    And a feature "auth-provider" exists with status "completed"
    And a feature "token-cache" exists depending on "auth-provider" with status "pending"
    When the orchestrator computes execution order
    Then "token-cache" should be available for dispatch

  Scenario: Diamond dependency graph resolves correctly
    Given an epic "auth-system" exists in the store
    And a feature "base-config" exists with no dependencies
    And a feature "oauth-server" exists depending on "base-config"
    And a feature "client-lib" exists depending on "base-config"
    And a feature "integration" exists depending on "oauth-server" and "client-lib"
    When "base-config" is completed
    Then "oauth-server" and "client-lib" should be available for dispatch
    And "integration" should not be available for dispatch
    When "oauth-server" and "client-lib" are completed
    Then "integration" should be available for dispatch

  Scenario: Re-planning preserves dependency ordering without manual wave reassignment
    Given an epic "auth-system" exists in the store
    And a feature "auth-provider" exists with status "completed"
    And a feature "token-cache" exists depending on "auth-provider" with status "failed"
    When the feature "token-cache" is reset to "pending"
    Then "token-cache" should be available for dispatch
    And no manual wave reassignment should be required

  Scenario: Partial failure does not block independent features
    Given an epic "auth-system" exists in the store
    And a feature "auth-provider" exists with no dependencies and status "failed"
    And a feature "login-flow" exists with no dependencies and status "pending"
    And a feature "token-cache" exists depending on "auth-provider" with status "pending"
    When the orchestrator computes execution order
    Then "login-flow" should be available for dispatch
    And "token-cache" should not be available for dispatch
```

### US-7: Typed artifact fields on entities

```gherkin
@structured-task-store
Feature: Typed artifact fields per entity type

  Entities carry typed artifact fields corresponding to pipeline
  phases: design, plan, implement, validate, and release. Each
  field holds an explicit artifact reference rather than a generic
  phase-keyed record.

  Background:
    Given a store is initialized
    And an epic "auth-system" exists in the store

  Scenario: Setting a design artifact on an epic
    When the design artifact for epic "auth-system" is set to a reference
    Then the epic should have a design artifact reference
    And the epic should not have plan, implement, validate, or release artifact references

  Scenario: Setting a plan artifact on an epic
    Given epic "auth-system" has a design artifact reference
    When the plan artifact for epic "auth-system" is set to a reference
    Then the epic should have both design and plan artifact references

  Scenario: Setting an implement artifact on a feature
    Given a feature "login-flow" exists under "auth-system"
    When the implement artifact for feature "login-flow" is set to a reference
    Then the feature should have an implement artifact reference
    And the feature should not have a release artifact reference

  Scenario Outline: Each phase has its own typed artifact field
    When the <phase> artifact for epic "auth-system" is set to a reference
    Then the epic should have a <phase> artifact reference

    Examples:
      | phase     |
      | design    |
      | plan      |
      | implement |
      | validate  |
      | release   |
```

### US-8: JSON output for all store commands

```gherkin
@structured-task-store
Feature: Store commands output structured JSON

  All store CLI commands emit JSON responses so that agents can
  parse structured data without guessing output format.

  Background:
    Given a store is initialized
    And an epic "auth-system" exists in the store

  Scenario: Store ready outputs valid JSON
    When an agent runs the store ready command
    Then the output should be valid JSON
    And the JSON should contain an array of ready features

  Scenario: Store tree outputs valid JSON
    When a developer runs the store tree command
    Then the output should be valid JSON
    And the JSON should contain the entity hierarchy

  Scenario: Store blocked outputs valid JSON
    When an orchestrator runs the store blocked command
    Then the output should be valid JSON
    And the JSON should contain an array of blocked entities

  Scenario: Store create outputs valid JSON with the created entity
    When a developer creates an epic with slug "new-epic" via the store CLI
    Then the output should be valid JSON
    And the JSON should contain the hash ID of the created entity

  Scenario: Store update outputs valid JSON with the updated entity
    When a developer updates epic "auth-system" status to "in-progress" via the store CLI
    Then the output should be valid JSON
    And the JSON should reflect the updated status

  Scenario: Error responses are also valid JSON
    When an agent queries for a nonexistent entity via the store CLI
    Then the output should be valid JSON
    And the JSON should contain an error field with a descriptive message
```

### US-9: Pluggable store backend interface

```gherkin
@structured-task-store
Feature: Pluggable store backend interface

  The store exposes a backend interface that the JSON file
  implementation satisfies. The interface contract allows swapping
  to git-synced JSON, SQLite, or Dolt without changing CLI or
  agent commands.

  Background:
    Given the store backend interface is defined

  Scenario: JSON file backend satisfies the store interface
    Given the store is configured with the JSON file backend
    When a developer creates an epic via the store CLI
    And the developer queries for the created epic
    Then the epic should be persisted and retrievable

  Scenario: Store operations work identically regardless of backend
    Given the store is configured with the JSON file backend
    When a developer creates an epic, adds a feature, and queries ready features
    Then the results should be consistent with the store interface contract

  Scenario: Backend can be swapped without changing CLI commands
    Given the store is configured with the JSON file backend
    When the backend is swapped to an in-memory test backend
    And the same store CLI commands are executed
    Then the command signatures and output format should be identical
```

### US-10: Store blocked command

```gherkin
@structured-task-store
Feature: Store blocked command shows entities requiring intervention

  The store blocked command returns all entities with status "blocked"
  so that pipeline orchestrators can immediately see which entities
  require human or automated intervention.

  Background:
    Given a store is initialized

  Scenario: Blocked returns entities with blocked status
    Given an epic "auth-system" exists in the store
    And a feature "login-flow" exists under "auth-system" with status "blocked"
    When an orchestrator queries for blocked entities
    Then the result should include feature "login-flow"

  Scenario: Blocked excludes entities that are not blocked
    Given an epic "auth-system" exists in the store
    And a feature "login-flow" exists under "auth-system" with status "pending"
    And a feature "token-cache" exists under "auth-system" with status "completed"
    When an orchestrator queries for blocked entities
    Then the result should be empty

  Scenario: Blocked spans multiple epics
    Given an epic "auth-system" exists with feature "login-flow" status "blocked"
    And an epic "data-pipeline" exists with feature "ingestion" status "blocked"
    When an orchestrator queries for blocked entities
    Then the result should include feature "login-flow"
    And the result should include feature "ingestion"

  Scenario: Blocked includes epics that are themselves blocked
    Given an epic "user-dashboard" exists in the store with status "blocked"
    When an orchestrator queries for blocked entities
    Then the result should include epic "user-dashboard"

  Scenario: Blocked returns empty for a healthy pipeline
    Given an epic "auth-system" exists with feature "login-flow" status "completed"
    And an epic "data-pipeline" exists with feature "ingestion" status "in-progress"
    When an orchestrator queries for blocked entities
    Then the result should be empty
```

---

## Modified Scenarios

### 1. `cli/features/watch-loop-happy-path.feature` -- "Two epics from plan through release"

**What changed:** User Story 6 replaces static wave numbers with dependency-based ordering. The existing scenario references "wave ordering" with `active features` and `held features` based on wave 1 / wave 2 groupings. Under the new model, features declare `depends_on` relationships, and the orchestrator derives dispatch order from the dependency graph rather than wave numbers.

**Updated Gherkin:**

```gherkin
@structured-task-store
Feature: Watch loop happy path -- two epics, parallel phases, serial release

  The watch loop drives multiple epics autonomously. Non-release phases
  execute in parallel across epics. Implement features fan out within
  each epic but respect dependency ordering (features with satisfied
  dependencies dispatch before features that still have unmet dependencies).
  Release is serialized -- only one epic releases at a time.

  This feature exercises the WatchLoop class with two epics, each having
  multiple features with dependency relationships. The mock boundary is
  scanEpics and SessionFactory -- everything else (tracker, event dispatch,
  release serialization, rescan chaining) runs for real.

  Scenario: Two epics from plan through release

    # -- Setup: define two epics with dependency-ordered features --
    Given epic "auth-system" with features:
      | feature        | depends_on                |
      | auth-provider  |                           |
      | login-flow     |                           |
      | token-refresh  | auth-provider,login-flow  |
    And epic "data-pipeline" with features:
      | feature   | depends_on |
      | ingestion |            |
      | transform | ingestion  |
      | export    | ingestion  |
    And the watch loop is initialized

    # -- Plan phase: both epics dispatch in parallel --
    When both epics are seeded in "design" phase with next action "plan"
    And the watch loop ticks
    Then sessions should be active for:
      | epic          | phase |
      | auth-system   | plan  |
      | data-pipeline | plan  |

    # -- Plan completes -> implement fan-out (only features with satisfied deps) --
    When all active sessions complete successfully
    Then sessions should be active for:
      | epic          | phase     |
      | auth-system   | implement |
      | data-pipeline | implement |
    And implement sessions should respect dependency ordering:
      | epic          | active features          | held features   |
      | auth-system   | auth-provider,login-flow | token-refresh   |
      | data-pipeline | ingestion                | transform,export |

    # -- Independent features complete -> dependent features dispatch --
    When all active sessions complete successfully
    Then implement sessions should respect dependency ordering:
      | epic          | active features  | held features |
      | auth-system   | token-refresh    |               |
      | data-pipeline | transform,export |               |

    # -- All features complete -> validate (parallel) --
    When all active sessions complete successfully
    Then sessions should be active for:
      | epic          | phase    |
      | auth-system   | validate |
      | data-pipeline | validate |

    # -- Validate completes -> release (serialized!) --
    When all active sessions complete successfully
    Then 1 release session should be active
    And 1 release should be held

    # -- First release completes, poll picks up held epic --
    When the active release session completes successfully
    And the watch loop ticks
    Then 1 release session should be active
    And 0 releases should be held

    # -- Second release completes -> both epics done --
    When the active release session completes successfully
    Then the dispatch log should have 12 total dispatches
    And both epics should be at phase "done"
```

### 2. `cli/features/wave-failure.feature` -- "Multi-wave implementation respects wave ordering"

**What changed:** Same as above. Static wave numbers replaced by `depends_on` declarations. The scenario name and table structure change from "wave" to "dependency" semantics.

**Updated Gherkin:**

```gherkin
@structured-task-store
Feature: Dependency ordering in watch loop -- feature dispatch respects dependencies

  The watch loop drives implement phases as parallel feature dispatches.
  Dependency ordering is enforced: features with unmet dependencies
  are held until their prerequisites complete, even if there are
  enough parallel slots.

  This feature exercises the dependency ordering logic across features
  with layered dependencies.

  Scenario: Multi-feature implementation respects dependency ordering

    # -- Setup: define epic with dependency-ordered features --
    Given epic "auth-system" with features:
      | feature        | depends_on                |
      | auth-provider  |                           |
      | login-flow     |                           |
      | token-refresh  | auth-provider,login-flow  |
    And the watch loop is initialized

    # -- Plan phase: dispatch plan --
    When both epics are seeded in "design" phase with next action "plan"
    And the watch loop ticks
    Then sessions should be active for:
      | epic        | phase |
      | auth-system | plan  |

    # -- Plan completes -> implement fan-out (independent features only) --
    When all active sessions complete successfully
    Then implement sessions should respect dependency ordering:
      | epic        | active features          | held features |
      | auth-system | auth-provider,login-flow | token-refresh |

    # -- Independent features complete -> dependent features dispatch --
    When all active sessions complete successfully
    Then implement sessions should respect dependency ordering:
      | epic        | active features | held features |
      | auth-system | token-refresh   |               |

    # -- All features complete -> validate --
    When all active sessions complete successfully
    Then sessions should be active for:
      | epic        | phase    |
      | auth-system | validate |
```

---

## Deleted Scenarios

No existing scenarios should be deleted outright. The two modified scenarios above (`watch-loop-happy-path.feature` and `wave-failure.feature`) are updated in place to reflect the new dependency-based ordering model. Their behavioral intent (verifying that feature dispatch respects execution order constraints) remains valid -- only the mechanism changes from static wave numbers to dependency graph resolution.
