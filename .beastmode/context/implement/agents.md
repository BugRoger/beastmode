# Agents

## Safety Rules
- NEVER stash, switch branches, or modify worktrees without explicit user request — prevents data loss
- NEVER guess file paths — verify they exist first
- ALWAYS verify worktree context (pwd, git branch) before modifying files — prevents cross-worktree writes
- NEVER run destructive git commands (reset --hard, push --force) without user confirmation — irreversible operations

## Git Workflow
- ALWAYS commit naturally during implementation — don't batch
- NEVER push to main directly — release handles the squash merge
- ALWAYS use `feature/<feature>` branch naming — convention
- Worktree discovery: check `.beastmode/worktrees/` for active worktrees — cross-session continuity

## Parallel Dispatch
- ALWAYS verify file isolation before parallel dispatch — prevents conflicts
- NEVER let two agents modify the same file simultaneously — race condition
- Report results per-agent after completion — never merge silently
- Same-wave tasks can run simultaneously if no shared files — wave-based parallelism
- ALWAYS verify current file state before implementing a wave task — a parallel task may have already implemented shared prerequisites, reducing the remaining scope
