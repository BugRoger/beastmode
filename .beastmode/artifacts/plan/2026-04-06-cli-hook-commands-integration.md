---
phase: plan
type: integration
epic: cli-hook-commands
slug: 814b3b
date: 2026-04-06
---

# Integration Test Artifact: cli-hook-commands

## New Scenarios

### Feature: hooks-command

Covers user stories [1, 3, 4, 5].

```gherkin
@cli-hook-commands
Feature: CLI hooks subcommand dispatches to hook modules

  The `beastmode hooks` command provides stable CLI entry points for
  each hook: hitl-auto, hitl-log, and generate-output. Hook modules
  are pure library exports with no standalone entry points. The CLI
  preserves the existing hook protocol: phase as positional argument,
  TOOL_INPUT and TOOL_OUTPUT as environment variables.

  Scenario: hooks hitl-auto dispatches to the HITL auto-answer handler
    Given the HITL config prose for "implement" is "approve all tool calls without asking"
    When the hooks command is invoked with subcommand "hitl-auto" and phase "implement"
    Then the HITL auto-answer handler should execute for phase "implement"
    And the handler should produce a JSON auto-answer response

  Scenario: hooks hitl-log dispatches to the HITL log handler
    Given a HITL decision was made for phase "design"
    When the hooks command is invoked with subcommand "hitl-log" and phase "design"
    Then the HITL log handler should execute for phase "design"

  Scenario: hooks generate-output dispatches to the output generator
    When the hooks command is invoked with subcommand "generate-output"
    Then the output generator handler should execute

  Scenario: hooks command preserves phase as positional argument
    When the hooks command is invoked with subcommand "hitl-auto" and phase "plan"
    Then the handler should receive "plan" as the phase argument

  Scenario: hooks command preserves TOOL_INPUT environment variable
    Given the TOOL_INPUT environment variable contains a tool use payload
    When the hooks command is invoked with subcommand "hitl-auto" and phase "design"
    Then the handler should have access to the TOOL_INPUT value

  Scenario: hooks command preserves TOOL_OUTPUT environment variable
    Given the TOOL_OUTPUT environment variable contains a tool result payload
    When the hooks command is invoked with subcommand "hitl-log" and phase "implement"
    Then the handler should have access to the TOOL_OUTPUT value

  Scenario Outline: hooks command routes each subcommand to its handler
    When the hooks command is invoked with subcommand "<hook>"
    Then the "<hook>" handler should execute

    Examples:
      | hook             |
      | hitl-auto        |
      | hitl-log         |
      | generate-output  |

  Scenario: hooks command rejects unknown subcommands
    When the hooks command is invoked with subcommand "nonexistent"
    Then the command should fail with an unrecognized subcommand error

  Scenario: hook modules have no standalone entry points
    Given the hook source modules for hitl-auto, hitl-log, and generate-output
    Then none of the modules should contain a main-guard entry point
    And each module should export its handler as a library function
```

### Feature: portable-settings

Covers user stories [2].

```gherkin
@cli-hook-commands
Feature: Settings generation uses portable CLI-based hook commands

  The pipeline runner generates settings.local.json with hook commands
  that use `bunx beastmode hooks <name>` instead of absolute file paths.
  This ensures hook invocations are portable across machines, worktrees,
  and installation paths.

  Scenario: Generated PreToolUse hook uses CLI-based command
    Given HITL settings are generated for phase "design"
    Then the PreToolUse hook command should invoke hooks through the CLI
    And the hook command should not contain an absolute file path

  Scenario: Generated PostToolUse hook uses CLI-based command
    Given HITL settings are generated for phase "plan"
    Then the PostToolUse hook command should invoke hooks through the CLI
    And the hook command should not contain an absolute file path

  Scenario: Generated Stop hook uses CLI-based command
    Given HITL settings are generated for phase "implement"
    Then the Stop hook command should invoke hooks through the CLI
    And the hook command should not contain an absolute file path

  Scenario: Generated settings contain no absolute paths to hook scripts
    Given a complete settings.local.json is generated for phase "design"
    Then no hook command in the settings should reference an absolute file path
    And all command-type hooks should use the portable CLI invocation pattern

  Scenario: File-permission PostToolUse hooks also use CLI-based command
    Given file-permission PostToolUse hooks are generated for phase "implement"
    Then the file-permission PostToolUse hook command should invoke hooks through the CLI
    And the hook command should not contain an absolute file path

  Scenario: Prompt-type hooks are unaffected by the CLI migration
    Given a complete settings.local.json is generated for phase "design"
    Then file-permission PreToolUse prompt hooks should remain prompt-type
    And prompt-type hooks should not reference the CLI hooks command

  Scenario Outline: Hook commands include the correct phase argument
    Given HITL settings are generated for phase "<phase>"
    Then the PreToolUse hook command should include "<phase>" as an argument
    And the PostToolUse hook command should include "<phase>" as an argument

    Examples:
      | phase     |
      | design    |
      | plan      |
      | implement |
      | validate  |
      | release   |
```

## Modified Scenarios

### absolute-hook-paths.feature -- all scenarios

**File:** `cli/features/absolute-hook-paths.feature`

The entire feature tested that hook commands contain absolute paths to `.ts` script files. The cli-hook-commands epic reverses this: hooks now resolve through the CLI binary, not absolute paths. The behavioral intent of "hooks work regardless of environment" is preserved, but the mechanism is inverted. The existing scenarios assert the wrong thing under the new design.

However, the replacement behavior is fully covered by the new `portable-settings` feature scenarios above (specifically "Generated settings contain no absolute paths to hook scripts" and the per-hook CLI invocation scenarios). Rather than modifying these scenarios, they should be deleted. See Deleted Scenarios below.

### static-hitl-hooks.feature -- Scenario: Hook builder produces command-type entry for AskUserQuestion

**File:** `cli/features/static-hitl-hooks.feature`

**What changed:** The scenario's behavioral assertion ("the AskUserQuestion PreToolUse hook should be command-type") remains valid. The step definition will need to verify the new CLI-based command format rather than the old absolute-path format, but the Gherkin itself is declarative enough to survive unchanged.

No Gherkin modification required. Step definitions may need updates, but that is the implementer's responsibility.

### static-hitl-hooks.feature -- Scenario: Command-type hook includes phase argument

**File:** `cli/features/static-hitl-hooks.feature`

**What changed:** Same as above. The assertion "the hook command should include the phase 'plan' as an argument" is format-agnostic. No Gherkin modification required.

## Deleted Scenarios

### absolute-hook-paths.feature -- all five scenarios

**File:** `cli/features/absolute-hook-paths.feature`

**Scenarios to delete:**
1. `HITL PreToolUse hook command path is absolute`
2. `HITL PostToolUse hook command path is absolute`
3. `Stop hook command path is absolute`
4. `Hook paths point to existing script files`
5. `File-permission PostToolUse hook command paths are absolute`

**Why obsolete:** The entire feature asserts that hook commands contain absolute paths to `.ts` files and that those files exist on disk. User story 1 of the cli-hook-commands epic explicitly replaces this approach: hooks now resolve through the CLI binary on PATH via `bunx beastmode hooks <name>`. Absolute paths to script files are the problem this epic solves. The replacement behavior (portable CLI-based commands, no absolute paths) is covered by the new `portable-settings` feature scenarios.
