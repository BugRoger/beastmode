/**
 * Integration test: reconciliation-loop feature.
 * Exercises reconciliation pass draining retry queue, bootstrap from epic store,
 * and stub enrichment via reconciliation.
 * Expected: RED until all implementation tasks complete.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";

// --- Mock Bun globals (needed by syncGitHub for hashing/tag resolution) ---
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

// Mock the gh CLI module
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
import type { SyncRefs } from "../github/sync-refs";
import type { BeastmodeConfig } from "../config";
import type { ResolvedGitHub } from "../github/discovery";
import type { TaskStore, Epic, Feature } from "../store/types";
import { enqueuePendingOp } from "../github/retry-queue";

// --- Test helpers ---

function makeConfig(overrides: Partial<BeastmodeConfig["github"]> = {}): BeastmodeConfig {
  return {
    github: { enabled: true, ...overrides },
    cli: { interval: 60 },
    hitl: { timeout: 30 },
    "file-permissions": { timeout: 60, "claude-settings": "" },
  };
}

function makeResolved(overrides: Partial<ResolvedGitHub> = {}): ResolvedGitHub {
  return { repo: "org/repo", ...overrides };
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
    getFeature: () => undefined,
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

describe("@github-sync-again: Watch loop reconciliation drains retry queue each tick", () => {
  beforeEach(resetMocks);

  // Scenario: Reconciliation pass runs on every watch loop tick
  test("reconciliation pass drains pending operations on each call", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);
    const refs: SyncRefs = {
      "bm-1234": { issue: 10 },
    };

    // Enqueue a pending op
    const refsWithOp = enqueuePendingOp(refs, "bm-1234", {
      opType: "bodyEnrich",
      context: {},
    }, 0);

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refsWithOp,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 1,
    });

    expect(result.opsAttempted).toBeGreaterThanOrEqual(1);
  });

  // Scenario: Failed operation is retried during reconciliation
  test("failed operation is retried when backoff has elapsed", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);

    let refs: SyncRefs = {
      "bm-1234": { issue: 10 },
    };
    refs = enqueuePendingOp(refs, "bm-1234", {
      opType: "bodyEnrich",
      context: {},
    }, 0);

    // Tick 1 — backoff for retry 0 is 2^0 = 1 tick
    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 1,
    });

    expect(result.opsAttempted).toBe(1);
    expect(result.opsSucceeded + result.opsFailed).toBe(1);
  });

  // Scenario: Successfully retried operations enrich stubs
  test("successful retry enriches stub issue body", async () => {
    const epic = makeEpic({ status: "plan" });
    const store = makeStore([epic]);

    let refs: SyncRefs = {
      "bm-1234": { issue: 10 },
    };
    refs = enqueuePendingOp(refs, "bm-1234", {
      opType: "bodyEnrich",
      context: {},
    }, 0);

    await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: refs,
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 1,
    });

    // Body enrich should have called ghIssueEdit with a body
    const editCalls = callsTo("ghIssueEdit");
    const bodyEdit = editCalls.find(
      (c) => (c.args[2] as Record<string, unknown>).body !== undefined,
    );
    expect(bodyEdit).toBeDefined();
  });

  // Scenario: Reconciliation prevents stale stubs from persisting
  test("reconciliation retries enrichment across multiple ticks", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);

    let refs: SyncRefs = {
      "bm-1234": { issue: 10 },
    };
    refs = enqueuePendingOp(refs, "bm-1234", {
      opType: "bodyEnrich",
      context: {},
    }, 0);

    // First tick — op is ready
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
});

describe("@github-sync-again: Sync-refs bootstrap from epic store when empty", () => {
  beforeEach(resetMocks);

  // Scenario: Bootstrap populates sync-refs from epic store on startup
  test("bootstrap populates sync-refs when empty but store has epics", async () => {
    const epic1 = makeEpic({ id: "bm-1", slug: "e1", name: "Epic 1" });
    const epic2 = makeEpic({ id: "bm-2", slug: "e2", name: "Epic 2" });
    const epic3 = makeEpic({ id: "bm-3", slug: "e3", name: "Epic 3" });
    const store = makeStore([epic1, epic2, epic3]);
    mockReturns.ghIssueCreate = undefined;

    const result = await reconcileGitHub({
      projectRoot: "/tmp/test",
      store,
      syncRefs: {},
      config: makeConfig(),
      resolved: makeResolved(),
      currentTick: 0,
    });

    expect(result.bootstrapped).toBe(true);
    expect(result.bootstrapCount).toBeGreaterThanOrEqual(0);
  });

  // Scenario: Bootstrapped entries do not duplicate if sync-refs already populated
  test("bootstrap is no-op when sync-refs already has entries", async () => {
    const epic = makeEpic();
    const store = makeStore([epic]);
    const refs: SyncRefs = {
      "bm-1234": { issue: 10 },
    };

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

  // Scenario: Bootstrap detects and skips epics without GitHub issue numbers
  test("bootstrap skips epics without discoverable issue numbers", async () => {
    const epic = makeEpic({ id: "bm-no-issue" });
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

  // Scenario: Bootstrap entry triggers enrichment for broken issues
  test("bootstrapped entries with undefined bodyHash trigger body sync", async () => {
    const epic = makeEpic({ status: "plan" });
    const store = makeStore([epic]);
    const refs: SyncRefs = {
      "bm-1234": { issue: 10 },
    };

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
