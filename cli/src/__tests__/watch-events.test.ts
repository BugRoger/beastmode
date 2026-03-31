/**
 * Unit tests for WatchLoop event emission.
 *
 * Verifies that the WatchLoop emits correctly typed events at each
 * lifecycle point: scan-complete, session-started, session-completed,
 * error, epic-blocked, stopped, and fan-out dispatch.
 * Also tests that attachLoggerSubscriber routes events to the logger.
 */

import { describe, test, expect } from "bun:test";
import { WatchLoop, attachLoggerSubscriber } from "../watch";
import type { WatchDeps } from "../watch";
import type { EnrichedManifest } from "../state-scanner";
import type { SessionHandle, SessionCreateOpts } from "../session";
import type { SessionResult, WatchConfig } from "../watch-types";
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
    blocked: null,
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
            costUsd: 0.5,
            durationMs: 1000,
          }),
        };
      },
    },
    logRun: async () => {},
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
    });

    const loop = new WatchLoop(makeConfig(), deps);
    loop.setRunning(true);

    const events: Array<{ epicsScanned: number; dispatched: number }> = [];
    loop.on("scan-complete", (payload) => events.push(payload));

    await loop.tick();

    expect(events.length).toBe(1);
    expect(events[0].epicsScanned).toBe(2);
    expect(events[0].dispatched).toBe(1);
  });

  test("single dispatch emits session-started", async () => {
    const epic = makeEpic();

    const deps = makeDeps({
      scanEpics: async () => [epic],
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
  });

  test("session completion emits session-completed", async () => {
    const epic = makeEpic();

    const deps = makeDeps({
      scanEpics: async () => [epic],
      sessionFactory: {
        async create(opts: SessionCreateOpts): Promise<SessionHandle> {
          return {
            id: `session-complete-test`,
            worktreeSlug: opts.epicSlug,
            promise: Promise.resolve({
              success: true,
              exitCode: 0,
              costUsd: 0.5,
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
      costUsd: number;
      durationMs: number;
    }> = [];
    loop.on("session-completed", (payload) => events.push(payload));

    await loop.tick();

    // Wait for the watchSession promise chain to resolve
    await new Promise((r) => setTimeout(r, 50));

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].epicSlug).toBe("test-epic");
    expect(events[0].phase).toBe("design");
    expect(events[0].success).toBe(true);
    expect(events[0].costUsd).toBe(0.5);
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

  test("blocked epic emits epic-blocked", async () => {
    const epic = makeEpic({
      blocked: { gate: "validate", reason: "needs manual review" },
    });

    const deps = makeDeps({
      scanEpics: async () => [epic],
    });

    const loop = new WatchLoop(makeConfig(), deps);
    loop.setRunning(true);

    const events: Array<{ epicSlug: string; gate: string; reason: string }> = [];
    loop.on("epic-blocked", (payload) => events.push(payload));

    await loop.tick();

    expect(events.length).toBe(1);
    expect(events[0].epicSlug).toBe("test-epic");
    expect(events[0].gate).toBe("validate");
    expect(events[0].reason).toBe("needs manual review");
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
    expect(logged.some((m) => m.includes("my-epic") && m.includes("design"))).toBe(true);

    loop.emit("session-completed", {
      epicSlug: "my-epic",
      phase: "design",
      success: true,
      durationMs: 5000,
      costUsd: 1.23,
    });
    expect(logged.some((m) => m.includes("completed") && m.includes("$1.23"))).toBe(true);

    loop.emit("error", { epicSlug: "my-epic", message: "something broke" });
    expect(errors.some((m) => m.includes("something broke"))).toBe(true);

    loop.emit("epic-blocked", {
      epicSlug: "my-epic",
      gate: "validate",
      reason: "needs review",
    });
    expect(logged.some((m) => m.includes("my-epic") && m.includes("human gate"))).toBe(true);
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
});
