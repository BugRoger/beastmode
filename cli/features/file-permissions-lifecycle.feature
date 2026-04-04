@file-permission-hooks
Feature: File permission hook lifecycle across pipeline phases

  File-permission hooks follow the same dispatch lifecycle as HITL hooks:
  written before dispatch, cleaned between dispatches. The hooks persist
  the same category prose regardless of which phase is executing, because
  file-permission config is category-based, not phase-based.

  Scenario: File permission hooks persist correct prose across design and plan phases

    Given the initial epic slug is "fp-lifecycle-epic"
    And a manifest is seeded for slug "fp-lifecycle-epic"
    And the config has file-permissions claude-settings set to "auto-allow plugin config writes"

    When the dispatch will write a design artifact:
      | field    | value              |
      | phase    | design             |
      | slug     | fp-lifecycle       |
      | epic     | fp-lifecycle       |
      | problem  | Test problem       |
      | solution | Test solution      |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the file-permission hook prompt should contain "auto-allow plugin config writes"
    And the worktree settings should contain a PreToolUse hook for "design"

    When the dispatch will write plan artifacts:
      | feature | wave | description |
      | feat-1  | 1    | Feature 1   |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the file-permission hook prompt should contain "auto-allow plugin config writes"
    And the worktree settings should contain a PreToolUse hook for "plan"

  Scenario: Dispatch failure does not leave stale file-permission hooks

    Given the initial epic slug is "fp-fail-epic"
    And a manifest is seeded for slug "fp-fail-epic"
    And the config has file-permissions claude-settings set to "auto-allow all changes"

    When the dispatch will fail
    And the pipeline runs the "plan" phase
    Then the pipeline result should be failure
    And the pipeline should not throw
