import { describe, it, expect } from "bun:test";
import { toSnapshots, detectChanges } from "../src/change-detect";
import type { EnrichedManifest } from "../src/state-scanner";

function makeEpic(overrides: Partial<EnrichedManifest> & { slug: string }): EnrichedManifest {
  return {
    slug: overrides.slug,
    phase: overrides.phase ?? "design",
    features: overrides.features ?? [],
    artifacts: {},
    lastUpdated: "2026-03-30T00:00:00Z",
    blocked: overrides.blocked ?? null,
    manifestPath: `pipeline/${overrides.slug}.manifest.json`,
    nextAction: null,
    ...overrides,
  };
}

describe("toSnapshots", () => {
  it("extracts comparable snapshot from enriched manifests", () => {
    const epics = [
      makeEpic({
        slug: "epic-a",
        phase: "implement",
        features: [
          { slug: "f1", plan: "f1.md", status: "completed" },
          { slug: "f2", plan: "f2.md", status: "pending" },
        ],
      }),
    ];

    const snapshots = toSnapshots(epics);
    const snap = snapshots.get("epic-a");

    expect(snap).toBeDefined();
    expect(snap!.phase).toBe("implement");
    expect(snap!.completedFeatures).toBe(1);
    expect(snap!.totalFeatures).toBe(2);
    expect(snap!.blocked).toBe(false);
  });
});

describe("detectChanges", () => {
  it("detects phase change", () => {
    const prev = toSnapshots([makeEpic({ slug: "a", phase: "design" })]);
    const curr = toSnapshots([makeEpic({ slug: "a", phase: "plan" })]);
    expect(detectChanges(prev, curr)).toEqual(new Set(["a"]));
  });

  it("detects feature completion change", () => {
    const prev = toSnapshots([
      makeEpic({
        slug: "a",
        features: [{ slug: "f1", plan: "", status: "pending" }],
      }),
    ]);
    const curr = toSnapshots([
      makeEpic({
        slug: "a",
        features: [{ slug: "f1", plan: "", status: "completed" }],
      }),
    ]);
    expect(detectChanges(prev, curr)).toEqual(new Set(["a"]));
  });

  it("detects blocked status change", () => {
    const prev = toSnapshots([makeEpic({ slug: "a" })]);
    const curr = toSnapshots([
      makeEpic({ slug: "a", blocked: { gate: "test", reason: "blocked" } }),
    ]);
    expect(detectChanges(prev, curr)).toEqual(new Set(["a"]));
  });

  it("detects new epic", () => {
    const prev = toSnapshots([]);
    const curr = toSnapshots([makeEpic({ slug: "new-one" })]);
    expect(detectChanges(prev, curr)).toEqual(new Set(["new-one"]));
  });

  it("detects disappeared epic", () => {
    const prev = toSnapshots([makeEpic({ slug: "gone" })]);
    const curr = toSnapshots([]);
    expect(detectChanges(prev, curr)).toEqual(new Set(["gone"]));
  });

  it("returns empty set when nothing changed", () => {
    const epics = [
      makeEpic({
        slug: "a",
        phase: "implement",
        features: [{ slug: "f1", plan: "", status: "pending" }],
      }),
    ];
    const prev = toSnapshots(epics);
    const curr = toSnapshots(epics);
    expect(detectChanges(prev, curr).size).toBe(0);
  });

  it("detects total features change (new feature added)", () => {
    const prev = toSnapshots([
      makeEpic({
        slug: "a",
        features: [{ slug: "f1", plan: "", status: "pending" }],
      }),
    ]);
    const curr = toSnapshots([
      makeEpic({
        slug: "a",
        features: [
          { slug: "f1", plan: "", status: "pending" },
          { slug: "f2", plan: "", status: "pending" },
        ],
      }),
    ]);
    expect(detectChanges(prev, curr)).toEqual(new Set(["a"]));
  });

  it("only flags changed epics in a multi-epic set", () => {
    const prev = toSnapshots([
      makeEpic({ slug: "a", phase: "design" }),
      makeEpic({ slug: "b", phase: "plan" }),
    ]);
    const curr = toSnapshots([
      makeEpic({ slug: "a", phase: "plan" }),  // changed
      makeEpic({ slug: "b", phase: "plan" }),  // same
    ]);
    expect(detectChanges(prev, curr)).toEqual(new Set(["a"]));
  });
});
