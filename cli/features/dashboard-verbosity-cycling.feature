@dashboard-dispatch-fix
Feature: Operator cycles log verbosity with keyboard shortcut

  The operator can press 'v' in the dashboard to cycle through log
  verbosity levels: info, detail, debug, and trace. The cycle wraps
  from trace back to info. The change takes effect immediately without
  restarting the dashboard.

  Scenario: Default log verbosity is info
    Given the dashboard is running
    When no verbosity changes have been made
    Then the log verbosity level is "info"

  Scenario Outline: Pressing v cycles through verbosity levels
    Given the dashboard is running
    And the current log verbosity level is "<current>"
    When the operator presses the verbosity toggle key
    Then the log verbosity level changes to "<next>"

    Examples:
      | current | next   |
      | info    | detail |
      | detail  | debug  |
      | debug   | trace  |
      | trace   | info   |

  Scenario: Verbosity change takes effect immediately
    Given the dashboard is running
    And the log verbosity level is "info"
    When the operator presses the verbosity toggle key
    Then the log panel immediately reflects the "detail" verbosity level
    And no dashboard restart is required

  Scenario: Log entries are filtered by current verbosity level
    Given the dashboard is running
    And the log verbosity level is "info"
    Then only info-level log entries are visible
    When the operator presses the verbosity toggle key
    Then info-level and detail-level log entries are visible
