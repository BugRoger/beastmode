@logging-cleanup
Feature: Logger entries carry structured data alongside messages

  Each log method accepts an optional key-value data object in addition
  to the message string. The resulting LogEntry record includes level,
  timestamp, message, data, and context fields. Sinks receive the
  complete LogEntry.

  Scenario: Log entry includes message and structured data
    Given a logger is created
    When the logger emits an info message "File written" with data:
      | key      | value              |
      | path     | .beastmode/out.md  |
      | duration | 42                 |
    Then the sink receives a log entry with message "File written"
    And the log entry data contains key "path" with value ".beastmode/out.md"
    And the log entry data contains key "duration" with value "42"

  Scenario: Log entry without data has empty data field
    Given a logger is created
    When the logger emits an info message "Started" without data
    Then the sink receives a log entry with message "Started"
    And the log entry data is empty

  Scenario: Log entry preserves context fields
    Given a logger is created with context:
      | field   | value     |
      | phase   | implement |
      | epic    | my-epic   |
      | feature | auth      |
    When the logger emits an info message "Checkpoint"
    Then the log entry context has phase "implement"
    And the log entry context has epic "my-epic"
    And the log entry context has feature "auth"

  Scenario Outline: Each log level produces entries with the correct level field
    Given a logger is created
    When the logger emits a <level> message "test"
    Then the sink receives a log entry with level "<level>"

    Examples:
      | level |
      | debug |
      | info  |
      | warn  |
      | error |
