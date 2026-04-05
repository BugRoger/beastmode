import { describe, test, expect } from "vitest";
import type { EnrichedEpic, Feature } from "../store/types.js";

// Helper to build test epics
function makeEpic(slug: string, status: string, features: Partial<Feature>[]): EnrichedEpic {
  return {
    id: slug,
    type: "epic",
    name: slug,
    slug,
    status: status as EnrichedEpic["status"],
    depends_on: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    nextAction: null,
    features: features.map((f, i) => ({
      id: `${slug}-f${i}`,
      type: "feature" as const,
      parent: slug,
      name: f.slug ?? `feature-${i}`,
      slug: f.slug ?? `feature-${i}`,
      status: f.status ?? "pending",
      depends_on: [],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    })),
  };
}

describe("@dashboard-extensions: Epics panel expands into a tree showing child features", () => {
  // Scenario: Selecting an epic expands to show its features
  test("selecting an epic expands to show its features as indented rows", async () => {
    const { buildFlatRows } = await import("../dashboard/epics-tree-model.js");

    const epics = [
      makeEpic("auth", "implement", [{ slug: "login-flow" }, { slug: "token-cache" }]),
      makeEpic("pipeline", "plan", [{ slug: "watcher" }, { slug: "scheduler" }]),
    ];

    const rows = buildFlatRows(epics, "auth");

    // "(all)" at index 0, "auth" at index 1, then its features
    expect(rows[0].type).toBe("all");
    expect(rows[1].type).toBe("epic");
    expect(rows[1].slug).toBe("auth");
    expect(rows[2].type).toBe("feature");
    expect(rows[2].slug).toBe("login-flow");
    expect(rows[3].type).toBe("feature");
    expect(rows[3].slug).toBe("token-cache");
    // "pipeline" follows after auth's features
    expect(rows[4].type).toBe("epic");
    expect(rows[4].slug).toBe("pipeline");
    // features under pipeline are NOT shown (not expanded)
    expect(rows.length).toBe(5);
  });

  // Scenario: Selecting a different epic collapses the previous one
  test("selecting a different epic collapses the previous one", async () => {
    const { buildFlatRows } = await import("../dashboard/epics-tree-model.js");

    const epics = [
      makeEpic("auth", "implement", [{ slug: "login-flow" }, { slug: "token-cache" }]),
      makeEpic("pipeline", "plan", [{ slug: "watcher" }, { slug: "scheduler" }]),
    ];

    const rowsWithPipeline = buildFlatRows(epics, "pipeline");

    // auth should NOT have features visible
    expect(rowsWithPipeline[1].type).toBe("epic");
    expect(rowsWithPipeline[1].slug).toBe("auth");
    expect(rowsWithPipeline[2].type).toBe("epic");
    expect(rowsWithPipeline[2].slug).toBe("pipeline");
    // pipeline's features visible
    expect(rowsWithPipeline[3].type).toBe("feature");
    expect(rowsWithPipeline[3].slug).toBe("watcher");
    expect(rowsWithPipeline[4].type).toBe("feature");
    expect(rowsWithPipeline[4].slug).toBe("scheduler");
    expect(rowsWithPipeline.length).toBe(5);
  });

  // Scenario: Selecting the same epic again collapses it
  test("selecting the same epic again collapses it (no expanded slug)", async () => {
    const { buildFlatRows } = await import("../dashboard/epics-tree-model.js");

    const epics = [
      makeEpic("auth", "implement", [{ slug: "login-flow" }, { slug: "token-cache" }]),
      makeEpic("pipeline", "plan", [{ slug: "watcher" }, { slug: "scheduler" }]),
    ];

    // No epic expanded (toggle off)
    const rows = buildFlatRows(epics, undefined);

    // Just (all) + 2 epics, no feature rows
    expect(rows.length).toBe(3);
    expect(rows[0].type).toBe("all");
    expect(rows[1].type).toBe("epic");
    expect(rows[2].type).toBe("epic");
  });

  // Scenario: Features under an expanded epic are selectable
  test("features under an expanded epic are selectable via row model", async () => {
    const { buildFlatRows, rowSlugAtIndex } = await import("../dashboard/epics-tree-model.js");

    const epics = [
      makeEpic("auth", "implement", [{ slug: "login-flow" }, { slug: "token-cache" }]),
    ];

    const rows = buildFlatRows(epics, "auth");

    // Index 0 = (all), Index 1 = auth, Index 2 = login-flow, Index 3 = token-cache
    const featureSelection = rowSlugAtIndex(rows, 2);
    expect(featureSelection).toEqual({ epicSlug: "auth", featureSlug: "login-flow" });

    const epicSelection = rowSlugAtIndex(rows, 1);
    expect(epicSelection).toBe("auth");

    const allSelection = rowSlugAtIndex(rows, 0);
    expect(allSelection).toBeUndefined();
  });
});
