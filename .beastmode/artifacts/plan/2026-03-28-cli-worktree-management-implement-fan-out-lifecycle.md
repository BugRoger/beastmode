# implement-fan-out-lifecycle

**Design:** .beastmode/state/design/2026-03-28-cli-worktree-management.md
**Architectural Decisions:** see manifest

## User Stories

4. As a developer, I want implement fan-out to create per-feature worktrees and have the merge-coordinator merge them back to the epic's feature branch after all features complete, so that parallel implementation converges cleanly.

## What to Build

Wire the implement phase in the run command to support fan-out: when `beastmode implement <slug>` is invoked, read the manifest to discover all pending features. For each feature, create a per-feature worktree with slug `<epic>-<feature>` and dispatch an SDK session inside it.

After all feature sessions complete, use the existing merge-coordinator to merge per-feature branches back to the epic's feature branch. The merge-coordinator already handles conflict simulation (`git merge-tree`), optimal ordering (clean-first), and sequential execution — this feature connects those primitives to the implement phase lifecycle.

The watch loop's `dispatchFanOut` already handles parallel session dispatch. Align the manual `beastmode implement` path to use the same worktree creation and merge-coordinator flow so automated and manual execution behave identically.

Per-feature worktrees are removed after successful merge. Failed feature worktrees are left intact for retry.

## Acceptance Criteria

- [ ] `beastmode implement <slug>` reads manifest and creates per-feature worktrees
- [ ] Per-feature worktree slugs follow `<epic>-<feature>` convention
- [ ] SDK sessions dispatched per feature with cwd pointing to feature worktree
- [ ] Merge-coordinator merges all feature branches to epic branch after completion
- [ ] Clean merges proceed automatically; conflicts reported clearly
- [ ] Per-feature worktrees removed after successful merge
- [ ] Failed feature worktrees preserved for retry
- [ ] Watch loop fan-out uses same worktree/merge flow as manual execution
