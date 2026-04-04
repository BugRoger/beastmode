import { describe, test, expect } from "bun:test";
import type { EnrichedManifest } from "../manifest/store.js";
import {
  computePhaseDistribution,
  formatGitStatus,
  formatActiveSessions,
} from "../dashboard/overview-panel.js";

function mockEpic(overrides: Partial<EnrichedManifest> = {}): EnrichedManifest {
  return {
    slug: "test-epic",
    phase: "design",
    features: [],
    artifacts: {},
    lastUpdated: "2026-04-04",
    manifestPath: "/tmp/test.manifest.json",
    nextAction: null,
    ...overrides,
  } as EnrichedManifest;
}

describe("computePhaseDistribution", () => {
  test("counts epics per phase", () => {
    const epics = [
      mockEpic({ slug: "a", phase: "design" }),
      mockEpic({ slug: "b", phase: "design" }),
      mockEpic({ slug: "c", phase: "implement" }),
    ];
    const result = computePhaseDistribution(epics);
    expect(result).toEqual([
      { phase: "design", count: 2 },
      { phase: "implement", count: 1 },
    ]);
  });

  test("returns empty array for no epics", () => {
    expect(computePhaseDistribution([])).toEqual([]);
  });

  test("preserves canonical phase order", () => {
    const epics = [
      mockEpic({ slug: "a", phase: "release" }),
      mockEpic({ slug: "b", phase: "design" }),
      mockEpic({ slug: "c", phase: "validate" }),
    ];
    const result = computePhaseDistribution(epics);
    const phases = result.map((r) => r.phase);
    expect(phases).toEqual(["design", "validate", "release"]);
  });

  test("omits phases with zero count", () => {
    const epics = [mockEpic({ slug: "a", phase: "plan" })];
    const result = computePhaseDistribution(epics);
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({ phase: "plan", count: 1 });
  });

  test("handles all seven phases", () => {
    const phases = ["design", "plan", "implement", "validate", "release", "done", "cancelled"] as const;
    const epics = phases.map((p, i) => mockEpic({ slug: `e${i}`, phase: p }));
    const result = computePhaseDistribution(epics);
    expect(result.length).toBe(7);
    for (const entry of result) {
      expect(entry.count).toBe(1);
    }
  });
});

describe("formatGitStatus", () => {
  test("formats clean status", () => {
    expect(formatGitStatus({ branch: "main", dirty: false })).toBe("main (clean)");
  });

  test("formats dirty status", () => {
    expect(formatGitStatus({ branch: "feature/foo", dirty: true })).toBe("feature/foo (dirty)");
  });
});

describe("formatActiveSessions", () => {
  test("formats zero sessions", () => {
    expect(formatActiveSessions(0)).toBe("0 active sessions / 0 worktrees");
  });

  test("formats one session (singular)", () => {
    expect(formatActiveSessions(1)).toBe("1 active session / 1 worktree");
  });

  test("formats multiple sessions (plural)", () => {
    expect(formatActiveSessions(3)).toBe("3 active sessions / 3 worktrees");
  });
});
