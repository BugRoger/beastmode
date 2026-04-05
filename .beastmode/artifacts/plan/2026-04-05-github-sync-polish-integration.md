# Integration Test Artifact: github-sync-polish

Epic: **github-sync-polish**
Date: 2026-04-05

---

## New Scenarios

### Feature: body-enrichment

Covers user stories [1, 3].

User stories 2 and 4 are handled by modifications to existing scenarios (see Modified Scenarios below).

```gherkin
@github-sync-polish
Feature: Issue titles use human-readable names

  Epic issue titles display the human-readable epic name instead of
  internal hex slugs. Feature issue titles are prefixed with the epic
  name for cross-issue scannability.

  Scenario: Epic issue title uses the human-readable epic name
    Given an epic with slug "a1b2c3" and name "logging-cleanup"
    When the epic issue is created or updated
    Then the issue title contains "logging-cleanup"
    And the issue title does not contain the hex slug

  Scenario: Epic issue title updates when epic name changes
    Given an epic issue exists with the slug as its title
    When the enrichment pipeline runs after the design phase
    Then the issue title is updated to the human-readable epic name

  Scenario: Feature issue title is prefixed with the epic name
    Given an epic named "logging-cleanup" with a feature named "core-logger"
    When the feature issue is created or updated
    Then the issue title is "logging-cleanup: core-logger"

  Scenario: Feature issue title prefix updates when epic name changes
    Given a feature issue exists with an outdated epic name prefix
    When the enrichment pipeline runs
    Then the feature issue title reflects the current epic name
```

### Feature: git-push

Covers user stories [5, 6].

```gherkin
@github-sync-polish
Feature: Branches and tags pushed upstream after checkpoints

  Feature branches and impl branches are pushed to the remote after
  each phase checkpoint. Phase tags and archive tags are also pushed
  so that artifact permalinks and compare URLs resolve on GitHub.

  Background:
    Given a remote repository is configured

  Scenario: Feature branch pushed after design phase checkpoint
    Given an epic has completed the design phase with local commits
    When the phase checkpoint completes
    Then the feature branch is pushed to the remote

  Scenario: Impl branch pushed after implement phase checkpoint
    Given a feature has an impl branch with local commits
    When the implement phase checkpoint completes
    Then the impl branch is pushed to the remote

  Scenario: Feature branch pushed after each successive phase
    Given an epic has already pushed the feature branch after design
    When the plan phase checkpoint completes
    Then the feature branch is pushed to the remote with the new commits

  Scenario: Phase tags pushed after checkpoint
    Given a phase checkpoint creates a local phase tag
    When the checkpoint push operation runs
    Then the phase tag is available on the remote

  Scenario: Archive tags pushed during release
    Given a release operation creates a local archive tag
    When the release push operation runs
    Then the archive tag is available on the remote

  Scenario: Push failure does not block the phase checkpoint
    Given the remote is temporarily unreachable
    When a phase checkpoint completes
    Then the checkpoint succeeds locally
    And the push failure is logged as a warning
```

### Feature: branch-linking

Covers user stories [8].

```gherkin
@github-sync-polish
Feature: Branches linked to issues via GitHub Development sidebar

  Feature branches are linked to their epic issue and impl branches
  are linked to their feature issue through the GitHub API. This makes
  associated branches visible in the Development sidebar of each issue.

  Scenario: Feature branch linked to epic issue
    Given an epic has a GitHub issue and a feature branch
    When the branch linking operation runs
    Then the feature branch appears in the epic issue's Development sidebar

  Scenario: Impl branch linked to feature issue
    Given a feature has a GitHub issue and an impl branch
    When the branch linking operation runs
    Then the impl branch appears in the feature issue's Development sidebar

  Scenario: Branch linking is idempotent
    Given a feature branch is already linked to its epic issue
    When the branch linking operation runs again
    Then no duplicate link is created
    And the existing link is preserved

  Scenario: Branch linking skips issues without a known issue number
    Given an epic has no GitHub issue number in its manifest
    When the branch linking operation runs
    Then the epic is skipped without error
```

---

## Modified Scenarios

### 1. Epic issue body — expanded PRD sections

**File:** `cli/features/github-enrichment/epic-body-content.feature`
**Scenario:** "Epic issue body contains all PRD sections after design phase" (line 8)

**What changed:** User story 2 specifies the body must contain "implementation decisions, testing decisions, out of scope" in addition to the existing sections (problem statement, solution, user stories, decisions). The current scenario only checks four sections. The updated scenario covers all six.

```gherkin
@github-sync-polish
Feature: Epic issue body displays full PRD content

  An epic's GitHub issue body contains the complete PRD extracted from the
  design artifact: problem statement, solution, user stories, implementation
  decisions, testing decisions, and out of scope. Observers understand the
  epic without leaving GitHub.

  Scenario: Epic issue body contains all PRD sections after design phase
    Given an epic has completed the design phase
    And the design artifact contains a problem statement, solution, user stories, implementation decisions, testing decisions, and out of scope
    When the epic issue body is enriched
    Then the body contains the problem statement section
    And the body contains the solution section
    And the body contains the user stories section
    And the body contains the implementation decisions section
    And the body contains the testing decisions section
    And the body contains the out of scope section

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
    Then the body contains the epic name as the title
    And the body does not contain PRD sections
```

**Additional note:** The final scenario (line 34-38 in original) referenced "the epic slug as the title" — this is updated to "the epic name" to align with user story 1 (human-readable names instead of slugs).

---

### 2. Feature issue body — expanded plan sections

**File:** `cli/features/github-enrichment/feature-body-content.feature`
**Scenario:** "Feature issue body contains description and user story" (line 8)

**What changed:** User story 4 specifies the body must contain "description, user stories, what to build, acceptance criteria." The current scenario only checks description and user story. The updated scenario covers all four plan sections.

```gherkin
@github-sync-polish
Feature: Feature issue body displays full plan content

  A feature's GitHub issue body contains its full plan content: description,
  user stories, what to build, and acceptance criteria. Each feature issue
  also references its parent epic.

  Scenario: Feature issue body contains full plan sections
    Given a feature has been defined in the plan phase
    And the plan artifact includes a description, user stories, what to build, and acceptance criteria
    When the feature issue body is enriched
    Then the body contains the feature description
    And the body contains the user stories
    And the body contains the what to build section
    And the body contains the acceptance criteria

  Scenario: Feature issue body references parent epic
    Given a feature belongs to an epic with a GitHub issue
    When the feature issue body is enriched
    Then the body contains a reference to the parent epic issue

  Scenario: Feature issue body omits implementation task list
    Given a feature has been defined in the plan phase
    When the feature issue body is enriched
    Then the body does not contain an implementation task list
```

---

### 3. Backfill — expanded scope

**File:** `cli/features/github-enrichment/backfill.feature`
**Scenarios:** All five existing scenarios (lines 9-36)

**What changed:** User story 9 expands backfill scope beyond body enrichment. The backfill script must also: fix titles (human-readable names), push branches and tags, amend commits with issue references, and link branches. The existing scenarios only cover body enrichment. The updated feature adds scenarios for each new backfill responsibility.

```gherkin
@github-sync-polish
Feature: Backfill reconciles all existing epics to current standards

  A one-time backfill operation iterates all existing epics and reconciles
  them: fixing titles to human-readable names, filling issue bodies with
  enriched content, pushing branches and tags, amending commits with issue
  references, and linking branches to issues.

  Scenario: Backfill updates epic issue titles to human-readable names
    Given an existing epic has a GitHub issue titled with a hex slug
    And the epic has a human-readable name in its manifest
    When the backfill operation runs
    Then the epic issue title is updated to the human-readable name

  Scenario: Backfill updates feature issue titles with epic name prefix
    Given an existing feature has a GitHub issue without an epic name prefix
    When the backfill operation runs
    Then the feature issue title is updated with the epic name prefix

  Scenario: Backfill enriches a bare epic issue with PRD content
    Given an existing epic has a bare GitHub issue with no PRD content
    And the epic has a design artifact with PRD sections
    When the backfill operation runs
    Then the epic issue body is updated with the full PRD content

  Scenario: Backfill enriches feature issues with full plan content
    Given an existing epic has feature issues with empty bodies
    And the epic has a plan artifact with feature descriptions
    When the backfill operation runs
    Then each feature issue body is updated with its full plan content

  Scenario: Backfill pushes unpushed feature branches
    Given an existing epic has a local feature branch not yet pushed
    When the backfill operation runs
    Then the feature branch is pushed to the remote

  Scenario: Backfill pushes unpushed tags
    Given an existing epic has local phase tags and archive tags not yet pushed
    When the backfill operation runs
    Then all phase tags and archive tags are pushed to the remote

  Scenario: Backfill amends commits with issue references
    Given an existing epic has commits without issue references
    And the epic has a known issue number
    When the backfill operation runs
    Then the commit messages are amended to include the issue reference

  Scenario: Backfill links branches to issues
    Given an existing epic has a feature branch not linked to its issue
    When the backfill operation runs
    Then the feature branch is linked to the epic issue via the GitHub API

  Scenario: Backfill skips epics without GitHub issues
    Given an existing epic has no GitHub issue number in its manifest
    When the backfill operation runs
    Then the epic is skipped without error

  Scenario: Backfill is idempotent on already-reconciled epics
    Given an existing epic has already been fully reconciled
    When the backfill operation runs
    Then the epic's issues, branches, tags, and commits remain unchanged
    And no duplicate operations are performed

  Scenario: Backfill processes released epics with archive tag URLs
    Given an existing released epic has a bare GitHub issue
    And the epic has an archive tag and version tag
    When the backfill operation runs
    Then the epic issue body uses the archive tag compare URL
```

---

## Deleted Scenarios

### 1. Pre-dispatch stub uses slug as title

**File:** `cli/features/github-enrichment/early-issue-creation.feature`
**Scenario:** "Pre-dispatch issue is a minimal stub" (line 23)

**Reason:** This scenario states "the issue is created with the slug as its title." User story 1 explicitly requires human-readable epic names instead of hex slugs. The behavioral intent of the stub scenario conflicts with the new title convention. The pre-dispatch stub should use the human-readable name when available, making this scenario's assertion obsolete.

**Note:** If the pre-dispatch creation must retain a stub title because the human-readable name is not yet known at that point, this scenario should be *modified* rather than deleted, to clarify the stub-to-enriched title lifecycle. This is flagged as a concern below.

---

*No other existing scenarios require deletion.*
