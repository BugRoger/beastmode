import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  emptyPersistedStats,
  mergeSessionCompleted,
  loadStats,
  saveStats,
  toSessionStats,
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

describe("toSessionStats", () => {
  test("converts PersistedStats with populated phases to SessionStats", () => {
    const persisted: PersistedStats = {
      schemaVersion: 1,
      total: 10,
      successes: 8,
      failures: 2,
      reDispatches: 1,
      cumulativeMs: 600000,
      phaseDurations: {
        plan: { avgMs: 30000, count: 3 },
        implement: { avgMs: 120000, count: 5 },
        validate: { avgMs: 45000, count: 4 },
        release: { avgMs: 15000, count: 2 },
      },
      completedKeys: ["a:plan:", "b:implement:feat1"],
    };
    const result = toSessionStats(persisted);
    expect(result.total).toBe(10);
    expect(result.active).toBe(0);
    expect(result.successes).toBe(8);
    expect(result.failures).toBe(2);
    expect(result.reDispatches).toBe(1);
    expect(result.successRate).toBe(80);
    expect(result.uptimeMs).toBe(0);
    expect(result.cumulativeMs).toBe(600000);
    expect(result.isEmpty).toBe(false);
    expect(result.phaseDurations.plan).toBe(30000);
    expect(result.phaseDurations.implement).toBe(120000);
    expect(result.phaseDurations.validate).toBe(45000);
    expect(result.phaseDurations.release).toBe(15000);
  });

  test("converts empty PersistedStats to empty SessionStats", () => {
    const empty = emptyPersistedStats();
    const result = toSessionStats(empty);
    expect(result.total).toBe(0);
    expect(result.active).toBe(0);
    expect(result.isEmpty).toBe(true);
    expect(result.successRate).toBe(0);
    expect(result.phaseDurations.plan).toBeNull();
    expect(result.phaseDurations.implement).toBeNull();
    expect(result.phaseDurations.validate).toBeNull();
    expect(result.phaseDurations.release).toBeNull();
  });

  test("handles partial phase durations (missing phases get null)", () => {
    const partial: PersistedStats = {
      schemaVersion: 1,
      total: 2,
      successes: 2,
      failures: 0,
      reDispatches: 0,
      cumulativeMs: 100000,
      phaseDurations: {
        plan: { avgMs: 50000, count: 2 },
      },
      completedKeys: [],
    };
    const result = toSessionStats(partial);
    expect(result.phaseDurations.plan).toBe(50000);
    expect(result.phaseDurations.implement).toBeNull();
    expect(result.phaseDurations.validate).toBeNull();
    expect(result.phaseDurations.release).toBeNull();
  });
});
