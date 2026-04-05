@logging-cleanup
Feature: All CLI runtime log output goes through the Logger

  No console.log or console.error calls exist in the CLI runtime
  source code (excluding standalone scripts and test files).
  All log output is routed through the structured Logger.

  Scenario: CLI runtime source contains no console.log calls
    Given the CLI runtime source files are scanned
    Then no file in the CLI runtime contains a console.log call
    And standalone scripts are excluded from this check

  Scenario: CLI runtime source contains no console.error calls
    Given the CLI runtime source files are scanned
    Then no file in the CLI runtime contains a console.error call
    And standalone scripts are excluded from this check

  Scenario: Argument parsing errors use the Logger
    Given the CLI is invoked with invalid arguments
    When argument parsing fails
    Then the error message is emitted through the Logger
    And no output is written directly to the console

  Scenario: Pre-logger bootstrap errors are handled
    Given the CLI starts up before the Logger is fully initialized
    When a bootstrap error occurs during argument parsing
    Then the error is still emitted through a logger instance
    And no console.error call is used
