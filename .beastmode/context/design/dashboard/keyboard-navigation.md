# Keyboard Navigation

## Context
Dashboard needs interactive control without mouse input. Cancel epic requires both manifest state machine transition and running session abort.

## Decision
Six keybindings in a flat model: q/Ctrl+C (quit), up/down (navigate epics), x (cancel with inline y/n confirmation), a (toggle done/cancelled visibility), / (filter by name). Cancel aborts running sessions via DispatchTracker first, then delegates full cleanup to the shared cancel module (`cancelEpic()` from `cancel-logic.ts`). No drill-down keys — details and log panels react passively to epic selection.

## Rationale
Inline confirmation prevents accidental cancellation. Session abort before cancel ensures resources are freed immediately. Delegating to the shared cancel module guarantees the same cleanup behavior as CLI cancel and design-abandon. Flat model eliminates Enter/Escape drill-down keys in favor of immediate panel updates.

## Source
.beastmode/artifacts/design/2026-04-03-dashboard-rework.md
