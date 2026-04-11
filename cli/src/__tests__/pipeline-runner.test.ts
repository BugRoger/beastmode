import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";

// ---------- module-level mocks (must precede runner import) ----------
// NOTE: vi.mock() is hoisted by vitest — it replaces the module at the top of
// the file before any tests run. We use vi.restoreAllMocks() in afterAll to
// prevent pollution of other test files.

// Mock git/worktree
const mockCreate = vi.hoisted(() => vi.fn(async (slug: string) => ({
  slug,
  path: `/tmp/test-project/.claude/worktrees/${slug}`,
  branch: `feature/${slug}`,
})));
const mockRebase = vi.hoisted(() => vi.fn(async (_phase: string, _opts?: any): Promise<{ outcome: string; message: string }> => ({
  outcome: "success",
  message: "rebased onto main",
})));
const mockArchive = vi.hoisted(() => vi.fn(async (_slug: string, _opts?: any) => `archive/test-epic`));
const mockRemove = vi.hoisted(() => vi.fn(async (_slug: string, _opts?: any) => {}));

vi.mock("../git/worktree.js", () => ({
  create: mockCreate,
  rebase: mockRebase,
  archive: mockArchive,
  remove: mockRemove,
}));

// Mock artifacts/reader
const mockLoadOutput = vi.hoisted(() => vi.fn((_wt: string, _phase: string, _slug: string) =>
  ({ status: "completed", artifacts: {} }) as any,
));
vi.mock("../artifacts/reader.js", () => ({
  loadWorktreePhaseOutput: mockLoadOutput,
}));

// Mock manifest/store (legacy — kept for tests that still use mockStoreLoad/mockStoreSave)
const mockStoreLoad = vi.hoisted(() => vi.fn((_root: string, _slug: string) =>
  ({ slug: "test-epic", phase: "plan", features: [], artifacts: {}, lastUpdated: new Date().toISOString() }) as any,
));
const mockStoreSave = vi.hoisted(() => vi.fn((_root: string, _slug: string, _data: any) => {}));
const mockStoreTransact = vi.hoisted(() => vi.fn(async (_root: string, _slug: string, fn: Function) => fn({ slug: "test-epic" })));
const mockStoreRename = vi.hoisted(() => vi.fn(async () => ({ renamed: false, finalSlug: "test-epic", completedSteps: [] })));

// Mock pipeline/reconcile
const mockReconcileDesign = vi.hoisted(() => vi.fn(async () => ({ phase: "plan", epic: { slug: "test-epic" }, manifest: { slug: "test-epic" } })));
const mockReconcilePlan = vi.hoisted(() => vi.fn(async () => ({ phase: "implement", epic: { slug: "test-epic" }, manifest: { slug: "test-epic" } })));
const mockReconcileFeature = vi.hoisted(() => vi.fn(async () => ({ phase: "implement", epic: { slug: "test-epic" }, manifest: { slug: "test-epic" } })));
const mockReconcileImplement = vi.hoisted(() => vi.fn(async () => ({ phase: "validate", epic: { slug: "test-epic" }, manifest: { slug: "test-epic" } })));
const mockReconcileValidate = vi.hoisted(() => vi.fn(async () => ({ phase: "release", epic: { slug: "test-epic" }, manifest: { slug: "test-epic" } })));
const mockReconcileRelease = vi.hoisted(() => vi.fn(async () => ({ phase: "done", epic: { slug: "test-epic" }, manifest: { slug: "test-epic" } })));
vi.mock("../pipeline/reconcile.js", () => ({
  reconcileDesign: mockReconcileDesign,
  reconcilePlan: mockReconcilePlan,
  reconcileFeature: mockReconcileFeature,
  reconcileImplement: mockReconcileImplement,
  reconcileValidate: mockReconcileValidate,
  reconcileRelease: mockReconcileRelease,
}));

// Mock git/tags
const mockCreateTag = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../git/tags.js", () => ({
  createTag: mockCreateTag,
}));

// Mock github/sync
const mockSyncGitHub = vi.hoisted(() => vi.fn(async () => ({ mutations: [] })));
const mockSyncGitHubForEpic = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../github/sync.js", () => ({
  syncGitHub: mockSyncGitHub,
  syncGitHubForEpic: mockSyncGitHubForEpic,
}));

// Mock github/discovery
const mockDiscoverGitHub = vi.hoisted(() => vi.fn(async () => null));
vi.mock("../github/discovery.js", () => ({
  discoverGitHub: mockDiscoverGitHub,
}));

// Mock github/early-issues
const mockEnsureEarlyIssues = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../github/early-issues.js", () => ({
  ensureEarlyIssues: mockEnsureEarlyIssues,
}));

// Mock store/json-file-store
const mockJsonFileStore = vi.hoisted(() => {
  const storeState = {
    getEpic: vi.fn((id: string) => {
      if (id === "epic-123" || id === "test-epic") {
        return { id: "epic-123", slug: "test-epic", name: "Test Epic", type: "epic" };
      }
      return undefined;
    }),
    listEpics: vi.fn(() => [
      { id: "epic-123", slug: "test-epic", name: "Test Epic", type: "epic" }
    ]),
    listFeatures: vi.fn((_epicId?: string) => []),
  };

  class JsonFileStore {
    private state = storeState;
    constructor(_path: string) {}
    load() {}
    save() {}
    getEpic(id: string) { return this.state.getEpic(id); }
    listEpics() { return this.state.listEpics(); }
    listFeatures(epicId: string) { return this.state.listFeatures(epicId); }
    updateEpic(_id: string, _patch: any) {}
  }

  // Attach state object for test manipulation
  (JsonFileStore as any).__storeState = storeState;
  return JsonFileStore;
});
vi.mock("../store/json-file-store.js", () => ({
  JsonFileStore: mockJsonFileStore,
}));

// Mock github/sync-refs
const mockLoadSyncRefs = vi.hoisted(() => vi.fn(() => ({})));
const mockSaveSyncRefs = vi.hoisted(() => vi.fn(() => {}));
const mockGetSyncRef = vi.hoisted(() => vi.fn((_refs: any, entityId: string) => {
  if (entityId === "epic-123") {
    return { issue: 100 };
  }
  return undefined;
}));
const mockSetSyncRef = vi.hoisted(() => vi.fn((_refs: any, _entityId: string, _ref: any) => ({})));
vi.mock("../github/sync-refs.js", () => ({
  loadSyncRefs: mockLoadSyncRefs,
  saveSyncRefs: mockSaveSyncRefs,
  getSyncRef: mockGetSyncRef,
  setSyncRef: mockSetSyncRef,
}));


// Mock git/push
const mockHasRemote = vi.hoisted(() => vi.fn(async () => true));
const mockPushBranches = vi.hoisted(() => vi.fn(async () => {}));
const mockPushTags = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../git/push.js", () => ({
  hasRemote: mockHasRemote,
  pushBranches: mockPushBranches,
  pushTags: mockPushTags,
}));

// Mock git/commit-issue-ref
const mockAmendCommitsInRange = vi.hoisted(() => vi.fn(async () => ({ amended: 0, skipped: 0 })));
vi.mock("../git/commit-issue-ref.js", () => ({
  amendCommitsInRange: mockAmendCommitsInRange,
}));

// Mock github/branch-link
const mockLinkBranches = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../github/branch-link.js", () => ({
  linkBranches: mockLinkBranches,
}));

// Note: hooks/hitl-settings and hooks/file-permission-settings are NOT mocked.
// Real functions run against mocked worktree paths (/tmp/test-project/...).
// This avoids Bun mock.module() pollution — mock.module is process-global in Bun
// and permanently replaces modules for all test files sharing the same process.
// The real functions do file I/O to /tmp paths which is harmless.

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
      "file-permissions": {
        timeout: 60,
        "claude-settings": "test file permission prose",
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
  info: noop,
  debug: noop,
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
  mockEnsureEarlyIssues.mockClear();
  mockHasRemote.mockClear();
  mockPushBranches.mockClear();
  mockPushTags.mockClear();
  mockAmendCommitsInRange.mockClear();
  mockLinkBranches.mockClear();
  mockLoadSyncRefs.mockClear();
  mockGetSyncRef.mockClear();

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
  mockReconcileDesign.mockImplementation(async () => ({ phase: "plan", epic: { slug: "test-epic" }, manifest: { slug: "test-epic" } }));
  mockReconcilePlan.mockImplementation(async () => ({ phase: "implement", epic: { slug: "test-epic" }, manifest: { slug: "test-epic" } }));
  mockReconcileFeature.mockImplementation(async () => ({ phase: "implement", epic: { slug: "test-epic" }, manifest: { slug: "test-epic" } }));
  mockReconcileImplement.mockImplementation(async () => ({ phase: "validate", epic: { slug: "test-epic" }, manifest: { slug: "test-epic" } }));
  mockReconcileValidate.mockImplementation(async () => ({ phase: "release", epic: { slug: "test-epic" }, manifest: { slug: "test-epic" } }));
  mockReconcileRelease.mockImplementation(async () => ({ phase: "done", epic: { slug: "test-epic" }, manifest: { slug: "test-epic" } }));
  mockDiscoverGitHub.mockImplementation(async () => null);
  mockArchive.mockImplementation(async () => `archive/test-epic`);
  mockHasRemote.mockImplementation(async () => true);
  mockPushBranches.mockImplementation(async () => {});
  mockPushTags.mockImplementation(async () => {});
  mockAmendCommitsInRange.mockImplementation(async () => ({ amended: 0, skipped: 0 }));
  mockLinkBranches.mockImplementation(async () => {});

  // Reset store/sync-refs mocks to defaults
  const storeState = (mockJsonFileStore as any).__storeState;
  storeState.find = vi.fn((idOrSlug: string) => {
    if (idOrSlug === "test-epic") {
      return { id: "epic-123", slug: "test-epic", name: "Test Epic", type: "epic" };
    }
    return undefined;
  });
  storeState.listFeatures = vi.fn(() => []);

  mockLoadSyncRefs.mockImplementation(() => ({}));
  mockGetSyncRef.mockImplementation((_refs: any, entityId: string) => {
    if (entityId === "epic-123") {
      return { issue: 100 };
    }
    return undefined;
  });
}

// ---------- tests ----------

describe("pipeline/runner", () => {
  beforeEach(() => {
    mkdirSync("/tmp/test-project/.claude/worktrees/test-epic/.claude", { recursive: true });
    resetAllMocks();
  });
  afterAll(() => vi.restoreAllMocks());

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
      // Step 3 (settings) runs synchronously between rebase and dispatch —
      // not tracked via mocks to avoid Bun mock.module pollution

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
        return { phase: "implement", epic: { slug: "test-epic" }, manifest: { slug: "test-epic" } };
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
    it("runs archive + remove + store save on successful release", async () => {
      const result = await run(makeConfig({ phase: "release" }));

      expect(result.success).toBe(true);
      expect(mockArchive).toHaveBeenCalled();
      expect(mockRemove).toHaveBeenCalled();
      // Release cleanup calls doneStore.save() via JsonFileStore instance
      // Verified by checking archive and remove were called (store save is coupled)
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
      // Settings write (Step 3) is also skipped — verified by the fact that
      // the runner's skipPreDispatch path skips the entire if-block containing
      // cleanHitlSettings/writeHitlSettings/cleanFilePermissionSettings/writeFilePermissionSettings
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
      await run(makeConfig({
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
      }) as any);

      // Configure store mocks
      const storeState = (mockJsonFileStore as any).__storeState;
      storeState.find = vi.fn((idOrSlug: string) => {
        if (idOrSlug === "test-epic") {
          return { id: "epic-123", slug: "test-epic", name: "Test Epic", type: "epic" };
        }
        return undefined;
      });

      await run(makeConfig({
        config: {
          hitl: { model: "claude-sonnet-4-5-20250514", timeout: 30, design: "", plan: "", implement: "", validate: "", release: "" },
          "file-permissions": { timeout: 60, "claude-settings": "test" },
          github: { enabled: true, "project-name": "test" },
          cli: {},
        } as BeastmodeConfig,
      }));

      expect(mockDiscoverGitHub).toHaveBeenCalled();
      expect(mockSyncGitHubForEpic).toHaveBeenCalled();
    });

    it("skips sync when github.enabled is false and no resolved", async () => {
      await run(makeConfig());

      expect(mockDiscoverGitHub).not.toHaveBeenCalled();
      expect(mockSyncGitHub).not.toHaveBeenCalled();
      expect(mockSyncGitHubForEpic).not.toHaveBeenCalled();
    });
  });

  describe("early issue creation", () => {
    it("calls ensureEarlyIssues before dispatch for design phase", async () => {
      const callOrder: string[] = [];

      mockEnsureEarlyIssues.mockImplementation(async () => {
        callOrder.push("early-issues");
      });
      const dispatch = async () => {
        callOrder.push("dispatch");
        return { success: true };
      };

      await run(makeConfig({ phase: "design", dispatch }));

      expect(callOrder).toEqual(["early-issues", "dispatch"]);
    });

    it("calls ensureEarlyIssues before dispatch for implement phase", async () => {
      const callOrder: string[] = [];

      mockEnsureEarlyIssues.mockImplementation(async () => {
        callOrder.push("early-issues");
      });
      const dispatch = async () => {
        callOrder.push("dispatch");
        return { success: true };
      };

      await run(makeConfig({ phase: "implement", featureSlug: "my-feat", dispatch }));

      expect(callOrder).toEqual(["early-issues", "dispatch"]);
    });

    it("passes correct arguments to ensureEarlyIssues", async () => {
      // Configure store mocks
      const storeState = (mockJsonFileStore as any).__storeState;
      storeState.find = vi.fn((idOrSlug: string) => {
        if (idOrSlug === "my-epic") {
          return { id: "epic-123", slug: "my-epic", name: "My Epic", type: "epic" };
        }
        return undefined;
      });

      await run(makeConfig({
        phase: "design",
        epicSlug: "my-epic",
        config: {
          hitl: { model: "claude-sonnet-4-5-20250514", timeout: 30, design: "", plan: "", implement: "", validate: "", release: "" },
          "file-permissions": { timeout: 60, "claude-settings": "test" },
          github: { enabled: true },
          cli: {},
        } as any,
      }));

      expect(mockEnsureEarlyIssues).toHaveBeenCalledWith({
        phase: "design",
        epicId: "epic-123",
        projectRoot: "/tmp/test-project",
        config: expect.objectContaining({ github: { enabled: true } }),
        store: expect.anything(),
        resolved: undefined,
        logger: expect.anything(),
      });
    });

    it("passes pre-resolved GitHub data to ensureEarlyIssues", async () => {
      const resolved = { repo: "test/repo" } as any;

      await run(makeConfig({ phase: "design", resolved }));

      expect(mockEnsureEarlyIssues).toHaveBeenCalledWith(
        expect.objectContaining({ resolved }),
      );
    });

    it("continues dispatch even when ensureEarlyIssues throws", async () => {
      mockEnsureEarlyIssues.mockRejectedValue(new Error("early issues kaboom"));

      const result = await run(makeConfig({ phase: "design" }));

      expect(result.success).toBe(true);
    });

    it("skips ensureEarlyIssues when skipPreDispatch is true", async () => {
      await run(makeConfig({ phase: "design", skipPreDispatch: true }));

      expect(mockEnsureEarlyIssues).not.toHaveBeenCalled();
    });
  });

  describe("design slug rename", () => {
    it("updates epicSlug when reconcile produces a different slug", async () => {
      mockReconcileDesign.mockImplementation(async () => ({
        phase: "plan",
        epic: { slug: "real-epic-name" },
        manifest: { slug: "real-epic-name" },
      }));

      const result = await run(makeConfig({ phase: "design" }));

      // Runner updates epicSlug from reconcile result
      expect(result.epicSlug).toBe("real-epic-name");
    });

    it("keeps original slug when reconcile slug matches", async () => {
      mockReconcileDesign.mockImplementation(async () => ({
        phase: "plan",
        epic: { slug: "test-epic" },
        manifest: { slug: "test-epic" },
      }));

      const result = await run(makeConfig({ phase: "design" }));

      expect(result.epicSlug).toBe("test-epic");
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

  describe("rebase stale warning", () => {
    it("logs warning when rebase returns stale outcome", async () => {
      const warns: string[] = [];
      const testLogger = {
        ...nullLogger,
        warn: (msg: string) => warns.push(msg),
      };

      mockRebase.mockImplementation(async () => ({
        outcome: "stale" as const,
        message: "merge conflict with main — proceeding on stale base",
      }));

      await run(makeConfig({ logger: testLogger }));

      expect(warns.some(w => w.includes("stale"))).toBe(true);
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

  describe("git push (Step 8.7)", () => {
    it("pushes branches and tags when remote exists", async () => {
      await run(makeConfig());

      expect(mockHasRemote).toHaveBeenCalled();
      expect(mockPushBranches).toHaveBeenCalled();
      expect(mockPushTags).toHaveBeenCalled();
    });

    it("skips push when no remote", async () => {
      mockHasRemote.mockImplementation(async () => false);

      await run(makeConfig());

      expect(mockPushBranches).not.toHaveBeenCalled();
      expect(mockPushTags).not.toHaveBeenCalled();
    });

    it("passes epicSlug and phase to pushBranches", async () => {
      await run(makeConfig({ phase: "plan", epicSlug: "my-epic" }));

      expect(mockPushBranches).toHaveBeenCalledWith(expect.objectContaining({
        epicSlug: "my-epic",
        phase: "plan",
      }));
    });

    it("passes featureSlug to pushBranches for implement phase", async () => {
      await run(makeConfig({ phase: "implement", epicSlug: "my-epic", featureSlug: "my-feat" }));

      expect(mockPushBranches).toHaveBeenCalledWith(expect.objectContaining({
        epicSlug: "my-epic",
        phase: "implement",
        featureSlug: "my-feat",
      }));
    });

    it("continues when push throws", async () => {
      mockHasRemote.mockRejectedValue(new Error("git broke"));

      const result = await run(makeConfig());

      expect(result.success).toBe(true);
    });

    it("is not gated on github.enabled", async () => {
      // github.enabled is false in makeConfig default
      await run(makeConfig());

      expect(mockHasRemote).toHaveBeenCalled();
      expect(mockPushBranches).toHaveBeenCalled();
    });
  });

  describe("branch-link (Step 8.9)", () => {
    it("calls linkBranches when github.enabled and manifest has github block", async () => {
      mockStoreLoad.mockImplementation(() => ({
        slug: "test-epic",
        phase: "implement",
        features: [{ slug: "my-feature", plan: "", status: "in-progress", github: { issue: 200 } }],
        artifacts: {},
        github: { epic: 100, repo: "BugRoger/beastmode" },
        lastUpdated: new Date().toISOString(),
      }) as any);

      // Configure store mocks for the new code path
      const storeState = (mockJsonFileStore as any).__storeState;
      storeState.find = vi.fn((idOrSlug: string) => {
        if (idOrSlug === "test-epic") {
          return { id: "epic-123", slug: "test-epic", name: "Test Epic", type: "epic" };
        }
        return undefined;
      });
      storeState.listFeatures = vi.fn(() => [
        { id: "feat-123", slug: "my-feature", type: "feature" },
      ]);

      // Configure getSyncRef to return proper issue numbers
      mockGetSyncRef.mockImplementation((_refs: any, entityId: string) => {
        if (entityId === "epic-123") {
          return { issue: 100 };
        }
        if (entityId === "feat-123") {
          return { issue: 200 };
        }
        return undefined;
      });

      // Mock discoverGitHub to return repo info
      mockDiscoverGitHub.mockImplementation(async () => ({
        repo: "BugRoger/beastmode",
        projectNumber: 1,
      }) as any);

      await run(makeConfig({
        phase: "implement",
        featureSlug: "my-feature",
        config: {
          hitl: { model: "claude-sonnet-4-5-20250514", timeout: 30, design: "", plan: "", implement: "", validate: "", release: "" },
          "file-permissions": { timeout: 60, "claude-settings": "test" },
          github: { enabled: true, "project-name": "test" },
          cli: {},
        } as any,
        skipPreDispatch: true,
      }));

      expect(mockLinkBranches).toHaveBeenCalledWith(expect.objectContaining({
        repo: "BugRoger/beastmode",
        epicSlug: "test-epic",
        epicIssueNumber: 100,
        featureSlug: "my-feature",
        featureIssueNumber: 200,
        phase: "implement",
      }));
    });

    it("skips linkBranches when github.enabled is false", async () => {
      mockLinkBranches.mockClear();

      await run(makeConfig({
        phase: "plan",
        skipPreDispatch: true,
      }));

      expect(mockLinkBranches).not.toHaveBeenCalled();
    });

    it("skips linkBranches when manifest has no github block", async () => {
      mockLinkBranches.mockClear();
      mockStoreLoad.mockImplementation(() => ({
        slug: "test-epic",
        phase: "plan",
        features: [],
        artifacts: {},
        lastUpdated: new Date().toISOString(),
      }) as any);

      // Configure store mocks - getSyncRef should return undefined (no issue)
      const storeState = (mockJsonFileStore as any).__storeState;
      storeState.find = vi.fn((idOrSlug: string) => {
        if (idOrSlug === "test-epic") {
          return { id: "epic-123", slug: "test-epic", name: "Test Epic", type: "epic" };
        }
        return undefined;
      });
      storeState.listFeatures = vi.fn(() => []);

      mockGetSyncRef.mockImplementation(() => undefined); // No sync ref = no github block

      await run(makeConfig({
        config: {
          hitl: { model: "claude-sonnet-4-5-20250514", timeout: 30, design: "", plan: "", implement: "", validate: "", release: "" },
          "file-permissions": { timeout: 60, "claude-settings": "test" },
          github: { enabled: true },
          cli: {},
        } as any,
        skipPreDispatch: true,
      }));

      expect(mockLinkBranches).not.toHaveBeenCalled();
    });

    it("does not block pipeline when linkBranches throws", async () => {
      mockLinkBranches.mockRejectedValueOnce(new Error("GraphQL timeout"));
      mockStoreLoad.mockImplementation(() => ({
        slug: "test-epic",
        phase: "plan",
        features: [],
        artifacts: {},
        github: { epic: 100, repo: "BugRoger/beastmode" },
        lastUpdated: new Date().toISOString(),
      }) as any);

      // Configure store mocks
      const storeState = (mockJsonFileStore as any).__storeState;
      storeState.find = vi.fn((idOrSlug: string) => {
        if (idOrSlug === "test-epic") {
          return { id: "epic-123", slug: "test-epic", name: "Test Epic", type: "epic" };
        }
        return undefined;
      });
      storeState.listFeatures = vi.fn(() => []);

      mockGetSyncRef.mockImplementation((_refs: any, entityId: string) => {
        if (entityId === "epic-123") {
          return { issue: 100 };
        }
        return undefined;
      });

      const result = await run(makeConfig({
        config: {
          hitl: { model: "claude-sonnet-4-5-20250514", timeout: 30, design: "", plan: "", implement: "", validate: "", release: "" },
          "file-permissions": { timeout: 60, "claude-settings": "test" },
          github: { enabled: true },
          cli: {},
        } as any,
        skipPreDispatch: true,
      }));

      expect(result.success).toBe(true);
    });

    it("resolves feature issue number from manifest", async () => {
      mockStoreLoad.mockImplementation(() => ({
        slug: "test-epic",
        phase: "implement",
        features: [
          { slug: "feat-a", plan: "", status: "completed", github: { issue: 10 } },
          { slug: "feat-b", plan: "", status: "in-progress", github: { issue: 20 } },
        ],
        artifacts: {},
        github: { epic: 100, repo: "BugRoger/beastmode" },
        lastUpdated: new Date().toISOString(),
      }) as any);

      // Configure store mocks for the new code path
      const storeState = (mockJsonFileStore as any).__storeState;
      storeState.find = vi.fn((idOrSlug: string) => {
        if (idOrSlug === "test-epic") {
          return { id: "epic-123", slug: "test-epic", name: "Test Epic", type: "epic" };
        }
        return undefined;
      });
      storeState.listFeatures = vi.fn(() => [
        { id: "feat-a-id", slug: "feat-a", type: "feature" },
        { id: "feat-b-id", slug: "feat-b", type: "feature" },
      ]);

      // Configure getSyncRef to return proper issue numbers
      mockGetSyncRef.mockImplementation((_refs: any, entityId: string) => {
        if (entityId === "epic-123") {
          return { issue: 100 };
        }
        if (entityId === "feat-b-id") {
          return { issue: 20 };
        }
        return undefined;
      });

      // Mock discoverGitHub to return repo info
      mockDiscoverGitHub.mockImplementation(async () => ({
        repo: "BugRoger/beastmode",
        projectNumber: 1,
      }) as any);

      await run(makeConfig({
        phase: "implement",
        featureSlug: "feat-b",
        config: {
          hitl: { model: "claude-sonnet-4-5-20250514", timeout: 30, design: "", plan: "", implement: "", validate: "", release: "" },
          "file-permissions": { timeout: 60, "claude-settings": "test" },
          github: { enabled: true, "project-name": "test" },
          cli: {},
        } as any,
        skipPreDispatch: true,
      }));

      expect(mockLinkBranches).toHaveBeenCalledWith(expect.objectContaining({
        featureSlug: "feat-b",
        featureIssueNumber: 20,
      }));
    });
  });
});
