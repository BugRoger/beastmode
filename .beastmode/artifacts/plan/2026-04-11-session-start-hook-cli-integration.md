---
phase: plan
slug: d4952e
epic: session-start-hook
feature: cli-integration
wave: 1
---

# CLI Integration

**Design:** `.beastmode/artifacts/design/2026-04-11-d4952e.md`

## User Stories

5. As a CLI developer, I want the session-start hook registered in `settings.local.json` alongside existing hooks, so that both the manual pipeline and watch loop paths share the same hook setup.

## What to Build

Wire the session-start hook into the CLI infrastructure across three integration points:

**Command Router Registration:**
Add `session-start` to the hooks command router. The new case calls the session-start hook module's core function, reads env vars, and writes JSON to stdout. Unlike existing hooks that always exit 0, the session-start hook exits non-zero on missing inputs (consistent with its fail-fast contract — session-start failures should block Claude from starting with incomplete context).

**Settings Builder Functions:**
Create `buildSessionStartHook()` and `cleanSessionStartHook()` functions following the same pattern as the existing HITL and file-permission settings builders. The builder produces a `SessionStart` hook entry:
```json
{
  "SessionStart": [{
    "matcher": "",
    "hooks": [{
      "type": "command",
      "command": "bunx beastmode hooks session-start"
    }]
  }]
}
```

The `writeSessionStartHook()` function merges this entry into `settings.local.json` atomically, preserving all existing hook entries. The `cleanSessionStartHook()` function removes SessionStart entries between dispatches.

**Environment Variable Setup:**
The dispatch path (both manual pipeline runner and watch loop) must set `BEASTMODE_PHASE`, `BEASTMODE_EPIC`, `BEASTMODE_SLUG`, and optionally `BEASTMODE_FEATURE` as environment variables before the Claude session starts. These env vars are read by the session-start hook at runtime.

**Pipeline Runner Wiring:**
In the runner's step 3 (settings.create), call the new settings builder functions alongside existing HITL and file-permission settings writes. Both the manual pipeline path and the `skipPreDispatch` watch loop path must produce identical SessionStart hook configuration.

## Integration Test Scenarios

```gherkin
@session-start-hook @config
Feature: Session start hook registration -- hook registered in settings alongside existing hooks

  Background:
    Given the pipeline runner is configured for a phase dispatch

  Scenario: Session-start hook is present in settings after dispatch setup
    When settings are written for a pipeline dispatch
    Then the worktree settings should contain a SessionStart hook entry
    And the SessionStart hook should use the portable CLI invocation pattern
    And existing PreToolUse hooks should remain intact
    And existing PostToolUse hooks should remain intact
    And existing Stop hooks should remain intact

  Scenario: Session-start hook is cleaned and rewritten between dispatches
    When settings are written for a "design" phase dispatch
    And settings are rewritten for a "plan" phase dispatch
    Then the worktree settings should contain exactly one SessionStart hook entry
    And the SessionStart hook should reference the current phase

  Scenario: Both manual pipeline and watch loop share the same hook setup
    Given the manual pipeline dispatch path
    When settings are written for a dispatch
    Then the settings should include the SessionStart hook

    Given the watch loop dispatch path
    When settings are written for a dispatch
    Then the settings should include the SessionStart hook
    And the SessionStart hook format should match the manual pipeline format
```

## Acceptance Criteria

- [ ] `session-start` recognized as valid hook name in command router
- [ ] Command router case calls hook core function and writes JSON to stdout
- [ ] `buildSessionStartHook()` produces correct SessionStart hook entry
- [ ] `cleanSessionStartHook()` removes SessionStart entries without affecting other hooks
- [ ] `writeHitlSettings()` (or a parallel `writeSessionStartSettings()`) includes SessionStart hook in output
- [ ] Pipeline runner step 3 calls session-start settings builder
- [ ] Dispatch path sets `BEASTMODE_PHASE`, `BEASTMODE_EPIC`, `BEASTMODE_SLUG` env vars
- [ ] Dispatch path sets `BEASTMODE_FEATURE` env var for implement phase
- [ ] Both manual pipeline and watch loop paths produce identical SessionStart configuration
- [ ] Existing PreToolUse, PostToolUse, and Stop hooks are preserved when SessionStart hook is added
