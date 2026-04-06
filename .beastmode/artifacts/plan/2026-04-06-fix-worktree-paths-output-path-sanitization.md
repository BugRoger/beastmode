---
phase: plan
slug: f6fa1a
epic: fix-worktree-paths
feature: output-path-sanitization
wave: 1
---

# Output Path Sanitization

**Design:** `.beastmode/artifacts/design/2026-04-06-f6fa1a.md`

## User Stories

1. As a project observer, I want epic issue bodies on GitHub to contain the full PRD, so that the entire design is readable without leaving GitHub. *(write-side prevention)*
2. As a project observer, I want feature issue bodies on GitHub to contain the full feature plan, so that each feature's scope is visible in GitHub. *(write-side prevention)*
3. As a project observer, I want the Artifacts table in epic bodies to show clean repo-relative paths instead of stale worktree paths, so that artifact links are meaningful. *(write-side prevention)*

## What to Build

The `buildOutput` function in the generate-output hook currently stores `artifactPath` as-is for the design, validate, and release phase cases. When invoked from a worktree, `artifactPath` is an absolute filesystem path that becomes stale after worktree rename or cleanup.

Apply `basename(artifactPath)` in three switch cases within `buildOutput`:
- **design case:** `artifacts.design` field — store `basename(artifactPath)` instead of `artifactPath`
- **validate case:** `artifacts.report` field — store `basename(artifactPath)` instead of `artifactPath`
- **release case:** `artifacts.changelog` field — store `basename(artifactPath)` instead of `artifactPath`

The plan case already stores bare filenames via `scanPlanFeatures` — no change needed there.

Add unit tests alongside the existing `generate-output.test.ts` test suite, verifying that `buildOutput` strips directory prefixes for all three affected phase cases and preserves bare filename inputs unchanged.

## Integration Test Scenarios

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

## Acceptance Criteria

- [ ] `buildOutput` design case stores a bare filename (no `/` characters)
- [ ] `buildOutput` validate case stores a bare filename for `report`
- [ ] `buildOutput` release case stores a bare filename for `changelog`
- [ ] Bare filename inputs pass through unchanged
- [ ] Existing `generate-output.test.ts` tests continue to pass
- [ ] New unit tests cover all three phase cases with absolute path input
