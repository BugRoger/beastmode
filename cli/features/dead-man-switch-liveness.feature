@dead-man-switch
Feature: Instrumentation-free liveness detection -- no session-side changes required

  Liveness detection works by checking whether the terminal process associated
  with a dispatched session still exists. No heartbeat file, no IPC channel,
  no agent-side probe. Existing skills and agents run unmodified.

  Background:
    Given epic "auth-system" with features:
      | feature       | wave |
      | auth-provider | 1    |
    And the watch loop is initialized

  Scenario: Liveness check uses only the terminal process identifier
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    Then the liveness check for "auth-system" should use only the session process identifier
    And no heartbeat file should exist for "auth-system"

  Scenario: Session that produces no output is still detected as alive while process runs
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the session for "auth-system" produces no output for an extended period
    And the terminal process for "auth-system" is still running
    Then the session for "auth-system" should be classified as alive

  Scenario: Session detected as dead only after process actually exits
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    Then the session for "auth-system" should be classified as dead
    And the classification should not depend on session output or artifacts
