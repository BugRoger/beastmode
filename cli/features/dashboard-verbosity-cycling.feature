@logging-cleanup
Feature: Operator cycles log verbosity with keyboard shortcut

  The operator can press 'v' in the dashboard to toggle between log
  verbosity levels: info and debug. The toggle wraps from debug back
  to info. The change takes effect immediately without restarting the
  dashboard.

  Scenario: Default log verbosity is info
    Given the dashboard is running
    When no verbosity changes have been made
    Then the log verbosity level is "info"

  Scenario Outline: Pressing v toggles between verbosity levels
    Given the dashboard is running
    And the current log verbosity level is "<current>"
    When the operator presses the verbosity toggle key
    Then the log verbosity level changes to "<next>"

    Examples:
      | current | next  |
      | info    | debug |
      | debug   | info  |

  Scenario: Verbosity change takes effect immediately
    Given the dashboard is running
    And the log verbosity level is "info"
    When the operator presses the verbosity toggle key
    Then the log panel immediately reflects the "debug" verbosity level
    And no dashboard restart is required

  Scenario: Log entries are filtered by current verbosity level
    Given the dashboard is running
    And the log verbosity level is "info"
    Then only info-level and above log entries are visible
    When the operator presses the verbosity toggle key
    Then debug-level log entries are also visible
