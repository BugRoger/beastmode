# Stats Accumulator — Implementation Tasks

## Goal

Build a pure logic module (`session-stats.ts`) that subscribes to WatchLoop EventEmitter events and maintains running session metrics. The module is decoupled from React and the dashboard rendering layer.

## Architecture

- **Pattern:** Event-driven accumulator class with typed EventEmitter subscription
- **Dependencies:** `node:events` EventEmitter (via WatchLoop), dispatch types from `../dispatch/types.js`
- **Test framework:** vitest (project standard — `import { describe, test, expect } from "vitest"`)
- **Integration test:** Cucumber BDD with API-behavioral World pattern
- **Events consumed:** `session-started`, `session-completed`, `scan-complete` from `WatchLoopEventMap`

## Tech Stack

- TypeScript (strict mode)
- vitest for unit tests
- Cucumber.js for integration tests
- Bun runtime

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `cli/src/dashboard/session-stats.ts` | Stats accumulator class + `SessionStats` type |
| Create | `cli/src/__tests__/session-stats.test.ts` | Unit tests for accumulator logic |
| Create | `cli/features/session-stats.feature` | Cucumber integration test (from Gherkin) |
| Create | `cli/features/step_definitions/session-stats.steps.ts` | Step definitions for session stats BDD |
| Create | `cli/features/support/session-stats-world.ts` | World class with mock EventEmitter |
| Create | `cli/features/support/session-stats-hooks.ts` | Before/After hooks for scenario isolation |
| Modify | `cli/cucumber.json` | Add `session-stats` profile |

---

### Task 0: Integration Test (BDD RED State)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/features/session-stats.feature`
- Create: `cli/features/step_definitions/session-stats.steps.ts`
- Create: `cli/features/support/session-stats-world.ts`
- Create: `cli/features/support/session-stats-hooks.ts`
- Modify: `cli/cucumber.json`

- [x] **Step 1: Create World class**

```typescript
// cli/features/support/session-stats-world.ts
import { World } from "@cucumber/cucumber";
import { EventEmitter } from "node:events";

/**
 * World for session-stats BDD tests.
 * Uses an EventEmitter as a mock event source — the accumulator
 * subscribes to it just like it would to a real WatchLoop.
 */
export class SessionStatsWorld extends World {
  emitter!: EventEmitter;
  accumulator: any = null;
  startTime: number = 0;
  currentTime: number = 0;
}
```

- [x] **Step 2: Create hooks**

```typescript
// cli/features/support/session-stats-hooks.ts
import { Before } from "@cucumber/cucumber";
import { SessionStatsWorld } from "./session-stats-world.js";

Before(function (this: SessionStatsWorld) {
  this.emitter = new EventEmitter();
  this.accumulator = null;
  this.startTime = 0;
  this.currentTime = 0;
});
```

- [x] **Step 3: Create feature file**

```gherkin
# cli/features/session-stats.feature
@details-panel-stats
Feature: Session stats accumulation from watch loop events

  A dedicated stats accumulator subscribes to watch loop events and
  maintains running counters for session metrics. The accumulator is
  decoupled from rendering and produces computed stats on demand.

  Scenario: Total session count increments when a session completes
    Given the stats accumulator is initialized
    And no sessions have completed
    When a session completes successfully
    Then the total session count is 1
    When a second session completes successfully
    Then the total session count is 2

  Scenario: Active session count reflects currently running sessions
    Given the stats accumulator is initialized
    When a session starts
    Then the active session count is 1
    When a second session starts
    Then the active session count is 2
    When the first session completes
    Then the active session count is 1

  Scenario: Success rate reflects completed session outcomes
    Given the stats accumulator is initialized
    When 3 sessions complete successfully
    And 1 session completes with failure
    Then the success rate is 75 percent

  Scenario: Cumulative session time sums all completed session durations
    Given the stats accumulator is initialized
    When a session completes with a duration of 120 seconds
    And a second session completes with a duration of 60 seconds
    Then the cumulative session time is 180 seconds

  Scenario: Uptime reflects elapsed time since accumulator started
    Given the stats accumulator is initialized at a known start time
    When time advances by 300 seconds
    And a scan-complete event fires
    Then the reported uptime is approximately 300 seconds

  Scenario: Accumulator reports empty state before any session completes
    Given the stats accumulator is initialized
    And no sessions have completed
    Then the accumulator reports an empty state

  Scenario: Accumulator exits empty state after first session completes
    Given the stats accumulator is initialized
    And no sessions have completed
    When a session completes successfully
    Then the accumulator no longer reports an empty state

  Scenario: Phase duration averages are computed per phase
    Given the stats accumulator is initialized
    When a session completes the "plan" phase in 30 seconds
    And a second session completes the "plan" phase in 50 seconds
    Then the average duration for the "plan" phase is 40 seconds

  Scenario Outline: All four pipeline phases track durations independently
    Given the stats accumulator is initialized
    When a session completes the "<phase>" phase in 60 seconds
    Then the average duration for the "<phase>" phase is 60 seconds
    And the other phases show no recorded duration

    Examples:
      | phase     |
      | plan      |
      | implement |
      | validate  |
      | release   |

  Scenario: Unseen phases display no duration data
    Given the stats accumulator is initialized
    When a session completes the "plan" phase in 45 seconds
    Then the "implement" phase has no recorded duration
    And the "validate" phase has no recorded duration
    And the "release" phase has no recorded duration

  Scenario: Retry count increments on re-dispatch events
    Given the stats accumulator is initialized
    When a session is re-dispatched
    Then the total re-dispatch count is 1
    When a session is re-dispatched again
    Then the total re-dispatch count is 2

  Scenario: Failure count increments on terminal failures
    Given the stats accumulator is initialized
    When a session completes with failure
    Then the total failure count is 1

  Scenario: Stats reset on accumulator initialization
    Given the stats accumulator is initialized
    Then the total session count is 0
    And the active session count is 0
    And the total re-dispatch count is 0
    And the total failure count is 0
```

- [x] **Step 4: Create step definitions (skeleton — will fail)**

```typescript
// cli/features/step_definitions/session-stats.steps.ts
import { Given, When, Then } from "@cucumber/cucumber";
import { SessionStatsWorld } from "../support/session-stats-world.js";

// Stub import — module does not exist yet, so all scenarios will fail
// import { SessionStatsAccumulator } from "../../src/dashboard/session-stats.js";

let sessionCounter = 0;

Given("the stats accumulator is initialized", function (this: SessionStatsWorld) {
  // Will fail: SessionStatsAccumulator does not exist yet
  const { SessionStatsAccumulator } = require("../../src/dashboard/session-stats.js");
  this.accumulator = new SessionStatsAccumulator(this.emitter);
  sessionCounter = 0;
});

Given("the stats accumulator is initialized at a known start time", function (this: SessionStatsWorld) {
  this.startTime = 1000000;
  this.currentTime = this.startTime;
  const { SessionStatsAccumulator } = require("../../src/dashboard/session-stats.js");
  this.accumulator = new SessionStatsAccumulator(this.emitter, { nowFn: () => this.currentTime });
  sessionCounter = 0;
});

Given("no sessions have completed", function (this: SessionStatsWorld) {
  // No-op — accumulator starts empty
});

When("a session completes successfully", function (this: SessionStatsWorld) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase: "plan", sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: `epic-${sessionCounter}`, phase: "plan", success: true, durationMs: 10000 });
});

When("a second session completes successfully", function (this: SessionStatsWorld) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase: "plan", sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: `epic-${sessionCounter}`, phase: "plan", success: true, durationMs: 10000 });
});

When("a session starts", function (this: SessionStatsWorld) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase: "plan", sessionId: `s-${sessionCounter}` });
});

When("a second session starts", function (this: SessionStatsWorld) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase: "plan", sessionId: `s-${sessionCounter}` });
});

When("the first session completes", function (this: SessionStatsWorld) {
  this.emitter.emit("session-completed", { epicSlug: "epic-1", phase: "plan", success: true, durationMs: 10000 });
});

When("{int} sessions complete successfully", function (this: SessionStatsWorld, count: number) {
  for (let i = 0; i < count; i++) {
    sessionCounter++;
    this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase: "plan", sessionId: `s-${sessionCounter}` });
    this.emitter.emit("session-completed", { epicSlug: `epic-${sessionCounter}`, phase: "plan", success: true, durationMs: 10000 });
  }
});

When("{int} session completes with failure", function (this: SessionStatsWorld, count: number) {
  for (let i = 0; i < count; i++) {
    sessionCounter++;
    this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase: "plan", sessionId: `s-${sessionCounter}` });
    this.emitter.emit("session-completed", { epicSlug: `epic-${sessionCounter}`, phase: "plan", success: false, durationMs: 10000 });
  }
});

When("a session completes with a duration of {int} seconds", function (this: SessionStatsWorld, seconds: number) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase: "plan", sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: `epic-${sessionCounter}`, phase: "plan", success: true, durationMs: seconds * 1000 });
});

When("a second session completes with a duration of {int} seconds", function (this: SessionStatsWorld, seconds: number) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase: "plan", sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: `epic-${sessionCounter}`, phase: "plan", success: true, durationMs: seconds * 1000 });
});

When("time advances by {int} seconds", function (this: SessionStatsWorld, seconds: number) {
  this.currentTime = this.startTime + seconds * 1000;
});

When("a scan-complete event fires", function (this: SessionStatsWorld) {
  this.emitter.emit("scan-complete", { epicsScanned: 1, dispatched: 0 });
});

When("a session completes the {string} phase in {int} seconds", function (this: SessionStatsWorld, phase: string, seconds: number) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase, sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: `epic-${sessionCounter}`, phase, success: true, durationMs: seconds * 1000 });
});

When("a second session completes the {string} phase in {int} seconds", function (this: SessionStatsWorld, phase: string, seconds: number) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase, sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: `epic-${sessionCounter}`, phase, success: true, durationMs: seconds * 1000 });
});

When("a session is re-dispatched", function (this: SessionStatsWorld) {
  sessionCounter++;
  const key = `epic-redispatch:plan`;
  // First time: complete a session to mark the key
  this.emitter.emit("session-started", { epicSlug: "epic-redispatch", phase: "plan", sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: "epic-redispatch", phase: "plan", success: true, durationMs: 5000 });
  // Second start with same key = re-dispatch
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: "epic-redispatch", phase: "plan", sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: "epic-redispatch", phase: "plan", success: true, durationMs: 5000 });
});

When("a session is re-dispatched again", function (this: SessionStatsWorld) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: "epic-redispatch", phase: "plan", sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: "epic-redispatch", phase: "plan", success: true, durationMs: 5000 });
});

When("a session completes with failure", function (this: SessionStatsWorld) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase: "plan", sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: `epic-${sessionCounter}`, phase: "plan", success: false, durationMs: 10000 });
});

Then("the total session count is {int}", function (this: SessionStatsWorld, expected: number) {
  const stats = this.accumulator.getStats();
  if (stats.total !== expected) throw new Error(`Expected total ${expected}, got ${stats.total}`);
});

Then("the active session count is {int}", function (this: SessionStatsWorld, expected: number) {
  const stats = this.accumulator.getStats();
  if (stats.active !== expected) throw new Error(`Expected active ${expected}, got ${stats.active}`);
});

Then("the success rate is {int} percent", function (this: SessionStatsWorld, expected: number) {
  const stats = this.accumulator.getStats();
  if (stats.successRate !== expected) throw new Error(`Expected success rate ${expected}%, got ${stats.successRate}%`);
});

Then("the cumulative session time is {int} seconds", function (this: SessionStatsWorld, expected: number) {
  const stats = this.accumulator.getStats();
  const actual = stats.cumulativeMs / 1000;
  if (actual !== expected) throw new Error(`Expected cumulative ${expected}s, got ${actual}s`);
});

Then("the reported uptime is approximately {int} seconds", function (this: SessionStatsWorld, expected: number) {
  const stats = this.accumulator.getStats();
  const actualSeconds = stats.uptimeMs / 1000;
  const tolerance = 2;
  if (Math.abs(actualSeconds - expected) > tolerance) {
    throw new Error(`Expected uptime ~${expected}s, got ${actualSeconds}s`);
  }
});

Then("the accumulator reports an empty state", function (this: SessionStatsWorld) {
  const stats = this.accumulator.getStats();
  if (!stats.isEmpty) throw new Error("Expected isEmpty to be true");
});

Then("the accumulator no longer reports an empty state", function (this: SessionStatsWorld) {
  const stats = this.accumulator.getStats();
  if (stats.isEmpty) throw new Error("Expected isEmpty to be false");
});

Then("the average duration for the {string} phase is {int} seconds", function (this: SessionStatsWorld, phase: string, expected: number) {
  const stats = this.accumulator.getStats();
  const avg = stats.phaseDurations[phase];
  if (avg === null || avg === undefined) throw new Error(`No duration recorded for phase "${phase}"`);
  const actualSeconds = avg / 1000;
  if (actualSeconds !== expected) throw new Error(`Expected avg ${expected}s for "${phase}", got ${actualSeconds}s`);
});

Then("the other phases show no recorded duration", function (this: SessionStatsWorld) {
  const stats = this.accumulator.getStats();
  const allPhases = ["plan", "implement", "validate", "release"];
  const seenPhases = allPhases.filter((p) => stats.phaseDurations[p] !== null);
  if (seenPhases.length > 1) throw new Error(`Expected only 1 phase with data, got: ${seenPhases.join(", ")}`);
});

Then("the {string} phase has no recorded duration", function (this: SessionStatsWorld, phase: string) {
  const stats = this.accumulator.getStats();
  if (stats.phaseDurations[phase] !== null) {
    throw new Error(`Expected null duration for "${phase}", got ${stats.phaseDurations[phase]}`);
  }
});

Then("the total re-dispatch count is {int}", function (this: SessionStatsWorld, expected: number) {
  const stats = this.accumulator.getStats();
  if (stats.reDispatches !== expected) throw new Error(`Expected re-dispatches ${expected}, got ${stats.reDispatches}`);
});

Then("the total failure count is {int}", function (this: SessionStatsWorld, expected: number) {
  const stats = this.accumulator.getStats();
  if (stats.failures !== expected) throw new Error(`Expected failures ${expected}, got ${stats.failures}`);
});
```

- [x] **Step 5: Add cucumber profile**

Add to `cli/cucumber.json`:

```json
"session-stats": {
  "paths": ["features/session-stats.feature"],
  "import": [
    "features/step_definitions/session-stats.steps.ts",
    "features/support/session-stats-world.ts",
    "features/support/session-stats-hooks.ts"
  ],
  "format": ["progress-bar"],
  "publishQuiet": true
}
```

- [x] **Step 6: Run integration test to verify RED state**

Run: `bun run cucumber --profile session-stats`
Expected: FAIL — `SessionStatsAccumulator` module does not exist

---

### Task 1: SessionStats Type and Accumulator Class

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/src/dashboard/session-stats.ts`
- Create: `cli/src/__tests__/session-stats.test.ts`

- [x] **Step 1: Write the failing test — initial state**

```typescript
// cli/src/__tests__/session-stats.test.ts
import { describe, test, expect } from "vitest";
import { EventEmitter } from "node:events";
import { SessionStatsAccumulator } from "../dashboard/session-stats.js";
import type { SessionStats } from "../dashboard/session-stats.js";

function createAccumulator(): { emitter: EventEmitter; acc: SessionStatsAccumulator } {
  const emitter = new EventEmitter();
  const acc = new SessionStatsAccumulator(emitter);
  return { emitter, acc };
}

describe("SessionStatsAccumulator", () => {
  describe("initial state", () => {
    test("all counters are zero", () => {
      const { acc } = createAccumulator();
      const stats = acc.getStats();
      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.successes).toBe(0);
      expect(stats.failures).toBe(0);
      expect(stats.reDispatches).toBe(0);
      expect(stats.cumulativeMs).toBe(0);
    });

    test("isEmpty is true", () => {
      const { acc } = createAccumulator();
      expect(acc.getStats().isEmpty).toBe(true);
    });

    test("successRate is 0", () => {
      const { acc } = createAccumulator();
      expect(acc.getStats().successRate).toBe(0);
    });

    test("all phase durations are null", () => {
      const { acc } = createAccumulator();
      const stats = acc.getStats();
      expect(stats.phaseDurations.plan).toBeNull();
      expect(stats.phaseDurations.implement).toBeNull();
      expect(stats.phaseDurations.validate).toBeNull();
      expect(stats.phaseDurations.release).toBeNull();
    });
  });

  describe("session-started", () => {
    test("increments active count", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      expect(acc.getStats().active).toBe(1);
    });

    test("multiple starts increment active count", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-started", { epicSlug: "e2", phase: "plan", sessionId: "s2" });
      expect(acc.getStats().active).toBe(2);
    });
  });

  describe("session-completed", () => {
    test("increments total and decrements active on success", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: true, durationMs: 5000 });
      const stats = acc.getStats();
      expect(stats.total).toBe(1);
      expect(stats.active).toBe(0);
      expect(stats.successes).toBe(1);
    });

    test("increments failures on failure", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: false, durationMs: 5000 });
      const stats = acc.getStats();
      expect(stats.total).toBe(1);
      expect(stats.failures).toBe(1);
      expect(stats.successes).toBe(0);
    });

    test("sets isEmpty to false after first completion", () => {
      const { emitter, acc } = createAccumulator();
      expect(acc.getStats().isEmpty).toBe(true);
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: true, durationMs: 5000 });
      expect(acc.getStats().isEmpty).toBe(false);
    });

    test("accumulates cumulative duration", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: true, durationMs: 120000 });
      emitter.emit("session-started", { epicSlug: "e2", phase: "plan", sessionId: "s2" });
      emitter.emit("session-completed", { epicSlug: "e2", phase: "plan", success: true, durationMs: 60000 });
      expect(acc.getStats().cumulativeMs).toBe(180000);
    });
  });

  describe("success rate", () => {
    test("computes percentage from successes and total", () => {
      const { emitter, acc } = createAccumulator();
      for (let i = 1; i <= 3; i++) {
        emitter.emit("session-started", { epicSlug: `e${i}`, phase: "plan", sessionId: `s${i}` });
        emitter.emit("session-completed", { epicSlug: `e${i}`, phase: "plan", success: true, durationMs: 5000 });
      }
      emitter.emit("session-started", { epicSlug: "e4", phase: "plan", sessionId: "s4" });
      emitter.emit("session-completed", { epicSlug: "e4", phase: "plan", success: false, durationMs: 5000 });
      expect(acc.getStats().successRate).toBe(75);
    });

    test("returns 0 when no sessions completed", () => {
      const { acc } = createAccumulator();
      expect(acc.getStats().successRate).toBe(0);
    });
  });

  describe("phase durations", () => {
    test("tracks average duration per phase", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: true, durationMs: 30000 });
      emitter.emit("session-started", { epicSlug: "e2", phase: "plan", sessionId: "s2" });
      emitter.emit("session-completed", { epicSlug: "e2", phase: "plan", success: true, durationMs: 50000 });
      expect(acc.getStats().phaseDurations.plan).toBe(40000);
    });

    test("unseen phases remain null", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: true, durationMs: 30000 });
      const stats = acc.getStats();
      expect(stats.phaseDurations.implement).toBeNull();
      expect(stats.phaseDurations.validate).toBeNull();
      expect(stats.phaseDurations.release).toBeNull();
    });

    test("each phase tracks independently", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: true, durationMs: 30000 });
      emitter.emit("session-started", { epicSlug: "e2", phase: "implement", sessionId: "s2" });
      emitter.emit("session-completed", { epicSlug: "e2", phase: "implement", success: true, durationMs: 60000 });
      const stats = acc.getStats();
      expect(stats.phaseDurations.plan).toBe(30000);
      expect(stats.phaseDurations.implement).toBe(60000);
    });
  });

  describe("re-dispatch detection", () => {
    test("detects re-dispatch when same epic+phase+feature completes again", () => {
      const { emitter, acc } = createAccumulator();
      // First dispatch
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: true, durationMs: 5000 });
      expect(acc.getStats().reDispatches).toBe(0);
      // Second dispatch of same combo
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s2" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: true, durationMs: 5000 });
      expect(acc.getStats().reDispatches).toBe(1);
    });

    test("different epic+phase combos do not count as re-dispatch", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: true, durationMs: 5000 });
      emitter.emit("session-started", { epicSlug: "e1", phase: "implement", sessionId: "s2" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "implement", success: true, durationMs: 5000 });
      expect(acc.getStats().reDispatches).toBe(0);
    });
  });

  describe("uptime", () => {
    test("computes uptime from start on scan-complete", () => {
      let now = 1000000;
      const emitter = new EventEmitter();
      const acc = new SessionStatsAccumulator(emitter, { nowFn: () => now });
      now = 1000000 + 300000; // +300s
      emitter.emit("scan-complete", { epicsScanned: 1, dispatched: 0 });
      const stats = acc.getStats();
      expect(stats.uptimeMs).toBe(300000);
    });

    test("uptime updates on each scan-complete", () => {
      let now = 0;
      const emitter = new EventEmitter();
      const acc = new SessionStatsAccumulator(emitter, { nowFn: () => now });
      now = 60000;
      emitter.emit("scan-complete", { epicsScanned: 1, dispatched: 0 });
      expect(acc.getStats().uptimeMs).toBe(60000);
      now = 120000;
      emitter.emit("scan-complete", { epicsScanned: 1, dispatched: 0 });
      expect(acc.getStats().uptimeMs).toBe(120000);
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun --bun vitest run src/__tests__/session-stats.test.ts`
Expected: FAIL — `session-stats.js` does not exist

- [x] **Step 3: Write the implementation**

```typescript
// cli/src/dashboard/session-stats.ts
/**
 * Session stats accumulator — subscribes to WatchLoop EventEmitter events
 * and maintains running session metrics.
 *
 * Pure logic module, decoupled from React rendering.
 */

import type { EventEmitter } from "node:events";
import type {
  SessionStartedEvent,
  SessionCompletedEvent,
  ScanCompleteEvent,
} from "../dispatch/types.js";

/** Pipeline phases tracked for duration averages. */
const TRACKED_PHASES = ["plan", "implement", "validate", "release"] as const;
type TrackedPhase = (typeof TRACKED_PHASES)[number];

/** Snapshot of accumulated session metrics. */
export interface SessionStats {
  /** Total completed sessions. */
  total: number;
  /** Currently active (in-flight) sessions. */
  active: number;
  /** Successfully completed sessions. */
  successes: number;
  /** Failed sessions. */
  failures: number;
  /** Sessions re-dispatched (same epic+phase+feature combo completed more than once). */
  reDispatches: number;
  /** Success rate as a percentage (0-100). 0 when no sessions completed. */
  successRate: number;
  /** Milliseconds since accumulator was created (updated on scan-complete). */
  uptimeMs: number;
  /** Sum of all completed session durations in milliseconds. */
  cumulativeMs: number;
  /** True until the first session-completed event fires. */
  isEmpty: boolean;
  /** Average duration per phase in ms, or null for unseen phases. */
  phaseDurations: Record<TrackedPhase, number | null>;
}

/** Options for dependency injection (testing). */
export interface AccumulatorOptions {
  /** Override Date.now() for deterministic uptime testing. */
  nowFn?: () => number;
}

/**
 * Subscribes to WatchLoop events and accumulates session metrics.
 */
export class SessionStatsAccumulator {
  private total = 0;
  private active = 0;
  private successes = 0;
  private failures = 0;
  private reDispatches = 0;
  private cumulativeMs = 0;
  private isEmpty_ = true;
  private uptimeMs = 0;

  /** Set of "epic:phase:feature" keys that have completed at least once. */
  private completedKeys = new Set<string>();

  /** Per-phase duration arrays for computing averages. */
  private phaseDurationArrays: Record<string, number[]> = {};

  private readonly startTime: number;
  private readonly nowFn: () => number;

  constructor(emitter: EventEmitter, options?: AccumulatorOptions) {
    this.nowFn = options?.nowFn ?? (() => Date.now());
    this.startTime = this.nowFn();

    emitter.on("session-started", (event: SessionStartedEvent) => {
      this.onSessionStarted(event);
    });

    emitter.on("session-completed", (event: SessionCompletedEvent) => {
      this.onSessionCompleted(event);
    });

    emitter.on("scan-complete", (_event: ScanCompleteEvent) => {
      this.onScanComplete();
    });
  }

  /** Return a snapshot of all accumulated metrics. */
  getStats(): SessionStats {
    const phaseDurations = {} as Record<TrackedPhase, number | null>;
    for (const phase of TRACKED_PHASES) {
      const arr = this.phaseDurationArrays[phase];
      if (arr && arr.length > 0) {
        phaseDurations[phase] = arr.reduce((a, b) => a + b, 0) / arr.length;
      } else {
        phaseDurations[phase] = null;
      }
    }

    return {
      total: this.total,
      active: this.active,
      successes: this.successes,
      failures: this.failures,
      reDispatches: this.reDispatches,
      successRate: this.total > 0 ? Math.round((this.successes / this.total) * 100) : 0,
      uptimeMs: this.uptimeMs,
      cumulativeMs: this.cumulativeMs,
      isEmpty: this.isEmpty_,
      phaseDurations,
    };
  }

  private onSessionStarted(event: SessionStartedEvent): void {
    this.active++;
  }

  private onSessionCompleted(event: SessionCompletedEvent): void {
    this.active = Math.max(0, this.active - 1);
    this.total++;
    this.isEmpty_ = false;

    if (event.success) {
      this.successes++;
    } else {
      this.failures++;
    }

    this.cumulativeMs += event.durationMs;

    // Phase duration tracking
    if (!this.phaseDurationArrays[event.phase]) {
      this.phaseDurationArrays[event.phase] = [];
    }
    this.phaseDurationArrays[event.phase].push(event.durationMs);

    // Re-dispatch detection
    const key = `${event.epicSlug}:${event.phase}:${event.featureSlug ?? ""}`;
    if (this.completedKeys.has(key)) {
      this.reDispatches++;
    } else {
      this.completedKeys.add(key);
    }
  }

  private onScanComplete(): void {
    this.uptimeMs = this.nowFn() - this.startTime;
  }
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `bun --bun vitest run src/__tests__/session-stats.test.ts`
Expected: PASS — all tests green

- [x] **Step 5: Commit**

```bash
git add cli/src/dashboard/session-stats.ts cli/src/__tests__/session-stats.test.ts
git commit -m "feat(session-stats): add SessionStatsAccumulator with unit tests"
```
