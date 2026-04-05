@logging-cleanup
Feature: Logger interface exposes exactly four log levels

  The Logger interface provides debug, info, warn, and error methods.
  The old six-level API (log, detail, debug, trace, warn, error) is
  replaced by four levels. The child() method for scoped context
  merging is retained.

  Scenario: Logger exposes debug, info, warn, and error methods
    Given a logger is created
    Then the logger has an "info" method
    And the logger has a "debug" method
    And the logger has a "warn" method
    And the logger has an "error" method
    And the logger has a "child" method

  Scenario: Logger does not expose removed methods
    Given a logger is created
    Then the logger does not have a "log" method
    And the logger does not have a "detail" method
    And the logger does not have a "trace" method

  Scenario: Child logger exposes the same four-level interface
    Given a logger is created with epic context "my-epic"
    When the logger creates a child with feature context "auth"
    Then the child logger has an "info" method
    And the child logger has a "debug" method
    And the child logger has a "warn" method
    And the child logger has an "error" method
    And the child logger has a "child" method
