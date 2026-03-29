# simplify-watch-fanout

**Design:** .beastmode/state/design/2026-03-29-remove-merge-logic-from-cli.md

## User Stories

2. As a watch loop user, I want implement fan-out to run all feature sessions in parallel on the same epic worktree, so that there are no per-feature branches to merge back.

## What to Build

Rewrite the watch loop's implement fan-out to share the epic worktree across all feature sessions instead of creating per-feature worktrees and branches.

**Fan-out change:** When dispatching implement sessions for features, pass the epic worktree slug as the cwd for all sessions. All feature implement sessions run in the same `feature/<epic-slug>` branch within the same worktree directory. No per-feature worktree creation.

**Remove merge coordination:** Delete `mergeCompletedFeatures()` and the `featureResults` tracking map from the watch loop. Remove the `coordinateMerges` import from merge-coordinator. After all feature sessions complete, no merge step occurs — the epic branch already has all commits.

**Remove per-feature worktree cleanup:** Since features no longer get their own worktrees, there are no per-feature worktrees to remove after merge. The epic worktree persists until release or cancel.

**Tests:** Update watch loop tests to verify: (a) fan-out dispatches feature sessions using the epic worktree slug as cwd, (b) no `coordinateMerges` call occurs after completion, (c) no per-feature worktree removal after implement.

## Acceptance Criteria

- [ ] Watch loop fan-out dispatches all feature implement sessions to the same epic worktree
- [ ] No per-feature worktrees or branches are created during implement fan-out
- [ ] `mergeCompletedFeatures()` is removed from the watch loop
- [ ] `featureResults` tracking map is removed from the watch loop
- [ ] No import of `coordinateMerges` in watch.ts
- [ ] All watch loop tests pass with the new fan-out model
