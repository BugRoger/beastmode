# Keyboard Navigation

## Context
Dashboard needs interactive control without mouse input. Cancel epic requires both manifest state machine transition and running session abort.

## Decision
Four keybindings: q/Ctrl+C (quit), up/down (navigate), x (cancel with inline y/n confirmation), a (toggle auto-scroll). Cancel aborts running sessions via DispatchTracker first, then delegates full cleanup to the shared cancel module (`cancelEpic()` from `cancel-logic.ts`) — ordered removal of worktree, branch, tags, artifacts, GitHub issue, and manifest.

## Rationale
Inline confirmation prevents accidental cancellation. Session abort before cancel ensures resources are freed immediately rather than completing work on a cancelled epic. Delegating to the shared cancel module guarantees the same cleanup behavior as CLI cancel and design-abandon — single code path for all cancellation.

## Source
.beastmode/artifacts/design/2026-03-31-fullscreen-dashboard.md
.beastmode/artifacts/implement/2026-03-31-fullscreen-dashboard-keyboard-nav.md
.beastmode/artifacts/design/2026-04-02-cancel-cleanup.md
.beastmode/artifacts/implement/2026-04-02-cancel-cleanup-consumer-swap.md
