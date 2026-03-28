import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { WatchLoop } from "../src/watch.js";
import type { WatchDeps } from "../src/watch.js";
import type { EpicState, SessionResult } from "../src/watch-types.js";
import { DispatchTracker } from "../src/dispatch-tracker.js";
import { acquireLock, releaseLock, readLockfile } from "../src/lockfile.js";

const TEST_ROOT = resolve(import.meta.dir, ".test-watch-tmp");

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
      dispatchPhase: async (opts) => ({
        id: `${opts.epicSlug}-${opts.phase}-${Date.now()}`,
        worktreeSlug: `${opts.epicSlug}-${opts.phase}`,
        promise: Promise.resolve({
          success: true,
          exitCode: 0,
          costUsd: 0.1,
          durationMs: 500,
        }),
      }),
      logRun: async () => {},
      ...overrides,
    };
  }

  it("dispatches a single phase for a ready epic", async () => {
    const dispatched: string[] = [];
    let scanCount = 0;

    const readyEpic: EpicState = {
      slug: "my-epic",
      phase: "design",
      nextAction: { phase: "plan", args: ["my-epic"], type: "single" },
      features: [],
      gateBlocked: false,
      costUsd: 0,
    };

    const deps = mockDeps({
      scanEpics: async () => {
        scanCount++;
        // Only return the ready epic on the first scan; after that, simulate "done"
        if (scanCount === 1) return [readyEpic];
        return [{ ...readyEpic, nextAction: null }];
      },
      dispatchPhase: async (opts) => {
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
      },
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

    const implementEpic: EpicState = {
      slug: "my-epic",
      phase: "implement",
      nextAction: {
        phase: "implement",
        args: ["my-epic"],
        type: "fan-out",
        features: ["feat-a", "feat-b", "feat-c"],
      },
      features: [
        { slug: "feat-a", status: "pending" },
        { slug: "feat-b", status: "pending" },
        { slug: "feat-c", status: "pending" },
      ],
      gateBlocked: false,
      costUsd: 0,
    };

    const deps = mockDeps({
      scanEpics: async () => {
        scanCount++;
        if (scanCount === 1) return [implementEpic];
        return [{ ...implementEpic, nextAction: null }];
      },
      dispatchPhase: async (opts) => {
        dispatched.push(
          `${opts.phase} ${opts.args.join(" ")} feature=${opts.featureSlug}`,
        );
        return {
          id: `dispatch-${opts.featureSlug}-${Date.now()}`,
          worktreeSlug: `my-epic-${opts.featureSlug}`,
          promise: Promise.resolve({
            success: true,
            exitCode: 0,
            costUsd: 0.1,
            durationMs: 500,
          }),
        };
      },
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

  it("pauses epics blocked on human gates", async () => {
    const dispatched: string[] = [];

    const gatedEpic: EpicState = {
      slug: "gated-epic",
      phase: "implement",
      nextAction: {
        phase: "implement",
        args: ["gated-epic"],
        type: "single",
      },
      features: [{ slug: "feat-a", status: "pending" }],
      gateBlocked: true,
      gateName: "implement.architectural-deviation",
      costUsd: 0,
    };

    const deps = mockDeps({
      scanEpics: async () => [gatedEpic],
      dispatchPhase: async (opts) => {
        dispatched.push(opts.phase);
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
      },
    });

    const loop = new WatchLoop(
      { intervalSeconds: 999, projectRoot: TEST_ROOT },
      deps,
    );
    loop.setRunning(true);

    await loop.tick();

    // Should NOT dispatch anything for a gated epic
    expect(dispatched).toHaveLength(0);
    await loop.stop();
  });

  it("does not double-dispatch the same phase", async () => {
    let dispatchCount = 0;

    const readyEpic: EpicState = {
      slug: "my-epic",
      phase: "design",
      nextAction: { phase: "plan", args: ["my-epic"], type: "single" },
      features: [],
      gateBlocked: false,
      costUsd: 0,
    };

    const deps = mockDeps({
      scanEpics: async () => [readyEpic],
      dispatchPhase: async () => {
        dispatchCount++;
        return {
          id: `dispatch-${dispatchCount}`,
          worktreeSlug: "my-epic-plan",
          // Never resolves — simulates long-running session
          promise: new Promise(() => {}),
        };
      },
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

    const epics: EpicState[] = [
      {
        slug: "epic-a",
        phase: "design",
        nextAction: { phase: "plan", args: ["epic-a"], type: "single" },
        features: [],
        gateBlocked: false,
        costUsd: 0,
      },
      {
        slug: "epic-b",
        phase: "design",
        nextAction: { phase: "plan", args: ["epic-b"], type: "single" },
        features: [],
        gateBlocked: false,
        costUsd: 0,
      },
    ];

    const deps = mockDeps({
      scanEpics: async () => {
        scanCount++;
        if (scanCount === 1) return epics;
        return epics.map((e) => ({ ...e, nextAction: null }));
      },
      dispatchPhase: async (opts) => {
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
      },
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

  it("logs runs on session completion", async () => {
    const loggedRuns: Array<{
      epicSlug: string;
      phase: string;
      featureSlug?: string;
    }> = [];
    let scanCount = 0;

    const readyEpic: EpicState = {
      slug: "my-epic",
      phase: "design",
      nextAction: { phase: "plan", args: ["my-epic"], type: "single" },
      features: [],
      gateBlocked: false,
      costUsd: 0,
    };

    const deps = mockDeps({
      scanEpics: async () => {
        scanCount++;
        if (scanCount === 1) return [readyEpic];
        return [{ ...readyEpic, nextAction: null }];
      },
      logRun: async (opts) => {
        loggedRuns.push({
          epicSlug: opts.epicSlug,
          phase: opts.phase,
          featureSlug: opts.featureSlug,
        });
      },
    });

    const loop = new WatchLoop(
      { intervalSeconds: 999, projectRoot: TEST_ROOT },
      deps,
    );
    loop.setRunning(true);

    await loop.tick();

    // Wait for session to complete and log
    await new Promise((r) => setTimeout(r, 100));

    expect(loggedRuns).toHaveLength(1);
    expect(loggedRuns[0].epicSlug).toBe("my-epic");
    expect(loggedRuns[0].phase).toBe("plan");

    await loop.stop();
  });

  it("skips epics with no next action", async () => {
    const dispatched: string[] = [];

    const completedEpic: EpicState = {
      slug: "done-epic",
      phase: "release",
      nextAction: null,
      features: [{ slug: "f1", status: "completed" }],
      gateBlocked: false,
      costUsd: 5.0,
    };

    const deps = mockDeps({
      scanEpics: async () => [completedEpic],
      dispatchPhase: async (opts) => {
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
      },
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
});
