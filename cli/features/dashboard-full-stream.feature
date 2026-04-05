@logging-cleanup
Feature: Dashboard receives the full log stream independently from CLI

  The dashboard sink receives all log entries regardless of the CLI
  verbosity setting. The dashboard applies its own filtering with a
  default of info level and built-in UI controls. CLI and dashboard
  visibility settings do not affect each other.

  Scenario: Dashboard sink receives debug entries when CLI is set to info
    Given a logger is created with a CLI sink at info level
    And a dashboard sink is attached to the same logger
    When the logger emits a debug message "internal detail"
    Then the CLI sink does not display the debug entry
    And the dashboard sink receives the debug entry

  Scenario: Dashboard defaults to info-level visibility
    Given the dashboard is running
    And no verbosity changes have been made
    Then the dashboard displays info-level entries
    And the dashboard does not display debug-level entries

  Scenario: Dashboard verbosity is independent of CLI verbosity
    Given a logger is created with a CLI sink at debug level
    And a dashboard sink is attached with default info visibility
    When the logger emits a debug message "verbose detail"
    Then the CLI sink displays the debug entry
    And the dashboard sink receives the entry but filters it from display

  Scenario: Dashboard applies its own filter controls
    Given the dashboard is running with all entries received
    When the operator changes the dashboard verbosity to debug
    Then previously hidden debug entries become visible in the dashboard
    And the CLI verbosity is unchanged
