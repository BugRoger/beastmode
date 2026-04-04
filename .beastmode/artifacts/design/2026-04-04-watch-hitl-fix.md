---
phase: design
slug: watch-hitl-fix
epic: watch-hitl-fix
---

## Problem Statement

The watch loop's `dispatchPhase()` function creates a worktree and dispatches an SDK session but never writes HITL hooks or rebases the branch onto main. The pipeline runner then skips steps 1-3 via `skipPreDispatch: true` because a comment claims "session factory already handled worktree/rebase/settings." The factory didn't. Every `AskUserQuestion` call in watch-loop-dispatched sessions (plan, implement, validate, release) blocks for human input regardless of the `hitl:` config in `config.yaml`.

## Solution

Add rebase and HITL settings write to `dispatchPhase()` in `watch.ts`, between worktree creation and SDK dispatch — making the comment true. Update the runner comment to accurately describe what `skipPreDispatch` means after the fix.

## User Stories

1. As a user running `beastmode watch`, I want AskUserQuestion calls in plan/implement/validate/release phases to be auto-answered according to my `hitl:` config, so that the pipeline doesn't stall waiting for human input on decisions I've already delegated.
2. As a user running `beastmode watch`, I want each dispatched session's worktree to be rebased onto main before the phase runs, so that phases operate on the latest code — matching the behavior of the manual CLI path.
3. As a developer reading the pipeline runner, I want comments to accurately describe what `skipPreDispatch` means, so that the next person doesn't repeat this same gap.

## Implementation Decisions

- **Fix location**: `dispatchPhase()` in `cli/src/commands/watch.ts`, after `worktree.create()` (line ~131) and before SDK dispatch
- **Rebase**: Call `rebase(opts.phase, { cwd: wt.path })` — same call as `runner.ts` step 2. Import from `git/worktree.ts`
- **HITL settings write**: Call `cleanHitlSettings()`, `getPhaseHitlProse()`, `buildPreToolUseHook()`, `writeHitlSettings()` — same sequence as `runner.ts` step 3. Config loaded via `loadConfig()` at dispatch time
- **Config loading**: `dispatchPhase()` needs access to `BeastmodeConfig`. Load it inside the function since the watch loop already calls `loadConfig()` once — one extra call per dispatch is acceptable
- **Comment fix**: Update `runner.ts` line 116 to accurately describe the contract: factory handles worktree + rebase + HITL settings before dispatch, runner handles post-dispatch (steps 5-9)
- **No changes to `skipPreDispatch` semantics**: The flag still means "skip steps 1-3" — the fix makes the precondition true

## Testing Decisions

- Verify HITL hooks appear in `settings.local.json` inside the worktree after `dispatchPhase()` runs
- Verify rebase is called before dispatch in the watch loop path
- Verify the manual CLI path behavior is unchanged
- Prior art: existing `pipeline-runner.test.ts` `skipPreDispatch` tests verify post-dispatch steps run; new test should verify pre-dispatch steps happen in `dispatchPhase()`

## Out of Scope

- CmuxSessionFactory or ITermSessionFactory HITL injection (they go through `phase.ts` cmux path which already writes HITL)
- Refactoring `skipPreDispatch` into a cleaner abstraction
- Adding rebase/HITL to other factory paths

## Further Notes

None

## Deferred Ideas

None
