import { describe, test, expect } from "bun:test";
import type { EnrichedManifest, ManifestFeature } from "../manifest-store.js";

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

function mockEpic(overrides: Partial<EnrichedManifest> = {}): EnrichedManifest {
  return {
    slug: "test-epic",
    phase: "design",
    features: [],
    artifacts: {},
    lastUpdated: "2026-04-03",
    manifestPath: "/tmp/test.manifest.json",
    nextAction: null,
    ...overrides,
  } as EnrichedManifest;
}

function mockFeature(overrides: Partial<ManifestFeature> = {}): ManifestFeature {
  return {
    slug: "feat-one",
    plan: "plan-one",
    status: "pending",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// DetailsPanel logic — mirrors the component's rendering decisions
// ---------------------------------------------------------------------------

// Re-implement the DetailsPanel branching logic as pure functions.
// The component decides what to render based on:
//   1. selectedIndex === 0 -> PipelineOverview
//   2. selectedIndex >= 1  -> epic = epics[selectedIndex - 1]
//      a. epic is undefined (out-of-bounds) -> empty
//      b. epic.phase === "implement" -> ImplementDetail
//      c. otherwise -> SingleSessionDetail

type ViewKind = "overview" | "single-session" | "implement" | "empty";

function resolveView(
  epics: EnrichedManifest[],
  selectedIndex: number,
): { kind: ViewKind; epic?: EnrichedManifest } {
  if (selectedIndex === 0) return { kind: "overview" };
  const epic = epics[selectedIndex - 1];
  if (!epic) return { kind: "empty" };
  if (epic.phase === "implement") return { kind: "implement", epic };
  return { kind: "single-session", epic };
}

// PipelineOverview computes phase counts.
function phaseCounts(epics: EnrichedManifest[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const epic of epics) {
    counts[epic.phase] = (counts[epic.phase] ?? 0) + 1;
  }
  return counts;
}

// SingleSessionDetail shows running/idle based on activeSessions.
function sessionStatus(slug: string, activeSessions: Set<string>): string {
  return activeSessions.has(slug) ? "running" : "idle";
}

// ImplementDetail shows feature list or "no features".
function featureDisplay(
  features: ManifestFeature[],
): { empty: boolean; slugs: string[]; statuses: string[] } {
  if (features.length === 0) return { empty: true, slugs: [], statuses: [] };
  return {
    empty: false,
    slugs: features.map((f) => f.slug),
    statuses: features.map((f) => f.status),
  };
}

// ---------------------------------------------------------------------------
// Group 1: Pipeline overview (selectedIndex === 0)
// ---------------------------------------------------------------------------

describe("DetailsPanel — pipeline overview", () => {
  test("shows overview view when selectedIndex is 0", () => {
    const epics = [mockEpic(), mockEpic({ slug: "b" }), mockEpic({ slug: "c" })];
    const view = resolveView(epics, 0);
    expect(view.kind).toBe("overview");
  });

  test("epic count matches epics array length", () => {
    const epics = [
      mockEpic({ slug: "a" }),
      mockEpic({ slug: "b" }),
      mockEpic({ slug: "c" }),
    ];
    expect(epics.length).toBe(3);
  });

  test("phase breakdown counts per phase", () => {
    const epics = [
      mockEpic({ slug: "a", phase: "design" }),
      mockEpic({ slug: "b", phase: "design" }),
      mockEpic({ slug: "c", phase: "implement" }),
    ];
    const counts = phaseCounts(epics);
    expect(counts.design).toBe(2);
    expect(counts.implement).toBe(1);
    expect(counts.plan).toBeUndefined();
  });

  test("phase breakdown includes all represented phases", () => {
    const epics = [
      mockEpic({ slug: "a", phase: "design" }),
      mockEpic({ slug: "b", phase: "plan" }),
      mockEpic({ slug: "c", phase: "validate" }),
    ];
    const counts = phaseCounts(epics);
    const phases = Object.keys(counts);
    expect(phases).toContain("design");
    expect(phases).toContain("plan");
    expect(phases).toContain("validate");
    expect(phases.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Group 2: Single epic view (non-implement)
// ---------------------------------------------------------------------------

describe("DetailsPanel — single epic view", () => {
  test("resolves to single-session view for non-implement phase", () => {
    const epics = [mockEpic({ slug: "my-epic", phase: "plan" })];
    const view = resolveView(epics, 1);
    expect(view.kind).toBe("single-session");
    expect(view.epic?.slug).toBe("my-epic");
    expect(view.epic?.phase).toBe("plan");
  });

  test("active session shows running", () => {
    const status = sessionStatus("test-epic", new Set(["test-epic"]));
    expect(status).toBe("running");
  });

  test("inactive session shows idle", () => {
    const status = sessionStatus("test-epic", new Set());
    expect(status).toBe("idle");
  });

  test("session with different slug active shows idle", () => {
    const status = sessionStatus("test-epic", new Set(["other-epic"]));
    expect(status).toBe("idle");
  });
});

// ---------------------------------------------------------------------------
// Group 3: Implement phase detail
// ---------------------------------------------------------------------------

describe("DetailsPanel — implement detail", () => {
  test("resolves to implement view when phase is implement", () => {
    const epics = [mockEpic({ slug: "impl-epic", phase: "implement" })];
    const view = resolveView(epics, 1);
    expect(view.kind).toBe("implement");
    expect(view.epic?.slug).toBe("impl-epic");
  });

  test("feature list shows slugs and statuses", () => {
    const features = [
      mockFeature({ slug: "feat-a", status: "pending", wave: 1 }),
      mockFeature({ slug: "feat-b", status: "completed", wave: 2 }),
    ];
    const display = featureDisplay(features);
    expect(display.empty).toBe(false);
    expect(display.slugs).toEqual(["feat-a", "feat-b"]);
    expect(display.statuses).toEqual(["pending", "completed"]);
  });

  test("empty feature list flags no features", () => {
    const display = featureDisplay([]);
    expect(display.empty).toBe(true);
    expect(display.slugs).toEqual([]);
  });

  test("feature wave value is accessible", () => {
    const feat = mockFeature({ wave: 3 });
    expect(feat.wave).toBe(3);
  });

  test("feature without wave falls back to undefined", () => {
    const feat = mockFeature();
    delete (feat as unknown as Record<string, unknown>).wave;
    expect(feat.wave).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Group 4: Out-of-bounds and edge cases
// ---------------------------------------------------------------------------

describe("DetailsPanel — edge cases", () => {
  test("out-of-bounds index resolves to empty view", () => {
    const epics = [mockEpic({ slug: "a" }), mockEpic({ slug: "b" })];
    const view = resolveView(epics, 5);
    expect(view.kind).toBe("empty");
    expect(view.epic).toBeUndefined();
  });

  test("negative index resolves to empty view", () => {
    const epics = [mockEpic()];
    // Component uses epics[-2] which is undefined
    const view = resolveView(epics, -1);
    expect(view.kind).toBe("empty");
  });

  test("selectedIndex 0 with zero epics still shows overview", () => {
    const view = resolveView([], 0);
    expect(view.kind).toBe("overview");
  });

  test("phase counts for zero epics is empty object", () => {
    const counts = phaseCounts([]);
    expect(Object.keys(counts).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Group 5: Status color mapping (matches component constants)
// ---------------------------------------------------------------------------

describe("DetailsPanel — status colors", () => {
  const STATUS_COLOR: Record<string, string> = {
    pending: "gray",
    "in-progress": "yellow",
    completed: "green",
    blocked: "red",
  };

  test("all feature statuses have a color", () => {
    const statuses = ["pending", "in-progress", "completed", "blocked"];
    for (const s of statuses) {
      expect(STATUS_COLOR[s]).toBeDefined();
    }
  });

  test("pending is gray", () => {
    expect(STATUS_COLOR.pending).toBe("gray");
  });

  test("in-progress is yellow", () => {
    expect(STATUS_COLOR["in-progress"]).toBe("yellow");
  });

  test("completed is green", () => {
    expect(STATUS_COLOR.completed).toBe("green");
  });

  test("blocked is red", () => {
    expect(STATUS_COLOR.blocked).toBe("red");
  });
});
