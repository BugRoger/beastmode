import { describe, test, expect } from "vitest";
import { attachTreeSubscriber } from "../commands/watch-tree-subscriber.js";
import { WatchLoop } from "../commands/watch-loop.js";
import type { WatchDeps } from "../commands/watch-loop.js";
import { createTreeState } from "../tree-view/tree-state.js";

import { createNullLogger } from "../logger.js";
import type { SessionHandle, SessionCreateOpts } from "../dispatch/factory.js";

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
  return new WatchLoop({ intervalSeconds: 9999, projectRoot: "/tmp", installSignalHandlers: false }, makeDeps());
}

describe("attachTreeSubscriber", () => {
  test("started event adds system entry", () => {
    const loop = makeLoop();
    const state = createTreeState();
    const notify = { calls: 0 };
    attachTreeSubscriber(loop, state, () => { notify.calls++; });

    loop.emit("started", { version: "v1.0.0", pid: 123, intervalSeconds: 60 });

    expect(state.systemEntries.length).toBe(1);
    expect(state.systemEntries[0].message).toContain("v1.0.0");
    expect(notify.calls).toBe(1);
  });

  test("stopped event adds system entry", () => {
    const loop = makeLoop();
    const state = createTreeState();
    attachTreeSubscriber(loop, state, () => {});

    loop.emit("stopped");

    expect(state.systemEntries.length).toBe(1);
    expect(state.systemEntries[0].message).toContain("Stopped");
  });

  test("session-started opens phase and adds entry", () => {
    const loop = makeLoop();
    const state = createTreeState();
    attachTreeSubscriber(loop, state, () => {});

    loop.emit("session-started", { epicSlug: "my-epic", phase: "plan", sessionId: "s1" });

    expect(state.epics.length).toBe(1);
    expect(state.epics[0].label).toBe("my-epic");
    expect(state.epics[0].children.length).toBe(1);
    expect(state.epics[0].children[0].label).toBe("plan");
    const phaseEntries = state.epics[0].children[0].entries;
    expect(phaseEntries.length).toBe(1);
    expect(phaseEntries[0].message).toContain("dispatching");
  });

  test("session-started with feature opens phase and adds feature entry", () => {
    const loop = makeLoop();
    const state = createTreeState();
    attachTreeSubscriber(loop, state, () => {});

    loop.emit("session-started", { epicSlug: "my-epic", featureSlug: "feat-a", phase: "implement", sessionId: "s1" });

    const phase = state.epics[0].children[0];
    expect(phase.label).toBe("implement");
    const feature = phase.children.find((c: any) => c.label === "feat-a");
    expect(feature).toBeDefined();
    expect(feature!.entries.length).toBe(1);
    expect(feature!.entries[0].message).toContain("dispatching");
  });

  test("session-completed adds completion entry with duration", () => {
    const loop = makeLoop();
    const state = createTreeState();
    attachTreeSubscriber(loop, state, () => {});

    loop.emit("session-started", { epicSlug: "my-epic", phase: "plan", sessionId: "s1" });
    loop.emit("session-completed", { epicSlug: "my-epic", phase: "plan", success: true, durationMs: 5000, costUsd: 0.42 });

    const phaseEntries = state.epics[0].children[0].entries;
    const completionEntry = phaseEntries.find((e: any) => e.message.includes("completed"));
    expect(completionEntry).toBeDefined();
    expect(completionEntry!.message).toContain("5s");
    expect(completionEntry!.message).toContain("$0.42");
  });

  test("session-completed with failure adds error entry", () => {
    const loop = makeLoop();
    const state = createTreeState();
    attachTreeSubscriber(loop, state, () => {});

    loop.emit("session-started", { epicSlug: "my-epic", phase: "plan", sessionId: "s1" });
    loop.emit("session-completed", { epicSlug: "my-epic", phase: "plan", success: false, durationMs: 3000 });

    const phaseEntries = state.epics[0].children[0].entries;
    const failEntry = phaseEntries.find((e: any) => e.message.includes("failed"));
    expect(failEntry).toBeDefined();
    expect(failEntry!.level).toBe("error");
  });

  test("error event adds error entry under epic", () => {
    const loop = makeLoop();
    const state = createTreeState();
    attachTreeSubscriber(loop, state, () => {});

    loop.emit("error", { epicSlug: "my-epic", message: "something broke" });

    expect(state.epics[0].entries.length).toBe(1);
    expect(state.epics[0].entries[0].message).toBe("something broke");
    expect(state.epics[0].entries[0].level).toBe("error");
  });

  test("error event without epicSlug adds system entry", () => {
    const loop = makeLoop();
    const state = createTreeState();
    attachTreeSubscriber(loop, state, () => {});

    loop.emit("error", { message: "global error" });

    expect(state.systemEntries.length).toBe(1);
    expect(state.systemEntries[0].message).toBe("global error");
    expect(state.systemEntries[0].level).toBe("error");
  });

  test("release:held adds info entry under waiting epic", () => {
    const loop = makeLoop();
    const state = createTreeState();
    attachTreeSubscriber(loop, state, () => {});

    loop.emit("release:held", { waitingSlug: "epic-a", blockingSlug: "epic-b" });

    expect(state.epics[0].label).toBe("epic-a");
    expect(state.epics[0].entries[0].message).toContain("blocked by epic-b");
  });
});
