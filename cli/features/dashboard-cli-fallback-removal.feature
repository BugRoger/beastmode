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
