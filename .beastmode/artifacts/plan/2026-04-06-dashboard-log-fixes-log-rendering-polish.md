---
phase: plan
slug: "179441"
epic: dashboard-log-fixes
feature: log-rendering-polish
wave: 2
---

# Log Rendering Polish

**Design:** .beastmode/artifacts/design/2026-04-06-179441.md

## User Stories

3. As a user watching the dashboard, I want log level filtering (verbosity toggle) to hide debug entries at default verbosity so that I see a clean summary view.
4. As a user watching the dashboard, I want the banner and keystroke hints to remain visible at all times so that the layout stays stable regardless of log volume.

## What to Build

Two targeted fixes for log rendering quality:

### Dynamic maxVisibleLines

The log panel trims rendered tree content to a `maxVisibleLines` count. This is currently hardcoded to 50 lines. When the terminal is smaller than 50 content lines (common), the tree content overflows the panel, pushing the banner and keystroke hints off screen.

Compute `maxVisibleLines` dynamically based on the terminal row count: subtract the header height (banner + watch status area), the footer height (keystroke hints bar), and the panel border overhead from the total terminal rows. Pass this computed value to the log panel component as a prop. The log panel already accepts the prop as optional with a default — the change is supplying it from the parent.

The computation happens in the App component where both terminal dimensions and the layout structure are known. The exact arithmetic depends on the layout's fixed chrome elements (header padding, footer, border lines).

### Session-Started Entry Split

The `lifecycleToLogEntry` function currently returns a single entry at debug level for the "session-started" event, combining "dispatching" with session detail in one line. This means the dispatch notification is invisible at default verbosity (info level), even though users want to see when sessions start.

Change the function to return an array of two entries for "session-started":
1. An info-level entry with the "dispatching" message (visible at default verbosity)
2. A debug-level entry with the "session: {id}" detail (visible only at debug verbosity)

Update the caller in the App component's session-started event handler to push both entries (the current code pushes one). The return type of the lifecycle function changes from a single entry to an array for this specific event type, or the function signature changes to always return an array (simpler caller contract).

## Integration Test Scenarios

```gherkin
@dashboard-log-fixes
Feature: Log rendering polish with entry splitting and layout stability

  Session-started log entries are split into an info-level summary and
  a debug-level detail line. The banner and keystroke hints bar remain
  visible at all times regardless of log volume in the panels.

  # --- Session-started entry split ---

  Scenario: Session-started event produces an info-level summary entry
    Given the dashboard is running
    When a session-started event fires for epic "my-epic" phase "plan"
    Then the log contains an info-level entry summarizing the session start
    And the info entry includes the epic name and phase

  Scenario: Session-started event produces a debug-level detail entry
    Given the dashboard is running
    When a session-started event fires for epic "my-epic" phase "plan"
    Then the log contains a debug-level entry with session start details
    And the debug entry includes additional metadata beyond the summary

  Scenario: Only the info summary is visible at default verbosity
    Given the dashboard verbosity is at the default info level
    When a session-started event fires
    Then the info-level session start summary is visible
    And the debug-level session start detail is not visible

  Scenario: Both entries are visible at debug verbosity
    Given the dashboard verbosity has been set to debug
    When a session-started event fires
    Then both the info-level summary and debug-level detail are visible

  # --- Layout stability under log volume ---

  Scenario: Banner remains visible when log panel is full
    Given the dashboard is running
    When the log panel fills with more entries than its visible area
    Then the banner is still visible at the top of the screen
    And the banner text reads "BEASTMODE"

  Scenario: Keystroke hints bar remains visible when log panel is full
    Given the dashboard is running
    When the log panel fills with more entries than its visible area
    Then the keystroke hints bar is still visible at the bottom of the screen
    And the hints bar includes the verbosity toggle hint

  Scenario: Banner and hints bar remain stable during rapid log output
    Given the dashboard is running
    When log entries arrive faster than the render refresh rate
    Then the banner does not flicker or disappear
    And the keystroke hints bar does not flicker or disappear
    And the log panel absorbs the overflow without displacing chrome elements
```

## Acceptance Criteria

- [ ] `maxVisibleLines` is computed dynamically from terminal rows minus fixed chrome height
- [ ] Log panel never renders more lines than the available panel height
- [ ] Banner remains visible at the top of the screen regardless of log volume
- [ ] Keystroke hints bar remains visible at the bottom of the screen regardless of log volume
- [ ] `lifecycleToLogEntry("session-started", ...)` returns two entries: info-level summary and debug-level detail
- [ ] At default verbosity, only the info-level dispatch summary is visible
- [ ] At debug verbosity, both the summary and session detail are visible
- [ ] App component's session-started handler pushes both entries to the fallback store
