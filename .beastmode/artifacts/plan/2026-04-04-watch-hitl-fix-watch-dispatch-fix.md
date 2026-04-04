---
phase: plan
slug: watch-hitl-fix
epic: watch-hitl-fix
feature: watch-dispatch-fix
wave: 1
---

# Watch Dispatch Fix

**Design:** `.beastmode/artifacts/design/2026-04-04-watch-hitl-fix.md`

## User Stories

1. As a user running `beastmode watch`, I want AskUserQuestion calls in plan/implement/validate/release phases to be auto-answered according to my `hitl:` config, so that the pipeline doesn't stall waiting for human input on decisions I've already delegated.
2. As a user running `beastmode watch`, I want each dispatched session's worktree to be rebased onto main before the phase runs, so that phases operate on the latest code — matching the behavior of the manual CLI path.
3. As a developer reading the pipeline runner, I want comments to accurately describe what `skipPreDispatch` means, so that the next person doesn't repeat this same gap.

## What to Build

**`dispatchPhase()` in `watch.ts`:** After the existing `worktree.create()` call and before SDK dispatch, add two operations:

1. **Rebase onto main** — call the same `rebase()` function used by the pipeline runner's step 2. Pass the phase name and the worktree path. This ensures the dispatched session operates on code that includes any changes merged to main since the worktree was created.

2. **HITL settings write** — execute the same 4-call HITL sequence used by the pipeline runner's step 3:
   - Clean any stale HITL hooks from the worktree's `.claude/settings.local.json`
   - Extract the phase-specific HITL prose from `config.yaml`
   - Build the PreToolUse hook entry from that prose
   - Write the hook into the worktree's settings file

   This requires loading `BeastmodeConfig` via `loadConfig()` inside `dispatchPhase()`. The watch loop already calls `loadConfig()` once at startup; one extra call per dispatch is acceptable and avoids threading config through the function signature.

**`runner.ts` comment fix:** Update the `skipPreDispatch` comment block (around line 116) to accurately describe the post-fix contract: the session factory handles worktree creation, rebase, and HITL settings before dispatch; the runner handles post-dispatch steps (reconciliation, GitHub sync, release teardown).

**Test coverage:** Add tests for the watch dispatch path verifying:
- HITL functions are called with correct arguments after worktree creation
- `rebase()` is called with the phase and worktree path
- The existing manual CLI path (runner without `skipPreDispatch`) remains unchanged

## Acceptance Criteria

- [ ] `dispatchPhase()` calls `rebase(phase, { cwd: wt.path })` after worktree creation and before SDK dispatch
- [ ] `dispatchPhase()` calls the full HITL sequence (`cleanHitlSettings`, `getPhaseHitlProse`, `buildPreToolUseHook`, `writeHitlSettings`) after worktree creation and before SDK dispatch
- [ ] `loadConfig()` is called inside `dispatchPhase()` to provide HITL config
- [ ] The `skipPreDispatch` comment in `runner.ts` accurately describes the post-fix contract
- [ ] Existing `pipeline-runner.test.ts` tests continue to pass unchanged
- [ ] New tests verify rebase and HITL calls happen in the `dispatchPhase()` path
- [ ] The manual CLI path (`runner.ts` without `skipPreDispatch`) behavior is unchanged
