@logging-cleanup
Feature: Pluggable sink model behind a single LogSink interface

  All log transports implement a single LogSink interface with a
  write() method. The Logger delegates to its injected sink without
  duplicating gating logic. Adding a new transport means implementing
  one write() method.

  Scenario: Logger delegates to injected sink
    Given a logger is created with a mock sink
    When the logger emits an info message "hello"
    Then the mock sink receives exactly one log entry
    And the log entry message is "hello"
    And the log entry level is "info"

  Scenario: StdioSink writes info entries to standard output
    Given a logger is created with a StdioSink
    When the logger emits an info message "visible"
    Then the message appears on standard output

  Scenario: StdioSink writes warn entries to standard error
    Given a logger is created with a StdioSink
    When the logger emits a warn message "caution"
    Then the message appears on standard error

  Scenario: StdioSink suppresses debug entries at info verbosity
    Given a logger is created with a StdioSink at info verbosity
    When the logger emits a debug message "hidden"
    Then no output appears on standard output or standard error

  Scenario: DashboardSink routes entries to the dashboard entry store
    Given a logger is created with a DashboardSink
    When the logger emits an info message "update"
    Then the dashboard entry store contains the entry

  Scenario: TreeSink routes entries to the tree state
    Given a logger is created with a TreeSink
    And the logger has epic context "my-epic" and phase context "plan"
    When the logger emits an info message "tree entry"
    Then the tree state contains an entry under epic "my-epic" phase "plan"

  Scenario: Custom sink receives entries by implementing write()
    Given a custom sink implementing the LogSink interface
    And a logger is created with the custom sink
    When the logger emits an info message "custom"
    Then the custom sink write method is called with the log entry
