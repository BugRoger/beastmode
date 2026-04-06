---
phase: plan
slug: 814b3b
epic: cli-hook-commands
feature: hooks-command
wave: 1
---

# hooks-command

**Design:** `.beastmode/artifacts/design/2026-04-06-814b3b.md`

## User Stories

1. As a developer on a different machine, I want hooks to resolve through the CLI binary on PATH, so that worktree sessions don't fail due to hardcoded absolute paths.
3. As a developer, I want a `beastmode hooks` subcommand that dispatches to `hitl-auto`, `hitl-log`, and `generate-output`, so that each hook has a stable CLI entry point.
4. As the CLI codebase maintainer, I want hook `.ts` files to be pure library modules without `if(import.meta.main)` entry points, so that there's a single invocation path through the CLI.
5. As the beastmode CLI, I want the `hooks` command to preserve the existing hook protocol (phase as argv, TOOL_INPUT/TOOL_OUTPUT as env vars), so that no hook logic needs to change.

## What to Build

A new `hooks` subcommand for the beastmode CLI that dispatches to hook handler functions.

**CLI dispatch module:** A new command module that accepts a hook name as a subcommand (`hitl-auto`, `hitl-log`, `generate-output`) and routes to the corresponding exported handler function. The dispatch preserves the existing hook protocol: phase as positional argv, TOOL_INPUT and TOOL_OUTPUT from environment variables. Unknown subcommands produce an error and non-zero exit.

**Command registration:** Register `hooks` as a utility command in the CLI argument parser and wire it into the main command switch in the entry point, alongside existing utility commands (dashboard, cancel, compact, etc.).

**Pure library modules:** Remove the `if(import.meta.main)` blocks from `hitl-auto.ts`, `hitl-log.ts`, and `generate-output.ts`. The logic currently inside those blocks moves into the dispatch module — it becomes the sole entry point. The existing exported functions (`decideResponse`, `routeAndFormat`, `generateAll`, etc.) remain unchanged.

**Cross-cutting constraint:** Invocation pattern is `bunx beastmode hooks <name> [phase]` — not bare `beastmode` — to handle environments where the CLI isn't globally linked.

## Integration Test Scenarios

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

## Acceptance Criteria

- [ ] `beastmode hooks hitl-auto <phase>` invokes the HITL auto-answer handler with correct phase and env vars
- [ ] `beastmode hooks hitl-log <phase>` invokes the HITL log handler with correct phase and env vars
- [ ] `beastmode hooks generate-output` invokes the output generator
- [ ] `beastmode hooks <unknown>` exits non-zero with an error message
- [ ] `hitl-auto.ts`, `hitl-log.ts`, and `generate-output.ts` contain no `import.meta.main` blocks
- [ ] `hooks` appears in CLI help output
- [ ] Existing unit tests for hook logic modules continue to pass unchanged
- [ ] New dispatch test verifies routing for all three subcommands
