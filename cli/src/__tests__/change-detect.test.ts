import { describe, test, expect } from "bun:test";
import { toSnapshots, detectEpicChanges } from "../commands/status";
import type { EpicSnapshot } from "../commands/status";
import type { EnrichedManifest } from "../manifest/store";

function makeEpic(overrides: Partial<EnrichedManifest> = {}): EnrichedManifest {
  return {
    slug: "test-epic",
    manifestPath: "/tmp/test.manifest.json",
    phase: "design",
    nextAction: null,
    features: [],
    artifacts: {},
    lastUpdated: "2026-03-29T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// toSnapshots
// ---------------------------------------------------------------------------

describe("toSnapshots", () => {
  test("creates snapshot map from enriched manifests", () => {
    const epics = [
      makeEpic({ slug: "alpha", phase: "implement", features: [
        { slug: "f1", plan: "p.md", status: "completed" },
        { slug: "f2", plan: "p.md", status: "pending" },
      ] }),
    ];
    const map = toSnapshots(epics);
    expect(map.size).toBe(1);
    const snap = map.get("alpha")!;
    expect(snap.slug).toBe("alpha");
    expect(snap.phase).toBe("implement");
    expect(snap.completedFeatures).toBe(1);
    expect(snap.totalFeatures).toBe(2);
  });

  test("handles empty array", () => {
    const map = toSnapshots([]);
    expect(map.size).toBe(0);
  });

  test("handles epic with no features", () => {
    const epics = [makeEpic({ slug: "bare", features: [] })];
    const map = toSnapshots(epics);
    const snap = map.get("bare")!;
    expect(snap.completedFeatures).toBe(0);
    expect(snap.totalFeatures).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// detectEpicChanges
// ---------------------------------------------------------------------------

describe("detectEpicChanges", () => {
  function snap(slug: string, overrides: Partial<EpicSnapshot> = {}): EpicSnapshot {
    return {
      slug,
      phase: "design",
      completedFeatures: 0,
      totalFeatures: 0,
      ...overrides,
    };
  }

  function toMap(...snaps: EpicSnapshot[]): Map<string, EpicSnapshot> {
    return new Map(snaps.map(s => [s.slug, s]));
  }

  test("returns empty set when nothing changed", () => {
    const prev = toMap(snap("a"), snap("b"));
    const curr = toMap(snap("a"), snap("b"));
    expect(detectEpicChanges(prev, curr).size).toBe(0);
  });

  test("detects new epic appearing", () => {
    const prev = toMap(snap("a"));
    const curr = toMap(snap("a"), snap("b"));
    const changed = detectEpicChanges(prev, curr);
    expect(changed.has("b")).toBe(true);
    expect(changed.has("a")).toBe(false);
  });

  test("detects epic disappearing", () => {
    const prev = toMap(snap("a"), snap("b"));
    const curr = toMap(snap("a"));
    const changed = detectEpicChanges(prev, curr);
    expect(changed.has("b")).toBe(true);
    expect(changed.has("a")).toBe(false);
  });

  test("detects phase change", () => {
    const prev = toMap(snap("a", { phase: "design" }));
    const curr = toMap(snap("a", { phase: "plan" }));
    const changed = detectEpicChanges(prev, curr);
    expect(changed.has("a")).toBe(true);
  });

  test("detects completed features change", () => {
    const prev = toMap(snap("a", { completedFeatures: 1, totalFeatures: 3 }));
    const curr = toMap(snap("a", { completedFeatures: 2, totalFeatures: 3 }));
    const changed = detectEpicChanges(prev, curr);
    expect(changed.has("a")).toBe(true);
  });

  test("detects total features change", () => {
    const prev = toMap(snap("a", { totalFeatures: 2 }));
    const curr = toMap(snap("a", { totalFeatures: 3 }));
    const changed = detectEpicChanges(prev, curr);
    expect(changed.has("a")).toBe(true);
  });

  test("returns all changed slugs across multiple epics", () => {
    const prev = toMap(
      snap("a", { phase: "design" }),
      snap("b"),
      snap("c"),
    );
    const curr = toMap(
      snap("a", { phase: "plan" }),  // changed
      snap("b"),                       // same
      snap("d"),                       // new
    );
    const changed = detectEpicChanges(prev, curr);
    expect(changed.has("a")).toBe(true);  // phase changed
    expect(changed.has("b")).toBe(false); // same
    expect(changed.has("c")).toBe(true);  // disappeared
    expect(changed.has("d")).toBe(true);  // new
  });

  test("both maps empty returns empty set", () => {
    const changed = detectEpicChanges(new Map(), new Map());
    expect(changed.size).toBe(0);
  });
});
