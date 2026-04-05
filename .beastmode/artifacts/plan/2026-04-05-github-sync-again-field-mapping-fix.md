---
phase: plan
slug: 00ddfb
epic: github-sync-again
feature: field-mapping-fix
wave: 1
---

# field-mapping-fix

**Design:** `.beastmode/artifacts/design/2026-04-05-00ddfb.md`

## User Stories

1. As a project owner, I want epic issue bodies to contain the full PRD (Problem, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope), so that GitHub issues serve as readable project documentation.
2. As a project owner, I want feature issue bodies to contain the plan content (description, user story, what to build, acceptance criteria), so that feature issues describe what needs to be built.
3. As a project owner, I want issue creation to succeed on the first attempt by using the correct phase label from the store's `status` field, so that issues are created without `phase/undefined` errors.
6. As a project owner, I want feature issue titles to use the `{epic}: {feature}` format consistently, so that features are identifiable in issue lists.
7. As a project owner, I want artifact link URLs to use repo-relative paths instead of absolute local filesystem paths, so that links are valid on GitHub.

## What to Build

The `syncGitHubForEpic` bridge function incorrectly maps store entity fields to the `EpicSyncInput` type. Three mismatches exist and must be fixed:

**Phase field mapping:** The bridge reads `epicEntity.phase` but the store `Epic` type has `status` (type `EpicStatus`). Map `epicEntity.status` to `EpicSyncInput.phase`.

**Artifacts map construction:** The bridge reads `epicEntity.artifacts` but the store `Epic` type has flat per-phase fields (`design`, `plan`, `implement`, `validate`, `release`). Build the `artifacts` record from these flat fields at the bridge layer. Each non-undefined flat field becomes an entry in the `Record<string, string[]>` with the phase name as key and the path wrapped in an array.

**PRD section reading:** `readPrdSections` resolves design artifact paths from `epic.artifacts?.["design"]`. Once the artifacts map is correctly built from flat fields, this function should work — but paths stored in the flat fields may be bare filenames or absolute filesystem paths. Add resolution logic: if the path is absolute, convert to repo-relative using `path.relative(projectRoot, absolutePath)`. If the path is a bare filename, search `.beastmode/artifacts/design/` for a match.

**Feature body enrichment:** The `FeatureSyncInput` type has optional fields for `userStory`, `whatToBuild`, and `acceptanceCriteria`. The bridge currently passes through `description` and `plan` from the store feature entity, but does not extract plan content. Read the feature's plan artifact at sync time to populate these fields. Parse the markdown plan artifact to extract "User Stories", "What to Build", and "Acceptance Criteria" sections.

**Feature title formatting:** Early-issues uses `feature.slug` as the issue title. Change to `{epicName}: {featureSlug}` format. The sync engine's enrichment pass should also update titles to this format during reconciliation.

**Artifact link normalization:** Any artifact path rendered into issue bodies must be repo-relative. Apply `path.relative(projectRoot, ...)` when the stored path is absolute. This affects both epic body artifact links and feature body plan links.

## Integration Test Scenarios

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

## Acceptance Criteria

- [ ] `syncGitHubForEpic` maps `epicEntity.status` to `EpicSyncInput.phase` — no `phase/undefined` errors
- [ ] `syncGitHubForEpic` builds `artifacts` record from flat store fields (`design`, `plan`, etc.)
- [ ] `readPrdSections` successfully reads PRD content from design artifact via the constructed artifacts map
- [ ] Epic issue bodies contain Problem, Solution, User Stories, Decisions, Testing Decisions, Out of Scope sections
- [ ] Feature issue bodies contain description, user story, what to build, and acceptance criteria from plan artifacts
- [ ] Feature issue titles use `{epicName}: {featureSlug}` format in both early-issues and enrichment
- [ ] All artifact link URLs in issue bodies are repo-relative, not absolute filesystem paths
- [ ] Existing unit tests pass; new tests cover the field mapping corrections
