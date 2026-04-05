---
phase: plan
slug: ed09f0
epic: dashboard-log-fixes
feature: cli-verbosity-filter
wave: 1
---

# CLI Verbosity Filter

**Design:** `.beastmode/artifacts/design/2026-04-05-ed09f0.md`

## User Stories

1. As a pipeline operator, I want the log level switcher ('v' key) to toggle between info and debug views, so that I can control how much detail I see.
2. As a pipeline operator, I want CLI root entries (watch start/stop, scan complete) to also respect the verbosity filter, so that switching to info actually hides debug-level global entries.

## What to Build

The `filterTreeByVerbosity()` function currently passes CLI root entries through unfiltered. Change it to apply the same `shouldShowEntry()` predicate to `state.cli.entries` that is already applied to epic and feature entries.

This is a one-line structural change in the filter function — replace the passthrough of `state.cli` with a filtered copy that runs each CLI entry through `shouldShowEntry(entry.level, verbosity)`.

Update existing unit tests that assert the old "CLI entries not filtered" behavior to assert the new filtered behavior instead.

## Integration Test Scenarios

```gherkin
@dashboard-log-fixes
Feature: CLI root entries respect the verbosity filter

  CLI root entries (watch start, watch stop, scan complete) are subject
  to the same verbosity filter as epic and feature entries. When the
  operator switches to info view, debug-level CLI root entries are hidden.

  Background:
    Given the dashboard is running
    And the tree state contains CLI root entries at multiple levels:
      | message        | level |
      | watch started  | debug |
      | scan complete  | debug |
      | pipeline error | warn  |

  Scenario: Info verbosity hides debug-level CLI root entries
    When the log verbosity level is "info"
    Then the CLI root entry "watch started" is not visible
    And the CLI root entry "scan complete" is not visible
    And the CLI root entry "pipeline error" is visible

  Scenario: Debug verbosity shows all CLI root entries
    When the log verbosity level is "debug"
    Then the CLI root entry "watch started" is visible
    And the CLI root entry "scan complete" is visible
    And the CLI root entry "pipeline error" is visible

  Scenario: Toggling verbosity updates CLI root entry visibility immediately
    Given the log verbosity level is "info"
    And the CLI root entry "watch started" is not visible
    When the operator presses the verbosity toggle key
    Then the CLI root entry "watch started" becomes visible

  Scenario: Warn and error CLI root entries are always visible regardless of verbosity
    When the log verbosity level is "info"
    Then CLI root entries at "warn" level are visible
    And CLI root entries at "error" level are visible
```

## Acceptance Criteria

- [ ] `filterTreeByVerbosity()` filters CLI entries using `shouldShowEntry()`
- [ ] At info verbosity (0), debug-level CLI entries are hidden
- [ ] At debug verbosity (1), all CLI entries are shown
- [ ] Warn and error CLI entries remain visible at all verbosity levels
- [ ] Existing unit tests updated to reflect new filtering behavior
