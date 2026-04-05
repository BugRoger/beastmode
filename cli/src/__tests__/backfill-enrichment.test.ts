import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BackfillDeps } from "../scripts/backfill-enrichment.js";
import type { Epic, Feature } from "../store/types.js";
import { InMemoryTaskStore } from "../store/in-memory.js";

// --- Test helpers ---

function makeEpic(overrides: Partial<Epic> = {}): Epic {
  return {
    id: "bm-0001",
    type: "epic",
    name: "Test Epic",
    slug: "test-epic",
    status: "implement" as const,
    depends_on: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeFeature(epicId: string, overrides: Partial<Feature> = {}): Feature {
  return {
    id: `${epicId}.1`,
    type: "feature",
    parent: epicId,
    name: "Feature A",
    status: "completed",
    depends_on: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeTaskStore(overrides: { epics?: Epic[]; features?: Map<string, Feature[]> } = {}): InMemoryTaskStore {
  const store = new InMemoryTaskStore();

  // Add epics
  if (overrides.epics) {
    for (const epic of overrides.epics) {
      // Manually insert epic to preserve ID
      (store as any).entities.set(epic.id, epic);
      (store as any).epicCounters.set(epic.id, 0);
    }
  }

  // Add features
  if (overrides.features) {
    for (const [epicId, features] of overrides.features.entries()) {
      for (const feature of features) {
        (store as any).entities.set(feature.id, feature);
        const counter = parseInt(feature.id.split(".")[1] ?? "0");
        (store as any).epicCounters.set(epicId, Math.max((store as any).epicCounters.get(epicId) ?? 0, counter));
      }
    }
  }

  return store;
}

function makeDeps(overrides: Partial<Record<string, unknown>> = {}): BackfillDeps {
  const taskStore = makeTaskStore();
  return {
    taskStore,
    syncGitHubForEpic: vi.fn().mockResolvedValue(undefined),
    loadConfig: vi.fn().mockReturnValue({ github: { enabled: true } }),
    discoverGitHub: vi.fn().mockResolvedValue({ repo: "owner/repo" }),
    hasRemote: vi.fn().mockResolvedValue(true),
    pushBranches: vi.fn().mockResolvedValue(undefined),
    pushTags: vi.fn().mockResolvedValue(undefined),
    amendCommitsInRange: vi.fn().mockResolvedValue({ amended: 0, skipped: 0 }),
    linkBranches: vi.fn().mockResolvedValue(undefined),
    git: vi.fn().mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 }),
    ...overrides,
  } as unknown as BackfillDeps;
}

describe("backfill-enrichment (comprehensive)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // --- Empty cases ---

  it("returns early when no epics exist", async () => {
    const deps = makeDeps();

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    const result = await backfill("/project", deps);

    expect(result.synced).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errored).toBe(0);
  });

  // --- GitHub sync step ---

  it("calls syncGitHubForEpic when github is enabled", async () => {
    const epic = makeEpic();
    const feature = makeFeature(epic.id);
    const store = makeTaskStore({
      epics: [epic],
      features: new Map([[epic.id, [feature]]])
    });
    const deps = makeDeps({ taskStore: store });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    expect((deps.syncGitHubForEpic as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      expect.objectContaining({
        projectRoot: "/project",
        epicSlug: "test-epic",
      }),
    );
  });

  it("skips syncGitHubForEpic when github is disabled", async () => {
    const epic = makeEpic();
    const feature = makeFeature(epic.id);
    const store = makeTaskStore({
      epics: [epic],
      features: new Map([[epic.id, [feature]]])
    });
    const deps = makeDeps({
      taskStore: store,
      loadConfig: vi.fn().mockReturnValue({ github: { enabled: false } }),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    expect((deps.syncGitHubForEpic as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  // --- Branch push step ---

  it("pushes feature and impl branches when remote exists", async () => {
    const epic = makeEpic();
    const feature = makeFeature(epic.id);
    const store = makeTaskStore({
      epics: [epic],
      features: new Map([[epic.id, [feature]]])
    });
    const deps = makeDeps({ taskStore: store });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    // Feature branch push (current phase)
    expect((deps.pushBranches as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      expect.objectContaining({
        epicSlug: "test-epic",
        phase: "implement",
        cwd: "/project",
      }),
    );
    // Impl branch push per feature
    expect((deps.pushBranches as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      expect.objectContaining({
        epicSlug: "test-epic",
        phase: "implement",
        featureSlug: `bm-0001.1`,
        cwd: "/project",
      }),
    );
  });

  it("skips branch push when no remote", async () => {
    const epic = makeEpic();
    const feature = makeFeature(epic.id);
    const store = makeTaskStore({
      epics: [epic],
      features: new Map([[epic.id, [feature]]])
    });
    const deps = makeDeps({
      taskStore: store,
      hasRemote: vi.fn().mockResolvedValue(false),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    expect((deps.pushBranches as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  // --- Tag push step ---

  it("pushes tags when remote exists", async () => {
    const epic = makeEpic();
    const feature = makeFeature(epic.id);
    const store = makeTaskStore({
      epics: [epic],
      features: new Map([[epic.id, [feature]]])
    });
    const deps = makeDeps({ taskStore: store });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    expect((deps.pushTags as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({ cwd: "/project" });
  });

  it("skips tag push when no remote", async () => {
    const epic = makeEpic();
    const feature = makeFeature(epic.id);
    const store = makeTaskStore({
      epics: [epic],
      features: new Map([[epic.id, [feature]]])
    });
    const deps = makeDeps({
      taskStore: store,
      hasRemote: vi.fn().mockResolvedValue(false),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    expect((deps.pushTags as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  // --- Commit amend step ---

  it("amends commits and force-pushes when amendments made", async () => {
    const epic = makeEpic();
    const feature = makeFeature(epic.id);
    const store = makeTaskStore({
      epics: [epic],
      features: new Map([[epic.id, [feature]]])
    });
    const deps = makeDeps({
      taskStore: store,
      amendCommitsInRange: vi.fn().mockResolvedValue({ amended: 3, skipped: 1 }),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    const result = await backfill("/project", deps);

    expect((deps.amendCommitsInRange as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      expect.any(Object),
      "test-epic",
      "implement",
      { cwd: "/project" },
    );
    // Force-push after amend
    expect((deps.git as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      ["push", "--force-with-lease", "origin", "feature/test-epic"],
      { cwd: "/project", allowFailure: true },
    );
    expect(result.epics[0].steps).toContain("commit-amend(3)");
    expect(result.epics[0].steps).toContain("force-push");
  });

  it("skips force-push when no commits amended", async () => {
    const epic = makeEpic();
    const feature = makeFeature(epic.id);
    const store = makeTaskStore({
      epics: [epic],
      features: new Map([[epic.id, [feature]]])
    });
    const deps = makeDeps({
      taskStore: store,
      amendCommitsInRange: vi.fn().mockResolvedValue({ amended: 0, skipped: 5 }),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    const result = await backfill("/project", deps);

    expect((deps.git as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    expect(result.epics[0].steps).not.toContain("force-push");
  });

  // --- Branch linking step ---

  it("links branches to issues when github is enabled", async () => {
    const epic = makeEpic();
    const feature = makeFeature(epic.id);
    const store = makeTaskStore({
      epics: [epic],
      features: new Map([[epic.id, [feature]]])
    });
    const deps = makeDeps({ taskStore: store });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    // Epic branch link
    expect((deps.linkBranches as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      expect.objectContaining({
        repo: "owner/repo",
        epicSlug: "test-epic",
        epicIssueNumber: 0,
        phase: "implement",
        cwd: "/project",
      }),
    );
    // Feature impl branch link
    expect((deps.linkBranches as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      expect.objectContaining({
        repo: "owner/repo",
        epicSlug: "test-epic",
        featureSlug: `bm-0001.1`,
        featureIssueNumber: 0,
        phase: "implement",
      }),
    );
  });

  it("skips branch linking when github is disabled", async () => {
    const epic = makeEpic();
    const feature = makeFeature(epic.id);
    const store = makeTaskStore({
      epics: [epic],
      features: new Map([[epic.id, [feature]]])
    });
    const deps = makeDeps({
      taskStore: store,
      loadConfig: vi.fn().mockReturnValue({ github: { enabled: false } }),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    expect((deps.linkBranches as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  // --- Error handling ---

  it("continues processing after one epic fails", async () => {
    const epicA = makeEpic({ id: "bm-0001", slug: "epic-a" });
    const epicB = makeEpic({ id: "bm-0002", slug: "epic-b" });
    const featureA = makeFeature(epicA.id);
    const featureB = makeFeature(epicB.id);

    const store = makeTaskStore({
      epics: [epicA, epicB],
      features: new Map([
        [epicA.id, [featureA]],
        [epicB.id, [featureB]],
      ])
    });

    const deps = makeDeps({
      taskStore: store,
      syncGitHubForEpic: vi.fn()
        .mockRejectedValueOnce(new Error("API rate limit"))
        .mockResolvedValueOnce(undefined),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    const result = await backfill("/project", deps);

    expect(result.errored).toBe(1);
    expect(result.synced).toBe(1);
    expect(result.epics[0].status).toBe("errored");
    expect(result.epics[0].error).toContain("API rate limit");
    expect(result.epics[1].status).toBe("synced");
  });

  // --- Idempotency ---

  it("is idempotent — skip conditions prevent duplicate operations", async () => {
    const epic = makeEpic();
    const feature = makeFeature(epic.id);
    const store = makeTaskStore({
      epics: [epic],
      features: new Map([[epic.id, [feature]]])
    });
    const deps = makeDeps({
      taskStore: store,
      amendCommitsInRange: vi.fn().mockResolvedValue({ amended: 0, skipped: 5 }),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    const result1 = await backfill("/project", deps);
    const result2 = await backfill("/project", deps);

    // Both runs complete without error
    expect(result1.synced).toBe(1);
    expect(result2.synced).toBe(1);
    // No force-push on either run (no commits amended)
    expect((deps.git as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  // --- Summary tracking ---

  it("tracks per-epic steps in result", async () => {
    const epic = makeEpic();
    const feature = makeFeature(epic.id);
    const store = makeTaskStore({
      epics: [epic],
      features: new Map([[epic.id, [feature]]])
    });
    const deps = makeDeps({ taskStore: store });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    const result = await backfill("/project", deps);

    expect(result.epics).toHaveLength(1);
    expect(result.epics[0].slug).toBe("test-epic");
    expect(result.epics[0].status).toBe("synced");
    expect(result.epics[0].steps).toContain("github-sync");
    expect(result.epics[0].steps).toContain("branch-push");
    expect(result.epics[0].steps).toContain("tag-push");
    expect(result.epics[0].steps).toContain("branch-link-epic");
  });

  // --- Features without issue numbers ---

  it("links all impl branches (github mapping handled externally)", async () => {
    const epic = makeEpic();
    const feature1 = makeFeature(epic.id, { id: `${epic.id}.1` });
    const feature2 = makeFeature(epic.id, { id: `${epic.id}.2` });

    const store = makeTaskStore({
      epics: [epic],
      features: new Map([[epic.id, [feature1, feature2]]])
    });
    const deps = makeDeps({ taskStore: store });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    // Both feature links should be called
    const linkCalls = (deps.linkBranches as ReturnType<typeof vi.fn>).mock.calls;
    expect(linkCalls.length).toBeGreaterThanOrEqual(3); // Epic + 2 features

    // Find the feature calls
    const featureLinkCalls = linkCalls.filter(call => call[0].featureSlug);
    expect(featureLinkCalls).toHaveLength(2);
  });
});
