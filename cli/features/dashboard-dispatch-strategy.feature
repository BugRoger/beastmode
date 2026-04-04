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
