Feature: Pipeline error resilience -- transient failures don't abort remaining steps

  The pipeline executes 9 steps in order:
  1. worktree.create
  2. rebase
  3. settings.clean + write (HITL)
  4. dispatch
  5. artifacts.collect
  6. reconcile
  7. tag
  8. github.mirror
  9. cleanup

  Error resilience means: if step 6 (reconcile) throws, steps 7-8 still run.
  If step 7 (tag) throws, step 8 still runs. Each step failing should not
  abort the pipeline.

  This feature tests:
  - Dispatch returning success: false doesn't crash the pipeline
  - Dispatch writing no artifacts doesn't crash the pipeline
  - Pipeline still returns failure gracefully instead of throwing

  Scenario: Dispatch failure returns early without throwing

    Given the initial epic slug is "failing-epic"
    And a manifest is seeded for slug "failing-epic"

    When the dispatch will fail
    And the pipeline runs the "plan" phase
    Then the pipeline result should be failure
    And the pipeline should not throw


  Scenario: Dispatch produces no output (abandonment)

    Given the initial epic slug is "abandon-epic"
    And a manifest is seeded for slug "abandon-epic"

    When the dispatch will produce no output
    And the pipeline runs the "design" phase
    Then the pipeline result should be failure
    And the pipeline should not throw


  Scenario: Failed validate produces regression but pipeline succeeds

    Given the initial epic slug is "regress-epic"
    And a manifest is seeded for slug "regress-epic"

    # Must run design first so manifest transitions to plan phase
    When the dispatch will write a design artifact:
      | field     | value        |
      | phase     | design       |
      | epic-slug | regress-epic |
      | problem   | Test problem |
      | solution  | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the manifest phase should be "plan"

    When the dispatch will write plan artifacts:
      | feature | wave | description    |
      | feat-a  | 1    | Feature A      |
      | feat-b  | 2    | Feature B      |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the manifest phase should be "implement"

    # Implement feature-a
    When the dispatch will write an implement artifact for feature "feat-a"
    And the pipeline runs the "implement" phase for feature "feat-a"
    Then the pipeline result should be successful

    # Implement feature-b
    When the dispatch will write an implement artifact for feature "feat-b"
    And the pipeline runs the "implement" phase for feature "feat-b"
    Then the pipeline result should be successful
    And the manifest phase should be "validate"

    # Validate with failure status triggers regression
    When the dispatch will write a validate artifact with failures:
      | feature | result |
      | feat-a  | passed |
      | feat-b  | failed |
    And the pipeline runs the "validate" phase
    Then the pipeline result should be successful
    And the manifest phase should be "implement"
    And feature "feat-a" should have status "completed"
    And feature "feat-b" should have status "pending"
