# Dashboard Log Fixes — Gherkin Integration Artifact

**Date:** 2026-04-06
**Epic:** dashboard-log-fixes
**Coverage:** wiring-fixes, rendering-fixes

---

## Feature: Log Entries in Tree Panel (wiring-fixes US1)

As a user watching the dashboard, I want log entries to appear in the tree panel so that I can monitor pipeline activity in real time.

```gherkin
@dashboard-log-fixes
Scenario: Log entries render in the tree panel
  Given the dashboard is running
  When the logger emits a log entry
  Then the log entry appears in the tree panel
  And the log entry is visible in the main viewport

@dashboard-log-fixes
Scenario: Multiple log entries stack in the tree panel
  Given the dashboard is running
  When the logger emits multiple log entries
  Then all entries appear in the tree panel
  And entries maintain their chronological order from top to bottom
  And each entry occupies a separate tree row

@dashboard-log-fixes
Scenario: Log entries integrate into the overall tree hierarchy
  Given the dashboard is running
  And the epics tree is populated
  When the logger emits a log entry
  Then the log entry appears below the epics section
  And the tree layout remains visually consistent
  And log entries do not displace other tree sections
```

---

## Feature: Auto-Follow Behavior (wiring-fixes US2)

As a user watching the dashboard, I want the log list to auto-follow new entries so that I always see the latest activity without manual scrolling.

```gherkin
@dashboard-log-fixes
Scenario: Log panel scrolls to show newest entries automatically
  Given the dashboard is running
  And the log panel contains multiple entries
  When a new log entry is emitted
  Then the log panel scrolls to show the newest entry
  And the newest entry is visible at the bottom of the log panel

@dashboard-log-fixes
Scenario: Auto-follow maintains visibility without user scroll
  Given the dashboard is running
  And the log panel is filled with entries beyond the viewport
  When a new log entry is emitted
  Then the log panel automatically scrolls down
  And the user does not need to manually scroll to see the new entry
  And the entry appears at the bottom without requiring keyboard or mouse input

@dashboard-log-fixes
Scenario: Auto-follow works continuously as entries stream in
  Given the dashboard is running
  When the logger emits a stream of rapid log entries
  Then the log panel scrolls to show each new entry
  And the newest entry is always visible
  And the behavior is smooth without stuttering or lag
```

---

## Feature: Verbosity Filtering (wiring-fixes US3)

As a user watching the dashboard, I want log level filtering (verbosity toggle) to hide debug entries at default verbosity so that I see a clean summary view.

```gherkin
@dashboard-log-fixes
Scenario: Debug entries are hidden at default verbosity
  Given the dashboard is running
  And no verbosity changes have been made
  When the logger emits a debug entry
  Then the debug entry does not appear in the log panel
  And the log panel shows only info-level and above entries

@dashboard-log-fixes
Scenario: Info and above entries are visible at default verbosity
  Given the dashboard is running
  And the verbosity is set to info
  When the logger emits info, warn, and error entries
  Then all three entries appear in the log panel
  And debug entries remain hidden

@dashboard-log-fixes
Scenario: Operator toggles verbosity to show debug entries
  Given the dashboard is running
  And the verbosity is set to info
  When the operator presses the verbosity toggle key
  Then the verbosity level changes to debug
  And debug entries now appear in the log panel

@dashboard-log-fixes
Scenario: Toggling verbosity back hides debug entries again
  Given the dashboard is running
  And the verbosity is set to debug
  When the operator presses the verbosity toggle key
  Then the verbosity level changes back to info
  And debug entries disappear from the log panel
```

---

## Feature: Static Banner and Keystroke Hints (wiring-fixes US4)

As a user watching the dashboard, I want the banner and keystroke hints to remain visible at all times so that the layout stays stable regardless of log volume.

```gherkin
@dashboard-log-fixes
Scenario: Banner remains visible as log entries fill the panel
  Given the dashboard is running
  And the banner displays "BEASTMODE" with animated dots
  When the logger emits many log entries
  Then the banner remains visible at the top
  And the banner does not scroll out of view
  And the animated dots continue their animation

@dashboard-log-fixes
Scenario: Keystroke hints remain visible regardless of log volume
  Given the dashboard is running
  And keystroke hints are displayed
  When the logger emits entries until the log panel is full
  Then the keystroke hints remain visible
  And the hints do not scroll out of view
  And the hints do not overlap with log entries

@dashboard-log-fixes
Scenario: Banner and hints maintain stable position during rapid log updates
  Given the dashboard is running
  And the banner and keystroke hints are in place
  When the logger emits a rapid stream of log entries
  Then the banner position remains unchanged
  And the keystroke hints position remains unchanged
  And the log panel scrolls independently below them
  And the layout does not jitter or shift

@dashboard-log-fixes
Scenario: Layout proportions remain stable regardless of log volume
  Given the dashboard is running
  And the three-panel layout has defined proportions
  When the logger emits entries until the log panel overflows
  Then the top section (banner and hints) maintains its height
  And the epics and overview panels maintain their widths
  And only the log panel scrolls internally
```

---

## Feature: System-Level Entries as SYSTEM Node (rendering-fixes US5)

As a user watching the dashboard, I want system-level entries (watch loop events, scan results) to render as a "SYSTEM" tree node with full hierarchical formatting so that the tree is visually consistent — no exceptions.

```gherkin
@dashboard-log-fixes
Scenario: Watch loop event renders as SYSTEM tree node
  Given the dashboard is running
  When a watch loop event is emitted
  Then the event renders under a "SYSTEM" tree node
  And the SYSTEM node uses hierarchical tree formatting
  And the SYSTEM node is consistent with other tree nodes

@dashboard-log-fixes
Scenario: Scan result renders as SYSTEM tree node
  Given the dashboard is running
  When a scan result is emitted
  Then the result renders under a "SYSTEM" tree node
  And the SYSTEM node uses hierarchical tree formatting
  And the result is indented as a child of SYSTEM

@dashboard-log-fixes
Scenario: Multiple system-level entries nest under single SYSTEM node
  Given the dashboard is running
  And a SYSTEM node is present
  When multiple watch loop events and scan results are emitted
  Then all events render as children of the same SYSTEM node
  And the SYSTEM node does not duplicate
  And entries maintain chronological order within the node

@dashboard-log-fixes
Scenario: SYSTEM node uses consistent tree rendering as other entries
  Given the dashboard is running
  When system-level entries and regular log entries are emitted
  Then both render with the same hierarchical formatting
  And both use the same indentation levels
  And both apply the same styling and colors
  And visual consistency is maintained across the entire tree

@dashboard-log-fixes
Scenario: SYSTEM node remains stable as entries are added
  Given the dashboard is running
  And the SYSTEM node contains multiple entries
  When new system-level entries are added
  Then the SYSTEM node expands to include them
  And the node structure does not collapse or reset
  And previously visible entries remain visible
```

---

## Feature: Active Sessions Show Current Phase (rendering-fixes US6)

As a user watching the dashboard, I want active sessions that haven't synced to the store yet to show their current phase as the status badge instead of "(unknown)" so that the tree is always informative.

```gherkin
@dashboard-log-fixes
Scenario: Active session displays current phase as status badge
  Given the dashboard is running
  And an active session has not yet synced to the store
  When I observe the session's status badge
  Then the badge displays the current phase (e.g., "design", "plan")
  And the badge does not display "(unknown)"

@dashboard-log-fixes
Scenario: Session status updates when phase changes
  Given the dashboard is running
  And an active session is in the "design" phase
  When the session transitions to the "implement" phase
  Then the status badge updates to show "implement"
  And the badge does not remain frozen on "design"

@dashboard-log-fixes
Scenario: Multiple active sessions each show their own phase
  Given the dashboard is running
  And multiple active sessions have not synced to the store
  When I observe the sessions in the tree
  Then each session displays its own current phase badge
  And one session does not borrow another's phase
  And all badges are up-to-date and distinct

@dashboard-log-fixes
Scenario: Status badge persists until session syncs to store
  Given the dashboard is running
  And an active session shows its current phase badge
  When the session continues running in its current phase
  Then the badge persists and remains visible
  And the badge accurately reflects the phase
  When the session syncs to the store
  Then the badge transitions to the canonical phase from the store

@dashboard-log-fixes
Scenario: Synced session phase matches original badge
  Given the dashboard is running
  And an active session showed "implement" in its badge before syncing
  When the session syncs to the store
  Then the synced session shows "implement" as its canonical phase
  And the displayed phase before and after sync are consistent
  And no state is lost during the sync transition
```

---

## Coverage Summary

| User Story | Feature | Scenario Count |
|---|---|---|
| US1: Log entries in tree panel | Log Entries in Tree Panel | 3 |
| US2: Auto-follow new entries | Auto-Follow Behavior | 3 |
| US3: Verbosity filtering | Verbosity Filtering | 4 |
| US4: Banner/hints stay visible | Static Banner and Keystroke Hints | 4 |
| US5: SYSTEM node rendering | System-Level Entries as SYSTEM Node | 5 |
| US6: Active sessions show phase | Active Sessions Show Current Phase | 5 |
| **Total** | **6 features** | **24 scenarios** |

All scenarios tagged with `@dashboard-log-fixes` for easy filtering and correlation with epic work.
