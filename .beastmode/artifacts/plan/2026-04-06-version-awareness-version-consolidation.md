---
phase: plan
slug: 14bf6a
epic: version-awareness
feature: version-consolidation
wave: 1
---

# Version Consolidation

**Design:** `.beastmode/artifacts/design/2026-04-06-14bf6a.md`

## User Stories

1. As a user running `beastmode help`, I want to see the actual release version (e.g., `v0.102.0`), so that I know which version I'm running.
2. As a user viewing the dashboard, I want the version display to reflect the real plugin version from plugin.json, so that the dashboard doesn't show a stale or incorrect version.
3. As a developer, I want a single shared version module (`cli/src/version.ts`) that resolves the version from plugin.json via `import.meta.dirname` relative path traversal, so that version logic is DRY and testable.
4. As a developer, I want the version module to gracefully return `"unknown"` when plugin.json is unreadable, so that missing files don't crash the CLI or dashboard.

## What to Build

### Shared Version Module

Create a new module that exports a `resolveVersion()` function. The module reads `.claude-plugin/plugin.json` relative to its own file location using `import.meta.dirname` to navigate up from `cli/src/` to the project root (2 levels). It parses the JSON, extracts the `version` field, and returns `v{semver}`. On any failure (file not found, invalid JSON, missing field), it returns `"unknown"`. No git hash — when installed as a plugin, `git rev-parse` returns the host project's hash.

### CLI Help Consumer

Remove the hardcoded `VERSION = "0.1.0"` constant from the CLI entry point. Import the shared version module and use its resolved version in the help banner.

### Watch Loop Consumer

Replace the existing `resolveVersion()` function in the watch loop command — which reads `cli/package.json` and appends a git hash — with an import from the shared version module. The watch loop emits the version in its `started` event, which flows through to the dashboard via the existing event pipeline. No dashboard code changes required beyond the format change.

### Test Updates

Update existing unit tests that assert the old `v{semver} ({hash})` format to expect the new `v{semver}` format. Tests that validate git hash presence or 7-character hash length should be replaced with tests that validate the absence of a hash and the presence of a clean semver format.

Update the existing BDD feature description to remove the "git hash" reference and reflect plugin.json as the version source. Individual rendering-mechanic scenarios remain unchanged.

Add unit tests for the new shared version module: successful resolution from plugin.json, graceful fallback when the file is missing, and graceful fallback when the file contains malformed JSON.

### Test Inversions

The following existing tests encode the prior `v{semver} ({hash})` contract and must be updated to the new `v{semver}` format:
- `cli/src/__tests__/version-display.test.ts` — assertions on version string format including hash pattern matching
- `cli/features/version-display.feature` — feature description text referencing "git hash"

## Integration Test Scenarios

```gherkin
@version-awareness
Feature: Version resolution from plugin.json

  All version displays across the CLI and dashboard resolve from
  .claude-plugin/plugin.json as the single source of truth. The shared
  version module discovers plugin.json relative to its own file location
  and formats the result as "v{semver}". When plugin.json is unreadable,
  the module returns "unknown" instead of crashing.

  Background:
    Given the project has a plugin.json with version "0.102.0"

  Scenario: CLI help displays the plugin.json version
    When the user runs the help command
    Then the help output includes the version "v0.102.0"

  Scenario: Dashboard displays the plugin.json version
    When the dashboard receives the started event
    Then the dashboard header shows the version "v0.102.0"

  Scenario: Version display omits git hash
    When the user runs the help command
    Then the version output does not include a git commit hash

  Scenario: Shared version module resolves from plugin.json
    When the version module resolves the current version
    Then it reads the version field from plugin.json
    And it returns "v0.102.0"

  Scenario: Version module returns unknown when plugin.json is missing
    Given plugin.json does not exist
    When the version module resolves the current version
    Then it returns "unknown"

  Scenario: Version module returns unknown when plugin.json is malformed
    Given plugin.json contains invalid JSON
    When the version module resolves the current version
    Then it returns "unknown"

  Scenario Outline: Version format is consistent across consumers
    Given the project has a plugin.json with version "<semver>"
    When <consumer> displays the version
    Then the displayed version is "v<semver>"

    Examples:
      | semver  | consumer      |
      | 1.0.0   | the CLI help  |
      | 1.0.0   | the dashboard |
      | 0.99.0  | the CLI help  |
      | 0.99.0  | the dashboard |
```

## Acceptance Criteria

- [ ] `cli/src/version.ts` exists and exports `resolveVersion()` reading from `.claude-plugin/plugin.json`
- [ ] `resolveVersion()` returns `v{semver}` format (e.g., `v0.102.0`)
- [ ] `resolveVersion()` returns `"unknown"` when plugin.json is missing or malformed
- [ ] CLI help banner displays the real plugin.json version, not `v0.1.0`
- [ ] Hardcoded `VERSION = "0.1.0"` constant is removed from CLI entry point
- [ ] Watch loop's local `resolveVersion()` function is replaced with shared module import
- [ ] Dashboard version display shows `v{semver}` format (no git hash)
- [ ] Unit tests for shared version module cover: success, missing file, malformed JSON
- [ ] Existing version-display tests updated to expect `v{semver}` format (no hash assertions)
- [ ] BDD feature description updated to remove "git hash" reference
- [ ] npx CLI (`src/npx-cli/version.mjs`) remains unchanged
