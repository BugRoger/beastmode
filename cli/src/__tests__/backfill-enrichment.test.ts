import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BackfillDeps } from "../scripts/backfill-enrichment.js";

describe("backfill-enrichment", () => {
  let mockList: ReturnType<typeof vi.fn>;
  let mockSyncForEpic: ReturnType<typeof vi.fn>;
  let mockLoadConfig: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockList = vi.fn();
    mockSyncForEpic = vi.fn();
    mockLoadConfig = vi.fn();
  });

  async function runBackfill(projectRoot: string) {
    const { backfill } = await import("../scripts/backfill-enrichment.js");
    return backfill(projectRoot, {
      list: mockList,
      syncGitHubForEpic: mockSyncForEpic,
      loadConfig: mockLoadConfig,
    } as unknown as BackfillDeps);
  }

  it("skips manifests without github.epic", async () => {
    mockLoadConfig.mockReturnValue({ github: { enabled: true } });
    mockList.mockReturnValue([
      { slug: "no-github", phase: "design", features: [], artifacts: {}, lastUpdated: "" },
      { slug: "has-github", phase: "design", features: [], artifacts: {}, lastUpdated: "", github: { epic: 42, repo: "owner/repo" } },
    ]);
    mockSyncForEpic.mockResolvedValue(undefined);

    const result = await runBackfill("/project");

    expect(mockSyncForEpic).toHaveBeenCalledTimes(1);
    expect(mockSyncForEpic).toHaveBeenCalledWith(expect.objectContaining({
      projectRoot: "/project",
      epicSlug: "has-github",
    }));
    expect(result.skipped).toBe(1);
    expect(result.synced).toBe(1);
  });

  it("reports errors without stopping", async () => {
    mockLoadConfig.mockReturnValue({ github: { enabled: true } });
    mockList.mockReturnValue([
      { slug: "epic-a", phase: "plan", features: [], artifacts: {}, lastUpdated: "", github: { epic: 1, repo: "o/r" } },
      { slug: "epic-b", phase: "plan", features: [], artifacts: {}, lastUpdated: "", github: { epic: 2, repo: "o/r" } },
    ]);
    mockSyncForEpic
      .mockRejectedValueOnce(new Error("API rate limit"))
      .mockResolvedValueOnce(undefined);

    const result = await runBackfill("/project");

    expect(result.errored).toBe(1);
    expect(result.synced).toBe(1);
    expect(result.errors[0]).toContain("epic-a");
  });

  it("returns early when github is not enabled", async () => {
    mockLoadConfig.mockReturnValue({ github: { enabled: false } });

    const result = await runBackfill("/project");

    expect(mockList).not.toHaveBeenCalled();
    expect(result.skipped).toBe(0);
    expect(result.synced).toBe(0);
    expect(result.errored).toBe(0);
  });

  it("handles empty manifest list", async () => {
    mockLoadConfig.mockReturnValue({ github: { enabled: true } });
    mockList.mockReturnValue([]);

    const result = await runBackfill("/project");

    expect(result.synced).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errored).toBe(0);
  });
});
