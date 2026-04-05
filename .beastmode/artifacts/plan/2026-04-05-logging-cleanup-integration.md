# Integration Test Artifact: logging-cleanup

**Epic:** logging-cleanup
**Date:** 2026-04-05

---

## Coverage Analysis

### Existing Test Coverage

| User Story | Existing Coverage | Status |
|---|---|---|
| US1: Single Logger with 4 levels | `logger.test.ts` tests 6 levels (log/detail/debug/trace/warn/error). `log-format.test.ts` tests 6-level label rendering. `tree-logger.test.ts` tests 6-level TreeLogger. | **Needs modification** -- all three test files use the old 6-level API. Must be updated to the new 4-level API (debug/info/warn/error). |
| US2: Structured data (msg + key-value pairs) | No existing coverage. Logger methods accept `(msg: string)` only. No tests for a `data` parameter or `LogEntry` records with structured fields. | **New scenarios needed** |
| US3: Hierarchical epic/feature filtering | `log-panel.test.ts` has a basic epic-slug filter test (`aggregate vs filtered mode`). No feature-level hierarchical filtering test. No test that filtering by epic includes its features. | **New scenarios needed** (partial overlap) |
| US4: Dashboard receives full log stream | `dashboard-verbosity-cycling.feature` tests verbosity cycling in the dashboard UI. `dashboard-event-log-panel.feature` tests dispatch lifecycle in the log panel. Neither tests that the dashboard receives the *full* stream and applies its own filtering independently from the CLI. | **New scenarios needed** |
| US5: Pluggable sink model | No existing coverage. LogSink, StdioSink, DashboardSink, TreeSink do not exist in the codebase yet. `tree-logger.test.ts` tests TreeLogger as a Logger implementation, not as a sink behind a unified Logger. | **New scenarios needed** |
| US6: Console.error/console.log migration | No BDD coverage. Grep found 6 console calls in non-script CLI code: `args.ts` (3), `compact.ts` (1), plus 2 in test files. | **New scenarios needed** |
| US7: Call site reclassification | No existing coverage. Design doc identifies one known misclassification: `watch-loop.ts` "State scan failed" uses error() but should be warn(). | **New scenarios needed** |

### Existing Feature Files Analyzed for Overlap

| Feature File | Relevance | Action |
|---|---|---|
| `dashboard-verbosity-cycling.feature` | Tests UI verbosity cycling (info/detail/debug/trace). The 4-level collapse changes the cycle to info/debug only. | **Needs modification** |
| `dashboard-verbosity-indicator.feature` | Tests key hints bar showing verbosity level. Level names change with the 4-level model. | **Needs modification** |
| `dashboard-event-log-panel.feature` | Tests dispatch lifecycle status in log panel. Independent of logging API -- no modification needed. | No change |
| `file-permissions-logging.feature` | Tests HITL log entries. Independent of Logger API -- no modification needed. | No change |

---

## New Scenarios

### US1: Single Logger Interface with Four Levels

```gherkin
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
```

### US2: Structured Log Data

```gherkin
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
```

### US3: Hierarchical Epic/Feature Filtering

```gherkin
@logging-cleanup
Feature: Logs can be filtered by epic and feature hierarchically

  Filtering by epic includes all entries from that epic and all its
  features. Filtering by a specific feature narrows to entries from
  that feature only. When no filter is active, all entries are visible.

  Background:
    Given a logger is created
    And the logger emits entries for multiple epics and features:
      | epic      | feature | message          |
      | dashboard | layout  | layout entry     |
      | dashboard | panel   | panel entry      |
      | dashboard |         | epic-level entry |
      | auth      | login   | login entry      |
      | auth      | token   | token entry      |

  Scenario: No filter shows all entries
    When no epic or feature filter is applied
    Then all five entries are visible

  Scenario: Filtering by epic includes all its features
    When the filter is set to epic "dashboard"
    Then the visible entries are:
      | message          |
      | layout entry     |
      | panel entry      |
      | epic-level entry |
    And entries from epic "auth" are not visible

  Scenario: Filtering by epic and feature narrows to that feature
    When the filter is set to epic "dashboard" and feature "layout"
    Then the visible entries are:
      | message      |
      | layout entry |
    And the "panel entry" is not visible
    And the "epic-level entry" is not visible

  Scenario: Filtering by a non-existent epic returns no entries
    When the filter is set to epic "nonexistent"
    Then no entries are visible
```

### US4: Dashboard Receives Full Log Stream

```gherkin
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
```

### US5: Pluggable Sink Model

```gherkin
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
```

### US6: Console.error/console.log Migration

```gherkin
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
```

### US7: Call Site Reclassification

```gherkin
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
```

---

## Modified Scenarios

### dashboard-verbosity-cycling.feature

**File:** `cli/features/dashboard-verbosity-cycling.feature`
**Reason:** The 4-level model collapses six levels to four. The verbosity cycle changes from info/detail/debug/trace to info/debug (only two meaningful thresholds per the design doc: "No graduated -vv/-vvv, only two meaningful thresholds with four levels"). The Scenario Outline examples table and the filtering scenario must be updated.

```gherkin
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
```

### dashboard-verbosity-indicator.feature

**File:** `cli/features/dashboard-verbosity-indicator.feature`
**Reason:** The verbosity indicator must reflect the new 2-level cycle (info/debug) instead of the old 4-level cycle (info/detail/debug/trace). The "detail" level no longer exists.

```gherkin
@logging-cleanup
Feature: Key hints bar displays current log verbosity level

  The dashboard key hints bar must show the current log verbosity level
  so the operator knows what level of detail they are viewing. The
  indicator updates when the verbosity level changes.

  Scenario: Key hints bar shows default verbosity level
    Given the dashboard is running
    When no verbosity changes have been made
    Then the key hints bar displays the verbosity level as "info"

  Scenario: Key hints bar updates when verbosity changes
    Given the dashboard is running
    And the current log verbosity level is "info"
    When the operator presses the verbosity toggle key
    Then the key hints bar displays the verbosity level as "debug"

  Scenario: Key hints bar shows the verbosity toggle shortcut
    Given the dashboard is running
    Then the key hints bar includes a hint for the verbosity toggle key
    And the hint shows the current verbosity level
```

---

## Deleted Scenarios

None. All existing feature files either remain unchanged or are modified in place. No existing behavioral scenarios are rendered obsolete by the logging cleanup -- they are updated to reflect the new 4-level model rather than removed.
