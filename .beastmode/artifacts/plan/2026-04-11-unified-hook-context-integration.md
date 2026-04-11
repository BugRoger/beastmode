# Integration Test Artifact: unified-hook-context

**Date:** 2026-04-11
**Epic:** unified-hook-context
**Features analyzed:** session-stop-rename
**User stories covered:** US3, US7

---

## New Scenarios

### Feature: session-stop-rename

Covers user stories [3, 7].

```gherkin
@unified-hook-context @hooks
Feature: Session-stop hook -- renamed from generate-output with env-var slug source

  The session-stop hook (formerly generate-output) reads the epic slug
  from the BEASTMODE_EPIC_SLUG environment variable instead of inferring
  it from basename(repoRoot). The hook subcommand is renamed from
  generate-output to session-stop for symmetry with session-start.

  Scenario: Session-stop subcommand is recognized by the hook dispatcher
    Given a pipeline worktree is initialized
    And the session-stop environment variables are set
    When the hooks command is invoked with subcommand "session-stop"
    Then the hook dispatcher should accept the subcommand without error

  Scenario: Session-stop reads epic slug from environment variable
    Given a pipeline worktree is initialized
    And the BEASTMODE_EPIC_SLUG environment variable is set to "my-epic"
    And a design artifact exists for epic "my-epic"
    When the session-stop hook runs
    Then the output filename should be derived from slug "my-epic"
    And the hook should not infer the slug from the worktree directory name

  Scenario: Session-stop exits non-zero when BEASTMODE_EPIC_SLUG is missing
    Given a pipeline worktree is initialized
    And the BEASTMODE_EPIC_SLUG environment variable is not set
    When the session-stop hook runs
    Then the hook should exit with a non-zero status
    And an error message should indicate the missing environment variable

  Scenario: Stop hook command string in settings uses session-stop
    Given HITL settings are generated for a pipeline phase
    When the Stop hook entry is written to settings
    Then the Stop hook command should contain "session-stop"
    And the Stop hook command should not contain "generate-output"

  Scenario: Pipeline end-to-end uses session-stop for output generation
    Given an epic is initialized with slug "e2e-stop"
    And a manifest is seeded for slug "e2e-stop"
    When the dispatch writes a design artifact for epic "e2e-stop"
    And the pipeline runs the design phase
    Then the pipeline result should be successful
    And the output.json file should be generated via the session-stop hook
    And the output filename should reflect the epic slug from the environment
```

---

## Consolidation

##### Update: Generated Stop hook uses CLI-based command

**File:** `cli/features/portable-settings.feature`
**Action:** update
**Reason:** The scenario on line 17-19 asserts the Stop hook command is `"bunx beastmode hooks generate-output"`. After the session-stop rename (US7), this command string changes to `"bunx beastmode hooks session-stop"`. The scenario's expected value is stale and must reflect the new subcommand name.

```gherkin
@unified-hook-context @hooks
Feature: Settings generation uses portable CLI-based hook commands

  The pipeline runner generates settings.local.json with hook commands
  that use `bunx beastmode hooks <name>` instead of absolute file paths.
  This ensures hook invocations are portable across machines, worktrees,
  and installation paths.

  Scenario: Generated Stop hook uses CLI-based command
    Given HITL settings are generated for phase "implement"
    Then the Stop hook command should be "bunx beastmode hooks session-stop"
```
