---
phase: plan
slug: 6cefb8
epic: npx-installer
feature: install-command
wave: 1
---

# Install Command

**Design:** `.beastmode/artifacts/design/2026-04-06-6cefb8.md`

## User Stories

1. As a new user, I want to run a single command (`npx beastmode install`) to get the full beastmode system (plugin + CLI) installed, so that I don't need to discover and run multiple disconnected setup steps.
2. As a new user, I want the installer to auto-install bun if it's not on my machine, so that I don't need to manually install runtime dependencies before I can use beastmode.
3. As an existing user, I want to re-run `npx beastmode install` to update to the latest version, so that install and update are the same idempotent command.
5. As a new user, I want the installer to verify the installation by checking that `beastmode` and `claude` commands work, so that I know immediately if something went wrong.
7. As a user on a system where the install fails, I want clear error messages telling me exactly what's missing or wrong, so that I can fix the issue without guessing.

## What to Build

### Root npm Package

Create a root-level `package.json` that publishes as the `beastmode` npm package. The `bin` field points to the npx CLI entry point written in plain Node.js (`.mjs` files) since users may not have Bun yet. The package bundles three directories: `src/npx-cli/` (the installer logic), `plugin/` (the full plugin tree — skills, agents, hooks, metadata), and `cli/` (the Bun-based dashboard CLI source).

### npx CLI Entry Point

A minimal command dispatcher that parses the first argument (`install`, `uninstall`, `--version`, `--help`) and routes to the appropriate handler module. Runs on bare Node.js — no TypeScript, no build step, no external dependencies.

### Prerequisite Checker

A module that validates the install environment before any file operations:
- Node.js >= 18 (already guaranteed by npx, but verify)
- macOS (reject other platforms with an explicit message)
- Claude Code installed (`claude` command available on PATH)

Each check that fails produces an actionable error message telling the user exactly what to install and how. Fail fast — don't continue after the first hard failure.

### Plugin Copier

A module that copies the bundled `plugin/` directory to Claude Code's plugin locations:
- Marketplace directory: `~/.claude/plugins/marketplaces/bugroger/`
- Version cache: `~/.claude/plugins/cache/bugroger/beastmode/{version}/`

For idempotency: if the target directories exist, remove them first (clean-replace), then copy fresh. This handles version updates cleanly.

### JSON Config Merger

A module implementing the atomic read-merge-write pattern for Claude Code's JSON config files:
- `~/.claude/plugins/known_marketplaces.json` — register the marketplace entry
- `~/.claude/plugins/installed_plugins.json` — register the plugin entry
- `~/.claude/settings.json` — add to `enabledPlugins` array

Each merge reads the existing file (or starts with empty defaults if missing), adds/updates the beastmode entries without disturbing other content, and writes back atomically. This preserves the user's existing Claude Code configuration.

### Bun Auto-Installer

A module that checks if `bun` is available on PATH. If not, downloads and runs the official bun install script (`curl -fsSL https://bun.sh/install | bash`). After installation, verifies `bun` is now available. If bun is already present, skips silently.

### CLI Linker

After plugin installation, this module runs `bun install --production` in the cached CLI directory, then `bun link` to make the `beastmode` command available on the user's PATH.

### Verification

After all install steps complete, verify the installation by running `beastmode --version` and `claude --version`. Report results to the user. If either fails, print a diagnostic message identifying which command is broken.

### Summary Output

On success, print a plain-text summary: version installed, key paths (plugin location, CLI location), and next steps (e.g., "Run `/beastmode init` in your project to get started").

### Cross-cutting: Error Messages

Every step that can fail must produce a message with: what went wrong, why it matters, and what the user can do about it. No stack traces — plain English. Suitable for piped/CI output (no ANSI codes, no interactive prompts).

### Cross-cutting: Idempotency

The entire install flow is designed to be re-runnable. Running it when already installed at the same version is a no-op that succeeds. Running it when installed at an older version cleanly updates. No duplicate registrations in JSON configs.

## Integration Test Scenarios

```gherkin
@npx-installer
Feature: Single-command installation and update

  Background:
    Given a machine with Node.js available

  Scenario: Fresh install provisions the full beastmode system
    Given beastmode is not installed on the machine
    When the user runs the beastmode install command
    Then the beastmode CLI is available as a shell command
    And the beastmode plugin is registered with Claude Code

  Scenario: Installer auto-provisions bun when missing
    Given bun is not installed on the machine
    When the user runs the beastmode install command
    Then bun is installed automatically
    And the install completes successfully

  Scenario: Installer skips bun provisioning when already present
    Given bun is already installed on the machine
    When the user runs the beastmode install command
    Then the existing bun installation is left unchanged
    And the install completes successfully

  Scenario: Re-running install updates to the latest version
    Given beastmode is already installed at a previous version
    When the user runs the beastmode install command again
    Then the installed version is updated to the latest available version
    And no duplicate registrations are created

  Scenario: Install is idempotent when already at latest version
    Given beastmode is already installed at the latest version
    When the user runs the beastmode install command again
    Then the installation remains unchanged
    And the command exits successfully

  Scenario: Post-install verification confirms working commands
    Given the user has just completed a beastmode install
    When the installer runs its verification checks
    Then the beastmode command is confirmed operational
    And the Claude Code command is confirmed operational

  Scenario: Verification failure reports which command is broken
    Given the user has just completed a beastmode install
    And one of the required commands is not functional
    When the installer runs its verification checks
    Then the user sees an error identifying the non-functional command

  Scenario Outline: Install failure produces a clear diagnostic message
    Given the user attempts to run the beastmode install command
    And <failure_condition> is present
    When the install fails
    Then the user sees an error message describing <failure_condition>
    And the error message suggests a remediation step

    Examples:
      | failure_condition                    |
      | insufficient filesystem permissions  |
      | no network connectivity              |
      | incompatible operating system        |
```

## Acceptance Criteria

- [ ] Running `npx beastmode install` on a clean macOS machine with Node.js and Claude Code installs both the plugin and CLI in one command
- [ ] Bun is auto-installed if not present; existing bun installations are left untouched
- [ ] Re-running install on an already-installed system succeeds idempotently (same version = no-op, older version = update)
- [ ] All three JSON config files are merged without destroying existing user settings
- [ ] Plugin files are written to correct `~/.claude/plugins/` locations
- [ ] `beastmode --version` and `claude --version` are verified post-install
- [ ] Missing prerequisites produce actionable error messages (not stack traces)
- [ ] Install summary prints version, paths, and next steps on success
- [ ] Non-macOS systems get a clear rejection message
- [ ] The npm package publishes correctly with `plugin/`, `cli/`, and `src/npx-cli/` bundled
