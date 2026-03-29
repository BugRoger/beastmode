# Release v0.3.0

**Date:** 2026-03-04

## Highlights

New git branching strategy with `feature/<feature>` branches and `.beastmode/worktrees/` isolation. Task runner now supports lazy sub-step expansion.

## Features

- **Git branching & worktree strategy**: Replaced `cycle/<topic>` with `feature/<feature>` branch naming. Worktrees now live at `.beastmode/worktrees/<feature>`. All worktree logic extracted to shared `_shared/worktree-manager.md`. Natural commits re-enabled (removed "Do NOT commit" constraints). Release still owns merge to main.
- **Task runner lazy expansion**: Sub-steps now expand lazily via TodoWrite tracking, only loading child tasks when a parent becomes active.

## Full Changelog

- e157de8 feat(task-runner): add lazy sub-step expansion to TodoWrite tracking
- feat(git-branching): rewrite worktree-manager.md with create/enter/merge/cleanup
- feat(git-branching): update all phase primes to @import shared worktree refs
- feat(git-branching): remove "Do NOT commit" constraints from design/implement
- feat(git-branching): extract release merge logic to shared worktree-manager
- feat(git-branching): update context docs (agents.md, conventions.md, structure.md)
