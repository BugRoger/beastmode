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
