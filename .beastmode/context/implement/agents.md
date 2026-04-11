# Agents

## Safety Rules
- NEVER stash, switch branches, or modify worktrees without explicit user request — prevents data loss
- NEVER guess file paths — verify they exist first
- ALWAYS verify worktree context (pwd, git branch) before modifying files — prevents cross-worktree writes
- NEVER run destructive git commands (reset --hard, push --force) without user confirmation — irreversible operations

## Git Workflow
- ALWAYS commit naturally during implementation — don't batch
- NEVER push to main directly — release handles the squash merge
- ALWAYS use `feature/<slug>` for the worktree branch -- all agents commit directly to this branch
- Worktree discovery: check `.beastmode/worktrees/` for active worktrees — cross-session continuity

## Parallel Dispatch
- ALWAYS verify file isolation before parallel dispatch — prevents conflicts
- NEVER let two agents modify the same file simultaneously — race condition
- Report results per-agent after completion — never merge silently
- Same-wave tasks can run simultaneously if no shared files — wave-based parallelism
- ALWAYS verify current file state before implementing a wave task — a parallel task may have already implemented shared prerequisites, reducing the remaining scope

## Sweep Migrations
- ALWAYS pre-enumerate target files in Write Plan tasks for sweep migrations (migrate all X, replace all Y) — agent grep at dispatch time misses files in atypical paths; spec reviewer verifies list completeness with second grep

context/implement/agents/sweep-migration-coverage.md

## Agent Definitions
- ALWAYS use `<phase>-<role>` naming for agent files — no stuttering (implement-dev not implement-implementer)
- ALWAYS dispatch agents via `subagent_type="beastmode:<agent-name>"` — not manual prompt assembly with general-purpose
- ALWAYS put agent role/persona in the agent definition file — prompts passed at dispatch contain only task context (requirements, file contents, conventions)
