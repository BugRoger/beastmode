---
phase: release
slug: fullscreen-dashboard
bump: minor
---

# Release: fullscreen-dashboard

**Bump:** minor
**Date:** 2026-03-31

## Highlights

Adds `beastmode dashboard` — a fullscreen terminal UI for monitoring and controlling the pipeline. Built with Ink v6.8.0 + React, it provides a three-zone layout (header, epic table, activity log) with keyboard navigation and inline epic cancellation.

## Features

- `beastmode dashboard` CLI subcommand with alternate screen buffer mode
- Three-zone fullscreen layout: header bar, scrollable epic table, activity log
- WatchLoop EventEmitter refactor with typed events (epic:start, epic:complete, epic:error, phase:start, phase:complete, scan)
- Keyboard navigation: q (quit), up/down arrows (row selection), x (cancel epic), a (toggle auto-scroll)
- Cancel epic action via state machine transition + session abort
- Shared `status-data.ts` module extracted from status command for cross-command reuse
- Externalized signal handling (SIGINT/SIGTERM) with graceful cleanup

## Chores

- New test suites: keyboard-nav (31 tests), watch-events, watch-dispatch-race

## Full Changelog

- `4b1171c` design(fullscreen-dashboard): checkpoint
- `7696cad` plan(fullscreen-dashboard): checkpoint
- `1eff7fc` implement(shared-data-extract): checkpoint
- `510bc1b` implement(keyboard-nav): checkpoint
- `35c81ca` implement(watchloop-events): checkpoint
- `f40f3e5` implement(dashboard-ui): checkpoint
- `356c067` validate(fullscreen-dashboard): checkpoint
