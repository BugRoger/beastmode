# Dashboard Log Fixes -- Gherkin Integration Artifact

**Date:** 2026-04-06
**Epic:** dashboard-log-fixes

---

## New Scenarios

### Feature: tree-skeleton-fix

Covers user stories [1, 2, 3].

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

### Feature: system-node-rename

Covers user stories [5].

```gherkin
@dashboard-log-fixes
Feature: System-level entries render as a SYSTEM tree node

  Watch loop events and scan results render under a dedicated "SYSTEM"
  node in the tree panel, using the same hierarchical formatting as
  epic and session nodes. No system-level entry renders as a flat
  unformatted line.

  Scenario: Watch loop event renders under the SYSTEM tree node
    Given the dashboard is running
    When the watch loop emits a scan-complete event
    Then the tree panel contains a "SYSTEM" top-level node
    And the scan-complete entry appears as a child of the SYSTEM node

  Scenario: Multiple system events group under the same SYSTEM node
    Given the dashboard is running
    When the watch loop emits the following events:
      | event type     |
      | scan-complete  |
      | scan-started   |
      | loop-tick      |
    Then all three entries appear as children of the single SYSTEM node

  Scenario: SYSTEM node uses the same hierarchical formatting as epic nodes
    Given the dashboard is running
    And the tree panel contains an epic node
    When a system-level event arrives
    Then the SYSTEM node has the same indentation style as the epic node
    And the SYSTEM node has a visible label and status indicator

  Scenario: No system-level entry renders outside the SYSTEM node
    Given the dashboard is running
    When multiple system-level and epic-level events have arrived
    Then every system-level entry is nested under the SYSTEM node
    And no system-level entry appears as a root-level flat line
```

### Feature: status-fallback-fix

Covers user stories [6].

```gherkin
@dashboard-log-fixes
Feature: Active sessions show current phase instead of unknown

  Sessions that have been dispatched but have not yet synced their
  status to the store display their current phase as the status badge
  instead of "(unknown)". The fallback resolves as soon as the store
  sync completes.

  Scenario: Newly dispatched session shows its phase as status
    Given the dashboard is running with an active epic
    When a session is dispatched for the "plan" phase
    And the session has not yet synced status to the store
    Then the session's status badge displays "plan"
    And the status badge does not display "(unknown)"

  Scenario: Status badge updates when store sync completes
    Given a session was dispatched for the "implement" phase
    And the session's status badge displays "implement" as the fallback
    When the session syncs its status to the store as "running"
    Then the session's status badge updates to "running"

  Scenario: Multiple unsynced sessions each show their respective phase
    Given the dashboard is running with two active epics
    When epic A dispatches a session for the "design" phase
    And epic B dispatches a session for the "validate" phase
    And neither session has synced to the store
    Then epic A's session badge displays "design"
    And epic B's session badge displays "validate"

  Scenario: Completed sessions that synced never show fallback
    Given a session completed the "plan" phase
    And the session synced its status to the store as "completed"
    Then the session's status badge displays "completed"
    And the fallback logic is not applied
```

### Feature: log-rendering-polish

Covers user stories [3, 4].

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

---

## Modified Scenarios

None. The existing feature files cover orthogonal concerns (verbosity cycling mechanics in `dashboard-verbosity-cycling.feature`, sink routing in `pluggable-sink-model.feature`, log level classification in `level-reclassification.feature`, full stream independence in `dashboard-full-stream.feature`) that remain correct as-is. The new scenarios address dashboard-specific rendering behaviors that were not previously specified.

---

## Deleted Scenarios

None. No existing scenarios are made obsolete by this epic. The existing `dashboard-full-stream.feature`, `dashboard-verbosity-cycling.feature`, `dashboard-verbosity-indicator.feature`, and `level-reclassification.feature` remain valid -- they describe logger infrastructure and verbosity toggle mechanics, which this epic consumes but does not replace.
