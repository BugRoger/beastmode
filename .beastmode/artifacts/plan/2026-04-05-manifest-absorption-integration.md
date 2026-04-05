# Integration Test Artifact: manifest-absorption

Epic: **manifest-absorption**
Date: 2026-04-05

---

## New Scenarios

### Feature: store-schema-extension

Covers user stories [2].

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

### Feature: xstate-store-bridge

Covers user stories [1, 8].

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

### Feature: github-sync-separation

Covers user stories [5].

```gherkin
@manifest-absorption
Feature: GitHub sync state separated from pipeline state

  GitHub issue numbers and body hashes are stored in a dedicated
  sync file, not on store entities. The GitHub sync module reads
  pipeline state from the store and sync refs from its own file.
  Pipeline state and sync state have clear ownership boundaries.

  Background:
    Given a store is initialized
    And an epic "auth-system" exists in the store

  Scenario: GitHub issue number stored in sync file, not on store entity
    When a GitHub issue is created for epic "auth-system"
    Then the issue number is recorded in the sync file
    And the epic entity in the store does not carry the issue number

  Scenario: GitHub sync module reads pipeline state from store
    Given epic "auth-system" is at phase "plan" in the store
    When the GitHub sync module enriches the epic issue body
    Then it reads the phase from the store entity
    And it reads the issue number from the sync file

  Scenario: Feature issue numbers stored in sync file
    Given a feature "login-flow" exists under "auth-system"
    When a GitHub issue is created for feature "login-flow"
    Then the feature issue number is recorded in the sync file
    And the feature entity in the store does not carry the issue number

  Scenario: Sync file is independent from store transactions
    Given epic "auth-system" has a GitHub issue recorded in the sync file
    When the epic status is updated in the store
    Then the sync file is not modified by the store transaction
    And the sync file retains the existing issue reference

  Scenario: Body hash tracked in sync file for idempotent updates
    Given epic "auth-system" has a GitHub issue with an enriched body
    When the sync module checks whether the body needs updating
    Then it compares the current body hash from the sync file
    And it skips the update if the hash matches
```

### Feature: consumer-migration

Covers user stories [4, 6].

```gherkin
@manifest-absorption
Feature: Watch loop and dashboard consume store entities

  The watch loop scans store entities and derives dispatch decisions
  from XState machine snapshots. The dashboard renders epic and
  feature state from store entities with XState-derived enrichment.
  Both consumers read the same data that store commands display.

  Background:
    Given a store is initialized

  Scenario: Watch loop discovers epics by scanning the store
    Given an epic "auth-system" exists in the store at phase "plan"
    And an epic "data-pipeline" exists in the store at phase "implement"
    When the watch loop scans for dispatchable work
    Then it finds both epics from the store
    And each epic has a machine-derived next action

  Scenario: Watch loop derives dispatch decisions from machine snapshots
    Given an epic "auth-system" exists at phase "implement"
    And feature "login-flow" has status "completed"
    And feature "token-cache" has status "pending" and depends on "login-flow"
    When the watch loop evaluates dispatch readiness
    Then "token-cache" is identified as ready for dispatch
    And the dispatch decision comes from the XState machine snapshot

  Scenario: Watch loop scan is a single store parse
    Given multiple epics exist in the store with various phases
    When the watch loop performs a scan
    Then all epic discovery happens from a single store read
    And no manifest files are consulted

  Scenario: Dashboard renders epic state from store entities
    Given an epic "auth-system" exists in the store at phase "implement"
    And features exist with mixed completion status
    When the dashboard renders the epic list
    Then it displays the epic phase from the store entity
    And it displays each feature with its store-derived status

  Scenario: Dashboard shows XState-derived enrichment
    Given an epic "auth-system" exists in the store at phase "implement"
    And the machine snapshot indicates the next action is feature dispatch
    When the dashboard renders the epic detail
    Then it shows the machine-derived next action
    And the displayed data matches what store commands would return

  Scenario: Dashboard and store commands show consistent data
    Given an epic "auth-system" exists in the store with three features
    When a developer views the dashboard
    And the developer runs a store tree command
    Then both views show the same epic phase and feature statuses
```

### Feature: store-import

Covers user stories [3].

```gherkin
@manifest-absorption
Feature: Store import migrates manifests into the store

  The import command reads existing manifest files and creates
  store entities preserving all pipeline state. After successful
  import, manifest files are removed. The command is self-contained
  and idempotent.

  Background:
    Given a store is initialized

  Scenario: Import creates epic entity from manifest
    Given a manifest file exists for epic "auth-system" at phase "implement"
    When the store import command runs
    Then an epic entity "auth-system" exists in the store
    And the epic phase matches the manifest phase
    And the epic has a generated hash-based ID

  Scenario: Import creates feature entities from manifest features
    Given a manifest file exists with features "login-flow" and "token-cache"
    When the store import command runs
    Then feature entities exist in the store for "login-flow" and "token-cache"
    And each feature has a slug matching its original name

  Scenario: Import converts wave ordering to dependency relationships
    Given a manifest file exists with features across two waves
    And wave 1 has "auth-provider" and wave 2 has "token-cache"
    When the store import command runs
    Then "token-cache" depends on "auth-provider" in the store

  Scenario: Import extracts GitHub refs into the sync file
    Given a manifest file exists with GitHub issue numbers for epic and features
    When the store import command runs
    Then the issue numbers appear in the sync file
    And the store entities do not carry GitHub issue numbers

  Scenario: Import preserves artifact references
    Given a manifest file exists with design and plan artifact references
    When the store import command runs
    Then the epic entity has design and plan artifact fields populated

  Scenario: Import deletes manifest files on success
    Given a manifest file exists for epic "auth-system"
    When the store import command runs successfully
    Then the manifest file for "auth-system" no longer exists

  Scenario: Import is idempotent
    Given a manifest file has already been imported into the store
    When the store import command runs again on the same manifest
    Then no duplicate entities are created
    And the existing store state is unchanged

  Scenario: Import handles multiple manifests
    Given manifest files exist for "auth-system" and "data-pipeline"
    When the store import command runs
    Then both epics exist in the store with all their features
    And both manifest files are deleted

  Scenario: Import grandfathers active epic git artifacts
    Given an active epic has a slug-based branch and worktree
    When the store import command runs
    Then the store entity records the existing branch and worktree paths
    And no git artifacts are renamed to ID-based naming
```

### Feature: manifest-deletion

Covers user stories [7].

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

---

## Modified Scenarios

### pipeline-happy-path.feature -- "Full epic lifecycle -- design through release"

**File:** `cli/features/pipeline-happy-path.feature`
**Scenario:** Full epic lifecycle -- design through release

**What changed:** The scenario references "manifest" throughout (seeded manifest, manifest slug, manifest phase, manifest features). After manifest absorption, pipeline state is in the store. The scenario language must shift from manifest to store. The feature description also references "reconciles the manifest via the XState state machine."

```gherkin
@manifest-absorption
Feature: Pipeline happy path -- design to release

  The beastmode pipeline advances an epic through five phases:
  design, plan, implement, validate, and release. Each phase
  runs a dispatch function (normally a Claude session), writes
  markdown artifacts with YAML frontmatter, generates output.json
  via the stop hook, and enriches store entities via the XState
  state machine. The pipeline completes when the epic reaches
  the "done" terminal state.

  This feature exercises the entire pipeline end-to-end with a
  mock dispatch function replacing Claude. All other components
  (git worktrees, store, stop hook, XState reconciliation)
  run against a real temporary git repository.

  Scenario: Full epic lifecycle -- design through release

    # -- Phase 1: Design --
    Given the initial epic slug is "abc123"
    And an epic is seeded in the store for slug "abc123"

    When the dispatch will write a design artifact:
      | field    | value                              |
      | phase    | design                             |
      | slug     | abc123                             |
      | epic     | widget-auth                        |
      | problem  | Users cannot authenticate via OAuth |
      | solution | Add OAuth2 flow with PKCE          |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the epic slug should be "widget-auth"
    And the epic phase should be "plan"
    And the epic summary problem should be "Users cannot authenticate via OAuth"

    # -- Phase 2: Plan --
    When the dispatch will write plan artifacts:
      | feature        | wave | description                |
      | oauth-provider | 1    | Configure OAuth2 provider  |
      | login-flow     | 1    | Implement login redirect   |
      | token-refresh  | 2    | Handle token refresh logic |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the epic phase should be "implement"
    And the epic should have 3 features
    And all features should have status "pending"

    # -- Phase 3: Implement (feature fan-out) --
    When the dispatch will write an implement artifact for feature "oauth-provider"
    And the pipeline runs the "implement" phase for feature "oauth-provider"
    Then the pipeline result should be successful
    And feature "oauth-provider" should have status "completed"
    And the epic phase should be "implement"

    When the dispatch will write an implement artifact for feature "login-flow"
    And the pipeline runs the "implement" phase for feature "login-flow"
    Then the pipeline result should be successful
    And feature "login-flow" should have status "completed"
    And the epic phase should be "implement"

    When the dispatch will write an implement artifact for feature "token-refresh"
    And the pipeline runs the "implement" phase for feature "token-refresh"
    Then the pipeline result should be successful
    And feature "token-refresh" should have status "completed"
    And the epic phase should be "validate"

    # -- Phase 4: Validate --
    When the dispatch will write a validate artifact with status "passed"
    And the pipeline runs the "validate" phase
    Then the pipeline result should be successful
    And the epic phase should be "release"

    # -- Phase 5: Release --
    When the dispatch will write a release artifact with bump "minor"
    And the pipeline runs the "release" phase
    Then the pipeline result should be successful
    And the epic phase should be "done"
    And the worktree should be cleaned up
```

### pipeline-error-resilience.feature -- all scenarios

**File:** `cli/features/pipeline-error-resilience.feature`
**Scenarios:** Dispatch failure returns early without throwing; Dispatch produces no output (abandonment); Failed validate produces regression but pipeline succeeds

**What changed:** All three scenarios reference "manifest is seeded" and "manifest phase." After absorption, these become store-seeded epics and epic phase. The feature description references reconcile as step 6; reconciliation is now inlined into the runner.

```gherkin
@manifest-absorption
Feature: Pipeline error resilience -- transient failures don't abort remaining steps

  The pipeline executes 9 steps in order:
  1. worktree.create
  2. rebase
  3. settings.clean + write (HITL)
  4. dispatch
  5. artifacts.collect
  6. reconcile (inlined into runner)
  7. tag
  8. github.mirror
  9. cleanup

  Error resilience means: if step 6 (reconcile) throws, steps 7-8 still run.
  If step 7 (tag) throws, step 8 still runs. Each step failing should not
  abort the pipeline.

  Scenario: Dispatch failure returns early without throwing

    Given the initial epic slug is "failing-epic"
    And an epic is seeded in the store for slug "failing-epic"

    When the dispatch will fail
    And the pipeline runs the "plan" phase
    Then the pipeline result should be failure
    And the pipeline should not throw


  Scenario: Dispatch produces no output (abandonment)

    Given the initial epic slug is "abandon-epic"
    And an epic is seeded in the store for slug "abandon-epic"

    When the dispatch will produce no output
    And the pipeline runs the "design" phase
    Then the pipeline result should be failure
    And the pipeline should not throw


  Scenario: Failed validate produces regression but pipeline succeeds

    Given the initial epic slug is "regress-epic"
    And an epic is seeded in the store for slug "regress-epic"

    # Must run design first so epic transitions to plan phase
    When the dispatch will write a design artifact:
      | field    | value        |
      | phase    | design       |
      | slug     | regress-epic |
      | epic     | regress-epic |
      | problem  | Test problem |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the epic phase should be "plan"

    When the dispatch will write plan artifacts:
      | feature | wave | description    |
      | feat-a  | 1    | Feature A      |
      | feat-b  | 2    | Feature B      |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the epic phase should be "implement"

    # Implement feature-a
    When the dispatch will write an implement artifact for feature "feat-a"
    And the pipeline runs the "implement" phase for feature "feat-a"
    Then the pipeline result should be successful

    # Implement feature-b
    When the dispatch will write an implement artifact for feature "feat-b"
    And the pipeline runs the "implement" phase for feature "feat-b"
    Then the pipeline result should be successful
    And the epic phase should be "validate"

    # Validate with failure status triggers regression
    When the dispatch will write a validate artifact with failures:
      | feature | result |
      | feat-a  | passed |
      | feat-b  | failed |
    And the pipeline runs the "validate" phase
    Then the pipeline result should be successful
    And the epic phase should be "implement"
    And feature "feat-a" should have status "completed"
    And feature "feat-b" should have status "pending"
```

### regression-loop.feature -- "Validate failure triggers targeted regression"

**File:** `cli/features/regression-loop.feature`
**Scenario:** Validate failure triggers targeted regression, only failing feature resets

**What changed:** All references to "manifest is seeded," "manifest slug," "manifest phase," and "manifest should have N features" become store-based equivalents.

```gherkin
@manifest-absorption
Feature: Regression loop -- validate failure triggers targeted re-dispatch

  When validation identifies failing features, the XState reconciler sends a
  REGRESS_FEATURES event that resets only the failing features to pending
  status while passing features retain completed status. The epic phase
  moves back to implement for re-dispatch of the failing features only.

  This feature exercises the targeted regression path: design, plan (with
  multiple features across waves), implement all features, validate with
  partial failure, REGRESS_FEATURES resets only failing features,
  re-implement failing feature, re-validate with success, release, done.

  The pipeline result remains successful (dispatch succeeded), but the epic
  phase changes back to "implement" and only failing feature statuses reset.

  Scenario: Validate failure triggers targeted regression, only failing feature resets

    # -- Phase 1: Design with slug rename --
    Given the initial epic slug is "hex0a1b2c"
    And an epic is seeded in the store for slug "hex0a1b2c"

    When the dispatch will write a design artifact:
      | field    | value                           |
      | phase    | design                          |
      | slug     | hex0a1b2c                       |
      | epic     | auth-flow                       |
      | problem  | Complex OAuth integration       |
      | solution | Streamlined auth service        |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the epic slug should be "auth-flow"
    And the epic phase should be "plan"

    # -- Phase 2: Plan with multi-wave features --
    When the dispatch will write plan artifacts:
      | feature      | wave | description                |
      | oauth-server | 1    | OAuth2 provider setup      |
      | client-lib   | 1    | Client library integration |
      | token-cache  | 2    | Token caching layer        |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the epic phase should be "implement"
    And the epic should have 3 features
    And all features should have status "pending"

    # -- Phase 3a: Implement wave 1 features --
    When the dispatch will write an implement artifact for feature "oauth-server"
    And the pipeline runs the "implement" phase for feature "oauth-server"
    Then the pipeline result should be successful
    And feature "oauth-server" should have status "completed"

    When the dispatch will write an implement artifact for feature "client-lib"
    And the pipeline runs the "implement" phase for feature "client-lib"
    Then the pipeline result should be successful
    And feature "client-lib" should have status "completed"

    # -- Phase 3b: Implement wave 2 features --
    When the dispatch will write an implement artifact for feature "token-cache"
    And the pipeline runs the "implement" phase for feature "token-cache"
    Then the pipeline result should be successful
    And feature "token-cache" should have status "completed"
    And the epic phase should be "validate"

    # -- Phase 4a: Validate with FAILURE (token-cache fails) --
    When the dispatch will write a validate artifact with failures:
      | feature      | result |
      | oauth-server | passed |
      | client-lib   | passed |
      | token-cache  | failed |
    And the pipeline runs the "validate" phase
    Then the pipeline result should be successful
    And the pipeline result should indicate regression
    And the epic phase should be "implement"
    And feature "oauth-server" should have status "completed"
    And feature "client-lib" should have status "completed"
    And feature "token-cache" should have status "pending"

    # -- Phase 3c: Re-implement only token-cache after regression --
    When the dispatch will write an implement artifact for feature "token-cache"
    And the pipeline runs the "implement" phase for feature "token-cache"
    Then the pipeline result should be successful
    And feature "token-cache" should have status "completed"
    And the epic phase should be "validate"

    # -- Phase 4b: Re-validate with SUCCESS --
    When the dispatch will write a validate artifact with status "passed"
    And the pipeline runs the "validate" phase
    Then the pipeline result should be successful
    And the epic phase should be "release"

    # -- Phase 5: Release --
    When the dispatch will write a release artifact with bump "minor"
    And the pipeline runs the "release" phase
    Then the pipeline result should be successful
    And the epic phase should be "done"
    And the worktree should be cleaned up
```

### validate-feedback-loop.feature -- both scenarios

**File:** `cli/features/validate-feedback-loop.feature`
**Scenarios:** Validate identifies and re-dispatches only the failing feature; Maximum of two re-dispatch cycles per feature

**What changed:** All "manifest is seeded," "manifest slug," "manifest phase," and "manifest should have N features" references become store-based equivalents.

```gherkin
@manifest-absorption
Feature: Validate re-dispatches only failing features for re-implement cycles

  When validation identifies failing features, the validate phase
  re-dispatches only those specific features for a complete
  re-implementation cycle (not a full epic regression). Each feature
  gets a maximum of two re-implement cycles. Passing features
  retain their completed status.

  Scenario: Validate identifies and re-dispatches only the failing feature

    # -- Phase 1: Design --
    Given the initial epic slug is "hex0c3d4e"
    And an epic is seeded in the store for slug "hex0c3d4e"

    When the dispatch will write a design artifact:
      | field    | value                          |
      | phase    | design                         |
      | slug     | hex0c3d4e                      |
      | epic     | auth-flow                      |
      | problem  | Cross-feature integration      |
      | solution | Targeted re-dispatch           |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the epic slug should be "auth-flow"
    And the epic phase should be "plan"

    # -- Phase 2: Plan with two features --
    When the dispatch will write plan artifacts:
      | feature        | wave | description              |
      | auth-provider  | 1    | OAuth2 provider setup    |
      | token-cache    | 1    | Token caching layer      |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the epic phase should be "implement"
    And the epic should have 2 features

    # -- Phase 3: Implement both features --
    When the dispatch will write an implement artifact for feature "auth-provider"
    And the pipeline runs the "implement" phase for feature "auth-provider"
    Then the pipeline result should be successful
    And feature "auth-provider" should have status "completed"

    When the dispatch will write an implement artifact for feature "token-cache"
    And the pipeline runs the "implement" phase for feature "token-cache"
    Then the pipeline result should be successful
    And feature "token-cache" should have status "completed"
    And the epic phase should be "validate"

    # -- Phase 4a: Validate with token-cache failing --
    When the dispatch will write a validate artifact with failures:
      | feature       | result |
      | auth-provider | passed |
      | token-cache   | failed |
    And the pipeline runs the "validate" phase
    Then the pipeline result should be successful
    And the epic phase should be "implement"
    And feature "auth-provider" should have status "completed"
    And feature "token-cache" should have status "pending"

    # -- Phase 3b: Re-implement only token-cache --
    When the dispatch will write an implement artifact for feature "token-cache"
    And the pipeline runs the "implement" phase for feature "token-cache"
    Then the pipeline result should be successful
    And feature "token-cache" should have status "completed"
    And the epic phase should be "validate"

    # -- Phase 4b: Re-validate — all pass --
    When the dispatch will write a validate artifact with status "passed"
    And the pipeline runs the "validate" phase
    Then the pipeline result should be successful
    And the epic phase should be "release"


  Scenario: Maximum of two re-dispatch cycles per feature

    # -- Phase 1: Design --
    Given the initial epic slug is "hex1a2b3c"
    And an epic is seeded in the store for slug "hex1a2b3c"

    When the dispatch will write a design artifact:
      | field    | value                     |
      | phase    | design                    |
      | slug     | hex1a2b3c                 |
      | epic     | stubborn-epic             |
      | problem  | Persistent failure        |
      | solution | Budget exhaustion         |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the epic slug should be "stubborn-epic"

    # -- Phase 2: Plan --
    When the dispatch will write plan artifacts:
      | feature    | wave | description       |
      | flaky-feat | 1    | Unreliable feature |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful

    # -- Phase 3a: Implement --
    When the dispatch will write an implement artifact for feature "flaky-feat"
    And the pipeline runs the "implement" phase for feature "flaky-feat"
    Then the pipeline result should be successful

    # -- Phase 4a: Validate fail #1 --
    When the dispatch will write a validate artifact with failures:
      | feature    | result |
      | flaky-feat | failed |
    And the pipeline runs the "validate" phase
    Then the pipeline result should be successful
    And the epic phase should be "implement"
    And feature "flaky-feat" should have reDispatchCount 1

    # -- Phase 3b: Re-implement #1 --
    When the dispatch will write an implement artifact for feature "flaky-feat"
    And the pipeline runs the "implement" phase for feature "flaky-feat"
    Then the pipeline result should be successful

    # -- Phase 4b: Validate fail #2 --
    When the dispatch will write a validate artifact with failures:
      | feature    | result |
      | flaky-feat | failed |
    And the pipeline runs the "validate" phase
    Then the pipeline result should be successful
    And the epic phase should be "implement"
    And feature "flaky-feat" should have reDispatchCount 2

    # -- Phase 3c: Re-implement #2 --
    When the dispatch will write an implement artifact for feature "flaky-feat"
    And the pipeline runs the "implement" phase for feature "flaky-feat"
    Then the pipeline result should be successful

    # -- Phase 4c: Validate fail #3 — budget exhausted --
    When the dispatch will write a validate artifact with failures:
      | feature    | result |
      | flaky-feat | failed |
    And the pipeline runs the "validate" phase
    Then the pipeline result should be successful
    And the epic phase should be "implement"
    And feature "flaky-feat" should have status "blocked"
```

### cancel-flow.feature -- all scenarios

**File:** `cli/features/cancel-flow.feature`
**Scenarios:** Cancel mid-pipeline removes all traces; Cancelling twice succeeds; Cancel removes all artifacts for epic

**What changed:** The cancel flow references "manifest for X should not exist" and "delete manifest." After absorption, cancel deletes store entities instead. The cleanup sequence description also references "delete manifest" which becomes "delete store entity."

```gherkin
@manifest-absorption
Feature: Cancel and abandon flow -- mid-pipeline cleanup

  The beastmode CLI provides a cancel command that cleans up incomplete epics.
  The cleanup sequence is: remove worktree, delete archive tags, delete phase tags,
  delete artifacts, close GitHub issue (if enabled), delete store entity.

  Each step is warn-and-continue: if one step fails, the sequence continues and
  records the warning. This allows best-effort cleanup that doesn't abort on
  intermediate failures.

  Scenario: Cancel mid-pipeline removes all traces

    Given an epic "feature-x" at phase "plan"
    When the epic is cancelled with force
    Then the cancel result should have 5 cleaned steps
    And the cancel result should have 0 warnings
    And the store entity for "feature-x" should not exist
    And the worktree for "feature-x" should not exist
    And no artifacts should exist for "feature-x"

  Scenario: Cancelling twice succeeds with second run cleaning remaining artifacts

    Given an epic "feature-y" at phase "implement"
    When the epic is cancelled with force
    Then the cancel result should have 5 cleaned steps
    When the epic is cancelled again
    Then the store entity for "feature-y" should not exist
    And no artifacts should exist for "feature-y"

  Scenario: Cancel removes all artifacts for epic

    Given an epic "feature-z" at phase "design"
    When the epic is cancelled with force
    Then the cancel result should have 5 cleaned steps
    And the store entity for "feature-z" should not exist
    And no artifacts should exist for "feature-z"
```

### early-issue-creation.feature -- scenarios referencing "manifest"

**File:** `cli/features/github-enrichment/early-issue-creation.feature`
**Scenarios:** Epic issue exists before design phase dispatch begins; Feature issues exist before implement phase dispatch begins; Pre-dispatch issue creation is idempotent

**What changed:** Three scenarios reference "recorded in the manifest" and "issue number in its manifest." After absorption, issue numbers are recorded in the sync file, not on store entities.

```gherkin
@manifest-absorption
Feature: GitHub issues created pre-dispatch for commit reference availability

  GitHub issues are created before the phase dispatch runs, not after
  checkpoint. This ensures issue numbers are available from the very
  first commit of a phase session.

  Background:
    Given GitHub issue creation is enabled in the configuration

  Scenario: Epic issue exists before design phase dispatch begins
    Given a new epic is starting the design phase
    When the pipeline prepares for dispatch
    Then a GitHub issue is created for the epic before the phase skill runs
    And the issue number is recorded in the sync file

  Scenario: Feature issues exist before implement phase dispatch begins
    Given an epic has completed planning with two features
    When the pipeline prepares for the implement phase
    Then GitHub issues are created for each feature before any skill runs
    And each feature's issue number is recorded in the sync file

  Scenario: Pre-dispatch issue is a minimal stub
    Given a new epic is starting the design phase
    When the pre-dispatch issue creation runs
    Then the issue is created with the slug as its title
    And the issue body is a minimal placeholder pending enrichment

  Scenario: Pre-dispatch issue creation is idempotent
    Given an epic already has a GitHub issue number in the sync file
    When the pipeline prepares for dispatch again
    Then no duplicate issue is created
    And the existing issue number is preserved

  Scenario: Feature issue creation does not run for non-implement phases
    Given an epic is at the validate phase with features that have issue numbers
    When the pipeline prepares for the validate phase dispatch
    Then no new feature issues are created
```

### backfill.feature -- "Backfill skips epics without GitHub issues"

**File:** `cli/features/github-enrichment/backfill.feature`
**Scenario:** Backfill skips epics without GitHub issues

**What changed:** References "no GitHub issue number in its manifest." After absorption, the check is against the sync file.

```gherkin
@manifest-absorption
Feature: Existing bare issues backfilled with enriched content

  A backfill operation iterates all existing epics that have GitHub
  issues and re-syncs their issue bodies through the enrichment
  pipeline. This brings the entire issue history up to the enriched
  format without requiring manual updates.

  Scenario: Backfill enriches a bare epic issue with PRD content
    Given an existing epic has a bare GitHub issue with no PRD content
    And the epic has a design artifact with PRD sections
    When the backfill operation runs
    Then the epic issue body is updated with the PRD summary

  Scenario: Backfill enriches feature issues with descriptions
    Given an existing epic has feature issues with empty bodies
    And the epic has a plan artifact with feature descriptions
    When the backfill operation runs
    Then each feature issue body is updated with its description and user story

  Scenario: Backfill skips epics without GitHub issues
    Given an existing epic has no GitHub issue number in the sync file
    When the backfill operation runs
    Then the epic is skipped without error

  Scenario: Backfill is idempotent on already-enriched issues
    Given an existing epic has an already-enriched GitHub issue
    When the backfill operation runs
    Then the issue body content remains correct
    And no duplicate sections are added

  Scenario: Backfill processes released epics with archive tag URLs
    Given an existing released epic has a bare GitHub issue
    And the epic has an archive tag and version tag
    When the backfill operation runs
    Then the epic issue body uses the archive tag compare URL
```

---

## Deleted Scenarios

No existing scenarios are fully obsolete. All affected scenarios are listed in the Modified Scenarios section above with updated Gherkin. The behavioral intent is preserved -- only the state persistence references change from manifest to store.
