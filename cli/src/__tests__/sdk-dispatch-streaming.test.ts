/**
 * Integration test: SDK streaming wiring.
 *
 * Verifies that when a SessionFactory returns a SessionHandle with events,
 * the WatchLoop wires the emitter into the DispatchedSession and messages
 * flow through the ring buffer.
 */

import { describe, test, expect } from "bun:test";
import { WatchLoop } from "../watch.js";
import type { WatchDeps } from "../watch.js";
import type { EnrichedManifest } from "../manifest/store.js";
import type { SessionHandle, SessionCreateOpts } from "../dispatch/factory.js";
import type { WatchConfig } from "../dispatch/types.js";
import { SessionEmitter } from "../dispatch/factory.js";
import type { LogEntry } from "../dispatch/factory.js";
import { createNullLogger } from "../logger.js";

function makeEpic(overrides?: Partial<EnrichedManifest>): EnrichedManifest {
  return {
    slug: "stream-test",
    phase: "design",
    manifestPath: "/tmp/stream-test/manifest.json",
    features: [],
    artifacts: {},
    lastUpdated: new Date().toISOString(),
    blocked: null,
    nextAction: { phase: "design", args: ["stream-test"], type: "single" as const },
    ...overrides,
  };
}

function makeConfig(): WatchConfig {
  return {
    intervalSeconds: 9999,
    projectRoot: "/tmp/test",
    installSignalHandlers: false,
  };
}

describe("SDK dispatch streaming integration", () => {
  test("SessionHandle.events is wired into DispatchedSession", async () => {
    const emitter = new SessionEmitter(50);

    // Pre-populate some entries before the session "starts" (simulates
    // entries arriving before a consumer subscribes)
    emitter.pushEntry({ timestamp: 1, type: "text", text: "early message" });

    const deps: WatchDeps = {
      scanEpics: async () => [makeEpic()],
      sessionFactory: {
        async create(_opts: SessionCreateOpts): Promise<SessionHandle> {
          return {
            id: "stream-session-1",
            worktreeSlug: "stream-test",
            promise: new Promise(() => {}), // Never resolves
            events: emitter,
          };
        },
      },
      logger: createNullLogger(),
    };

    const loop = new WatchLoop(makeConfig(), deps);
    loop.setRunning(true);

    await loop.tick();

    // Get the dispatched session from the tracker
    const tracker = loop.getTracker();
    const sessions = tracker.getAll();

    expect(sessions.length).toBe(1);
    expect(sessions[0].events).toBeDefined();
    expect(sessions[0].events).toBe(emitter);

    // Buffer should contain the early message
    expect(sessions[0].events!.getBuffer().length).toBe(1);
    expect(sessions[0].events!.getBuffer()[0].text).toBe("early message");
  });

  test("events emitter collects messages while session is active", async () => {
    const emitter = new SessionEmitter(50);

    const deps: WatchDeps = {
      scanEpics: async () => [makeEpic()],
      sessionFactory: {
        async create(_opts: SessionCreateOpts): Promise<SessionHandle> {
          return {
            id: "stream-session-2",
            worktreeSlug: "stream-test",
            promise: new Promise(() => {}), // Never resolves
            events: emitter,
          };
        },
      },
      logger: createNullLogger(),
    };

    const loop = new WatchLoop(makeConfig(), deps);
    loop.setRunning(true);
    await loop.tick();

    // Simulate messages arriving after dispatch
    emitter.pushEntry({ timestamp: 10, type: "text", text: "thinking..." });
    emitter.pushEntry({ timestamp: 20, type: "tool-start", text: "[Read] foo.ts" });
    emitter.pushEntry({ timestamp: 30, type: "tool-result", text: "> 42 lines" });
    emitter.pushEntry({ timestamp: 40, type: "heartbeat", text: "..." });

    // Verify buffer contents
    const buf = emitter.getBuffer();
    expect(buf.length).toBe(4);
    expect(buf.map((e: LogEntry) => e.type)).toEqual(["text", "tool-start", "tool-result", "heartbeat"]);
  });

  test("subscriber receives entries in real-time", async () => {
    const emitter = new SessionEmitter(50);
    const received: LogEntry[] = [];

    const deps: WatchDeps = {
      scanEpics: async () => [makeEpic()],
      sessionFactory: {
        async create(_opts: SessionCreateOpts): Promise<SessionHandle> {
          return {
            id: "stream-session-3",
            worktreeSlug: "stream-test",
            promise: new Promise(() => {}),
            events: emitter,
          };
        },
      },
      logger: createNullLogger(),
    };

    const loop = new WatchLoop(makeConfig(), deps);
    loop.setRunning(true);
    await loop.tick();

    // Subscribe after dispatch (simulates navigating to agent log view)
    emitter.on("entry", (entry: LogEntry) => received.push(entry));

    // Push entries
    emitter.pushEntry({ timestamp: 100, type: "text", text: "live message" });
    emitter.pushEntry({ timestamp: 200, type: "result", text: "Exit 0" });

    expect(received.length).toBe(2);
    expect(received[0].text).toBe("live message");
    expect(received[1].text).toBe("Exit 0");
  });

  test("session without events (non-SDK) has undefined events", async () => {
    const deps: WatchDeps = {
      scanEpics: async () => [makeEpic()],
      sessionFactory: {
        async create(_opts: SessionCreateOpts): Promise<SessionHandle> {
          return {
            id: "no-stream-session",
            worktreeSlug: "stream-test",
            promise: new Promise(() => {}),
            // No events field — simulates cmux/iterm2 dispatch
          };
        },
      },
      logger: createNullLogger(),
    };

    const loop = new WatchLoop(makeConfig(), deps);
    loop.setRunning(true);
    await loop.tick();

    const tracker = loop.getTracker();
    const sessions = tracker.getAll();

    expect(sessions.length).toBe(1);
    expect(sessions[0].events).toBeUndefined();
  });
});
