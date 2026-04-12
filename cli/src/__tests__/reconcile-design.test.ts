import { describe, it, expect, vi, beforeEach } from "vitest";
import { reconcileDesign } from "../pipeline/reconcile.js";

// Create a shared mock store object that all tests can manipulate
let sharedMockStore: any;

// Mock modules
vi.mock("../artifacts/reader.js", () => ({
  loadWorktreePhaseOutput: vi.fn(),
  loadWorktreeFeatureOutput: vi.fn(),
  extractSectionFromFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../pipeline-machine/index.js", () => ({
  epicMachine: {
    resolveState: vi.fn(),
  },
  loadEpic: vi.fn(),
}));

vi.mock("../git/tags.js", () => ({
  renameTags: vi.fn(),
}));

vi.mock("../store/index.js", () => {
  class MockJsonFileStore {
    constructor(_path?: string) {
      // Return the shared mock store
      return sharedMockStore;
    }
  }
  return {
    JsonFileStore: MockJsonFileStore as any,
    resolveIdentifier: vi.fn(),
  };
});

import { loadWorktreePhaseOutput, extractSectionFromFile } from "../artifacts/reader.js";
import { epicMachine, loadEpic } from "../pipeline-machine/index.js";
import { renameTags } from "../git/tags.js";
import { resolveIdentifier } from "../store/index.js";
import type { Epic } from "../store/types.js";

describe("reconcileDesign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sharedMockStore = {
      load: vi.fn(),
      save: vi.fn(),
      find: vi.fn(),
      listFeatures: vi.fn(),
      addEpic: vi.fn(),
      getEpic: vi.fn(),
      updateEpic: vi.fn(),
    };
    // Default resolveIdentifier mock to return "not_found"
    vi.mocked(resolveIdentifier).mockReturnValue({ kind: "not_found" });
  });

  it("returns undefined when output is not completed", async () => {
    vi.mocked(loadWorktreePhaseOutput).mockReturnValue({
      phase: "design",
      status: "in-progress",
      artifacts: {},
    } as any);

    const result = await reconcileDesign("/project/root", "test-slug", "/wt/path");
    expect(result).toBeUndefined();
  });

  it("returns undefined when output does not exist", async () => {
    vi.mocked(loadWorktreePhaseOutput).mockReturnValue(undefined);

    const result = await reconcileDesign("/project/root", "test-slug", "/wt/path");
    expect(result).toBeUndefined();
  });

  it("returns undefined when entity not found and does not create", async () => {
    vi.mocked(loadWorktreePhaseOutput).mockReturnValue({
      phase: "design",
      status: "completed",
      artifacts: {
        "epic-slug": "test-slug",
        design: "/path/to/design.md",
      },
    } as any);

    sharedMockStore.getEpic.mockReturnValue(undefined);
    sharedMockStore.listFeatures.mockReturnValue([]);

    const result = await reconcileDesign("/project/root", "test-slug", "/wt/path");
    expect(result).toBeUndefined();
    expect(sharedMockStore.addEpic).not.toHaveBeenCalled();
  });

  it("returns undefined when entity type is not epic", async () => {
    vi.mocked(loadWorktreePhaseOutput).mockReturnValue({
      phase: "design",
      status: "completed",
      artifacts: {
        "epic-slug": "test-slug",
        design: "/path/to/design.md",
      },
    } as any);

    // getEpic returns undefined, so resolveEpic falls back to resolveIdentifier
    sharedMockStore.getEpic.mockReturnValue(undefined);
    // resolveIdentifier finds a feature instead of an epic
    vi.mocked(resolveIdentifier).mockReturnValue({
      kind: "found",
      entity: { type: "feature", id: "f-1" },
    });
    sharedMockStore.listFeatures.mockReturnValue([]);

    const result = await reconcileDesign("/project/root", "test-slug", "/wt/path");
    expect(result).toBeUndefined();
    expect(sharedMockStore.addEpic).not.toHaveBeenCalled();
  });

  it("reconciles design normally when entity exists", async () => {
    const mockEpic: Epic = {
      id: "bm-1",
      type: "epic",
      name: "Test Epic",
      slug: "test-slug",
      status: "design",
      depends_on: [],
      created_at: "2026-04-11T00:00:00Z",
      updated_at: "2026-04-11T00:00:00Z",
    };

    const updatedEpic: Epic = {
      ...mockEpic,
      status: "plan",
      summary: "Problem — Solution",
      design: "/path/to/design.md",
      updated_at: "2026-04-11T01:00:00Z",
    };

    vi.mocked(loadWorktreePhaseOutput).mockReturnValue({
      phase: "design",
      status: "completed",
      artifacts: {
        "epic-slug": "test-slug",
        design: "/path/to/design.md",
      },
    } as any);

    const mockActor = {
      getSnapshot: vi.fn().mockReturnValue({
        value: "plan",
        context: { summary: "Problem — Solution" },
      }),
      send: vi.fn(),
      stop: vi.fn(),
    };

    vi.mocked(epicMachine.resolveState).mockReturnValue({
      value: "plan",
      context: { summary: "Problem — Solution" },
    } as any);

    vi.mocked(loadEpic).mockReturnValue(mockActor as any);

    sharedMockStore.getEpic.mockReturnValue(updatedEpic);
    sharedMockStore.listFeatures.mockReturnValue([]);

    const result = await reconcileDesign("/project/root", "test-slug", "/wt/path");

    expect(result).toBeDefined();
    expect(result?.epic).toEqual(updatedEpic);
    expect(result?.phase).toBe("plan");
    expect(sharedMockStore.updateEpic).toHaveBeenCalled();
    expect(sharedMockStore.save).toHaveBeenCalled();
    expect(mockActor.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "DESIGN_COMPLETED",
      })
    );
  });

  it("handles slug rename during design reconciliation", async () => {
    const mockEpic: Epic = {
      id: "bm-1",
      type: "epic",
      name: "Test Epic",
      slug: "temp-hex-slug",
      status: "design",
      depends_on: [],
      created_at: "2026-04-11T00:00:00Z",
      updated_at: "2026-04-11T00:00:00Z",
    };

    const updatedEpic: Epic = {
      ...mockEpic,
      slug: "better-slug-1",
      status: "plan",
      summary: "Problem — Solution",
      design: "/path/to/design.md",
      updated_at: "2026-04-11T01:00:00Z",
    };

    vi.mocked(loadWorktreePhaseOutput).mockReturnValue({
      phase: "design",
      status: "completed",
      artifacts: {
        "epic-slug": "better-slug",
        design: "/path/to/design.md",
      },
    } as any);

    const mockActor = {
      getSnapshot: vi.fn().mockReturnValue({
        value: "plan",
        context: { summary: "Problem — Solution" },
      }),
      send: vi.fn(),
      stop: vi.fn(),
    };

    vi.mocked(epicMachine.resolveState).mockReturnValue({
      value: "plan",
      context: { summary: "Problem — Solution" },
    } as any);

    vi.mocked(loadEpic).mockReturnValue(mockActor as any);

    // Mock getEpic to return different values based on what's being called
    sharedMockStore.getEpic.mockImplementation((id: string) => {
      // When called with "temp-hex-slug", return the initial epic
      if (id === "temp-hex-slug") return mockEpic;
      // When called with "bm-1" (the ID), return the updated epic
      if (id === "bm-1") return updatedEpic;
      return undefined;
    });
    sharedMockStore.listFeatures.mockReturnValue([]);
    vi.mocked(renameTags).mockResolvedValue(undefined);

    const result = await reconcileDesign("/project/root", "temp-hex-slug", "/wt/path");

    expect(result).toBeDefined();
    expect(result?.epic.slug).toBe("better-slug-1");
    expect(vi.mocked(renameTags)).toHaveBeenCalledWith("temp-hex-slug", "better-slug-1", {
      cwd: "/project/root",
    });
    expect(sharedMockStore.updateEpic).toHaveBeenCalledWith(
      "bm-1",
      expect.objectContaining({
        slug: "better-slug-1",
      })
    );
  });

  it("includes progress when features exist", async () => {
    const mockEpic: Epic = {
      id: "bm-1",
      type: "epic",
      name: "Test Epic",
      slug: "test-slug",
      status: "design",
      depends_on: [],
      created_at: "2026-04-11T00:00:00Z",
      updated_at: "2026-04-11T00:00:00Z",
    };

    const updatedEpic: Epic = {
      ...mockEpic,
      status: "plan",
      summary: "Problem — Solution",
      design: "/path/to/design.md",
      updated_at: "2026-04-11T01:00:00Z",
    };

    vi.mocked(loadWorktreePhaseOutput).mockReturnValue({
      phase: "design",
      status: "completed",
      artifacts: {
        "epic-slug": "test-slug",
        design: "/path/to/design.md",
      },
    } as any);

    const mockActor = {
      getSnapshot: vi.fn().mockReturnValue({
        value: "plan",
        context: { summary: "Problem — Solution" },
      }),
      send: vi.fn(),
      stop: vi.fn(),
    };

    vi.mocked(epicMachine.resolveState).mockReturnValue({
      value: "plan",
      context: { summary: "Problem — Solution" },
    } as any);

    vi.mocked(loadEpic).mockReturnValue(mockActor as any);

    const mockFeatures = [
      { slug: "feature-1", status: "completed" },
      { slug: "feature-2", status: "in-progress" },
      { slug: "feature-3", status: "pending" },
    ];

    sharedMockStore.getEpic.mockReturnValue(updatedEpic);
    sharedMockStore.listFeatures.mockReturnValue(mockFeatures);

    const result = await reconcileDesign("/project/root", "test-slug", "/wt/path");

    expect(result).toBeDefined();
    expect(result?.progress).toEqual({ completed: 1, total: 3 });
  });
});
