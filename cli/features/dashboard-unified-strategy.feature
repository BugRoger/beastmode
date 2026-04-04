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
