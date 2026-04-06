---
phase: plan
type: integration
epic: fix-hook-paths
---

# Integration Artifact: fix-hook-paths

## New Scenarios

### Feature: remove-static-hooks

Covers user stories [1].

```gherkin
@fix-hook-paths
Feature: Plugin Stop hook removal for non-beastmode projects

  The beastmode plugin ships static hook declarations. When the plugin is
  installed in a non-beastmode project, the Stop hook must not fire, because
  the target script does not exist outside the CLI tree. Removing the
  static Stop hook from plugin-level declarations ensures clean operation
  in any project.

  Scenario: Plugin has no Stop hook declaration
    Given the beastmode plugin is installed
    When the plugin hook declarations are loaded
    Then no Stop hook should be declared

  Scenario: Plugin has no static PreToolUse hook declaration for HITL
    Given the beastmode plugin is installed
    When the plugin hook declarations are loaded
    Then no PreToolUse hook for AskUserQuestion should be declared

  Scenario: Non-beastmode project receives no hook errors on Claude response
    Given the beastmode plugin is installed in a non-beastmode project
    When Claude completes a response
    Then no hook execution errors should occur
```

### Feature: absolute-hook-paths

Covers user stories [2, 3, 4].

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

## Modified Scenarios

None. Existing scenarios in `hitl-hook-lifecycle.feature`, `static-hitl-hooks.feature`, `file-permissions-hooks.feature`, and `file-permissions-lifecycle.feature` verify hook type (command vs. prompt) and lifecycle behavior but do not assert on path format. The path resolution change is orthogonal to their behavioral intent. No existing step definitions assert on `$(git rev-parse ...)` patterns.

## Deleted Scenarios

None. No existing scenario is obsoleted by this epic. The static-hitl-hooks and file-permissions scenarios remain valid -- they test hook type and lifecycle, not path resolution.
