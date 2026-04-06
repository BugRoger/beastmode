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
