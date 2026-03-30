---
phase: design
slug: status-watch
---

## Problem Statement

`beastmode status` is a one-shot snapshot — the user must re-run it manually to see pipeline changes. When the watch loop is driving epics through phases over minutes to hours, there's no persistent view of what's happening. The user is blind between manual invocations.

## Solution

Add a `--watch` / `-w` flag to the existing `beastmode status` command that turns it into a live-updating terminal dashboard. The dashboard polls manifest files every 2 seconds, redraws the full status table via ANSI escape sequences, highlights rows that changed since the last poll, and shows blocked gate details plus whether the watch loop is running.

## User Stories

1. As a pipeline operator, I want to run `beastmode status --watch` so that I can see pipeline state updating in real-time without re-running the command.
2. As a pipeline operator, I want changed rows highlighted for one render cycle so that I notice when an epic transitions phases.
3. As a pipeline operator, I want to see blocked gate details in the live dashboard so that I know which epics need manual intervention and why.
4. As a pipeline operator, I want to see whether `beastmode watch` is currently running so that I know if the pipeline is being actively driven or just sitting idle.
5. As a pipeline operator, I want to exit the dashboard cleanly with Ctrl+C so that I can return to my terminal without residual state.

## Implementation Decisions

- Entry point: `--watch` / `-w` flag on the existing `beastmode status` command, not a new subcommand
- Refresh model: Polling every 2 seconds via setInterval. No filesystem events — polling is sufficient given manifest changes are minutes apart
- Rendering: Full screen redraw using ANSI escape sequences (cursor home `\x1b[H` + clear screen `\x1b[2J`). No new dependencies — extend existing ANSI coloring in status.ts
- Display content: Status table (same format as existing) + blocked gate details per epic + watch loop running indicator (detected via lockfile presence)
- Verbose mode: Watch mode is always compact — no --verbose support in watch mode. Dashboard is a persistent view, not a detailed report
- Change detection: Diff previous poll state against current. Changed rows render with bold/inverse ANSI attribute for one render cycle, then revert to normal on next tick
- Architecture: Extend existing `cli/src/commands/status.ts`. Extract table rendering into a reusable function, add watch loop that calls it on interval
- Terminal overflow: No special handling. Default filtering already hides done/cancelled epics, so active epic count is typically 1-5
- Watch loop indicator: Check for lockfile that `beastmode watch` creates. Display "watch: running" or "watch: stopped" in dashboard header
- Exit: Ctrl+C via SIGINT handler. Clean up interval timer and restore terminal state
- No new dependencies — pure ANSI escape codes over stdout

## Testing Decisions

- Unit test the table rendering function in isolation (already a pure function that takes manifest data and returns formatted strings)
- Unit test change detection logic (diff previous vs current state, identify changed slugs)
- Integration test the poll loop with mock manifest files on disk — write manifests, verify dashboard output includes expected content
- Test lockfile detection for watch loop indicator
- No need to snapshot-test ANSI escape sequences — test the logical content, not the formatting

## Out of Scope

- Verbose mode in watch (explicitly decided: always compact)
- Scrollable/paginated view for large epic counts
- Filesystem event-based refresh (polling is sufficient)
- Race condition handling with concurrent watch loop (read-only access to small JSON files is inherently safe)
- Auto-exit when all epics complete
- Configurable poll interval (hardcoded 2 seconds)

## Further Notes

The existing status command already handles ANSI color coding per phase, filtering done/cancelled epics, and the --all flag. The watch mode layers on top of this: same data, same rendering, just in a loop with screen clearing and change highlighting.

## Deferred Ideas

- Configurable poll interval via `--interval` flag — add if 2 seconds proves wrong for someone
- Event-driven refresh via fs.watch as an optimization — add if polling causes measurable overhead (unlikely)
- Terminal overflow handling with smart truncation — add if someone actually hits this with 10+ active epics
