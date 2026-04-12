Feature: Regression loop -- validate failure triggers targeted re-dispatch

  When validation identifies failing features, the XState reconciler sends a
  REGRESS_FEATURES event that resets only the failing features to pending
  status while passing features retain completed status. The manifest phase
  moves back to implement for re-dispatch of the failing features only.

  This feature exercises the targeted regression path: design → plan (with
  multiple features across waves) → implement all features → validate with
  partial failure → REGRESS_FEATURES resets only failing features →
  re-implement failing feature → re-validate with success → release → done.

  The pipeline result remains successful (dispatch succeeded), but the manifest
  phase changes back to "implement" and only failing feature statuses reset.

  Scenario: Validate failure triggers targeted regression, only failing feature resets

    # -- Phase 1: Design with slug rename --
    Given the initial epic slug is "hex0a1b2c"
    And a manifest is seeded for slug "hex0a1b2c"

    When the dispatch will write a design artifact:
      | field     | value                           |
      | phase     | design                          |
      | epic-slug | hex0a1b2c                       |
      | problem   | Complex OAuth integration       |
      | solution  | Streamlined auth service        |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the manifest slug should be "auth-flow"
    And the manifest phase should be "plan"

    # -- Phase 2: Plan with multi-wave features --
    When the dispatch will write plan artifacts:
      | feature      | wave | description                |
      | oauth-server | 1    | OAuth2 provider setup      |
      | client-lib   | 1    | Client library integration |
      | token-cache  | 2    | Token caching layer        |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the manifest phase should be "implement"
    And the manifest should have 3 features
    And all features should have status "pending"

    # -- Phase 3a: Implement wave 1 features --
    When the dispatch will write an implement artifact for feature "oauth-server"
    And the pipeline runs the "implement" phase for feature "oauth-server"
    Then the pipeline result should be successful
    And feature "oauth-server" should have status "completed"

    When the dispatch will write an implement artifact for feature "client-lib"
    And the pipeline runs the "implement" phase for feature "client-lib"
    Then the pipeline result should be successful
    And feature "client-lib" should have status "completed"

    # -- Phase 3b: Implement wave 2 features --
    When the dispatch will write an implement artifact for feature "token-cache"
    And the pipeline runs the "implement" phase for feature "token-cache"
    Then the pipeline result should be successful
    And feature "token-cache" should have status "completed"
    And the manifest phase should be "validate"

    # -- Phase 4a: Validate with FAILURE (token-cache fails) --
    When the dispatch will write a validate artifact with failures:
      | feature      | result |
      | oauth-server | passed |
      | client-lib   | passed |
      | token-cache  | failed |
    And the pipeline runs the "validate" phase
    Then the pipeline result should be successful
    And the pipeline result should indicate regression
    And the manifest phase should be "implement"
    And feature "oauth-server" should have status "completed"
    And feature "client-lib" should have status "completed"
    And feature "token-cache" should have status "pending"

    # -- Phase 3c: Re-implement only token-cache after regression --
    When the dispatch will write an implement artifact for feature "token-cache"
    And the pipeline runs the "implement" phase for feature "token-cache"
    Then the pipeline result should be successful
    And feature "token-cache" should have status "completed"
    And the manifest phase should be "validate"

    # -- Phase 4b: Re-validate with SUCCESS --
    When the dispatch will write a validate artifact with status "passed"
    And the pipeline runs the "validate" phase
    Then the pipeline result should be successful
    And the manifest phase should be "release"

    # -- Phase 5: Release --
    When the dispatch will write a release artifact with bump "minor"
    And the pipeline runs the "release" phase
    Then the pipeline result should be successful
    And the manifest phase should be "done"
    And the worktree should be cleaned up
