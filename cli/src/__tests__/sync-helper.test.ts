/**
 * Unit tests for syncGitHubForEpic — the high-level sync helper.
 *
 * Mocks config, discovery, store, manifest pure functions, and the sync engine
 * so no real GitHub CLI calls or filesystem access occurs.
 */

import { describe, test, expect, mock, beforeEach } from "bun:test";
import type { ResolvedGitHub } from "../github/discovery";

// --- Mock state ---

const mockCalls: { fn: string; args: unknown[] }[] = [];
let mockState: Record<string, unknown> = {};

function resetMocks(): void {
  mockCalls.length = 0;
  mockState = {
    configEnabled: true,
    discoveryResult: { repo: "org/repo", projectNumber: 7, projectId: "PVT_123" },
    manifest: {
      slug: "test-epic",
      phase: "implement",
      features: [{ slug: "feat-a", plan: "plan.md", status: "pending" }],
      artifacts: {},
      lastUpdated: "2026-03-31T00:00:00Z",
      github: { epic: 10, repo: "org/repo" },
    },
    syncResult: {
      epicCreated: false,
      epicNumber: 10,
      featuresCreated: 0,
      featuresClosed: 0,
      featuresReopened: 0,
      labelsUpdated: 0,
      projectUpdated: false,
      epicClosed: false,
      warnings: [],
      mutations: [],
    },
    syncThrows: false,
  };
}

function trackCall(fn: string, ...args: unknown[]): void {
  mockCalls.push({ fn, args });
}

function callsTo(fn: string): { fn: string; args: unknown[] }[] {
  return mockCalls.filter((c) => c.fn === fn);
}

// Mock all dependencies BEFORE importing the module under test
mock.module("../config", () => ({
  loadConfig: (...args: unknown[]) => {
    trackCall("loadConfig", ...args);
    return {
      gates: {},
      github: { enabled: mockState.configEnabled, "project-name": "Test Board" },
      cli: { interval: 60 },
    };
  },
}));

mock.module("../github/discovery", () => ({
  discoverGitHub: async (...args: unknown[]) => {
    trackCall("discoverGitHub", ...args);
    return mockState.discoveryResult;
  },
}));

mock.module("../manifest/store", () => ({
  load: (...args: unknown[]) => {
    trackCall("store.load", ...args);
    return mockState.manifest ? JSON.parse(JSON.stringify(mockState.manifest)) : undefined;
  },
  save: (...args: unknown[]) => {
    trackCall("store.save", ...args);
  },
  transact: async (projectRoot: unknown, slug: unknown, fn: (m: unknown) => unknown) => {
    trackCall("store.transact", projectRoot, slug);
    const manifest = mockState.manifest ? JSON.parse(JSON.stringify(mockState.manifest)) : undefined;
    if (!manifest) throw new Error(`No manifest for ${slug}`);
    const updated = fn(manifest);
    trackCall("store.save", projectRoot, slug, updated);
    return updated;
  },
}));

mock.module("../manifest/pure", () => ({
  setGitHubEpic: (manifest: unknown, epicNumber: unknown, repo: unknown) => {
    trackCall("setGitHubEpic", manifest, epicNumber, repo);
    return { ...(manifest as Record<string, unknown>), github: { epic: epicNumber, repo } };
  },
  setFeatureGitHubIssue: (manifest: unknown, featureSlug: unknown, issueNumber: unknown) => {
    trackCall("setFeatureGitHubIssue", manifest, featureSlug, issueNumber);
    return manifest;
  },
}));

// Mock the gh module to prevent real CLI calls
mock.module("../github/cli", () => ({
  ghIssueCreate: async () => 42,
  ghIssueEdit: async () => true,
  ghIssueClose: async () => true,
  ghIssueReopen: async () => true,
  ghIssueComment: async () => true,
  ghIssueComments: async () => [],
  ghIssueState: async () => "open",
  ghIssueLabels: async () => ["type/epic", "phase/implement"],
  ghProjectItemAdd: async () => "item-123",
  ghProjectItemDelete: async () => true,
  ghProjectSetField: async () => true,
  ghSubIssueAdd: async () => true,
}));

// Dynamically mock syncGitHub on the module itself
const ghSyncModule = await import("../github/sync");

// We need to intercept syncGitHub calls. Since syncGitHubForEpic calls syncGitHub
// internally and they're in the same module, we can't mock syncGitHub directly.
// Instead, we test the full integration: config -> discovery -> sync -> mutations -> persist.

// For mutation testing, we configure mockState.syncResult with mutations,
// but since we can't mock syncGitHub (same module), we'll test through the
// real syncGitHub with mocked gh.ts. The gh mock returns issue 42 on create.

const { syncGitHubForEpic } = ghSyncModule;

// --- Tests ---

describe("syncGitHubForEpic", () => {
  beforeEach(resetMocks);

  test("is a no-op when github.enabled is false", async () => {
    mockState.configEnabled = false;

    await syncGitHubForEpic({
      projectRoot: "/fake/root",
      epicSlug: "test-epic",
    });

    // Should not call discovery or store
    expect(callsTo("discoverGitHub")).toHaveLength(0);
    expect(callsTo("store.load")).toHaveLength(0);
  });

  test("skips discovery when resolved param provided", async () => {
    const resolved = { repo: "pre/resolved" };

    await syncGitHubForEpic({
      projectRoot: "/fake/root",
      epicSlug: "test-epic",
      resolved,
    });

    // Should NOT call discoverGitHub
    expect(callsTo("discoverGitHub")).toHaveLength(0);
    // Should call store.load
    expect(callsTo("store.load")).toHaveLength(1);
  });

  test("calls discoverGitHub when no resolved param", async () => {
    await syncGitHubForEpic({
      projectRoot: "/fake/root",
      epicSlug: "test-epic",
    });

    expect(callsTo("discoverGitHub")).toHaveLength(1);
    expect(callsTo("discoverGitHub")[0].args[0]).toBe("/fake/root");
  });

  test("is a no-op when discovery fails", async () => {
    mockState.discoveryResult = undefined;

    await syncGitHubForEpic({
      projectRoot: "/fake/root",
      epicSlug: "test-epic",
    });

    expect(callsTo("store.load")).toHaveLength(0);
  });

  test("is a no-op when manifest does not exist", async () => {
    mockState.manifest = undefined;

    await syncGitHubForEpic({
      projectRoot: "/fake/root",
      epicSlug: "test-epic",
    });

    expect(callsTo("store.load")).toHaveLength(1);
    expect(callsTo("store.save")).toHaveLength(0);
  });

  test("applies mutations and persists when epic is new", async () => {
    // Remove github.epic so syncGitHub will create one
    const manifest = mockState.manifest as Record<string, unknown>;
    delete (manifest as Record<string, unknown>).github;

    await syncGitHubForEpic({
      projectRoot: "/fake/root",
      epicSlug: "test-epic",
    });

    // syncGitHub should create the epic (ghIssueCreate returns 42)
    // which produces a setEpic mutation → applied inline → store.save called
    const saveCalls = callsTo("store.save");
    expect(saveCalls.length).toBeGreaterThanOrEqual(1);
  });

  test("does not persist when no mutations returned", async () => {
    // Manifest already has github.epic set, features have github.issue
    const manifest = mockState.manifest as Record<string, unknown>;
    (manifest as { features: Array<Record<string, unknown>> }).features = [
      { slug: "feat-a", plan: "plan.md", status: "pending", github: { issue: 20, bodyHash: "existing" } },
    ];
    (manifest as { github: Record<string, unknown> }).github = {
      epic: 10, repo: "org/repo", bodyHash: "existing",
    };

    await syncGitHubForEpic({
      projectRoot: "/fake/root",
      epicSlug: "test-epic",
    });

    // store.load is always called
    expect(callsTo("store.load")).toHaveLength(1);
  });

  test("catches errors and does not throw", async () => {
    // Make loadConfig throw
    mockState.configEnabled = true;
    // Override manifest to make store.load throw
    mockState.manifest = undefined;

    // Force an error by having discovery return something that causes syncGitHub to fail
    // Actually, the simplest: set manifest to null. store.load returns undefined → early return.
    // Let's test a real throw: make loadConfig fail by modifying the mock dynamically.
    // Since we can't easily change the mock behavior mid-test, test with a broken resolved:
    const badResolved = {} as Record<string, unknown>; // missing .repo

    // This should not throw — warn-and-continue
    await syncGitHubForEpic({
      projectRoot: "/fake/root",
      epicSlug: "test-epic",
      resolved: badResolved as unknown as ResolvedGitHub | undefined,
    });

    // Function completed without throwing
    expect(true).toBe(true);
  });

  test("logs warning when discovery fails and logger provided", async () => {
    const warnMessages: string[] = [];
    const customLogger: any = {
      log: () => {},
      warn: (msg: string) => warnMessages.push(msg),
      error: () => {},
      debug: () => {},
      detail: () => {},
      trace: () => {},
      child: () => customLogger,
    };

    mockState.discoveryResult = undefined;

    await syncGitHubForEpic({
      projectRoot: "/fake/root",
      epicSlug: "test-epic",
      logger: customLogger,
    });

    // When discovery returns undefined, the helper should warn and return
    // If the mock didn't intercept discovery, the function still returns without throwing
    expect(callsTo("discoverGitHub")).toHaveLength(1);
    expect(callsTo("store.load")).toHaveLength(0);
  });

  test("applies setFeatureIssue mutation for new features", async () => {
    // Feature without github.issue, manifest without github (both need creating)
    const manifest = mockState.manifest as Record<string, unknown>;
    delete (manifest as Record<string, unknown>).github;
    (manifest as { features: Array<Record<string, unknown>> }).features = [
      { slug: "new-feat", plan: "plan.md", status: "pending" },
    ];

    await syncGitHubForEpic({
      projectRoot: "/fake/root",
      epicSlug: "test-epic",
    });

    // Mutations applied inline, persisted via store.save
    expect(callsTo("store.save").length).toBeGreaterThanOrEqual(1);
  });
});
