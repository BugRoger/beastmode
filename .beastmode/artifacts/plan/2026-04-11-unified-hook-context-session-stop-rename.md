---
phase: plan
slug: unified-hook-context
epic: unified-hook-context
feature: session-stop-rename
wave: 2
---

# session-stop-rename

**Design:** `.beastmode/artifacts/design/2026-04-11-unified-hook-context.md`

## User Stories

3. As the session-stop hook (renamed from generate-output), I want to read `BEASTMODE_EPIC_SLUG` from env vars instead of inferring the worktree slug from `basename(repoRoot)`, so that the output filename derivation uses the same source as all other hooks.
7. As the codebase, I want the generate-output hook renamed to session-stop (`runSessionStop`, `session-stop` subcommand, Stop hook command string), so that the hook naming is symmetric with session-start.

## What to Build

**Module rename.** Rename `generate-output.ts` to `session-stop.ts`. All imports across the codebase that reference `generate-output` are updated to point to `session-stop`. The public function `generateAll` is renamed to `runSessionStop` (or a more appropriate name that reflects the new identity). The internal functions (`processArtifact`, `buildOutput`, `scanPlanFeatures`, `parseFrontmatter`) retain their names since they describe what they do, not where they live.

**Hook command string.** The `buildStopHook` function in `hitl-settings.ts` changes its command from `bunx beastmode hooks generate-output` to `bunx beastmode hooks session-stop`. The `cleanHitlSettings` function updates its Stop hook filter to match on `"session-stop"` instead of `"generate-output"`.

**VALID_HOOKS constant.** Update from `["hitl-auto", "hitl-log", "generate-output", "session-start"]` to `["hitl-auto", "hitl-log", "session-stop", "session-start"]`.

**Hook dispatcher.** The `hooksCommand` function in `hooks.ts` adds a `case "session-stop"` that calls the renamed runner. The old `case "generate-output"` is removed.

**Env var for slug.** The renamed `runSessionStop` (or `runGenerateOutput` renamed) reads `BEASTMODE_EPIC_SLUG` from `process.env` for the worktree slug instead of inferring via `basename(repoRoot)` and `isWorktree` detection. If `BEASTMODE_EPIC_SLUG` is missing, the function exits with an error (matching session-start's fail-fast behavior). The `isWorktree` detection logic and `basename(repoRoot)` inference path are removed.

**Scope parameter.** The `scope: "changed"` behavior (git diff-based filtering) remains -- it's orthogonal to slug source. The slug is now always from the env var.

**Import updates.** The following files import from `generate-output.ts` and need path updates:
- `session-start.ts` -- imports `parseFrontmatter`
- `hooks.ts` -- imports `generateAll`
- All test files referencing the old module path
- BDD support files (`world.ts`, step definitions)

## Integration Test Scenarios

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

**Consolidation note:** The existing `portable-settings.feature` scenario "Generated Stop hook uses CLI-based command" must be updated to expect `"bunx beastmode hooks session-stop"` instead of `"bunx beastmode hooks generate-output"`.

## Acceptance Criteria

- [ ] `generate-output.ts` is renamed to `session-stop.ts`
- [ ] All imports referencing the old module path are updated
- [ ] `VALID_HOOKS` includes `"session-stop"` instead of `"generate-output"`
- [ ] Hook dispatcher handles `"session-stop"` subcommand
- [ ] Stop hook command string is `bunx beastmode hooks session-stop`
- [ ] `cleanHitlSettings` matches on `"session-stop"` for Stop hook cleanup
- [ ] Session-stop reads `BEASTMODE_EPIC_SLUG` from env var for slug derivation
- [ ] Session-stop exits non-zero when `BEASTMODE_EPIC_SLUG` is missing
- [ ] The `isWorktree` detection and `basename(repoRoot)` inference are removed
- [ ] Existing `portable-settings.feature` scenario updated to new command string
- [ ] All existing tests pass with updated imports and assertions
