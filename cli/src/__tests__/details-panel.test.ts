import { describe, test, expect } from "vitest";
import {
  type DetailsPanelSelection,
  resolveDetailsContent,
  type DetailsContentResult,
} from "../dashboard/details-panel.js";
import type { EnrichedEpic } from "../store/types.js";

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
});
