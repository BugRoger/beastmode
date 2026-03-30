---
phase: plan
epic: status-watch
feature: poll-loop
---

# Poll Loop

**Design:** `.beastmode/artifacts/design/2026-03-30-status-watch.md`

## User Stories

1. As a pipeline operator, I want to run `beastmode status --watch` so that I can see pipeline state updating in real-time without re-running the command.
4. As a pipeline operator, I want to see whether `beastmode watch` is currently running so that I know if the pipeline is being actively driven or just sitting idle.
5. As a pipeline operator, I want to exit the dashboard cleanly with Ctrl+C so that I can return to my terminal without residual state.

## What to Build

Implement a watch loop inside the status command that polls every 2 seconds using `setInterval`. On each tick, call `scanEpics` to get fresh manifest state, pass it through the render function (from feature 1), and redraw the terminal using ANSI escape sequences: cursor home (`\x1b[H`) and clear screen (`\x1b[2J`) before each render.

The watch loop indicator reads the existing lockfile via `readLockfile()` from the lockfile module on each tick to determine if `beastmode watch` is active. This status is passed to the render function for display in the header.

Register a SIGINT handler that clears the interval timer, shows the cursor if hidden, and exits cleanly. No terminal state should leak after exit (no orphaned raw mode, no hidden cursor).

The poll loop should render immediately on start (no 2-second delay before first frame), then set up the interval for subsequent refreshes.

## Acceptance Criteria

- [ ] `beastmode status --watch` enters a persistent live-updating mode
- [ ] Screen redraws every 2 seconds with fresh manifest data
- [ ] First render happens immediately (no initial delay)
- [ ] Watch loop indicator shows "running" or "stopped" based on lockfile
- [ ] Ctrl+C exits cleanly with no residual terminal state
- [ ] SIGINT handler clears interval timer
- [ ] No new dependencies added
- [ ] Integration test: write mock manifest, verify dashboard output includes expected content
