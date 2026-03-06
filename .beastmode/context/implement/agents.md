# Agents

Multi-agent safety rules and workflows for implementation. Never guess, always verify. Explicit safety boundaries for git operations, worktree management, and file modifications. Feature workflow with branch naming and release ownership.

## Safety Rules
High-confidence actions only. Never guess file paths. Verify worktree context. No stash, no branch switches, no worktree modifications without explicit request.

1. NEVER stash, switch branches, or modify worktrees without explicit user request
2. NEVER guess file paths — verify they exist first
3. ALWAYS verify worktree context (pwd, git branch) before modifying files
4. NEVER run destructive git commands (reset --hard, push --force) without user confirmation

## Git Workflow
Natural commits during implementation. Release owns the squash merge. Feature branches named `feature/<feature>`.

1. ALWAYS commit naturally during implementation — don't batch
2. NEVER push to main directly — release handles the squash merge
3. ALWAYS use `feature/<feature>` branch naming
4. Worktree discovery: check `.beastmode/worktrees/` for active worktrees

## Parallel Dispatch
File-isolated waves enable parallel agent spawning. Same-wave tasks can run simultaneously if no shared files.

1. ALWAYS verify file isolation before parallel dispatch
2. NEVER let two agents modify the same file simultaneously
3. Report results per-agent after completion — never merge silently
