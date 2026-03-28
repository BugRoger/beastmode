# Safety Rules

## Context
Agents operating in worktrees can cause data loss or cross-worktree corruption if not constrained.

## Decision
Never stash, switch branches, or modify worktrees without explicit user request. Never guess file paths — verify they exist. Always verify worktree context before modifying files. Never run destructive git commands without confirmation.

## Rationale
Worktree isolation is a core safety property. Agents that assume their environment risk writing to the wrong tree or destroying uncommitted work.

## Source
Source artifact unknown — backfill needed
