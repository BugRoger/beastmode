import { describe, it, expect } from "vitest";
import { vi } from "vitest";
import type { SessionFactory, SessionCreateOpts, SessionHandle } from "../dispatch/factory.js";
import type { SessionResult } from "../dispatch/types.js";

// ---------------------------------------------------------------------------
// Mock external deps BEFORE importing commands/watch
// ---------------------------------------------------------------------------

vi.mock("../git/worktree.js", () => ({
  archive: vi.fn(() => Promise.resolve("archive/v1.0.0")),
  remove: vi.fn(() => Promise.resolve()),
  create: vi.fn(() => Promise.resolve({ path: "/tmp/test-worktree" })),
  rebase: vi.fn(() => Promise.resolve({ outcome: "success", message: "rebased" })),
  isInsideWorktree: vi.fn(() => Promise.resolve(false)),
  resolveMainCheckoutRoot: vi.fn(() => Promise.resolve("/tmp/test-project")),
  resolveMainBranch: vi.fn(() => Promise.resolve("main")),
  exists: vi.fn(() => Promise.resolve(false)),
  ensureWorktree: vi.fn(() => Promise.resolve({ path: "/tmp/test-worktree" })),
  enter: vi.fn(() => {}),
  merge: vi.fn(() => Promise.resolve()),
  cleanArtifactOutputs: vi.fn(() => {}),


}));

vi.mock("../manifest/store.js", () => ({
  load: vi.fn(() => ({ slug: "test-epic", phase: "release", lastUpdated: "2026-01-01" })),
  save: vi.fn(() => {}),
  listEnriched: vi.fn(() => ({ epics: [], blocked: [] })),
  list: vi.fn(() => []),
  get: vi.fn(() => ({})),
  create: vi.fn(() => ({})),
  find: vi.fn(() => undefined),
  manifestPath: vi.fn(() => ""),
  manifestExists: vi.fn(() => false),
  isValidSlug: vi.fn(() => true),
  slugify: vi.fn((s: string) => s),
  validate: vi.fn(() => true),
  remove: vi.fn(() => false),
  slugFromDesign: vi.fn(() => ""),
  slugFromManifest: vi.fn(() => ""),
  rename: vi.fn(() => Promise.resolve()),
  transact: vi.fn(() => Promise.resolve()),
  findLegacyManifestPath: vi.fn(() => undefined),
  readLegacyManifest: vi.fn(() => ({})),
}));

vi.mock("../manifest/reconcile.js", () => ({
  reconcileDesign: vi.fn(() => Promise.resolve(undefined)),
  reconcilePlan: vi.fn(() => Promise.resolve(undefined)),
  reconcileFeature: vi.fn(() => Promise.resolve(undefined)),
  reconcileImplement: vi.fn(() => Promise.resolve(undefined)),
  reconcileValidate: vi.fn(() => Promise.resolve(undefined)),
  reconcileRelease: vi.fn(() => Promise.resolve(undefined)),
  reconcileAll: vi.fn(() => Promise.resolve()),
}));

vi.mock("../github/sync.js", () => ({
  syncGitHubForEpic: vi.fn(() => Promise.resolve()),
  syncGitHub: vi.fn(() => Promise.resolve()),
}));

vi.mock("../github/discovery.js", () => ({
  discoverGitHub: vi.fn(() => Promise.resolve(undefined)),
}));

// Additional mocks needed by pipeline/runner.ts (called via ReconcilingFactory)
vi.mock("../artifacts/reader.js", () => ({
  loadWorktreePhaseOutput: vi.fn(() => ({ status: "completed", artifacts: {} })),
  filenameMatchesEpic: vi.fn(() => true),
  findPhaseOutputFile: vi.fn(() => undefined),
  loadPhaseOutput: vi.fn(() => undefined),
  readArtifact: vi.fn(() => undefined),
  resolveArtifact: vi.fn(() => undefined),
  splitSections: vi.fn(() => new Map()),
  extractSection: vi.fn(() => undefined),
  extractSections: vi.fn(() => new Map()),
}));

vi.mock("../git/tags.js", () => ({
  createTag: vi.fn(() => Promise.resolve()),
}));

vi.mock("../manifest/pure.js", () => ({
  setGitHubEpic: vi.fn((m: any) => m),
  setFeatureGitHubIssue: vi.fn((m: any) => m),
  setEpicBodyHash: vi.fn((m: any) => m),
  setFeatureBodyHash: vi.fn((m: any) => m),
  enrichManifest: vi.fn((m: any) => m),
  regressManifest: vi.fn((m: any) => m),
  deriveNextPhase: vi.fn(() => "done"),
}));

vi.mock("../hooks/hitl-settings.js", () => ({
  writeHitlSettings: vi.fn(() => {}),
  cleanHitlSettings: vi.fn(() => {}),
  buildPreToolUseHook: vi.fn(() => ({})),
  getPhaseHitlProse: vi.fn(() => ""),
}));

vi.mock("../config.js", () => ({
  loadConfig: vi.fn(() => ({
    hitl: { model: "test", timeout: 30, design: "", plan: "", implement: "", validate: "", release: "" },
    "file-permissions": { timeout: 30, "claude-settings": "defer to human" },
    github: { enabled: false, "project-name": "" },
    cli: {},
  })),
  findProjectRoot: vi.fn(() => "/tmp/test-project"),
  getCategoryProse: vi.fn(() => "defer to human"),
}));

vi.mock("../hooks/file-permission-settings.js", () => ({
  cleanFilePermissionSettings: vi.fn(() => {}),
  writeFilePermissionSettings: vi.fn(() => {}),
  buildFilePermissionPreToolUseHooks: vi.fn(() => []),
  buildFilePermissionPostToolUseHooks: vi.fn(() => []),
}));

// Import AFTER mocking
const { ReconcilingFactory } = await import("../dispatch/reconciling.js");
import { createLogger, createStdioSink } from "../logger.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOpts(overrides: Partial<SessionCreateOpts> = {}): SessionCreateOpts {
  return {
    epicSlug: "test-epic",
    phase: "release",
    args: ["test-epic"],
    projectRoot: "/tmp/test-project",
    signal: new AbortController().signal,
    ...overrides,
  };
}

function makeInnerFactory(
  result: SessionResult,
  cleanupFn?: (slug: string) => Promise<void>,
  setBadgeOnContainerFn?: (slug: string, text: string) => Promise<void>,
): SessionFactory {
  const factory: SessionFactory = {
    create: vi.fn(async (opts: SessionCreateOpts): Promise<SessionHandle> => ({
      id: `inner-${Date.now()}`,
      worktreeSlug: opts.epicSlug,
      promise: Promise.resolve(result),
    })),
  };
  if (cleanupFn) {
    factory.cleanup = vi.fn(cleanupFn);
  }
  if (setBadgeOnContainerFn) {
    factory.setBadgeOnContainer = vi.fn(setBadgeOnContainerFn);
  }
  return factory;
}

const logger = createLogger(createStdioSink(0), {});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReconcilingFactory cleanup on release", () => {
  it("calls inner factory cleanup after successful release", async () => {
    const cleanupMock = vi.fn(() => Promise.resolve());
    const inner = makeInnerFactory(
      { success: true, exitCode: 0, costUsd: 0, durationMs: 100 },
      cleanupMock,
    );
    const factory = new ReconcilingFactory(inner, "/tmp/test-project", logger);
    const handle = await factory.create(makeOpts({ phase: "release" }));
    await handle.promise;

    expect(cleanupMock).toHaveBeenCalledTimes(1);
    expect(cleanupMock).toHaveBeenCalledWith("test-epic");
  });

  it("does NOT call cleanup on failed release", async () => {
    const cleanupMock = vi.fn(() => Promise.resolve());
    const inner = makeInnerFactory(
      { success: false, exitCode: 1, costUsd: 0, durationMs: 100 },
      cleanupMock,
    );
    const factory = new ReconcilingFactory(inner, "/tmp/test-project", logger);
    const handle = await factory.create(makeOpts({ phase: "release" }));
    await handle.promise;

    expect(cleanupMock).not.toHaveBeenCalled();
  });

  it("cleanup failure does not block release teardown", async () => {
    const cleanupMock = vi.fn(() => Promise.reject(new Error("tab close failed")));
    const inner = makeInnerFactory(
      { success: true, exitCode: 0, costUsd: 0, durationMs: 100 },
      cleanupMock,
    );
    const factory = new ReconcilingFactory(inner, "/tmp/test-project", logger);
    const handle = await factory.create(makeOpts({ phase: "release" }));
    const result = await handle.promise;

    // Cleanup was attempted
    expect(cleanupMock).toHaveBeenCalledTimes(1);
    // Release still succeeded despite cleanup failure
    expect(result.success).toBe(true);
  });

  it("does NOT call cleanup for non-release phases", async () => {
    const cleanupMock = vi.fn(() => Promise.resolve());
    const inner = makeInnerFactory(
      { success: true, exitCode: 0, costUsd: 0, durationMs: 100 },
      cleanupMock,
    );
    const factory = new ReconcilingFactory(inner, "/tmp/test-project", logger);
    const handle = await factory.create(makeOpts({ phase: "plan" }));
    await handle.promise;

    expect(cleanupMock).not.toHaveBeenCalled();
  });

  it("handles inner factory without cleanup method", async () => {
    const inner = makeInnerFactory(
      { success: true, exitCode: 0, costUsd: 0, durationMs: 100 },
      // No cleanup function provided
    );
    const factory = new ReconcilingFactory(inner, "/tmp/test-project", logger);
    const handle = await factory.create(makeOpts({ phase: "release" }));
    const result = await handle.promise;

    // Should not throw — optional chaining handles undefined cleanup
    expect(result.success).toBe(true);
  });
});

describe("ReconcilingFactory release badge", () => {
  it("calls setBadgeOnContainer on failed release", async () => {
    const badgeMock = vi.fn(() => Promise.resolve());
    const inner = makeInnerFactory(
      { success: false, exitCode: 1, costUsd: 0, durationMs: 100 },
      undefined,
      badgeMock,
    );
    const factory = new ReconcilingFactory(inner, "/tmp/test-project", logger);
    const handle = await factory.create(makeOpts({ phase: "release" }));
    await handle.promise;

    expect(badgeMock).toHaveBeenCalledTimes(1);
    expect(badgeMock).toHaveBeenCalledWith("test-epic", "ERROR: release failed");
  });

  it("does NOT call setBadgeOnContainer on successful release", async () => {
    const badgeMock = vi.fn(() => Promise.resolve());
    const inner = makeInnerFactory(
      { success: true, exitCode: 0, costUsd: 0, durationMs: 100 },
      undefined,
      badgeMock,
    );
    const factory = new ReconcilingFactory(inner, "/tmp/test-project", logger);
    const handle = await factory.create(makeOpts({ phase: "release" }));
    await handle.promise;

    expect(badgeMock).not.toHaveBeenCalled();
  });

  it("badge failure is best-effort — does not throw", async () => {
    const badgeMock = vi.fn(() => Promise.reject(new Error("badge failed")));
    const inner = makeInnerFactory(
      { success: false, exitCode: 1, costUsd: 0, durationMs: 100 },
      undefined,
      badgeMock,
    );
    const factory = new ReconcilingFactory(inner, "/tmp/test-project", logger);
    const handle = await factory.create(makeOpts({ phase: "release" }));
    const result = await handle.promise;

    // Badge was attempted
    expect(badgeMock).toHaveBeenCalledTimes(1);
    // Overall result unchanged — badge failure doesn't alter session result
    expect(result.success).toBe(false);
  });
});
