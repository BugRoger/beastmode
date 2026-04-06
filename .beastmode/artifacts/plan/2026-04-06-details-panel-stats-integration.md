# Integration Artifact: details-panel-stats

Epic: **details-panel-stats**

## New Scenarios

### Feature: stats-accumulator

Covers user stories [1, 5].

```gherkin
@details-panel-stats
Feature: Session stats accumulation from watch loop events

  A dedicated stats accumulator subscribes to watch loop events and
  maintains running counters for session metrics. The accumulator is
  decoupled from rendering and produces computed stats on demand.

  Scenario: Total session count increments when a session completes
    Given the stats accumulator is initialized
    And no sessions have completed
    When a session completes successfully
    Then the total session count is 1
    When a second session completes successfully
    Then the total session count is 2

  Scenario: Active session count reflects currently running sessions
    Given the stats accumulator is initialized
    When a session starts
    Then the active session count is 1
    When a second session starts
    Then the active session count is 2
    When the first session completes
    Then the active session count is 1

  Scenario: Success rate reflects completed session outcomes
    Given the stats accumulator is initialized
    When 3 sessions complete successfully
    And 1 session completes with failure
    Then the success rate is 75 percent

  Scenario: Cumulative session time sums all completed session durations
    Given the stats accumulator is initialized
    When a session completes with a duration of 120 seconds
    And a second session completes with a duration of 60 seconds
    Then the cumulative session time is 180 seconds

  Scenario: Uptime reflects elapsed time since accumulator started
    Given the stats accumulator is initialized at a known start time
    When time advances by 300 seconds
    And a scan-complete event fires
    Then the reported uptime is approximately 300 seconds

  Scenario: Accumulator reports empty state before any session completes
    Given the stats accumulator is initialized
    And no sessions have completed
    Then the accumulator reports an empty state

  Scenario: Accumulator exits empty state after first session completes
    Given the stats accumulator is initialized
    And no sessions have completed
    When a session completes successfully
    Then the accumulator no longer reports an empty state

  Scenario: Phase duration averages are computed per phase
    Given the stats accumulator is initialized
    When a session completes the "plan" phase in 30 seconds
    And a second session completes the "plan" phase in 50 seconds
    Then the average duration for the "plan" phase is 40 seconds

  Scenario Outline: All four pipeline phases track durations independently
    Given the stats accumulator is initialized
    When a session completes the "<phase>" phase in 60 seconds
    Then the average duration for the "<phase>" phase is 60 seconds
    And the other phases show no recorded duration

    Examples:
      | phase     |
      | plan      |
      | implement |
      | validate  |
      | release   |

  Scenario: Unseen phases display no duration data
    Given the stats accumulator is initialized
    When a session completes the "plan" phase in 45 seconds
    Then the "implement" phase has no recorded duration
    And the "validate" phase has no recorded duration
    And the "release" phase has no recorded duration

  Scenario: Retry count increments on re-dispatch events
    Given the stats accumulator is initialized
    When a session is re-dispatched
    Then the total re-dispatch count is 1
    When a session is re-dispatched again
    Then the total re-dispatch count is 2

  Scenario: Failure count increments on terminal failures
    Given the stats accumulator is initialized
    When a session completes with failure
    Then the total failure count is 1

  Scenario: Stats reset on accumulator initialization
    Given the stats accumulator is initialized
    Then the total session count is 0
    And the active session count is 0
    And the total re-dispatch count is 0
    And the total failure count is 0
```

### Feature: stats-panel-integration

Covers user stories [1, 2, 3, 4].

```gherkin
@details-panel-stats
Feature: Details panel displays session stats when all epics are selected

  The details panel renders a stats view with three stacked sections
  when the user selects "(all)" in the epics list. The sections show
  session stats, phase duration breakdown, and retry stats.

  Background:
    Given the dashboard is running
    And the user has selected "(all)" in the epics list

  Scenario: Session stats section displays total and active counts
    Given several sessions have completed
    Then the details panel shows a "Sessions" section
    And the sessions section displays the total session count
    And the sessions section displays the active session count

  Scenario: Session stats section displays success rate
    Given several sessions have completed with mixed outcomes
    Then the sessions section displays the success rate as a percentage

  Scenario: Session stats section displays uptime
    Given the dashboard has been running for some time
    Then the sessions section displays the uptime duration

  Scenario: Session stats section displays cumulative session time
    Given several sessions have completed
    Then the sessions section displays the cumulative session time

  Scenario: Phase duration section shows average duration per phase
    Given sessions have completed phases with recorded durations
    Then the details panel shows a "Phase Duration" section
    And the phase duration section lists all four phases:
      | phase     |
      | plan      |
      | implement |
      | validate  |
      | release   |

  Scenario: Phase names are displayed with phase-specific colors
    Given sessions have completed phases with recorded durations
    Then each phase name in the duration breakdown uses its designated phase color

  Scenario: Unseen phases display a placeholder instead of a duration
    Given only the "plan" phase has recorded durations
    Then the "implement" phase displays a no-data indicator
    And the "validate" phase displays a no-data indicator
    And the "release" phase displays a no-data indicator

  Scenario: Retry stats section displays re-dispatch and failure counts
    Given sessions have experienced re-dispatches and failures
    Then the details panel shows a "Retries" section
    And the retries section displays the total re-dispatch count
    And the retries section displays the total failure count

  Scenario: Empty state shows placeholder before any session completes
    Given no sessions have completed yet
    Then the details panel shows a dim "waiting for sessions..." placeholder
    And the details panel does not show numeric stats

  Scenario: Placeholder disappears after first session completes
    Given no sessions have completed yet
    When the first session completes
    Then the details panel replaces the placeholder with session stats

  Scenario: Stats view only appears for the all-epics selection
    Given the user has selected a specific epic instead of "(all)"
    Then the details panel does not show the stats view
    And the details panel shows the epic detail content instead

  Scenario: Three sections are stacked vertically in order
    Given sessions have completed with stats available
    Then the details panel displays sections in this order:
      | section        |
      | Sessions       |
      | Phase Duration |
      | Retries        |
```

## Modified Scenarios

None. No existing scenarios require modification for this epic.

## Deleted Scenarios

None. No existing scenarios are obsoleted by this epic.
