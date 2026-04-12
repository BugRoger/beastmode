@file-permission-hooks
Feature: File permission hooks written to settings.local.json with path filtering

  The CLI writes PreToolUse prompt hooks for Write and Edit tools with `if`-field
  conditions that restrict firing to `.claude/**` paths. Hooks are written at
  dispatch time and cleaned between dispatches, following the same lifecycle as
  HITL AskUserQuestion hooks.

  Background:
    Given the initial epic slug is "fp-hook-epic"
    And a manifest is seeded for slug "fp-hook-epic"
    And the config has file-permissions claude-settings set to "auto-allow all changes"

  Scenario: Write and Edit hooks have if-field conditions for path filtering

    When the dispatch will write a design artifact:
      | field     | value         |
      | phase     | design        |
      | epic-slug | fp-hook       |
      | problem   | Test problem  |
      | solution  | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a file-permission PreToolUse hook for "Write"
    And the worktree settings should contain a file-permission PreToolUse hook for "Edit"
    And the file-permission hook for "Write" should have an if-condition for ".claude" paths
    And the file-permission hook for "Edit" should have an if-condition for ".claude" paths

  Scenario: File-permission hooks coexist with HITL AskUserQuestion hooks

    When the dispatch will write a design artifact:
      | field     | value         |
      | phase     | design        |
      | epic-slug | fp-coexist    |
      | problem   | Test problem  |
      | solution  | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a command-type PreToolUse hook for "design"
    And the worktree settings should contain a file-permission PreToolUse hook for "Write"
    And the worktree settings should contain a file-permission PreToolUse hook for "Edit"

  Scenario: File-permission hooks are cleaned between dispatches

    When the dispatch will write a design artifact:
      | field     | value        |
      | phase     | design       |
      | epic-slug | fp-clean     |
      | problem   | Test problem |
      | solution  | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a file-permission PreToolUse hook for "Write"

    When the dispatch will write plan artifacts:
      | feature | wave | description |
      | feat-1  | 1    | Feature 1   |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a file-permission PreToolUse hook for "Write"
    And the worktree settings should not contain stale file-permission hooks

  Scenario: Custom settings survive file-permission hook clean/write cycles

    Given the worktree has a custom setting "myFlag" with value "keep-me"

    When the dispatch will write a design artifact:
      | field     | value         |
      | phase     | design        |
      | epic-slug | fp-preserve   |
      | problem   | Test problem  |
      | solution  | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should preserve custom setting "myFlag"
