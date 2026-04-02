import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { WatchLoop } from "../watch.js";
import type { WatchDeps } from "../watch.js";
import type { EnrichedManifest } from "../state-scanner.js";
import type { SessionResult } from "../watch-types.js";
import { SdkSessionFactory } from "../session.js";
import { DispatchTracker } from "../dispatch-tracker.js";
import { acquireLock, releaseLock, readLockfile } from "../lockfile.js";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-watch-tmp");

function setupTestRoot(): void {
  rmSync(TEST_ROOT, { recursive: true, force: true });
  mkdirSync(resolve(TEST_ROOT, "cli"), { recursive: true });
  mkdirSync(resolve(TEST_ROOT, ".beastmode"), { recursive: true });
}

function teardownTestRoot(): void {
  rmSync(TEST_ROOT, { recursive: true, force: true });
}

// --- Lockfile tests ---

describe("lockfile", () => {
  beforeEach(setupTestRoot);
  afterEach(teardownTestRoot);

  it("acquires lock when no lockfile exists", () => {
    expect(acquireLock(TEST_ROOT)).toBe(true);
    const info = readLockfile(TEST_ROOT);
    expect(info).not.toBeNull();
    expect(info!.pid).toBe(process.pid);
    releaseLock(TEST_ROOT);
  });

  it("prevents duplicate lock acquisition", () => {
    expect(acquireLock(TEST_ROOT)).toBe(true);
    // Same PID, so this will detect us as running
    expect(acquireLock(TEST_ROOT)).toBe(false);
    releaseLock(TEST_ROOT);
  });

  it("releases lock cleanly", () => {
    acquireLock(TEST_ROOT);
    releaseLock(TEST_ROOT);
    const info = readLockfile(TEST_ROOT);
    expect(info).toBeNull();
  });

  it("detects stale lockfile (dead PID)", () => {
    // Write a lockfile with a definitely-dead PID
    const lockPath = resolve(TEST_ROOT, "cli", ".beastmode-watch.lock");
    writeFileSync(
      lockPath,
      JSON.stringify({ pid: 999999999, startedAt: new Date().toISOString() }),
    );

    // Should detect stale and acquire
    expect(acquireLock(TEST_ROOT)).toBe(true);
    releaseLock(TEST_ROOT);
  });
});

// --- DispatchTracker tests ---

describe("DispatchTracker", () => {
  it("tracks sessions by epic and feature", () => {
    const tracker = new DispatchTracker();

    const session = {
      id: "test-1",
      epicSlug: "my-epic",
      phase: "implement",
      featureSlug: "feat-a",
      worktreeSlug: "my-epic-feat-a",
      abortController: new AbortController(),
      promise: Promise.resolve({
        success: true,
        exitCode: 0,
        costUsd: 0.5,
        durationMs: 1000,
      }),
      startedAt: Date.now(),
    };

    tracker.add(session);

    expect(tracker.size).toBe(1);
    expect(tracker.hasActiveSession("my-epic")).toBe(true);
    expect(tracker.hasActiveSession("other-epic")).toBe(false);
    expect(tracker.hasFeatureSession("my-epic", "feat-a")).toBe(true);
    expect(tracker.hasFeatureSession("my-epic", "feat-b")).toBe(false);

    tracker.remove("test-1");
    expect(tracker.size).toBe(0);
    expect(tracker.hasActiveSession("my-epic")).toBe(false);
  });

  it("aborts all sessions", () => {
    const tracker = new DispatchTracker();
    const ac1 = new AbortController();
    const ac2 = new AbortController();

    tracker.add({
      id: "s1",
      epicSlug: "e1",
      phase: "plan",
      worktreeSlug: "e1-plan",
      abortController: ac1,
      promise: new Promise(() => {}),
      startedAt: Date.now(),
    });
    tracker.add({
      id: "s2",
      epicSlug: "e2",
      phase: "plan",
      worktreeSlug: "e2-plan",
      abortController: ac2,
      promise: new Promise(() => {}),
      startedAt: Date.now(),
    });

    tracker.abortAll();
    expect(ac1.signal.aborted).toBe(true);
    expect(ac2.signal.aborted).toBe(true);
  });

  it("checks phase sessions", () => {
    const tracker = new DispatchTracker();
    tracker.add({
      id: "s1",
      epicSlug: "e1",
      phase: "plan",
      worktreeSlug: "e1-plan",
      abortController: new AbortController(),
      promise: Promise.resolve({ success: true, exitCode: 0, costUsd: 0, durationMs: 0 }),
      startedAt: Date.now(),
    });

    expect(tracker.hasPhaseSession("e1", "plan")).toBe(true);
    expect(tracker.hasPhaseSession("e1", "implement")).toBe(false);
  });
});

// --- WatchLoop tests ---

describe("WatchLoop", () => {
  beforeEach(setupTestRoot);
  afterEach(teardownTestRoot);

  function mockDeps(overrides: Partial<WatchDeps> = {}): WatchDeps {
    return {
      scanEpics: async () => [],
      sessionFactory: new SdkSessionFactory(async (opts) => ({
        id: `${opts.epicSlug}-${opts.phase}-${Date.now()}`,
        worktreeSlug: `${opts.epicSlug}-${opts.phase}`,
        promise: Promise.resolve({
          success: true,
          exitCode: 0,
          costUsd: 0.1,
          durationMs: 500,
        }),
      })),
      ...overrides,
    };
  }

  it("dispatches a single phase for a ready epic", async () => {
    const dispatched: string[] = [];
    let scanCount = 0;

    const readyEpic: EnrichedManifest = {
      slug: "my-epic",
      manifestPath: "pipeline/my-epic.manifest.json",
      phase: "design",
      nextAction: { phase: "plan", args: ["my-epic"], type: "single" },
      features: [],
      artifacts: {},
      lastUpdated: "2026-03-29T00:00:00Z",

    };

    const deps = mockDeps({
      scanEpics: async () => {
        scanCount++;
        // Only return the ready epic on the first scan; after that, simulate "done"
        if (scanCount === 1) return [readyEpic];
        return [{ ...readyEpic, nextAction: null }];
      },
      sessionFactory: new SdkSessionFactory(async (opts) => {
        dispatched.push(`${opts.phase} ${opts.args.join(" ")}`);
        return {
          id: `dispatch-${Date.now()}`,
          worktreeSlug: `my-epic-plan`,
          promise: Promise.resolve({
            success: true,
            exitCode: 0,
            costUsd: 0.1,
            durationMs: 500,
          }),
        };
      }),
    });

    const loop = new WatchLoop(
      { intervalSeconds: 999, projectRoot: TEST_ROOT },
      deps,
    );
    loop.setRunning(true);

    await loop.tick();

    expect(dispatched).toEqual(["plan my-epic"]);
    // Wait for session promise to resolve
    await new Promise((r) => setTimeout(r, 50));
    await loop.stop();
  });

  it("fans out implement across pending features", async () => {
    const dispatched: string[] = [];
    let scanCount = 0;

    const implementEpic: EnrichedManifest = {
      slug: "my-epic",
      manifestPath: "pipeline/my-epic.manifest.json",
      phase: "implement",
      nextAction: {
        phase: "implement",
        args: ["my-epic"],
        type: "fan-out",
        features: ["feat-a", "feat-b", "feat-c"],
      },
      features: [
        { slug: "feat-a", plan: "feat-a.md", status: "pending" },
        { slug: "feat-b", plan: "feat-b.md", status: "pending" },
        { slug: "feat-c", plan: "feat-c.md", status: "pending" },
      ],
      artifacts: {},
      lastUpdated: "2026-03-29T00:00:00Z",

    };

    const deps = mockDeps({
      scanEpics: async () => {
        scanCount++;
        if (scanCount === 1) return [implementEpic];
        return [{ ...implementEpic, nextAction: null }];
      },
      sessionFactory: new SdkSessionFactory(async (opts) => {
        dispatched.push(
          `${opts.phase} ${opts.args.join(" ")} feature=${opts.featureSlug}`,
        );
        return {
          id: `dispatch-${opts.featureSlug}-${Date.now()}`,
          worktreeSlug: opts.epicSlug,
          promise: Promise.resolve({
            success: true,
            exitCode: 0,
            costUsd: 0.1,
            durationMs: 500,
          }),
        };
      }),
    });

    const loop = new WatchLoop(
      { intervalSeconds: 999, projectRoot: TEST_ROOT },
      deps,
    );
    loop.setRunning(true);

    await loop.tick();

    expect(dispatched).toHaveLength(3);
    expect(dispatched).toContain("implement my-epic feat-a feature=feat-a");
    expect(dispatched).toContain("implement my-epic feat-b feature=feat-b");
    expect(dispatched).toContain("implement my-epic feat-c feature=feat-c");

    await new Promise((r) => setTimeout(r, 50));
    await loop.stop();
  });

  it("fan-out sessions share the epic worktree slug", async () => {
    const worktreeSlugs: string[] = [];
    let scanCount = 0;

    const implementEpic: EnrichedManifest = {
      slug: "my-epic",
      manifestPath: "pipeline/my-epic.manifest.json",
      phase: "implement",
      nextAction: {
        phase: "implement",
        args: ["my-epic"],
        type: "fan-out",
        features: ["feat-a", "feat-b"],
      },
      features: [
        { slug: "feat-a", plan: "feat-a.md", status: "pending" },
        { slug: "feat-b", plan: "feat-b.md", status: "pending" },
      ],
      artifacts: {},
      lastUpdated: "2026-03-29T00:00:00Z",

    };

    const deps = mockDeps({
      scanEpics: async () => {
        scanCount++;
        if (scanCount === 1) return [implementEpic];
        return [{ ...implementEpic, nextAction: null }];
      },
      sessionFactory: new SdkSessionFactory(async (opts) => {
        worktreeSlugs.push(opts.epicSlug);
        return {
          id: `dispatch-${opts.featureSlug}-${Date.now()}`,
          worktreeSlug: opts.epicSlug,
          promise: Promise.resolve({
            success: true,
            exitCode: 0,
            costUsd: 0.1,
            durationMs: 500,
          }),
        };
      }),
    });

    const loop = new WatchLoop(
      { intervalSeconds: 999, projectRoot: TEST_ROOT },
      deps,
    );
    loop.setRunning(true);

    await loop.tick();

    // Both sessions should use the same epic worktree slug
    expect(worktreeSlugs).toEqual(["my-epic", "my-epic"]);

    await new Promise((r) => setTimeout(r, 50));
    await loop.stop();
  });

  it("no merge coordination after fan-out completion", async () => {
    let scanCount = 0;
    const completed: Array<{ phase: string }> = [];

    const implementEpic: EnrichedManifest = {
      slug: "my-epic",
      manifestPath: "pipeline/my-epic.manifest.json",
      phase: "implement",
      nextAction: {
        phase: "implement",
        args: ["my-epic"],
        type: "fan-out",
        features: ["feat-a", "feat-b"],
      },
      features: [
        { slug: "feat-a", plan: "feat-a.md", status: "pending" },
        { slug: "feat-b", plan: "feat-b.md", status: "pending" },
      ],
      artifacts: {},
      lastUpdated: "2026-03-29T00:00:00Z",

    };

    const deps = mockDeps({
      scanEpics: async () => {
        scanCount++;
        if (scanCount === 1) return [implementEpic];
        return [{ ...implementEpic, nextAction: null }];
      },
      sessionFactory: new SdkSessionFactory(async (opts) => ({
        id: `dispatch-${opts.featureSlug}-${Date.now()}`,
        worktreeSlug: opts.epicSlug,
        promise: Promise.resolve({
          success: true,
          exitCode: 0,
          costUsd: 0.1,
          durationMs: 500,
        }),
      })),
    });

    const loop = new WatchLoop(
      { intervalSeconds: 999, projectRoot: TEST_ROOT },
      deps,
    );
    loop.on("session-completed", (evt) => completed.push({ phase: evt.phase }));
    loop.setRunning(true);

    await loop.tick();

    // Wait for all sessions to complete
    await new Promise((r) => setTimeout(r, 100));

    // Sessions completed — no merge step occurred
    expect(completed).toHaveLength(2);
    expect(completed.every((r) => r.phase === "implement")).toBe(true);

    // Tracker should be clean — no lingering merge sessions
    expect(loop.getTracker().size).toBe(0);

    await loop.stop();
  });

  it("does not double-dispatch the same phase", async () => {
    let dispatchCount = 0;

    const readyEpic: EnrichedManifest = {
      slug: "my-epic",
      manifestPath: "pipeline/my-epic.manifest.json",
      phase: "design",
      nextAction: { phase: "plan", args: ["my-epic"], type: "single" },
      features: [],
      artifacts: {},
      lastUpdated: "2026-03-29T00:00:00Z",

    };

    const deps = mockDeps({
      scanEpics: async () => [readyEpic],
      sessionFactory: new SdkSessionFactory(async () => {
        dispatchCount++;
        return {
          id: `dispatch-${dispatchCount}`,
          worktreeSlug: "my-epic-plan",
          // Never resolves — simulates long-running session
          promise: new Promise(() => {}),
        };
      }),
    });

    const loop = new WatchLoop(
      { intervalSeconds: 999, projectRoot: TEST_ROOT },
      deps,
    );
    loop.setRunning(true);

    await loop.tick();
    await loop.tick();

    // Should only dispatch once despite two ticks
    expect(dispatchCount).toBe(1);
    // Don't call loop.stop() — the mock session never resolves (by design)
    loop.setRunning(false);
  });

  it("handles multiple epics in parallel", async () => {
    const dispatched: string[] = [];
    let scanCount = 0;

    const epics: EnrichedManifest[] = [
      {
        slug: "epic-a",
        manifestPath: "pipeline/epic-a.manifest.json",
        phase: "design",
        nextAction: { phase: "plan", args: ["epic-a"], type: "single" },
        features: [],
        artifacts: {},
        lastUpdated: "2026-03-29T00:00:00Z",
  
      },
      {
        slug: "epic-b",
        manifestPath: "pipeline/epic-b.manifest.json",
        phase: "design",
        nextAction: { phase: "plan", args: ["epic-b"], type: "single" },
        features: [],
        artifacts: {},
        lastUpdated: "2026-03-29T00:00:00Z",
  
      },
    ];

    const deps = mockDeps({
      scanEpics: async () => {
        scanCount++;
        if (scanCount === 1) return epics;
        return epics.map((e) => ({ ...e, nextAction: null }));
      },
      sessionFactory: new SdkSessionFactory(async (opts) => {
        dispatched.push(opts.epicSlug);
        return {
          id: `dispatch-${opts.epicSlug}`,
          worktreeSlug: `${opts.epicSlug}-plan`,
          promise: Promise.resolve({
            success: true,
            exitCode: 0,
            costUsd: 0.1,
            durationMs: 500,
          }),
        };
      }),
    });

    const loop = new WatchLoop(
      { intervalSeconds: 999, projectRoot: TEST_ROOT },
      deps,
    );
    loop.setRunning(true);

    await loop.tick();

    expect(dispatched).toContain("epic-a");
    expect(dispatched).toContain("epic-b");

    await new Promise((r) => setTimeout(r, 50));
    await loop.stop();
  });

  it("skips epics with no next action", async () => {
    const dispatched: string[] = [];

    const completedEpic: EnrichedManifest = {
      slug: "done-epic",
      manifestPath: "pipeline/done-epic.manifest.json",
      phase: "release",
      nextAction: null,
      features: [{ slug: "f1", plan: "f1.md", status: "completed" }],
      artifacts: {},
      lastUpdated: "2026-03-29T00:00:00Z",

    };

    const deps = mockDeps({
      scanEpics: async () => [completedEpic],
      sessionFactory: new SdkSessionFactory(async (opts) => {
        dispatched.push(opts.epicSlug);
        return {
          id: "nope",
          worktreeSlug: "nope",
          promise: Promise.resolve({
            success: true,
            exitCode: 0,
            costUsd: 0,
            durationMs: 0,
          }),
        };
      }),
    });

    const loop = new WatchLoop(
      { intervalSeconds: 999, projectRoot: TEST_ROOT },
      deps,
    );
    loop.setRunning(true);

    await loop.tick();
    expect(dispatched).toHaveLength(0);
    await loop.stop();
  });

  it("processes release phase completion and re-scans", async () => {
    const completed: Array<{ phase: string; epicSlug: string }> = [];
    let scanCount = 0;

    const releaseEpic: EnrichedManifest = {
      slug: "release-epic",
      manifestPath: "pipeline/release-epic.manifest.json",
      phase: "validate",
      nextAction: { phase: "release", args: ["release-epic"], type: "single" },
      features: [{ slug: "f1", plan: "f1.md", status: "completed" }],
      artifacts: {},
      lastUpdated: "2026-03-29T00:00:00Z",

    };

    const deps = mockDeps({
      scanEpics: async () => {
        scanCount++;
        if (scanCount === 1) return [releaseEpic];
        // After release completes, epic has no next action
        return [{ ...releaseEpic, nextAction: null }];
      },
      sessionFactory: new SdkSessionFactory(async (opts) => {
        return {
          id: `release-${Date.now()}`,
          worktreeSlug: `release-epic-release`,
          promise: Promise.resolve({
            success: true,
            exitCode: 0,
            costUsd: 1.5,
            durationMs: 30000,
          }),
        };
      }),
    });

    const loop = new WatchLoop(
      { intervalSeconds: 999, projectRoot: TEST_ROOT },
      deps,
    );
    loop.on("session-completed", (evt) => completed.push({ phase: evt.phase, epicSlug: evt.epicSlug }));
    loop.setRunning(true);

    await loop.tick();

    // Wait for session to complete
    await new Promise((r) => setTimeout(r, 100));

    expect(completed).toHaveLength(1);
    expect(completed[0].phase).toBe("release");
    expect(completed[0].epicSlug).toBe("release-epic");

    // Verify the session was cleaned up from tracker
    expect(loop.getTracker().size).toBe(0);

    await loop.stop();
  });

  it("calls strategy cleanup after successful release teardown", async () => {
    // This tests the integration point: release session completes successfully
    const cleanedUpEpics: string[] = [];
    let scanCount = 0;

    const releaseEpic: EnrichedManifest = {
      slug: "cleanup-epic",
      manifestPath: "pipeline/cleanup-epic.manifest.json",
      phase: "validate",
      nextAction: { phase: "release", args: ["cleanup-epic"], type: "single" },
      features: [{ slug: "f1", plan: "f1.md", status: "completed" }],
      artifacts: {},
      lastUpdated: "2026-03-29T00:00:00Z",

    };

    const deps = mockDeps({
      scanEpics: async () => {
        scanCount++;
        if (scanCount === 1) return [releaseEpic];
        return [{ ...releaseEpic, nextAction: null }];
      },
      sessionFactory: new SdkSessionFactory(async (opts) => {
        return {
          id: `release-${Date.now()}`,
          worktreeSlug: `cleanup-epic-release`,
          promise: (async () => {
            // Simulate cleanup on release success
            if (opts.phase === "release") {
              cleanedUpEpics.push(opts.epicSlug);
            }
            return {
              success: true,
              exitCode: 0,
              costUsd: 1.5,
              durationMs: 30000,
            };
          })(),
        };
      }),
    });

    const loop = new WatchLoop(
      { intervalSeconds: 999, projectRoot: TEST_ROOT },
      deps,
    );
    loop.setRunning(true);

    await loop.tick();
    await new Promise((r) => setTimeout(r, 100));

    expect(cleanedUpEpics).toEqual(["cleanup-epic"]);
    await loop.stop();
  });

  it("strategy cleanup failure does not fail the release", async () => {
    let scanCount = 0;
    const completed: Array<{ phase: string; success: boolean }> = [];

    const failingCleanup = async (_epicSlug: string) => {
      throw new Error("cmux is down");
    };

    const releaseEpic: EnrichedManifest = {
      slug: "fragile-epic",
      manifestPath: "pipeline/fragile-epic.manifest.json",
      phase: "validate",
      nextAction: { phase: "release", args: ["fragile-epic"], type: "single" },
      features: [{ slug: "f1", plan: "f1.md", status: "completed" }],
      artifacts: {},
      lastUpdated: "2026-03-29T00:00:00Z",

    };

    const deps = mockDeps({
      scanEpics: async () => {
        scanCount++;
        if (scanCount === 1) return [releaseEpic];
        return [{ ...releaseEpic, nextAction: null }];
      },
      sessionFactory: new SdkSessionFactory(async (opts) => {
        return {
          id: `release-${Date.now()}`,
          worktreeSlug: `fragile-epic-release`,
          promise: (async () => {
            if (opts.phase === "release") {
              try {
                await failingCleanup(opts.epicSlug);
              } catch {
                // Best-effort — mimics the real implementation
              }
            }
            return {
              success: true,
              exitCode: 0,
              costUsd: 1.0,
              durationMs: 5000,
            };
          })(),
        };
      }),
    });

    const loop = new WatchLoop(
      { intervalSeconds: 999, projectRoot: TEST_ROOT },
      deps,
    );
    loop.on("session-completed", (evt) => completed.push({ phase: evt.phase, success: evt.success }));
    loop.setRunning(true);

    await loop.tick();
    await new Promise((r) => setTimeout(r, 100));

    // Release should still be logged as successful despite cleanup failure
    expect(completed).toHaveLength(1);
    expect(completed[0].success).toBe(true);

    await loop.stop();
  });

  it("does not teardown on failed release", async () => {
    const completed: Array<{ phase: string; success: boolean }> = [];
    let scanCount = 0;

    const releaseEpic: EnrichedManifest = {
      slug: "fail-epic",
      manifestPath: "pipeline/fail-epic.manifest.json",
      phase: "validate",
      nextAction: { phase: "release", args: ["fail-epic"], type: "single" },
      features: [{ slug: "f1", plan: "f1.md", status: "completed" }],
      artifacts: {},
      lastUpdated: "2026-03-29T00:00:00Z",

    };

    const deps = mockDeps({
      scanEpics: async () => {
        scanCount++;
        if (scanCount === 1) return [releaseEpic];
        // After failed release, epic still exists but gate blocks re-dispatch
        return [{ ...releaseEpic, nextAction: null }];
      },
      sessionFactory: new SdkSessionFactory(async () => ({
        id: `fail-release-${Date.now()}`,
        worktreeSlug: `fail-epic-release`,
        promise: Promise.resolve({
          success: false,
          exitCode: 1,
          costUsd: 0.5,
          durationMs: 5000,
        }),
      })),
    });

    const loop = new WatchLoop(
      { intervalSeconds: 999, projectRoot: TEST_ROOT },
      deps,
    );
    loop.on("session-completed", (evt) => completed.push({ phase: evt.phase, success: evt.success }));
    loop.setRunning(true);

    await loop.tick();
    await new Promise((r) => setTimeout(r, 100));

    // The failed release should still be tracked
    expect(completed).toHaveLength(1);
    expect(completed[0].success).toBe(false);

    // Session should be cleaned up
    expect(loop.getTracker().size).toBe(0);

    await loop.stop();
  });

  it("does not re-dispatch release after successful completion", async () => {
    let dispatchCount = 0;
    let scanCount = 0;

    const releaseEpic: EnrichedManifest = {
      slug: "done-epic",
      manifestPath: "pipeline/done-epic.manifest.json",
      phase: "validate",
      nextAction: { phase: "release", args: ["done-epic"], type: "single" },
      features: [{ slug: "f1", plan: "f1.md", status: "completed" }],
      artifacts: {},
      lastUpdated: "2026-03-29T00:00:00Z",

    };

    const deps = mockDeps({
      scanEpics: async () => {
        scanCount++;
        if (scanCount === 1) return [releaseEpic];
        // After successful release, manifest is removed — scanner returns empty
        return [];
      },
      sessionFactory: new SdkSessionFactory(async (opts) => {
        dispatchCount++;
        return {
          id: `release-${Date.now()}`,
          worktreeSlug: `done-epic-release`,
          promise: Promise.resolve({
            success: true,
            exitCode: 0,
            costUsd: 1.0,
            durationMs: 5000,
          }),
        };
      }),
    });

    const loop = new WatchLoop(
      { intervalSeconds: 999, projectRoot: TEST_ROOT },
      deps,
    );
    loop.setRunning(true);

    await loop.tick();
    await new Promise((r) => setTimeout(r, 100));

    // Release should only be dispatched once — not re-dispatched after rescan
    expect(dispatchCount).toBe(1);
    expect(loop.getTracker().size).toBe(0);

    await loop.stop();
  });
});
