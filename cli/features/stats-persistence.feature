@dashboard-stats-persistence @dashboard
Feature: Dashboard stats persistence -- cumulative statistics survive restarts

  Background:
    Given the dashboard stats persistence layer is initialized

  Scenario: Cumulative stats are available after dashboard restart
    Given a previous dashboard session completed 5 sessions with 4 successes
    When the dashboard restarts and loads persisted stats
    Then the all-time total session count is 5
    And the all-time success rate is 80 percent

  Scenario: Current session stats accumulate independently from persisted stats
    Given a previous dashboard session completed 3 sessions with 3 successes
    When the dashboard restarts and loads persisted stats
    And 2 new sessions complete with 1 success and 1 failure
    Then the all-time total session count is 5
    And the all-time success rate is 80 percent
    And the current session total count is 2
    And the current session success rate is 50 percent

  Scenario: Phase duration averages accumulate across restarts
    Given a previous dashboard session recorded average plan duration of 30 seconds over 4 sessions
    When the dashboard restarts and loads persisted stats
    And a new session completes the "plan" phase in 50 seconds
    Then the all-time average duration for the "plan" phase reflects all 5 sessions

  Scenario: Stats are persisted when a pipeline session completes
    Given the dashboard is running with persistence enabled
    When a pipeline session completes successfully
    Then the persisted stats reflect the completed session

  Scenario: Stats persisted mid-run survive an unclean shutdown
    Given the dashboard is running with persistence enabled
    And 3 pipeline sessions have completed
    When the dashboard process terminates unexpectedly
    And the dashboard restarts and loads persisted stats
    Then the all-time total session count is 3

  Scenario: Dashboard starts cleanly when no stats file exists
    Given no persisted stats file exists
    When the dashboard starts
    Then the dashboard displays empty all-time stats
    And the dashboard is fully operational

  Scenario: Dashboard starts cleanly when stats file is corrupt
    Given the persisted stats file contains invalid data
    When the dashboard starts
    Then the dashboard discards the corrupt data
    And the dashboard displays empty all-time stats
    And the dashboard is fully operational

  Scenario: Deleting the stats file resets all-time statistics
    Given the dashboard has accumulated all-time stats over multiple sessions
    When the operator deletes the persisted stats file
    And the dashboard restarts
    Then the dashboard displays empty all-time stats
    And no special command or UI action was required
