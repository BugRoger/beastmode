import { describe, test, expect } from "vitest";
import {
  type DetailsPanelSelection,
  resolveDetailsContent,
} from "../dashboard/details-panel.js";
import type { EnrichedEpic } from "../store/types.js";
import type { SessionStats } from "../dashboard/session-stats.js";

function mockEpic(overrides: Partial<EnrichedEpic> = {}): EnrichedEpic {
  return {
    id: "test-id",
    type: "epic",
    slug: "test-epic",
    name: "Test Epic",
    status: "design",
    features: [],
    nextAction: null,
    depends_on: [],
    created_at: "2026-04-04T00:00:00Z",
    updated_at: "2026-04-04T00:00:00Z",
    ...overrides,
  } as EnrichedEpic;
}

describe("DetailsPanelSelection types", () => {
  test("all selection has kind all", () => {
    const sel: DetailsPanelSelection = { kind: "all" };
    expect(sel.kind).toBe("all");
  });

  test("epic selection has kind epic and slug", () => {
    const sel: DetailsPanelSelection = { kind: "epic", slug: "auth" };
    expect(sel.kind).toBe("epic");
    expect(sel.slug).toBe("auth");
  });

  test("feature selection has kind feature with both slugs", () => {
    const sel: DetailsPanelSelection = {
      kind: "feature",
      epicSlug: "auth",
      featureSlug: "login",
    };
    expect(sel.kind).toBe("feature");
    expect(sel.epicSlug).toBe("auth");
    expect(sel.featureSlug).toBe("login");
  });
});

describe("resolveDetailsContent", () => {
  test("returns overview content for all selection", () => {
    const epics = [
      mockEpic({ slug: "a", status: "design" }),
      mockEpic({ slug: "b", status: "implement" }),
    ];
    const result = resolveDetailsContent(
      { kind: "all" },
      {
        epics,
        activeSessions: 3,
        gitStatus: { branch: "main", dirty: true },
      },
    );
    expect(result.kind).toBe("overview");
    if (result.kind === "overview") {
      expect(result.distribution).toEqual([
        { phase: "design", count: 1 },
        { phase: "implement", count: 1 },
      ]);
      expect(result.sessions).toBe("3 active sessions / 3 worktrees");
      expect(result.git).toBe("main (dirty)");
    }
  });

  test("returns overview with null git status", () => {
    const result = resolveDetailsContent(
      { kind: "all" },
      { epics: [], activeSessions: 0, gitStatus: null },
    );
    expect(result.kind).toBe("overview");
    if (result.kind === "overview") {
      expect(result.git).toBeNull();
    }
  });

  test("returns not-found for epic with no artifact", () => {
    const result = resolveDetailsContent(
      { kind: "epic", slug: "nonexistent" },
      { projectRoot: "/tmp/no-such-project-root-abc123" },
    );
    expect(result.kind).toBe("not-found");
    if (result.kind === "not-found") {
      expect(result.message).toContain("no PRD found");
    }
  });

  test("returns not-found for feature with no artifact", () => {
    const result = resolveDetailsContent(
      { kind: "feature", epicSlug: "auth", featureSlug: "login" },
      { projectRoot: "/tmp/no-such-project-root-abc123" },
    );
    expect(result.kind).toBe("not-found");
    if (result.kind === "not-found") {
      expect(result.message).toContain("no plan found");
    }
  });

  test("returns not-found when projectRoot is undefined for epic", () => {
    const result = resolveDetailsContent(
      { kind: "epic", slug: "auth" },
      {},
    );
    expect(result.kind).toBe("not-found");
  });

  test("returns not-found when projectRoot is undefined for feature", () => {
    const result = resolveDetailsContent(
      { kind: "feature", epicSlug: "auth", featureSlug: "login" },
      {},
    );
    expect(result.kind).toBe("not-found");
  });

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

  test("returns stats content when selection is all and stats is empty", () => {
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
});

describe("resolveDetailsContent with statsViewMode", () => {
  test("returns stats with statsViewMode all-time", () => {
    const stats: SessionStats = {
      total: 5, active: 0, successes: 5, failures: 0, reDispatches: 0,
      successRate: 100, uptimeMs: 0, cumulativeMs: 200000,
      isEmpty: false,
      phaseDurations: { plan: 30000, implement: 80000, validate: 40000, release: 10000 },
    };
    const result = resolveDetailsContent(
      { kind: "all" },
      { epics: [], activeSessions: 0, gitStatus: null, stats, statsViewMode: "all-time" },
    );
    expect(result.kind).toBe("stats");
    if (result.kind === "stats") {
      expect(result.stats.total).toBe(5);
      expect(result.statsViewMode).toBe("all-time");
    }
  });

  test("returns stats with statsViewMode session", () => {
    const stats: SessionStats = {
      total: 2, active: 1, successes: 1, failures: 1, reDispatches: 0,
      successRate: 50, uptimeMs: 60000, cumulativeMs: 90000,
      isEmpty: false,
      phaseDurations: { plan: 20000, implement: null, validate: null, release: null },
    };
    const result = resolveDetailsContent(
      { kind: "all" },
      { epics: [], activeSessions: 1, gitStatus: null, stats, statsViewMode: "session" },
    );
    expect(result.kind).toBe("stats");
    if (result.kind === "stats") {
      expect(result.stats.total).toBe(2);
      expect(result.statsViewMode).toBe("session");
    }
  });

  test("defaults statsViewMode to all-time when not provided", () => {
    const stats: SessionStats = {
      total: 1, active: 0, successes: 1, failures: 0, reDispatches: 0,
      successRate: 100, uptimeMs: 0, cumulativeMs: 50000,
      isEmpty: false,
      phaseDurations: { plan: null, implement: null, validate: null, release: null },
    };
    const result = resolveDetailsContent(
      { kind: "all" },
      { epics: [], activeSessions: 0, gitStatus: null, stats },
    );
    expect(result.kind).toBe("stats");
    if (result.kind === "stats") {
      expect(result.statsViewMode).toBe("all-time");
    }
  });
});
