/**
 * Unit tests for reconcileGitHub — the reconciliation engine.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";

// --- Mock Bun globals ---
globalThis.Bun = {
  CryptoHasher: class {
    constructor(_algo: string) {}
    update(_data: string) {}
    digest(_format: string) { return "abc123"; }
  },
  spawnSync: (_args: string[]) => ({ success: true, stdout: "", stderr: "" }),
} as any;

// --- Mock infrastructure ---

const mockCalls: { fn: string; args: unknown[] }[] = [];
let mockReturns: Record<string, unknown> = {};
let mockErrors: Record<string, boolean> = {};
let capturedWarnings: string[] = [];

function resetMocks(): void {
  mockCalls.length = 0;
  mockReturns = {};
  mockErrors = {};
  capturedWarnings.length = 0;
}

function trackCall(fn: string, ...args: unknown[]): void {
  mockCalls.push({ fn, args });
}

function callsTo(fn: string): { fn: string; args: unknown[] }[] {
  return mockCalls.filter((c) => c.fn === fn);
}

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
    return mockReturns.ghIssueClose ?? true;
  },
  ghIssueReopen: async (...args: unknown[]) => {
    trackCall("ghIssueReopen", ...args);
    return mockReturns.ghIssueReopen ?? true;
  },
  ghIssueComment: async (...args: unknown[]) => {
    trackCall("ghIssueComment", ...args);
    return mockReturns.ghIssueComment ?? true;
  },
  ghIssueComments: async (...args: unknown[]) => {
    trackCall("ghIssueComments", ...args);
    return mockReturns.ghIssueComments ?? [];
  },
  ghIssueState: async (...args: unknown[]) => {
    trackCall("ghIssueState", ...args);
    return mockReturns.ghIssueState ?? "open";
  },
  ghIssueLabels: async (...args: unknown[]) => {
    trackCall("ghIssueLabels", ...args);
    return mockReturns.ghIssueLabels ?? ["type/epic", "phase/design"];
  },
  ghProjectItemAdd: async (...args: unknown[]) => {
    trackCall("ghProjectItemAdd", ...args);
    return mockReturns.ghProjectItemAdd ?? "item-123";
  },
  ghProjectSetField: async (...args: unknown[]) => {
    trackCall("ghProjectSetField", ...args);
    return mockReturns.ghProjectSetField ?? true;
  },
  ghSubIssueAdd: async (...args: unknown[]) => {
    trackCall("ghSubIssueAdd", ...args);
    return mockReturns.ghSubIssueAdd ?? true;
  },
  ghProjectItemDelete: async (...args: unknown[]) => {
    trackCall("ghProjectItemDelete", ...args);
    return mockReturns.ghProjectItemDelete ?? true;
  },
}));

import { reconcileGitHub } from "../github/reconcile";
import { enqueuePendingOp } from "../github/retry-queue";
import type { SyncRefs } from "../github/sync-refs";
import type { BeastmodeConfig } from "../config";
import type { ResolvedGitHub } from "../github/discovery";
import type { TaskStore, Epic, Feature } from "../store/types";
import type { Logger } from "../logger";

function makeConfig(overrides: Partial<BeastmodeConfig["github"]> = {}): BeastmodeConfig {
  return {
    github: { enabled: true, ...overrides },
    cli: { interval: 60 },
    hitl: { timeout: 30 },
    "file-permissions": { timeout: 60, "claude-settings": "" },
  };
}

function makeResolved(): ResolvedGitHub {
  return { repo: "org/repo" };
}

function makeEpic(overrides: Partial<Epic> = {}): Epic {
  return {
    id: "bm-1234",
    type: "epic",
    name: "Test Epic",
    slug: "test-epic",
    status: "design",
    depends_on: [],
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: "bm-1234.1",
    type: "feature",
    parent: "bm-1234",
    name: "feat-a",
    slug: "feat-a",
    status: "pending",
    depends_on: [],
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

function makeStore(epics: Epic[], features: Record<string, Feature[]> = {}): TaskStore {
  return {
    getEpic: (id: string) => epics.find((e) => e.id === id),
    listEpics: () => epics,
    listFeatures: (epicId: string) => features[epicId] ?? [],
    addEpic: () => epics[0],
    updateEpic: () => epics[0],
    deleteEpic: () => {},
    getFeature: (id: string) => {
      for (const list of Object.values(features)) {
        const f = list.find((feat) => feat.id === id);
        if (f) return f;
      }
      return undefined;
    },
    addFeature: () => makeFeature(),
    updateFeature: () => makeFeature(),
    deleteFeature: () => {},
    ready: () => [],
    blocked: () => [],
    tree: () => [],
    listFeatures: () => [],
    dependencyChain: () => [],
    computeWave: () => 0,
    detectCycles: () => [],
    load: () => {},
    save: () => {},
  };
}

function makeLogger(): Logger {
  return {
    info(msg: string) { capturedWarnings.push(`INFO: ${msg}`); },
    debug(msg: string) { capturedWarnings.push(`DEBUG: ${msg}`); },
    warn(msg: string) { capturedWarnings.push(`WARN: ${msg}`); },
    error(msg: string) { capturedWarnings.push(`ERROR: ${msg}`); },
    child() { return makeLogger(); },
  };
}

describe("reconcileGitHub", () => {
  beforeEach(resetMocks);

  test("returns immediately when GitHub is disabled", async () => {
    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store: makeStore([]),
      syncRefs: {},
      config: makeConfig({ enabled: false }),
      resolved: makeResolved(),
      currentTick: 0,
    });

    expect(result.bootstrapped).toBe(false);
    expect(result.opsAttempted).toBe(0);
    expect(mockCalls).toHaveLength(0);
  });

  test("drains pending ops at current tick", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);
    let refs: SyncRefs = { "bm-1234": { issue: 10 } };
    refs = enqueuePendingOp(refs, "bm-1234", { opType: "bodyEnrich", context: {} }, 0);

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 1,
    });

    expect(result.opsAttempted).toBe(1);
  });

  test("skips ops not yet ready (future nextRetryTick)", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);
    let refs: SyncRefs = { "bm-1234": { issue: 10 } };
    refs = enqueuePendingOp(refs, "bm-1234", { opType: "bodyEnrich", context: {} }, 5);

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 3,
    });

    expect(result.opsAttempted).toBe(0);
  });

  test("checks condition for full reconciliation", () => {
    const ref = { issue: 10 } as any;
    expect(ref.issue).toBe(10);
    expect(ref.bodyHash === undefined).toBe(true);
    expect(ref.issue && ref.bodyHash === undefined).toBe(true);
  });

  test("runs full reconciliation for entities with undefined bodyHash", async () => {
    const epic = makeEpic({ status: "plan" });
    const store = makeStore([epic]);
    const refs: SyncRefs = { "bm-1234": { issue: 10 } };
    const logger = makeLogger();

    // Verify the condition
    const ref = refs["bm-1234"];
    expect(ref.issue).toBe(10);
    expect(ref.bodyHash).toBeUndefined();

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 0,
      logger,
    });

    // Log warnings for debugging
    console.log("Captured warnings:", capturedWarnings);
    console.log("Result warnings:", result.warnings);

    expect(result.fullReconcileCount).toBe(1);
    const editCalls = callsTo("ghIssueEdit");
    expect(editCalls.length).toBeGreaterThanOrEqual(1);
  });

  test("does not run full reconciliation when bodyHash is set", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);
    const refs: SyncRefs = { "bm-1234": { issue: 10, bodyHash: "abc123" } };

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 0,
    });

    expect(result.fullReconcileCount).toBe(0);
  });

  test("bootstraps when syncRefs is empty but store has epics", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: {},
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 0,
    });

    expect(result.bootstrapped).toBe(true);
  });

  test("does not bootstrap when syncRefs already populated", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);
    const refs: SyncRefs = { "bm-1234": { issue: 10, bodyHash: "abc" } };

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 0,
    });

    expect(result.bootstrapped).toBe(false);
  });

  test("increments retry count on failed op execution", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);
    let refs: SyncRefs = { "bm-1234": { issue: 10, bodyHash: "abc" } };
    refs = enqueuePendingOp(refs, "bm-1234", { opType: "bodyEnrich", context: {} }, 0);
    mockErrors.ghIssueEdit = true;

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 1,
    });

    expect(result.opsFailed).toBe(1);
  });

  test("builds artifacts map from epic flat fields", async () => {
    const epic = makeEpic({
      design: ".beastmode/artifacts/design/2026-04-05-00ddfb.md",
      plan: ".beastmode/artifacts/plan/2026-04-05-test.md",
    });
    const store = makeStore([epic]);
    const refs: SyncRefs = { "bm-1234": { issue: 10 } };

    await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 0,
    });

    const editCalls = callsTo("ghIssueEdit");
    expect(editCalls.length).toBeGreaterThanOrEqual(1);
  });
});
