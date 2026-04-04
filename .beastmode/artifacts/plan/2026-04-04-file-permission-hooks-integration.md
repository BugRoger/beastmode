---
phase: plan
slug: fe70d5
epic: file-permission-hooks
type: integration
---

# Integration Tests: file-permission-hooks

## Coverage Analysis

| # | User Story | Existing Coverage | Action |
|---|-----------|------------------|--------|
| 1 | `file-permissions:` config section in `config.yaml` with category-based prose | None. Existing `hitl-hook-lifecycle.feature` covers `hitl:` config but not `file-permissions:`. Config type (`BeastmodeConfig`) has no `file-permissions` field yet. | New scenarios |
| 2 | Permission dialog for `.claude/` file writes interceptable by prompt hook | None. Existing HITL hook tests target `AskUserQuestion` matcher only. No tests for Write/Edit matchers with `if`-field filtering. | New scenarios |
| 3 | File permission decisions logged alongside HITL decisions | None. Existing `hitl-log.ts` tests cover AskUserQuestion PostToolUse logging. No coverage for file permission PostToolUse logging to the same log file. | New scenarios |

**Existing features reviewed:**

- `hitl-hook-lifecycle.feature` -- Tests HITL AskUserQuestion PreToolUse/PostToolUse hooks written to `settings.local.json`, phase-specific prose, and custom settings preservation. Does NOT cover file-permission hooks (different matchers, different config section).
- `pipeline-happy-path.feature` -- Full lifecycle, no hook-level assertions.
- `pipeline-error-resilience.feature` -- Dispatch failure modes, no hook assertions.
- `cancel-flow.feature` -- Cleanup lifecycle, no hook assertions.
- `watch-loop-happy-path.feature` -- Multi-epic orchestration, no hook assertions.
- `wave-failure.feature` -- Wave ordering, no hook assertions.
- `regression-loop.feature` -- Validate failure regression, no hook assertions.
- `design-slug-rename.feature` -- Slug rename flow, no hook assertions.

No existing scenarios require modification or deletion. The file-permission-hooks epic introduces a new config section, new hook matchers, and new log entries -- all additive to the existing HITL infrastructure.

## New Scenarios

### Feature 1: Config section parsing and default behavior

```gherkin
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
      | field    | value         |
      | phase    | design        |
      | slug     | fp-config     |
      | epic     | fp-config     |
      | problem  | Test problem  |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a file-permission PreToolUse hook for "claude-settings"
    And the file-permission hook prompt should contain "auto-allow all changes"

  Scenario: Missing file-permissions config defaults to defer-to-human

    Given the initial epic slug is "fp-default-epic"
    And a manifest is seeded for slug "fp-default-epic"
    And the config has no file-permissions section

    When the dispatch will write a design artifact:
      | field    | value         |
      | phase    | design        |
      | slug     | fp-default    |
      | epic     | fp-default    |
      | problem  | Test problem  |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a file-permission PreToolUse hook for "claude-settings"
    And the file-permission hook prompt should contain "always defer to human"

  Scenario: File-permissions config is category-based, not phase-based

    Given the initial epic slug is "fp-phase-epic"
    And a manifest is seeded for slug "fp-phase-epic"
    And the config has file-permissions claude-settings set to "auto-allow skill edits"

    When the dispatch will write a design artifact:
      | field    | value        |
      | phase    | design       |
      | slug     | fp-phase     |
      | epic     | fp-phase     |
      | problem  | Test problem |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the file-permission hook prompt should contain "auto-allow skill edits"

    When the dispatch will write plan artifacts:
      | feature | wave | description |
      | feat-1  | 1    | Feature 1   |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the file-permission hook prompt should contain "auto-allow skill edits"
```

### Feature 2: Hook generation with if-field path filtering

```gherkin
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
      | field    | value         |
      | phase    | design        |
      | slug     | fp-hook       |
      | epic     | fp-hook       |
      | problem  | Test problem  |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a file-permission PreToolUse hook for "Write"
    And the worktree settings should contain a file-permission PreToolUse hook for "Edit"
    And the file-permission hook for "Write" should have an if-condition for ".claude" paths
    And the file-permission hook for "Edit" should have an if-condition for ".claude" paths

  Scenario: File-permission hooks coexist with HITL AskUserQuestion hooks

    When the dispatch will write a design artifact:
      | field    | value         |
      | phase    | design        |
      | slug     | fp-coexist    |
      | epic     | fp-coexist    |
      | problem  | Test problem  |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a PreToolUse hook for "design"
    And the worktree settings should contain a file-permission PreToolUse hook for "Write"
    And the worktree settings should contain a file-permission PreToolUse hook for "Edit"

  Scenario: File-permission hooks are cleaned between dispatches

    When the dispatch will write a design artifact:
      | field    | value        |
      | phase    | design       |
      | slug     | fp-clean     |
      | epic     | fp-clean     |
      | problem  | Test problem |
      | solution | Test solution |
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
      | field    | value         |
      | phase    | design        |
      | slug     | fp-preserve   |
      | epic     | fp-preserve   |
      | problem  | Test problem  |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should preserve custom setting "myFlag"
```

### Feature 3: Decision logging alongside HITL log

```gherkin
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
      | field    | value         |
      | phase    | design        |
      | slug     | fp-log        |
      | epic     | fp-log        |
      | problem  | Test problem  |
      | solution | Test solution |
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
```

### Feature 4: End-to-end hook lifecycle across pipeline phases

```gherkin
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
```

## Modified Scenarios

No existing scenarios require modification. The file-permission-hooks epic introduces new hook matchers (Write, Edit) and a new config section (`file-permissions:`) that are fully additive to the existing HITL infrastructure. The existing `hitl-hook-lifecycle.feature` tests AskUserQuestion hooks and remains correct as-is.

## Deleted Scenarios

No existing scenarios require deletion. The file-permission-hooks epic does not supersede any existing behavior -- it extends the hook system with new matchers and config while preserving the existing AskUserQuestion hook lifecycle unchanged.
