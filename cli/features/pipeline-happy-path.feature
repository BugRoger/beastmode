Feature: Pipeline happy path -- design to release

  The beastmode pipeline advances an epic through five phases:
  design, plan, implement, validate, and release. Each phase
  runs a dispatch function (normally a Claude session), writes
  markdown artifacts with YAML frontmatter, generates output.json
  via the stop hook, and reconciles the manifest via the XState
  state machine. The pipeline completes when the manifest reaches
  the "done" terminal state.

  This feature exercises the entire pipeline end-to-end with a
  mock dispatch function replacing Claude. All other components
  (git worktrees, manifest store, stop hook, XState reconciliation)
  run against a real temporary git repository.

  Scenario: Full epic lifecycle -- design through release

    # -- Phase 1: Design --
    Given the initial epic slug is "abc123"
    And a manifest is seeded for slug "abc123"

    When the dispatch will write a design artifact:
      | field     | value                              |
      | phase     | design                             |
      | epic-slug | abc123                             |
      | problem   | Users cannot authenticate via OAuth |
      | solution  | Add OAuth2 flow with PKCE          |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the manifest slug should be "widget-auth"
    And the manifest phase should be "plan"
    And the manifest summary problem should be "Users cannot authenticate via OAuth"

    # -- Phase 2: Plan --
    When the dispatch will write plan artifacts:
      | feature        | wave | description                |
      | oauth-provider | 1    | Configure OAuth2 provider  |
      | login-flow     | 1    | Implement login redirect   |
      | token-refresh  | 2    | Handle token refresh logic |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the manifest phase should be "implement"
    And the manifest should have 3 features
    And all features should have status "pending"

    # -- Phase 3: Implement (feature fan-out) --
    When the dispatch will write an implement artifact for feature "oauth-provider"
    And the pipeline runs the "implement" phase for feature "oauth-provider"
    Then the pipeline result should be successful
    And feature "oauth-provider" should have status "completed"
    And the manifest phase should be "implement"

    When the dispatch will write an implement artifact for feature "login-flow"
    And the pipeline runs the "implement" phase for feature "login-flow"
    Then the pipeline result should be successful
    And feature "login-flow" should have status "completed"
    And the manifest phase should be "implement"

    When the dispatch will write an implement artifact for feature "token-refresh"
    And the pipeline runs the "implement" phase for feature "token-refresh"
    Then the pipeline result should be successful
    And feature "token-refresh" should have status "completed"
    And the manifest phase should be "validate"

    # -- Phase 4: Validate --
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
