# Integration Test Artifact: github-issue-enrichment

Epic: **github-issue-enrichment**
Date: 2026-04-05

## Coverage Analysis

29 existing `.feature` files discovered across `cli/features/` and `cli/features/store/`. Coverage spans: pipeline lifecycle (happy path, error resilience, regression loop), dashboard UI (wiring, dispatch strategy, verbosity, event log), HITL hooks (lifecycle, file permissions config/hooks/logging), cancel flow, design slug rename, watch loop (happy path, wave failure), and structured task store (ready, blocked, tree, dependencies, hash IDs, JSON output, pluggable backend, typed artifacts, cross-epic deps, dual reference).

None of these address GitHub issue body content, commit message issue references, compare URL generation, issue creation timing, or backfill operations. All 7 user stories produce new scenarios. No modifications or deletions required.

---

## New Scenarios

### Feature 1: Epic Issue Body Content (User Story 1)

```gherkin
@github-issue-enrichment
Feature: Epic issue body displays PRD summary

  An epic's GitHub issue body contains the PRD summary extracted from the
  design artifact: problem statement, solution, user stories, and locked
  decisions. Observers understand the epic without leaving GitHub.

  Scenario: Epic issue body contains all PRD sections after design phase
    Given an epic has completed the design phase
    And the design artifact contains a problem statement, solution, user stories, and decisions
    When the epic issue body is enriched
    Then the body contains the problem statement section
    And the body contains the solution section
    And the body contains the user stories section
    And the body contains the decisions section

  Scenario: Epic issue body shows current phase badge
    Given an epic is at the plan phase
    When the epic issue body is enriched
    Then the body contains a phase badge indicating "plan"

  Scenario: Epic issue body includes feature checklist after plan phase
    Given an epic has completed the plan phase with three features
    When the epic issue body is enriched
    Then the body contains a checklist with three feature entries
    And each checklist entry shows the feature name

  Scenario: Epic issue body updates phase badge when phase advances
    Given an epic has been enriched at the design phase
    When the epic advances to the plan phase
    And the epic issue body is re-enriched
    Then the phase badge reflects "plan"

  Scenario: Epic issue body without a design artifact shows minimal content
    Given a new epic has no design artifact yet
    When the epic issue body is enriched
    Then the body contains the epic slug as the title
    And the body does not contain PRD sections
```

### Feature 2: Feature Issue Body Content (User Story 2)

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
```

### Feature 3: Commit Issue References (User Story 3)

```gherkin
@github-issue-enrichment
Feature: Commits reference epic or feature issue numbers

  Commits include issue number references so GitHub auto-links them
  in the issue timeline. Phase checkpoint commits reference the epic
  issue. Implementation task commits reference the feature issue.
  Release squash-merge commits reference the epic issue.

  Scenario Outline: Phase commit message includes epic issue reference
    Given an epic with issue number <epic_issue>
    And a commit of type "<commit_type>"
    When the commit message is formatted
    Then the commit subject line ends with "(#<epic_issue>)"

    Examples:
      | commit_type       | epic_issue |
      | design checkpoint | 42         |
      | plan checkpoint   | 42         |
      | release merge     | 42         |

  Scenario: Implementation commit references feature issue number
    Given an epic with a feature that has issue number 57
    And an implementation commit for that feature
    When the commit message is formatted
    Then the commit subject line ends with "(#57)"

  Scenario: Commit without a known issue number is left unchanged
    Given an epic without a GitHub issue number
    And a phase checkpoint commit
    When the commit message is formatted
    Then the commit subject line has no issue reference appended
```

### Feature 4: Compare URL in Epic Body (User Story 4)

```gherkin
@github-issue-enrichment
Feature: Epic issue body contains compare URL for full diff

  The epic issue body includes a compare URL pointing to the diff
  between the main branch and the feature branch, allowing one-click
  access to the full set of code changes.

  Scenario: Active epic body contains compare URL
    Given an epic is in active development on a feature branch
    When the epic issue body is enriched
    Then the body contains a compare URL from the main branch to the feature branch

  Scenario: Compare URL appears in the git metadata section
    Given an epic is in active development
    When the epic issue body is enriched
    Then the compare URL appears in the git metadata section of the body
    And the compare URL is a clickable markdown link
```

### Feature 5: Compare URL Archive Tag Range After Release (User Story 5)

```gherkin
@github-issue-enrichment
Feature: Compare URL switches to archive tag range after release

  When an epic is released, the feature branch is deleted. The compare
  URL switches from a branch-based range to an archive-tag-based range
  so the diff link continues to work for closed epics.

  Scenario: Released epic body uses archive tag range for compare URL
    Given an epic has been released with a version tag
    And an archive tag exists for the feature branch
    When the epic issue body is enriched after release
    Then the compare URL uses the version tag as the base
    And the compare URL uses the archive tag as the head

  Scenario: Compare URL works after feature branch deletion
    Given an epic has been released and its feature branch deleted
    When a user follows the compare URL in the epic issue body
    Then the URL resolves to a valid archived diff range

  Scenario: Epic without archive tag retains branch-based compare URL
    Given an epic has been released but no archive tag was created
    When the epic issue body is enriched after release
    Then the compare URL falls back to the branch-based range
```

### Feature 6: Early Issue Creation (User Story 6)

```gherkin
@github-issue-enrichment
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
    And the issue number is recorded in the manifest

  Scenario: Feature issues exist before implement phase dispatch begins
    Given an epic has completed planning with two features
    When the pipeline prepares for the implement phase
    Then GitHub issues are created for each feature before any skill runs
    And each feature's issue number is recorded in the manifest

  Scenario: Pre-dispatch issue is a minimal stub
    Given a new epic is starting the design phase
    When the pre-dispatch issue creation runs
    Then the issue is created with the slug as its title
    And the issue body is a minimal placeholder pending enrichment

  Scenario: Pre-dispatch issue creation is idempotent
    Given an epic already has a GitHub issue number in its manifest
    When the pipeline prepares for dispatch again
    Then no duplicate issue is created
    And the existing issue number is preserved

  Scenario: Feature issue creation does not run for non-implement phases
    Given an epic is at the validate phase with features that have issue numbers
    When the pipeline prepares for the validate phase dispatch
    Then no new feature issues are created
```

### Feature 7: Backfill Existing Bare Issues (User Story 7)

```gherkin
@github-issue-enrichment
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
    Given an existing epic has no GitHub issue number in its manifest
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

## Modified Scenarios

None. All 29 existing feature files cover behaviors orthogonal to GitHub issue enrichment (pipeline mechanics, dashboard UI, HITL hooks, file permissions, store operations, slug rename, watch loop, cancellation). No existing scenario needs modification.

## Deleted Scenarios

None. No existing scenario is made obsolete by the github-issue-enrichment epic. The enrichment behaviors are additive to the test suite.
