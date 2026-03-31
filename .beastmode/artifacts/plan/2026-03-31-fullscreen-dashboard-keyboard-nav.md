---
phase: plan
epic: fullscreen-dashboard
feature: keyboard-nav
---

# Keyboard Navigation

**Design:** .beastmode/artifacts/design/2026-03-31-fullscreen-dashboard.md

## User Stories

5. As a pipeline operator, I want to navigate epics with arrow keys and cancel a selected epic with 'x' (with inline confirmation) so that I can intervene without leaving the dashboard.
6. As a pipeline operator, I want cancelling an epic to abort any running sessions for that epic so that resources are freed immediately rather than completing work on a cancelled epic.
7. As a pipeline operator, I want the dashboard to exit gracefully when I press 'q' or Ctrl+C, waiting for active sessions to finish (up to 30s), so that I don't lose in-progress work.

## What to Build

A keyboard interaction layer for the dashboard Ink application, using Ink's `useInput` hook for key event handling.

**Epic row navigation:**
- `↑`/`↓` arrow keys move a selection highlight between epic rows in the table
- Selected row is visually distinguished (e.g., inverse colors or a selection indicator)
- Selection wraps at boundaries or clamps — either is acceptable

**Cancel flow:**
- `x` on a selected epic triggers an inline confirmation prompt rendered within the table row or below it: "Cancel {slug}? y/n"
- While confirmation is active, other keybindings are suppressed (modal state)
- `y` confirms: marks the epic as cancelled via the pipeline state machine (sends CANCEL event to the epic actor), then calls DispatchTracker to abort all running sessions for that epic. The activity log receives a cancel event and any abort events
- `n` or Escape dismisses the confirmation and returns to normal navigation

**Toggle done/cancelled visibility:**
- `a` toggles whether done and cancelled epics are shown in the table (mirrors the `--all` flag behavior from the status command, using the shared data module's filter function)

**Graceful shutdown:**
- `q` or Ctrl+C triggers graceful exit
- The Ink app calls `loop.stop()` on the embedded WatchLoop, which waits up to 30 seconds for active sessions to complete
- After sessions drain (or timeout), the app exits the alternate screen buffer and restores the terminal
- Activity log shows "shutting down..." and session drain progress during the wait

## Acceptance Criteria

- [ ] Arrow keys move selection highlight between epic rows
- [ ] `x` shows inline confirmation with epic slug, `y` cancels and aborts sessions, `n` dismisses
- [ ] Cancel marks manifest as cancelled via state machine and aborts running sessions via DispatchTracker
- [ ] `a` toggles visibility of done/cancelled epics
- [ ] `q` and Ctrl+C trigger graceful shutdown with up to 30s session drain before exit
