# Integration Test Artifact: dashboard-stats-persistence

## New Scenarios

### Feature: stats-persistence

Covers user stories [1, 3, 4, 5].

```gherkin
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
```

```gherkin
@dashboard-stats-persistence @dashboard
Feature: Dashboard stats persistence -- stats persist on session completion

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
```

```gherkin
@dashboard-stats-persistence @dashboard
Feature: Dashboard stats persistence -- graceful recovery from missing or corrupt state

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
```

```gherkin
@dashboard-stats-persistence @dashboard
Feature: Dashboard stats persistence -- reset by file deletion

  Scenario: Deleting the stats file resets all-time statistics
    Given the dashboard has accumulated all-time stats over multiple sessions
    When the operator deletes the persisted stats file
    And the dashboard restarts
    Then the dashboard displays empty all-time stats
    And no special command or UI action was required
```

### Feature: stats-view-toggle

Covers user stories [2].

```gherkin
@dashboard-stats-persistence @dashboard
Feature: Dashboard stats view toggle -- switch between all-time and current-session stats

  Scenario: Default stats view shows current-session statistics
    Given the dashboard is running with persisted all-time stats
    When no view toggle has been activated
    Then the stats panel displays current-session statistics

  Scenario: Operator toggles to all-time stats view
    Given the dashboard is running with persisted all-time stats
    And the stats panel displays current-session statistics
    When the operator activates the stats view toggle
    Then the stats panel displays all-time statistics

  Scenario: Operator toggles back to current-session stats view
    Given the dashboard is running with persisted all-time stats
    And the stats panel displays all-time statistics
    When the operator activates the stats view toggle
    Then the stats panel displays current-session statistics

  Scenario: Stats view label indicates which view is active
    Given the dashboard is running with persisted all-time stats
    When the stats panel displays current-session statistics
    Then the stats view label indicates "session" mode
    When the operator activates the stats view toggle
    Then the stats view label indicates "all-time" mode
```

## Consolidation

No consolidation actions identified.

The existing `session-stats.feature` and `stats-panel-integration.feature` test in-memory accumulation and panel rendering respectively. Both remain valid -- the persistence epic adds a new layer beneath the existing accumulator without replacing it. No existing scenarios become stale or redundant as a result of this epic.
