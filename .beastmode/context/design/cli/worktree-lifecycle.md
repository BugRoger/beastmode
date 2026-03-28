## Context
Worktree management was previously split between a shell hook and Claude Code's native worktree features, causing reliability issues (60-80% reliability).

## Decision
CLI owns full worktree lifecycle in TypeScript: create with `feature/<slug>` branch detection, point SDK session at it via `cwd`, merge after completion, remove when done. Shell hook removed.

## Rationale
External harness ownership of worktrees eliminates the session-scoped lifetime problem and worktree data-loss bugs in Claude Code. TypeScript rewrite of branch detection logic is more maintainable than shell scripts.

## Source
`.beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md`
