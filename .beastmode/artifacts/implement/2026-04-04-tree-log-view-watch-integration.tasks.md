# Watch Integration — Implementation Tasks

## Goal

Wire TreeLogger and TreeView into `beastmode watch` with TTY detection and `--plain` flag. Tree mode renders hierarchical pipeline output on TTY; flat mode preserves existing behavior for non-TTY or `--plain`.

## Architecture

- **Two type systems**: Dashboard uses flat types (`EpicNode.phases[].features[]` in `dashboard/tree-types.ts`), tree-view module uses recursive types (`TreeNode.children[]` in `tree-view/types.ts`). The TreeView Ink component consumes dashboard types.
- **Bridge pattern**: An adapter function converts recursive `TreeState` (from `useTreeState`) to flat dashboard `TreeState` (for `TreeView` component).
- **Subscriber pattern**: `attachTreeSubscriber` mirrors `attachLoggerSubscriber` — wires WatchLoop events to tree state mutations instead of logger calls.
- **WatchTreeApp**: Minimal Ink component wrapping `useTreeState` + `TreeView` + subscriber wiring + shutdown handling.
- **No alternate screen**: Unlike dashboard, watch tree runs in normal buffer for full scrollback.

## Tech Stack

- TypeScript, Bun test runner, Ink (React for terminal), chalk
- Dynamic imports for React/Ink (same pattern as dashboard)

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `cli/src/tree-view/adapter.ts` | Create | Convert recursive TreeState to flat dashboard TreeState |
| `cli/src/__tests__/tree-adapter.test.ts` | Create | Unit tests for the adapter |
| `cli/src/tree-view/index.ts` | Modify | Export adapter |
| `cli/src/commands/watch-tree-subscriber.ts` | Create | `attachTreeSubscriber` — wire WatchLoop events to tree state |
| `cli/src/__tests__/watch-tree-subscriber.test.ts` | Create | Unit tests for the tree subscriber |
| `cli/src/commands/WatchTreeApp.tsx` | Create | Ink component for tree-mode watch |
| `cli/src/__tests__/watch-tree-app.test.ts` | Create | Integration tests for the Ink app |
| `cli/src/commands/watch.ts` | Modify | TTY detection, `--plain` flag, conditional tree/flat mode |
| `cli/src/__tests__/watch-integration.test.ts` | Create | Integration test for --plain output matching flat format |

---

### Task 0: TreeState Adapter

**Wave:** 1
**Depends on:** -

Convert the recursive `TreeState` (tree-view module) to the flat `TreeState` (dashboard types) so the shared `TreeView` component can render it.

**Files:**
- Create: `cli/src/tree-view/adapter.ts`
- Create: `cli/src/__tests__/tree-adapter.test.ts`
- Modify: `cli/src/tree-view/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// cli/src/__tests__/tree-adapter.test.ts
import { describe, test, expect } from "bun:test";
import { toFlatTreeState } from "../tree-view/adapter.js";
import { createTreeState, addEntry, openPhase } from "../tree-view/tree-state.js";
import type { TreeState as DashboardTreeState } from "../dashboard/tree-types.js";

describe("toFlatTreeState", () => {
  test("converts empty state", () => {
    const state = createTreeState();
    const flat = toFlatTreeState(state);
    expect(flat.epics).toEqual([]);
    expect(flat.system).toEqual([]);
  });

  test("converts system entries", () => {
    const state = createTreeState();
    addEntry(state, "info", {}, "system message");
    const flat = toFlatTreeState(state);
    expect(flat.system.length).toBe(1);
    expect(flat.system[0].message).toBe("system message");
    expect(flat.system[0].level).toBe("info");
    expect(typeof flat.system[0].seq).toBe("number");
  });

  test("converts epic with phase entries", () => {
    const state = createTreeState();
    openPhase(state, "my-epic", "plan");
    addEntry(state, "info", { epic: "my-epic", phase: "plan" }, "planning stuff");
    const flat = toFlatTreeState(state);
    expect(flat.epics.length).toBe(1);
    expect(flat.epics[0].slug).toBe("my-epic");
    expect(flat.epics[0].phases.length).toBe(1);
    expect(flat.epics[0].phases[0].phase).toBe("plan");
    expect(flat.epics[0].phases[0].entries.length).toBe(1);
    expect(flat.epics[0].phases[0].entries[0].message).toBe("planning stuff");
  });

  test("converts epic with feature entries", () => {
    const state = createTreeState();
    openPhase(state, "my-epic", "implement");
    addEntry(state, "info", { epic: "my-epic", phase: "implement", feature: "feat-a" }, "coding");
    const flat = toFlatTreeState(state);
    const phase = flat.epics[0].phases[0];
    expect(phase.features.length).toBe(1);
    expect(phase.features[0].slug).toBe("feat-a");
    expect(phase.features[0].entries.length).toBe(1);
    expect(phase.features[0].entries[0].message).toBe("coding");
  });

  test("preserves entry ordering via seq", () => {
    const state = createTreeState();
    openPhase(state, "my-epic", "plan");
    addEntry(state, "info", { epic: "my-epic", phase: "plan" }, "first");
    addEntry(state, "info", { epic: "my-epic", phase: "plan" }, "second");
    const flat = toFlatTreeState(state);
    const entries = flat.epics[0].phases[0].entries;
    expect(entries[0].seq).toBeLessThan(entries[1].seq);
  });

  test("handles multiple epics", () => {
    const state = createTreeState();
    openPhase(state, "epic-a", "plan");
    openPhase(state, "epic-b", "implement");
    addEntry(state, "info", { epic: "epic-a", phase: "plan" }, "a-msg");
    addEntry(state, "info", { epic: "epic-b", phase: "implement" }, "b-msg");
    const flat = toFlatTreeState(state);
    expect(flat.epics.length).toBe(2);
    expect(flat.epics[0].slug).toBe("epic-a");
    expect(flat.epics[1].slug).toBe("epic-b");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun test src/__tests__/tree-adapter.test.ts --timeout 15000`
Expected: FAIL — module `../tree-view/adapter.js` not found

- [ ] **Step 3: Write the adapter implementation**

```typescript
// cli/src/tree-view/adapter.ts
import type { TreeState as RecursiveTreeState, TreeNode, TreeEntry as RecursiveEntry } from "./types.js";
import type {
  TreeState as FlatTreeState,
  EpicNode,
  PhaseNode,
  FeatureNode,
  TreeEntry as FlatEntry,
  SystemEntry,
} from "../dashboard/tree-types.js";

let _seq = 0;

function toFlatEntry(entry: RecursiveEntry): FlatEntry {
  return {
    timestamp: entry.timestamp,
    level: entry.level,
    message: entry.message,
    seq: ++_seq,
  };
}

function toSystemEntry(entry: RecursiveEntry): SystemEntry {
  return {
    timestamp: entry.timestamp,
    level: entry.level,
    message: entry.message,
    seq: ++_seq,
  };
}

function toFeatureNode(node: TreeNode): FeatureNode {
  return {
    slug: node.label,
    entries: node.entries.map(toFlatEntry),
  };
}

function toPhaseNode(node: TreeNode): PhaseNode {
  return {
    phase: node.label,
    features: node.children
      .filter((c) => c.type === "feature")
      .map(toFeatureNode),
    entries: node.entries.map(toFlatEntry),
  };
}

function toEpicNode(node: TreeNode): EpicNode {
  return {
    slug: node.label,
    phases: node.children
      .filter((c) => c.type === "phase")
      .map(toPhaseNode),
  };
}

/**
 * Convert the recursive TreeState (tree-view module) to the flat
 * TreeState (dashboard types) for use with the shared TreeView component.
 */
export function toFlatTreeState(state: RecursiveTreeState): FlatTreeState {
  return {
    epics: state.epics.map(toEpicNode),
    system: state.systemEntries.map(toSystemEntry),
  };
}
```

- [ ] **Step 4: Export adapter from barrel**

Add to `cli/src/tree-view/index.ts`:
```typescript
// Adapter
export { toFlatTreeState } from "./adapter.js";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd cli && bun test src/__tests__/tree-adapter.test.ts --timeout 15000`
Expected: PASS — all 6 tests green

- [ ] **Step 6: Commit**

```bash
git add cli/src/tree-view/adapter.ts cli/src/__tests__/tree-adapter.test.ts cli/src/tree-view/index.ts
git commit -m "feat(watch-integration): add TreeState adapter for recursive-to-flat conversion"
```

---

### Task 1: Watch Tree Subscriber

**Wave:** 1
**Depends on:** -

Create `attachTreeSubscriber` that wires WatchLoop events to tree state mutations — the tree-mode equivalent of `attachLoggerSubscriber`.

**Files:**
- Create: `cli/src/commands/watch-tree-subscriber.ts`
- Create: `cli/src/__tests__/watch-tree-subscriber.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// cli/src/__tests__/watch-tree-subscriber.test.ts
import { describe, test, expect } from "bun:test";
import { attachTreeSubscriber } from "../commands/watch-tree-subscriber.js";
import { WatchLoop } from "../commands/watch-loop.js";
import type { WatchDeps } from "../commands/watch-loop.js";
import { createTreeState } from "../tree-view/tree-state.js";
import type { TreeState } from "../tree-view/types.js";
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

    // Should have created epic with phase child
    expect(state.epics.length).toBe(1);
    expect(state.epics[0].label).toBe("my-epic");
    expect(state.epics[0].children.length).toBe(1);
    expect(state.epics[0].children[0].label).toBe("plan");
    // Should have a dispatching entry under the phase
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
    // Feature node created under phase
    const feature = phase.children.find((c) => c.label === "feat-a");
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
    const completionEntry = phaseEntries.find((e) => e.message.includes("completed"));
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
    const failEntry = phaseEntries.find((e) => e.message.includes("failed"));
    expect(failEntry).toBeDefined();
    expect(failEntry!.level).toBe("error");
  });

  test("error event adds error entry under epic", () => {
    const loop = makeLoop();
    const state = createTreeState();
    attachTreeSubscriber(loop, state, () => {});

    loop.emit("error", { epicSlug: "my-epic", message: "something broke" });

    // Error without a phase goes to epic entries
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun test src/__tests__/watch-tree-subscriber.test.ts --timeout 15000`
Expected: FAIL — module `../commands/watch-tree-subscriber.js` not found

- [ ] **Step 3: Write the subscriber implementation**

```typescript
// cli/src/commands/watch-tree-subscriber.ts
import type { WatchLoop } from "./watch-loop.js";
import type { TreeState } from "../tree-view/types.js";
import { addEntry, openPhase, closePhase } from "../tree-view/tree-state.js";

/**
 * Attach a tree-state subscriber to the WatchLoop.
 *
 * Mirrors attachLoggerSubscriber but routes events to tree state mutations
 * instead of logger calls. The notify callback triggers Ink re-renders.
 */
export function attachTreeSubscriber(
  loop: WatchLoop,
  state: TreeState,
  notify: () => void,
): void {
  loop.on("started", ({ version, pid, intervalSeconds }) => {
    addEntry(state, "info", {}, `Started ${version} (PID ${pid}, poll every ${intervalSeconds}s)`);
    notify();
  });

  loop.on("stopped", () => {
    addEntry(state, "info", {}, "Stopped.");
    notify();
  });

  loop.on("session-started", ({ epicSlug, featureSlug, phase }) => {
    openPhase(state, epicSlug, phase);
    if (featureSlug) {
      addEntry(state, "info", { epic: epicSlug, phase, feature: featureSlug }, "dispatching");
    } else {
      addEntry(state, "info", { epic: epicSlug, phase }, "dispatching");
    }
    notify();
  });

  loop.on("session-completed", ({ epicSlug, featureSlug, phase, success, durationMs, costUsd }) => {
    const status = success ? "completed" : "failed";
    const dur = `${(durationMs / 1000).toFixed(0)}s`;
    const detail = costUsd != null ? `$${costUsd.toFixed(2)}, ${dur}` : dur;
    const level = success ? "info" : "error";
    const context = featureSlug
      ? { epic: epicSlug, phase, feature: featureSlug }
      : { epic: epicSlug, phase };
    addEntry(state, level, context, `${status} (${detail})`);
    if (!success) {
      closePhase(state, epicSlug, phase);
    }
    notify();
  });

  loop.on("error", ({ epicSlug, message }) => {
    if (epicSlug) {
      addEntry(state, "error", { epic: epicSlug }, message);
    } else {
      addEntry(state, "error", {}, message);
    }
    notify();
  });

  loop.on("release:held", ({ waitingSlug, blockingSlug }) => {
    addEntry(state, "info", { epic: waitingSlug }, `release held: blocked by ${blockingSlug}`);
    notify();
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd cli && bun test src/__tests__/watch-tree-subscriber.test.ts --timeout 15000`
Expected: PASS — all 9 tests green

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/watch-tree-subscriber.ts cli/src/__tests__/watch-tree-subscriber.test.ts
git commit -m "feat(watch-integration): add attachTreeSubscriber for WatchLoop-to-tree wiring"
```

---

### Task 2: WatchTreeApp Ink Component

**Wave:** 2
**Depends on:** Task 0, Task 1

Create the minimal Ink component that composes `useTreeState` + adapter + `TreeView` + subscriber + shutdown handling.

**Files:**
- Create: `cli/src/commands/WatchTreeApp.tsx`
- Create: `cli/src/__tests__/watch-tree-app.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// cli/src/__tests__/watch-tree-app.test.ts
import { describe, test, expect } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import WatchTreeApp from "../commands/WatchTreeApp.js";
import { WatchLoop } from "../commands/watch-loop.js";
import type { WatchDeps } from "../commands/watch-loop.js";
import { createNullLogger } from "../logger.js";
import type { SessionHandle, SessionCreateOpts } from "../dispatch/factory.js";

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

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

  test("renders system entry after started event", () => {
    const loop = makeLoop();
    const { lastFrame } = render(
      React.createElement(WatchTreeApp, { loop, verbosity: 0 }),
    );

    loop.emit("started", { version: "v1.0.0", pid: 123, intervalSeconds: 60 });

    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("v1.0.0");
  });

  test("renders epic tree after session-started event", () => {
    const loop = makeLoop();
    const { lastFrame } = render(
      React.createElement(WatchTreeApp, { loop, verbosity: 0 }),
    );

    loop.emit("session-started", { epicSlug: "my-epic", phase: "plan", sessionId: "s1" });

    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("my-epic");
    expect(output).toContain("plan");
    expect(output).toContain("dispatching");
  });

  test("renders feature node after fan-out session-started", () => {
    const loop = makeLoop();
    const { lastFrame } = render(
      React.createElement(WatchTreeApp, { loop, verbosity: 0 }),
    );

    loop.emit("session-started", { epicSlug: "my-epic", featureSlug: "feat-a", phase: "implement", sessionId: "s1" });

    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("my-epic");
    expect(output).toContain("implement");
    expect(output).toContain("feat-a");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun test src/__tests__/watch-tree-app.test.ts --timeout 15000`
Expected: FAIL — module `../commands/WatchTreeApp.js` not found

- [ ] **Step 3: Write the WatchTreeApp component**

```tsx
// cli/src/commands/WatchTreeApp.tsx
import { useEffect } from "react";
import type { WatchLoop } from "./watch-loop.js";
import { useTreeState } from "../tree-view/use-tree-state.js";
import { toFlatTreeState } from "../tree-view/adapter.js";
import { attachTreeSubscriber } from "./watch-tree-subscriber.js";
import TreeView from "../dashboard/TreeView.js";

export interface WatchTreeAppProps {
  loop: WatchLoop;
  verbosity: number;
}

export default function WatchTreeApp({ loop, verbosity }: WatchTreeAppProps) {
  const { state, openPhase, closePhase, addEntry } = useTreeState();

  useEffect(() => {
    // Wire WatchLoop events to tree state mutations.
    // attachTreeSubscriber registers event listeners that persist for
    // the lifetime of the component. The notify callback (empty here)
    // is not needed because useTreeState's internal bump() already
    // triggers re-renders via the TreeLogger / direct mutation wrappers.
    // However, attachTreeSubscriber mutates state directly (not through
    // the hook wrappers), so we need a custom notify to trigger re-renders.
    //
    // We pass a no-op here because the subscriber calls addEntry/openPhase
    // which mutate the state ref in place. The useTreeState hook's bump()
    // is the canonical re-render trigger, but the subscriber bypasses
    // the hook wrappers. We'll use a forceUpdate pattern instead.
  }, []);

  // The subscriber needs direct access to the state ref and a re-render trigger.
  // useTreeState already provides this via its callbacks, but attachTreeSubscriber
  // operates on raw state. We wire it once on mount.
  useEffect(() => {
    // We need a way to force re-renders when the subscriber mutates state.
    // The subscriber calls tree-state.ts functions directly, bypassing
    // useTreeState's bump(). We'll pass the hook's internal methods instead.
    const cleanup = wireSubscriber(loop, state, openPhase, closePhase, addEntry);
    return cleanup;
  }, [loop]);

  const flatState = toFlatTreeState(state);
  return <TreeView state={flatState} />;
}

/**
 * Wire WatchLoop events to the useTreeState hook's mutation functions.
 * Returns a cleanup function that removes all listeners.
 */
function wireSubscriber(
  loop: WatchLoop,
  _state: ReturnType<typeof useTreeState>["state"],
  openPhaseFn: ReturnType<typeof useTreeState>["openPhase"],
  closePhaseFn: ReturnType<typeof useTreeState>["closePhase"],
  addEntryFn: ReturnType<typeof useTreeState>["addEntry"],
): () => void {
  const onStarted = ({ version, pid, intervalSeconds }: { version: string; pid: number; intervalSeconds: number }) => {
    addEntryFn("info", {}, `Started ${version} (PID ${pid}, poll every ${intervalSeconds}s)`);
  };

  const onStopped = () => {
    addEntryFn("info", {}, "Stopped.");
  };

  const onSessionStarted = ({ epicSlug, featureSlug, phase }: { epicSlug: string; featureSlug?: string; phase: string }) => {
    openPhaseFn(epicSlug, phase);
    if (featureSlug) {
      addEntryFn("info", { epic: epicSlug, phase, feature: featureSlug }, "dispatching");
    } else {
      addEntryFn("info", { epic: epicSlug, phase }, "dispatching");
    }
  };

  const onSessionCompleted = ({ epicSlug, featureSlug, phase, success, durationMs, costUsd }: {
    epicSlug: string; featureSlug?: string; phase: string; success: boolean; durationMs: number; costUsd?: number;
  }) => {
    const status = success ? "completed" : "failed";
    const dur = `${(durationMs / 1000).toFixed(0)}s`;
    const detail = costUsd != null ? `$${costUsd.toFixed(2)}, ${dur}` : dur;
    const level = success ? "info" as const : "error" as const;
    const context = featureSlug
      ? { epic: epicSlug, phase, feature: featureSlug }
      : { epic: epicSlug, phase };
    addEntryFn(level, context, `${status} (${detail})`);
    if (!success) {
      closePhaseFn(epicSlug, phase);
    }
  };

  const onError = ({ epicSlug, message }: { epicSlug?: string; message: string }) => {
    if (epicSlug) {
      addEntryFn("error", { epic: epicSlug }, message);
    } else {
      addEntryFn("error", {}, message);
    }
  };

  const onReleaseHeld = ({ waitingSlug, blockingSlug }: { waitingSlug: string; blockingSlug: string }) => {
    addEntryFn("info", { epic: waitingSlug }, `release held: blocked by ${blockingSlug}`);
  };

  loop.on("started", onStarted);
  loop.on("stopped", onStopped);
  loop.on("session-started", onSessionStarted);
  loop.on("session-completed", onSessionCompleted);
  loop.on("error", onError);
  loop.on("release:held", onReleaseHeld);

  return () => {
    loop.off("started", onStarted);
    loop.off("stopped", onStopped);
    loop.off("session-started", onSessionStarted);
    loop.off("session-completed", onSessionCompleted);
    loop.off("error", onError);
    loop.off("release:held", onReleaseHeld);
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd cli && bun test src/__tests__/watch-tree-app.test.ts --timeout 15000`
Expected: PASS — all 4 tests green

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/WatchTreeApp.tsx cli/src/__tests__/watch-tree-app.test.ts
git commit -m "feat(watch-integration): add WatchTreeApp Ink component"
```

---

### Task 3: Watch Command TTY Detection and --plain Flag

**Wave:** 3
**Depends on:** Task 2

Modify `watchCommand` to support `--plain` flag and TTY detection. When tree mode is active, render `WatchTreeApp` instead of using `attachLoggerSubscriber`.

**Files:**
- Modify: `cli/src/commands/watch.ts`
- Create: `cli/src/__tests__/watch-integration.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// cli/src/__tests__/watch-integration.test.ts
import { describe, test, expect } from "bun:test";
import { parseWatchArgs } from "../commands/watch.js";

describe("parseWatchArgs", () => {
  test("no args returns plain=false", () => {
    const result = parseWatchArgs([]);
    expect(result.plain).toBe(false);
  });

  test("--plain returns plain=true", () => {
    const result = parseWatchArgs(["--plain"]);
    expect(result.plain).toBe(true);
  });

  test("--plain mixed with other args", () => {
    const result = parseWatchArgs(["--verbose", "--plain"]);
    expect(result.plain).toBe(true);
  });

  test("args without --plain", () => {
    const result = parseWatchArgs(["--verbose"]);
    expect(result.plain).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun test src/__tests__/watch-integration.test.ts --timeout 15000`
Expected: FAIL — `parseWatchArgs` is not exported from `../commands/watch.js`

- [ ] **Step 3: Add parseWatchArgs and modify watchCommand**

Add `parseWatchArgs` export and modify `watchCommand` in `cli/src/commands/watch.ts`:

1. Add the arg parser function (before `watchCommand`):

```typescript
/** Parse watch-specific arguments. */
export function parseWatchArgs(args: string[]): { plain: boolean; remaining: string[] } {
  const plain = args.includes("--plain");
  const remaining = args.filter((a) => a !== "--plain");
  return { plain, remaining };
}
```

2. Modify `watchCommand` to accept `--plain` and use TTY detection:

Replace the function signature and body to:
- Parse `--plain` from args
- Determine tree mode: `!plain && process.stdout.isTTY`
- In tree mode: dynamic import React/Ink, render WatchTreeApp, disable signal handlers on WatchLoop (Ink handles them)
- In flat mode: use existing `attachLoggerSubscriber` path

The modified `watchCommand`:

```typescript
export async function watchCommand(args: string[], verbosity: number = 0): Promise<void> {
  const { plain } = parseWatchArgs(args);
  const useTree = !plain && !!process.stdout.isTTY;

  const projectRoot = findProjectRoot();
  const config = loadConfig(projectRoot);
  const logger = createLogger(verbosity, {});

  const selected = await selectStrategy(config.cli["dispatch-strategy"] ?? "sdk", undefined, logger);
  let innerFactory: SessionFactory;

  if (selected.strategy === "cmux") {
    innerFactory = new CmuxSessionFactory(new CmuxClient());
  } else if (selected.strategy === "iterm2") {
    innerFactory = new ITermSessionFactory(new It2Client());
  } else {
    innerFactory = new SdkSessionFactory(dispatchPhase);
  }

  const sessionFactory = new ReconcilingFactory(innerFactory, projectRoot, logger);

  if (config.github.enabled) {
    try {
      const resolved = await discoverGitHub(projectRoot, config.github["project-name"], logger);
      sessionFactory.resolved = resolved;
      if (resolved) {
        logger.log(`GitHub discovery: ${resolved.repo} (project #${resolved.projectNumber ?? "none"})`);
      }
    } catch (err) {
      logger.warn(`GitHub discovery failed (non-blocking): ${err}`);
    }
  }

  const deps: WatchDeps = {
    scanEpics: async (root: string) => listEnriched(root),
    sessionFactory,
    logger,
  };

  if (useTree) {
    // Tree mode: Ink handles signals, no alternate screen (full scrollback)
    const loop = new WatchLoop(
      {
        intervalSeconds: config.cli.interval ?? 60,
        projectRoot,
        installSignalHandlers: false,
      },
      deps,
    );

    const { render } = await import("ink");
    const React = await import("react");
    const { default: WatchTreeApp } = await import("./WatchTreeApp.js");

    const { waitUntilExit } = render(
      React.createElement(WatchTreeApp, { loop, verbosity }),
    );

    try {
      await loop.start();
    } catch (err) {
      logger.error(`${err}`);
    }

    try {
      await waitUntilExit();
    } finally {
      if (loop.isRunning()) {
        await loop.stop();
      }
    }
  } else {
    // Flat mode: existing behavior
    const loop = new WatchLoop(
      {
        intervalSeconds: config.cli.interval ?? 60,
        projectRoot,
      },
      deps,
    );

    attachLoggerSubscriber(loop, logger);
    await loop.start();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd cli && bun test src/__tests__/watch-integration.test.ts --timeout 15000`
Expected: PASS — all 4 tests green

- [ ] **Step 5: Run all related tests to verify no regressions**

Run: `cd cli && bun test src/__tests__/tree-adapter.test.ts src/__tests__/watch-tree-subscriber.test.ts src/__tests__/watch-tree-app.test.ts src/__tests__/watch-integration.test.ts src/__tests__/watch-events.test.ts src/__tests__/tree-view.test.ts src/__tests__/tree-logger.test.ts src/__tests__/tree-state.test.ts src/__tests__/tree-format.test.ts --timeout 15000`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add cli/src/commands/watch.ts cli/src/__tests__/watch-integration.test.ts
git commit -m "feat(watch-integration): add --plain flag and TTY-based tree/flat mode switching"
```
