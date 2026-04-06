---
phase: plan
slug: 6bcaf9
epic: fix-hook-paths
feature: absolute-hook-paths
wave: 1
---

# Absolute Hook Paths

**Design:** .beastmode/artifacts/design/2026-04-06-6bcaf9.md

## User Stories

2. As a beastmode CLI user, I want CLI-dispatched sessions to have correctly resolved hook script paths, so that output.json generation and HITL hooks work reliably in worktrees.

3. As a beastmode developer, I want hook path resolution to be self-contained via `import.meta.dir`, so that hooks work regardless of CWD, environment variables, or symlink configuration.

4. As a contributor, I want existing hook tests to validate absolute path resolution, so that regressions to shell-substitution patterns are caught.

## What to Build

The CLI's hook builder functions currently embed `$(git rev-parse --show-toplevel)` shell substitutions in hook command strings. These resolve at hook execution time, which fails in worktrees and non-standard CWD contexts. Replace all shell substitutions with absolute paths resolved at CLI write-time using Bun's `import.meta.dir`.

**Hook builder changes:**

In the HITL settings module, three builder functions need updating:
- The PreToolUse hook builder (targets `hitl-auto.ts`)
- The PostToolUse hook builder (targets `hitl-log.ts`)
- The Stop hook builder (targets `generate-output.ts`)

In the file-permission settings module, one builder function needs updating:
- The PostToolUse hook builder (targets `hitl-log.ts`)

All four functions should compute the absolute script path once using `resolve(import.meta.dir, ...)` and embed it directly in the command string. The pattern replaces `"$(git rev-parse --show-toplevel)/cli/src/hooks/<script>.ts"` with the resolved absolute path.

**Test changes:**

All test files that assert on hook command content need updating:
- The HITL settings test must expect absolute paths (not `git rev-parse` patterns) in PostToolUse, Stop, and PreToolUse hook commands
- The HITL prompt test must expect absolute paths in the PreToolUse hook command
- The file-permission settings test must expect absolute paths in PostToolUse hook commands

Tests should verify the generated path is absolute (starts with `/`) and does not contain `$(git rev-parse` anywhere in the command string.

**Unchanged:**
- Script-internal `git rev-parse --show-toplevel` calls in `generate-output.ts`, `hitl-auto.ts`, and `hitl-log.ts` remain as-is — those correctly resolve the user's project root for artifact I/O at runtime.

## Integration Test Scenarios

```gherkin
@fix-hook-paths
Feature: Absolute hook path resolution for CLI-dispatched sessions

  CLI-dispatched sessions write hook entries to worktree settings. All hook
  command paths must be absolute, resolved at write time from the CLI's own
  location. This ensures hooks work regardless of working directory,
  environment variables, or symlink configuration.

  Background:
    Given the initial epic slug is "hook-path-epic"
    And a manifest is seeded for slug "hook-path-epic"

  Scenario: HITL hook command path is absolute after dispatch
    When the dispatch will write a design artifact:
      | field    | value         |
      | phase    | design        |
      | slug     | abs-path      |
      | epic     | abs-path      |
      | problem  | Test problem  |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the HITL PreToolUse hook command path should be absolute

  Scenario: Stop hook command path is absolute after dispatch
    When the dispatch will write a design artifact:
      | field    | value         |
      | phase    | design        |
      | slug     | abs-stop      |
      | epic     | abs-stop      |
      | problem  | Test problem  |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the Stop hook command path should be absolute

  Scenario: PostToolUse log hook command path is absolute after dispatch
    When the dispatch will write a design artifact:
      | field    | value         |
      | phase    | design        |
      | slug     | abs-log       |
      | epic     | abs-log       |
      | problem  | Test problem  |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the PostToolUse log hook command path should be absolute

  Scenario: Hook command paths contain no shell substitution patterns
    When the dispatch will write a design artifact:
      | field    | value         |
      | phase    | design        |
      | slug     | no-shell      |
      | epic     | no-shell      |
      | problem  | Test problem  |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And no hook command path should contain shell substitution patterns

  Scenario: Hook paths resolve correctly regardless of working directory
    Given the working directory is a temporary location outside the project
    When the hook builder generates hooks for phase "design"
    Then all hook command paths should be absolute
    And all hook command paths should reference valid script locations

  Scenario: Hook paths resolve correctly in a worktree context
    Given the pipeline is operating in a git worktree
    When the dispatch will write plan artifacts:
      | feature | wave | description |
      | feat-1  | 1    | Feature 1   |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And all hook command paths should be absolute
    And no hook command path should contain shell substitution patterns

  Scenario: File-permission hook command paths are absolute after dispatch
    Given the config has file-permissions claude-settings set to "auto-allow all changes"
    When the dispatch will write a design artifact:
      | field    | value         |
      | phase    | design        |
      | slug     | abs-fp        |
      | epic     | abs-fp        |
      | problem  | Test problem  |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the file-permission PostToolUse hook command path should be absolute
    And no hook command path should contain shell substitution patterns
```

## Acceptance Criteria

- [ ] All hook builder functions use `import.meta.dir` to resolve absolute script paths
- [ ] No hook command string contains `$(git rev-parse --show-toplevel)` or any shell substitution
- [ ] Generated hook commands work correctly in worktree contexts
- [ ] HITL settings tests assert absolute paths, not shell substitution patterns
- [ ] HITL prompt tests assert absolute paths, not shell substitution patterns
- [ ] File-permission settings tests assert absolute paths, not shell substitution patterns
- [ ] Script-internal `git rev-parse` usage in hook entry points is unchanged
