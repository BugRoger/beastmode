@dead-man-switch
Feature: Crashed session detection -- dead iTerm2 sessions detected automatically

  The watch loop checks liveness of dispatched sessions on each scan cycle.
  A session whose terminal process has exited is classified as dead. Detection
  happens at the watch loop level, not inside the session itself.

  Background:
    Given epic "auth-system" with features:
      | feature       | wave |
      | auth-provider | 1    |
    And the watch loop is initialized

  Scenario: Session that exits cleanly is not flagged as dead
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the active session for "auth-system" completes successfully
    Then no session-dead event should be emitted for "auth-system"

  Scenario: Session whose terminal process has exited is detected as dead
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    And the watch loop ticks
    Then the session for "auth-system" should be classified as dead

  Scenario: Session that is still running is not classified as dead
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    Then the session for "auth-system" should be classified as alive
    And no session-dead event should be emitted for "auth-system"
