import { describe, test, expect } from "vitest";
import type { EnrichedEpic } from "../store/types.js";
import type { Feature } from "../store/types.js";
import { buildTreeState } from "../dashboard/hooks/use-dashboard-tree-state.js";
import { countTreeLines } from "../dashboard/LogPanel.js";
import { formatTreeLine } from "../dashboard/tree-format.js";
import type { TreeState, CliNode, EpicNode, FeatureNode, TreeEntry } from "../dashboard/tree-types.js";

function mockFeature(overrides: Partial<Feature> & { slug: string; status: Feature["status"] }): Feature {
  return {
    id: overrides.slug,
    type: "feature",
    parent: "epic-1",
    name: overrides.slug,
    slug: overrides.slug,
    status: overrides.status,
    depends_on: [],
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

function mockEnrichedEpic(
  slug: string,
  status: string,
  features: Feature[] = [],
): EnrichedEpic {
  return {
    id: slug,
    type: "epic" as const,
    name: slug,
    slug,
    status: status as EnrichedEpic["status"],
    depends_on: [],
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    nextAction: null,
    features,
  };
}

describe("Tree Refactor Integration", () => {
  const enrichedEpics: EnrichedEpic[] = [
    mockEnrichedEpic("auth", "implement", [
      mockFeature({ slug: "login-flow", status: "in-progress", parent: "auth" }),
      mockFeature({ slug: "token-cache", status: "blocked", parent: "auth" }),
    ]),
    mockEnrichedEpic("pipeline", "design", [
      mockFeature({ slug: "watcher", status: "pending", parent: "pipeline" }),
    ]),
  ];

  test("TreeState has cli and epics (no system field)", () => {
    const state: TreeState = buildTreeState([], () => [], undefined, undefined, enrichedEpics);
    expect(state).toHaveProperty("cli");
    expect(state).toHaveProperty("epics");
    expect(state).not.toHaveProperty("system");
  });

  test("system-level entries appear under CLI root node", () => {
    const systemEntries = [
      { timestamp: 1000, level: "info" as const, message: "watch loop started", seq: 0 },
    ];
    const state = buildTreeState([], () => [], undefined, systemEntries, enrichedEpics);
    expect(state.cli.entries).toHaveLength(1);
    expect(state.cli.entries[0].message).toBe("watch loop started");
  });

  test("all epics from store appear in tree skeleton", () => {
    const state = buildTreeState([], () => [], undefined, undefined, enrichedEpics);
    const slugs = state.epics.map((e: EpicNode) => e.slug);
    expect(slugs).toContain("auth");
    expect(slugs).toContain("pipeline");
  });

  test("features appear as children of their parent epic", () => {
    const state = buildTreeState([], () => [], undefined, undefined, enrichedEpics);
    const auth = state.epics.find((e: EpicNode) => e.slug === "auth")!;
    const featureSlugs = auth.features.map((f: FeatureNode) => f.slug);
    expect(featureSlugs).toContain("login-flow");
    expect(featureSlugs).toContain("token-cache");
    const pipeline = state.epics.find((e: EpicNode) => e.slug === "pipeline")!;
    expect(pipeline.features.map((f: FeatureNode) => f.slug)).toContain("watcher");
  });

  test("blocked and upcoming features carry their status", () => {
    const state = buildTreeState([], () => [], undefined, undefined, enrichedEpics);
    const auth = state.epics.find((e: EpicNode) => e.slug === "auth")!;
    const tokenCache = auth.features.find((f: FeatureNode) => f.slug === "token-cache")!;
    expect(tokenCache.status).toBe("blocked");
    const pipeline = state.epics.find((e: EpicNode) => e.slug === "pipeline")!;
    const watcher = pipeline.features.find((f: FeatureNode) => f.slug === "watcher")!;
    expect(watcher.status).toBe("pending");
  });

  test("active features have in-progress status", () => {
    const state = buildTreeState([], () => [], undefined, undefined, enrichedEpics);
    const auth = state.epics.find((e: EpicNode) => e.slug === "auth")!;
    const loginFlow = auth.features.find((f: FeatureNode) => f.slug === "login-flow")!;
    expect(loginFlow.status).toBe("in-progress");
  });

  test("tree entries gain a phase field", () => {
    const sessions = [{ epicSlug: "auth", phase: "implement", featureSlug: "login-flow" }];
    const getEntries = () => [
      { timestamp: 1000, type: "text" as const, text: "doing stuff", seq: 0 },
    ];
    const state = buildTreeState(sessions, getEntries, undefined, undefined, enrichedEpics);
    const auth = state.epics.find((e: EpicNode) => e.slug === "auth")!;
    const loginFlow = auth.features.find((f: FeatureNode) => f.slug === "login-flow")!;
    expect(loginFlow.entries[0]).toHaveProperty("phase");
    expect(loginFlow.entries[0].phase).toBe("implement");
  });

  test("tree hierarchy is exactly three levels: CLI > Epic > Feature", () => {
    const state = buildTreeState([], () => [], undefined, undefined, enrichedEpics);
    // Level 1: cli node exists
    expect(state.cli).toBeDefined();
    // Level 2: epics are direct children
    expect(state.epics.length).toBeGreaterThan(0);
    // Level 3: features are children of epics (no phases in between)
    for (const epic of state.epics) {
      expect(epic).toHaveProperty("features");
      expect(epic).not.toHaveProperty("phases");
    }
  });

  test("countTreeLines works with new flat structure", () => {
    const state = buildTreeState([], () => [], undefined, undefined, enrichedEpics);
    const lines = countTreeLines(state);
    // 1 cli + 2 epics + 3 features = 6 (no phases)
    expect(lines).toBe(6);
  });

  test("tree-format produces phase badge on leaf entries", () => {
    const line = formatTreeLine("leaf-feature", "info", "implement", "test message", 1000);
    expect(line).toContain("implement");
    expect(line).toContain("test message");
  });
});
