---
phase: plan
slug: dashboard-extensions
epic: dashboard-extensions
feature: details-panel
wave: 2
---

# Details Panel

**Design:** `.beastmode/artifacts/design/2026-04-05-dashboard-extensions.md`

## User Stories

10. As a user, I want the Overview panel renamed to "Details" and showing context-sensitive content: overview info when "(all)" is selected, the PRD artifact when an epic is selected, and the plan artifact when a feature is selected — all scrollable via PgUp/PgDn, so that I can read artifacts in context.

## What to Build

**Component rename:** Rename `OverviewPanel` to `DetailsPanel` (both the component file and its references). The panel title in `ThreePanelLayout` changes from `"OVERVIEW"` to `"DETAILS"`.

**Context-sensitive content model:** The panel content is determined by the current selection state:

1. **"(all)" selected** — Display the existing overview content: phase distribution, active sessions, git status. Reuse the existing `computePhaseDistribution()`, `formatGitStatus()`, and `formatActiveSessions()` helper functions from `overview-panel.ts`.

2. **Epic selected** — Read the PRD artifact using `resolveArtifactPath(projectRoot, "design", epicSlug)`. Read the file content and display it as raw markdown text (no rich rendering per design's out-of-scope). If the artifact doesn't exist, show a "no PRD found" placeholder.

3. **Feature selected** — Read the plan artifact using `resolveArtifactPath(projectRoot, "plan", epicSlug)`. Find the feature's section within the plan artifact (match by feature slug in the filename pattern `*-<epic>-<feature>.md`). Display the feature plan as raw markdown text. If not found, show a "no plan found" placeholder.

**Scroll support:** The panel content is scrollable via PgUp/PgDn. The scroll offset comes from the keyboard hook's `detailsScrollOffset` state. The panel renders a window of content lines starting at the scroll offset, clamped to the available content height. Scroll offset resets to 0 when the selection changes (new content loaded).

**Props interface:** The component accepts: selection state (all/epic/feature), project root path, enriched epics (for overview mode), active sessions count, git status, and scroll offset. It determines which content to show and renders accordingly.

## Integration Test Scenarios

```gherkin
@dashboard-extensions
Feature: Details panel shows context-sensitive content

  The panel formerly named "Overview" is renamed to "Details" and
  displays content that changes based on the current selection:
  overview info when "(all)" is selected, the PRD artifact when
  an epic is selected, and the plan artifact when a feature is
  selected. Content is scrollable via PgUp/PgDn.

  Scenario: Panel is titled "Details"
    Given the dashboard is rendered
    When the user observes the panel titles
    Then the panel formerly known as "Overview" is titled "DETAILS"

  Scenario: Details panel shows overview info when all is selected
    Given the dashboard is running
    When the selection is "(all)"
    Then the Details panel displays the pipeline overview information

  Scenario: Details panel shows PRD artifact when an epic is selected
    Given the dashboard is running
    And the store contains an epic "auth" with a PRD artifact
    When the user selects epic "auth"
    Then the Details panel displays the PRD artifact content for "auth"

  Scenario: Details panel shows plan artifact when a feature is selected
    Given the dashboard is running
    And the store contains a feature "login-flow" with a plan artifact
    When the user selects feature "login-flow"
    Then the Details panel displays the plan artifact content for "login-flow"

  Scenario: Details panel content is scrollable
    Given the dashboard is running
    And the Details panel contains content longer than the visible area
    When the user scrolls down in the Details panel
    Then the Details panel shows content further down
    When the user scrolls up in the Details panel
    Then the Details panel shows content further up
```

## Acceptance Criteria

- [ ] Panel renamed from "OVERVIEW" to "DETAILS" in title and component name
- [ ] Selection "(all)" shows existing overview content (phase distribution, sessions, git)
- [ ] Epic selection loads and displays the PRD artifact as raw markdown
- [ ] Feature selection loads and displays the plan artifact as raw markdown
- [ ] Artifact loading uses existing `resolveArtifactPath()` — no new reader infrastructure
- [ ] Missing artifacts show a "not found" placeholder
- [ ] Content scrollable via PgUp/PgDn using keyboard hook's `detailsScrollOffset`
- [ ] Scroll offset resets to 0 on selection change
- [ ] Existing overview helper functions reused for "(all)" mode
