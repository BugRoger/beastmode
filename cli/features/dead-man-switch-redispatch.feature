@dead-man-switch
Feature: Dead session re-dispatch -- crashed sessions recover on next scan cycle

  When a session is detected as dead, the watch loop re-dispatches the same
  phase and feature on the next scan cycle. The epic resumes from where it
  was before the crash, not from the beginning of the pipeline.

  Background:
    Given epic "data-pipeline" with features:
      | feature   | wave |
      | ingestion | 1    |
      | transform | 2    |
    And the watch loop is initialized

  Scenario: Dead session is re-dispatched on next scan cycle
    When epic "data-pipeline" is seeded in "design" phase with next action "implement" type "fan-out"
    And the watch loop ticks
    And a session is dispatched for "data-pipeline" implement feature "ingestion"
    And the terminal process for feature "ingestion" of "data-pipeline" exits unexpectedly
    And the watch loop ticks
    Then a new session should be dispatched for "data-pipeline" implement feature "ingestion"

  Scenario: Re-dispatched session runs the same phase as the crashed session
    When epic "data-pipeline" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "data-pipeline" exits unexpectedly
    And the watch loop ticks
    Then the re-dispatched session should be for the "plan" phase of "data-pipeline"
    And the manifest phase for "data-pipeline" should still be "design"

  Scenario: Re-dispatched session completes successfully after crash
    When epic "data-pipeline" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "data-pipeline" exits unexpectedly
    And the watch loop ticks
    And the active session for "data-pipeline" completes successfully
    Then the manifest phase for "data-pipeline" should advance past "plan"
