import { describe, test, expect } from "vitest";
import { buildTreeState } from "../dashboard/hooks/use-dashboard-tree-state.js";
import type { EnrichedEpic, Feature } from "../store/types.js";

function mockFeature(slug: string, status: Feature["status"], parent = "epic-1"): Feature {
  return {
    id: slug, type: "feature", parent, name: slug, slug, status,
    depends_on: [], created_at: "2026-01-01", updated_at: "2026-01-01",
  };
}

function mockEpic(slug: string, status: string, features: Feature[] = []): EnrichedEpic {
  return {
    id: slug, type: "epic" as const, name: slug, slug,
    status: status as EnrichedEpic["status"],
    depends_on: [], created_at: "2026-01-01", updated_at: "2026-01-01",
    nextAction: null, features,
  };
}

describe("buildTreeState with EnrichedEpic skeleton", () => {
  test("empty enriched epics produces empty tree with cli node", () => {
    const state = buildTreeState([], () => [], undefined, undefined, []);
    expect(state.cli.entries).toEqual([]);
    expect(state.epics).toEqual([]);
  });

  test("enriched epics seed skeleton nodes", () => {
    const epics = [
      mockEpic("auth", "implement", [
        mockFeature("login-flow", "in-progress", "auth"),
      ]),
    ];
    const state = buildTreeState([], () => [], undefined, undefined, epics);
    expect(state.epics).toHaveLength(1);
    expect(state.epics[0].slug).toBe("auth");
    expect(state.epics[0].status).toBe("implement");
    expect(state.epics[0].features).toHaveLength(1);
    expect(state.epics[0].features[0].slug).toBe("login-flow");
    expect(state.epics[0].features[0].status).toBe("in-progress");
  });

  test("system entries go to cli node", () => {
    const system = [
      { timestamp: 1000, level: "info" as const, message: "started", seq: 0 },
    ];
    const state = buildTreeState([], () => [], undefined, system, []);
    expect(state.cli.entries).toHaveLength(1);
    expect(state.cli.entries[0].message).toBe("started");
  });

  test("session entries attach to existing skeleton nodes", () => {
    const epics = [
      mockEpic("auth", "implement", [
        mockFeature("login-flow", "in-progress", "auth"),
      ]),
    ];
    const sessions = [{ epicSlug: "auth", phase: "implement", featureSlug: "login-flow" }];
    const getEntries = () => [
      { timestamp: 1000, type: "text" as const, text: "working", seq: 0 },
    ];
    const state = buildTreeState(sessions, getEntries, undefined, undefined, epics);
    const auth = state.epics.find(e => e.slug === "auth")!;
    const loginFlow = auth.features.find(f => f.slug === "login-flow")!;
    expect(loginFlow.entries).toHaveLength(1);
    expect(loginFlow.entries[0].message).toBe("working");
    expect(loginFlow.entries[0].phase).toBe("implement");
  });

  test("session entries for unknown feature create ad-hoc node", () => {
    const epics = [mockEpic("auth", "implement", [])];
    const sessions = [{ epicSlug: "auth", phase: "implement", featureSlug: "unknown-feat" }];
    const getEntries = () => [
      { timestamp: 1000, type: "text" as const, text: "msg", seq: 0 },
    ];
    const state = buildTreeState(sessions, getEntries, undefined, undefined, epics);
    const auth = state.epics.find(e => e.slug === "auth")!;
    expect(auth.features.find(f => f.slug === "unknown-feat")).toBeDefined();
  });

  test("session entries without feature attach to epic entries", () => {
    const epics = [mockEpic("auth", "plan")];
    const sessions = [{ epicSlug: "auth", phase: "plan" }];
    const getEntries = () => [
      { timestamp: 1000, type: "text" as const, text: "planning", seq: 0 },
    ];
    const state = buildTreeState(sessions, getEntries, undefined, undefined, epics);
    const auth = state.epics.find(e => e.slug === "auth")!;
    expect(auth.entries).toHaveLength(1);
    expect(auth.entries[0].phase).toBe("plan");
  });

  test("enriched epics without sessions still appear in skeleton", () => {
    const epics = [
      mockEpic("auth", "implement", [mockFeature("login", "blocked", "auth")]),
      mockEpic("pipeline", "design"),
    ];
    const state = buildTreeState([], () => [], undefined, undefined, epics);
    expect(state.epics).toHaveLength(2);
    expect(state.epics[0].features[0].entries).toEqual([]);
  });
});
