---
phase: plan
slug: github-sync-polish
epic: github-sync-polish
feature: body-enrichment
wave: 1
---

# Body Enrichment

**Design:** `.beastmode/artifacts/design/2026-04-05-github-sync-polish.md`

## User Stories

1. As a project observer, I want epic issue titles to use the human-readable epic name (e.g., "github-issue-enrichment") instead of hex slugs, so that the issue list is scannable.
2. As a project observer, I want the epic issue body to contain the full PRD (problem statement, solution, user stories, implementation decisions, testing decisions, out of scope), so that the entire design is readable without leaving GitHub.
3. As a project observer, I want feature issue titles to be prefixed with the epic name (e.g., "logging-cleanup: core-logger"), so that features are identifiable in cross-issue views.
4. As a project observer, I want the feature issue body to contain the full feature plan (description, user stories, what to build, acceptance criteria), so that each feature's scope is visible in GitHub.

## What to Build

### Epic Title Enrichment

Update the sync engine's epic issue creation and update paths to set the title from `manifest.epic` (the human-readable name) instead of `manifest.slug`. The title format is simply the epic name — no slug suffix. Both the initial creation and subsequent updates must use this format.

### Feature Title Enrichment

Update the sync engine's feature issue creation and update paths to prefix feature titles with the parent epic name. Format: `{epic}: {feature}` (e.g., "logging-cleanup: core-logger"). Both the initial creation and subsequent updates must use this format.

### Epic Body — Full PRD Content

Expand `formatEpicBody()` to render the complete PRD from the design artifact. Sections to include (in order): Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope. Use the existing section extractor to read from design artifacts. The phase badge and feature checklist remain. Remove the Git section (Branch, Compare URL, Tags) entirely — these are redundant with native GitHub features now that branches and tags will be pushed upstream.

The `readPrdSections()` helper (or equivalent) needs to extract the additional sections (Testing Decisions, Out of Scope) that are currently not read.

### Feature Body — Full Plan Content

Expand `formatFeatureBody()` to render the complete feature plan from the plan artifact. Sections to include: description, User Stories, What to Build, Acceptance Criteria. Use the section extractor to read from plan artifacts. The epic back-reference (`**Epic:** #{epicNumber}`) is retained.

### Cross-Cutting

- Body hash tracking (`manifest.github.bodyHash`) must account for new sections — bodies will be longer, hashes will change, triggering updates on first sync after deployment.
- Both formatters are pure functions — no filesystem or API calls. Artifact content is passed in as input.

## Integration Test Scenarios

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

## Acceptance Criteria

- [ ] Epic issue titles display the human-readable `manifest.epic` name, not the hex slug
- [ ] Feature issue titles follow the `{epic}: {feature}` format
- [ ] Epic issue bodies contain all six PRD sections: Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope
- [ ] Epic issue bodies retain the phase badge and feature checklist
- [ ] Epic issue bodies no longer contain the Git section (Branch, Compare URL, Tags)
- [ ] Feature issue bodies contain four plan sections: description, User Stories, What to Build, Acceptance Criteria
- [ ] Feature issue bodies retain the epic back-reference
- [ ] Existing unit tests for `formatEpicBody()` and `formatFeatureBody()` updated and passing
- [ ] New unit tests for title formatting logic
