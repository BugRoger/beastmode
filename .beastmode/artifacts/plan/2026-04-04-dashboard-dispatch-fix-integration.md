# Integration Test Plan: dashboard-dispatch-fix

Epic: **dashboard-dispatch-fix**
Date: 2026-04-04

---

## Coverage Analysis

| User Story | Existing Coverage | Action |
|---|---|---|
| 1. Dispatch uses configured strategy (iTerm2/cmux/sdk) | None | New |
| 2. Event-based log panel status when SDK streaming unavailable | None | New |
| 3. Remove broken `claude --print` CLI fallback | None | New |
| 4. Press `v` to cycle log verbosity (info/detail/debug/trace) | None | New |
| 5. Show current verbosity level in key hints bar | None | New |
| 6. Dashboard and watch use same strategy selection logic | None | New |

Existing feature files reviewed (13 total):
- `cancel-flow.feature` -- cancellation lifecycle, not affected
- `dashboard-wiring-fix.feature` -- layout/panel wiring, not affected
- `design-slug-rename.feature` -- slug rename flow, not affected
- `file-permissions-config.feature` -- file permission config, not affected
- `file-permissions-hooks.feature` -- file permission hooks, not affected
- `file-permissions-lifecycle.feature` -- file permission lifecycle, not affected
- `file-permissions-logging.feature` -- file permission logging, not affected
- `hitl-hook-lifecycle.feature` -- HITL hook lifecycle, not affected
- `pipeline-error-resilience.feature` -- error resilience, not affected
- `pipeline-happy-path.feature` -- pipeline lifecycle, not affected
- `regression-loop.feature` -- regression flow, not affected
- `watch-loop-happy-path.feature` -- watch loop lifecycle, not affected
- `wave-failure.feature` -- wave ordering, not affected

No existing scenarios require modification or deletion.

---

## New Scenarios

### Feature: Dashboard dispatch strategy selection

```gherkin
@dashboard-dispatch-fix
Feature: Dashboard dispatches phases using configured strategy

  The dashboard must honor the operator's configured dispatch strategy
  (iTerm2, cmux, or sdk) when launching phase sessions. Dispatch should
  use the selected strategy rather than falling back to a broken default.

  Background:
    Given an epic is at phase "plan" and ready for dispatch

  Scenario Outline: Dashboard dispatches using the configured strategy
    Given the dispatch strategy is configured as "<strategy>"
    When the dashboard dispatches the next phase
    Then the phase session is launched using the "<strategy>" strategy
    And no fallback strategy is attempted

    Examples:
      | strategy |
      | iterm2   |
      | cmux     |
      | sdk      |

  Scenario: Dashboard reports dispatch failure when configured strategy is unavailable
    Given the dispatch strategy is configured as "iterm2"
    And the iterm2 strategy is not available on this system
    When the dashboard dispatches the next phase
    Then the dispatch fails with a clear strategy-unavailable error
    And no zombie session is created
```

### Feature: Event-based log panel status

```gherkin
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
```

### Feature: CLI fallback removal

```gherkin
@dashboard-dispatch-fix
Feature: Broken CLI fallback is removed from dispatch

  The broken `claude --print` CLI fallback must be removed entirely.
  Dispatch failures should surface cleanly as errors rather than
  silently spawning zombie sessions through the broken fallback path.

  Scenario: Dispatch does not attempt CLI print fallback
    Given the primary dispatch strategy fails
    When the dispatch error is handled
    Then no CLI print fallback is attempted
    And the failure is reported to the operator

  Scenario: Failed dispatch does not create zombie sessions
    Given the primary dispatch strategy fails
    When the dispatch error is handled
    Then no orphaned background sessions exist
    And the epic remains in its current phase

  Scenario: Dispatch failure surfaces a clear error message
    Given the primary dispatch strategy fails
    When the dispatch error is handled
    Then the error message identifies the failed strategy
    And the error message describes the failure reason
```

### Feature: Log verbosity cycling

```gherkin
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
```

### Feature: Verbosity indicator in key hints bar

```gherkin
@dashboard-dispatch-fix
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
    Then the key hints bar displays the verbosity level as "detail"

  Scenario: Key hints bar shows the verbosity toggle shortcut
    Given the dashboard is running
    Then the key hints bar includes a hint for the verbosity toggle key
    And the hint shows the current verbosity level
```

### Feature: Unified strategy selection across dashboard and watch

```gherkin
@dashboard-dispatch-fix
Feature: Dashboard and watch commands use identical strategy selection

  The dashboard command and the watch command must use the exact same
  strategy selection logic. An operator should get identical dispatch
  behavior regardless of which UI they choose to run.

  Background:
    Given an epic is at phase "plan" and ready for dispatch

  Scenario Outline: Same strategy is selected in both dashboard and watch
    Given the dispatch strategy is configured as "<strategy>"
    When the dashboard resolves the dispatch strategy
    And the watch command resolves the dispatch strategy
    Then both resolve to the "<strategy>" strategy

    Examples:
      | strategy |
      | iterm2   |
      | cmux     |
      | sdk      |

  Scenario: Strategy override in config affects both dashboard and watch
    Given the dispatch strategy is configured as "cmux"
    When the operator changes the strategy to "sdk"
    And the dashboard resolves the dispatch strategy
    And the watch command resolves the dispatch strategy
    Then both resolve to the "sdk" strategy

  Scenario: Missing strategy config produces same default in both contexts
    Given no dispatch strategy is configured
    When the dashboard resolves the dispatch strategy
    And the watch command resolves the dispatch strategy
    Then both resolve to the same default strategy

  Scenario: Invalid strategy config produces same error in both contexts
    Given the dispatch strategy is configured as "nonexistent"
    When the dashboard attempts to resolve the dispatch strategy
    And the watch command attempts to resolve the dispatch strategy
    Then both produce the same strategy-not-found error
```

---

## Modified Scenarios

None. No existing scenarios require modification for this epic.

---

## Deleted Scenarios

None. No existing scenarios are obsoleted by this epic.
