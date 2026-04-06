---
phase: plan
slug: f6fa1a
epic: fix-worktree-paths
feature: artifact-path-normalization
wave: 1
---

# Artifact Path Normalization

**Design:** `.beastmode/artifacts/design/2026-04-06-f6fa1a.md`

## User Stories

1. As a project observer, I want epic issue bodies on GitHub to contain the full PRD (Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope), so that the entire design is readable without leaving GitHub.
2. As a project observer, I want feature issue bodies on GitHub to contain the full feature plan (User Stories, What to Build, Acceptance Criteria), so that each feature's scope is visible in GitHub.
3. As a project observer, I want the Artifacts table in epic bodies to show clean repo-relative paths instead of stale worktree paths, so that artifact links are meaningful.

## What to Build

Three read-path fixes in the GitHub sync module, all following the same pattern: extract `basename()` from the stored path and prefix the known artifact directory.

### PRD Section Reader (`readPrdSections`)

Currently resolves the stored design path directly via `resolve(projectRoot, designPaths[0])`. When the stored path is an absolute worktree path, `resolve` returns it as-is and the file doesn't exist at that location.

Fix: extract `basename(designPaths[0])` and resolve against `join(projectRoot, ".beastmode", "artifacts", "design")`. The `basename()` call strips any directory prefix — works identically for absolute paths, repo-relative paths, and bare filenames.

### Feature Plan Reader (in `syncFeature` helper)

Currently resolves via `resolve(opts.projectRoot, feature.plan)`. When `feature.plan` is a bare filename (which it already is from `scanPlanFeatures`), `resolve` places it at the project root — missing the `artifacts/plan/` directory prefix.

Fix: extract `basename(feature.plan)` and resolve against `join(projectRoot, ".beastmode", "artifacts", "plan")`.

### Artifact Links Table (`buildArtifactsMap`)

Currently normalizes absolute paths via `relative(projectRoot, rawPath)`. When the absolute path points to a renamed/deleted worktree, the `relative` call produces a `../../.claude/worktrees/...` traversal path.

Fix: for each phase entry, apply `basename(rawPath)` and prefix with `.beastmode/artifacts/{phase}/` to produce a clean display path. Each phase has exactly one known artifact directory.

Add unit tests alongside the existing `body-format.test.ts` test suite covering all three path formats (absolute, repo-relative, bare filename) for each fix.

## Integration Test Scenarios

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

## Acceptance Criteria

- [ ] `readPrdSections` resolves absolute worktree paths to the correct design artifact file
- [ ] `readPrdSections` resolves bare filenames to the correct design artifact file
- [ ] Feature plan reader resolves bare filenames with `.beastmode/artifacts/plan/` prefix
- [ ] `buildArtifactsMap` produces `.beastmode/artifacts/{phase}/filename.md` display paths from absolute inputs
- [ ] `buildArtifactsMap` produces clean display paths from bare filename inputs
- [ ] No absolute filesystem paths appear in rendered epic issue bodies
- [ ] Existing `body-format.test.ts` tests continue to pass
- [ ] New unit tests cover all three path formats for readPrdSections, feature plan reader, and buildArtifactsMap
