# Integration Test Artifact: github-issue-enrichment

Epic: **github-issue-enrichment**
Date: 2026-04-04

## Coverage Analysis

13 existing `.feature` files discovered in `cli/features/`. None cover GitHub issue body content, commit message formatting, compare URL generation, issue creation timing, or backfill behavior. All 7 user stories produce new scenarios. No modifications or deletions required.

---

## New Scenarios

### Feature 1: Epic Issue Body Content (User Story 1)

```gherkin
@github-issue-enrichment
Feature: Epic issue body displays PRD summary

  An epic's GitHub issue body contains the PRD summary extracted from the
  design artifact: problem statement, solution, user stories, and decisions.
  Observers can understand the epic without leaving GitHub.

  Scenario: Epic issue body contains all PRD sections after design phase
    Given an epic has completed the design phase
    And the design artifact contains a problem statement, solution, user stories, and decisions
    When the epic issue body is rendered
    Then the body contains the problem statement section
    And the body contains the solution section
    And the body contains the user stories section
    And the body contains the decisions section

  Scenario: Epic issue body shows phase badge
    Given an epic is at the plan phase
    When the epic issue body is rendered
    Then the body contains a phase badge indicating the current phase

  Scenario: Epic issue body includes feature checklist after plan phase
    Given an epic has completed the plan phase with three features
    When the epic issue body is rendered
    Then the body contains a checklist with three feature entries

  Scenario: Epic issue body updates when phase advances
    Given an epic is at the design phase
    And the epic issue body has been rendered
    When the epic advances to the plan phase
    And the epic issue body is re-rendered
    Then the phase badge reflects the new phase
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
    When the feature issue body is rendered
    Then the body contains the feature description
    And the body contains the user story

  Scenario: Feature issue body references parent epic
    Given a feature belongs to an epic with a GitHub issue
    When the feature issue body is rendered
    Then the body contains a reference to the parent epic issue

  Scenario: Feature issue body omits task list
    Given a feature has been defined in the plan phase
    When the feature issue body is rendered
    Then the body does not contain a task list
```

### Feature 3: Commit Issue References (User Story 3)

```gherkin
@github-issue-enrichment
Feature: Commits reference epic or feature issue numbers

  Commits include issue number references so GitHub auto-links them
  in the issue timeline. Phase checkpoint commits reference the epic
  issue. Implementation task commits reference the feature issue.
  Release squash-merge commits reference the epic issue.

  Scenario Outline: Commit message includes issue reference
    Given an epic with issue number <epic_issue>
    And a commit of type "<commit_type>"
    When the commit message is finalized
    Then the commit subject line ends with "(#<issue_ref>)"

    Examples:
      | commit_type       | epic_issue | issue_ref |
      | phase checkpoint  | 42         | 42        |
      | release merge     | 42         | 42        |

  Scenario: Implementation commit references feature issue number
    Given an epic with a feature that has issue number 57
    And an implementation commit for that feature
    When the commit message is finalized
    Then the commit subject line ends with "(#57)"

  Scenario: Commit without a known issue number is left unchanged
    Given an epic without a GitHub issue number
    And a phase checkpoint commit
    When the commit message is finalized
    Then the commit subject line has no issue reference appended
```

### Feature 4: Compare URL in Epic Body (User Story 4)

```gherkin
@github-issue-enrichment
Feature: Epic issue body contains compare URL for full diff

  The epic issue body includes a compare URL pointing to the diff
  between main and the feature branch, allowing one-click access
  to the full set of code changes.

  Scenario: Active epic body contains compare URL against main branch
    Given an epic is in active development on a feature branch
    When the epic issue body is rendered
    Then the body contains a compare URL from the main branch to the feature branch

  Scenario: Compare URL is a clickable link in the git metadata section
    Given an epic is in active development
    When the epic issue body is rendered
    Then the compare URL appears in the git metadata section of the body
```

### Feature 5: Compare URL Switches to Archive Tag After Release (User Story 5)

```gherkin
@github-issue-enrichment
Feature: Compare URL switches to archive tag range after release

  When an epic is released, the feature branch is deleted. The compare
  URL switches from a branch-based range to an archive-tag-based range
  so the diff link continues to work for closed epics.

  Scenario: Released epic body uses archive tag range for compare URL
    Given an epic has been released with a version tag
    And an archive tag exists for the feature branch
    When the epic issue body is rendered
    Then the compare URL uses the version tag as the base
    And the compare URL uses the archive tag as the head

  Scenario: Compare URL works after feature branch deletion
    Given an epic has been released and its feature branch deleted
    When a user follows the compare URL in the epic issue body
    Then the URL resolves to the archived diff range
```

### Feature 6: Early Issue Creation (User Story 6)

```gherkin
@github-issue-enrichment
Feature: GitHub issues created pre-dispatch for commit reference availability

  GitHub issues are created before the phase dispatch runs, not after
  checkpoint. This ensures issue numbers are available from the very
  first commit of a phase.

  Scenario: Epic issue exists before design phase dispatch begins
    Given a new epic is starting the design phase
    When the pipeline prepares for dispatch
    Then a GitHub issue is created for the epic before the skill runs
    And the issue number is recorded in the manifest

  Scenario: Feature issues exist before implement phase dispatch begins
    Given an epic has completed planning with two features
    When the pipeline prepares for the implement phase
    Then GitHub issues are created for each feature before any skill runs
    And each feature's issue number is recorded in the manifest

  Scenario: Issue created pre-dispatch is a minimal stub
    Given a new epic is starting the design phase
    When the pre-dispatch issue creation runs
    Then the issue is created with the slug as its title
    And the issue body is minimal pending enrichment

  Scenario: Pre-dispatch issue creation is idempotent
    Given an epic already has a GitHub issue number in its manifest
    When the pipeline prepares for dispatch again
    Then no duplicate issue is created
    And the existing issue number is preserved
```

### Feature 7: Backfill Existing Bare Issues (User Story 7)

```gherkin
@github-issue-enrichment
Feature: Existing bare issues backfilled with enriched content

  A backfill operation iterates all existing epics that have GitHub
  issues and re-syncs their issue bodies through the enrichment
  pipeline. This brings the entire issue history up to the enriched
  format.

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
```

---

## Modified Scenarios

None. The existing 13 feature files cover pipeline mechanics, HITL hooks, file permissions, cancellation, dashboard wiring, slug renaming, wave ordering, and regression loops. None of these address GitHub issue content, commit references, or issue creation timing.

## Deleted Scenarios

None. No existing scenario is made obsolete by the github-issue-enrichment epic. The enrichment behaviors are additive and orthogonal to the existing test suite.
