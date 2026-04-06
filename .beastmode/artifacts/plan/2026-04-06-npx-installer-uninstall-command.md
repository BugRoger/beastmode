---
phase: plan
slug: 6cefb8
epic: npx-installer
feature: uninstall-command
wave: 2
---

# Uninstall Command

**Design:** `.beastmode/artifacts/design/2026-04-06-6cefb8.md`

## User Stories

4. As a user who wants to remove beastmode, I want to run `npx beastmode uninstall` to cleanly remove the plugin registration and CLI link while preserving my project-level `.beastmode/` data, so that uninstalling doesn't destroy my project knowledge.

## What to Build

### Uninstall Command Handler

A new command handler registered in the npx CLI dispatcher (created by the install-command feature). When the user runs `npx beastmode uninstall`, this handler reverses the install steps in the correct order.

### Plugin Deregistration

Remove beastmode entries from Claude Code's JSON config files using the same atomic read-merge-write pattern as install, but in reverse (read, remove beastmode entries, write back):
- Remove the marketplace entry from `~/.claude/plugins/known_marketplaces.json`
- Remove the plugin entry from `~/.claude/plugins/installed_plugins.json`
- Remove the `enabledPlugins` entry from `~/.claude/settings.json`

Preserve all non-beastmode content in these files.

### File Cleanup

Remove the beastmode directories from the Claude Code plugin tree:
- Delete `~/.claude/plugins/marketplaces/bugroger/` (marketplace directory)
- Delete `~/.claude/plugins/cache/bugroger/` (version cache directory)

### CLI Unlinking

Run `bun unlink` in the cached CLI directory to remove the `beastmode` command from PATH. If bun is not available (user removed it independently), skip gracefully.

### Project Data Preservation

Explicitly do NOT touch any project-level `.beastmode/` directories. The uninstaller operates only on the global Claude Code plugin directories and the global CLI link.

### Graceful No-Op

If beastmode is not installed (no plugin directories, no JSON entries), exit with a friendly message ("beastmode is not installed — nothing to remove") rather than an error.

### Summary Output

On success, print what was removed: plugin registration, CLI link, cached files. Remind the user that project-level `.beastmode/` data was preserved.

## Integration Test Scenarios

```gherkin
@npx-installer
Feature: Clean uninstallation preserving project data

  Scenario: Uninstall removes plugin registration and CLI link
    Given beastmode is fully installed
    When the user runs the beastmode uninstall command
    Then the beastmode plugin is no longer registered with Claude Code
    And the beastmode CLI command is no longer available

  Scenario: Uninstall preserves project-level beastmode data
    Given beastmode is fully installed
    And a project has beastmode configuration and knowledge data
    When the user runs the beastmode uninstall command
    Then the project-level beastmode data remains intact

  Scenario: Uninstall on a machine where beastmode is not installed
    Given beastmode is not installed on the machine
    When the user runs the beastmode uninstall command
    Then the command exits gracefully with a message that nothing was installed
```

## Acceptance Criteria

- [ ] Running `npx beastmode uninstall` removes the plugin from all three JSON config files without disturbing other entries
- [ ] Marketplace and cache directories under `~/.claude/plugins/` are deleted
- [ ] `bun unlink` is called to remove the CLI from PATH (graceful skip if bun is missing)
- [ ] Project-level `.beastmode/` directories are never touched
- [ ] Running uninstall when not installed exits gracefully (not an error)
- [ ] Summary output confirms what was removed and that project data was preserved
