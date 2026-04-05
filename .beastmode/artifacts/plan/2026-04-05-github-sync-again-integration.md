# github-sync-again Integration Test Plan

## New Scenarios

### Feature: field-mapping-fix

Covers user stories [1, 2, 3, 6, 7].

```gherkin
@github-sync-again
Feature: Issue creation succeeds with correct phase label from store

  Issue creation requires the correct phase label to be read from the store's
  status field. Previously, undefined phase values caused creation to fail with
  "phase/undefined" errors. The sync engine must resolve the phase from the
  store state before creating or updating issues.

  Scenario: Epic issue creation uses correct phase label from store status
    Given a new epic is starting the design phase
    And the store records the epic status as "design"
    When the epic issue is created
    Then the issue is created with the "phase/design" label
    And no "phase/undefined" label is present

  Scenario: Feature issue creation uses correct phase label from store
    Given an epic has completed planning with two features
    And the store records each feature status as "pending"
    When feature issues are created for the implement phase
    Then each feature issue is created with the "phase/pending" label
    And no "phase/undefined" labels are present

  Scenario: Phase label updates when status changes in store
    Given an epic issue with the "phase/design" label exists
    And the store records the epic status as "plan"
    When the issue is synchronized with the store
    Then the issue label is updated to "phase/plan"
    And the old "phase/design" label is removed
```

```gherkin
@github-sync-again
Feature: Feature issue titles include epic name prefix

  Feature issues must use the format "{epic}: {feature}" for their titles,
  so that features are identifiable in cross-issue searches and issue lists.

  Scenario: Feature issue title uses epic-prefixed format
    Given an epic with the name "auth-system" exists
    And a feature "login-flow" belongs to that epic
    When the feature issue is created
    Then the issue title is "auth-system: login-flow"

  Scenario: Feature issue title retains epic prefix during updates
    Given a feature issue titled "auth-system: login-flow" exists
    And the epic is renamed to "authentication"
    When the feature issue body is re-enriched
    Then the issue title remains "auth-system: login-flow"
    And the epic name change does not cascade to the title

  Scenario: Multiple features in same epic have distinct epic-prefixed titles
    Given an epic "data-pipeline" with three features
    When all feature issues are created
    Then the titles are:
      | Feature          | Title                        |
      | ingestion        | data-pipeline: ingestion     |
      | transform        | data-pipeline: transform     |
      | export           | data-pipeline: export        |
```

```gherkin
@github-sync-again
Feature: Artifact link URLs use repo-relative paths on GitHub

  Issue bodies contain links to artifacts (design, plan, validate, release).
  These links must use repo-relative paths that work on GitHub, not absolute
  filesystem paths.

  Scenario: Epic issue body contains repo-relative artifact link
    Given an epic has completed the design phase
    And the design artifact is at `.beastmode/artifacts/design/2026-04-05-example.md`
    When the epic issue body is enriched
    Then the body contains a link with path `.beastmode/artifacts/design/2026-04-05-example.md`
    And the link is not an absolute filesystem path

  Scenario: Feature issue body contains repo-relative plan artifact link
    Given a feature has been defined in the plan phase
    And the plan artifact is at `.beastmode/artifacts/plan/2026-04-05-example-features.md`
    When the feature issue body is enriched
    Then the body contains a link with path `.beastmode/artifacts/plan/2026-04-05-example-features.md`
    And the link is not an absolute local path

  Scenario: Artifact links work when clicked on GitHub
    Given an epic issue with a repo-relative artifact link exists
    When a user navigates to the issue on GitHub
    Then the artifact link is clickable and resolves to the file in the repository
```

### Feature: retry-queue

Covers user stories [4].

```gherkin
@github-sync-again
Feature: Failed GitHub API operations retry with exponential backoff

  When a GitHub API operation fails (network error, rate limit, transient error),
  the operation is queued for retry with exponential backoff. Up to 5 retries
  occur before the operation is considered permanently failed.

  Scenario: Failed API operation is queued for retry
    Given a GitHub API operation fails with a network error
    When the operation completes
    Then the operation is added to the retry queue
    And the failure is logged

  Scenario: Retry queue attempts up to 5 retries with exponential backoff
    Given an operation in the retry queue with attempt count 0
    When the retry is attempted after the first backoff interval
    Then the operation is retried
    And attempt count is incremented to 1

  Scenario: Exponential backoff uses increasing delays between retries
    Given an operation queued for retry with attempt 0
    When the first retry executes
    Then the delay before retry 1 is approximately 2^1 seconds
    And a subsequent retry at attempt 2 has delay approximately 2^2 seconds

  Scenario: Operation succeeds on retry
    Given an operation failed on first attempt but succeeds on retry 2
    When the retry completes successfully
    Then the operation is removed from the retry queue
    And success is logged

  Scenario: Operation marked permanently failed after 5 retries
    Given an operation has been retried 5 times unsuccessfully
    When the next tick considers the queue
    Then the operation is removed from the retry queue
    And marked as permanently failed
    And an alert is logged

  Scenario: Retry queue preserves operation context across attempts
    Given an operation to create a GitHub issue is queued for retry
    And the operation context includes the issue title and body
    When the operation is retried
    Then the same title and body are used for the next attempt
```

### Feature: reconciliation-loop

Covers user stories [5, 8].

```gherkin
@github-sync-again
Feature: Watch loop reconciliation drains retry queue each tick

  On each watch loop tick, a reconciliation pass runs that drains the retry
  queue, re-attempting failed GitHub API operations without waiting for a
  phase transition.

  Scenario: Reconciliation pass runs on every watch loop tick
    Given the watch loop is active and ticking
    And there are pending operations in the retry queue
    When a watch loop tick executes
    Then a reconciliation pass begins
    And all operations in the retry queue are considered for retry

  Scenario: Failed operation is retried during reconciliation
    Given an operation failed earlier and was queued for retry
    And the backoff interval has elapsed
    When the reconciliation pass runs
    Then the operation is retried
    And the result (success or failure) is recorded

  Scenario: Successfully retried operations enrich stubs
    Given a feature issue was created as a minimal stub without a body
    And the feature issue body enrichment was queued for retry after an API failure
    When the reconciliation pass retries enrichment and succeeds
    Then the feature issue body is updated with description and user story
    And the issue is no longer a stub

  Scenario: Reconciliation prevents stale stubs from persisting
    Given feature issues were created pre-dispatch as minimal stubs
    And enrichment was queued but failed during the initial phase
    When multiple watch loop ticks pass
    Then reconciliation on each tick retries enrichment
    And issues are not left empty indefinitely
```

```gherkin
@github-sync-again
Feature: Sync-refs bootstrap from epic store when empty

  The sync-refs state tracks which GitHub issues are synchronized. When
  sync-refs is empty, a bootstrap pass reads all epics from the store and
  populates sync-refs entries in a state that triggers full reconciliation,
  bringing broken issue bodies up to the current PRD.

  Scenario: Bootstrap populates sync-refs from epic store on startup
    Given sync-refs is empty
    And the epic store contains three epics with GitHub issue numbers
    When the sync engine initializes
    Then sync-refs is populated with one entry per epic
    And each entry is marked for full reconciliation

  Scenario: Bootstrap entry triggers enrichment for broken issues
    Given sync-refs is bootstrapped with an epic that has an old GitHub issue
    And the issue body contains no PRD content
    When the reconciliation pass runs
    Then the issue body is enriched with the current PRD sections
    And the issue is no longer broken

  Scenario: Bootstrapped entries do not duplicate if sync-refs is already populated
    Given sync-refs already contains three epics
    When the sync engine checks for bootstrap
    Then no duplicate entries are added
    And existing entries are preserved

  Scenario: Bootstrap marks all entries for the same reconciliation pass
    Given sync-refs is bootstrapped with five epics
    When the reconciliation pass executes
    Then all five epics are processed in the same pass
    And the enrichment is consistent across all issues

  Scenario: Bootstrap detects and skips epics without GitHub issue numbers
    Given the epic store contains an epic with no issue_number in its manifest
    When the bootstrap pass runs
    Then the epic is skipped without error
    And only epics with valid issue numbers are added to sync-refs
```

## Modified Scenarios

### existing: github-enrichment/feature-body-content.feature

The existing "Feature issue body displays description and user story" feature needs expansion to include acceptance criteria content mapping, as specified in user story 2 ("plan content").

**Original file path:** `cli/features/github-enrichment/feature-body-content.feature`

**Changes:** Add a new scenario to verify that acceptance criteria from the plan artifact are included in the feature issue body.

**Updated feature file:**

```gherkin
@github-issue-enrichment
Feature: Feature issue body displays description and user story

  A feature's GitHub issue body contains its description and associated
  user story, extracted from the plan artifact. Each feature issue also
  references its parent epic.

  Scenario: Feature issue body contains description and user story
    Given a feature has been defined in the plan phase
    And the plan artifact includes a description and user story for the feature
    When the feature issue body is enriched
    Then the body contains the feature description
    And the body contains the user story

  Scenario: Feature issue body references parent epic
    Given a feature belongs to an epic with a GitHub issue
    When the feature issue body is enriched
    Then the body contains a reference to the parent epic issue

  Scenario: Feature issue body omits implementation task list
    Given a feature has been defined in the plan phase
    When the feature issue body is enriched
    Then the body does not contain an implementation task list

  Scenario: Feature issue body includes acceptance criteria
    Given a feature has been defined in the plan phase
    And the plan artifact includes acceptance criteria for the feature
    When the feature issue body is enriched
    Then the body contains the "what to build" section
    And the body contains the acceptance criteria
```

## Deleted Scenarios

None. All existing scenarios remain valid. The new scenarios add coverage for retry queue, reconciliation loop, and bootstrap behaviors that did not have prior test artifacts.

---

**Artifact Status:** Integration test plan complete for github-sync-again epic.

**Coverage Summary:**
- field-mapping-fix: 5 new scenario groups (phase label, feature title format, artifact link URLs)
- retry-queue: 1 new scenario group (6 scenarios)
- reconciliation-loop: 2 new scenario groups (4 + 5 scenarios)
- Modified: 1 existing scenario group expanded with acceptance criteria coverage

Total: 16 new scenario groups, 1 modified scenario group.
