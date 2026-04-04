@dead-man-switch
Feature: Session isolation during recovery -- only the crashed session is affected

  When one session dies in a multi-epic watch loop, other sessions for
  different epics and features continue running unaffected. Recovery
  targets only the specific crashed session.

  Scenario: Other epic sessions continue when one epic's session dies
    Given epic "auth-system" with features:
      | feature       | wave |
      | auth-provider | 1    |
    And epic "data-pipeline" with features:
      | feature   | wave |
      | ingestion | 1    |
    And the watch loop is initialized
    When both epics are seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    And the watch loop ticks
    Then the session for "data-pipeline" should still be active
    And a new session should be dispatched for "auth-system" plan phase

  Scenario: Other feature sessions within same epic continue when one feature session dies
    Given epic "auth-system" with features:
      | feature       | wave |
      | auth-provider | 1    |
      | login-flow    | 1    |
    And the watch loop is initialized
    When epic "auth-system" is seeded in "design" phase with next action "implement" type "fan-out"
    And the watch loop ticks
    And the terminal process for feature "auth-provider" of "auth-system" exits unexpectedly
    And the watch loop ticks
    Then the session for feature "login-flow" of "auth-system" should still be active
    And a new session should be dispatched for "auth-system" implement feature "auth-provider"

  Scenario: Multiple simultaneous crashes are each recovered independently
    Given epic "auth-system" with features:
      | feature       | wave |
      | auth-provider | 1    |
    And epic "data-pipeline" with features:
      | feature   | wave |
      | ingestion | 1    |
    And the watch loop is initialized
    When both epics are seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    And the terminal process for "data-pipeline" exits unexpectedly
    And the watch loop ticks
    Then a new session should be dispatched for "auth-system" plan phase
    And a new session should be dispatched for "data-pipeline" plan phase
