---
phase: release
slug: status-watch
bump: minor
---

# Release: status-watch

**Bump:** minor
**Date:** 2026-03-30

## Highlights

Adds a live-updating terminal dashboard to `beastmode status --watch` that polls manifest state every 2 seconds, highlights changed rows, shows blocked gate details, and displays watch loop status. Also includes a wave of pipeline reliability fixes for GitHub sync, feature isolation, and dispatch races.

## Features

- Live watch mode for `beastmode status` via `--watch` / `-w` flag
- Extract status table rendering into reusable pure function
- Separate render logic from command handler for testability
- 2-second polling loop with full ANSI screen redraw
- Dashboard header with watch loop running indicator (lockfile-based detection)
- Bold/inverse change highlighting for rows that transitioned since last poll
- Clean Ctrl+C / SIGINT exit with interval and terminal state cleanup

## Fixes

- Fix GitHub sync race and implement checkpoint artifact gap
- Fix project board field name (Status not Pipeline)
- Fix YAML parser to strip quotes from string values
- Fix cmux session to watch for feature-specific output
- Fix GitHub sync: reconcile manifest state on watch startup
- Fix post-dispatch feature isolation and add GitHub issue state helpers
- Fix implement fan-out: feature poisoning and duplicate dispatch races
- Fix pipeline: epic-scoped outputs, provenance checks, TS stop hook
- Fix GitHub sync: runtime discovery replaces manual config IDs

## Chores

- Remove features from project board — only epics belong there
- Move GitHub reconcile from startup to per-epic scan tick

## Full Changelog

- `15a22e4` design(status-watch): checkpoint
- `1ece4a0` plan(status-watch): checkpoint
- `c3c380d` plan(status-watch): checkpoint
- `61b8591` implement(render-extract): checkpoint
- `55c8a9a` implement(render-extract): checkpoint
- `3b5b3a9` implement(render-extract): checkpoint
- `d212a85` implement(render-extract): checkpoint
- `71fb7a1` implement(render-refactor): checkpoint
- `250f3c3` implement(render-refactor): checkpoint
- `b047ef8` implement(poll-loop): checkpoint
- `6d30012` implement(dashboard-header): checkpoint
- `04d2e3b` implement(change-highlight): checkpoint
- `7228361` implement(watch-loop): checkpoint
- `6bbf3fc` Fix pipeline: epic-scoped outputs, provenance checks, TS stop hook
- `087a937` Fix implement fan-out: feature poisoning and duplicate dispatch races
- `5852053` Fix post-dispatch feature isolation and add GitHub issue state helpers
- `6fa7e38` Fix GitHub sync: runtime discovery replaces manual config IDs
- `95d0231` Fix GitHub sync: reconcile manifest state on watch startup
- `d58eff5` Move GitHub reconcile from startup to per-epic scan tick
- `2c2a97b` implement(change-highlight): checkpoint
- `ae3aab2` implement(dashboard-header): checkpoint
- `2952df0` Fix cmux session: watch for feature-specific output
- `ce63317` Fix YAML parser: strip quotes from string values
- `82ee757` Fix project board: field name is Status not Pipeline
- `9701389` implement(watch-loop): checkpoint
- `f26885b` Remove features from project board — only epics belong there
- `b02a07d` Fix GitHub sync race and implement checkpoint artifact gap
- `29410da` validate(status-watch): checkpoint
