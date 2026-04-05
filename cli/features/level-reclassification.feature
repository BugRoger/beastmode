@logging-cleanup
Feature: Log call sites use the correct level classification

  All log call sites are reviewed and assigned to the correct level.
  Info-level output is clean operator-facing status. Debug-level
  output contains implementation details. Warn indicates recoverable
  issues. Error indicates unrecoverable failures.

  Scenario: Recoverable scan failures are logged as warnings
    Given the watch loop is running
    When a state scan fails but the loop continues
    Then the failure is logged at warn level
    And the failure is not logged at error level

  Scenario: Default info output contains only operator-facing status
    Given the CLI is running at default info verbosity
    When a pipeline phase completes normally
    Then the log output contains phase completion status
    And the log output does not contain internal implementation details

  Scenario: Debug output contains implementation details
    Given the CLI is running at debug verbosity
    When a pipeline phase completes normally
    Then the log output contains phase completion status
    And the log output also contains implementation-level details

  Scenario Outline: Log levels follow classification rules
    Given a log message about "<situation>"
    Then the message is classified at "<level>" level

    Examples:
      | situation                        | level |
      | phase completed successfully     | info  |
      | file written to disk             | debug |
      | state scan failed but continuing | warn  |
      | unrecoverable dispatch failure   | error |
      | config loaded                    | debug |
      | epic advanced to next phase      | info  |
