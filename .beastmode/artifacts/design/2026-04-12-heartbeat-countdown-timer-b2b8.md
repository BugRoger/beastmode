---
phase: design
epic-id: bm-b2b8
epic-slug: heartbeat-countdown-timer-b2b8
epic-name: Heartbeat Countdown Timer
---

## Problem Statement

The dashboard's watch loop indicator is a static "watch: running" label. It confirms the loop exists but gives no temporal awareness — users can't tell when the next scan will fire, whether a scan is currently in progress, or how long until the next heartbeat.

## Solution

Replace the static indicator with a live countdown timer that ticks every second, showing seconds remaining until the next scheduled poll. The countdown resets on each scheduled scan completion, shows a "scanning..." state during active scans, and falls back to a stopped-with-interval-hint display when the loop is off.

## User Stories

1. As a dashboard user, I want to see a live countdown to the next heartbeat scan, so that I know when the pipeline will next check for work.
2. As a dashboard user, I want to see a "scanning..." indicator when a scan is actively running, so that I know the system is working and not stalled.
3. As a dashboard user, I want to see the configured interval when the watch loop is stopped (e.g. "stopped (60s)"), so that I know what the heartbeat would be if I started it.

## Implementation Decisions

- The countdown is event-driven: the WatchLoop emits `scan-started` (new event) and `scan-complete` (existing event), and the dashboard resets its countdown on `scan-complete` from scheduled polls only.
- Event-driven rescans (triggered by session completion) do NOT reset the countdown — only the scheduled heartbeat timer resets it. This requires distinguishing poll-triggered from event-triggered scans in the `scan-complete` event payload (e.g. a `trigger: "poll" | "event"` field).
- A new `scan-started` event is added to WatchLoop so the dashboard can accurately show the "scanning..." state instead of inferring it from the countdown hitting zero.
- Display format is bare: `43s`, `12s`, `1s` — no labels, no prefix.
- The dashboard runs an independent 1-second `setInterval` to decrement the displayed value. The event resets the counter; the local timer decrements it.
- Color is static: green (#A9DC76) when running/counting, red (#FF6188) when stopped.
- When stopped, display reads `stopped (Ns)` where N is the configured `cli.interval` value.
- When scanning, display reads `scanning...` in green.
- The countdown replaces the existing "watch: running" / "watch: stopped" text in the ThreePanelLayout header (top-right corner).

## Testing Decisions

- Unit test the countdown decrement logic in isolation (given an initial value, verify it decrements each second and clamps at 0).
- Unit test the scan-complete reset behavior: verify that poll-triggered completions reset the counter and event-triggered completions do not.
- Unit test the display state machine: running → shows countdown, scanning → shows "scanning...", stopped → shows "stopped (Ns)".
- Integration: verify the WatchLoop emits `scan-started` events at the correct point in the tick cycle.

## Out of Scope

- Animated progress bars or visual flourishes beyond the text countdown.
- Color transitions as the countdown approaches zero.
- Countdown for event-driven rescans (only scheduled polls drive the timer).

## Further Notes

The existing 80ms Nyan banner tick and the dashboard's general tick timer are separate from this countdown. The 1-second countdown timer is a new, independent interval scoped to the header component.

## Deferred Ideas

None
