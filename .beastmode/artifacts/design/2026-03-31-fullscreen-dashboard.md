---
phase: design
slug: fullscreen-dashboard
---

## Problem Statement

The pipeline has no single pane of glass. `beastmode status` is a one-shot snapshot that goes stale immediately. `beastmode watch` is a headless log stream with no structure. `beastmode status --watch` is a polling loop with raw ANSI escape codes that shows the table but no activity feed and no ability to take actions. There is no way to see full pipeline state, live orchestration activity, and take actions from one screen.

## Solution

A fullscreen TUI command (`beastmode dashboard`) built with Ink v6 + React that embeds the watch loop orchestrator, renders epic state as a live-updating table with a scrolling activity log below it, and supports cancelling epics with inline confirmation. One process, one screen, full visibility plus control.

## User Stories

1. As a pipeline operator, I want to run `beastmode dashboard` and see all active epics with their phase, feature progress, and status on a single fullscreen terminal so that I have a complete picture of the pipeline at a glance.
2. As a pipeline operator, I want the dashboard to drive the pipeline (scan, dispatch, reconcile) so that I don't need a separate `beastmode watch` process running in another terminal.
3. As a pipeline operator, I want a scrolling activity log showing dispatched sessions, completions, errors, and blocked gates so that I can follow what the orchestrator is doing in real time.
4. As a pipeline operator, I want spinners on active items and animated progress bars on feature completion so that I can see at a glance which epics are actively being worked on.
5. As a pipeline operator, I want to navigate epics with arrow keys and cancel a selected epic with 'x' (with inline confirmation) so that I can intervene without leaving the dashboard.
6. As a pipeline operator, I want cancelling an epic to abort any running sessions for that epic so that resources are freed immediately rather than completing work on a cancelled epic.
7. As a pipeline operator, I want the dashboard to exit gracefully when I press 'q' or Ctrl+C, waiting for active sessions to finish (up to 30s), so that I don't lose in-progress work.

## Implementation Decisions

- Entry point: `beastmode dashboard` as a new CLI subcommand. Does not replace `beastmode watch` (kept as headless fallback) or `beastmode status --watch` (kept for quick passive viewing)
- Framework: Ink v6.8.0 with React and Yoga flexbox layout. Same stack Claude Code uses. Confirmed Bun-compatible. Fullscreen blank-row regression (vadimdemedes/ink#752) fixed in September 2025
- Screen mode: Alternate screen buffer (`\x1b[?1049h` / `\x1b[?1049l`) for clean entry and exit
- Layout: Three-zone vertical stack — header (title + watch status + clock), epic table (sortable by phase lifecycle), scrolling activity log (newest at top)
- Watch loop integration: The dashboard embeds WatchLoop directly, running the full scan-dispatch-reconcile cycle. The WatchLoop class is refactored to extend EventEmitter with typed events (`session-started`, `session-completed`, `scan-complete`, `error`) so Ink components can subscribe. The existing logger becomes one subscriber alongside the React state hooks
- Signal handling: Externalized from WatchLoop. The Ink app's SIGINT handler calls `loop.stop()` then exits. Removes conflict between Ink's signal handling and the watch loop's own handlers
- Lockfile: Dashboard acquires the same lockfile as `beastmode watch` — mutual exclusion prevents two orchestrators from fighting over dispatches
- Poll/refresh cadence: Orchestration scan uses existing `config.cli.interval` (default 60s). UI refresh for clock and spinners ticks every 1s independently
- Animations: Spinners (Ink's built-in spinner component) on epics/features with active sessions. Animated progress bars for feature completion (filled segments). Smooth row transitions when epic count or ordering changes
- Color scheme: Phase-based, matching existing convention — magenta (design), blue (plan), yellow (implement), cyan (validate), green (release), dim green (done), red (blocked), dim red (cancelled)
- Keybindings: `q`/`Ctrl+C` quit, `↑`/`↓` navigate epic rows, `x` cancel selected epic (inline confirmation: "Cancel {slug}? y/n"), `a` toggle showing done/cancelled epics
- Cancel behavior: Marks manifest as cancelled via pipeline state machine AND aborts running sessions for that epic via DispatchTracker. Activity log shows the abort event
- Exit behavior: Graceful shutdown — `loop.stop()` waits up to 30s for active sessions to complete, then exits and restores terminal
- Code sharing: Extract data-only functions (sorting, filtering, change detection) from status.ts into a shared module. Dashboard uses Ink components for rendering. status.ts keeps its ANSI string rendering untouched
- Terminal resize: Handled natively by Ink's Yoga flexbox layout — components reflow automatically
- Dependency additions: `ink` (v6.8.0), `react` (peer dep of Ink) added to cli/package.json

## Testing Decisions

- Unit test shared data module (sorting, filtering, change detection) — pure functions, easy to test
- Unit test WatchLoop event emission — mock deps, verify correct events emitted for dispatch/complete/error scenarios
- Unit test cancel flow — verify manifest update + session abort via DispatchTracker
- Integration test: render Ink components with ink-testing-library, verify table content from mock manifest data
- No snapshot testing of visual output — test logical content and state transitions, not pixel-perfect rendering
- Test graceful shutdown: verify `loop.stop()` is called and sessions are awaited on SIGINT

## Out of Scope

- Replacing `beastmode watch` (kept as headless fallback for CI/automation)
- Replacing `beastmode status` or `status --watch` (kept for quick passive viewing)
- Mouse input or click handling
- Drill-down into epic detail view (split pane was considered, table + log was chosen)
- Pause/resume orchestration from the dashboard
- Force rescan keybinding
- Configurable color themes
- Log persistence or export from the dashboard

## Further Notes

The WatchLoop refactor (adding EventEmitter) is the prerequisite for the dashboard but also improves the headless `beastmode watch` — the logger subscription replaces hardcoded log calls, making the watch loop more testable and extensible.

## Deferred Ideas

- Split pane layout with epic detail view — add if table + log proves insufficient for large epic counts
- Pause/resume orchestration from dashboard ('p' key) — add if operators need to temporarily halt without quitting
- Force rescan keybinding ('r' key) — add if the 60s poll interval feels too slow
- Configurable color themes — add if someone actually wants a different palette
- Log export to file from dashboard — add if operators need to save activity history
