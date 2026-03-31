/**
 * Tests that reconcileState triggers GitHub sync after state persistence,
 * and that the ReconcilingFactory threads resolved/logger correctly.
 *
 * Mocks: manifest-store, phase-output, github-sync, pipeline-machine (xstate),
 * github-discovery, config.
 */

import { describe, test, expect, mock, beforeEach } from "bun:test";

// --- Mock state ---

const mockCalls: { fn: string; args: unknown[] }[] = [];
let mockState: Record<string, unknown> = {};

function resetMocks(): void {
  mockCalls.length = 0;
  mockState = {
    manifest: {
      slug: "test-epic",
      phase: "plan",
      features: [],
      artifacts: {},
      lastUpdated: "2026-03-31T00:00:00Z",
    },
    phaseOutput: {
      status: "completed",
      artifacts: { features: [{ slug: "feat-a", plan: "plan.md" }] },
    },
  };
}

function trackCall(fn: string, ...args: unknown[]): void {
  mockCalls.push({ fn, args });
}

function callsTo(fn: string): { fn: string; args: unknown[] }[] {
  return mockCalls.filter((c) => c.fn === fn);
}

// --- Mocks (before importing module under test) ---

mock.module("../src/manifest-store", () => ({
  load: (...args: unknown[]) => {
    trackCall("store.load", ...args);
    return mockState.manifest ? JSON.parse(JSON.stringify(mockState.manifest)) : undefined;
  },
  save: (...args: unknown[]) => {
    trackCall("store.save", ...args);
  },
}));

mock.module("../src/manifest", () => ({
  enrich: (m: unknown) => m,
  markFeature: (m: unknown) => m,
  setGitHubEpic: (m: unknown) => m,
  setFeatureGitHubIssue: (m: unknown) => m,
  checkBlocked: () => false,
  getPendingFeatures: () => [],
}));

mock.module("../src/phase-output", () => ({
  loadWorktreePhaseOutput: (...args: unknown[]) => {
    trackCall("loadWorktreePhaseOutput", ...args);
    return mockState.phaseOutput;
  },
  loadWorktreeFeatureOutput: (...args: unknown[]) => {
    trackCall("loadWorktreeFeatureOutput", ...args);
    return mockState.phaseOutput;
  },
  filenameMatchesEpic: () => true,
  filenameMatchesFeature: () => true,
  outputPath: () => "",
  findOutputFile: () => undefined,
  readOutput: () => ({}),
  loadOutput: () => undefined,
  readPhaseOutput: () => undefined,
  loadPhaseOutput: () => undefined,
  extractFeatureStatuses: () => [],
  extractArtifactPaths: () => [],
  findWorktreeOutputFile: () => undefined,
}));

mock.module("../src/github-sync", () => ({
  syncGitHubForEpic: async (...args: unknown[]) => {
    trackCall("syncGitHubForEpic", ...args);
  },
}));

// Minimal xstate mock — epicMachine needs resolveState, createActor
const fakeSnapshot = {
  value: "plan",
  context: { slug: "test-epic", phase: "plan", features: [], artifacts: {}, lastUpdated: "" },
};

mock.module("xstate", () => ({
  createActor: (...args: unknown[]) => {
    trackCall("createActor", ...args);
    return {
      start: () => {},
      stop: () => {},
      send: (...sendArgs: unknown[]) => trackCall("actor.send", ...sendArgs),
      getSnapshot: () => fakeSnapshot,
    };
  },
}));

mock.module("../src/pipeline-machine/index", () => ({
  epicMachine: {
    resolveState: (...args: unknown[]) => {
      trackCall("epicMachine.resolveState", ...args);
      return fakeSnapshot;
    },
  },
}));

// Now import the module under test
const { reconcileState } = await import("../src/watch-command");

// --- Tests ---

describe("reconcileState → GitHub sync", () => {
  beforeEach(resetMocks);

  test("calls syncGitHubForEpic after state persistence", async () => {
    await reconcileState({
      worktreePath: "/fake/worktree",
      projectRoot: "/fake/root",
      epicSlug: "test-epic",
      phase: "plan",
      success: true,
    });

    // store.save should be called (state persistence) BEFORE syncGitHubForEpic
    const saveCalls = callsTo("store.save");
    const syncCalls = callsTo("syncGitHubForEpic");

    expect(saveCalls.length).toBeGreaterThanOrEqual(1);
    expect(syncCalls).toHaveLength(1);

    // Verify ordering: save index < sync index
    const saveIdx = mockCalls.findIndex((c) => c.fn === "store.save");
    const syncIdx = mockCalls.findIndex((c) => c.fn === "syncGitHubForEpic");
    expect(saveIdx).toBeLessThan(syncIdx);
  });

  test("passes resolved param to syncGitHubForEpic", async () => {
    const resolved = { repo: "org/repo", projectNumber: 7 };

    await reconcileState({
      worktreePath: "/fake/worktree",
      projectRoot: "/fake/root",
      epicSlug: "test-epic",
      phase: "plan",
      success: true,
      resolved,
    });

    const syncCalls = callsTo("syncGitHubForEpic");
    expect(syncCalls).toHaveLength(1);

    const syncOpts = syncCalls[0].args[0] as Record<string, unknown>;
    expect(syncOpts.resolved).toBe(resolved);
  });

  test("passes logger param to syncGitHubForEpic", async () => {
    const customLogger = {
      log: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      detail: () => {},
      trace: () => {},
    };

    await reconcileState({
      worktreePath: "/fake/worktree",
      projectRoot: "/fake/root",
      epicSlug: "test-epic",
      phase: "plan",
      success: true,
      logger: customLogger,
    });

    const syncCalls = callsTo("syncGitHubForEpic");
    expect(syncCalls).toHaveLength(1);

    const syncOpts = syncCalls[0].args[0] as Record<string, unknown>;
    expect(syncOpts.logger).toBe(customLogger);
  });

  test("does not call syncGitHubForEpic on failure", async () => {
    await reconcileState({
      worktreePath: "/fake/worktree",
      projectRoot: "/fake/root",
      epicSlug: "test-epic",
      phase: "plan",
      success: false,
    });

    expect(callsTo("syncGitHubForEpic")).toHaveLength(0);
  });

  test("does not call syncGitHubForEpic when manifest is missing", async () => {
    mockState.manifest = undefined;

    await reconcileState({
      worktreePath: "/fake/worktree",
      projectRoot: "/fake/root",
      epicSlug: "test-epic",
      phase: "plan",
      success: true,
    });

    expect(callsTo("syncGitHubForEpic")).toHaveLength(0);
  });

  test("passes projectRoot and epicSlug to syncGitHubForEpic", async () => {
    await reconcileState({
      worktreePath: "/fake/worktree",
      projectRoot: "/my/project",
      epicSlug: "my-epic",
      phase: "plan",
      success: true,
    });

    const syncCalls = callsTo("syncGitHubForEpic");
    expect(syncCalls).toHaveLength(1);

    const syncOpts = syncCalls[0].args[0] as Record<string, unknown>;
    expect(syncOpts.projectRoot).toBe("/my/project");
    expect(syncOpts.epicSlug).toBe("my-epic");
  });
});
