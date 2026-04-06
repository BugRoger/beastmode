---
phase: plan
slug: "179441"
epic: dashboard-log-fixes
feature: tree-skeleton-fix
wave: 1
---

# Tree Skeleton Fix

**Design:** .beastmode/artifacts/design/2026-04-06-179441.md

## User Stories

1. As a user watching the dashboard, I want log entries to appear in the tree panel so that I can monitor pipeline activity in real time.
2. As a user watching the dashboard, I want the log list to auto-follow new entries so that I always see the latest activity without manual scrolling.
3. As a user watching the dashboard, I want log level filtering (verbosity toggle) to hide debug entries at default verbosity so that I see a clean summary view.

## What to Build

The `useDashboardTreeState` hook accepts an optional `enrichedEpics` parameter that seeds the tree skeleton with epic and feature nodes from the store. The hook call in the main App component currently omits this parameter, causing `buildTreeState` to receive no skeleton — sessions have no nodes to attach entries to, which cascades into broken auto-follow, verbosity filtering, and refresh.

Pass the enriched epics array (already available in App component state) to the hook call. This single parameter addition enables `buildTreeState` to create the tree skeleton, which restores all three downstream behaviors: entry rendering, auto-follow via trim-to-tail, and verbosity filtering via the tree entry pipeline.

No new modules, no interface changes, no new dependencies. The hook parameter already exists and is wired internally — it just needs to be supplied at the call site.

## Integration Test Scenarios

```gherkin
@dashboard-log-fixes
Feature: Tree panel displays log entries with auto-follow and verbosity filtering

  The dashboard tree panel renders log entries as they arrive, auto-scrolls
  to show the latest entry, and respects the current verbosity level to
  filter debug entries at default verbosity.

  Background:
    Given the dashboard is running with an active epic

  Scenario: Log entries appear in the tree panel as events arrive
    When a pipeline event produces a log entry
    Then the tree panel displays the log entry
    And the entry shows a timestamp and message

  Scenario: Multiple log entries render in chronological order
    When the pipeline produces the following log entries in order:
      | message            |
      | scan started       |
      | session dispatched |
      | phase completed    |
    Then the tree panel shows all three entries in chronological order

  Scenario: Log entries integrate into the tree hierarchy
    Given the epics tree is populated with at least one epic
    When the logger emits a log entry
    Then the log entry appears in the tree panel
    And the tree layout remains visually consistent
    And log entries do not displace other tree sections

  Scenario: Tree panel auto-follows new entries
    Given the tree panel contains enough entries to fill the visible area
    When a new log entry arrives
    Then the tree panel scrolls to show the newest entry
    And the newest entry is visible at the bottom of the panel

  Scenario: Auto-follow keeps up with rapid entry arrival
    Given the tree panel is auto-following
    When multiple log entries arrive in quick succession
    Then the tree panel shows the most recent entry as the last visible line

  Scenario: Debug entries are hidden at default verbosity
    Given the dashboard verbosity is at the default info level
    When a debug-level log entry arrives
    Then the tree panel does not display the debug entry
    And info-level entries remain visible

  Scenario: Debug entries become visible when verbosity is toggled to debug
    Given the dashboard verbosity is at the default info level
    And a debug-level log entry has arrived
    When the operator toggles verbosity to debug
    Then the previously hidden debug entry becomes visible in the tree panel

  Scenario: Toggling verbosity back to info hides debug entries again
    Given the dashboard verbosity has been set to debug
    And debug-level entries are visible in the tree panel
    When the operator toggles verbosity back to info
    Then debug-level entries are no longer visible in the tree panel
    And info-level entries remain visible
```

## Acceptance Criteria

- [ ] `useDashboardTreeState` receives the enriched epics array from App component state
- [ ] `buildTreeState` produces a tree skeleton with epic and feature nodes when enriched epics are provided
- [ ] Log entries appear in the tree panel under the correct epic and feature nodes
- [ ] Auto-follow scrolls to the newest entry when new entries arrive
- [ ] Verbosity toggle at default level hides debug entries; toggling to debug reveals them
- [ ] Existing unit tests for `buildTreeState` continue to pass
