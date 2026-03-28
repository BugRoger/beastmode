# Worktree Isolation

## Context
Implementation needs to execute complex plans without disrupting main branch or other agents. With CLI consolidation, worktrees persist across phases and feature branches remain the durable handoff.

## Decision
CLI owns full worktree lifecycle in TypeScript. Worktrees created in `.claude/worktrees/` (Claude Code default). Branch detection: reuse `feature/<slug>` if it exists, otherwise create from origin/HEAD. Worktrees persist across phases (create-once at first phase, squash-merge and remove at release) — not ephemeral per-session. Skills are completely worktree-blind — they run in whatever cwd the CLI provides. Agent-spawned worktrees use `isolation: "worktree"` on the Agent tool; skills inside agents detect existing worktree and skip their own creation. Implement fan-out creates per-feature worktrees with `<epic>-<feature>` slug. After parallel implement agents finish, worktrees merge sequentially with manifest completeness verification. Justfile and WorktreeCreate hook are deleted.

## Rationale
- Git worktrees provide branch isolation without stashing or switching
- Persist-across-phases eliminates repeated worktree creation and simplifies error recovery
- CLI consolidation removes fragile three-system indirection (Justfile, hook, CLI module)
- Moving to `.claude/worktrees/` aligns with Claude Code defaults

## Source
state/design/2026-03-04-git-branching-strategy.md
state/design/2026-03-04-worktree-session-discovery.md
state/design/2026-03-28-external-orchestrator.md
state/design/2026-03-28-orchestrator.md
.beastmode/state/design/2026-03-28-cli-worktree-management.md
