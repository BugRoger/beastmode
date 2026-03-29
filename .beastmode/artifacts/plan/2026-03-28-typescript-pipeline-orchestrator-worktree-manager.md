# worktree-manager

**Design:** .beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md
**Architectural Decisions:** see manifest

## User Stories

1. As a developer, I want to run `beastmode run plan foo` so that a single phase executes in a worktree with streaming output, replacing `just plan foo`.
2. As a developer, I want to run `beastmode watch` so that all epics with completed designs are automatically driven through plan -> release without manual phase invocations.

## What to Build

A TypeScript worktree lifecycle module that replaces the shell-based `hooks/worktree-create.sh`. The module provides four operations:

- **Create:** Creates a git worktree at `.claude/worktrees/<slug>` with `feature/<slug>` branch detection. If the branch exists (local or remote), checks it out; otherwise creates a new branch from `origin/HEAD` (or `HEAD` if no remote). Prunes stale worktree references before creation.
- **Enter:** Returns the absolute path for use as `cwd` in SDK session configuration.
- **Merge:** Squash-merges the feature branch back to main. Used by the run command after phase completion and by the watch loop after all phases complete.
- **Remove:** Cleans up the worktree directory and optionally deletes the feature branch.

The module executes git commands via `Bun.spawn` (or equivalent subprocess API) and is consumed by both the run command and the watch loop.

## Acceptance Criteria

- [ ] Creates worktree at `.claude/worktrees/<slug>` with correct branch (existing `feature/<slug>` or new from origin/HEAD)
- [ ] Detects and reuses existing local and remote feature branches
- [ ] Prunes stale worktree references on creation
- [ ] Merge operation squash-merges feature branch to main
- [ ] Remove operation cleans up worktree directory and optionally deletes branch
- [ ] All git operations use Bun subprocess APIs (no shell scripts)
- [ ] Error handling for common git failures (branch conflicts, dirty worktrees)
