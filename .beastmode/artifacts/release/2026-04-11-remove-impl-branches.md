---
phase: release
slug: remove-impl-branches
epic: remove-impl-branches
bump: minor
---

# Release: remove-impl-branches

**Version:** v0.112.0
**Date:** 2026-04-11

## Highlights

Remove implementation branches (`impl/<slug>--<feature>`) entirely from the pipeline. Parallel feature agents now commit directly to the shared feature branch, eliminating checkout races, rebase conflicts at checkpoint, and push failures caused by concurrent branch switching in the same worktree.

## Features

- Remove `implBranchName()` and `createImplBranch()` from worktree module and delete corresponding tests
- Remove `parseImplBranch()`, `ImplBranchParts` interface, and impl-specific commit routing from commit-issue-ref module
- Remove impl branch creation from pipeline runner and watch-loop fan-out dispatch
- Remove impl branch pushing from git push module
- Remove impl-to-feature-issue linking from branch-link orchestrator
- Remove impl branch cleanup loop from `worktree.remove()`
- Update implement skill: remove Phase 0 branch verification, Phase 3 rebase/merge, and impl branch agent constraints
- Update implement-dev agent: constraints now reference `git add <files>` + `git commit` on the current branch
- Clean stale impl branch mocks from all test files

## Full Changelog

- `e53a0d37` feat(remove-impl-branches): remove implBranchName and createImplBranch from worktree module
- `66fa3f41` feat(remove-impl-branches): remove parseImplBranch and impl routing from commit-issue-ref
- `0883adbd` feat(remove-impl-branches): remove impl branch references from skill and agent docs
- `5ad10b0b` feat(remove-impl-branches): remove impl branch code from push, branch-link, runner, and watch-loop
- `0c3ac127` feat(remove-impl-branches): clean stale impl branch mocks from additional test files
- `d7d1506b` implement(remove-impl-branches): checkpoint
- `e989b6be` plan(remove-impl-branches): checkpoint
- `2c8bec36` design(remove-impl-branches): checkpoint
- `26b6b155` validate(remove-impl-branches): checkpoint
