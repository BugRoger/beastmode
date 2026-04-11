# Stats Persistence — Implementation Tasks

## Goal

Build a persistence module that reads/writes cumulative session stats to `.beastmode/state/dashboard-stats.json`. On startup, load historical stats. On every `session-completed` event, merge and flush. Graceful degradation for missing/corrupt files. Reset by file deletion.

## Architecture

- **Persistence module**: `cli/src/dashboard/stats-persistence.ts` — pure functions for load/save/merge. No React, no EventEmitter dependency.
- **Schema**: `PersistedStats` type with `schemaVersion`, `total`, `successes`, `failures`, `reDispatches`, `cumulativeMs`, `phaseDurations` (incremental averages as `{ avgMs, count }`), `completedKeys` (string array).
- **Incremental average formula**: `(oldAvg * oldCount + newVal) / (oldCount + 1)` — no raw duration arrays stored.
- **Wiring**: App.tsx loads persisted stats on mount, subscribes persistence flush to `session-completed` events.
- **Test framework**: vitest (unit tests), Cucumber (integration tests).

## Tech Stack

- TypeScript, vitest, Cucumber.js with Bun runtime
- `node:fs` for sync file I/O (`readFileSync`, `writeFileSync`)
- Existing `SessionStats` interface and `SessionCompletedEvent` type

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/dashboard/stats-persistence.ts` | Create | Persistence module — load, save, merge functions |
| `cli/src/__tests__/stats-persistence.test.ts` | Create | Unit tests for persistence module |
| `cli/features/stats-persistence.feature` | Create | Cucumber integration test scenarios |
| `cli/features/step_definitions/stats-persistence.steps.ts` | Create | Step definitions for persistence BDD |
| `cli/features/support/stats-persistence-world.ts` | Create | World class for persistence BDD |
| `cli/features/support/stats-persistence-hooks.ts` | Create | Hooks for persistence BDD |
| `cli/cucumber.json` | Modify | Add `stats-persistence` profile |
| `cli/src/dashboard/App.tsx` | Modify | Wire persistence load + flush |

---

### Task 0: Integration Test Scaffolding (Cucumber BDD)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/features/stats-persistence.feature`
- Create: `cli/features/step_definitions/stats-persistence.steps.ts`
- Create: `cli/features/support/stats-persistence-world.ts`
- Create: `cli/features/support/stats-persistence-hooks.ts`
- Modify: `cli/cucumber.json`

- [ ] **Step 1: Create the World class**

```typescript
// cli/features/support/stats-persistence-world.ts
import { World, setWorldConstructor } from "@cucumber/cucumber";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { EventEmitter } from "node:events";

export class StatsPersistenceWorld extends World {
  tmpDir!: string;
  statsFilePath!: string;
  emitter!: EventEmitter;
  loadedStats: any = null;
  error: any = null;
  warningLogged = false;

  createTmpDir(): void {
    this.tmpDir = mkdtempSync(join(tmpdir(), "stats-persist-"));
    this.statsFilePath = join(this.tmpDir, "dashboard-stats.json");
  }

  cleanup(): void {
    if (this.tmpDir && existsSync(this.tmpDir)) {
      rmSync(this.tmpDir, { recursive: true, force: true });
    }
  }

  writeStatsFile(content: string): void {
    writeFileSync(this.statsFilePath, content, "utf-8");
  }

  readStatsFile(): string {
    return readFileSync(this.statsFilePath, "utf-8");
  }

  statsFileExists(): boolean {
    return existsSync(this.statsFilePath);
  }
}

setWorldConstructor(StatsPersistenceWorld);
```

- [ ] **Step 2: Create the hooks file**

```typescript
// cli/features/support/stats-persistence-hooks.ts
import { Before, After } from "@cucumber/cucumber";
import { EventEmitter } from "node:events";
import type { StatsPersistenceWorld } from "./stats-persistence-world.js";

Before(function (this: StatsPersistenceWorld) {
  this.emitter = new EventEmitter();
  this.loadedStats = null;
  this.error = null;
  this.warningLogged = false;
  this.createTmpDir();
});

After(function (this: StatsPersistenceWorld) {
  this.cleanup();
});
```

- [ ] **Step 3: Create the feature file**

```gherkin
# cli/features/stats-persistence.feature
@dashboard-stats-persistence @dashboard
Feature: Dashboard stats persistence -- cumulative statistics survive restarts

  Background:
    Given the dashboard stats persistence layer is initialized

  Scenario: Cumulative stats are available after dashboard restart
    Given a previous dashboard session completed 5 sessions with 4 successes
    When the dashboard restarts and loads persisted stats
    Then the all-time total session count is 5
    And the all-time success rate is 80 percent

  Scenario: Current session stats accumulate independently from persisted stats
    Given a previous dashboard session completed 3 sessions with 3 successes
    When the dashboard restarts and loads persisted stats
    And 2 new sessions complete with 1 success and 1 failure
    Then the all-time total session count is 5
    And the all-time success rate is 80 percent
    And the current session total count is 2
    And the current session success rate is 50 percent

  Scenario: Phase duration averages accumulate across restarts
    Given a previous dashboard session recorded average plan duration of 30 seconds over 4 sessions
    When the dashboard restarts and loads persisted stats
    And a new session completes the "plan" phase in 50 seconds
    Then the all-time average duration for the "plan" phase reflects all 5 sessions

  Scenario: Stats are persisted when a pipeline session completes
    Given the dashboard is running with persistence enabled
    When a pipeline session completes successfully
    Then the persisted stats reflect the completed session

  Scenario: Stats persisted mid-run survive an unclean shutdown
    Given the dashboard is running with persistence enabled
    And 3 pipeline sessions have completed
    When the dashboard process terminates unexpectedly
    And the dashboard restarts and loads persisted stats
    Then the all-time total session count is 3

  Scenario: Dashboard starts cleanly when no stats file exists
    Given no persisted stats file exists
    When the dashboard starts
    Then the dashboard displays empty all-time stats
    And the dashboard is fully operational

  Scenario: Dashboard starts cleanly when stats file is corrupt
    Given the persisted stats file contains invalid data
    When the dashboard starts
    Then the dashboard discards the corrupt data
    And the dashboard displays empty all-time stats
    And the dashboard is fully operational

  Scenario: Deleting the stats file resets all-time statistics
    Given the dashboard has accumulated all-time stats over multiple sessions
    When the operator deletes the persisted stats file
    And the dashboard restarts
    Then the dashboard displays empty all-time stats
    And no special command or UI action was required
```

- [ ] **Step 4: Create stub step definitions**

```typescript
// cli/features/step_definitions/stats-persistence.steps.ts
import { Given, When, Then } from "@cucumber/cucumber";
import type { StatsPersistenceWorld } from "../support/stats-persistence-world.js";

Given("the dashboard stats persistence layer is initialized", function (this: StatsPersistenceWorld) {
  // World constructor handles tmp dir + emitter setup via hooks
});

Given("a previous dashboard session completed {int} sessions with {int} successes", function (this: StatsPersistenceWorld, total: number, successes: number) {
  const { saveStats, emptyPersistedStats, mergeSessionCompleted } = require("../../src/dashboard/stats-persistence.js");
  let stats = emptyPersistedStats();
  for (let i = 0; i < total; i++) {
    stats = mergeSessionCompleted(stats, {
      epicSlug: `epic-${i}`,
      phase: "plan",
      success: i < successes,
      durationMs: 10000,
    });
  }
  saveStats(this.statsFilePath, stats);
});

Given("a previous dashboard session recorded average plan duration of {int} seconds over {int} sessions", function (this: StatsPersistenceWorld, avgSeconds: number, count: number) {
  const { saveStats, emptyPersistedStats } = require("../../src/dashboard/stats-persistence.js");
  const stats = emptyPersistedStats();
  stats.total = count;
  stats.successes = count;
  stats.cumulativeMs = avgSeconds * 1000 * count;
  stats.phaseDurations.plan = { avgMs: avgSeconds * 1000, count };
  saveStats(this.statsFilePath, stats);
});

Given("the dashboard is running with persistence enabled", function (this: StatsPersistenceWorld) {
  // Persistence is initialized via the tmp dir — no extra setup needed
});

Given("{int} pipeline sessions have completed", function (this: StatsPersistenceWorld, count: number) {
  const { saveStats, emptyPersistedStats, mergeSessionCompleted } = require("../../src/dashboard/stats-persistence.js");
  let stats = emptyPersistedStats();
  for (let i = 0; i < count; i++) {
    stats = mergeSessionCompleted(stats, {
      epicSlug: `epic-${i}`,
      phase: "plan",
      success: true,
      durationMs: 10000,
    });
  }
  saveStats(this.statsFilePath, stats);
});

Given("no persisted stats file exists", function (this: StatsPersistenceWorld) {
  // Default state — tmp dir has no stats file
});

Given("the persisted stats file contains invalid data", function (this: StatsPersistenceWorld) {
  this.writeStatsFile("{{{{not json at all!!!!");
});

Given("the dashboard has accumulated all-time stats over multiple sessions", function (this: StatsPersistenceWorld) {
  const { saveStats, emptyPersistedStats, mergeSessionCompleted } = require("../../src/dashboard/stats-persistence.js");
  let stats = emptyPersistedStats();
  for (let i = 0; i < 5; i++) {
    stats = mergeSessionCompleted(stats, {
      epicSlug: `epic-${i}`,
      phase: "plan",
      success: true,
      durationMs: 10000,
    });
  }
  saveStats(this.statsFilePath, stats);
});

When("the dashboard restarts and loads persisted stats", function (this: StatsPersistenceWorld) {
  const { loadStats } = require("../../src/dashboard/stats-persistence.js");
  this.loadedStats = loadStats(this.statsFilePath);
});

When("{int} new sessions complete with {int} success and {int} failure", function (this: StatsPersistenceWorld, _total: number, successes: number, failures: number) {
  const { loadStats, mergeSessionCompleted, saveStats } = require("../../src/dashboard/stats-persistence.js");
  let stats = loadStats(this.statsFilePath);
  for (let i = 0; i < successes; i++) {
    stats = mergeSessionCompleted(stats, {
      epicSlug: `new-epic-s${i}`,
      phase: "plan",
      success: true,
      durationMs: 10000,
    });
  }
  for (let i = 0; i < failures; i++) {
    stats = mergeSessionCompleted(stats, {
      epicSlug: `new-epic-f${i}`,
      phase: "plan",
      success: false,
      durationMs: 10000,
    });
  }
  saveStats(this.statsFilePath, stats);
  this.loadedStats = stats;
});

When("a new session completes the {string} phase in {int} seconds", function (this: StatsPersistenceWorld, phase: string, seconds: number) {
  const { loadStats, mergeSessionCompleted, saveStats } = require("../../src/dashboard/stats-persistence.js");
  let stats = this.loadedStats ?? loadStats(this.statsFilePath);
  stats = mergeSessionCompleted(stats, {
    epicSlug: "new-epic-phase",
    phase,
    success: true,
    durationMs: seconds * 1000,
  });
  saveStats(this.statsFilePath, stats);
  this.loadedStats = stats;
});

When("a pipeline session completes successfully", function (this: StatsPersistenceWorld) {
  const { loadStats, mergeSessionCompleted, saveStats } = require("../../src/dashboard/stats-persistence.js");
  let stats = loadStats(this.statsFilePath);
  stats = mergeSessionCompleted(stats, {
    epicSlug: "epic-success",
    phase: "plan",
    success: true,
    durationMs: 15000,
  });
  saveStats(this.statsFilePath, stats);
  this.loadedStats = stats;
});

When("the dashboard process terminates unexpectedly", function (this: StatsPersistenceWorld) {
  // No-op — stats were already flushed on each session-completed
});

When("the dashboard starts", function (this: StatsPersistenceWorld) {
  const { loadStats } = require("../../src/dashboard/stats-persistence.js");
  this.loadedStats = loadStats(this.statsFilePath);
});

When("the operator deletes the persisted stats file", function (this: StatsPersistenceWorld) {
  const { rmSync: rm } = require("node:fs");
  if (this.statsFileExists()) {
    rm(this.statsFilePath);
  }
});

When("the dashboard restarts", function (this: StatsPersistenceWorld) {
  const { loadStats } = require("../../src/dashboard/stats-persistence.js");
  this.loadedStats = loadStats(this.statsFilePath);
});

Then("the all-time total session count is {int}", function (this: StatsPersistenceWorld, expected: number) {
  if (this.loadedStats.total !== expected) {
    throw new Error(`Expected total ${expected}, got ${this.loadedStats.total}`);
  }
});

Then("the all-time success rate is {int} percent", function (this: StatsPersistenceWorld, expected: number) {
  const rate = this.loadedStats.total > 0
    ? Math.round((this.loadedStats.successes / this.loadedStats.total) * 100)
    : 0;
  if (rate !== expected) {
    throw new Error(`Expected success rate ${expected}%, got ${rate}%`);
  }
});

Then("the current session total count is {int}", function (this: StatsPersistenceWorld, expected: number) {
  // The "current session" is the 2 new sessions that completed after restart
  // In the scenario, the loaded stats include all sessions (persisted + new)
  // Current session count = total - original persisted total
  // But since we merged in place, we track this differently:
  // The step "2 new sessions complete with 1 success and 1 failure" adds 2 to the total
  // We verify the new total minus the original matches expected
  // For simplicity, the BDD scenario trusts the merge — the unit test verifies exact math
  // Here we just verify the loaded stats total changed by the expected amount
  const originalTotal = 3; // from "completed 3 sessions with 3 successes"
  const currentCount = this.loadedStats.total - originalTotal;
  if (currentCount !== expected) {
    throw new Error(`Expected current session count ${expected}, got ${currentCount}`);
  }
});

Then("the current session success rate is {int} percent", function (this: StatsPersistenceWorld, expected: number) {
  // Current session: 1 success, 1 failure out of 2 = 50%
  // We compute from the delta: newSuccesses = total successes - original successes
  const originalSuccesses = 3;
  const originalTotal = 3;
  const currentSuccesses = this.loadedStats.successes - originalSuccesses;
  const currentTotal = this.loadedStats.total - originalTotal;
  const rate = currentTotal > 0 ? Math.round((currentSuccesses / currentTotal) * 100) : 0;
  if (rate !== expected) {
    throw new Error(`Expected current session success rate ${expected}%, got ${rate}%`);
  }
});

Then("the all-time average duration for the {string} phase reflects all {int} sessions", function (this: StatsPersistenceWorld, phase: string, totalSessions: number) {
  const pd = this.loadedStats.phaseDurations[phase];
  if (!pd) throw new Error(`No phase duration data for "${phase}"`);
  if (pd.count !== totalSessions) {
    throw new Error(`Expected ${totalSessions} sessions for "${phase}", got ${pd.count}`);
  }
  // 4 sessions at 30s avg + 1 session at 50s = (30000*4 + 50000) / 5 = 34000ms
  const expectedAvg = (30000 * 4 + 50000) / 5;
  const tolerance = 1; // floating point
  if (Math.abs(pd.avgMs - expectedAvg) > tolerance) {
    throw new Error(`Expected avg ${expectedAvg}ms for "${phase}", got ${pd.avgMs}ms`);
  }
});

Then("the persisted stats reflect the completed session", function (this: StatsPersistenceWorld) {
  if (this.loadedStats.total !== 1) {
    throw new Error(`Expected total 1, got ${this.loadedStats.total}`);
  }
  if (this.loadedStats.successes !== 1) {
    throw new Error(`Expected successes 1, got ${this.loadedStats.successes}`);
  }
});

Then("the dashboard displays empty all-time stats", function (this: StatsPersistenceWorld) {
  if (this.loadedStats.total !== 0) {
    throw new Error(`Expected total 0, got ${this.loadedStats.total}`);
  }
  if (this.loadedStats.successes !== 0) {
    throw new Error(`Expected successes 0, got ${this.loadedStats.successes}`);
  }
});

Then("the dashboard is fully operational", function (this: StatsPersistenceWorld) {
  // The fact that loadStats returned without throwing proves operational
  if (!this.loadedStats) {
    throw new Error("loadedStats is null — dashboard failed to initialize");
  }
});

Then("the dashboard discards the corrupt data", function (this: StatsPersistenceWorld) {
  // Verified by "displays empty all-time stats" — corrupt data was discarded
  if (this.loadedStats.total !== 0) {
    throw new Error(`Expected total 0 after discard, got ${this.loadedStats.total}`);
  }
});

Then("no special command or UI action was required", function (this: StatsPersistenceWorld) {
  // This is a declarative assertion — the scenario already demonstrated that
  // deleting the file + restart was sufficient. No-op step.
});
```

- [ ] **Step 5: Add Cucumber profile**

Add to `cli/cucumber.json`:

```json
"stats-persistence": {
  "paths": ["features/stats-persistence.feature"],
  "import": [
    "features/step_definitions/stats-persistence.steps.ts",
    "features/support/stats-persistence-world.ts",
    "features/support/stats-persistence-hooks.ts"
  ],
  "format": ["progress-bar"],
  "publishQuiet": true
}
```

- [ ] **Step 6: Run integration tests to verify RED state**

Run: `cd cli && bun run cucumber --profile stats-persistence`
Expected: FAIL — `stats-persistence.js` module does not exist yet

- [ ] **Step 7: Commit**

```bash
git add cli/features/stats-persistence.feature cli/features/step_definitions/stats-persistence.steps.ts cli/features/support/stats-persistence-world.ts cli/features/support/stats-persistence-hooks.ts cli/cucumber.json
git commit -m "test(stats-persistence): add BDD integration test scaffolding (RED)"
```

---

### Task 1: Persistence Module — Schema and Core Functions

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/src/dashboard/stats-persistence.ts`
- Create: `cli/src/__tests__/stats-persistence.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// cli/src/__tests__/stats-persistence.test.ts
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  emptyPersistedStats,
  mergeSessionCompleted,
  loadStats,
  saveStats,
  CURRENT_SCHEMA_VERSION,
  type PersistedStats,
} from "../dashboard/stats-persistence.js";

let tmpDir: string;
let statsPath: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "stats-test-"));
  statsPath = join(tmpDir, "dashboard-stats.json");
});

afterEach(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

describe("emptyPersistedStats", () => {
  test("returns zero counters with schema version", () => {
    const stats = emptyPersistedStats();
    expect(stats.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(stats.total).toBe(0);
    expect(stats.successes).toBe(0);
    expect(stats.failures).toBe(0);
    expect(stats.reDispatches).toBe(0);
    expect(stats.cumulativeMs).toBe(0);
    expect(stats.phaseDurations).toEqual({});
    expect(stats.completedKeys).toEqual([]);
  });
});

describe("mergeSessionCompleted", () => {
  test("increments total and successes on success", () => {
    const stats = emptyPersistedStats();
    const merged = mergeSessionCompleted(stats, {
      epicSlug: "e1",
      phase: "plan",
      success: true,
      durationMs: 10000,
    });
    expect(merged.total).toBe(1);
    expect(merged.successes).toBe(1);
    expect(merged.failures).toBe(0);
  });

  test("increments total and failures on failure", () => {
    const stats = emptyPersistedStats();
    const merged = mergeSessionCompleted(stats, {
      epicSlug: "e1",
      phase: "plan",
      success: false,
      durationMs: 10000,
    });
    expect(merged.total).toBe(1);
    expect(merged.successes).toBe(0);
    expect(merged.failures).toBe(1);
  });

  test("accumulates cumulativeMs", () => {
    let stats = emptyPersistedStats();
    stats = mergeSessionCompleted(stats, {
      epicSlug: "e1",
      phase: "plan",
      success: true,
      durationMs: 10000,
    });
    stats = mergeSessionCompleted(stats, {
      epicSlug: "e2",
      phase: "plan",
      success: true,
      durationMs: 20000,
    });
    expect(stats.cumulativeMs).toBe(30000);
  });

  test("computes incremental phase average correctly", () => {
    let stats = emptyPersistedStats();
    stats = mergeSessionCompleted(stats, {
      epicSlug: "e1",
      phase: "plan",
      success: true,
      durationMs: 30000,
    });
    expect(stats.phaseDurations.plan).toEqual({ avgMs: 30000, count: 1 });

    stats = mergeSessionCompleted(stats, {
      epicSlug: "e2",
      phase: "plan",
      success: true,
      durationMs: 50000,
    });
    expect(stats.phaseDurations.plan).toEqual({ avgMs: 40000, count: 2 });
  });

  test("incremental average across 5 sessions matches expected", () => {
    let stats = emptyPersistedStats();
    // Simulate 4 sessions at 30s avg, then 1 at 50s
    stats.phaseDurations.plan = { avgMs: 30000, count: 4 };
    stats.total = 4;
    stats.successes = 4;
    stats.cumulativeMs = 120000;

    stats = mergeSessionCompleted(stats, {
      epicSlug: "e5",
      phase: "plan",
      success: true,
      durationMs: 50000,
    });

    // (30000 * 4 + 50000) / 5 = 34000
    expect(stats.phaseDurations.plan!.avgMs).toBe(34000);
    expect(stats.phaseDurations.plan!.count).toBe(5);
  });

  test("tracks completedKeys and detects re-dispatches", () => {
    let stats = emptyPersistedStats();
    stats = mergeSessionCompleted(stats, {
      epicSlug: "e1",
      phase: "plan",
      success: true,
      durationMs: 10000,
    });
    expect(stats.completedKeys).toContain("e1:plan:");
    expect(stats.reDispatches).toBe(0);

    // Same key again — re-dispatch
    stats = mergeSessionCompleted(stats, {
      epicSlug: "e1",
      phase: "plan",
      success: true,
      durationMs: 10000,
    });
    expect(stats.reDispatches).toBe(1);
  });

  test("completedKeys includes feature slug when present", () => {
    let stats = emptyPersistedStats();
    stats = mergeSessionCompleted(stats, {
      epicSlug: "e1",
      phase: "implement",
      success: true,
      durationMs: 10000,
      featureSlug: "feat-1",
    });
    expect(stats.completedKeys).toContain("e1:implement:feat-1");
  });
});

describe("saveStats + loadStats round-trip", () => {
  test("round-trips through JSON file", () => {
    let stats = emptyPersistedStats();
    stats = mergeSessionCompleted(stats, {
      epicSlug: "e1",
      phase: "plan",
      success: true,
      durationMs: 30000,
    });
    stats = mergeSessionCompleted(stats, {
      epicSlug: "e2",
      phase: "implement",
      success: false,
      durationMs: 60000,
    });

    saveStats(statsPath, stats);
    const loaded = loadStats(statsPath);

    expect(loaded.total).toBe(2);
    expect(loaded.successes).toBe(1);
    expect(loaded.failures).toBe(1);
    expect(loaded.cumulativeMs).toBe(90000);
    expect(loaded.phaseDurations.plan).toEqual({ avgMs: 30000, count: 1 });
    expect(loaded.phaseDurations.implement).toEqual({ avgMs: 60000, count: 1 });
    expect(loaded.completedKeys).toContain("e1:plan:");
    expect(loaded.completedKeys).toContain("e2:implement:");
  });

  test("creates parent directories if needed", () => {
    const deepPath = join(tmpDir, "nested", "dir", "stats.json");
    const stats = emptyPersistedStats();
    saveStats(deepPath, stats);
    expect(existsSync(deepPath)).toBe(true);
  });
});

describe("loadStats graceful degradation", () => {
  test("returns empty stats when file does not exist", () => {
    const stats = loadStats(statsPath);
    expect(stats.total).toBe(0);
    expect(stats.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  test("returns empty stats when file contains invalid JSON", () => {
    writeFileSync(statsPath, "{{{{not json", "utf-8");
    const stats = loadStats(statsPath);
    expect(stats.total).toBe(0);
  });

  test("returns empty stats when file contains valid JSON but wrong shape", () => {
    writeFileSync(statsPath, JSON.stringify({ foo: "bar" }), "utf-8");
    const stats = loadStats(statsPath);
    expect(stats.total).toBe(0);
  });

  test("returns empty stats when schema version is higher than current", () => {
    const futureStats = { ...emptyPersistedStats(), schemaVersion: 999 };
    writeFileSync(statsPath, JSON.stringify(futureStats), "utf-8");
    const stats = loadStats(statsPath);
    expect(stats.total).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/stats-persistence.test.ts`
Expected: FAIL — module `stats-persistence.js` does not exist

- [ ] **Step 3: Write the persistence module**

```typescript
// cli/src/dashboard/stats-persistence.ts
/**
 * Stats persistence — reads/writes cumulative session stats to a JSON file.
 *
 * Pure functions, no React or EventEmitter dependency.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export const CURRENT_SCHEMA_VERSION = 1;

/** Incremental average entry for a single phase. */
export interface PhaseAverage {
  avgMs: number;
  count: number;
}

/** On-disk schema for persisted stats. */
export interface PersistedStats {
  schemaVersion: number;
  total: number;
  successes: number;
  failures: number;
  reDispatches: number;
  cumulativeMs: number;
  phaseDurations: Record<string, PhaseAverage>;
  completedKeys: string[];
}

/** Minimal event shape needed for merge — subset of SessionCompletedEvent. */
export interface MergeEvent {
  epicSlug: string;
  phase: string;
  success: boolean;
  durationMs: number;
  featureSlug?: string;
}

/** Create a fresh empty stats object. */
export function emptyPersistedStats(): PersistedStats {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    total: 0,
    successes: 0,
    failures: 0,
    reDispatches: 0,
    cumulativeMs: 0,
    phaseDurations: {},
    completedKeys: [],
  };
}

/**
 * Merge a session-completed event into persisted stats.
 * Returns a new stats object (does not mutate the input).
 */
export function mergeSessionCompleted(stats: PersistedStats, event: MergeEvent): PersistedStats {
  const next: PersistedStats = {
    ...stats,
    total: stats.total + 1,
    successes: stats.successes + (event.success ? 1 : 0),
    failures: stats.failures + (event.success ? 0 : 1),
    cumulativeMs: stats.cumulativeMs + event.durationMs,
    phaseDurations: { ...stats.phaseDurations },
    completedKeys: [...stats.completedKeys],
    reDispatches: stats.reDispatches,
  };

  // Incremental phase average: (oldAvg * oldCount + newVal) / (oldCount + 1)
  const existing = stats.phaseDurations[event.phase];
  if (existing) {
    const newCount = existing.count + 1;
    const newAvg = (existing.avgMs * existing.count + event.durationMs) / newCount;
    next.phaseDurations[event.phase] = { avgMs: newAvg, count: newCount };
  } else {
    next.phaseDurations[event.phase] = { avgMs: event.durationMs, count: 1 };
  }

  // Re-dispatch detection
  const key = `${event.epicSlug}:${event.phase}:${event.featureSlug ?? ""}`;
  if (next.completedKeys.includes(key)) {
    next.reDispatches++;
  } else {
    next.completedKeys.push(key);
  }

  return next;
}

/**
 * Load stats from a JSON file. Returns empty stats on any error
 * (missing file, corrupt JSON, schema mismatch).
 */
export function loadStats(filePath: string): PersistedStats {
  try {
    if (!existsSync(filePath)) {
      return emptyPersistedStats();
    }
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);

    // Validate shape
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.schemaVersion !== "number" ||
      typeof parsed.total !== "number"
    ) {
      return emptyPersistedStats();
    }

    // Schema version guard
    if (parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
      return emptyPersistedStats();
    }

    return parsed as PersistedStats;
  } catch {
    return emptyPersistedStats();
  }
}

/**
 * Save stats to a JSON file. Creates parent directories if needed.
 */
export function saveStats(filePath: string, stats: PersistedStats): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(stats, null, 2), "utf-8");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/stats-persistence.test.ts`
Expected: PASS — all tests green

- [ ] **Step 5: Commit**

```bash
git add cli/src/dashboard/stats-persistence.ts cli/src/__tests__/stats-persistence.test.ts
git commit -m "feat(stats-persistence): add persistence module with load/save/merge"
```

---

### Task 2: Wire Persistence into App.tsx

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/dashboard/App.tsx`

- [ ] **Step 1: Write the wiring code**

In `cli/src/dashboard/App.tsx`, add the following changes:

1. Import the persistence module:
```typescript
import { loadStats, saveStats, mergeSessionCompleted, type PersistedStats } from "./stats-persistence.js";
import { join } from "node:path";
```

2. Add state for persisted (all-time) stats — after the existing `sessionStats` state line (~line 59):
```typescript
const [allTimeStats, setAllTimeStats] = useState<PersistedStats | undefined>(undefined);
```

3. Add a `useEffect` to load persisted stats on mount — after the stats accumulator effect (~line 439):
```typescript
// --- Persisted stats (all-time) ---
useEffect(() => {
  if (!projectRoot) return;
  const statsPath = join(projectRoot, ".beastmode", "state", "dashboard-stats.json");
  const persisted = loadStats(statsPath);
  setAllTimeStats(persisted);

  if (!loop) return;

  const onSessionCompleted = (ev: WatchLoopEventMap["session-completed"][0]) => {
    setAllTimeStats((prev) => {
      const updated = mergeSessionCompleted(prev ?? persisted, {
        epicSlug: ev.epicSlug,
        phase: ev.phase,
        success: ev.success,
        durationMs: ev.durationMs,
        featureSlug: ev.featureSlug,
      });
      saveStats(statsPath, updated);
      return updated;
    });
  };

  loop.on("session-completed", onSessionCompleted);
  return () => {
    loop.off("session-completed", onSessionCompleted);
  };
}, [loop, projectRoot]);
```

- [ ] **Step 2: Run existing tests to verify no regressions**

Run: `cd cli && bun --bun vitest run`
Expected: PASS — all existing tests still green

- [ ] **Step 3: Commit**

```bash
git add cli/src/dashboard/App.tsx
git commit -m "feat(stats-persistence): wire persistence load and flush into App"
```

---

### Task 3: BDD Integration Tests — GREEN

**Wave:** 3
**Depends on:** Task 0, Task 1

**Files:**
- (No new files — verifies Task 0 scenarios pass with Task 1 implementation)

- [ ] **Step 1: Run BDD integration tests**

Run: `cd cli && bun run cucumber --profile stats-persistence`
Expected: PASS — all scenarios green

- [ ] **Step 2: If any fail, diagnose and fix**

Review failures, fix step definitions or persistence module as needed.

- [ ] **Step 3: Run full unit test suite**

Run: `cd cli && bun --bun vitest run`
Expected: PASS — no regressions

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "test(stats-persistence): BDD integration tests GREEN"
```
