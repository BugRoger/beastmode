import { Given, When, Then, setDefaultTimeout } from "@cucumber/cucumber";
import type { HeartbeatWatchWorld } from "../support/heartbeat-watch-world.js";
import { WatchLoop } from "../../src/commands/watch-loop.js";
import type { WatchDeps } from "../../src/commands/watch-loop.js";
import type { SessionCreateOpts, SessionHandle } from "../../src/dispatch/factory.js";
import { createNullLogger } from "../../src/logger.js";
import type { SessionResult } from "../../src/dispatch/types.js";

// Increase timeout for watch loop operations (these might be slow in tests)
setDefaultTimeout(10000);

function makeConfig() {
  return { intervalSeconds: 60, projectRoot: "/tmp/test", installSignalHandlers: false };
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
            durationMs: 100,
          } as SessionResult),
        };
      },
    },
    logger: createNullLogger(),
    ...overrides,
  };
}

Given("the watch loop is initialized with a configured interval", function (this: HeartbeatWatchWorld) {
  const loop = new WatchLoop(makeConfig(), makeDeps());
  loop.setRunning(true);
  (this as any).loop = loop;

  // Set up event listeners
  loop.on("scan-started", (payload: any) => this.captureEvent("scan-started", payload ?? {}));
  loop.on("scan-complete", (payload: any) => this.captureEvent("scan-complete", payload));
});

When("the watch loop performs a scheduled tick", async function (this: HeartbeatWatchWorld) {
  const loop = (this as any).loop as WatchLoop;
  await Promise.race([
    loop.tick(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("tick timeout")), 5000))
  ]);
});

Then("a {string} event is emitted before epics are scanned", function (this: HeartbeatWatchWorld, eventName: string) {
  const idx = this.events.findIndex((e) => e.type === eventName);
  if (idx === -1) throw new Error(`Expected "${eventName}" event, got: ${this.events.map((e) => e.type).join(", ")}`);

  const scanIdx = this.events.findIndex((e) => e.type === "scan-complete");
  if (scanIdx !== -1 && idx >= scanIdx) throw new Error(`"${eventName}" should be emitted before "scan-complete"`);
});

When("the scan completes", function (this: HeartbeatWatchWorld) {
  // scan-complete already captured from tick()
});

Then("the {string} event includes a trigger value of {string}", function (this: HeartbeatWatchWorld, eventName: string, triggerValue: string) {
  const event = this.events.find((e) => e.type === eventName);
  if (!event) throw new Error(`Expected "${eventName}" event`);
  if ((event.payload as any).trigger !== triggerValue) {
    throw new Error(`Expected trigger="${triggerValue}", got trigger="${(event.payload as any).trigger}"`);
  }
});

Given("the watch loop is running", function (this: HeartbeatWatchWorld) {
  let sessionCount = 0;
  const loop = new WatchLoop(
    makeConfig(),
    makeDeps({
      scanEpics: async () => [
        {
          id: "bm-test",
          type: "epic" as const,
          slug: "test-epic",
          name: "Test",
          status: "design",
          depends_on: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          features: [],
          nextAction: {
            phase: "design",
            args: ["test-epic"],
            type: "single" as const,
          },
        },
      ],
      sessionFactory: {
        async create(opts: SessionCreateOpts): Promise<SessionHandle> {
          const id = `session-${++sessionCount}`;
          return {
            id,
            worktreeSlug: opts.epicSlug,
            promise: Promise.resolve({
              success: true,
              exitCode: 0,
              durationMs: 100,
            } as SessionResult),
          };
        },
      },
    }),
  );
  loop.setRunning(true);
  (this as any).loop = loop;

  // Set up event listeners
  loop.on("scan-started", (payload: any) => this.captureEvent("scan-started", payload ?? {}));
  loop.on("scan-complete", (payload: any) => this.captureEvent("scan-complete", payload));
});

When("a session completion triggers an immediate rescan", async function (this: HeartbeatWatchWorld) {
  const loop = (this as any).loop as WatchLoop;
  await Promise.race([
    loop.tick().then(() => new Promise((r) => setTimeout(r, 100))),
    new Promise((_, reject) => setTimeout(() => reject(new Error("rescan timeout")), 5000))
  ]);
});

When("the rescan completes", function (this: HeartbeatWatchWorld) {
  // rescan already completed above
});

