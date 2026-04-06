# Integration Artifact: fix-worktree-paths

Epic: **fix-worktree-paths**
Date: 2026-04-06

---

## New Scenarios

### Feature: artifact-path-normalization

Covers user stories [1, 2, 4].

```gherkin
@fix-worktree-paths
Feature: Artifact path normalization resolves stale worktree paths

  Artifact paths stored in the epic entity may be absolute worktree
  paths, bare filenames, or repo-relative paths. The sync read path
  must resolve all three formats to the correct file on disk and
  produce clean content in GitHub issue bodies.

  Background:
    Given a project with a design artifact containing PRD sections
    And a plan artifact containing feature plan sections

  # --- Epic body enrichment with path normalization (US1, US4) ---

  Scenario: Epic body contains full PRD when design path is an absolute worktree path
    Given an epic stores a design artifact path as an absolute worktree path
    When the epic issue body is enriched
    Then the body contains the problem statement section
    And the body contains the solution section
    And the body contains the user stories section
    And the body contains the decisions section
    And the body contains the testing decisions section
    And the body contains the out of scope section

  Scenario: Epic body contains full PRD when design path is a bare filename
    Given an epic stores a design artifact path as a bare filename
    When the epic issue body is enriched
    Then the body contains the problem statement section
    And the body contains the solution section
    And the body contains the user stories section
    And the body contains the decisions section

  Scenario: Epic body contains full PRD when design path is repo-relative
    Given an epic stores a design artifact path as a repo-relative path
    When the epic issue body is enriched
    Then the body contains the problem statement section
    And the body contains the solution section

  Scenario Outline: PRD reader resolves any stored path format to the correct file
    Given an epic stores a design artifact path in "<format>" format
    When the PRD sections are read
    Then all six PRD sections are extracted successfully

    Examples:
      | format                |
      | absolute worktree     |
      | repo-relative         |
      | bare filename         |

  # --- Feature body enrichment with path normalization (US2) ---

  Scenario: Feature body contains plan sections when plan path is a bare filename
    Given a feature stores a plan artifact path as a bare filename
    When the feature issue body is enriched
    Then the body contains the user story section
    And the body contains the what to build section
    And the body contains the acceptance criteria section

  Scenario: Feature body contains plan sections when plan path is repo-relative
    Given a feature stores a plan artifact path as a repo-relative path
    When the feature issue body is enriched
    Then the body contains the user story section
    And the body contains the what to build section

  # --- Artifact links table display (US4) ---

  Scenario: Artifact table shows clean repo-relative paths from absolute inputs
    Given an epic has artifact paths stored as absolute worktree paths
    When the artifact links table is built for the epic body
    Then each artifact row displays a repo-relative path starting with ".beastmode/artifacts/"
    And no artifact row contains the worktree directory prefix

  Scenario: Artifact table shows clean paths from bare filename inputs
    Given an epic has artifact paths stored as bare filenames
    When the artifact links table is built for the epic body
    Then each artifact row displays a repo-relative path starting with ".beastmode/artifacts/"

  Scenario Outline: Artifact table normalizes paths for each phase type
    Given an epic has a "<phase>" artifact stored as an absolute worktree path
    When the artifact links table is built
    Then the "<phase>" row displays the path as ".beastmode/artifacts/<phase>/<filename>"

    Examples:
      | phase    |
      | design   |
      | validate |
      | release  |

  # --- Epic body does not leak worktree paths (US4) ---

  Scenario: Epic body never contains absolute filesystem paths
    Given an epic has artifacts stored as absolute worktree paths
    When the complete epic issue body is rendered
    Then the body does not contain any absolute filesystem path
```

### Feature: output-path-sanitization

Covers user stories [1, 2, 4] from the write side.

```gherkin
@fix-worktree-paths
Feature: Build output stores bare filenames for artifact paths

  The buildOutput function produces the output record consumed by
  the store. Artifact path fields must contain bare filenames (no
  directory prefix, no absolute path) so downstream readers can
  resolve them against the known artifact directory.

  Scenario: Design phase output stores bare filename for artifact path
    Given a design artifact at an absolute filesystem path
    When buildOutput processes the design artifact
    Then the output design artifact field is a bare filename
    And the output design artifact field does not contain a directory separator

  Scenario: Validate phase output stores bare filename for report path
    Given a validate artifact at an absolute filesystem path
    When buildOutput processes the validate artifact
    Then the output report field is a bare filename
    And the output report field does not contain a directory separator

  Scenario: Release phase output stores bare filename for changelog path
    Given a release artifact at an absolute filesystem path
    When buildOutput processes the release artifact
    Then the output changelog field is a bare filename
    And the output changelog field does not contain a directory separator

  Scenario Outline: buildOutput strips directory prefix for <phase> phase
    Given a "<phase>" artifact at path "/worktree/.beastmode/artifacts/<phase>/2026-04-06-test.md"
    When buildOutput processes the artifact
    Then the stored path is "2026-04-06-test.md"

    Examples:
      | phase    |
      | design   |
      | validate |
      | release  |

  Scenario: buildOutput preserves bare filename input unchanged
    Given a design artifact passed as bare filename "2026-04-06-epic.md"
    When buildOutput processes the design artifact
    Then the output design artifact field is "2026-04-06-epic.md"

  Scenario: Plan phase scan already stores bare filenames
    Given plan artifacts exist for an epic with two features
    When the plan features are scanned
    Then each feature plan field is a bare filename
```

### Feature: sync-debug-logging

Covers user story [5].

```gherkin
@fix-worktree-paths
Feature: GitHub sync path emits structured debug logs

  The GitHub sync path logs path resolution steps, file read
  outcomes, and errors with structured data context. Developers
  can diagnose path resolution failures from log output alone.

  Scenario: Sync logs the stored path and resolved path during PRD read
    Given the sync operation has a logger configured
    And an epic has a design artifact path stored
    When the sync reads the PRD sections
    Then the logger receives a debug entry with the stored artifact path
    And the logger receives a debug entry with the resolved absolute path

  Scenario: Sync logs a warning when the design artifact file is missing
    Given the sync operation has a logger configured
    And an epic has a design artifact path that points to a nonexistent file
    When the sync attempts to read the PRD sections
    Then the logger receives a warning entry indicating the file was not found
    And the warning entry includes the resolved path in its structured data

  Scenario: Sync logs a warning when the feature plan file is missing
    Given the sync operation has a logger configured
    And a feature has a plan path that points to a nonexistent file
    When the sync attempts to read the feature plan
    Then the logger receives a warning entry indicating the plan file was not found

  Scenario: Sync logs section extraction results for PRD
    Given the sync operation has a logger configured
    And an epic has a valid design artifact
    When the sync reads the PRD sections
    Then the logger receives a debug entry listing which sections were extracted

  Scenario: Sync logs path context with structured data fields
    Given the sync operation has a logger configured
    When the sync processes an epic with artifacts
    Then each path-related log entry includes structured data with a "path" field
```

---

## Modified Scenarios

### File: `cli/features/github-enrichment/epic-body-content.feature`

**Scenario: "Epic issue body contains all PRD sections after design phase"** (line 8)

**What changed:** The existing scenario lists four PRD sections (problem, solution, user stories, decisions). The current PRD specifies six sections: the original four plus "Testing Decisions" and "Out of Scope". The scenario should be updated to assert all six sections.

**Updated Gherkin:**

```gherkin
@github-issue-enrichment
Feature: Epic issue body displays PRD summary

  An epic's GitHub issue body contains the PRD summary extracted from the
  design artifact: problem statement, solution, user stories, locked
  decisions, testing decisions, and out of scope. Observers understand
  the epic without leaving GitHub.

  Scenario: Epic issue body contains all PRD sections after design phase
    Given an epic has completed the design phase
    And the design artifact contains a problem statement, solution, user stories, decisions, testing decisions, and out of scope
    When the epic issue body is enriched
    Then the body contains the problem statement section
    And the body contains the solution section
    And the body contains the user stories section
    And the body contains the decisions section
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
    Then the body contains the epic slug as the title
    And the body does not contain PRD sections
```

---

## Deleted Scenarios

No existing scenarios need to be deleted. All existing feature files remain valid; the modifications above extend rather than replace existing behavioral contracts.
