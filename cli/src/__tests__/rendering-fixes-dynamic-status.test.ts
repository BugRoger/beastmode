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

describe("dynamic node status badges", () => {
  test("dynamic epic node uses session phase as status", () => {
    const sessions = [{ epicSlug: "unknown-epic", phase: "implement" }];
    const getEntries = () => [{ timestamp: 1000, type: "text" as const, text: "msg", seq: 0 }];
    const state = buildTreeState(sessions, getEntries);
    const epic = state.epics.find(e => e.slug === "unknown-epic")!;
    expect(epic.status).toBe("implement");
  });

  test("dynamic epic node uses design phase", () => {
    const sessions = [{ epicSlug: "new-epic", phase: "design" }];
    const getEntries = () => [{ timestamp: 1000, type: "text" as const, text: "msg", seq: 0 }];
    const state = buildTreeState(sessions, getEntries);
    const epic = state.epics.find(e => e.slug === "new-epic")!;
    expect(epic.status).toBe("design");
  });

  test("dynamic feature node uses in-progress status", () => {
    const sessions = [{ epicSlug: "epic-x", phase: "implement", featureSlug: "feat-y" }];
    const getEntries = () => [{ timestamp: 1000, type: "text" as const, text: "msg", seq: 0 }];
    const state = buildTreeState(sessions, getEntries);
    const epic = state.epics.find(e => e.slug === "epic-x")!;
    const feat = epic.features.find(f => f.slug === "feat-y")!;
    expect(feat.status).toBe("in-progress");
  });

  test("store-seeded epic retains canonical status even when session phase differs", () => {
    const epics = [mockEpic("my-epic", "validate")];
    const sessions = [{ epicSlug: "my-epic", phase: "implement" }];
    const getEntries = () => [{ timestamp: 1000, type: "text" as const, text: "msg", seq: 0 }];
    const state = buildTreeState(sessions, getEntries, undefined, undefined, epics);
    const epic = state.epics.find(e => e.slug === "my-epic")!;
    expect(epic.status).toBe("validate"); // store wins
  });

  test("store-seeded feature retains canonical status", () => {
    const epics = [mockEpic("my-epic", "implement", [mockFeature("my-feat", "completed", "my-epic")])];
    const sessions = [{ epicSlug: "my-epic", phase: "implement", featureSlug: "my-feat" }];
    const getEntries = () => [{ timestamp: 1000, type: "text" as const, text: "msg", seq: 0 }];
    const state = buildTreeState(sessions, getEntries, undefined, undefined, epics);
    const feat = state.epics[0].features.find(f => f.slug === "my-feat")!;
    expect(feat.status).toBe("completed"); // store wins
  });

  test("no unknown badges appear for active sessions", () => {
    const sessions = [
      { epicSlug: "a", phase: "design" },
      { epicSlug: "b", phase: "plan", featureSlug: "f1" },
      { epicSlug: "c", phase: "release" },
    ];
    const getEntries = () => [{ timestamp: 1000, type: "text" as const, text: "msg", seq: 0 }];
    const state = buildTreeState(sessions, getEntries);
    for (const epic of state.epics) {
      expect(epic.status).not.toBe("unknown");
      for (const feat of epic.features) {
        expect(feat.status).not.toBe("unknown");
      }
    }
  });
});
