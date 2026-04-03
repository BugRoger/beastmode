import { describe, it, expect, mock } from "bun:test";
import type { SessionFactory, SessionCreateOpts, SessionHandle } from "../dispatch/factory.js";
import type { SessionResult } from "../dispatch/types.js";

// ---------------------------------------------------------------------------
// Mock external deps BEFORE importing watch-command
// ---------------------------------------------------------------------------

mock.module("../git/worktree.js", () => ({
  archive: mock(() => Promise.resolve("archive/v1.0.0")),
  remove: mock(() => Promise.resolve()),
  create: mock(() => Promise.resolve({ path: "/tmp/test-worktree" })),
  isInsideWorktree: mock(() => Promise.resolve(false)),
  resolveMainCheckoutRoot: mock(() => Promise.resolve("/tmp/test-project")),
  resolveMainBranch: mock(() => Promise.resolve("main")),
  exists: mock(() => Promise.resolve(false)),
  ensureWorktree: mock(() => Promise.resolve({ path: "/tmp/test-worktree" })),
  enter: mock(() => {}),
  merge: mock(() => Promise.resolve()),
  cleanArtifactOutputs: mock(() => {}),
}));

mock.module("../manifest/store.js", () => ({
  load: mock(() => ({ slug: "test-epic", phase: "release", lastUpdated: "2026-01-01" })),
  save: mock(() => {}),
  listEnriched: mock(() => ({ epics: [], blocked: [] })),
  list: mock(() => []),
  get: mock(() => ({})),
  create: mock(() => ({})),
  find: mock(() => undefined),
  manifestPath: mock(() => ""),
  manifestExists: mock(() => false),
  isValidSlug: mock(() => true),
  slugify: mock((s: string) => s),
  validate: mock(() => true),
  remove: mock(() => false),
  slugFromDesign: mock(() => ""),
  slugFromManifest: mock(() => ""),
  rename: mock(() => Promise.resolve()),
  transact: mock(() => Promise.resolve()),
  findLegacyManifestPath: mock(() => undefined),
  readLegacyManifest: mock(() => ({})),
}));

mock.module("../manifest/reconcile.js", () => ({
  reconcileDesign: mock(() => Promise.resolve(undefined)),
  reconcilePlan: mock(() => Promise.resolve(undefined)),
  reconcileFeature: mock(() => Promise.resolve(undefined)),
  reconcileImplement: mock(() => Promise.resolve(undefined)),
  reconcileValidate: mock(() => Promise.resolve(undefined)),
  reconcileRelease: mock(() => Promise.resolve(undefined)),
  reconcileAll: mock(() => Promise.resolve()),
}));

mock.module("../github/sync.js", () => ({
  syncGitHubForEpic: mock(() => Promise.resolve()),
  syncGitHub: mock(() => Promise.resolve()),
}));

mock.module("../github/discovery.js", () => ({
  discoverGitHub: mock(() => Promise.resolve(undefined)),
}));

// Import AFTER mocking
const { ReconcilingFactory } = await import("../watch-command.js");
import { createLogger } from "../logger.js";

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
    create: mock(async (opts: SessionCreateOpts): Promise<SessionHandle> => ({
      id: `inner-${Date.now()}`,
      worktreeSlug: opts.epicSlug,
      promise: Promise.resolve(result),
    })),
  };
  if (cleanupFn) {
    factory.cleanup = mock(cleanupFn);
  }
  if (setBadgeOnContainerFn) {
    factory.setBadgeOnContainer = mock(setBadgeOnContainerFn);
  }
  return factory;
}

const logger = createLogger(0, "test");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReconcilingFactory cleanup on release", () => {
  it("calls inner factory cleanup after successful release", async () => {
    const cleanupMock = mock(() => Promise.resolve());
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
    const cleanupMock = mock(() => Promise.resolve());
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
    const cleanupMock = mock(() => Promise.reject(new Error("tab close failed")));
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
    const cleanupMock = mock(() => Promise.resolve());
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
    const badgeMock = mock(() => Promise.resolve());
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
    const badgeMock = mock(() => Promise.resolve());
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
    const badgeMock = mock(() => Promise.reject(new Error("badge failed")));
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
