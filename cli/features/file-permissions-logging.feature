@file-permission-hooks
Feature: File permission decisions logged to HITL log

  File permission decisions (auto-allow, auto-deny, deferred) are logged via a
  PostToolUse command hook to the same HITL log file used for AskUserQuestion
  decisions. This enables retro analysis across both decision types in a
  unified view.

  Scenario: PostToolUse log hook is written for file permission decisions

    Given the initial epic slug is "fp-log-epic"
    And a manifest is seeded for slug "fp-log-epic"
    And the config has file-permissions claude-settings set to "auto-allow all changes"

    When the dispatch will write a design artifact:
      | field     | value         |
      | phase     | design        |
      | epic-slug | fp-log        |
      | problem   | Test problem  |
      | solution  | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a file-permission PostToolUse hook
    And the file-permission PostToolUse hook should log to the HITL log

  Scenario: File permission log entries include tool name and file path

    Given the initial epic slug is "fp-logentry-epic"
    And a manifest is seeded for slug "fp-logentry-epic"
    And the config has file-permissions claude-settings set to "auto-allow all changes"

    When a file permission decision is logged for tool "Write" on path ".claude/settings.local.json" with decision "auto-allow"
    Then the HITL log should contain an entry for tool "Write"
    And the HITL log entry should include the file path ".claude/settings.local.json"
    And the HITL log entry should include the decision "auto-allow"

  Scenario: File permission log entries coexist with HITL question-answering entries

    Given the initial epic slug is "fp-mixed-epic"
    And a manifest is seeded for slug "fp-mixed-epic"
    And the config has file-permissions claude-settings set to "auto-allow all changes"

    When a HITL question-answering decision is logged with tag "auto"
    And a file permission decision is logged for tool "Edit" on path ".claude/agents/impl.md" with decision "auto-allow"
    Then the HITL log should contain both question-answering and file-permission entries
