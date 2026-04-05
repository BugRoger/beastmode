import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BackfillDeps } from "../scripts/backfill-enrichment.js";
import type { PipelineManifest } from "../manifest/store.js";

// --- Test helpers ---

function makeManifest(overrides: Partial<PipelineManifest> = {}): PipelineManifest {
  return {
    slug: "test-epic",
    epic: "test-epic",
    phase: "implement",
    features: [
      {
        slug: "feature-a",
        plan: ".beastmode/artifacts/plan/2026-01-01-test-epic-feature-a.md",
        status: "completed" as const,
        github: { issue: 10 },
      },
    ],
    artifacts: {
      design: [".beastmode/artifacts/design/2026-01-01-test-epic.md"],
    },
    github: { epic: 5, repo: "owner/repo" },
    lastUpdated: "2026-01-01T00:00:00Z",
    ...overrides,
  } as PipelineManifest;
}

function makeDeps(overrides: Partial<Record<string, unknown>> = {}): BackfillDeps {
  return {
    list: vi.fn().mockReturnValue([]),
    load: vi.fn().mockReturnValue(undefined),
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

  // --- Skip conditions ---

  it("skips epics without github.epic", async () => {
    const manifest = makeManifest({ github: undefined });
    const deps = makeDeps({ list: vi.fn().mockReturnValue([manifest]) });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    const result = await backfill("/project", deps);

    expect(result.skipped).toBe(1);
    expect(result.synced).toBe(0);
    expect((deps.syncGitHubForEpic as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    expect((deps.pushBranches as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it("returns early when no manifests exist", async () => {
    const deps = makeDeps();

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    const result = await backfill("/project", deps);

    expect(result.synced).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errored).toBe(0);
  });

  // --- GitHub sync step ---

  it("calls syncGitHubForEpic when github is enabled", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
    });

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
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
      loadConfig: vi.fn().mockReturnValue({ github: { enabled: false } }),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    expect((deps.syncGitHubForEpic as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  // --- Branch push step ---

  it("pushes feature and impl branches when remote exists", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
    });

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
        featureSlug: "feature-a",
        cwd: "/project",
      }),
    );
  });

  it("skips branch push when no remote", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
      hasRemote: vi.fn().mockResolvedValue(false),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    expect((deps.pushBranches as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  // --- Tag push step ---

  it("pushes tags when remote exists", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    expect((deps.pushTags as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({ cwd: "/project" });
  });

  it("skips tag push when no remote", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
      hasRemote: vi.fn().mockResolvedValue(false),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    expect((deps.pushTags as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  // --- Commit amend step ---

  it("amends commits and force-pushes when amendments made", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
      amendCommitsInRange: vi.fn().mockResolvedValue({ amended: 3, skipped: 1 }),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    const result = await backfill("/project", deps);

    expect((deps.amendCommitsInRange as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      manifest,
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
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
      amendCommitsInRange: vi.fn().mockResolvedValue({ amended: 0, skipped: 5 }),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    const result = await backfill("/project", deps);

    expect((deps.git as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    expect(result.epics[0].steps).not.toContain("force-push");
  });

  // --- Branch linking step ---

  it("links branches to issues when github is enabled", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    // Epic branch link
    expect((deps.linkBranches as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      expect.objectContaining({
        repo: "owner/repo",
        epicSlug: "test-epic",
        epicIssueNumber: 5,
        phase: "implement",
        cwd: "/project",
      }),
    );
    // Feature impl branch link
    expect((deps.linkBranches as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      expect.objectContaining({
        repo: "owner/repo",
        epicSlug: "test-epic",
        featureSlug: "feature-a",
        featureIssueNumber: 10,
        phase: "implement",
      }),
    );
  });

  it("skips branch linking when github is disabled", async () => {
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
      loadConfig: vi.fn().mockReturnValue({ github: { enabled: false } }),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    expect((deps.linkBranches as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  // --- Error handling ---

  it("continues processing after one epic fails", async () => {
    const manifestA = makeManifest({ slug: "epic-a", epic: "epic-a", github: { epic: 1, repo: "o/r" } });
    const manifestB = makeManifest({ slug: "epic-b", epic: "epic-b", github: { epic: 2, repo: "o/r" } });
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifestA, manifestB]),
      load: vi.fn().mockImplementation((_root: string, slug: string) =>
        slug === "epic-a" ? manifestA : manifestB,
      ),
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
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
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
    const manifest = makeManifest();
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
    });

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

  it("skips branch linking for features without github.issue", async () => {
    const manifest = makeManifest({
      features: [
        {
          slug: "no-issue-feature",
          plan: "plan.md",
          status: "pending" as const,
        },
      ],
    });
    const deps = makeDeps({
      list: vi.fn().mockReturnValue([manifest]),
      load: vi.fn().mockReturnValue(manifest),
    });

    const { backfill } = await import("../scripts/backfill-enrichment.js");
    await backfill("/project", deps);

    // Only the epic-level link call, no feature-level call with featureSlug
    const linkCalls = (deps.linkBranches as ReturnType<typeof vi.fn>).mock.calls;
    expect(linkCalls).toHaveLength(1); // Just the epic link
    expect(linkCalls[0][0]).toMatchObject({ epicSlug: "test-epic" });
    expect(linkCalls[0][0].featureSlug).toBeUndefined();
  });
});
