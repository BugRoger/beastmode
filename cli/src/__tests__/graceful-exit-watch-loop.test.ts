import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock all external dependencies to isolate WatchLoop behavior
const mockAcquireLock = vi.hoisted(() => vi.fn(() => true));
const mockReleaseLock = vi.hoisted(() => vi.fn());
vi.mock("../lockfile.js", () => ({
  acquireLock: mockAcquireLock,
  releaseLock: mockReleaseLock,
}));

const mockResolveVersion = vi.hoisted(() => vi.fn(() => "0.1.0-test"));
vi.mock("../version.js", () => ({
  resolveVersion: mockResolveVersion,
}));

const mockCreateTag = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../git/index.js", () => ({
  createTag: mockCreateTag,
}));

const mockReconcileGitHub = vi.hoisted(() => vi.fn(async () => ({
  bootstrapped: false,
  bootstrapCount: 0,
  opsAttempted: 0,
  opsSucceeded: 0,
  opsFailed: 0,
  opsPermanentlyFailed: 0,
  fullReconcileCount: 0,
  warnings: [],
  updatedRefs: {},
})));
const mockLoadSyncRefs = vi.hoisted(() => vi.fn(() => ({})));
const mockSaveSyncRefs = vi.hoisted(() => vi.fn());
const mockDiscoverGitHub = vi.hoisted(() => vi.fn(async () => null));
vi.mock("../github/index.js", () => ({
  reconcileGitHub: mockReconcileGitHub,
  loadSyncRefs: mockLoadSyncRefs,
  saveSyncRefs: mockSaveSyncRefs,
  discoverGitHub: mockDiscoverGitHub,
}));

const mockLoadConfig = vi.hoisted(() => vi.fn(() => ({
  github: { enabled: false },
})));
vi.mock("../config.js", () => ({
  loadConfig: mockLoadConfig,
}));

describe("WatchLoop stop() enhancements", () => {
  let WatchLoop: typeof import("../commands/watch-loop.js").WatchLoop;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../commands/watch-loop.js");
    WatchLoop = mod.WatchLoop;
  });

  function createLoop() {
    return new WatchLoop(
      { intervalSeconds: 60, projectRoot: "/tmp/test-project", installSignalHandlers: false },
      {
        scanEpics: vi.fn(async () => []),
        sessionFactory: { create: vi.fn() } as any,
      },
    );
  }

  test("stop() removes all event listeners", async () => {
    const loop = createLoop();
    loop.setRunning(true);

    const noop = () => {};
    loop.on("started", noop);
    loop.on("stopped", noop);
    loop.on("scan-complete", noop);
    loop.on("session-started", noop);
    loop.on("session-completed", noop);
    loop.on("error", noop);

    expect(loop.listenerCount("started")).toBeGreaterThan(0);

    await loop.stop();

    expect(loop.listenerCount("started")).toBe(0);
    expect(loop.listenerCount("stopped")).toBe(0);
    expect(loop.listenerCount("scan-complete")).toBe(0);
    expect(loop.listenerCount("session-started")).toBe(0);
    expect(loop.listenerCount("session-completed")).toBe(0);
    expect(loop.listenerCount("error")).toBe(0);
  });

  test("stop() emits 'stopped' before removing listeners", async () => {
    const loop = createLoop();
    loop.setRunning(true);

    let stoppedReceived = false;
    loop.on("stopped", () => {
      stoppedReceived = true;
    });

    await loop.stop();

    expect(stoppedReceived).toBe(true);
  });

  test("stop() logs verbose shutdown steps", async () => {
    const logMessages: string[] = [];
    const mockLogger = {
      info: vi.fn((msg: string) => logMessages.push(msg)),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(() => mockLogger),
    };

    const loop = new WatchLoop(
      { intervalSeconds: 60, projectRoot: "/tmp/test-project", installSignalHandlers: false },
      {
        scanEpics: vi.fn(async () => []),
        sessionFactory: { create: vi.fn() } as any,
        logger: mockLogger as any,
      },
    );
    loop.setRunning(true);

    await loop.stop();

    expect(logMessages.some(m => m.toLowerCase().includes("shutting down"))).toBe(true);
    expect(logMessages.some(m => m.toLowerCase().includes("listener"))).toBe(true);
    expect(logMessages.some(m => m.toLowerCase().includes("lock"))).toBe(true);
  });

  test("watchSession does not call createTag when running is false", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../commands/watch-loop.ts"),
      "utf-8",
    );

    const watchSessionFn = source.slice(
      source.indexOf("private watchSession"),
      source.indexOf("private async rescanEpic"),
    );

    const createTagIdx = watchSessionFn.indexOf("createTag(");
    expect(createTagIdx).toBeGreaterThan(-1);

    const beforeCreateTag = watchSessionFn.slice(0, createTagIdx);
    expect(beforeCreateTag).toContain("this.running");
  });

  test("stop() uses 5000ms timeout for waitAll (not 30000)", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../commands/watch-loop.ts"),
      "utf-8",
    );

    const stopMethod = source.slice(
      source.indexOf("async stop()"),
      source.indexOf("getTracker()"),
    );
    expect(stopMethod).toContain("5_000");
    expect(stopMethod).not.toContain("30_000");
  });

  test("tick() creates a per-tick AbortController", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../commands/watch-loop.ts"),
      "utf-8",
    );

    expect(source).toContain("tickAbortController");

    const tickMethod = source.slice(
      source.indexOf("async tick()"),
      source.indexOf("private async processEpic"),
    );
    expect(tickMethod).toContain("new AbortController()");
    expect(tickMethod).toContain("tickAbortController");
  });

  test("stop() aborts the current tick AbortController", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../commands/watch-loop.ts"),
      "utf-8",
    );

    const stopMethod = source.slice(
      source.indexOf("async stop()"),
      source.indexOf("getTracker()"),
    );
    expect(stopMethod).toContain("tickAbortController");
    expect(stopMethod).toContain("abort()");
  });

  test("tick passes signal to reconcileGitHub", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../commands/watch-loop.ts"),
      "utf-8",
    );

    const tickMethod = source.slice(
      source.indexOf("async tick()"),
      source.indexOf("private async processEpic"),
    );
    const reconcileCall = tickMethod.slice(
      tickMethod.indexOf("reconcileGitHub("),
    );
    expect(reconcileCall).toContain("signal");
  });

  test("no process.exit() in watch-loop.ts stop path", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../commands/watch-loop.ts"),
      "utf-8",
    );

    const stopMethod = source.slice(
      source.indexOf("async stop()"),
      source.indexOf("getTracker()"),
    );
    expect(stopMethod).not.toContain("process.exit");
  });
});
