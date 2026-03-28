# merge-coordinator

**Design:** .beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md
**Architectural Decisions:** see manifest

## User Stories

5. As a developer, I want the merger to simulate conflicts before merging and optimize merge order so that avoidable conflicts don't waste agent time.

## What to Build

A merge coordination module that handles post-implementation branch merging with conflict awareness. The module is invoked after features complete implementation and need to be merged back.

**Pre-merge simulation:** For each pair of feature branches that need merging, run `git merge-tree` to simulate the merge and detect which files would conflict. This is a read-only operation that doesn't modify any branches.

**Merge order optimization:** Given the conflict simulation results, compute an optimal merge order that minimizes conflicts. Strategy: merge branches with no conflicts first (they're free), then merge branches that conflict only with already-merged branches, leaving the hardest conflicts for last.

**Sequential merge execution:** Execute merges one at a time in the computed order. For clean merges, execute directly. For conflicting merges, spawn a dedicated Claude SDK session to resolve the conflicts.

**Integration:** The merge coordinator is called by the watch loop after all features in an epic complete implementation, and by the run command after a single phase completes (simpler case — usually just one branch).

## Acceptance Criteria

- [ ] `git merge-tree` simulation detects conflicting files between feature branches
- [ ] Merge order optimizer produces a sequence that puts non-conflicting branches first
- [ ] Clean merges execute without spawning conflict resolution sessions
- [ ] Conflicting merges spawn a dedicated Claude session for resolution
- [ ] Merge results reported per branch (success, conflict-resolved, failed)
- [ ] Works for both single-branch (run command) and multi-branch (watch loop) scenarios
