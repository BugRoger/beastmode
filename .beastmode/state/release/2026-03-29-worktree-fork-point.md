# Release: worktree-fork-point

**Version:** v0.35.0
**Date:** 2026-03-29

## Highlights

Worktrees now fork from the local main branch instead of the stale `origin/HEAD` ref, and record the fork-point SHA for audit trail and future merge coordination.

## Features

- **Fork-point tracking** — `resolveMainBranch()` resolves the default branch name from `git symbolic-ref` with fallback to `"main"`; `create()` forks from local main and records the fork-point SHA in `WorktreeInfo`
- **WorktreeInfo expansion** — New `mainBranch` and `forkPoint` fields on the `WorktreeInfo` interface; existing branches derive fork-point via `git merge-base` with graceful `undefined` on failure

## Full Changelog

- `design(worktree-fork-point): checkpoint` — PRD for fork-point tracking
- `plan(worktree-fork-point): checkpoint` — Feature plan with acceptance criteria
- `implement(fork-point-tracking): checkpoint` — resolveMainBranch(), create() rewrite, WorktreeInfo expansion, integration tests
- `validate(worktree-fork-point): checkpoint` — 306 tests pass, type check clean, all acceptance criteria met
