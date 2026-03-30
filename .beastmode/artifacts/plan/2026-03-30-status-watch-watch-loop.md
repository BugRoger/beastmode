---
phase: plan
epic: status-watch
feature: watch-loop
---

# Watch Loop

**Design:** .beastmode/artifacts/design/2026-03-30-status-watch.md

## User Stories

1. As a pipeline operator, I want to run `beastmode status --watch` so that I can see pipeline state updating in real-time without re-running the command.
5. As a pipeline operator, I want to exit the dashboard cleanly with Ctrl+C so that I can return to my terminal without residual state.

## What to Build

Add `--watch` / `-w` flag parsing to the status command. When the flag is present, enter a persistent poll loop instead of one-shot output.

The watch loop should:
- Clear the screen using ANSI escape sequences (cursor home + clear screen) before each render
- Call the extracted render function every 2 seconds via `setInterval`
- Perform a full manifest scan on each tick (reuse existing `scanEpics`)
- Register a SIGINT handler that clears the interval timer, restores terminal state (show cursor if hidden), and exits cleanly
- Print a footer line indicating the dashboard is live (e.g., timestamp of last refresh and "Ctrl+C to exit")

No new dependencies — pure ANSI escape codes over stdout. The watch mode is always compact (no `--verbose` support).

## Acceptance Criteria

- [ ] `beastmode status --watch` and `beastmode status -w` enter the watch loop
- [ ] Screen clears and redraws the status table every 2 seconds
- [ ] Ctrl+C exits cleanly with no residual terminal state
- [ ] Footer shows last refresh timestamp and exit instructions
- [ ] One-shot `beastmode status` behavior is unchanged
- [ ] Integration test verifies watch mode renders expected content from mock manifests
