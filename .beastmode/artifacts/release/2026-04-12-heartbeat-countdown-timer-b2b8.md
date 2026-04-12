---
phase: release
epic-id: bm-b2b8
epic-slug: heartbeat-countdown-timer-b2b8
bump: minor
---

# Release: heartbeat-countdown-timer-b2b8

**Bump:** minor
**Date:** 2026-04-12

## Highlights

Replaces the static "watch: running/stopped" label with a live countdown timer that ticks every second, shows "scanning..." during active scans, and displays the configured interval when the watch loop is stopped. Adds `scan-started` event and `trigger` field to `scan-complete` for event-driven countdown state management.

## Features

- Add countdown state machine with pure transition functions for counting/scanning/stopped states
- Add `scan-started` event to WatchLoop and `trigger: "poll" | "event"` field to `scan-complete` event
- Wire countdown display into dashboard header, replacing static watch status indicator

## Chores

- Remove dead `watchRunning` state and fix unused param in ThreePanelLayout
- Add BDD integration test scaffolding for heartbeat countdown scenarios

## Full Changelog

- `69d8644f` feat(heartbeat-countdown): add countdown state machine and pure transition functions
- `464af5ef` feat(heartbeat-countdown): add scan-started event and trigger field to scan-complete
- `3bc9ffcf` feat(heartbeat-countdown): wire countdown display to dashboard header
- `1fb49c02` refactor(heartbeat-countdown): remove dead watchRunning state, fix unused param
- `5a1a2e75` test(heartbeat-countdown): add BDD integration test scaffolding (RED state)
- `4d589f81` implement(heartbeat-countdown-timer-b2b8-heartbeat-countdown-display): checkpoint
