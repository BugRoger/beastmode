---
phase: plan
epic-id: bm-b2b8
epic-slug: heartbeat-countdown-timer-b2b8
feature-slug: heartbeat-countdown-display
wave: 1
---

# Heartbeat Countdown Display

**Design:** .beastmode/artifacts/design/2026-04-12-heartbeat-countdown-timer-b2b8.md

## User Stories

1. As a dashboard user, I want to see a live countdown to the next heartbeat scan, so that I know when the pipeline will next check for work.
2. As a dashboard user, I want to see a "scanning..." indicator when a scan is actively running, so that I know the system is working and not stalled.
3. As a dashboard user, I want to see the configured interval when the watch loop is stopped (e.g. "stopped (60s)"), so that I know what the heartbeat would be if I started it.

## What to Build

### WatchLoop Event Extensions

Extend the WatchLoop's typed event system with two changes:

1. **New `scan-started` event** — emitted at the beginning of each scan cycle (both scheduled ticks and event-driven rescans). Payload is minimal (empty or with a trigger field). This lets the dashboard transition to "scanning..." state without guessing.

2. **Add `trigger` field to `scan-complete` event** — discriminated union: `"poll"` for scheduled tick completions, `"event"` for session-completion-driven rescans. The dashboard uses this to decide whether to reset the countdown (poll resets, event does not).

Both changes go through the existing `WatchLoopEventMap` type interface and the `emitTyped()` helper. The `WatchLoopLike` interface must be extended to expose the new event in its type signature (it inherits from the event map, so this should be automatic).

### Dashboard Countdown State Machine

Add countdown state management to the dashboard's App component:

**State:** A three-state machine:
- **counting** — active countdown, displays `{N}s` where N decrements each second
- **scanning** — active scan in progress, displays `scanning...`
- **stopped** — watch loop off, displays `stopped ({N}s)` where N is the configured interval

**Transitions:**
- `started` event → enter `counting` state, initialize counter to configured interval
- `scan-started` event → enter `scanning` state, pause countdown
- `scan-complete` event (trigger=poll) → enter `counting` state, reset counter to configured interval
- `scan-complete` event (trigger=event) → no state change, countdown continues
- `stopped` event → enter `stopped` state, clear countdown timer

**Timer:** An independent 1-second `setInterval` that decrements the counter while in `counting` state. Clamps at 0 (does not go negative). Created when entering `counting` state, cleared when leaving it.

**Config plumbing:** The configured interval (from `cli.interval`, default 60) needs to reach the countdown logic. It's already available in the dashboard command where WatchLoop is constructed — pass it through to App or derive it from the `started` event payload (which already includes `intervalSeconds`).

### ThreePanelLayout Display Update

Replace the static `watchRunning` boolean prop and its `"watch: running"` / `"watch: stopped"` text rendering with a new prop that carries the pre-formatted countdown display string. The color logic remains: green when the loop is running (counting or scanning states), red when stopped.

The ThreePanelLayout component becomes simpler — it receives a display string and a color, not a boolean. The state machine in App decides what string to show.

### Test Coverage

Unit tests for:
- **Countdown decrement:** Given an initial value, verify the counter decrements each second and clamps at 0
- **Scan-complete reset:** Verify poll-triggered completions reset the counter; event-triggered do not
- **Display state machine:** Verify correct display strings for each state (counting → `{N}s`, scanning → `scanning...`, stopped → `stopped ({N}s)`)
- **WatchLoop events:** Verify `scan-started` is emitted at the correct point; verify `scan-complete` carries the correct `trigger` value for both poll and event paths

## Integration Test Scenarios

```gherkin
@heartbeat-countdown-timer-b2b8 @dashboard
Feature: Heartbeat countdown display -- live timer replaces static watch indicator

  The dashboard header shows a live countdown to the next scheduled scan,
  a scanning indicator during active scans, and an interval hint when the
  watch loop is stopped. The countdown resets only on poll-triggered scan
  completions -- event-triggered rescans do not affect the timer.

  # --- Happy path: countdown lifecycle ---

  Scenario: Dashboard shows countdown after watch loop starts
    Given the watch loop is running with a configured interval
    When a scheduled scan completes successfully
    Then the dashboard displays a countdown in seconds until the next scan
    And the countdown decrements each second

  Scenario: Countdown resets when a scheduled scan completes
    Given the watch loop is running with a configured interval
    And the countdown has decremented below the full interval
    When a poll-triggered scan completes
    Then the countdown resets to the full configured interval

  # --- Scanning state ---

  Scenario: Dashboard shows scanning indicator when a scan begins
    Given the watch loop is running with a countdown displayed
    When a scan starts
    Then the dashboard displays "scanning..." instead of the countdown

  Scenario: Countdown resumes after scanning completes
    Given the dashboard is displaying "scanning..."
    When the poll-triggered scan completes
    Then the dashboard displays a countdown in seconds until the next scan

  # --- Stopped state ---

  Scenario: Dashboard shows stopped state with interval hint when loop is off
    Given the watch loop is stopped
    And the configured interval is 60 seconds
    Then the dashboard displays "stopped (60s)"

  # --- Event-triggered scan does not reset countdown ---

  Scenario: Event-triggered scan completion does not reset the countdown
    Given the watch loop is running with a countdown displayed
    And the countdown has decremented to a known value
    When an event-triggered scan completes
    Then the countdown continues from its current value without resetting
```

```gherkin
@heartbeat-countdown-timer-b2b8 @watch-loop
Feature: WatchLoop scan-started event -- new event emitted at scan boundary

  The WatchLoop emits a scan-started event at the beginning of each scan
  cycle. The existing scan-complete event gains a trigger field to
  distinguish poll-triggered from event-triggered completions.

  Scenario: WatchLoop emits scan-started before scanning epics
    Given the watch loop is initialized with a configured interval
    When the watch loop performs a scheduled tick
    Then a "scan-started" event is emitted before epics are scanned

  Scenario: Poll-triggered scan-complete carries trigger field
    Given the watch loop is initialized with a configured interval
    When the watch loop performs a scheduled tick
    And the scan completes
    Then the "scan-complete" event includes a trigger value of "poll"

  Scenario: Event-triggered scan-complete carries trigger field
    Given the watch loop is running
    When a session completion triggers an immediate rescan
    And the rescan completes
    Then the "scan-complete" event includes a trigger value of "event"
```

## Acceptance Criteria

- [ ] WatchLoop emits `scan-started` event before each scan cycle begins
- [ ] `scan-complete` event payload includes `trigger: "poll" | "event"` field
- [ ] Dashboard displays live countdown (`{N}s`) that decrements each second after a poll-triggered scan completes
- [ ] Dashboard displays `scanning...` in green when a scan is in progress
- [ ] Dashboard displays `stopped ({N}s)` in red when the watch loop is off, where N is the configured interval
- [ ] Poll-triggered scan completions reset the countdown to the full interval
- [ ] Event-triggered scan completions do NOT reset the countdown
- [ ] Countdown clamps at 0 (does not go negative)
- [ ] Existing "watch: running" / "watch: stopped" static text is fully replaced
- [ ] Unit tests pass for countdown decrement, reset behavior, and display state machine
- [ ] WatchLoop event tests pass for scan-started emission and trigger field values
