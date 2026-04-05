/**
 * Unit tests for syncGitHub — GitHub sync engine.
 *
 * Mocks the gh.ts module so no real GitHub CLI calls are made.
 * Verifies reconciliation logic, bootstrap write-back, label
 * blast-replace, feature lifecycle, and warn-and-continue behavior.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";

// --- Mock infrastructure ---

/** Track all mock calls for assertions. */
const mockCalls: { fn: string; args: unknown[] }[] = [];

/** Configurable per-test return values. */
let mockReturns: Record<string, unknown> = {};

/** Per-function error triggers — when set, the mock throws. */
let mockErrors: Record<string, boolean> = {};

function resetMocks(): void {
  mockCalls.length = 0;
  mockReturns = {};
  mockErrors = {};
}

function trackCall(fn: string, ...args: unknown[]): void {
  mockCalls.push({ fn, args });
}

function callsTo(fn: string): { fn: string; args: unknown[] }[] {
  return mockCalls.filter((c) => c.fn === fn);
}

// Mock the gh module BEFORE importing github-sync
vi.mock("../github/cli", () => ({
  ghIssueCreate: async (...args: unknown[]) => {
    trackCall("ghIssueCreate", ...args);
    if (mockErrors.ghIssueCreate) return undefined;
    return mockReturns.ghIssueCreate ?? 42;
  },
  ghIssueEdit: async (...args: unknown[]) => {
    trackCall("ghIssueEdit", ...args);
    if (mockErrors.ghIssueEdit) return false;
    return mockReturns.ghIssueEdit ?? true;
  },
  ghIssueClose: async (...args: unknown[]) => {
    trackCall("ghIssueClose", ...args);
    if (mockErrors.ghIssueClose) return false;
    return mockReturns.ghIssueClose ?? true;
  },
  ghIssueComment: async (...args: unknown[]) => {
    trackCall("ghIssueComment", ...args);
    if (mockErrors.ghIssueComment) return false;
    return mockReturns.ghIssueComment ?? true;
  },
  ghIssueComments: async (...args: unknown[]) => {
    trackCall("ghIssueComments", ...args);
    if (mockErrors.ghIssueComments) return undefined;
    return mockReturns.ghIssueComments ?? [];
  },
  ghIssueState: async (...args: unknown[]) => {
    trackCall("ghIssueState", ...args);
    if (mockErrors.ghIssueState) return undefined;
    return mockReturns.ghIssueState ?? "open";
  },
  ghIssueReopen: async (...args: unknown[]) => {
    trackCall("ghIssueReopen", ...args);
    if (mockErrors.ghIssueReopen) return false;
    return mockReturns.ghIssueReopen ?? true;
  },
  ghIssueLabels: async (...args: unknown[]) => {
    trackCall("ghIssueLabels", ...args);
    if (mockErrors.ghIssueLabels) return undefined;
    return mockReturns.ghIssueLabels ?? ["type/epic", "phase/design"];
  },
  ghProjectItemAdd: async (...args: unknown[]) => {
    trackCall("ghProjectItemAdd", ...args);
    if (mockErrors.ghProjectItemAdd) return undefined;
    return mockReturns.ghProjectItemAdd ?? "item-123";
  },
  ghProjectSetField: async (...args: unknown[]) => {
    trackCall("ghProjectSetField", ...args);
    if (mockErrors.ghProjectSetField) return false;
    return mockReturns.ghProjectSetField ?? true;
  },
  ghSubIssueAdd: async (...args: unknown[]) => {
    trackCall("ghSubIssueAdd", ...args);
    if (mockErrors.ghSubIssueAdd) return false;
    return mockReturns.ghSubIssueAdd ?? true;
  },
  ghProjectItemDelete: async (...args: unknown[]) => {
    trackCall("ghProjectItemDelete", ...args);
    if (mockErrors.ghProjectItemDelete) return false;
    return mockReturns.ghProjectItemDelete ?? true;
  },
}));

// NOW import the module under test
import { syncGitHub } from "../github/sync";
import type { EpicSyncInput, FeatureSyncInput } from "../github/sync";
import type { SyncRefs } from "../github/sync-refs";
import type { BeastmodeConfig } from "../config";
import type { ResolvedGitHub } from "../github/discovery";

// --- Test helpers ---

function makeTestConfig(overrides: Partial<BeastmodeConfig["github"]> = {}): BeastmodeConfig {
  return {
    github: {
      enabled: true,
      ...overrides,
    },
    cli: { interval: 60 },
    hitl: { timeout: 30 },
    "file-permissions": { timeout: 60, "claude-settings": "" },
  };
}

function makeTestResolved(overrides: Partial<ResolvedGitHub> = {}): ResolvedGitHub {
  return {
    repo: "org/repo",
    ...overrides,
  };
}

function makeTestResolvedWithProject(overrides: Partial<ResolvedGitHub> = {}): ResolvedGitHub {
  return {
    repo: "org/repo",
    projectNumber: 7,
    projectId: "PVT_123",
    fieldId: "PVTSSF_456",
    fieldOptions: {
      Backlog: "opt-backlog",
      Design: "opt-design",
      Plan: "opt-plan",
      Implement: "opt-implement",
      Validate: "opt-validate",
      Release: "opt-release",
      Done: "opt-done",
    },
    ...overrides,
  };
}

function makeTestEpicInput(overrides: Partial<EpicSyncInput> = {}): EpicSyncInput {
  return {
    id: "bm-1234",
    slug: "test-epic",
    name: "Test Epic",
    phase: "design",
    features: [],
    artifacts: {},
    ...overrides,
  };
}

function makeTestFeatureInput(overrides: Partial<FeatureSyncInput> = {}): FeatureSyncInput {
  return {
    id: "bm-1234.1",
    slug: "feat-a",
    status: "pending",
    plan: "plan-a.md",
    ...overrides,
  };
}

function makeTestSyncRefs(overrides: Partial<SyncRefs> = {}): SyncRefs {
  return {
    "bm-1234": { issue: 10 },
    ...overrides,
  };
}

describe("syncGitHub", () => {
  beforeEach(resetMocks);

  test("returns immediately with warning when GitHub is disabled", async () => {
    const epic = makeTestEpicInput();
    const syncRefs = makeTestSyncRefs();
    const config = makeTestConfig({ enabled: false });
    const resolved = makeTestResolved();

    const result = await syncGitHub(epic, syncRefs, config, resolved);

    expect(result.warnings).toContain("GitHub sync disabled in config");
    expect(mockCalls).toHaveLength(0);
    expect(result.epicCreated).toBe(false);
    expect(result.featuresCreated).toBe(0);
  });

  test("uses resolved.repo for all GitHub operations", async () => {
    const epic = makeTestEpicInput();
    const syncRefs = {};
    const config = makeTestConfig();
    const resolved = makeTestResolved({ repo: "custom/repo" });
    mockReturns.ghIssueCreate = 99;

    await syncGitHub(epic, syncRefs, config, resolved);

    const createCalls = callsTo("ghIssueCreate");
    expect(createCalls[0].args[0]).toBe("custom/repo");
  });

  test("creates epic when syncRefs has no issue for epic", async () => {
    const epic = makeTestEpicInput();
    const syncRefs = {};
    mockReturns.ghIssueCreate = 99;
    const config = makeTestConfig();
    const resolved = makeTestResolved();

    const result = await syncGitHub(epic, syncRefs, config, resolved);

    expect(result.epicCreated).toBe(true);
    expect(result.epicNumber).toBe(99);

    const epicMutation = result.mutations.find(m => m.type === "setEpic");
    expect(epicMutation).toBeDefined();
    expect(epicMutation!.type === "setEpic" && epicMutation!.entityId).toBe("bm-1234");
  });

  test("creates feature issue when feature has no sync ref", async () => {
    const feature = makeTestFeatureInput({ slug: "new-feat", status: "pending" });
    const epic = makeTestEpicInput({ features: [feature] });
    const syncRefs = makeTestSyncRefs();
    mockReturns.ghIssueCreate = 50;
    const config = makeTestConfig();
    const resolved = makeTestResolved();

    const result = await syncGitHub(epic, syncRefs, config, resolved);

    expect(result.featuresCreated).toBe(1);
    const featureMutation = result.mutations.find(m => m.type === "setFeatureIssue");
    expect(featureMutation).toBeDefined();
    expect(featureMutation!.type === "setFeatureIssue" && featureMutation!.entityId).toBe("bm-1234.1");
  });

  test("closes the issue when feature status is completed", async () => {
    const feature = makeTestFeatureInput({
      slug: "done-feat",
      status: "completed",
    });
    const epic = makeTestEpicInput({ features: [feature] });
    const syncRefs = makeTestSyncRefs({
      "bm-1234.1": { issue: 25 },
    });
    const config = makeTestConfig();
    const resolved = makeTestResolved();

    const result = await syncGitHub(epic, syncRefs, config, resolved);

    expect(result.featuresClosed).toBe(1);
    const closeCalls = callsTo("ghIssueClose");
    expect(closeCalls.find((c) => c.args[1] === 25)).toBeDefined();
  });

  test("closes epic when phase is done", async () => {
    const epic = makeTestEpicInput({ phase: "done" });
    const syncRefs = makeTestSyncRefs();
    const config = makeTestConfig();
    const resolved = makeTestResolved();

    const result = await syncGitHub(epic, syncRefs, config, resolved);

    expect(result.epicClosed).toBe(true);
    const closeCalls = callsTo("ghIssueClose");
    expect(closeCalls.find((c) => c.args[1] === 10)).toBeDefined();
  });

  test("updates board status when resolved has project metadata", async () => {
    const epic = makeTestEpicInput({ phase: "implement" });
    const syncRefs = makeTestSyncRefs();
    const config = makeTestConfig();
    const resolved = makeTestResolvedWithProject();

    await syncGitHub(epic, syncRefs, config, resolved);

    const addCalls = callsTo("ghProjectItemAdd");
    expect(addCalls.length).toBeGreaterThanOrEqual(1);
    expect(addCalls[0].args[0]).toBe(7);
    expect(addCalls[0].args[1]).toBe("org");
    expect(addCalls[0].args[2]).toBe("https://github.com/org/repo/issues/10");
  });

  test("skips project sync when resolved lacks project metadata", async () => {
    const epic = makeTestEpicInput({ phase: "design" });
    const syncRefs = makeTestSyncRefs();
    const config = makeTestConfig();
    const resolved = makeTestResolved();

    await syncGitHub(epic, syncRefs, config, resolved);

    const addCalls = callsTo("ghProjectItemAdd");
    expect(addCalls).toHaveLength(0);
  });

  test("removes phase label and adds new one on blast-replace", async () => {
    const epic = makeTestEpicInput({ phase: "implement" });
    const syncRefs = makeTestSyncRefs();
    mockReturns.ghIssueLabels = ["type/epic", "phase/design", "phase/plan"];
    const config = makeTestConfig();
    const resolved = makeTestResolved();

    await syncGitHub(epic, syncRefs, config, resolved);

    const editCalls = callsTo("ghIssueEdit");
    const epicLabelEdit = editCalls.find(
      (c) => c.args[0] === "org/repo" && c.args[1] === 10 &&
        (c.args[2] as Record<string, unknown>).removeLabels !== undefined,
    );
    expect(epicLabelEdit).toBeDefined();
    const edits = epicLabelEdit!.args[2] as {
      removeLabels: string[];
      addLabels: string[];
    };
    expect(edits.removeLabels).toContain("phase/design");
    expect(edits.removeLabels).toContain("phase/plan");
    expect(edits.addLabels).toEqual(["phase/implement"]);
  });

  test("skips phase label update when already correct", async () => {
    const epic = makeTestEpicInput({ phase: "design" });
    const syncRefs = makeTestSyncRefs();
    mockReturns.ghIssueLabels = ["type/epic", "phase/design"];
    const config = makeTestConfig();
    const resolved = makeTestResolved();

    await syncGitHub(epic, syncRefs, config, resolved);

    const labelEditCalls = callsTo("ghIssueEdit").filter(
      (c) => c.args[1] === 10 &&
        (c.args[2] as Record<string, unknown>).removeLabels !== undefined,
    );
    expect(labelEditCalls).toHaveLength(0);
  });

  test("links created feature as sub-issue of epic", async () => {
    const feature = makeTestFeatureInput({ slug: "linked-feat" });
    const epic = makeTestEpicInput({ features: [feature] });
    const syncRefs = makeTestSyncRefs();
    mockReturns.ghIssueCreate = 60;
    const config = makeTestConfig();
    const resolved = makeTestResolved();

    await syncGitHub(epic, syncRefs, config, resolved);

    const subCalls = callsTo("ghSubIssueAdd");
    expect(subCalls).toHaveLength(1);
    expect(subCalls[0].args[0]).toBe("org/repo");
    expect(subCalls[0].args[1]).toBe(10);
    expect(subCalls[0].args[2]).toBe(60);
  });

  test("returns early with warning on epic creation failure", async () => {
    const feature = makeTestFeatureInput();
    const epic = makeTestEpicInput({ features: [feature] });
    const syncRefs = {};
    mockErrors.ghIssueCreate = true;
    const config = makeTestConfig();
    const resolved = makeTestResolved();

    const result = await syncGitHub(epic, syncRefs, config, resolved);

    expect(result.warnings).toContain("Failed to create epic issue");
    expect(result.epicCreated).toBe(false);
    const labelCalls = callsTo("ghIssueLabels");
    expect(labelCalls).toHaveLength(0);
  });

  test("warns when feature creation fails", async () => {
    const feature = makeTestFeatureInput({ slug: "fail-feat" });
    const epic = makeTestEpicInput({ features: [feature] });
    const syncRefs = makeTestSyncRefs();
    mockErrors.ghIssueCreate = true;
    const config = makeTestConfig();
    const resolved = makeTestResolved();

    const result = await syncGitHub(epic, syncRefs, config, resolved);

    expect(result.featuresCreated).toBe(0);
    expect(result.warnings).toContain("Failed to create issue for feature fail-feat");
  });

  test("handles multiple features with mixed states", async () => {
    const feat1 = makeTestFeatureInput({ id: "bm-1234.1", slug: "done-1", status: "completed" });
    const feat2 = makeTestFeatureInput({ id: "bm-1234.2", slug: "active-1", status: "in-progress" });
    const feat3 = makeTestFeatureInput({ id: "bm-1234.3", slug: "new-1", status: "pending" });
    const epic = makeTestEpicInput({ features: [feat1, feat2, feat3], phase: "implement" });
    const syncRefs = makeTestSyncRefs({
      "bm-1234.1": { issue: 31 },
      "bm-1234.2": { issue: 32 },
    });
    mockReturns.ghIssueLabels = ["status/ready"];
    mockReturns.ghIssueCreate = 33;
    const config = makeTestConfig();
    const resolved = makeTestResolved();

    const result = await syncGitHub(epic, syncRefs, config, resolved);

    expect(result.featuresClosed).toBe(1);
    expect(result.featuresCreated).toBe(1);
    expect(result.labelsUpdated).toBeGreaterThanOrEqual(1);
  });

  test("removes feature from project board", async () => {
    const feature = makeTestFeatureInput({ slug: "board-feat", status: "in-progress" });
    const epic = makeTestEpicInput({ features: [feature] });
    const syncRefs = makeTestSyncRefs({ "bm-1234.1": { issue: 40 } });
    const config = makeTestConfig();
    const resolved = makeTestResolvedWithProject();
    mockReturns.ghIssueLabels = ["status/in-progress"];

    await syncGitHub(epic, syncRefs, config, resolved);

    const addCalls = callsTo("ghProjectItemAdd");
    expect(addCalls.length).toBeGreaterThanOrEqual(2);
    const deleteCalls = callsTo("ghProjectItemDelete");
    expect(deleteCalls.length).toBeGreaterThanOrEqual(1);
  });

  test("includes correct phase in epic labels on creation", async () => {
    const epic = makeTestEpicInput({ phase: "implement" });
    const syncRefs = {};
    mockReturns.ghIssueCreate = 77;
    const config = makeTestConfig();
    const resolved = makeTestResolved();

    await syncGitHub(epic, syncRefs, config, resolved);

    const createCalls = callsTo("ghIssueCreate");
    expect(createCalls[0].args[2]).toContain("**Phase:** implement");
    expect(createCalls[0].args[3]).toEqual(["type/epic", "phase/implement"]);
  });

  test("continues syncing after one feature fails", async () => {
    const feat1 = makeTestFeatureInput({ id: "bm-1234.1", slug: "feat-ok", status: "pending" });
    const feat2 = makeTestFeatureInput({ id: "bm-1234.2", slug: "feat-ok-2", status: "pending" });
    const epic = makeTestEpicInput({ features: [feat1, feat2] });
    const syncRefs = makeTestSyncRefs({
      "bm-1234.1": { issue: 30 },
      "bm-1234.2": { issue: 31 },
    });
    mockReturns.ghIssueLabels = ["status/ready"];
    const config = makeTestConfig();
    const resolved = makeTestResolved();

    await syncGitHub(epic, syncRefs, config, resolved);

    const labelCalls = callsTo("ghIssueLabels");
    expect(labelCalls.length).toBeGreaterThanOrEqual(3);
  });

  describe("retry-queue integration", () => {
    test("enqueues bodyEnrich when epic body update fails", async () => {
      const epic = makeTestEpicInput();
      const syncRefs = makeTestSyncRefs({ "bm-1234": { issue: 10, bodyHash: "stale-hash" } });
      mockErrors.ghIssueEdit = true;
      const config = makeTestConfig();
      const resolved = makeTestResolved();

      const result = await syncGitHub(epic, syncRefs, config, resolved);

      const enqueueMuts = result.mutations.filter((m) => m.type === "enqueuePendingOp");
      expect(enqueueMuts.length).toBeGreaterThanOrEqual(1);
      const bodyMut = enqueueMuts.find((m) => m.type === "enqueuePendingOp" && (m as any).opType === "bodyEnrich");
      expect(bodyMut).toBeDefined();
    });

    test("enqueues labelSync when epic label fetch fails", async () => {
      const epic = makeTestEpicInput();
      const syncRefs = makeTestSyncRefs();
      mockErrors.ghIssueLabels = true;
      const config = makeTestConfig();
      const resolved = makeTestResolved();

      const result = await syncGitHub(epic, syncRefs, config, resolved);

      const enqueueMuts = result.mutations.filter((m) => m.type === "enqueuePendingOp");
      const labelMut = enqueueMuts.find((m) => m.type === "enqueuePendingOp" && (m as any).opType === "labelSync");
      expect(labelMut).toBeDefined();
    });

    test("enqueues subIssueLink when sub-issue linking fails", async () => {
      const feature = makeTestFeatureInput();
      const epic = makeTestEpicInput({ features: [feature] });
      const syncRefs = makeTestSyncRefs();
      mockErrors.ghSubIssueAdd = true;
      mockReturns.ghIssueCreate = 50;
      const config = makeTestConfig();
      const resolved = makeTestResolved();

      const result = await syncGitHub(epic, syncRefs, config, resolved);

      const enqueueMuts = result.mutations.filter((m) => m.type === "enqueuePendingOp");
      const linkMut = enqueueMuts.find((m) => m.type === "enqueuePendingOp" && (m as any).opType === "subIssueLink");
      expect(linkMut).toBeDefined();
    });

    test("enqueues bodyEnrich when feature body update fails", async () => {
      const feature = makeTestFeatureInput();
      const epic = makeTestEpicInput({ features: [feature] });
      const syncRefs = makeTestSyncRefs({
        "bm-1234": { issue: 10 },
        "bm-1234.1": { issue: 20, bodyHash: "stale" },
      });
      mockErrors.ghIssueEdit = true;
      const config = makeTestConfig();
      const resolved = makeTestResolved();

      const result = await syncGitHub(epic, syncRefs, config, resolved);

      const enqueueMuts = result.mutations.filter((m) => m.type === "enqueuePendingOp");
      const bodyMut = enqueueMuts.find((m) => m.type === "enqueuePendingOp" && (m as any).opType === "bodyEnrich" && (m as any).entityId === "bm-1234.1");
      expect(bodyMut).toBeDefined();
    });

    test("enqueues labelSync when feature label fetch fails", async () => {
      const feature = makeTestFeatureInput({ status: "in-progress" });
      const epic = makeTestEpicInput({ features: [feature] });
      const syncRefs = makeTestSyncRefs({
        "bm-1234": { issue: 10 },
        "bm-1234.1": { issue: 20 },
      });
      mockErrors.ghIssueLabels = true;
      const config = makeTestConfig();
      const resolved = makeTestResolved();

      const result = await syncGitHub(epic, syncRefs, config, resolved);

      const enqueueMuts = result.mutations.filter((m) => m.type === "enqueuePendingOp");
      const labelMut = enqueueMuts.find((m) => m.type === "enqueuePendingOp" && (m as any).opType === "labelSync" && (m as any).entityId === "bm-1234.1");
      expect(labelMut).toBeDefined();
    });
  });
});
