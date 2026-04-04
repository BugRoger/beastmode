import { describe, test, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import WatchTreeApp from "../commands/WatchTreeApp.js";
import { WatchLoop } from "../commands/watch-loop.js";
import type { WatchDeps } from "../commands/watch-loop.js";
import { createNullLogger } from "../logger.js";
import type { SessionHandle, SessionCreateOpts } from "../dispatch/factory.js";

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

/** Let React/Ink process pending state updates. */
const tick = () => new Promise<void>((r) => setTimeout(r, 50));

function makeDeps(): WatchDeps {
  return {
    scanEpics: async () => [],
    sessionFactory: {
      async create(opts: SessionCreateOpts): Promise<SessionHandle> {
        return { id: "s1", worktreeSlug: opts.epicSlug, promise: Promise.resolve({ success: true, exitCode: 0, durationMs: 0 }) };
      },
    },
    logger: createNullLogger(),
  };
}

function makeLoop(): WatchLoop {
  return new WatchLoop(
    { intervalSeconds: 9999, projectRoot: "/tmp", installSignalHandlers: false },
    makeDeps(),
  );
}

describe("WatchTreeApp", () => {
  test("renders 'no activity' when no events have fired", () => {
    const loop = makeLoop();
    const { lastFrame } = render(
      React.createElement(WatchTreeApp, { loop, verbosity: 0 }),
    );
    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("no activity");
  });

  test("renders system entry after started event", async () => {
    const loop = makeLoop();
    const { lastFrame } = render(
      React.createElement(WatchTreeApp, { loop, verbosity: 0 }),
    );

    loop.emit("started", { version: "v1.0.0", pid: 123, intervalSeconds: 60 });
    await tick();

    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("v1.0.0");
  });

  test("renders epic tree after session-started event", async () => {
    const loop = makeLoop();
    const { lastFrame } = render(
      React.createElement(WatchTreeApp, { loop, verbosity: 0 }),
    );

    loop.emit("session-started", { epicSlug: "my-epic", phase: "plan", sessionId: "s1" });
    await tick();

    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("my-epic");
    expect(output).toContain("plan");
    expect(output).toContain("dispatching");
  });

  test("renders feature node after fan-out session-started", async () => {
    const loop = makeLoop();
    const { lastFrame } = render(
      React.createElement(WatchTreeApp, { loop, verbosity: 0 }),
    );

    loop.emit("session-started", { epicSlug: "my-epic", featureSlug: "feat-a", phase: "implement", sessionId: "s1" });
    await tick();

    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("my-epic");
    expect(output).toContain("implement");
    expect(output).toContain("feat-a");
  });
});
