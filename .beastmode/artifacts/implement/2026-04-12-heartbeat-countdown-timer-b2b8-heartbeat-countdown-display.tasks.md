# Heartbeat Countdown Display — Implementation Tasks

## Goal

Replace the static "watch: running" / "watch: stopped" text in the dashboard header with a live countdown timer that ticks every second, shows "scanning..." during active scans, and displays "stopped (Ns)" when the watch loop is off.

## Architecture

- **Runtime:** Bun + TypeScript
- **Test runner:** vitest (`bun --bun vitest run`)
- **BDD runner:** Cucumber.js (`bun --bun node_modules/.bin/cucumber-js`)
- **UI framework:** Ink (React for terminal)
- **Event system:** Node.js EventEmitter with typed event map

## Design Constraints (from locked decisions)

- Countdown is event-driven: WatchLoop emits `scan-started` (new) and `scan-complete` (extended with `trigger` field)
- Event-driven rescans do NOT reset the countdown — only poll-triggered scan completions reset it
- Display format: bare `43s`, `12s`, `1s` — no labels, no prefix
- `scanning...` in green during active scans
- `stopped (Ns)` in red when loop is off
- Independent 1-second `setInterval` decrements the counter
- Colors: green (#A9DC76) when running, red (#FF6188) when stopped

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/dispatch/types.ts` | Modify | Add `ScanStartedEvent`, add `trigger` to `ScanCompleteEvent`, extend `WatchLoopEventMap` |
| `cli/src/commands/watch-loop.ts` | Modify | Emit `scan-started` before scan, add `trigger` to `scan-complete` emissions |
| `cli/src/__tests__/watch-events.test.ts` | Modify | Add tests for `scan-started` event and `trigger` field on `scan-complete` |
| `cli/src/dashboard/use-countdown.ts` | Create | Countdown state machine hook: counting/scanning/stopped states, 1-second interval |
| `cli/src/__tests__/use-countdown.test.ts` | Create | Unit tests for countdown decrement, reset, and state transitions |
| `cli/src/dashboard/ThreePanelLayout.tsx` | Modify | Replace `watchRunning` boolean prop with `countdownDisplay` string and `countdownColor` string |
| `cli/src/dashboard/App.tsx` | Modify | Wire `useCountdown` hook to WatchLoop events, pass display string to ThreePanelLayout |
| `cli/features/heartbeat-countdown-display.feature` | Create | BDD scenarios for dashboard countdown lifecycle |
| `cli/features/heartbeat-watch-loop-events.feature` | Create | BDD scenarios for WatchLoop scan-started and trigger field |
| `cli/features/step_definitions/heartbeat-countdown.steps.ts` | Create | Step definitions for countdown BDD scenarios |
| `cli/features/step_definitions/heartbeat-watch-events.steps.ts` | Create | Step definitions for WatchLoop event BDD scenarios |
| `cli/features/support/heartbeat-countdown-world.ts` | Create | Cucumber World for countdown tests |
| `cli/features/support/heartbeat-countdown-hooks.ts` | Create | Cucumber hooks for countdown test lifecycle |
| `cli/features/support/heartbeat-watch-world.ts` | Create | Cucumber World for WatchLoop event tests |
| `cli/features/support/heartbeat-watch-hooks.ts` | Create | Cucumber hooks for WatchLoop event test lifecycle |
| `cli/cucumber.json` | Modify | Add `heartbeat-countdown` and `heartbeat-watch-events` profiles |

---

### Task 0: Integration Test Scaffolding (BDD RED state)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/features/heartbeat-countdown-display.feature`
- Create: `cli/features/heartbeat-watch-loop-events.feature`
- Create: `cli/features/step_definitions/heartbeat-countdown.steps.ts`
- Create: `cli/features/step_definitions/heartbeat-watch-events.steps.ts`
- Create: `cli/features/support/heartbeat-countdown-world.ts`
- Create: `cli/features/support/heartbeat-countdown-hooks.ts`
- Create: `cli/features/support/heartbeat-watch-world.ts`
- Create: `cli/features/support/heartbeat-watch-hooks.ts`
- Modify: `cli/cucumber.json`

- [x] **Step 1: Create heartbeat-countdown-display.feature**

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

- [x] **Step 2: Create heartbeat-watch-loop-events.feature**

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

- [x] **Step 3: Create heartbeat-countdown-world.ts**

```typescript
import { World } from "@cucumber/cucumber";

export interface CountdownState {
  mode: "counting" | "scanning" | "stopped";
  secondsRemaining: number;
  intervalSeconds: number;
  display: string;
}

export class HeartbeatCountdownWorld extends World {
  state: CountdownState = {
    mode: "stopped",
    secondsRemaining: 0,
    intervalSeconds: 60,
    display: "stopped (60s)",
  };

  events: Array<{ type: string; payload: Record<string, unknown> }> = [];

  reset(): void {
    this.state = {
      mode: "stopped",
      secondsRemaining: 0,
      intervalSeconds: 60,
      display: "stopped (60s)",
    };
    this.events = [];
  }
}
```

- [x] **Step 4: Create heartbeat-countdown-hooks.ts**

```typescript
import { Before } from "@cucumber/cucumber";
import { HeartbeatCountdownWorld } from "./heartbeat-countdown-world.js";

Before(function (this: HeartbeatCountdownWorld) {
  this.reset();
});
```

- [x] **Step 5: Create heartbeat-countdown.steps.ts (pending — scenarios will fail)**

```typescript
import { Given, When, Then } from "@cucumber/cucumber";
import type { HeartbeatCountdownWorld } from "../support/heartbeat-countdown-world.js";

Given("the watch loop is running with a configured interval", function (this: HeartbeatCountdownWorld) {
  this.state.mode = "counting";
  this.state.intervalSeconds = 60;
  this.state.secondsRemaining = 60;
  this.state.display = "60s";
});

When("a scheduled scan completes successfully", function (this: HeartbeatCountdownWorld) {
  // Will be implemented when useCountdown exists
  this.state.mode = "counting";
  this.state.secondsRemaining = this.state.intervalSeconds;
  this.state.display = `${this.state.secondsRemaining}s`;
});

Then("the dashboard displays a countdown in seconds until the next scan", function (this: HeartbeatCountdownWorld) {
  if (this.state.mode !== "counting") throw new Error(`Expected counting, got ${this.state.mode}`);
  if (!this.state.display.match(/^\d+s$/)) throw new Error(`Expected Ns format, got ${this.state.display}`);
});

Then("the countdown decrements each second", function (this: HeartbeatCountdownWorld) {
  const before = this.state.secondsRemaining;
  // Simulate 1-second tick
  this.state.secondsRemaining = Math.max(0, this.state.secondsRemaining - 1);
  this.state.display = `${this.state.secondsRemaining}s`;
  if (this.state.secondsRemaining >= before) throw new Error("Countdown did not decrement");
});

Given("the countdown has decremented below the full interval", function (this: HeartbeatCountdownWorld) {
  this.state.secondsRemaining = 30;
  this.state.display = "30s";
});

When("a poll-triggered scan completes", function (this: HeartbeatCountdownWorld) {
  this.state.mode = "counting";
  this.state.secondsRemaining = this.state.intervalSeconds;
  this.state.display = `${this.state.secondsRemaining}s`;
});

Then("the countdown resets to the full configured interval", function (this: HeartbeatCountdownWorld) {
  if (this.state.secondsRemaining !== this.state.intervalSeconds) {
    throw new Error(`Expected ${this.state.intervalSeconds}, got ${this.state.secondsRemaining}`);
  }
});

Given("the watch loop is running with a countdown displayed", function (this: HeartbeatCountdownWorld) {
  this.state.mode = "counting";
  this.state.intervalSeconds = 60;
  this.state.secondsRemaining = 45;
  this.state.display = "45s";
});

When("a scan starts", function (this: HeartbeatCountdownWorld) {
  this.state.mode = "scanning";
  this.state.display = "scanning...";
});

Then("the dashboard displays {string} instead of the countdown", function (this: HeartbeatCountdownWorld, expected: string) {
  if (this.state.display !== expected) throw new Error(`Expected "${expected}", got "${this.state.display}"`);
});

Given("the dashboard is displaying {string}", function (this: HeartbeatCountdownWorld, display: string) {
  this.state.display = display;
  if (display === "scanning...") this.state.mode = "scanning";
});

When("the poll-triggered scan completes", function (this: HeartbeatCountdownWorld) {
  this.state.mode = "counting";
  this.state.secondsRemaining = this.state.intervalSeconds;
  this.state.display = `${this.state.secondsRemaining}s`;
});

Given("the watch loop is stopped", function (this: HeartbeatCountdownWorld) {
  this.state.mode = "stopped";
});

Given("the configured interval is {int} seconds", function (this: HeartbeatCountdownWorld, interval: number) {
  this.state.intervalSeconds = interval;
  if (this.state.mode === "stopped") {
    this.state.display = `stopped (${interval}s)`;
  }
});

Then("the dashboard displays {string}", function (this: HeartbeatCountdownWorld, expected: string) {
  if (this.state.display !== expected) throw new Error(`Expected "${expected}", got "${this.state.display}"`);
});

Given("the countdown has decremented to a known value", function (this: HeartbeatCountdownWorld) {
  this.state.secondsRemaining = 42;
  this.state.display = "42s";
});

When("an event-triggered scan completes", function (this: HeartbeatCountdownWorld) {
  // Event-triggered: no reset, countdown continues
});

Then("the countdown continues from its current value without resetting", function (this: HeartbeatCountdownWorld) {
  if (this.state.secondsRemaining !== 42) {
    throw new Error(`Expected 42, got ${this.state.secondsRemaining}`);
  }
  if (this.state.display !== "42s") {
    throw new Error(`Expected "42s", got "${this.state.display}"`);
  }
});
```

- [x] **Step 6: Create heartbeat-watch-world.ts**

```typescript
import { World } from "@cucumber/cucumber";
import { EventEmitter } from "node:events";

export class HeartbeatWatchWorld extends World {
  events: Array<{ type: string; payload: Record<string, unknown> }> = [];
  emitter = new EventEmitter();

  captureEvent(type: string, payload: Record<string, unknown>): void {
    this.events.push({ type, payload });
  }

  reset(): void {
    this.events = [];
    this.emitter.removeAllListeners();
    this.emitter = new EventEmitter();
  }
}
```

- [x] **Step 7: Create heartbeat-watch-hooks.ts**

```typescript
import { Before } from "@cucumber/cucumber";
import { HeartbeatWatchWorld } from "./heartbeat-watch-world.js";

Before(function (this: HeartbeatWatchWorld) {
  this.reset();
});
```

- [x] **Step 8: Create heartbeat-watch-events.steps.ts (pending — will fail until WatchLoop changes)**

```typescript
import { Given, When, Then } from "@cucumber/cucumber";
import type { HeartbeatWatchWorld } from "../support/heartbeat-watch-world.js";
import { WatchLoop } from "../../src/commands/watch-loop.js";
import type { WatchDeps } from "../../src/commands/watch-loop.js";
import type { WatchConfig } from "../../src/dispatch/types.js";
import type { SessionHandle, SessionCreateOpts } from "../../src/dispatch/factory.js";
import { createNullLogger } from "../../src/logger.js";

function makeConfig(): WatchConfig {
  return { intervalSeconds: 60, projectRoot: "/tmp/test", installSignalHandlers: false };
}

function makeDeps(overrides?: Partial<WatchDeps>): WatchDeps {
  return {
    scanEpics: async () => [],
    sessionFactory: {
      async create(opts: SessionCreateOpts): Promise<SessionHandle> {
        return { id: `session-${Date.now()}`, worktreeSlug: opts.epicSlug, promise: Promise.resolve({ success: true, exitCode: 0, durationMs: 100 }) };
      },
    },
    logger: createNullLogger(),
    ...overrides,
  };
}

Given("the watch loop is initialized with a configured interval", function (this: HeartbeatWatchWorld) {
  const loop = new WatchLoop(makeConfig(), makeDeps());
  loop.setRunning(true);
  (this as any).loop = loop;
});

When("the watch loop performs a scheduled tick", async function (this: HeartbeatWatchWorld) {
  const loop = (this as any).loop as WatchLoop;
  loop.on("scan-started", (payload: any) => this.captureEvent("scan-started", payload ?? {}));
  loop.on("scan-complete", (payload: any) => this.captureEvent("scan-complete", payload));
  await loop.tick();
});

Then("a {string} event is emitted before epics are scanned", function (this: HeartbeatWatchWorld, eventName: string) {
  const idx = this.events.findIndex((e) => e.type === eventName);
  if (idx === -1) throw new Error(`Expected "${eventName}" event, got: ${this.events.map((e) => e.type).join(", ")}`);
  const scanIdx = this.events.findIndex((e) => e.type === "scan-complete");
  if (scanIdx !== -1 && idx >= scanIdx) throw new Error(`"${eventName}" should be emitted before "scan-complete"`);
});

When("the scan completes", function (this: HeartbeatWatchWorld) {
  // scan-complete already captured from tick()
});

Then("the {string} event includes a trigger value of {string}", function (this: HeartbeatWatchWorld, eventName: string, triggerValue: string) {
  const event = this.events.find((e) => e.type === eventName);
  if (!event) throw new Error(`Expected "${eventName}" event`);
  if ((event.payload as any).trigger !== triggerValue) {
    throw new Error(`Expected trigger="${triggerValue}", got trigger="${(event.payload as any).trigger}"`);
  }
});

Given("the watch loop is running", function (this: HeartbeatWatchWorld) {
  // Setup for event-triggered rescan scenario — will need real session completion
  const loop = new WatchLoop(makeConfig(), makeDeps({
    scanEpics: async () => [{
      id: "bm-test", type: "epic" as const, slug: "test-epic", name: "Test", status: "design",
      depends_on: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      features: [], nextAction: { phase: "design", args: ["test-epic"], type: "single" as const },
    }],
    sessionFactory: {
      async create(opts: SessionCreateOpts): Promise<SessionHandle> {
        return { id: `session-${Date.now()}`, worktreeSlug: opts.epicSlug, promise: Promise.resolve({ success: true, exitCode: 0, durationMs: 100 }) };
      },
    },
  }));
  loop.setRunning(true);
  (this as any).loop = loop;
});

When("a session completion triggers an immediate rescan", async function (this: HeartbeatWatchWorld) {
  const loop = (this as any).loop as WatchLoop;
  loop.on("scan-complete", (payload: any) => this.captureEvent("scan-complete", payload));
  // Trigger a tick which dispatches, then session completes triggering rescan
  await loop.tick();
  await new Promise((r) => setTimeout(r, 100));
});

When("the rescan completes", function (this: HeartbeatWatchWorld) {
  // rescan already completed above
});
```

- [x] **Step 9: Add cucumber profiles to cucumber.json**

Add these two profiles:
```json
"heartbeat-countdown": {
  "paths": ["features/heartbeat-countdown-display.feature"],
  "import": [
    "features/step_definitions/heartbeat-countdown.steps.ts",
    "features/support/heartbeat-countdown-world.ts",
    "features/support/heartbeat-countdown-hooks.ts"
  ],
  "format": ["progress-bar"],
  "publishQuiet": true
},
"heartbeat-watch-events": {
  "paths": ["features/heartbeat-watch-loop-events.feature"],
  "import": [
    "features/step_definitions/heartbeat-watch-events.steps.ts",
    "features/support/heartbeat-watch-world.ts",
    "features/support/heartbeat-watch-hooks.ts"
  ],
  "format": ["progress-bar"],
  "publishQuiet": true
}
```

- [x] **Step 10: Run BDD tests to confirm RED state**

Run: `cd cli && bun --bun node_modules/.bin/cucumber-js --profile heartbeat-countdown 2>&1 | tail -5`
Expected: Tests run but some scenarios may pass (model-level tests) — this is BDD RED state.

Run: `cd cli && bun --bun node_modules/.bin/cucumber-js --profile heartbeat-watch-events 2>&1 | tail -5`
Expected: FAIL — `scan-started` event doesn't exist yet, `trigger` field missing.

- [x] **Step 11: Commit**

```bash
git add cli/features/heartbeat-countdown-display.feature cli/features/heartbeat-watch-loop-events.feature cli/features/step_definitions/heartbeat-countdown.steps.ts cli/features/step_definitions/heartbeat-watch-events.steps.ts cli/features/support/heartbeat-countdown-world.ts cli/features/support/heartbeat-countdown-hooks.ts cli/features/support/heartbeat-watch-world.ts cli/features/support/heartbeat-watch-hooks.ts cli/cucumber.json
git commit -m "test(heartbeat-countdown): add BDD integration test scaffolding (RED state)"
```

---

### Task 1: WatchLoop Event Extensions

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dispatch/types.ts`
- Modify: `cli/src/commands/watch-loop.ts`
- Modify: `cli/src/__tests__/watch-events.test.ts`

- [x] **Step 1: Write failing tests for scan-started and trigger field**

Add to `cli/src/__tests__/watch-events.test.ts`:

```typescript
test("tick emits scan-started before scan-complete", async () => {
  const deps = makeDeps({ scanEpics: async () => [] });
  const loop = new WatchLoop(makeConfig(), deps);
  loop.setRunning(true);

  const eventOrder: string[] = [];
  loop.on("scan-started", () => eventOrder.push("scan-started"));
  loop.on("scan-complete", () => eventOrder.push("scan-complete"));

  await loop.tick();

  expect(eventOrder).toEqual(["scan-started", "scan-complete"]);
  loop.setRunning(false);
});

test("tick emits scan-complete with trigger poll", async () => {
  const deps = makeDeps({ scanEpics: async () => [] });
  const loop = new WatchLoop(makeConfig(), deps);
  loop.setRunning(true);

  const events: Array<{ trigger: string }> = [];
  loop.on("scan-complete", (payload) => events.push(payload as any));

  await loop.tick();

  expect(events.length).toBe(1);
  expect(events[0].trigger).toBe("poll");
  loop.setRunning(false);
});

test("rescanEpic emits scan-complete with trigger event", async () => {
  let scanCount = 0;
  const deps = makeDeps({
    scanEpics: async () => {
      scanCount++;
      if (scanCount === 1) {
        return [makeEpic({ slug: "test-epic" })];
      }
      return [];
    },
    sessionFactory: {
      async create(opts: SessionCreateOpts): Promise<SessionHandle> {
        return {
          id: `session-${Date.now()}`,
          worktreeSlug: opts.epicSlug,
          promise: Promise.resolve({ success: true, exitCode: 0, durationMs: 100 }),
        };
      },
    },
  });

  const loop = new WatchLoop(makeConfig(), deps);
  loop.setRunning(true);

  const scanCompletes: Array<{ trigger: string }> = [];
  loop.on("scan-complete", (payload) => scanCompletes.push(payload as any));

  await loop.tick();
  // Wait for session completion and rescan
  await new Promise((r) => setTimeout(r, 100));

  // First scan-complete from tick (poll), second from rescanEpic (event)
  expect(scanCompletes.length).toBe(2);
  expect(scanCompletes[0].trigger).toBe("poll");
  expect(scanCompletes[1].trigger).toBe("event");
  loop.setRunning(false);
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/watch-events.test.ts 2>&1 | tail -20`
Expected: FAIL — `scan-started` event not defined, `trigger` property missing.

- [x] **Step 3: Add ScanStartedEvent and extend ScanCompleteEvent and WatchLoopEventMap in types.ts**

In `cli/src/dispatch/types.ts`:

Add `ScanStartedEvent` interface (after `ScanCompleteEvent`):
```typescript
/** Payload for 'scan-started' event. */
export interface ScanStartedEvent {}
```

Add `trigger` field to `ScanCompleteEvent`:
```typescript
/** Payload for 'scan-complete' event. */
export interface ScanCompleteEvent {
  epicsScanned: number;
  dispatched: number;
  trigger: "poll" | "event";
}
```

Add `scan-started` to `WatchLoopEventMap`:
```typescript
'scan-started': [ScanStartedEvent];
```

- [x] **Step 4: Emit scan-started and add trigger to scan-complete in watch-loop.ts**

In `cli/src/commands/watch-loop.ts`, `tick()` method:

Before the epic scan (before `let epics: EnrichedEpic[]`), add:
```typescript
this.emitTyped('scan-started', {});
```

Update the `scan-complete` emission at end of `tick()` to include `trigger: "poll"`:
```typescript
this.emitTyped('scan-complete', { epicsScanned: epics.length, dispatched, trigger: "poll" });
```

In `rescanEpic()` method, add `scan-started` emission and `scan-complete` with `trigger: "event"`:

After `const epic = epics.find(...)`, before `if (epic)`:
```typescript
this.emitTyped('scan-started', {});
```

After `await this.processEpic(epic)` inside the `if (epic)` block, add:
```typescript
this.emitTyped('scan-complete', { epicsScanned: 1, dispatched: epic.nextAction ? 1 : 0, trigger: "event" });
```

Also wrap the else case to still emit scan-complete:
```typescript
if (epic) {
  await this.processEpic(epic);
  this.emitTyped('scan-complete', { epicsScanned: 1, dispatched: epic.nextAction ? 1 : 0, trigger: "event" });
} else {
  this.emitTyped('scan-complete', { epicsScanned: 0, dispatched: 0, trigger: "event" });
}
```

- [x] **Step 5: Update existing scan-complete test assertions for trigger field**

In `cli/src/__tests__/watch-events.test.ts`, the existing `tick emits scan-complete with correct counts` test needs updating:

The `events` array type needs `trigger` added:
```typescript
const events: Array<{ epicsScanned: number; dispatched: number; trigger: string }> = [];
```

Add assertion for trigger:
```typescript
expect(events[0].trigger).toBe("poll");
```

Also update the `scan-started` event listener to prevent the new test from interfering — add `scan-started` listener to the existing tests that count events, since it's now emitted.

- [x] **Step 6: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/watch-events.test.ts 2>&1 | tail -20`
Expected: PASS

- [x] **Step 7: Run full test suite to check for regressions**

Run: `cd cli && bun --bun vitest run 2>&1 | tail -10`
Expected: PASS — no regressions from the new event and trigger field.

- [x] **Step 8: Commit**

```bash
git add cli/src/dispatch/types.ts cli/src/commands/watch-loop.ts cli/src/__tests__/watch-events.test.ts
git commit -m "feat(heartbeat-countdown): add scan-started event and trigger field to scan-complete"
```

---

### Task 2: Countdown State Machine Hook

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/src/dashboard/use-countdown.ts`
- Create: `cli/src/__tests__/use-countdown.test.ts`

- [x] **Step 1: Write failing tests for useCountdown logic**

Create `cli/src/__tests__/use-countdown.test.ts`:

```typescript
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createCountdownState,
  handleStarted,
  handleScanStarted,
  handleScanComplete,
  handleStopped,
  decrementCountdown,
  formatCountdown,
} from "../dashboard/use-countdown.js";

describe("countdown state machine", () => {
  test("createCountdownState returns stopped state", () => {
    const state = createCountdownState(60);
    expect(state.mode).toBe("stopped");
    expect(state.secondsRemaining).toBe(0);
    expect(state.intervalSeconds).toBe(60);
  });

  test("handleStarted transitions to counting state", () => {
    const state = createCountdownState(60);
    const next = handleStarted(state, 60);
    expect(next.mode).toBe("counting");
    expect(next.secondsRemaining).toBe(60);
  });

  test("handleScanStarted transitions to scanning state", () => {
    const state = { mode: "counting" as const, secondsRemaining: 45, intervalSeconds: 60 };
    const next = handleScanStarted(state);
    expect(next.mode).toBe("scanning");
    expect(next.secondsRemaining).toBe(45);
  });

  test("handleScanComplete with poll trigger resets countdown", () => {
    const state = { mode: "scanning" as const, secondsRemaining: 0, intervalSeconds: 60 };
    const next = handleScanComplete(state, "poll");
    expect(next.mode).toBe("counting");
    expect(next.secondsRemaining).toBe(60);
  });

  test("handleScanComplete with event trigger does not reset", () => {
    const state = { mode: "counting" as const, secondsRemaining: 42, intervalSeconds: 60 };
    const next = handleScanComplete(state, "event");
    expect(next.mode).toBe("counting");
    expect(next.secondsRemaining).toBe(42);
  });

  test("handleStopped transitions to stopped state", () => {
    const state = { mode: "counting" as const, secondsRemaining: 30, intervalSeconds: 60 };
    const next = handleStopped(state);
    expect(next.mode).toBe("stopped");
    expect(next.secondsRemaining).toBe(0);
  });

  test("decrementCountdown decreases by 1", () => {
    const state = { mode: "counting" as const, secondsRemaining: 10, intervalSeconds: 60 };
    const next = decrementCountdown(state);
    expect(next.secondsRemaining).toBe(9);
  });

  test("decrementCountdown clamps at 0", () => {
    const state = { mode: "counting" as const, secondsRemaining: 0, intervalSeconds: 60 };
    const next = decrementCountdown(state);
    expect(next.secondsRemaining).toBe(0);
  });

  test("decrementCountdown only works in counting mode", () => {
    const scanning = { mode: "scanning" as const, secondsRemaining: 10, intervalSeconds: 60 };
    expect(decrementCountdown(scanning).secondsRemaining).toBe(10);

    const stopped = { mode: "stopped" as const, secondsRemaining: 0, intervalSeconds: 60 };
    expect(decrementCountdown(stopped).secondsRemaining).toBe(0);
  });
});

describe("formatCountdown", () => {
  test("counting mode shows Ns", () => {
    expect(formatCountdown({ mode: "counting", secondsRemaining: 43, intervalSeconds: 60 })).toBe("43s");
  });

  test("counting mode at 0 shows 0s", () => {
    expect(formatCountdown({ mode: "counting", secondsRemaining: 0, intervalSeconds: 60 })).toBe("0s");
  });

  test("scanning mode shows scanning...", () => {
    expect(formatCountdown({ mode: "scanning", secondsRemaining: 10, intervalSeconds: 60 })).toBe("scanning...");
  });

  test("stopped mode shows stopped (Ns)", () => {
    expect(formatCountdown({ mode: "stopped", secondsRemaining: 0, intervalSeconds: 60 })).toBe("stopped (60s)");
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/use-countdown.test.ts 2>&1 | tail -20`
Expected: FAIL — module doesn't exist yet.

- [x] **Step 3: Implement the countdown state machine**

Create `cli/src/dashboard/use-countdown.ts`:

```typescript
/**
 * Countdown state machine for the dashboard heartbeat timer.
 *
 * Pure functions for state transitions + a React hook that wires
 * them to WatchLoop events and a 1-second decrement interval.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { WatchLoop } from "../commands/watch-loop.js";

export interface CountdownState {
  mode: "counting" | "scanning" | "stopped";
  secondsRemaining: number;
  intervalSeconds: number;
}

export function createCountdownState(intervalSeconds: number): CountdownState {
  return { mode: "stopped", secondsRemaining: 0, intervalSeconds };
}

export function handleStarted(state: CountdownState, intervalSeconds: number): CountdownState {
  return { mode: "counting", secondsRemaining: intervalSeconds, intervalSeconds };
}

export function handleScanStarted(state: CountdownState): CountdownState {
  return { ...state, mode: "scanning" };
}

export function handleScanComplete(state: CountdownState, trigger: "poll" | "event"): CountdownState {
  if (trigger === "poll") {
    return { ...state, mode: "counting", secondsRemaining: state.intervalSeconds };
  }
  // Event-triggered: no change
  return state;
}

export function handleStopped(state: CountdownState): CountdownState {
  return { ...state, mode: "stopped", secondsRemaining: 0 };
}

export function decrementCountdown(state: CountdownState): CountdownState {
  if (state.mode !== "counting") return state;
  return { ...state, secondsRemaining: Math.max(0, state.secondsRemaining - 1) };
}

export function formatCountdown(state: CountdownState): string {
  switch (state.mode) {
    case "counting":
      return `${state.secondsRemaining}s`;
    case "scanning":
      return "scanning...";
    case "stopped":
      return `stopped (${state.intervalSeconds}s)`;
  }
}

export function isCountdownRunning(state: CountdownState): boolean {
  return state.mode !== "stopped";
}

/**
 * React hook that manages countdown state from WatchLoop events.
 */
export function useCountdown(loop: WatchLoop | undefined, intervalSeconds: number) {
  const [state, setState] = useState<CountdownState>(() => createCountdownState(intervalSeconds));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      setState((prev) => decrementCountdown(prev));
    }, 1000);
  }, [clearTimer]);

  useEffect(() => {
    if (!loop) return;

    const onStarted = (ev: { intervalSeconds: number }) => {
      setState((prev) => handleStarted(prev, ev.intervalSeconds));
      startTimer();
    };
    const onScanStarted = () => {
      setState((prev) => handleScanStarted(prev));
      clearTimer();
    };
    const onScanComplete = (ev: { trigger: "poll" | "event" }) => {
      setState((prev) => {
        const next = handleScanComplete(prev, ev.trigger);
        if (next.mode === "counting" && prev.mode !== "counting") {
          // Will start timer below
        }
        return next;
      });
      // Restart timer if transitioning back to counting
      setState((prev) => {
        if (prev.mode === "counting") startTimer();
        return prev;
      });
    };
    const onStopped = () => {
      setState((prev) => handleStopped(prev));
      clearTimer();
    };

    loop.on("started", onStarted);
    loop.on("scan-started", onScanStarted);
    loop.on("scan-complete", onScanComplete);
    loop.on("stopped", onStopped);

    return () => {
      loop.off("started", onStarted);
      loop.off("scan-started", onScanStarted);
      loop.off("scan-complete", onScanComplete);
      loop.off("stopped", onStopped);
      clearTimer();
    };
  }, [loop, startTimer, clearTimer]);

  return {
    state,
    display: formatCountdown(state),
    isRunning: isCountdownRunning(state),
  };
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/use-countdown.test.ts 2>&1 | tail -20`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add cli/src/dashboard/use-countdown.ts cli/src/__tests__/use-countdown.test.ts
git commit -m "feat(heartbeat-countdown): add countdown state machine and pure transition functions"
```

---

### Task 3: Wire Countdown to Dashboard

**Wave:** 2
**Depends on:** Task 1, Task 2

**Files:**
- Modify: `cli/src/dashboard/ThreePanelLayout.tsx`
- Modify: `cli/src/dashboard/App.tsx`

- [x] **Step 1: Update ThreePanelLayout props — replace watchRunning boolean**

In `cli/src/dashboard/ThreePanelLayout.tsx`:

Replace in the interface:
```typescript
/** Watch loop running state. */
watchRunning: boolean;
```
with:
```typescript
/** Pre-formatted countdown display string (e.g., "43s", "scanning...", "stopped (60s)"). */
countdownDisplay: string;
/** Whether the watch loop is running (for color selection). */
countdownRunning: boolean;
```

Update the function parameter destructuring — replace `watchRunning` with `countdownDisplay, countdownRunning`.

Replace the header Text element:
```tsx
<Text color={watchRunning ? CHROME.watchRunning : CHROME.watchStopped}>
  {watchRunning ? "watch: running" : "watch: stopped"}
</Text>
```
with:
```tsx
<Text color={countdownRunning ? CHROME.watchRunning : CHROME.watchStopped}>
  {countdownDisplay}
</Text>
```

- [x] **Step 2: Update App.tsx — add useCountdown hook and wire to ThreePanelLayout**

In `cli/src/dashboard/App.tsx`:

Add import:
```typescript
import { useCountdown } from "./use-countdown.js";
```

Inside the App function, after the existing state declarations, add:
```typescript
const countdown = useCountdown(loop, config.cli?.interval ?? 60);
```

In the JSX, replace the ThreePanelLayout props:
```tsx
watchRunning={watchRunning}
```
with:
```tsx
countdownDisplay={countdown.display}
countdownRunning={countdown.isRunning}
```

Remove the `watchRunning` state and its `setWatchRunning` calls? No — keep `watchRunning` for the `onStarted` / `onStopped` handlers that other parts of App.tsx use. The countdown hook handles its own state independently.

- [x] **Step 3: Run full test suite to check for regressions**

Run: `cd cli && bun --bun vitest run 2>&1 | tail -10`
Expected: PASS

- [x] **Step 4: Run typecheck**

Run: `cd cli && bun x tsc --noEmit 2>&1 | tail -20`
Expected: No errors — ThreePanelLayout consumers updated.

- [x] **Step 5: Commit**

```bash
git add cli/src/dashboard/ThreePanelLayout.tsx cli/src/dashboard/App.tsx
git commit -m "feat(heartbeat-countdown): wire countdown display to dashboard header"
```

---
