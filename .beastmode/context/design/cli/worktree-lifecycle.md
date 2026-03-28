## Context
Worktree management was fragmented across Justfile, WorktreeCreate hook, and CLI module. Needed consolidation into a single authority.

## Decision
CLI owns full worktree lifecycle: create at first phase encounter with `feature/<slug>` branch detection, persist through all intermediate phases, squash-merge to main and remove at release. Justfile deleted. WorktreeCreate hook deleted. Failed phases leave worktree dirty for retry. Watch loop uses the same worktree functions as manual execution.

## Rationale
Single-authority worktree management eliminates fragile indirection. Persist-across-phases (instead of per-session ephemeral) removes the need for repeated worktree creation. Error recovery is simple: retry the same phase in the same dirty worktree.

## Source
`.beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md`
`.beastmode/state/design/2026-03-28-cli-worktree-management.md`
