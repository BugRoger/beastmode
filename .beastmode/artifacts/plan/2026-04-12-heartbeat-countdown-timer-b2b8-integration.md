# Integration Test Artifact: Heartbeat Countdown Timer

Epic: `heartbeat-countdown-timer-b2b8`
Date: 2026-04-12

## New Scenarios

### Feature: heartbeat-countdown-display

Covers user stories [1, 2, 3].

```gherkin
@heartbeat-countdown-timer-b2b8 @dashboard
Feature: Heartbeat countdown display -- live timer replaces static watch indicator

  The dashboard header shows a live countdown to the next scheduled scan,
  a scanning indicator during active scans, and an interval hint when the
  watch loop is stopped. The countdown resets only on poll-triggered scan
  completions -- event-triggered rescans do not affect the timer.

  # --- Happy path: countdown lifecycle ---

  Scenario: Dashboard shows countdown after watch loop starts
    Given the watch loop is running with a configured interval
    When a scheduled scan completes successfully
    Then the dashboard displays a countdown in seconds until the next scan
    And the countdown decrements each second

  Scenario: Countdown resets when a scheduled scan completes
    Given the watch loop is running with a configured interval
    And the countdown has decremented below the full interval
    When a poll-triggered scan completes
    Then the countdown resets to the full configured interval

  # --- Scanning state ---

  Scenario: Dashboard shows scanning indicator when a scan begins
    Given the watch loop is running with a countdown displayed
    When a scan starts
    Then the dashboard displays "scanning..." instead of the countdown

  Scenario: Countdown resumes after scanning completes
    Given the dashboard is displaying "scanning..."
    When the poll-triggered scan completes
    Then the dashboard displays a countdown in seconds until the next scan

  # --- Stopped state ---

  Scenario: Dashboard shows stopped state with interval hint when loop is off
    Given the watch loop is stopped
    And the configured interval is 60 seconds
    Then the dashboard displays "stopped (60s)"

  # --- Event-triggered scan does not reset countdown ---

  Scenario: Event-triggered scan completion does not reset the countdown
    Given the watch loop is running with a countdown displayed
    And the countdown has decremented to a known value
    When an event-triggered scan completes
    Then the countdown continues from its current value without resetting
```

```gherkin
@heartbeat-countdown-timer-b2b8 @watch-loop
Feature: WatchLoop scan-started event -- new event emitted at scan boundary

  The WatchLoop emits a scan-started event at the beginning of each scan
  cycle. The existing scan-complete event gains a trigger field to
  distinguish poll-triggered from event-triggered completions.

  Scenario: WatchLoop emits scan-started before scanning epics
    Given the watch loop is initialized with a configured interval
    When the watch loop performs a scheduled tick
    Then a "scan-started" event is emitted before epics are scanned

  Scenario: Poll-triggered scan-complete carries trigger field
    Given the watch loop is initialized with a configured interval
    When the watch loop performs a scheduled tick
    And the scan completes
    Then the "scan-complete" event includes a trigger value of "poll"

  Scenario: Event-triggered scan-complete carries trigger field
    Given the watch loop is running
    When a session completion triggers an immediate rescan
    And the rescan completes
    Then the "scan-complete" event includes a trigger value of "event"
```

## Consolidation

##### Update: Status colors derive from the Monokai Pro palette

**File:** `cli/features/dashboard-polish-monokai.feature`
**Action:** update
**Reason:** The existing scenario "Status colors derive from the Monokai Pro palette" validates that watch status colors use Monokai green and red accents by checking for color hex values in the ThreePanelLayout source. This epic replaces the static "watch: running" / "watch: stopped" text with a countdown timer component, but the green (#A9DC76) and red (#FF6188) color contract is preserved. The scenario's behavioral intent remains valid -- it asserts that status display uses the correct Monokai palette colors. The step definition checks `threePanelSource.includes(MONOKAI.status.green)` and `threePanelSource.includes(MONOKAI.status.red)`, which will continue to pass as long as the countdown component uses the same hex values. No Gherkin change is needed -- the scenario remains correct as-is. If the implementation moves the color constants to a separate countdown component file, the step definition may need its source scope adjusted, but that is an implementer concern, not a scenario concern.

No further consolidation actions identified. The existing dashboard feature files (wiring, polish, verbosity, event-log-panel) test orthogonal concerns that are not affected by this epic.
