@dead-man-switch
Feature: Session-dead event logging -- dead sessions emit observable events

  When a dead session is detected, the watch loop emits a session-dead event
  that appears in the log stream and dashboard. The event includes enough
  context to identify which epic and phase were affected.

  Background:
    Given epic "auth-system" with features:
      | feature       | wave |
      | auth-provider | 1    |
    And the watch loop is initialized

  Scenario: Dead session emits a session-dead event
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    And the watch loop ticks
    Then a "session-dead" event should be emitted
    And the session-dead event should identify epic "auth-system"

  Scenario: Session-dead event includes the phase that was running
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    And the watch loop ticks
    Then the "session-dead" event should include the phase "plan"

  Scenario: Session-dead event is followed by a re-dispatch event
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    And the watch loop ticks
    Then a "session-dead" event should be emitted before the re-dispatch
    And a dispatch event should follow for epic "auth-system"

  Scenario: No session-dead event for sessions that complete normally
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the active session for "auth-system" completes successfully
    Then no "session-dead" event should be emitted
