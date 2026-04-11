---
phase: plan
slug: ceceec
epic: slug-id-consistency
feature: env-frontmatter-contract
wave: 1
---

# Env & Frontmatter Contract

**Design:** `.beastmode/artifacts/design/2026-04-11-ceceec.md`

## User Stories

2. As a developer, I want every human-facing surface (filenames, branches, CLI input, dashboard) to use slugs, so that identifiers are readable and memorable.
3. As a developer, I want feature slugs to embed their parent epic name, so that I can identify which epic a feature belongs to from its slug alone.
6. As a developer, I want frontmatter to use `id:` + `epic:` (+ `feature:`) consistently across all phases, so that artifact-to-entity matching is unambiguous.
7. As a developer, I want env vars to be `BEASTMODE_ID` + `BEASTMODE_EPIC` + `BEASTMODE_FEATURE`, so that skills always know which identifier type they're working with.

## What to Build

### Environment Variable Contract

The hook settings module currently exports `BEASTMODE_SLUG` alongside `BEASTMODE_EPIC` and `BEASTMODE_FEATURE`. The contract must change:

- **Remove:** `BEASTMODE_SLUG`
- **Add:** `BEASTMODE_ID` (entity ID, e.g., `bm-a3f2` or `bm-a3f2.2`)
- **Keep:** `BEASTMODE_EPIC` (epic slug), `BEASTMODE_FEATURE` (feature slug)

The HITL settings module that builds the session-start hook command must be updated to include `BEASTMODE_ID` instead of `BEASTMODE_SLUG`. The interface for `WriteSessionStartHookOptions` and `buildSessionStartHook` must replace the `slug` field with an `id` field.

The session-start hook reader must be updated to read `BEASTMODE_ID` from the environment instead of `BEASTMODE_SLUG`. The error for a missing variable should reference `BEASTMODE_ID`.

### Frontmatter Contract

The generate-output module handles frontmatter parsing and matching. Currently it uses `fm.slug` as a fallback for `fm.epic` when matching artifacts to epics. The contract must change:

- **Frontmatter fields written by skills:** `id:` (entity ID) + `epic:` (epic slug) + optional `feature:` (feature slug). The `slug:` field is removed entirely.
- **Matching logic:** Match on `fm.id` (entity ID) or `fm.epic` (epic slug). Remove `fm.slug` fallback.
- **Output building:** The `buildOutput` function's design case currently reads `fm.epic ?? fm.slug` — replace with `fm.epic ?? fm.id`. Plan case similarly.

The `ArtifactFrontmatter` interface in the generate-output module must add `id?: string` and remove `slug?: string`.

### Artifact Filename Convention

Filenames already use `YYYY-MM-DD-{slug}.md` pattern derived from the worktree slug. This continues to work — the worktree slug IS the epic slug. The `slug:` comment in the `PhaseOutput` types interface should be updated to reference `id` instead of `slug`.

## Integration Test Scenarios

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

## Acceptance Criteria

- [ ] `BEASTMODE_SLUG` removed from all hook commands and env parsing
- [ ] `BEASTMODE_ID` set in session-start hook for all phases
- [ ] `BEASTMODE_EPIC` continues to carry the epic slug
- [ ] `BEASTMODE_FEATURE` continues to carry the feature slug (implement only)
- [ ] `ArtifactFrontmatter` has `id?: string`, no `slug?: string`
- [ ] `buildOutput` design case uses `fm.epic ?? fm.id` (not `fm.slug`)
- [ ] `scanPlanFeatures` matching uses `fm.epic` (not `fm.slug` fallback)
- [ ] Grep: zero matches for `BEASTMODE_SLUG` outside of tests
- [ ] Grep: zero matches for `fm.slug` in production code
