@dashboard-dispatch-fix
Feature: Log panel shows event-based dispatch status

  When SDK streaming is not available, the log panel must still show
  meaningful status updates for dispatch lifecycle events. The panel
  displays dispatching, completed, and failed states based on events
  rather than streaming output.

  Scenario: Log panel shows dispatching status when a phase begins
    Given the dashboard is running with an active epic
    And SDK streaming is not available
    When a phase dispatch begins
    Then the log panel shows a "dispatching" status for that phase

  Scenario: Log panel shows completed status when a phase succeeds
    Given the dashboard is running with an active epic
    And SDK streaming is not available
    When a phase dispatch completes successfully
    Then the log panel shows a "completed" status for that phase

  Scenario: Log panel shows failed status when a phase fails
    Given the dashboard is running with an active epic
    And SDK streaming is not available
    When a phase dispatch fails
    Then the log panel shows a "failed" status for that phase

  Scenario: Log panel transitions through dispatch lifecycle states
    Given the dashboard is running with an active epic
    And SDK streaming is not available
    When a phase dispatch begins
    Then the log panel shows a "dispatching" status for that phase
    When that phase dispatch completes successfully
    Then the log panel shows a "completed" status for that phase
