# Keyboard Navigation

## Context
Dashboard needs interactive control without mouse input. Cancel epic requires both manifest state machine transition and running session abort.

## Decision
Four keybindings: q/Ctrl+C (quit), up/down (navigate), x (cancel with inline y/n confirmation), a (toggle auto-scroll). Cancel triggers state machine CANCEL event AND aborts running sessions via DispatchTracker.

## Rationale
Inline confirmation prevents accidental cancellation. Dual action (state machine + session abort) ensures resources are freed immediately rather than completing work on a cancelled epic. The XState v5 persist action runs mid-transition so `actor.getSnapshot().value` still shows source state — cancel action hardcodes "cancelled" as the phase since it only handles CANCEL events.

## Source
.beastmode/artifacts/design/2026-03-31-fullscreen-dashboard.md
.beastmode/artifacts/implement/2026-03-31-fullscreen-dashboard-keyboard-nav.md
