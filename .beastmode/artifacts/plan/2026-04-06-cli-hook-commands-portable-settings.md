---
phase: plan
slug: 814b3b
epic: cli-hook-commands
feature: portable-settings
wave: 1
---

# portable-settings

**Design:** `.beastmode/artifacts/design/2026-04-06-814b3b.md`

## User Stories

2. As the pipeline runner, I want to generate settings.local.json with `bunx beastmode hooks <name>` commands, so that hook invocations are portable across environments.

## What to Build

Update the settings builder functions to emit portable CLI-based hook commands instead of absolute file paths.

**HITL settings builders:** The three builder functions (`buildPreToolUseHook`, `buildPostToolUseHook`, `buildStopHook`) currently use `resolve(import.meta.dirname, "script.ts")` to construct `bun run "<absolute-path>"` commands. Change each to emit `bunx beastmode hooks <name> <phase>` (or just `bunx beastmode hooks <name>` for the stop hook which takes no phase argument). Remove the `import.meta.dirname` path resolution — the command no longer needs to know where the script files live on disk.

**File-permission settings builder:** The `buildFilePermissionPostToolUseHooks` function similarly constructs an absolute-path command to `hitl-log.ts`. Change it to emit `bunx beastmode hooks hitl-log <phase>`.

**Prompt-type hooks unaffected:** The `buildFilePermissionPreToolUseHooks` function produces `type: "prompt"` hooks with inline LLM evaluation prose. These are not command-type hooks and require no changes.

**Test updates:** Existing tests for builder functions assert the old `bun run "<path>"` pattern. Update assertions to expect the new `bunx beastmode hooks <name>` pattern. The `absolute-hook-paths.feature` BDD file asserts absolute paths exist — it should be deleted since the new portable-settings integration scenarios replace its coverage.

## Integration Test Scenarios

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

## Acceptance Criteria

- [ ] `buildPreToolUseHook(phase)` emits `bunx beastmode hooks hitl-auto <phase>`
- [ ] `buildPostToolUseHook(phase)` emits `bunx beastmode hooks hitl-log <phase>`
- [ ] `buildStopHook()` emits `bunx beastmode hooks generate-output`
- [ ] `buildFilePermissionPostToolUseHooks(phase)` emits `bunx beastmode hooks hitl-log <phase>`
- [ ] No builder function references `import.meta.dirname` for hook script resolution
- [ ] No generated settings.local.json contains absolute paths to hook `.ts` files
- [ ] Prompt-type hooks (`buildFilePermissionPreToolUseHooks`) remain unchanged
- [ ] `absolute-hook-paths.feature` deleted (replaced by new integration scenarios)
- [ ] Updated unit tests assert the new `bunx beastmode hooks` command pattern
