@file-permission-hooks
Feature: File permissions config section in config.yaml

  The `file-permissions:` section in config.yaml holds category-based prose
  that controls how file permission dialogs are handled. Each category maps
  to a set of file paths. The initial category is `claude-settings` covering
  `.claude/**` paths. When no prose is configured, behavior defaults to
  "always defer to human".

  Scenario: Config with file-permissions prose is loaded and available at dispatch

    Given the initial epic slug is "fp-config-epic"
    And a manifest is seeded for slug "fp-config-epic"
    And the config has file-permissions claude-settings set to "auto-allow all changes"

    When the dispatch will write a design artifact:
      | field     | value         |
      | phase     | design        |
      | epic-slug | fp-config     |
      | problem   | Test problem  |
      | solution  | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a file-permission PreToolUse hook for "claude-settings"
    And the file-permission hook prompt should contain "auto-allow all changes"

  Scenario: Missing file-permissions config defaults to defer-to-human

    Given the initial epic slug is "fp-default-epic"
    And a manifest is seeded for slug "fp-default-epic"
    And the config has no file-permissions section

    When the dispatch will write a design artifact:
      | field     | value        |
      | phase     | design       |
      | epic-slug | fp-default    |
      | problem   | Test problem |
      | solution  | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a file-permission PreToolUse hook for "claude-settings"
    And the file-permission hook prompt should contain "always defer to human"

  Scenario: File-permissions config is category-based, not phase-based

    Given the initial epic slug is "fp-phase-epic"
    And a manifest is seeded for slug "fp-phase-epic"
    And the config has file-permissions claude-settings set to "auto-allow skill edits"

    When the dispatch will write a design artifact:
      | field     | value        |
      | phase     | design       |
      | epic-slug | fp-phase     |
      | problem   | Test problem |
      | solution  | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the file-permission hook prompt should contain "auto-allow skill edits"

    When the dispatch will write plan artifacts:
      | feature | wave | description |
      | feat-1  | 1    | Feature 1   |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the file-permission hook prompt should contain "auto-allow skill edits"
