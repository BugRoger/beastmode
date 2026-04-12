---
phase: design
epic-id: bm-a5e6
epic-slug: dashboard-heartbeat-countdown
---

## Problem Statement

The dashboard header shows static "watch: running" or "watch: stopped" text, giving no visibility into when the next scan will fire. Operators watching the dashboard have no sense of timing — they can't tell if a scan just happened or is about to happen.

## Solution

Replace the static watch status text in the header bar with a live heartbeat countdown that refreshes every second, showing seconds remaining until the next watch loop tick. The WatchLoop emits timing metadata via events; a React interval computes and displays the remaining seconds.

## User Stories

1. As a dashboard operator, I want to see a live countdown (e.g. "Heartbeat: 47s") in the header bar, so that I know when the next scan will fire without guessing.
2. As a dashboard operator, I want the heartbeat to show descriptive edge states ("Heartbeat: --" before first scan, "Heartbeat: [stopped]" when the loop is stopped), so that I understand what the watch loop is doing at a glance.
3. As a dashboard operator, I want the heartbeat text to change color based on state (green when counting down, yellow when frozen at 0s, red when stopped), so that I get immediate visual feedback on watch loop health.

## Implementation Decisions

- **Placement**: Replace the existing "watch: running/stopped" text in the ThreePanelLayout header bar. Same location, richer content.
- **Timer architecture**: WatchLoop already emits `scan-complete` events and carries `intervalSeconds` in the `started` event. The dashboard stores `intervalSeconds` and the timestamp of the last `scan-complete`. A React `useEffect` with a 1s `setInterval` computes `remainingSeconds = intervalSeconds - elapsed` and re-renders.
- **Mid-scan behavior**: When the countdown reaches 0s and a tick is executing, freeze display at `0s` (no special "scanning" indicator). Countdown resumes after the next `scan-complete`.
- **Early rescan handling**: Any `scan-complete` event resets the countdown to full interval, regardless of whether it was a scheduled tick or an event-triggered rescan. No distinction between scan sources.
- **Edge state display**: `Heartbeat: --` before the first scan completes, `Heartbeat: [stopped]` when the loop is stopped, `Heartbeat: [paused]` when paused/idle.
- **Color scheme**: Green (#A9DC76) for active countdown, yellow (#FFD866) for frozen at 0s / paused, red (#FF6188) for stopped. All colors from the existing monokai-palette.
- **No new WatchLoop events needed**: Existing `started` (with `intervalSeconds`), `scan-complete`, and `stopped` events provide all necessary timing data.
- **ThreePanelLayout prop change**: Replace `watchRunning: boolean` with a heartbeat state object or individual props for countdown seconds and loop status.

## Testing Decisions

- Unit test the countdown computation logic (remaining seconds calculation, edge state transitions, reset on scan-complete)
- Existing dashboard rendering patterns in the codebase can serve as prior art for component tests
- Key test cases: countdown from interval to 0, freeze at 0, reset on early rescan, edge state transitions (stopped -> started -> counting -> stopped)

## Out of Scope

- Stale data warning (e.g. "last scan was 5 minutes ago")
- Configurable refresh rate (hardcoded 1s)
- Heartbeat in locations other than the header bar
- Per-scan duration tracking or display
- Changes to the WatchLoop polling mechanism itself

## Further Notes

None

## Deferred Ideas

None
