---
phase: design
slug: remove-impl-branches
epic: remove-impl-branches
status: completed
---

## Problem Statement

Parallel feature implementations during the implement phase create separate `impl/<slug>--<feature>` branches but all run in the same git worktree directory (`.claude/worktrees/<slug>`). Each feature session must `git checkout` its impl branch, causing a race: whichever checkout completes last wins the working directory, and the other session silently commits to the wrong branch. This produces flip-flopping branch state, misattributed commits, rebase conflicts at checkpoint, and push failures.

## Solution

Remove impl branches entirely. Parallel feature agents commit directly to the shared `feature/<slug>` branch using the existing `git add <files>` + `git commit` pattern. The plan phase's wave system already guarantees that features within the same wave touch disjoint file sets — this file-level isolation is the real concurrency mechanism, not branches. Branches were redundant protection that introduced the very race they were meant to prevent.

## User Stories

1. As a pipeline operator, I want parallel feature agents to commit to the same branch without checkout races, so that concurrent implementation doesn't produce corrupted git state.

2. As a pipeline operator, I want the checkpoint phase to complete without rebase conflicts, so that features don't block each other at the merge-back step.

3. As a pipeline operator, I want a simpler branch model (one branch per epic, no impl branches), so that debugging git state during implementation is straightforward.

4. As a feature agent, I want to commit my changes without worrying about another agent's checkout clobbering my working directory, so that my commits land on the correct branch.

5. As the validate phase, I want all feature commits already on the feature branch when I run, so that there's no merge-back step between implement and validate.

## Implementation Decisions

- **No impl branches**: Remove `implBranchName()` and `createImplBranch()` from `worktree.ts`. Remove all call sites in `runner.ts`, `watch-loop.ts`, and `push.ts`.

- **Keep git add + git commit**: Agents continue using `git add <files>` followed by `git commit`. Wave file isolation ensures parallel agents stage disjoint files, so staging area interleaving is harmless. Git's index.lock serializes concurrent commits — agents retry naturally on lock contention.

- **Checkpoint simplified**: The current checkpoint performs rebase of the impl branch onto the feature branch, then fast-forward merge, then commits the artifact. Without impl branches, the rebase and merge steps are removed. Checkpoint becomes: write the implementation artifact report, commit it (`git add artifacts/ && git commit`), stop. No `git rebase`, no `git merge --ff-only`, no `git checkout`.

- **Drop branch linking during implement**: `branch-link.ts` currently links impl branches to feature GitHub issues. With impl branches gone, feature-level branch linking during the implement phase is dropped entirely (epic-level branch linking already exists).

- **Feature branch push only**: The push step stops pushing `impl/<slug>--<feature>` branches. Only `feature/<slug>` is pushed to remote. Multiple features completing at different times each push the same branch — later pushes include earlier commits since everything is on one branch.

- **Interleaved commit history accepted**: Commits from parallel features within a wave will interleave on the feature branch. This is acceptable because release squash-merges the feature branch into main, so branch history topology is irrelevant.

- **Wave file isolation is the concurrency mechanism**: The plan phase already enforces that features within the same wave touch disjoint file sets. This is preserved unchanged. It is the foundation that makes branchless parallel commits safe.

- **Regression flow unchanged**: When validate fails and features regress to `pending`, no git state is touched — features just re-dispatch. Removing impl branches does not affect this. Re-dispatched agents commit new changes on top of existing feature branch commits.

- **Full removal, not dead code**: `implBranchName()`, `createImplBranch()`, and all references are deleted, not left as dead code.

- **Agent constraint update**: The implement-dev agent's constraints change from "stay on your impl branch" to "commit only your task's files using `git add <files>` + `git commit`". The "Do NOT switch branches" constraint is removed since there are no branches to switch to.

- **Worktree cleanup simplified**: `worktree.remove()` currently deletes all `impl/<slug>--*` branches. This loop becomes dead code and is removed.

- **Phase 0 branch verification removed**: The implement skill currently verifies the agent is on the correct `impl/<slug>--<feature>` branch. This check is removed since all agents work on `feature/<slug>`.

## Testing Decisions

- Verify that two concurrent `git add <disjoint files>` + `git commit` on the same branch in the same worktree both succeed (one may retry on index.lock)
- Verify that `worktree.remove()` still cleans up correctly without impl branches
- Verify the implement skill checkpoint commits artifact report without rebase/merge
- Verify push.ts only pushes `feature/<slug>`, not impl branches
- Verify branch-link.ts skips linking during implement phase
- Delete all impl branch tests from worktree.test.ts (implBranchName, createImplBranch, cleanup loop) — no dead tests
- Existing integration tests for the pipeline runner, watch loop fan-out, and reconciliation should pass with impl branch code removed
- Context docs with stale impl branch references are left for retro at release

## Out of Scope

- Wave file isolation enforcement (already exists in plan phase, unchanged)
- Changes to design, plan, validate, or release phases
- Changes to the worktree-per-epic model
- Git index retry logic (agents handle this naturally)
- Commit message format changes

## Further Notes

The impl branch model was inherited from a design where parallel agents needed branch-level isolation. The addition of wave-based file isolation during the plan phase made branch isolation redundant. This PRD removes the redundant layer.

## Deferred Ideas

None
