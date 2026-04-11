@cli-hook-commands
Feature: Settings generation uses portable CLI-based hook commands

  The pipeline runner generates settings.local.json with hook commands
  that use `bunx beastmode hooks <name>` instead of absolute file paths.
  This ensures hook invocations are portable across machines, worktrees,
  and installation paths.

  Scenario: Generated PreToolUse hook uses CLI-based command
    Given HITL settings are generated for phase "design"
    Then the PreToolUse hook command should contain "bunx beastmode hooks hitl-auto design"

  Scenario: Generated PostToolUse hook uses CLI-based command
    Given HITL settings are generated for phase "plan"
    Then the PostToolUse hook command should contain "bunx beastmode hooks hitl-log plan"

  Scenario: Generated Stop hook uses CLI-based command
    Given HITL settings are generated for phase "implement"
    Then the Stop hook command should contain "bunx beastmode hooks session-stop"

  Scenario: Generated settings contain no absolute paths to hook scripts
    Given a complete settings.local.json is generated for phase "design"
    Then no hook command in the settings should reference an absolute file path
    And all command-type hooks should use the portable CLI pattern "bunx beastmode hooks"

  Scenario: File-permission PostToolUse hooks also use CLI-based command
    Given file-permission PostToolUse hooks are generated for phase "implement"
    Then all file-permission PostToolUse hook commands should be "bunx beastmode hooks hitl-log implement"

  Scenario: Prompt-type hooks are unaffected by the CLI migration
    Given a complete settings.local.json is generated for phase "design"
    Then file-permission PreToolUse hooks should be prompt-type
    And prompt-type hooks should not contain "bunx beastmode hooks"

  Scenario Outline: Hook commands include the correct phase argument
    Given HITL settings are generated for phase "<phase>"
    Then the PreToolUse hook command should contain "bunx beastmode hooks hitl-auto <phase>"
    And the PostToolUse hook command should contain "bunx beastmode hooks hitl-log <phase>"

    Examples:
      | phase     |
      | design    |
      | plan      |
      | implement |
      | validate  |
      | release   |
