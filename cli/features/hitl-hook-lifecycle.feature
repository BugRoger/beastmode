Feature: HITL hook lifecycle -- settings written before dispatch, cleaned between phases

  The pipeline writes HITL settings (PreToolUse command hook + PostToolUse log hook)
  to the worktree's `.claude/settings.local.json` before dispatch, and cleans them
  between dispatches.

  Pipeline step 3 does:
  1. cleanHitlSettings(claudeDir) — removes old HITL hooks
  2. buildPreToolUseHook(phase) — builds command hook entry
  3. writeHitlSettings({claudeDir, preToolUseHook, phase}) — writes to settings.local.json

  This feature verifies:
  - HITL settings exist during dispatch for each phase
  - Settings contain correct command-type hook with phase argument
  - Settings are cleaned and rewritten between consecutive phases
  - Non-HITL settings survive the clean/write cycles

  Scenario: Plan phase has correct HITL settings with plan prose

    Given the initial epic slug is "hitl-epic"
    And a manifest is seeded for slug "hitl-epic"

    When the dispatch will write plan artifacts:
      | feature | wave | description |
      | feat-1  | 1    | Feature 1   |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a command-type PreToolUse hook for "plan"


  Scenario: HITL settings are phase-specific across consecutive phases

    Given the initial epic slug is "phase-specific-epic"
    And a manifest is seeded for slug "phase-specific-epic"

    When the dispatch will write a design artifact:
      | field     | value           |
      | phase     | design          |
      | epic-slug | phase-specific  |
      | problem   | Test problem    |
      | solution  | Test solution   |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a command-type PreToolUse hook for "design"

    When the dispatch will write plan artifacts:
      | feature | wave | description |
      | feat-1  | 1    | Feature 1   |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a command-type PreToolUse hook for "plan"


  Scenario: Custom settings survive HITL clean/write cycles

    Given the initial epic slug is "custom-settings-epic"
    And a manifest is seeded for slug "custom-settings-epic"
    And the worktree has a custom setting "myCustom" with value "preserved"

    When the dispatch will write a design artifact:
      | field     | value        |
      | phase     | design       |
      | epic-slug | custom       |
      | problem   | Test problem |
      | solution  | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a command-type PreToolUse hook for "design"
    And the worktree settings should preserve custom setting "myCustom"
