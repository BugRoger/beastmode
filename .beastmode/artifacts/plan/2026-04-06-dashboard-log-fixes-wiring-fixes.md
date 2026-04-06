---
phase: plan
slug: "179441"
epic: dashboard-log-fixes
feature: wiring-fixes
wave: 1
---

# Wiring Fixes

**Design:** `.beastmode/artifacts/design/2026-04-06-179441.md`

## User Stories

1. As a user watching the dashboard, I want log entries to appear in the tree panel so that I can monitor pipeline activity in real time.
2. As a user watching the dashboard, I want the log list to auto-follow new entries so that I always see the latest activity without manual scrolling.
3. As a user watching the dashboard, I want log level filtering (verbosity toggle) to hide debug entries at default verbosity so that I see a clean summary view.
4. As a user watching the dashboard, I want the banner and keystroke hints to remain visible at all times so that the layout stays stable regardless of log volume.

## What to Build

Three independent wiring fixes in the dashboard's main App component and its lifecycle entry formatter:

**1. Seed the tree skeleton with enriched epics.** The `useDashboardTreeState` hook accepts an `enrichedEpics` parameter that seeds the tree skeleton from the store's epic/feature data. The App component currently omits this parameter, causing the tree skeleton to be empty. Sessions have no nodes to attach entries to, which cascades into broken auto-follow, broken filtering, and broken refresh. Pass the enriched epics state through to the hook call.

**2. Compute visible log lines from terminal dimensions.** The App component passes a hardcoded default (50) as the maximum visible lines for the log panel. This causes the log content to overflow the panel and push the banner and keystroke hints off screen when the terminal is smaller than expected. Compute the value dynamically from terminal rows by subtracting the header height (banner + hints), footer height, and panel border overhead. Pass the computed value to the log panel.

**3. Split session-started lifecycle entry into two log levels.** The `lifecycleToLogEntry` function returns a single debug-level entry for session-started events that combines the dispatch message with the session ID. Change it to return an array of two entries: an info-level entry with just the "dispatching" message (visible at default verbosity), and a debug-level entry with the session ID detail (hidden at default verbosity). Update the caller in App to push both entries from the array.

## Integration Test Scenarios

```gherkin
@dashboard-log-fixes
Feature: Log entries appear in tree panel

  Scenario: Log entries render in the tree panel
    Given the dashboard is running
    When the logger emits a log entry
    Then the log entry appears in the tree panel
    And the log entry is visible in the main viewport

  Scenario: Multiple log entries stack in the tree panel
    Given the dashboard is running
    When the logger emits multiple log entries
    Then all entries appear in the tree panel
    And entries maintain their chronological order from top to bottom
    And each entry occupies a separate tree row

  Scenario: Log entries integrate into the overall tree hierarchy
    Given the dashboard is running
    And the epics tree is populated
    When the logger emits a log entry
    Then the log entry appears below the epics section
    And the tree layout remains visually consistent
    And log entries do not displace other tree sections

@dashboard-log-fixes
Feature: Auto-follow behavior

  Scenario: Log panel scrolls to show newest entries automatically
    Given the dashboard is running
    And the log panel contains multiple entries
    When a new log entry is emitted
    Then the log panel scrolls to show the newest entry
    And the newest entry is visible at the bottom of the log panel

  Scenario: Auto-follow maintains visibility without user scroll
    Given the dashboard is running
    And the log panel is filled with entries beyond the viewport
    When a new log entry is emitted
    Then the log panel automatically scrolls down
    And the user does not need to manually scroll to see the new entry

  Scenario: Auto-follow works continuously as entries stream in
    Given the dashboard is running
    When the logger emits a stream of rapid log entries
    Then the log panel scrolls to show each new entry
    And the newest entry is always visible

@dashboard-log-fixes
Feature: Verbosity filtering

  Scenario: Debug entries are hidden at default verbosity
    Given the dashboard is running
    And no verbosity changes have been made
    When the logger emits a debug entry
    Then the debug entry does not appear in the log panel
    And the log panel shows only info-level and above entries

  Scenario: Info and above entries are visible at default verbosity
    Given the dashboard is running
    And the verbosity is set to info
    When the logger emits info, warn, and error entries
    Then all three entries appear in the log panel
    And debug entries remain hidden

  Scenario: Operator toggles verbosity to show debug entries
    Given the dashboard is running
    And the verbosity is set to info
    When the operator presses the verbosity toggle key
    Then the verbosity level changes to debug
    And debug entries now appear in the log panel

  Scenario: Toggling verbosity back hides debug entries again
    Given the dashboard is running
    And the verbosity is set to debug
    When the operator presses the verbosity toggle key
    Then the verbosity level changes back to info
    And debug entries disappear from the log panel

@dashboard-log-fixes
Feature: Static banner and keystroke hints

  Scenario: Banner remains visible as log entries fill the panel
    Given the dashboard is running
    And the banner displays animated content
    When the logger emits many log entries
    Then the banner remains visible at the top
    And the banner does not scroll out of view

  Scenario: Keystroke hints remain visible regardless of log volume
    Given the dashboard is running
    And keystroke hints are displayed
    When the logger emits entries until the log panel is full
    Then the keystroke hints remain visible
    And the hints do not scroll out of view
    And the hints do not overlap with log entries

  Scenario: Banner and hints maintain stable position during rapid log updates
    Given the dashboard is running
    And the banner and keystroke hints are in place
    When the logger emits a rapid stream of log entries
    Then the banner position remains unchanged
    And the keystroke hints position remains unchanged
    And the log panel scrolls independently below them

  Scenario: Layout proportions remain stable regardless of log volume
    Given the dashboard is running
    And the three-panel layout has defined proportions
    When the logger emits entries until the log panel overflows
    Then the top section maintains its height
    And the epics and overview panels maintain their widths
    And only the log panel scrolls internally
```

## Acceptance Criteria

- [ ] Log entries from active sessions appear in the tree panel under their epic/feature nodes
- [ ] The tree auto-follows new entries when in tail mode (no manual scroll active)
- [ ] Verbosity toggle ('v') hides/shows debug entries — warn and error always visible
- [ ] Banner and keystroke hints remain visible regardless of log volume or terminal size
- [ ] Session-started events produce an info-level "dispatching" message visible at default verbosity
- [ ] Session-started events produce a debug-level session ID message hidden at default verbosity
- [ ] maxVisibleLines adapts to terminal height changes
