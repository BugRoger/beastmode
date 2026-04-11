---
phase: plan
slug: c8764e
epic: dashboard-stats-persistence
feature: stats-view-toggle
wave: 2
---

# stats-view-toggle

**Design:** `.beastmode/artifacts/design/2026-04-11-c8764e.md`

## User Stories

2. As a pipeline operator, I want to toggle between all-time and current-session stats in the dashboard, so that I can distinguish long-term trends from the current run.

## What to Build

A keyboard-driven toggle in the dashboard that switches the DetailsPanel stats view between all-time (persisted historical) and current-session stats.

**State:** A new boolean or enum state in the keyboard handler or App component tracks whether the user is viewing all-time or current-session stats. The default view is all-time (per PRD decision).

**Keyboard binding:** Add a new key to the dashboard keyboard handler that toggles the stats view mode. The key should be documented in the key hints bar. Only active when the DetailsPanel is showing stats (i.e., "(all)" row is selected).

**DetailsPanel changes:** The DetailsPanel currently receives a single `stats` prop. After this feature, it receives both `historicalStats` (all-time from persistence) and `sessionStats` (current session from accumulator). A view mode flag determines which one to render. A visible label in the stats view indicates which mode is active ("all-time" vs "session").

**Data flow:** The App component holds both stat sets in React state — historical stats loaded once on mount (from wave 1's persistence module), and session stats updated on every event (existing accumulator). The toggle controls which one flows into the DetailsPanel render path.

**resolveDetailsContent:** The content resolver may need adjustment to pass through the correct stats object based on the active view mode, or the toggle can be handled entirely within the DetailsPanel component.

## Integration Test Scenarios

```gherkin
@dashboard-stats-persistence @dashboard
Feature: Dashboard stats view toggle -- switch between all-time and current-session stats

  Scenario: Default stats view shows all-time statistics
    Given the dashboard is running with persisted all-time stats
    When no view toggle has been activated
    Then the stats panel displays all-time statistics

  Scenario: Operator toggles to current-session stats view
    Given the dashboard is running with persisted all-time stats
    And the stats panel displays all-time statistics
    When the operator activates the stats view toggle
    Then the stats panel displays current-session statistics

  Scenario: Operator toggles back to all-time stats view
    Given the dashboard is running with persisted all-time stats
    And the stats panel displays current-session statistics
    When the operator activates the stats view toggle
    Then the stats panel displays all-time statistics

  Scenario: Stats view label indicates which view is active
    Given the dashboard is running with persisted all-time stats
    When the stats panel displays all-time statistics
    Then the stats view label indicates "all-time" mode
    When the operator activates the stats view toggle
    Then the stats view label indicates "session" mode
```

## Acceptance Criteria

- [ ] Keyboard shortcut toggles between all-time and current-session stats views
- [ ] Default view is all-time (per PRD decision)
- [ ] Key hint bar shows the toggle key when stats view is active
- [ ] Visible label in DetailsPanel indicates active view mode ("all-time" vs "session")
- [ ] Toggle only affects stats rendering — other DetailsPanel content types unaffected
- [ ] DetailsPanel receives both historical and session stats, renders the active one
