---
phase: plan
slug: 6bcaf9
epic: fix-hook-paths
feature: remove-static-hooks
wave: 1
---

# Remove Static Hooks

**Design:** .beastmode/artifacts/design/2026-04-06-6bcaf9.md

## User Stories

1. As a plugin user working in a non-beastmode project, I want the Stop hook to not fire at all, so that I don't see "Module not found" errors on every Claude response.

## What to Build

The beastmode plugin ships two static hook declaration files: `hooks/hooks.json` (the plugin hooks manifest) and `.claude/settings.json` (project-level Claude settings). Both declare a Stop hook that runs `generate-output.ts` via a shell-expanded `git rev-parse --show-toplevel` path. In non-beastmode projects, this path resolves to the wrong root and the script doesn't exist, causing errors on every Claude response.

Remove the Stop hook entry from both files:

- **hooks/hooks.json:** Remove the Stop hook array entry. The file should remain valid JSON with an empty hooks object (or only non-Stop hooks if any exist).
- **.claude/settings.json:** Remove the Stop hook array entry. Preserve all other settings (enabledPlugins, permissions, etc.).

The CLI already writes its own hooks to `settings.local.json` per worktree session — these static declarations are redundant for beastmode users and harmful for non-beastmode users.

## Integration Test Scenarios

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

## Acceptance Criteria

- [ ] `hooks/hooks.json` contains no Stop hook entry
- [ ] `.claude/settings.json` contains no Stop hook entry
- [ ] Both files remain valid JSON
- [ ] Non-beastmode projects with the plugin installed see no hook execution errors
