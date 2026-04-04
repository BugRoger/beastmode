/**
 * Unit tests for WatchLoop event emission.
 *
 * Verifies that the WatchLoop emits correctly typed events at each
 * lifecycle point: scan-complete, session-started, session-completed,
 * error, stopped, and fan-out dispatch.
 * Also tests that attachLoggerSubscriber routes events to the logger.
 */

import { describe, test, expect } from "vitest";
import { WatchLoop, attachLoggerSubscriber } from "../commands/watch-loop";
import type { WatchDeps } from "../commands/watch-loop";
import type { EnrichedManifest } from "../manifest/store";
import type { SessionHandle, SessionCreateOpts } from "../dispatch/factory";
import type { WatchConfig } from "../dispatch/types";
import { createNullLogger } from "../logger";
import type { Logger } from "../logger";

// --- Helpers ---

function makeEpic(overrides?: Partial<EnrichedManifest>): EnrichedManifest {
  return {
    slug: "test-epic",
    phase: "design",
    manifestPath: "/tmp/test-epic/manifest.json",
    features: [],
    artifacts: {},
    lastUpdated: new Date().toISOString(),
    nextAction: { phase: "design", args: ["test-epic"], type: "single" as const },
    ...overrides,
  };
}

function makeDeps(overrides?: Partial<WatchDeps>): WatchDeps {
  return {
    scanEpics: async () => [],
    sessionFactory: {
      async create(opts: SessionCreateOpts): Promise<SessionHandle> {
        return {
          id: `session-${Date.now()}`,
          worktreeSlug: opts.epicSlug,
          promise: Promise.resolve({
            success: true,
            exitCode: 0,
            durationMs: 1000,
          }),
        };
      },
    },
    logger: createNullLogger(),
    ...overrides,
  };
}

function makeConfig(overrides?: Partial<WatchConfig>): WatchConfig {
  return {
    intervalSeconds: 9999,
    projectRoot: "/tmp/test",
    installSignalHandlers: false,
    ...overrides,
  };
}

// --- Tests ---

describe("WatchLoop event emission", () => {
  test("tick emits scan-complete with correct counts", async () => {
    const epicWithAction = makeEpic({ slug: "epic-a" });
    const epicWithoutAction = makeEpic({
      slug: "epic-b",
      nextAction: null,
    });

    const deps = makeDeps({
      scanEpics: async () => [epicWithAction, epicWithoutAction],
      sessionFactory: {
        async create(opts: SessionCreateOpts): Promise<SessionHandle> {
          return {
            id: `session-${Date.now()}`,
            worktreeSlug: opts.epicSlug,
            promise: new Promise(() => {}), // Never resolves — avoids rescan loop
          };
        },
      },
    });

    const loop = new WatchLoop(makeConfig(), deps);
    loop.setRunning(true);

    const events: Array<{ epicsScanned: number; dispatched: number }> = [];
    loop.on("scan-complete", (payload) => events.push(payload));

    await loop.tick();

    expect(events.length).toBe(1);
    expect(events[0].epicsScanned).toBe(2);
    expect(events[0].dispatched).toBe(1);
    loop.setRunning(false);
  });

  test("single dispatch emits session-started", async () => {
    const epic = makeEpic();

    const deps = makeDeps({
      scanEpics: async () => [epic],
      sessionFactory: {
        async create(opts: SessionCreateOpts): Promise<SessionHandle> {
          return {
            id: `session-started-test`,
            worktreeSlug: opts.epicSlug,
            promise: new Promise(() => {}), // Never resolves — avoids rescan loop
          };
        },
      },
    });

    const loop = new WatchLoop(makeConfig(), deps);
    loop.setRunning(true);

    const events: Array<{ epicSlug: string; phase: string; sessionId: string }> = [];
    loop.on("session-started", (payload) => events.push(payload));

    await loop.tick();

    expect(events.length).toBe(1);
    expect(events[0].epicSlug).toBe("test-epic");
    expect(events[0].phase).toBe("design");
    expect(typeof events[0].sessionId).toBe("string");
    expect(events[0].sessionId.length).toBeGreaterThan(0);
    loop.setRunning(false);
  });

  test("session completion emits session-completed", async () => {
    const epic = makeEpic();

    let scanCount = 0;
    const deps = makeDeps({
      scanEpics: async () => {
        scanCount++;
        // Return epic only on first scan; rescan after completion returns empty
        // to prevent infinite dispatch loop.
        return scanCount === 1 ? [epic] : [];
      },
      sessionFactory: {
        async create(opts: SessionCreateOpts): Promise<SessionHandle> {
          return {
            id: `session-complete-test`,
            worktreeSlug: opts.epicSlug,
            promise: Promise.resolve({
              success: true,
              exitCode: 0,
              durationMs: 1000,
            }),
          };
        },
      },
    });

    const loop = new WatchLoop(makeConfig(), deps);
    loop.setRunning(true);

    const events: Array<{
      epicSlug: string;
      phase: string;
      success: boolean;
      durationMs: number;
    }> = [];
    loop.on("session-completed", (payload) => events.push(payload));

    await loop.tick();

    // Wait for the watchSession promise chain to resolve
    await new Promise((r) => setTimeout(r, 50));

    expect(events.length).toBe(1);
    expect(events[0].epicSlug).toBe("test-epic");
    expect(events[0].phase).toBe("design");
    expect(events[0].success).toBe(true);
    expect(events[0].durationMs).toBe(1000);
  });

  test("dispatch failure emits error event", async () => {
    const epic = makeEpic();

    const deps = makeDeps({
      scanEpics: async () => [epic],
      sessionFactory: {
        async create(_opts: SessionCreateOpts): Promise<SessionHandle> {
          throw new Error("session factory exploded");
        },
      },
    });

    const loop = new WatchLoop(makeConfig(), deps);
    loop.setRunning(true);

    const errors: Array<{ epicSlug?: string; message: string }> = [];
    loop.on("error", (payload) => errors.push(payload));

    await loop.tick();

    expect(errors.length).toBe(1);
    expect(errors[0].epicSlug).toBe("test-epic");
    expect(errors[0].message).toContain("Failed to dispatch");
  });

  test("fan-out dispatch emits session-started per feature", async () => {
    const epic = makeEpic({
      slug: "fanout-epic",
      phase: "implement",
      features: [
        { slug: "feat-a", plan: "feat-a.md", status: "pending" },
        { slug: "feat-b", plan: "feat-b.md", status: "pending" },
        { slug: "feat-c", plan: "feat-c.md", status: "pending" },
      ],
      nextAction: {
        phase: "implement",
        args: ["fanout-epic"],
        type: "fan-out" as const,
        features: ["feat-a", "feat-b", "feat-c"],
      },
    });

    let sessionCounter = 0;
    const deps = makeDeps({
      scanEpics: async () => [epic],
      sessionFactory: {
        async create(opts: SessionCreateOpts): Promise<SessionHandle> {
          sessionCounter++;
          return {
            id: `session-fanout-${sessionCounter}`,
            worktreeSlug: opts.epicSlug,
            promise: new Promise(() => {}), // Never resolves — keeps sessions active
          };
        },
      },
    });

    const loop = new WatchLoop(makeConfig(), deps);
    loop.setRunning(true);

    const events: Array<{
      epicSlug: string;
      featureSlug?: string;
      phase: string;
      sessionId: string;
    }> = [];
    loop.on("session-started", (payload) => events.push(payload));

    await loop.tick();

    expect(events.length).toBe(3);
    const featureSlugs = events.map((e) => e.featureSlug).sort();
    expect(featureSlugs).toEqual(["feat-a", "feat-b", "feat-c"]);
    for (const event of events) {
      expect(event.epicSlug).toBe("fanout-epic");
      expect(event.phase).toBe("implement");
    }
    loop.setRunning(false);
  });

  test("attachLoggerSubscriber routes events to logger", () => {
    const deps = makeDeps();
    const loop = new WatchLoop(makeConfig(), deps);

    const logged: string[] = [];
    const errors: string[] = [];

    const mockLogger: Logger = {
      log: (msg: string) => logged.push(msg),
      detail: (msg: string) => logged.push(msg),
      debug: () => {},
      trace: () => {},
      warn: () => {},
      error: (msg: string) => errors.push(msg),
      child: () => mockLogger,
    };

    attachLoggerSubscriber(loop, mockLogger);

    // Emit events manually and check logger was called
    loop.emit("started", { version: "v1.0.0", pid: 12345, intervalSeconds: 30 });
    expect(logged.some((m) => m.includes("v1.0.0") && m.includes("12345"))).toBe(true);

    loop.emit("stopped");
    expect(logged.some((m) => m.includes("Stopped"))).toBe(true);

    loop.emit("session-started", {
      epicSlug: "my-epic",
      phase: "design",
      sessionId: "sess-1",
    });
    expect(logged.some((m) => m.includes("dispatching"))).toBe(true);

    loop.emit("session-completed", {
      epicSlug: "my-epic",
      phase: "design",
      success: true,
      durationMs: 5000,
      costUsd: 0.42,
    });
    expect(logged.some((m) => m.includes("completed"))).toBe(true);

    loop.emit("error", { epicSlug: "my-epic", message: "something broke" });
    expect(errors.some((m) => m.includes("something broke"))).toBe(true);

    loop.emit("release:held", {
      waitingSlug: "waiting-epic",
      blockingSlug: "blocking-epic",
    });
    expect(logged.some((m) => m.includes("release held") && m.includes("waiting-epic") && m.includes("blocking-epic"))).toBe(true);
  });

  test("stop emits stopped event", async () => {
    const deps = makeDeps();
    const loop = new WatchLoop(makeConfig(), deps);
    loop.setRunning(true);

    const events: Array<Record<string, never>> = [];
    loop.on("stopped", () => events.push({}));

    await loop.stop();

    expect(events.length).toBe(1);
  });

  test("emits release:held when release serialization blocks dispatch", async () => {
    const epicA = makeEpic({
      slug: "epic-a",
      phase: "release",
      nextAction: { phase: "release", args: ["epic-a"], type: "single" as const },
    });
    const epicB = makeEpic({
      slug: "epic-b",
      phase: "release",
      nextAction: { phase: "release", args: ["epic-b"], type: "single" as const },
    });

    const deps = makeDeps({
      scanEpics: async () => [epicA, epicB],
      sessionFactory: {
        async create(opts: SessionCreateOpts): Promise<SessionHandle> {
          return {
            id: `session-${opts.epicSlug}`,
            worktreeSlug: opts.epicSlug,
            promise: new Promise(() => {}), // Never resolves — keeps session active
          };
        },
      },
    });

    const loop = new WatchLoop(makeConfig(), deps);
    loop.setRunning(true);

    const held: Array<{ waitingSlug: string; blockingSlug: string }> = [];
    loop.on("release:held", (payload) => held.push(payload));

    await loop.tick();

    expect(held.length).toBe(1);
    expect(held[0].waitingSlug).toBe("epic-b");
    expect(held[0].blockingSlug).toBe("epic-a");
    loop.setRunning(false);
  });

  test("tick calls checkLiveness before epic scan when factory supports it", async () => {
    const callOrder: string[] = [];
    let scanCount = 0;

    const deps = makeDeps({
      scanEpics: async () => {
        callOrder.push("scan");
        scanCount++;
        // First scan dispatches one session, second scan (rescan after completion) returns empty
        if (scanCount === 1) {
          return [makeEpic({ slug: "test-epic", nextAction: { phase: "design", args: ["test-epic"], type: "single" as const } })];
        }
        return [];
      },
      sessionFactory: {
        async create(opts: SessionCreateOpts): Promise<SessionHandle> {
          return {
            id: `session-${Date.now()}`,
            worktreeSlug: opts.epicSlug,
            promise: new Promise(() => {}), // Never resolves
          };
        },
        async checkLiveness(_sessions: import("../dispatch/types").DispatchedSession[]) {
          callOrder.push("checkLiveness");
        },
      },
    });

    const loop = new WatchLoop(makeConfig(), deps);
    loop.setRunning(true);

    // First tick: dispatch the session
    await loop.tick();
    expect(callOrder).toEqual(["scan"]); // No liveness check on first tick (tracker empty)

    // Second tick: liveness check should run first
    callOrder.length = 0;
    await loop.tick();

    expect(callOrder).toEqual(["checkLiveness", "scan"]);
    loop.setRunning(false);
  });

  test("tick skips checkLiveness when factory does not support it", async () => {
    const deps = makeDeps({
      scanEpics: async () => [],
      sessionFactory: {
        async create(opts: SessionCreateOpts): Promise<SessionHandle> {
          return {
            id: `session-${Date.now()}`,
            worktreeSlug: opts.epicSlug,
            promise: new Promise(() => {}),
          };
        },
        // No checkLiveness method
      },
    });

    const loop = new WatchLoop(makeConfig(), deps);
    loop.setRunning(true);

    // Should not throw
    await loop.tick();
    loop.setRunning(false);
  });

  test("emits session-dead when liveness check detects dead session", async () => {
    const resolvers = new Map<string, (result: import("../dispatch/types").SessionResult) => void>();

    let scanCount = 0;
    const deps = makeDeps({
      scanEpics: async () => {
        scanCount++;
        if (scanCount === 1) {
          return [makeEpic({ slug: "dead-epic", nextAction: { phase: "plan", args: ["dead-epic"], type: "single" as const } })];
        }
        return [];
      },
      sessionFactory: {
        async create(opts: SessionCreateOpts): Promise<SessionHandle> {
          let resolvePromise!: (result: import("../dispatch/types").SessionResult) => void;
          const promise = new Promise<import("../dispatch/types").SessionResult>((resolve) => {
            resolvePromise = resolve;
          });
          const id = `session-dead-test`;
          resolvers.set(id, resolvePromise);
          return { id, worktreeSlug: opts.epicSlug, promise };
        },
        async checkLiveness(sessions: import("../dispatch/types").DispatchedSession[]) {
          for (const session of sessions) {
            const resolver = resolvers.get(session.id);
            if (resolver) {
              resolver({ success: false, exitCode: 1, durationMs: 1000 });
            }
          }
        },
      },
    });

    const loop = new WatchLoop(makeConfig(), deps);
    loop.setRunning(true);

    const deadEvents: Array<{ epicSlug: string; phase: string; sessionId: string }> = [];
    loop.on("session-dead", (payload) => deadEvents.push(payload));

    // First tick dispatches the session
    await loop.tick();
    await new Promise((r) => setTimeout(r, 50));

    // Second tick triggers liveness check — which force-resolves the dead session
    await loop.tick();
    await new Promise((r) => setTimeout(r, 50));

    expect(deadEvents.length).toBe(1);
    expect(deadEvents[0].epicSlug).toBe("dead-epic");
    expect(deadEvents[0].phase).toBe("plan");
    expect(deadEvents[0].sessionId).toBe("session-dead-test");
    loop.setRunning(false);
  });

  test("session-dead fires before session-completed in event sequence", async () => {
    const resolvers = new Map<string, (result: import("../dispatch/types").SessionResult) => void>();
    const eventOrder: string[] = [];

    let scanCount = 0;
    const deps = makeDeps({
      scanEpics: async () => {
        scanCount++;
        if (scanCount === 1) {
          return [makeEpic({ slug: "order-epic", nextAction: { phase: "plan", args: ["order-epic"], type: "single" as const } })];
        }
        return [];
      },
      sessionFactory: {
        async create(opts: SessionCreateOpts): Promise<SessionHandle> {
          let resolvePromise!: (result: import("../dispatch/types").SessionResult) => void;
          const promise = new Promise<import("../dispatch/types").SessionResult>((resolve) => {
            resolvePromise = resolve;
          });
          const id = `session-order-test`;
          resolvers.set(id, resolvePromise);
          return { id, worktreeSlug: opts.epicSlug, promise };
        },
        async checkLiveness(sessions: import("../dispatch/types").DispatchedSession[]) {
          for (const session of sessions) {
            const resolver = resolvers.get(session.id);
            if (resolver) {
              resolver({ success: false, exitCode: 1, durationMs: 500 });
            }
          }
        },
      },
    });

    const loop = new WatchLoop(makeConfig(), deps);
    loop.setRunning(true);

    loop.on("session-dead", () => eventOrder.push("session-dead"));
    loop.on("session-completed", () => eventOrder.push("session-completed"));

    await loop.tick();
    await new Promise((r) => setTimeout(r, 50));

    await loop.tick();
    await new Promise((r) => setTimeout(r, 50));

    expect(eventOrder[0]).toBe("session-dead");
    expect(eventOrder[1]).toBe("session-completed");
    loop.setRunning(false);
  });
});
