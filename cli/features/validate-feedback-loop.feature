# cli/features/validate-feedback-loop.feature
Feature: Validate re-dispatches only failing features for re-implement cycles

  When validation identifies failing features, the validate phase
  re-dispatches only those specific features for a complete
  re-implementation cycle (not a full epic regression). Each feature
  gets a maximum of two re-implement cycles. Passing features
  retain their completed status.

  Scenario: Validate identifies and re-dispatches only the failing feature

    # -- Phase 1: Design --
    Given the initial epic slug is "hex0c3d4e"
    And a manifest is seeded for slug "hex0c3d4e"

    When the dispatch will write a design artifact:
      | field     | value                          |
      | phase     | design                         |
      | epic-slug | hex0c3d4e                      |
      | problem   | Cross-feature integration      |
      | solution  | Targeted re-dispatch           |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the manifest slug should be "auth-flow"
    And the manifest phase should be "plan"

    # -- Phase 2: Plan with two features --
    When the dispatch will write plan artifacts:
      | feature        | wave | description              |
      | auth-provider  | 1    | OAuth2 provider setup    |
      | token-cache    | 1    | Token caching layer      |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the manifest phase should be "implement"
    And the manifest should have 2 features

    # -- Phase 3: Implement both features --
    When the dispatch will write an implement artifact for feature "auth-provider"
    And the pipeline runs the "implement" phase for feature "auth-provider"
    Then the pipeline result should be successful
    And feature "auth-provider" should have status "completed"

    When the dispatch will write an implement artifact for feature "token-cache"
    And the pipeline runs the "implement" phase for feature "token-cache"
    Then the pipeline result should be successful
    And feature "token-cache" should have status "completed"
    And the manifest phase should be "validate"

    # -- Phase 4a: Validate with token-cache failing --
    When the dispatch will write a validate artifact with failures:
      | feature       | result |
      | auth-provider | passed |
      | token-cache   | failed |
    And the pipeline runs the "validate" phase
    Then the pipeline result should be successful
    And the manifest phase should be "implement"
    And feature "auth-provider" should have status "completed"
    And feature "token-cache" should have status "pending"

    # -- Phase 3b: Re-implement only token-cache --
    When the dispatch will write an implement artifact for feature "token-cache"
    And the pipeline runs the "implement" phase for feature "token-cache"
    Then the pipeline result should be successful
    And feature "token-cache" should have status "completed"
    And the manifest phase should be "validate"

    # -- Phase 4b: Re-validate — all pass --
    When the dispatch will write a validate artifact with status "passed"
    And the pipeline runs the "validate" phase
    Then the pipeline result should be successful
    And the manifest phase should be "release"


  Scenario: Maximum of two re-dispatch cycles per feature

    # -- Phase 1: Design --
    Given the initial epic slug is "hex1a2b3c"
    And a manifest is seeded for slug "hex1a2b3c"

    When the dispatch will write a design artifact:
      | field     | value             |
      | phase     | design            |
      | epic-slug | hex1a2b3c         |
      | problem   | Persistent failure        |
      | solution  | Budget exhaustion         |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the manifest slug should be "stubborn-epic"

    # -- Phase 2: Plan --
    When the dispatch will write plan artifacts:
      | feature    | wave | description       |
      | flaky-feat | 1    | Unreliable feature |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful

    # -- Phase 3a: Implement --
    When the dispatch will write an implement artifact for feature "flaky-feat"
    And the pipeline runs the "implement" phase for feature "flaky-feat"
    Then the pipeline result should be successful

    # -- Phase 4a: Validate fail #1 --
    When the dispatch will write a validate artifact with failures:
      | feature    | result |
      | flaky-feat | failed |
    And the pipeline runs the "validate" phase
    Then the pipeline result should be successful
    And the manifest phase should be "implement"
    And feature "flaky-feat" should have reDispatchCount 1

    # -- Phase 3b: Re-implement #1 --
    When the dispatch will write an implement artifact for feature "flaky-feat"
    And the pipeline runs the "implement" phase for feature "flaky-feat"
    Then the pipeline result should be successful

    # -- Phase 4b: Validate fail #2 --
    When the dispatch will write a validate artifact with failures:
      | feature    | result |
      | flaky-feat | failed |
    And the pipeline runs the "validate" phase
    Then the pipeline result should be successful
    And the manifest phase should be "implement"
    And feature "flaky-feat" should have reDispatchCount 2

    # -- Phase 3c: Re-implement #2 --
    When the dispatch will write an implement artifact for feature "flaky-feat"
    And the pipeline runs the "implement" phase for feature "flaky-feat"
    Then the pipeline result should be successful

    # -- Phase 4c: Validate fail #3 — budget exhausted --
    When the dispatch will write a validate artifact with failures:
      | feature    | result |
      | flaky-feat | failed |
    And the pipeline runs the "validate" phase
    Then the pipeline result should be successful
    And the manifest phase should be "implement"
    And feature "flaky-feat" should have status "blocked"
