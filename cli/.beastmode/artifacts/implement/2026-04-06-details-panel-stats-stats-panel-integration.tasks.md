# Stats Panel Integration — Implementation Tasks

## Goal

Wire the stats accumulator into the dashboard's details panel content resolution and rendering pipeline. When the user selects "(all)" in the epics list, the details panel shows three stacked sections — Sessions, Phase Duration, Retries — accumulated from watch loop events. Before any session completes, a dim "waiting for sessions..." placeholder is shown instead.

## Architecture

- **Content resolution layer** (`details-panel.ts`): `DetailsContentResult` discriminated union gains a `kind: "stats"` variant. `resolveDetailsContent()` returns it when selection is `{ kind: "all" }` and a stats snapshot is provided.
- **App component** (`App.tsx`): Instantiates the stats accumulator, subscribes it to the WatchLoop EventEmitter, passes the stats snapshot to `resolveDetailsContent()` and the DetailsPanel.
- **Rendering layer** (`DetailsPanel.tsx`): New branch handles `kind: "stats"` — renders Sessions, Phase Duration, Retries sections. Empty state renders dim placeholder.
- **Stats accumulator** (`session-stats.ts`): Pure logic module (wave 1 dependency). Subscribes to `session-started`, `session-completed`, `scan-complete` events. Exposes `SessionStats` snapshot and `isEmpty` flag.
- **Duration formatting** (`format-duration.ts`): Shared utility for human-readable ms→string formatting.
- **Color palette** (`monokai-palette.ts`): `PHASE_COLOR` for phase names, `CHROME.muted` for empty state.

## Tech Stack

- TypeScript, React (Ink), Bun runtime
- Test runner: vitest (via `bun --bun vitest run`)
- BDD: Cucumber with API-behavioral World pattern

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/dashboard/session-stats.ts` | Create | Stats accumulator class + `SessionStats` type |
| `src/dashboard/format-duration.ts` | Create | `formatDuration(ms)` utility |
| `src/dashboard/details-panel.ts` | Modify | Add `StatsContent` variant to union, update `resolveDetailsContent` |
| `src/dashboard/DetailsPanel.tsx` | Modify | Add `kind: "stats"` rendering branch |
| `src/dashboard/App.tsx` | Modify | Instantiate accumulator, pass stats to resolution/rendering |
| `src/__tests__/session-stats.test.ts` | Create | Unit tests for accumulator |
| `src/__tests__/format-duration.test.ts` | Create | Unit tests for duration formatter |
| `src/__tests__/details-panel.test.ts` | Modify | Add tests for stats content resolution |
| `src/__tests__/details-panel-stats-rendering.test.ts` | Create | Tests for stats rendering in DetailsPanel |
| `features/stats-panel-integration.feature` | Create | BDD integration test (Task 0) |
| `features/step_definitions/stats-panel.steps.ts` | Create | Step definitions for BDD test |
| `features/support/stats-panel-world.ts` | Create | World class for BDD test |
| `features/support/stats-panel-hooks.ts` | Create | Hooks for BDD test |
| `cucumber.json` | Modify | Add `stats-panel` profile |

---

### Task 0: Integration Test (BDD)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `features/stats-panel-integration.feature`
- Create: `features/step_definitions/stats-panel.steps.ts`
- Create: `features/support/stats-panel-world.ts`
- Create: `features/support/stats-panel-hooks.ts`
- Modify: `cucumber.json`

This task creates the BDD integration test from the Gherkin scenarios in the feature plan. Uses the API-behavioral World pattern — the World instantiates the stats accumulator with a mock EventEmitter, calls `resolveDetailsContent()` with the stats snapshot, and reads DetailsPanel source for rendering assertions.

The test is expected to FAIL (RED) after this task because the accumulator, stats content variant, and rendering branch don't exist yet.

- [ ] **Step 1: Create the World class**

```typescript
// features/support/stats-panel-world.ts
import { World, setWorldConstructor } from "@cucumber/cucumber";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CLI_SRC = resolve(import.meta.dirname, "../../src");

export class StatsPanelWorld extends World {
  emitter = new EventEmitter();
  accumulator: any = null;
  stats: any = null;
  contentResult: any = null;
  detailsPanelSource = "";

  setup(): void {
    this.detailsPanelSource = readFileSync(resolve(CLI_SRC, "dashboard/DetailsPanel.tsx"), "utf-8");
  }

  async loadAccumulator(): Promise<void> {
    const mod = await import("../../src/dashboard/session-stats.js");
    this.accumulator = new mod.SessionStatsAccumulator(this.emitter);
  }

  emitSessionStarted(epicSlug: string, phase: string, sessionId: string, featureSlug?: string): void {
    this.emitter.emit("session-started", { epicSlug, phase, sessionId, featureSlug });
  }

  emitSessionCompleted(epicSlug: string, phase: string, success: boolean, durationMs: number, featureSlug?: string): void {
    this.emitter.emit("session-completed", { epicSlug, phase, success, durationMs, featureSlug });
  }

  emitScanComplete(epicsScanned: number, dispatched: number): void {
    this.emitter.emit("scan-complete", { epicsScanned, dispatched });
  }

  getStats(): any {
    this.stats = this.accumulator.getStats();
    return this.stats;
  }

  async resolveContent(selection: any): Promise<any> {
    const { resolveDetailsContent } = await import("../../src/dashboard/details-panel.js");
    this.contentResult = resolveDetailsContent(selection, { stats: this.accumulator.getStats() });
    return this.contentResult;
  }
}

setWorldConstructor(StatsPanelWorld);
```

- [ ] **Step 2: Create the hooks file**

```typescript
// features/support/stats-panel-hooks.ts
import { Before } from "@cucumber/cucumber";
import type { StatsPanelWorld } from "./stats-panel-world.js";

Before(async function (this: StatsPanelWorld) {
  this.emitter = new (await import("node:events")).EventEmitter();
  this.accumulator = null;
  this.stats = null;
  this.contentResult = null;
  this.setup();
});
```

- [ ] **Step 3: Create the feature file**

```gherkin
# features/stats-panel-integration.feature
@details-panel-stats
Feature: Details panel displays session stats when all epics are selected

  The details panel renders a stats view with three stacked sections
  when the user selects "(all)" in the epics list. The sections show
  session stats, phase duration breakdown, and retry stats.

  Background:
    Given the stats accumulator is initialized

  Scenario: Session stats section displays total and active counts
    When a session starts for epic "alpha" phase "plan"
    And a session starts for epic "beta" phase "implement"
    And the session for epic "alpha" phase "plan" completes successfully in 30000ms
    Then the stats show total sessions is 1
    And the stats show active sessions is 1

  Scenario: Session stats section displays success rate
    When a session completes for epic "a" phase "plan" with success in 10000ms
    And a session completes for epic "b" phase "plan" with success in 20000ms
    And a session completes for epic "c" phase "plan" with success in 15000ms
    And a session completes for epic "d" phase "plan" with failure in 5000ms
    Then the stats show success rate is 75

  Scenario: Session stats section displays cumulative session time
    When a session completes for epic "a" phase "plan" with success in 120000ms
    And a session completes for epic "b" phase "plan" with success in 60000ms
    Then the stats show cumulative time is 180000

  Scenario: Phase duration section shows average duration per phase
    When a session completes for epic "a" phase "plan" with success in 30000ms
    And a session completes for epic "b" phase "plan" with success in 50000ms
    Then the stats show average duration for "plan" is 40000

  Scenario: Unseen phases display no duration data
    When a session completes for epic "a" phase "plan" with success in 45000ms
    Then the stats show no duration for "implement"
    And the stats show no duration for "validate"
    And the stats show no duration for "release"

  Scenario: Retry stats section displays re-dispatch and failure counts
    When a session completes for epic "a" phase "plan" with failure in 5000ms
    And a session starts for epic "a" phase "plan" as a re-dispatch
    And a session completes for epic "a" phase "plan" with success in 10000ms
    Then the stats show re-dispatches is 1
    And the stats show failures is 1

  Scenario: Empty state before any session completes
    Then the stats accumulator reports isEmpty is true

  Scenario: Placeholder disappears after first session completes
    Then the stats accumulator reports isEmpty is true
    When a session completes for epic "a" phase "plan" with success in 10000ms
    Then the stats accumulator reports isEmpty is false

  Scenario: Stats content resolves for all selection
    When a session completes for epic "a" phase "plan" with success in 10000ms
    And I resolve details content for selection "all"
    Then the content result has kind "stats"

  Scenario: DetailsPanel source handles stats kind
    Then the DetailsPanel source contains a branch for "stats" content kind

  Scenario: Three sections rendered in order
    Then the DetailsPanel source renders sections in order: Sessions, Phase Duration, Retries
```

- [ ] **Step 4: Create step definitions**

```typescript
// features/step_definitions/stats-panel.steps.ts
import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { StatsPanelWorld } from "../support/stats-panel-world.js";

Given("the stats accumulator is initialized", async function (this: StatsPanelWorld) {
  await this.loadAccumulator();
});

When("a session starts for epic {string} phase {string}", function (this: StatsPanelWorld, epic: string, phase: string) {
  this.emitSessionStarted(epic, phase, `${epic}-${phase}-${Date.now()}`);
});

When(
  "the session for epic {string} phase {string} completes successfully in {int}ms",
  function (this: StatsPanelWorld, epic: string, phase: string, durationMs: number) {
    this.emitSessionCompleted(epic, phase, true, durationMs);
  },
);

When(
  "a session completes for epic {string} phase {string} with success in {int}ms",
  function (this: StatsPanelWorld, epic: string, phase: string, durationMs: number) {
    this.emitSessionStarted(epic, phase, `${epic}-${phase}-${Date.now()}`);
    this.emitSessionCompleted(epic, phase, true, durationMs);
  },
);

When(
  "a session completes for epic {string} phase {string} with failure in {int}ms",
  function (this: StatsPanelWorld, epic: string, phase: string, durationMs: number) {
    this.emitSessionStarted(epic, phase, `${epic}-${phase}-${Date.now()}`);
    this.emitSessionCompleted(epic, phase, false, durationMs);
  },
);

When(
  "a session starts for epic {string} phase {string} as a re-dispatch",
  function (this: StatsPanelWorld, epic: string, phase: string) {
    this.emitSessionStarted(epic, phase, `${epic}-${phase}-redispatch-${Date.now()}`);
  },
);

When("I resolve details content for selection {string}", async function (this: StatsPanelWorld, kind: string) {
  await this.resolveContent({ kind });
});

Then("the stats show total sessions is {int}", function (this: StatsPanelWorld, expected: number) {
  const stats = this.getStats();
  assert.equal(stats.total, expected);
});

Then("the stats show active sessions is {int}", function (this: StatsPanelWorld, expected: number) {
  const stats = this.getStats();
  assert.equal(stats.active, expected);
});

Then("the stats show success rate is {int}", function (this: StatsPanelWorld, expected: number) {
  const stats = this.getStats();
  assert.equal(stats.successRate, expected);
});

Then("the stats show cumulative time is {int}", function (this: StatsPanelWorld, expected: number) {
  const stats = this.getStats();
  assert.equal(stats.cumulativeMs, expected);
});

Then("the stats show average duration for {string} is {int}", function (this: StatsPanelWorld, phase: string, expected: number) {
  const stats = this.getStats();
  assert.equal(stats.phaseDurations[phase], expected);
});

Then("the stats show no duration for {string}", function (this: StatsPanelWorld, phase: string) {
  const stats = this.getStats();
  assert.equal(stats.phaseDurations[phase], null);
});

Then("the stats show re-dispatches is {int}", function (this: StatsPanelWorld, expected: number) {
  const stats = this.getStats();
  assert.equal(stats.reDispatches, expected);
});

Then("the stats show failures is {int}", function (this: StatsPanelWorld, expected: number) {
  const stats = this.getStats();
  assert.equal(stats.failures, expected);
});

Then("the stats accumulator reports isEmpty is true", function (this: StatsPanelWorld) {
  const stats = this.getStats();
  assert.equal(stats.isEmpty, true);
});

Then("the stats accumulator reports isEmpty is false", function (this: StatsPanelWorld) {
  const stats = this.getStats();
  assert.equal(stats.isEmpty, false);
});

Then("the content result has kind {string}", function (this: StatsPanelWorld, kind: string) {
  assert.equal(this.contentResult.kind, kind);
});

Then("the DetailsPanel source contains a branch for {string} content kind", function (this: StatsPanelWorld, kind: string) {
  assert.ok(
    this.detailsPanelSource.includes(`result.kind === "${kind}"`) ||
    this.detailsPanelSource.includes(`result.kind === '${kind}'`),
    `DetailsPanel.tsx should contain a branch for kind "${kind}"`,
  );
});

Then(
  "the DetailsPanel source renders sections in order: Sessions, Phase Duration, Retries",
  function (this: StatsPanelWorld) {
    const src = this.detailsPanelSource;
    const sessionsIdx = src.indexOf("Sessions");
    const phaseIdx = src.indexOf("Phase Duration");
    const retriesIdx = src.indexOf("Retries");
    assert.ok(sessionsIdx > -1, "DetailsPanel should contain 'Sessions'");
    assert.ok(phaseIdx > -1, "DetailsPanel should contain 'Phase Duration'");
    assert.ok(retriesIdx > -1, "DetailsPanel should contain 'Retries'");
    assert.ok(sessionsIdx < phaseIdx, "Sessions should come before Phase Duration");
    assert.ok(phaseIdx < retriesIdx, "Phase Duration should come before Retries");
  },
);
```

- [ ] **Step 5: Add cucumber profile**

Add to `cucumber.json`:
```json
"stats-panel": {
  "paths": ["features/stats-panel-integration.feature"],
  "import": [
    "features/step_definitions/stats-panel.steps.ts",
    "features/support/stats-panel-world.ts",
    "features/support/stats-panel-hooks.ts"
  ],
  "format": ["progress-bar"],
  "publishQuiet": true
}
```

- [ ] **Step 6: Run integration test to verify RED state**

Run: `bun --bun node_modules/.bin/cucumber-js --profile stats-panel`
Expected: FAIL — `session-stats.js` module does not exist

- [ ] **Step 7: Commit**

```bash
git add features/stats-panel-integration.feature features/step_definitions/stats-panel.steps.ts features/support/stats-panel-world.ts features/support/stats-panel-hooks.ts cucumber.json
git commit -m "test(stats-panel): add BDD integration test (RED)"
```

---

### Task 1: Session Stats Accumulator

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `src/dashboard/session-stats.ts`
- Create: `src/__tests__/session-stats.test.ts`

This task creates the pure logic module that subscribes to WatchLoop events and maintains running session metrics. No React or dashboard rendering imports.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/__tests__/session-stats.test.ts
import { describe, test, expect, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import { SessionStatsAccumulator } from "../dashboard/session-stats.js";
import type { SessionStats } from "../dashboard/session-stats.js";

describe("SessionStatsAccumulator", () => {
  let emitter: EventEmitter;
  let acc: SessionStatsAccumulator;

  beforeEach(() => {
    emitter = new EventEmitter();
    acc = new SessionStatsAccumulator(emitter);
  });

  test("initial state: all zeros, isEmpty true", () => {
    const s = acc.getStats();
    expect(s.total).toBe(0);
    expect(s.active).toBe(0);
    expect(s.successes).toBe(0);
    expect(s.failures).toBe(0);
    expect(s.reDispatches).toBe(0);
    expect(s.successRate).toBe(0);
    expect(s.cumulativeMs).toBe(0);
    expect(s.isEmpty).toBe(true);
    expect(s.phaseDurations.plan).toBeNull();
    expect(s.phaseDurations.implement).toBeNull();
    expect(s.phaseDurations.validate).toBeNull();
    expect(s.phaseDurations.release).toBeNull();
  });

  test("session-started increments active count", () => {
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s1" });
    expect(acc.getStats().active).toBe(1);
  });

  test("session-completed decrements active, increments total", () => {
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s1" });
    emitter.emit("session-completed", { epicSlug: "a", phase: "plan", success: true, durationMs: 5000 });
    const s = acc.getStats();
    expect(s.active).toBe(0);
    expect(s.total).toBe(1);
    expect(s.successes).toBe(1);
  });

  test("failed session increments failures", () => {
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s1" });
    emitter.emit("session-completed", { epicSlug: "a", phase: "plan", success: false, durationMs: 3000 });
    const s = acc.getStats();
    expect(s.failures).toBe(1);
    expect(s.total).toBe(1);
  });

  test("success rate computed correctly", () => {
    for (let i = 0; i < 3; i++) {
      emitter.emit("session-started", { epicSlug: `e${i}`, phase: "plan", sessionId: `s${i}` });
      emitter.emit("session-completed", { epicSlug: `e${i}`, phase: "plan", success: true, durationMs: 1000 });
    }
    emitter.emit("session-started", { epicSlug: "f", phase: "plan", sessionId: "sf" });
    emitter.emit("session-completed", { epicSlug: "f", phase: "plan", success: false, durationMs: 1000 });
    expect(acc.getStats().successRate).toBe(75);
  });

  test("cumulative session time sums durations", () => {
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s1" });
    emitter.emit("session-completed", { epicSlug: "a", phase: "plan", success: true, durationMs: 120000 });
    emitter.emit("session-started", { epicSlug: "b", phase: "plan", sessionId: "s2" });
    emitter.emit("session-completed", { epicSlug: "b", phase: "plan", success: true, durationMs: 60000 });
    expect(acc.getStats().cumulativeMs).toBe(180000);
  });

  test("per-phase average durations", () => {
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s1" });
    emitter.emit("session-completed", { epicSlug: "a", phase: "plan", success: true, durationMs: 30000 });
    emitter.emit("session-started", { epicSlug: "b", phase: "plan", sessionId: "s2" });
    emitter.emit("session-completed", { epicSlug: "b", phase: "plan", success: true, durationMs: 50000 });
    expect(acc.getStats().phaseDurations.plan).toBe(40000);
  });

  test("unseen phases return null", () => {
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s1" });
    emitter.emit("session-completed", { epicSlug: "a", phase: "plan", success: true, durationMs: 45000 });
    const s = acc.getStats();
    expect(s.phaseDurations.implement).toBeNull();
    expect(s.phaseDurations.validate).toBeNull();
    expect(s.phaseDurations.release).toBeNull();
  });

  test("isEmpty becomes false after first completion", () => {
    expect(acc.getStats().isEmpty).toBe(true);
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s1" });
    emitter.emit("session-completed", { epicSlug: "a", phase: "plan", success: true, durationMs: 1000 });
    expect(acc.getStats().isEmpty).toBe(false);
  });

  test("re-dispatch detection", () => {
    // First run for epic a / plan
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s1" });
    emitter.emit("session-completed", { epicSlug: "a", phase: "plan", success: false, durationMs: 5000 });
    // Re-dispatch: same epic+phase combo starts again after a completion
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s2" });
    expect(acc.getStats().reDispatches).toBe(1);
  });

  test("uptime computed on scan-complete", () => {
    const startTime = acc["startedAt"];
    // Simulate time passing by manipulating the internal start time
    acc["startedAt"] = Date.now() - 300000; // 5 minutes ago
    emitter.emit("scan-complete", { epicsScanned: 5, dispatched: 2 });
    const s = acc.getStats();
    expect(s.uptimeMs).toBeGreaterThanOrEqual(299000);
    expect(s.uptimeMs).toBeLessThanOrEqual(301000);
  });

  test("dispose removes all listeners", () => {
    acc.dispose();
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s1" });
    expect(acc.getStats().active).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --bun vitest run src/__tests__/session-stats.test.ts`
Expected: FAIL — module `../dashboard/session-stats.js` not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/dashboard/session-stats.ts
import type { EventEmitter } from "node:events";
import type {
  SessionStartedEvent,
  SessionCompletedEvent,
  ScanCompleteEvent,
} from "../dispatch/types.js";

/** Snapshot of accumulated session statistics. */
export interface SessionStats {
  total: number;
  active: number;
  successes: number;
  failures: number;
  reDispatches: number;
  successRate: number;
  uptimeMs: number;
  cumulativeMs: number;
  isEmpty: boolean;
  phaseDurations: Record<"plan" | "implement" | "validate" | "release", number | null>;
}

const PIPELINE_PHASES = ["plan", "implement", "validate", "release"] as const;

/**
 * Subscribes to WatchLoop events and accumulates session metrics.
 * Pure logic — no React or rendering imports.
 */
export class SessionStatsAccumulator {
  private total = 0;
  private active = 0;
  private successes = 0;
  private failures = 0;
  private reDispatches = 0;
  private cumulativeMs = 0;
  private isEmpty = true;
  private uptimeMs = 0;
  private startedAt = Date.now();

  /** Per-phase duration arrays for computing averages. */
  private phaseDurationArrays: Record<string, number[]> = {
    plan: [],
    implement: [],
    validate: [],
    release: [],
  };

  /** Tracks completed session keys for re-dispatch detection. */
  private completedKeys = new Set<string>();

  private readonly emitter: EventEmitter;
  private readonly onStarted: (ev: SessionStartedEvent) => void;
  private readonly onCompleted: (ev: SessionCompletedEvent) => void;
  private readonly onScan: (ev: ScanCompleteEvent) => void;

  constructor(emitter: EventEmitter) {
    this.emitter = emitter;

    this.onStarted = (ev) => {
      this.active++;
      const key = `${ev.epicSlug}:${ev.featureSlug ?? ""}:${ev.phase}`;
      if (this.completedKeys.has(key)) {
        this.reDispatches++;
      }
    };

    this.onCompleted = (ev) => {
      this.active = Math.max(0, this.active - 1);
      this.total++;
      this.cumulativeMs += ev.durationMs;
      this.isEmpty = false;

      if (ev.success) {
        this.successes++;
      } else {
        this.failures++;
      }

      const key = `${ev.epicSlug}:${ev.featureSlug ?? ""}:${ev.phase}`;
      this.completedKeys.add(key);

      if (PIPELINE_PHASES.includes(ev.phase as any)) {
        this.phaseDurationArrays[ev.phase].push(ev.durationMs);
      }
    };

    this.onScan = () => {
      this.uptimeMs = Date.now() - this.startedAt;
    };

    emitter.on("session-started", this.onStarted);
    emitter.on("session-completed", this.onCompleted);
    emitter.on("scan-complete", this.onScan);
  }

  getStats(): SessionStats {
    const phaseDurations = {} as Record<"plan" | "implement" | "validate" | "release", number | null>;
    for (const phase of PIPELINE_PHASES) {
      const arr = this.phaseDurationArrays[phase];
      phaseDurations[phase] = arr.length > 0
        ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
        : null;
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
      isEmpty: this.isEmpty,
      phaseDurations,
    };
  }

  dispose(): void {
    this.emitter.off("session-started", this.onStarted);
    this.emitter.off("session-completed", this.onCompleted);
    this.emitter.off("scan-complete", this.onScan);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun --bun vitest run src/__tests__/session-stats.test.ts`
Expected: PASS — all tests green

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/session-stats.ts src/__tests__/session-stats.test.ts
git commit -m "feat(stats-panel): add session stats accumulator"
```

---

### Task 2: Duration Formatting Utility

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `src/dashboard/format-duration.ts`
- Create: `src/__tests__/format-duration.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/__tests__/format-duration.test.ts
import { describe, test, expect } from "vitest";
import { formatDuration } from "../dashboard/format-duration.js";

describe("formatDuration", () => {
  test("sub-second returns milliseconds", () => {
    expect(formatDuration(500)).toBe("500ms");
  });

  test("exact seconds", () => {
    expect(formatDuration(5000)).toBe("5s");
  });

  test("seconds with remainder", () => {
    expect(formatDuration(5500)).toBe("5s");
  });

  test("minutes and seconds", () => {
    expect(formatDuration(150000)).toBe("2m 30s");
  });

  test("exact minutes", () => {
    expect(formatDuration(120000)).toBe("2m 0s");
  });

  test("hours and minutes", () => {
    expect(formatDuration(4500000)).toBe("1h 15m");
  });

  test("zero", () => {
    expect(formatDuration(0)).toBe("0ms");
  });

  test("one second exactly", () => {
    expect(formatDuration(1000)).toBe("1s");
  });

  test("one minute exactly", () => {
    expect(formatDuration(60000)).toBe("1m 0s");
  });

  test("one hour exactly", () => {
    expect(formatDuration(3600000)).toBe("1h 0m");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --bun vitest run src/__tests__/format-duration.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/dashboard/format-duration.ts

/**
 * Format millisecond duration into human-readable string.
 * Examples: "500ms", "5s", "2m 30s", "1h 15m"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) {
    const remainingSeconds = totalSeconds % 60;
    return `${totalMinutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun --bun vitest run src/__tests__/format-duration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/format-duration.ts src/__tests__/format-duration.test.ts
git commit -m "feat(stats-panel): add duration formatting utility"
```

---

### Task 3: Add Stats Content Variant to Type System

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `src/dashboard/details-panel.ts`
- Modify: `src/__tests__/details-panel.test.ts`

Add the `kind: "stats"` variant to `DetailsContentResult` and update `resolveDetailsContent` to return it when selection is `{ kind: "all" }` and stats are provided.

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/details-panel.test.ts`:

```typescript
// Add import for SessionStats type
import type { SessionStats } from "../dashboard/session-stats.js";

// Add inside the "resolveDetailsContent" describe block:

test("returns stats content when selection is all and stats provided", () => {
  const stats: SessionStats = {
    total: 5,
    active: 2,
    successes: 4,
    failures: 1,
    reDispatches: 1,
    successRate: 80,
    uptimeMs: 300000,
    cumulativeMs: 500000,
    isEmpty: false,
    phaseDurations: { plan: 30000, implement: 120000, validate: 45000, release: 15000 },
  };
  const result = resolveDetailsContent(
    { kind: "all" },
    { epics: [], activeSessions: 2, gitStatus: null, stats },
  );
  expect(result.kind).toBe("stats");
  if (result.kind === "stats") {
    expect(result.stats.total).toBe(5);
    expect(result.stats.successRate).toBe(80);
  }
});

test("returns overview content when selection is all and stats is empty", () => {
  const stats: SessionStats = {
    total: 0,
    active: 0,
    successes: 0,
    failures: 0,
    reDispatches: 0,
    successRate: 0,
    uptimeMs: 0,
    cumulativeMs: 0,
    isEmpty: true,
    phaseDurations: { plan: null, implement: null, validate: null, release: null },
  };
  const result = resolveDetailsContent(
    { kind: "all" },
    { epics: [], activeSessions: 0, gitStatus: null, stats },
  );
  expect(result.kind).toBe("stats");
  if (result.kind === "stats") {
    expect(result.stats.isEmpty).toBe(true);
  }
});

test("returns overview when selection is all and no stats provided", () => {
  const result = resolveDetailsContent(
    { kind: "all" },
    { epics: [], activeSessions: 0, gitStatus: null },
  );
  expect(result.kind).toBe("overview");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --bun vitest run src/__tests__/details-panel.test.ts`
Expected: FAIL — `stats` not in `DetailsContentContext`, `kind: "stats"` not in union

- [ ] **Step 3: Write the implementation**

Modify `src/dashboard/details-panel.ts`:

1. Add import for `SessionStats`:
```typescript
import type { SessionStats } from "./session-stats.js";
```

2. Add `StatsContent` interface after the existing content interfaces:
```typescript
/** Stats content — session metrics for the "(all)" view. */
export interface StatsContent {
  kind: "stats";
  stats: SessionStats;
}
```

3. Update the union type:
```typescript
export type DetailsContentResult = OverviewContent | StatsContent | ArtifactContent | NotFoundContent;
```

4. Add `stats` to `DetailsContentContext`:
```typescript
export interface DetailsContentContext {
  epics?: EnrichedEpic[];
  activeSessions?: number;
  gitStatus?: GitStatus | null;
  projectRoot?: string;
  stats?: SessionStats;
}
```

5. Update the `resolveDetailsContent` function's "all" branch:
```typescript
if (selection.kind === "all") {
  if (ctx.stats) {
    return { kind: "stats", stats: ctx.stats };
  }
  const epics = ctx.epics ?? [];
  const distribution = computePhaseDistribution(epics);
  const sessions = formatActiveSessions(ctx.activeSessions ?? 0);
  const git = ctx.gitStatus ? formatGitStatus(ctx.gitStatus) : null;
  return { kind: "overview", distribution, sessions, git };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun --bun vitest run src/__tests__/details-panel.test.ts`
Expected: PASS — all tests green (including existing ones)

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/details-panel.ts src/__tests__/details-panel.test.ts
git commit -m "feat(stats-panel): add stats content variant to type system"
```

---

### Task 4: DetailsPanel Stats Rendering

**Wave:** 3
**Depends on:** Task 2, Task 3

**Files:**
- Modify: `src/dashboard/DetailsPanel.tsx`
- Create: `src/__tests__/details-panel-stats-rendering.test.ts`

Add the rendering branch for `kind: "stats"` content in DetailsPanel. Renders three stacked sections (Sessions, Phase Duration, Retries) with empty state handling.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/__tests__/details-panel-stats-rendering.test.ts
import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = resolve(import.meta.dirname, "../dashboard/DetailsPanel.tsx");
const source = readFileSync(SRC, "utf-8");

describe("DetailsPanel stats rendering", () => {
  test("handles stats content kind", () => {
    expect(
      source.includes('result.kind === "stats"') || source.includes("result.kind === 'stats'"),
    ).toBe(true);
  });

  test("renders Sessions section header", () => {
    expect(source).toContain("Sessions");
  });

  test("renders Phase Duration section header", () => {
    expect(source).toContain("Phase Duration");
  });

  test("renders Retries section header", () => {
    expect(source).toContain("Retries");
  });

  test("sections appear in correct order", () => {
    const sessionsIdx = source.indexOf(">Sessions<");
    const phaseIdx = source.indexOf(">Phase Duration<");
    const retriesIdx = source.indexOf(">Retries<");
    expect(sessionsIdx).toBeGreaterThan(-1);
    expect(phaseIdx).toBeGreaterThan(-1);
    expect(retriesIdx).toBeGreaterThan(-1);
    expect(sessionsIdx).toBeLessThan(phaseIdx);
    expect(phaseIdx).toBeLessThan(retriesIdx);
  });

  test("imports PHASE_COLOR for phase name coloring", () => {
    expect(source).toContain("PHASE_COLOR");
  });

  test("imports CHROME for muted color", () => {
    expect(source).toContain("CHROME");
  });

  test("references waiting for sessions placeholder", () => {
    expect(source).toContain("waiting for sessions...");
  });

  test("references formatDuration", () => {
    expect(source).toContain("formatDuration");
  });

  test("shows double-dash for unseen phases", () => {
    expect(source).toContain('"--"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --bun vitest run src/__tests__/details-panel-stats-rendering.test.ts`
Expected: FAIL — DetailsPanel.tsx doesn't contain stats rendering yet

- [ ] **Step 3: Write the implementation**

Modify `src/dashboard/DetailsPanel.tsx`:

1. Add imports at top:
```typescript
import { PHASE_COLOR, CHROME } from "./monokai-palette.js";
import { formatDuration } from "./format-duration.js";
import type { SessionStats } from "./session-stats.js";
```

2. Add `stats` prop to `DetailsPanelProps`:
```typescript
export interface DetailsPanelProps {
  selection: DetailsPanelSelection;
  projectRoot?: string;
  epics: EnrichedEpic[];
  activeSessions: number;
  gitStatus: GitStatus | null;
  scrollOffset: number;
  visibleHeight: number;
  stats?: SessionStats;
}
```

3. Update the component to accept and pass stats:
```typescript
export default function DetailsPanel({
  selection,
  projectRoot,
  epics,
  activeSessions,
  gitStatus,
  scrollOffset,
  visibleHeight,
  stats,
}: DetailsPanelProps) {
  const result = resolveDetailsContent(selection, {
    epics,
    activeSessions,
    gitStatus,
    projectRoot,
    stats,
  });
```

4. Add stats rendering branch after the overview branch (before `not-found`):
```typescript
  if (result.kind === "stats") {
    if (result.stats.isEmpty) {
      return (
        <Box flexDirection="column" overflowY="hidden">
          <Text color={CHROME.muted}>waiting for sessions...</Text>
        </Box>
      );
    }

    const s = result.stats;
    const PHASES = ["plan", "implement", "validate", "release"] as const;

    return (
      <Box flexDirection="column" overflowY="hidden">
        <Text bold>Sessions</Text>
        <Text>  total: {s.total}</Text>
        <Text>  active: {s.active}</Text>
        <Text>  success rate: {s.successRate}%</Text>
        <Text>  uptime: {formatDuration(s.uptimeMs)}</Text>
        <Text>  session time: {formatDuration(s.cumulativeMs)}</Text>

        <Text> </Text>

        <Text bold>Phase Duration</Text>
        {PHASES.map((phase) => (
          <Text key={phase}>
            {"  "}
            <Text color={PHASE_COLOR[phase] as Parameters<typeof Text>[0]["color"]}>
              {phase}
            </Text>
            {" "}
            {s.phaseDurations[phase] !== null ? formatDuration(s.phaseDurations[phase]!) : "--"}
          </Text>
        ))}

        <Text> </Text>

        <Text bold>Retries</Text>
        <Text>  re-dispatches: {s.reDispatches}</Text>
        <Text>  failures: {s.failures}</Text>
      </Box>
    );
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun --bun vitest run src/__tests__/details-panel-stats-rendering.test.ts`
Expected: PASS

- [ ] **Step 5: Run existing details-panel tests to verify no regression**

Run: `bun --bun vitest run src/__tests__/details-panel.test.ts`
Expected: PASS — existing tests unaffected

- [ ] **Step 6: Commit**

```bash
git add src/dashboard/DetailsPanel.tsx src/__tests__/details-panel-stats-rendering.test.ts
git commit -m "feat(stats-panel): add stats rendering to DetailsPanel"
```

---

### Task 5: App Component Wiring

**Wave:** 4
**Depends on:** Task 1, Task 3, Task 4

**Files:**
- Modify: `src/dashboard/App.tsx`

Instantiate the stats accumulator in the App component, subscribe it to the WatchLoop, and pass the stats snapshot to DetailsPanel.

- [ ] **Step 1: Write the implementation**

Modify `src/dashboard/App.tsx`:

1. Add import at top:
```typescript
import { SessionStatsAccumulator } from "./session-stats.js";
```

2. Add state for stats snapshot. After the existing `useRef` declarations (around line 58), add:
```typescript
const [sessionStats, setSessionStats] = useState<ReturnType<SessionStatsAccumulator["getStats"]> | undefined>(undefined);
const statsAccRef = useRef<SessionStatsAccumulator | null>(null);
```

3. Add an effect to instantiate and subscribe the accumulator. Place after the WatchLoop event subscriptions effect (after line 387):
```typescript
// --- Stats accumulator ---
useEffect(() => {
  if (!loop) return;

  const acc = new SessionStatsAccumulator(loop);
  statsAccRef.current = acc;

  const refreshStats = () => {
    setSessionStats(acc.getStats());
  };

  // Refresh stats on events that change them
  loop.on("session-started", refreshStats);
  loop.on("session-completed", refreshStats);
  loop.on("scan-complete", refreshStats);

  return () => {
    loop.off("session-started", refreshStats);
    loop.off("session-completed", refreshStats);
    loop.off("scan-complete", refreshStats);
    acc.dispose();
    statsAccRef.current = null;
  };
}, [loop]);
```

4. Pass stats to the DetailsPanel component. Update the `<DetailsPanel>` JSX (around line 458):
```typescript
<DetailsPanel
  selection={detailsSelection}
  projectRoot={projectRoot}
  epics={filteredEpics}
  activeSessions={activeSessions.size}
  gitStatus={gitStatus}
  scrollOffset={keyboard.detailsScrollOffset}
  visibleHeight={Math.max(1, Math.floor((rows ?? 24) * 0.4 * 0.6) - 2)}
  stats={sessionStats}
/>
```

- [ ] **Step 2: Run all tests to verify no regression**

Run: `bun --bun vitest run`
Expected: PASS — all existing tests pass, new tests pass

- [ ] **Step 3: Commit**

```bash
git add src/dashboard/App.tsx
git commit -m "feat(stats-panel): wire stats accumulator into App component"
```
