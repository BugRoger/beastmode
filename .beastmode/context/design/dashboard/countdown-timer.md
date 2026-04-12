# Heartbeat Countdown Timer

**Context:** heartbeat-countdown-timer (2026-04-12). The dashboard needed a visual indicator showing time until the next scheduled scan, with clear state transitions during active scans and when the watch loop is stopped.

## State Machine

Three modes as a discriminated union via `CountdownState.mode`:

| Mode | Meaning | Display |
|------|---------|---------|
| `counting` | Watch loop running, interval ticking down | `{N}s` |
| `scanning` | Scan in progress | `scanning...` |
| `stopped` | Watch loop not running | `stopped ({N}s)` |

`CountdownState` fields: `mode`, `secondsRemaining`, `intervalSeconds`.

## Event Wiring

| WatchLoop event | Trigger condition | Transition |
|----------------|-------------------|------------|
| `started` | Loop starts | → `counting`, reset `secondsRemaining` to `intervalSeconds`, start 1s timer |
| `scan-started` | Scan begins | → `scanning`, clear timer |
| `scan-complete` (`trigger: "poll"`) | Scheduled tick fired | → `counting`, reset `secondsRemaining`, restart timer |
| `scan-complete` (`trigger: "event"`) | Session-completion rescan | No state change — countdown continues from current value |
| `stopped` | Loop stops | → `stopped`, `secondsRemaining = 0`, clear timer |

The `trigger` field on `scan-complete` is the discriminator. Poll-triggered scans reset the countdown (they represent a full interval having elapsed). Event-triggered rescans do not reset (they are opportunistic mid-interval rescans).

## Timer Architecture

- Independent `setInterval` at 1000ms drives `decrementCountdown()` state updates
- Timer is stored in a `useRef` to survive re-renders without restarting
- `clearTimer` / `startTimer` callbacks manage the ref — `startTimer` always clears first to prevent double-fire
- Timer is cleared on component unmount via the `useEffect` cleanup return

## Pure Function / Hook Separation

All state logic lives as pure exported functions in `cli/src/dashboard/use-countdown.ts`:
- `createCountdownState(intervalSeconds)` — factory
- `handleStarted(state, intervalSeconds)` — started event
- `handleScanStarted(state)` — scan-started event
- `handleScanComplete(state, trigger)` — scan-complete event with trigger discrimination
- `handleStopped(state)` — stopped event
- `decrementCountdown(state)` — 1s tick (no-op if not in counting mode)
- `formatCountdown(state)` — display string

The `useCountdown(loop, intervalSeconds)` hook wires these to WatchLoop events and the setInterval. This separation enables direct unit/BDD testing of the state machine without React or timers.

## BDD Test Approach

Uses the State-Machine World pattern (see `context/implement/testing/cucumber-state-machine-world.md`):
- `HeartbeatCountdownWorld` holds a `CountdownState`-shaped struct directly
- Step definitions mutate `this.state` inline (no production function calls in steps)
- No timer instantiation in the World — no After hook cleanup needed
- Profile: `heartbeat-countdown` in `cucumber.json`

## Display Integration

Countdown display string rendered in the NyanBanner header row, right-aligned alongside watch status and clock. `formatCountdown(state)` is the sole source of the display string — no inline formatting in the component.

## Source

- `cli/src/dashboard/use-countdown.ts` — pure functions + `useCountdown` hook
- `cli/features/step_definitions/heartbeat-countdown.steps.ts` — BDD scenarios
- `cli/features/support/heartbeat-countdown-world.ts` — HeartbeatCountdownWorld
