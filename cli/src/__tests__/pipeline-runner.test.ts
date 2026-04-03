import { describe, it, expect, beforeEach, mock } from "bun:test";
import { resolve } from "node:path";

// ---------- module-level mocks (must precede runner import) ----------

// Mock git/worktree
const mockCreate = mock(async (slug: string) => ({
  slug,
  path: `/tmp/test-project/.claude/worktrees/${slug}`,
  branch: `feature/${slug}`,
}));
const mockRebase = mock(async (_phase: string, _opts?: any) => ({
  outcome: "success" as const,
  message: "rebased onto main",
}));
const mockArchive = mock(async (_slug: string, _opts?: any) => `archive/test-epic`);
const mockRemove = mock(async (_slug: string, _opts?: any) => {});

mock.module("../git/worktree.js", () => ({
  create: mockCreate,
  rebase: mockRebase,
  archive: mockArchive,
  remove: mockRemove,
}));

// Mock artifacts/reader
const mockLoadOutput = mock((_wt: string, _phase: string, _slug: string) =>
  ({ status: "completed", artifacts: {} }) as any,
);
mock.module("../artifacts/reader.js", () => ({
  loadWorktreePhaseOutput: mockLoadOutput,
}));

// Mock manifest/store
const mockStoreLoad = mock((_root: string, _slug: string) =>
  ({ slug: "test-epic", phase: "plan", features: [], artifacts: {}, lastUpdated: new Date().toISOString() }) as any,
);
const mockStoreSave = mock((_root: string, _slug: string, _data: any) => {});
const mockStoreTransact = mock(async (_root: string, _slug: string, fn: Function) => fn({ slug: "test-epic" }));
const mockStoreRename = mock(async () => ({ renamed: false, finalSlug: "test-epic", completedSteps: [] }));
mock.module("../manifest/store.js", () => ({
  load: mockStoreLoad,
  save: mockStoreSave,
  transact: mockStoreTransact,
  rename: mockStoreRename,
}));

// Mock manifest/reconcile
const mockReconcileDesign = mock(async () => ({ phase: "plan", manifest: { slug: "test-epic" } }));
const mockReconcilePlan = mock(async () => ({ phase: "implement", manifest: { slug: "test-epic" } }));
const mockReconcileFeature = mock(async () => ({ phase: "implement", manifest: { slug: "test-epic" } }));
const mockReconcileImplement = mock(async () => ({ phase: "validate", manifest: { slug: "test-epic" } }));
const mockReconcileValidate = mock(async () => ({ phase: "release", manifest: { slug: "test-epic" } }));
const mockReconcileRelease = mock(async () => ({ phase: "done", manifest: { slug: "test-epic" } }));
mock.module("../manifest/reconcile.js", () => ({
  reconcileDesign: mockReconcileDesign,
  reconcilePlan: mockReconcilePlan,
  reconcileFeature: mockReconcileFeature,
  reconcileImplement: mockReconcileImplement,
  reconcileValidate: mockReconcileValidate,
  reconcileRelease: mockReconcileRelease,
}));

// Mock git/tags
const mockCreateTag = mock(async () => {});
mock.module("../git/tags.js", () => ({
  createTag: mockCreateTag,
}));

// Mock github/sync
const mockSyncGitHub = mock(async () => ({ mutations: [] }));
const mockSyncGitHubForEpic = mock(async () => {});
mock.module("../github/sync.js", () => ({
  syncGitHub: mockSyncGitHub,
  syncGitHubForEpic: mockSyncGitHubForEpic,
}));

// Mock github/discovery
const mockDiscoverGitHub = mock(async () => null);
mock.module("../github/discovery.js", () => ({
  discoverGitHub: mockDiscoverGitHub,
}));

// Mock manifest/pure
mock.module("../manifest/pure.js", () => ({
  setGitHubEpic: mock((m: any) => m),
  setFeatureGitHubIssue: mock((m: any) => m),
  setEpicBodyHash: mock((m: any) => m),
  setFeatureBodyHash: mock((m: any) => m),
}));

// Mock hooks/hitl-settings
const mockCleanHitlSettings = mock((_dir: string) => {});
const mockWriteHitlSettings = mock((_opts: any) => {});
const mockBuildPreToolUseHook = mock(() => ({}));
const mockGetPhaseHitlProse = mock(() => "test prose");
mock.module("../hooks/hitl-settings.js", () => ({
  cleanHitlSettings: mockCleanHitlSettings,
  writeHitlSettings: mockWriteHitlSettings,
  buildPreToolUseHook: mockBuildPreToolUseHook,
  getPhaseHitlProse: mockGetPhaseHitlProse,
}));

// ---------- import runner AFTER mocks ----------

import { run } from "../pipeline/runner.js";
import type { PipelineConfig } from "../pipeline/runner.js";
import type { BeastmodeConfig } from "../config.js";

// ---------- test helpers ----------

function makeConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    phase: "plan",
    epicSlug: "test-epic",
    args: ["test-epic"],
    projectRoot: "/tmp/test-project",
    strategy: "interactive",
    config: {
      hitl: {
        model: "claude-sonnet-4-5-20250514",
        timeout: 30,
        design: "",
        plan: "",
        implement: "",
        validate: "",
        release: "",
      },
      github: { enabled: false },
      cli: {},
    } as BeastmodeConfig,
    dispatch: async () => ({ success: true }),
    logger: nullLogger,
    ...overrides,
  };
}

const noop = () => {};
const nullLogger = {
  log: noop,
  detail: noop,
  debug: noop,
  trace: noop,
  warn: noop,
  error: noop,
  child: () => nullLogger,
} as any;

function resetAllMocks() {
  mockCreate.mockClear();
  mockRebase.mockClear();
  mockArchive.mockClear();
  mockRemove.mockClear();
  mockLoadOutput.mockClear();
  mockStoreLoad.mockClear();
  mockStoreSave.mockClear();
  mockStoreTransact.mockClear();
  mockStoreRename.mockClear();
  mockReconcileDesign.mockClear();
  mockReconcilePlan.mockClear();
  mockReconcileFeature.mockClear();
  mockReconcileImplement.mockClear();
  mockReconcileValidate.mockClear();
  mockReconcileRelease.mockClear();
  mockCreateTag.mockClear();
  mockSyncGitHub.mockClear();
  mockSyncGitHubForEpic.mockClear();
  mockDiscoverGitHub.mockClear();
  mockCleanHitlSettings.mockClear();
  mockWriteHitlSettings.mockClear();
  mockBuildPreToolUseHook.mockClear();
  mockGetPhaseHitlProse.mockClear();

  // Restore default implementations
  mockLoadOutput.mockImplementation(
    () => ({ status: "completed", artifacts: {} }) as any,
  );
  mockStoreLoad.mockImplementation(
    () => ({ slug: "test-epic", phase: "plan", features: [], artifacts: {}, lastUpdated: new Date().toISOString() }) as any,
  );
  mockRebase.mockImplementation(async () => ({
    outcome: "success" as const,
    message: "rebased onto main",
  }));
  mockStoreRename.mockImplementation(async () => ({
    renamed: false,
    finalSlug: "test-epic",
    completedSteps: [],
  }));
  mockReconcileDesign.mockImplementation(async () => ({ phase: "plan", manifest: { slug: "test-epic" } }));
  mockReconcilePlan.mockImplementation(async () => ({ phase: "implement", manifest: { slug: "test-epic" } }));
  mockReconcileFeature.mockImplementation(async () => ({ phase: "implement", manifest: { slug: "test-epic" } }));
  mockReconcileImplement.mockImplementation(async () => ({ phase: "validate", manifest: { slug: "test-epic" } }));
  mockReconcileValidate.mockImplementation(async () => ({ phase: "release", manifest: { slug: "test-epic" } }));
  mockReconcileRelease.mockImplementation(async () => ({ phase: "done", manifest: { slug: "test-epic" } }));
  mockDiscoverGitHub.mockImplementation(async () => null);
  mockArchive.mockImplementation(async () => `archive/test-epic`);
}

// ---------- tests ----------

describe("pipeline/runner", () => {
  beforeEach(resetAllMocks);

  // --- 1. All 9 steps execute in order ---

  describe("step ordering", () => {
    it("executes all 9 steps in order for a plan phase", async () => {
      const callOrder: string[] = [];

      mockCreate.mockImplementation(async (slug: string) => {
        callOrder.push("1:worktree.create");
        return {
          slug,
          path: `/tmp/test-project/.claude/worktrees/${slug}`,
          branch: `feature/${slug}`,
        };
      });
      mockRebase.mockImplementation(async () => {
        callOrder.push("2:rebase");
        return { outcome: "success" as const, message: "rebased" };
      });
      mockCleanHitlSettings.mockImplementation(() => callOrder.push("3:settings.clean"));
      mockWriteHitlSettings.mockImplementation(() => callOrder.push("3:settings.write"));

      const dispatch = async () => {
        callOrder.push("4:dispatch");
        return { success: true };
      };

      mockLoadOutput.mockImplementation(() => {
        callOrder.push("5:artifacts.collect");
        return { status: "completed", artifacts: {} } as any;
      });
      mockReconcilePlan.mockImplementation(async () => {
        callOrder.push("6:reconcile");
        return { phase: "implement", manifest: { slug: "test-epic" } };
      });
      mockCreateTag.mockImplementation(async () => {
        callOrder.push("7:tag");
      });
      // Step 8 (github.mirror): skipped because github.enabled is false
      // Step 9 (cleanup): skipped because phase is not release

      const result = await run(makeConfig({ dispatch }));

      expect(result.success).toBe(true);
      expect(callOrder).toEqual([
        "1:worktree.create",
        "2:rebase",
        "3:settings.clean",
        "3:settings.write",
        "4:dispatch",
        "5:artifacts.collect",
        "6:reconcile",
        "7:tag",
      ]);
    });
  });

  // --- 2. Design phase skips rebase (step 2) ---

  describe("design phase rebase behavior", () => {
    it("passes 'design' to rebase which returns skipped", async () => {
      mockRebase.mockImplementation(async (phase: string) => ({
        outcome: (phase === "design" ? "skipped" : "success") as any,
        message: phase === "design" ? "design phase" : "rebased",
      }));

      await run(makeConfig({ phase: "design" }));

      expect(mockRebase).toHaveBeenCalled();
      const call = mockRebase.mock.calls[0];
      expect(call[0]).toBe("design");
    });
  });

  // --- 3. Release phase runs cleanup (step 9) ---

  describe("release phase cleanup", () => {
    it("runs archive + remove + manifest save on successful release", async () => {
      const result = await run(makeConfig({ phase: "release" }));

      expect(result.success).toBe(true);
      expect(mockArchive).toHaveBeenCalled();
      expect(mockRemove).toHaveBeenCalled();
      expect(mockStoreSave).toHaveBeenCalled();
    });

    it("skips cleanup when release dispatch fails", async () => {
      const result = await run(makeConfig({
        phase: "release",
        dispatch: async () => ({ success: false }),
      }));

      expect(result.success).toBe(false);
      expect(mockArchive).not.toHaveBeenCalled();
      expect(mockRemove).not.toHaveBeenCalled();
    });
  });

  // --- 4. Non-release phases skip cleanup ---

  describe("non-release phases skip cleanup", () => {
    for (const phase of ["design", "plan", "implement", "validate"] as const) {
      it(`${phase} phase does not run archive or remove`, async () => {
        await run(makeConfig({ phase }));

        expect(mockArchive).not.toHaveBeenCalled();
        expect(mockRemove).not.toHaveBeenCalled();
      });
    }
  });

  // --- 5. Manual and watch entry points produce identical step sequences ---

  describe("skipPreDispatch (watch loop) vs manual", () => {
    it("skips worktree/rebase/settings when skipPreDispatch is true", async () => {
      const result = await run(makeConfig({ skipPreDispatch: true }));

      expect(result.success).toBe(true);
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockRebase).not.toHaveBeenCalled();
      expect(mockCleanHitlSettings).not.toHaveBeenCalled();
      expect(mockWriteHitlSettings).not.toHaveBeenCalled();
    });

    it("runs post-dispatch steps identically in both modes", async () => {
      // Manual run
      await run(makeConfig());
      const manualReconcileCalls = mockReconcilePlan.mock.calls.length;
      const manualTagCalls = mockCreateTag.mock.calls.length;

      resetAllMocks();

      // Watch run (skipPreDispatch)
      await run(makeConfig({ skipPreDispatch: true }));
      const watchReconcileCalls = mockReconcilePlan.mock.calls.length;
      const watchTagCalls = mockCreateTag.mock.calls.length;

      expect(watchReconcileCalls).toBe(manualReconcileCalls);
      expect(watchTagCalls).toBe(manualTagCalls);
    });

    it("computes correct worktree path without calling create", async () => {
      const result = await run(makeConfig({ skipPreDispatch: true }));

      expect(result.worktreePath).toBe(
        resolve("/tmp/test-project", ".claude", "worktrees", "test-epic"),
      );
    });
  });

  // --- Additional coverage ---

  describe("dispatch failure handling", () => {
    it("skips post-dispatch on failure for non-validate phases", async () => {
      const result = await run(makeConfig({
        phase: "plan",
        dispatch: async () => ({ success: false }),
      }));

      expect(result.success).toBe(false);
      expect(mockReconcilePlan).not.toHaveBeenCalled();
      expect(mockCreateTag).not.toHaveBeenCalled();
    });

    it("runs reconciliation on validate failure (REGRESS path)", async () => {
      const result = await run(makeConfig({
        phase: "validate",
        dispatch: async () => ({ success: false }),
      }));

      // Validate failure should still reconcile
      expect(mockReconcileValidate).toHaveBeenCalled();
    });
  });

  describe("design phase abandon guard", () => {
    it("returns early when design produces no output", async () => {
      mockLoadOutput.mockImplementation(() => null as any);

      const result = await run(makeConfig({ phase: "design" }));

      expect(result.success).toBe(true);
      expect(mockReconcileDesign).not.toHaveBeenCalled();
      expect(mockCreateTag).not.toHaveBeenCalled();
    });
  });

  describe("implement fan-out", () => {
    it("calls reconcileFeature when featureSlug is provided", async () => {
      await run(makeConfig({
        phase: "implement",
        featureSlug: "my-feature",
      }));

      expect(mockReconcileFeature).toHaveBeenCalled();
      expect(mockReconcileImplement).not.toHaveBeenCalled();
    });

    it("calls reconcileImplement when no featureSlug", async () => {
      await run(makeConfig({ phase: "implement" }));

      expect(mockReconcileImplement).toHaveBeenCalled();
      expect(mockReconcileFeature).not.toHaveBeenCalled();
    });
  });

  describe("GitHub sync", () => {
    it("uses pre-resolved GitHub data when provided", async () => {
      const resolved = { repo: "test/repo", projectNumber: 1 } as any;

      await run(makeConfig({ resolved }));

      expect(mockSyncGitHubForEpic).toHaveBeenCalled();
      expect(mockSyncGitHub).not.toHaveBeenCalled();
    });

    it("discovers and syncs when github.enabled and no pre-resolved", async () => {
      mockDiscoverGitHub.mockImplementation(async () => ({
        repo: "test/repo",
        projectNumber: 1,
      }));

      await run(makeConfig({
        config: {
          hitl: { model: "claude-sonnet-4-5-20250514", timeout: 30, design: "", plan: "", implement: "", validate: "", release: "" },
          github: { enabled: true, "project-name": "test" },
          cli: {},
        } as BeastmodeConfig,
      }));

      expect(mockDiscoverGitHub).toHaveBeenCalled();
      expect(mockSyncGitHub).toHaveBeenCalled();
    });

    it("skips sync when github.enabled is false and no resolved", async () => {
      await run(makeConfig());

      expect(mockDiscoverGitHub).not.toHaveBeenCalled();
      expect(mockSyncGitHub).not.toHaveBeenCalled();
      expect(mockSyncGitHubForEpic).not.toHaveBeenCalled();
    });
  });

  describe("design slug rename", () => {
    it("calls store.rename when reconcile produces a different slug", async () => {
      mockReconcileDesign.mockImplementation(async () => ({
        phase: "plan",
        manifest: { slug: "test-epic", epic: "real-epic-name" },
      }));

      await run(makeConfig({ phase: "design" }));

      expect(mockStoreRename).toHaveBeenCalled();
    });

    it("skips rename when epic name matches current slug", async () => {
      mockReconcileDesign.mockImplementation(async () => ({
        phase: "plan",
        manifest: { slug: "test-epic", epic: "test-epic" },
      }));

      await run(makeConfig({ phase: "design" }));

      expect(mockStoreRename).not.toHaveBeenCalled();
    });
  });

  describe("error resilience", () => {
    it("continues after reconciliation failure", async () => {
      mockReconcilePlan.mockImplementation(async () => {
        throw new Error("reconcile kaboom");
      });

      const result = await run(makeConfig());

      // Should still succeed — reconcile failure is non-blocking
      expect(result.success).toBe(true);
      // Tag creation still attempted
      expect(mockCreateTag).toHaveBeenCalled();
    });

    it("continues after tag creation failure", async () => {
      mockCreateTag.mockImplementation(async () => {
        throw new Error("tag kaboom");
      });

      const result = await run(makeConfig());

      expect(result.success).toBe(true);
    });

    it("returns failure when release cleanup throws", async () => {
      mockArchive.mockImplementation(async () => {
        throw new Error("archive kaboom");
      });

      const result = await run(makeConfig({ phase: "release" }));

      expect(result.success).toBe(false);
    });
  });

  describe("skipWorktreeSetup", () => {
    it("computes worktree path without calling create", async () => {
      const result = await run(makeConfig({ skipWorktreeSetup: true }));

      expect(result.success).toBe(true);
      expect(mockCreate).not.toHaveBeenCalled();
      // Rebase should still run
      expect(mockRebase).toHaveBeenCalled();
    });
  });
});
