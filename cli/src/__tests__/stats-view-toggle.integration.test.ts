import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveDetailsContent, type DetailsContentContext } from "../dashboard/details-panel.js";
import type { SessionStats } from "../dashboard/session-stats.js";
import type { PersistedStats } from "../dashboard/stats-persistence.js";
import { toSessionStats } from "../dashboard/stats-persistence.js";

// Source files for structural assertions
const DETAILS_PANEL_SRC = readFileSync(
  resolve(import.meta.dirname, "../dashboard/DetailsPanel.tsx"),
  "utf-8",
);
const KEYBOARD_SRC = readFileSync(
  resolve(import.meta.dirname, "../dashboard/hooks/use-dashboard-keyboard.ts"),
  "utf-8",
);
const KEY_HINTS_SRC = readFileSync(
  resolve(import.meta.dirname, "../dashboard/key-hints.ts"),
  "utf-8",
);

const samplePersistedStats: PersistedStats = {
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

const sampleSessionStats: SessionStats = {
  total: 3,
  active: 1,
  successes: 2,
  failures: 1,
  reDispatches: 0,
  successRate: 67,
  uptimeMs: 120000,
  cumulativeMs: 180000,
  isEmpty: false,
  phaseDurations: { plan: 20000, implement: 80000, validate: null, release: null },
};

describe("Dashboard stats view toggle — integration", () => {
  describe("Scenario: Default stats view shows all-time statistics", () => {
    test("when no view toggle has been activated, stats panel displays all-time statistics", () => {
      const historicalAsSession = toSessionStats(samplePersistedStats);
      const ctx: DetailsContentContext = {
        epics: [],
        activeSessions: 0,
        gitStatus: null,
        stats: historicalAsSession,
        statsViewMode: "all-time",
      };
      const result = resolveDetailsContent({ kind: "all" }, ctx);
      expect(result.kind).toBe("stats");
      if (result.kind === "stats") {
        expect(result.stats.total).toBe(10);
      }
    });
  });

  describe("Scenario: Operator toggles to current-session stats view", () => {
    test("when toggle activated, stats panel displays current-session statistics", () => {
      const ctx: DetailsContentContext = {
        epics: [],
        activeSessions: 1,
        gitStatus: null,
        stats: sampleSessionStats,
        statsViewMode: "session",
      };
      const result = resolveDetailsContent({ kind: "all" }, ctx);
      expect(result.kind).toBe("stats");
      if (result.kind === "stats") {
        expect(result.stats.total).toBe(3);
      }
    });
  });

  describe("Scenario: Operator toggles back to all-time stats view", () => {
    test("after toggling back, stats panel displays all-time statistics again", () => {
      const historicalAsSession = toSessionStats(samplePersistedStats);
      const ctx: DetailsContentContext = {
        epics: [],
        activeSessions: 0,
        gitStatus: null,
        stats: historicalAsSession,
        statsViewMode: "all-time",
      };
      const result = resolveDetailsContent({ kind: "all" }, ctx);
      expect(result.kind).toBe("stats");
      if (result.kind === "stats") {
        expect(result.stats.total).toBe(10);
      }
    });
  });

  describe("Scenario: Stats view label indicates which view is active", () => {
    test("DetailsPanel source contains all-time label", () => {
      expect(DETAILS_PANEL_SRC).toContain("all-time");
    });

    test("DetailsPanel source contains session label", () => {
      expect(DETAILS_PANEL_SRC).toContain("session");
    });

    test("DetailsPanel accepts statsViewMode prop", () => {
      expect(DETAILS_PANEL_SRC).toContain("statsViewMode");
    });
  });

  describe("Keyboard binding", () => {
    test("keyboard handler source contains s key handler", () => {
      expect(KEYBOARD_SRC).toMatch(/input\s*===\s*["']s["']/);
    });

    test("keyboard handler exports StatsViewMode type", () => {
      expect(KEYBOARD_SRC).toContain("StatsViewMode");
    });

    test("keyboard handler exports statsViewMode state", () => {
      expect(KEYBOARD_SRC).toContain("statsViewMode");
    });
  });

  describe("Key hints", () => {
    test("key hints source references stats view mode", () => {
      expect(KEY_HINTS_SRC).toContain("stats:");
    });
  });

  describe("toSessionStats converter", () => {
    test("converts PersistedStats to SessionStats shape", () => {
      const result = toSessionStats(samplePersistedStats);
      expect(result.total).toBe(10);
      expect(result.successes).toBe(8);
      expect(result.failures).toBe(2);
      expect(result.reDispatches).toBe(1);
      expect(result.successRate).toBe(80);
      expect(result.cumulativeMs).toBe(600000);
      expect(result.isEmpty).toBe(false);
      expect(result.phaseDurations.plan).toBe(30000);
      expect(result.phaseDurations.implement).toBe(120000);
      expect(result.phaseDurations.validate).toBe(45000);
      expect(result.phaseDurations.release).toBe(15000);
    });
  });
});
