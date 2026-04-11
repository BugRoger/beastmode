---
phase: plan
slug: remove-impl-branches
epic: remove-impl-branches
feature: remove-impl-branches
wave: 1
---

# Remove Impl Branches

**Design:** .beastmode/artifacts/design/2026-04-11-remove-impl-branches.md

## User Stories

1. As a pipeline operator, I want parallel feature agents to commit to the same branch without checkout races, so that concurrent implementation doesn't produce corrupted git state.

2. As a pipeline operator, I want the checkpoint phase to complete without rebase conflicts, so that features don't block each other at the merge-back step.

3. As a pipeline operator, I want a simpler branch model (one branch per epic, no impl branches), so that debugging git state during implementation is straightforward.

4. As a feature agent, I want to commit my changes without worrying about another agent's checkout clobbering my working directory, so that my commits land on the correct branch.

5. As the validate phase, I want all feature commits already on the feature branch when I run, so that there's no merge-back step between implement and validate.

## What to Build

### Core Worktree Module

Delete `implBranchName()` and `createImplBranch()` from the worktree module. Remove the impl branch cleanup loop from `remove()` — the loop that lists and deletes `impl/<slug>--*` branches. The `remove()` function keeps its worktree removal and optional feature branch deletion behavior. Delete the corresponding test suites (`implBranchName`, `createImplBranch`, `impl branch cleanup on remove`).

### Pipeline Runner

Remove the `createImplBranch` import and the impl branch creation block that runs before dispatch during the implement phase. The runner no longer creates any branches — it uses the feature branch that the worktree was created on.

### Watch Loop

Remove the `createImplBranch` import and the impl branch creation call in `dispatchFanOut()`. The watch loop dispatches feature sessions directly without creating impl branches.

### Git Push Module

Remove the `implBranchName` import and the conditional impl branch push during the implement phase. `pushBranches()` only pushes `feature/<slug>`. The `PushBranchesOpts` interface and feature branch push are unchanged.

### Branch Link Orchestrator

Remove the `implBranchName` import and the impl-to-feature-issue linking block during the implement phase. `linkBranches()` only links the feature branch to the epic issue. The linkOneBranch helper and feature-branch-to-epic-issue linking are unchanged.

### Commit Issue Reference Module

Remove the `ImplBranchParts` interface, `parseImplBranch()` function, and the impl branch routing path in `resolveIssueNumber()`. Remove the `implement(<slug>--<feature>):` commit message pattern matching in `resolveCommitIssueNumber()` since impl checkpoint commits no longer exist. The `feat(<feature>):` routing (for per-task commits which now land directly on the feature branch) and the feature/main branch routing remain. Update corresponding tests.

### Implement Skill Document

Remove Phase 0 Step 1 (verify implementation branch). Remove Phase 3 Step 2 (rebase implementation branch onto worktree branch). Simplify Phase 3 Step 3 (commit and handoff) — just commit artifacts, no rebase/merge prerequisite. Update the Subagent Safety constraints: agents commit to the feature branch using `git add <files>` + `git commit`, not to an impl branch. Remove references to `impl/<slug>--<feature-name>` throughout.

### Implement Dev Agent Document

Update the Constraints section: remove "Do NOT switch branches — stay on your impl branch" and "Do NOT commit to any branch except your current impl branch." Replace with constraint to commit only the task's files using `git add <files>` + `git commit` on the current branch. Remove the Commit Per Task section's implicit assumption about impl branches.

### Test Cleanup

Delete tests that exercise removed functions. Update tests that mock removed imports — remove the mock declarations for `implBranchName` and `createImplBranch`. Tests for remaining behavior (feature branch push, feature-branch-to-epic linking, feat() commit routing) should pass unchanged after removing the impl branch mocks.

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] `implBranchName` and `createImplBranch` are not exported from the worktree module
- [ ] `remove()` no longer lists or deletes `impl/<slug>--*` branches
- [ ] `runner.ts` has no import or call to `createImplBranch`
- [ ] `watch-loop.ts` has no import or call to `createImplBranch`
- [ ] `push.ts` has no import of `implBranchName` and does not push impl branches
- [ ] `branch-link.ts` has no import of `implBranchName` and does not link impl branches
- [ ] `commit-issue-ref.ts` has no `parseImplBranch`, no `ImplBranchParts`, and no impl-specific commit routing
- [ ] `implement/SKILL.md` has no Phase 0 branch verification, no Phase 3 rebase/merge, and no impl branch references in constraints
- [ ] `implement-dev.md` constraints reference `git add <files>` + `git commit` on the current branch, with no impl branch references
- [ ] All existing tests pass (after removing dead tests and stale mocks)
- [ ] No dead imports of removed functions anywhere in the codebase
