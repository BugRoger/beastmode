## Problem Statement

The CLI handles git merge operations (multi-branch coordination, squash-merge to main, branch archiving) which makes it overly complex for what should be a phase dispatch orchestrator. The merge-coordinator module alone is 328 lines of conflict simulation, merge ordering, and coordinated execution — all complexity that doesn't belong in the CLI's scope.

## Solution

Remove all merge logic from the CLI. The worktree lifecycle becomes create + delete only. Implement fan-out shares the epic worktree instead of creating per-feature branches. Release teardown removes the worktree without merging or archiving. Users handle squash-merging to main themselves.

## User Stories

1. As a CLI user, I want the release phase to simply remove the worktree after a successful release, so that the CLI doesn't make irreversible git state changes on my behalf.

2. As a watch loop user, I want implement fan-out to run all feature sessions in parallel on the same epic worktree, so that there are no per-feature branches to merge back.

3. As a CLI user, I want `beastmode cancel` to skip the archive step and just remove the worktree, update the manifest, and close the GitHub epic, so that cancel is simpler and doesn't create archive tags.

4. As a CLI maintainer, I want the merge-coordinator module and its tests deleted, so that the CLI has fewer moving parts and a smaller surface area.

## Implementation Decisions

- Delete `merge-coordinator.ts` entirely — all functions (simulateMerge, simulateAll, computeMergeOrder, executeMerge, coordinateMerges, mergeSingleBranch) and all associated types
- Remove `merge()` and `archive()` from `worktree.ts` — keep create, enter, ensureWorktree, exists, remove
- Simplify release teardown in `commands/phase.ts` — on successful release, call `removeWorktree()` only (no archive, no merge)
- Remove archive step from `commands/cancel.ts` — cancel becomes: remove worktree → update manifest → close GitHub
- Remove `mergeCompletedFeatures()`, `featureResults` tracking map, and `coordinateMerges` import from `watch.ts`
- Change watch loop fan-out to dispatch all feature implement sessions to the same epic worktree (same `cwd`, same `feature/<slug>` branch) instead of creating per-feature worktrees
- Delete `merge-coordinator.test.ts` and remove merge-related assertions from tests for phase.ts, cancel.ts, and watch.ts
- The worktree.ts module description/header should be updated to reflect the reduced scope (create, enter, exists, remove — no merge or archive)

## Testing Decisions

- Delete `merge-coordinator.test.ts` entirely — the module no longer exists
- Update phase command tests to verify release teardown calls `removeWorktree()` only (no archive, no merge)
- Update cancel command tests to verify archive is not called
- Update watch loop tests to verify fan-out dispatches feature sessions with the epic worktree slug (not per-feature slugs) and that no merge coordination occurs after completion
- Existing test patterns in `cli/src/__tests__/` use Bun test runner with mock dependencies — follow the same pattern

## Out of Scope

- Updating `.beastmode/context/DESIGN.md` or `.beastmode/meta/DESIGN.md` — retro phase handles knowledge hierarchy updates
- Changing the implement skill itself — skills are pure content processors, unaware of worktree or merge logic
- Adding any replacement merge mechanism — the user handles git merges outside of beastmode
- Changing the branch naming convention (`feature/<slug>`) — branches still exist, just no CLI-driven merging
- Parallel commit conflict handling — that's the accepted tradeoff of running features in parallel on one worktree

## Further Notes

The prior design context documents several ALWAYS/NEVER rules about merge behavior (e.g., "ALWAYS merge implement worktrees sequentially with pre-merge conflict simulation", "ALWAYS squash-merge feature branch at release"). These will become stale after this change. The retro phase will reconcile them in the next cycle.

## Deferred Ideas

- A `beastmode merge` subcommand that provides optional merge assistance without coupling it to phase dispatch — if users want CLI-assisted merging, it could be a standalone command rather than built into the phase lifecycle.
