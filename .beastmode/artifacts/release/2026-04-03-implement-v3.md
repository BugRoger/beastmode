---
phase: release
slug: implement-v3
epic: implement-v3
bump: minor
---

# Release: implement-v3

**Version:** v0.72.0
**Date:** 2026-04-03

## Highlights

Replaces the implement skill's implicit task decomposition with a visible Write Plan step that produces inspectable `.tasks.md` documents with complete code, TDD cycles, and strict no-placeholder rules. Adds dedicated agent files for implementation (TDD-based), spec compliance review (reads code, doesn't trust reports), and code quality review. Introduces isolated implementation branches per feature with per-task commits and rebase-based checkpoint.

## Features

- feat(branch-checkpoint): rewrite checkpoint with rebase workflow — isolated impl branches per feature with auto-retry conflict resolution
- feat(branch-checkpoint): update Subagent Safety for impl branch commits — agents commit on feature branches, not worktree branch
- feat(branch-checkpoint): clarify impl branch constraints in implementer agent — strict branch discipline in agent instructions
- feat(branch-checkpoint): add branch verification to Prime — CLI creates impl branches, agents verify before writing

## Chores

- implement(implement-v3-write-plan): checkpoint — write plan skill implementation
- implement(implement-v3-agent-review-pipeline): checkpoint — spec compliance + code quality reviewer agents
- implement(implement-v3-branch-checkpoint): checkpoint — branch isolation and rebase checkpoint
- plan(implement-v3): checkpoint — feature decomposition into 3 independent features
- design(implement-v3): checkpoint — design research and decision locking
- design(implement-v3): add stop hook collision avoidance
- validate(implement-v3): checkpoint — 60/60 tests pass, 0 new type errors

## Full Changelog

```
6345a17 validate(implement-v3): checkpoint
89de607 implement(implement-v3-branch-checkpoint): checkpoint
8e04db4 feat(branch-checkpoint): rewrite checkpoint with rebase workflow
428ba25 feat(branch-checkpoint): update Subagent Safety for impl branch commits
88bd240 feat(branch-checkpoint): clarify impl branch constraints in implementer agent
45d67bb feat(branch-checkpoint): add branch verification to Prime
a9bf77b implement(implement-v3-agent-review-pipeline): checkpoint
471aea6 implement(implement-v3-write-plan): checkpoint
b8b3378 plan(implement-v3): checkpoint
a801914 design(implement-v3): checkpoint
fef2eec design(implement-v3): add stop hook collision avoidance
dfb07e9 design(implement-v3): checkpoint
```
