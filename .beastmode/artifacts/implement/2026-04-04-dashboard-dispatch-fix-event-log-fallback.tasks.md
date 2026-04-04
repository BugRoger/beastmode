# Event Log Fallback — Implementation Tasks

## Goal

When `SessionHandle.events` is undefined (non-SDK strategies like iTerm2/cmux), the dashboard log panel must fall back to rendering status entries from WatchLoop lifecycle events (`session-started`, `session-completed`, `error`). These entries appear in the same tree structure as SDK streaming entries.

## Architecture

- **`useDashboardTreeState` hook** currently only reads from `session.events?.getBuffer()` — returns empty array for non-SDK sessions
- **WatchLoop** already emits lifecycle events with epic/phase/feature context
- **Solution**: Create a `SessionEntryMap` that the hook reads from. For SDK sessions, populate from `session.events.getBuffer()`. For non-SDK sessions, populate from WatchLoop lifecycle events that the App subscribes to and injects as synthetic `LogEntry` objects.
- The App already subscribes to WatchLoop events — extend those handlers to create synthetic entries
- The hook's `getEntries` callback becomes the single source, reading from either SDK buffer or the synthetic entry map

## Tech Stack

- TypeScript, React (Ink), Bun test runner
- `SessionEmitter` / `LogEntry` from `cli/src/dispatch/factory.ts`
- `TreeState` / `TreeEntry` from `cli/src/dashboard/tree-types.ts`
- `WatchLoopEventMap` from `cli/src/dispatch/types.ts`

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/dashboard/hooks/use-dashboard-tree-state.ts` | Modify | Accept optional `fallbackEntries` map; use as entry source when `session.events` is undefined |
| `cli/src/dashboard/App.tsx` | Modify | Subscribe to WatchLoop lifecycle events, build fallback entry map, pass to hook |
| `cli/src/__tests__/use-dashboard-tree-state.test.ts` | Modify | Add tests for fallback entry rendering |
| `cli/src/__tests__/event-log-fallback.test.ts` | Create | Tests for `lifecycleToLogEntry` conversion and `buildFallbackEntries` logic |

---

### Task 0: Lifecycle-to-LogEntry converter and fallback entry builder

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/src/dashboard/lifecycle-entries.ts`
- Create: `cli/src/__tests__/event-log-fallback.test.ts`

- [x] **Step 1: Write the failing tests**

Create `cli/src/__tests__/event-log-fallback.test.ts`:

```typescript
import { describe, test, expect } from "bun:test";
import {
  lifecycleToLogEntry,
  FallbackEntryStore,
} from "../dashboard/lifecycle-entries.js";

describe("lifecycleToLogEntry", () => {
  test("session-started produces 'dispatching' text entry", () => {
    const entry = lifecycleToLogEntry("session-started", {
      epicSlug: "my-epic",
      featureSlug: undefined,
      phase: "plan",
      sessionId: "s-1",
    });

    expect(entry.type).toBe("text");
    expect(entry.text).toBe("dispatching");
    expect(entry.timestamp).toBeGreaterThan(0);
  });

  test("session-completed success produces 'completed' text entry", () => {
    const entry = lifecycleToLogEntry("session-completed", {
      epicSlug: "my-epic",
      featureSlug: undefined,
      phase: "plan",
      success: true,
      durationMs: 5000,
    });

    expect(entry.type).toBe("text");
    expect(entry.text).toBe("completed (5s)");
  });

  test("session-completed with cost includes cost in text", () => {
    const entry = lifecycleToLogEntry("session-completed", {
      epicSlug: "my-epic",
      featureSlug: undefined,
      phase: "plan",
      success: true,
      durationMs: 12000,
      costUsd: 1.23,
    });

    expect(entry.text).toBe("completed ($1.23, 12s)");
  });

  test("session-completed failure produces 'failed' text entry", () => {
    const entry = lifecycleToLogEntry("session-completed", {
      epicSlug: "my-epic",
      featureSlug: undefined,
      phase: "plan",
      success: false,
      durationMs: 3000,
    });

    expect(entry.type).toBe("result");
    expect(entry.text).toContain("failed");
  });

  test("error produces error text entry", () => {
    const entry = lifecycleToLogEntry("error", {
      epicSlug: "my-epic",
      message: "SDK import failed",
    });

    expect(entry.type).toBe("result");
    expect(entry.text).toBe("error: SDK import failed");
  });
});

describe("FallbackEntryStore", () => {
  test("stores entries keyed by session composite key", () => {
    const store = new FallbackEntryStore();

    store.push("my-epic", "plan", undefined, {
      type: "text",
      timestamp: 1000,
      text: "dispatching",
    });

    const entries = store.get("my-epic", "plan", undefined);
    expect(entries).toHaveLength(1);
    expect(entries[0].text).toBe("dispatching");
    expect(entries[0].seq).toBe(0);
  });

  test("assigns monotonic seq numbers per key", () => {
    const store = new FallbackEntryStore();
    const key = { epic: "e", phase: "p", feature: undefined };

    store.push(key.epic, key.phase, key.feature, {
      type: "text", timestamp: 1000, text: "first",
    });
    store.push(key.epic, key.phase, key.feature, {
      type: "text", timestamp: 2000, text: "second",
    });

    const entries = store.get(key.epic, key.phase, key.feature);
    expect(entries[0].seq).toBe(0);
    expect(entries[1].seq).toBe(1);
  });

  test("returns empty array for unknown key", () => {
    const store = new FallbackEntryStore();
    expect(store.get("nope", "plan", undefined)).toEqual([]);
  });

  test("separate keys for feature vs no-feature sessions", () => {
    const store = new FallbackEntryStore();

    store.push("e", "implement", "feat-a", {
      type: "text", timestamp: 1000, text: "a",
    });
    store.push("e", "implement", undefined, {
      type: "text", timestamp: 1000, text: "b",
    });

    expect(store.get("e", "implement", "feat-a")).toHaveLength(1);
    expect(store.get("e", "implement", undefined)).toHaveLength(1);
  });

  test("revision increments on each push", () => {
    const store = new FallbackEntryStore();
    const r0 = store.revision;

    store.push("e", "p", undefined, {
      type: "text", timestamp: 1000, text: "x",
    });

    expect(store.revision).toBe(r0 + 1);
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun test src/__tests__/event-log-fallback.test.ts`
Expected: FAIL — module `../dashboard/lifecycle-entries.js` not found

- [x] **Step 3: Write the implementation**

Create `cli/src/dashboard/lifecycle-entries.ts`:

```typescript
/**
 * Fallback log entries from WatchLoop lifecycle events.
 *
 * When the dispatch strategy is not SDK, SessionHandle.events is undefined.
 * This module converts WatchLoop lifecycle events into LogEntry objects
 * that the dashboard tree state hook can render in the same tree structure.
 */

import type { LogEntry } from "../dispatch/factory.js";
import type {
  SessionStartedEvent,
  SessionCompletedEvent,
  WatchErrorEvent,
} from "../dispatch/types.js";

type LifecycleEvent =
  | { kind: "session-started"; payload: SessionStartedEvent }
  | { kind: "session-completed"; payload: SessionCompletedEvent }
  | { kind: "error"; payload: WatchErrorEvent };

/**
 * Convert a WatchLoop lifecycle event into a LogEntry (without seq — caller assigns).
 */
export function lifecycleToLogEntry(
  kind: "session-started",
  payload: SessionStartedEvent,
): Omit<LogEntry, "seq">;
export function lifecycleToLogEntry(
  kind: "session-completed",
  payload: SessionCompletedEvent,
): Omit<LogEntry, "seq">;
export function lifecycleToLogEntry(
  kind: "error",
  payload: WatchErrorEvent,
): Omit<LogEntry, "seq">;
export function lifecycleToLogEntry(
  kind: string,
  payload: SessionStartedEvent | SessionCompletedEvent | WatchErrorEvent,
): Omit<LogEntry, "seq"> {
  const timestamp = Date.now();

  switch (kind) {
    case "session-started":
      return { type: "text", timestamp, text: "dispatching" };

    case "session-completed": {
      const p = payload as SessionCompletedEvent;
      const status = p.success ? "completed" : "failed";
      const dur = `${(p.durationMs / 1000).toFixed(0)}s`;
      const detail = p.costUsd != null ? `$${p.costUsd.toFixed(2)}, ${dur}` : dur;
      return {
        type: p.success ? "text" : "result",
        timestamp,
        text: `${status} (${detail})`,
      };
    }

    case "error": {
      const p = payload as WatchErrorEvent;
      return { type: "result", timestamp, text: `error: ${p.message}` };
    }

    default:
      return { type: "text", timestamp, text: `unknown event: ${kind}` };
  }
}

/**
 * In-memory store for fallback log entries, keyed by epic+phase+feature.
 * Assigns monotonic seq numbers per key. Exposes a revision counter
 * for React change detection.
 */
export class FallbackEntryStore {
  private entries = new Map<string, LogEntry[]>();
  private seqCounters = new Map<string, number>();
  private _revision = 0;

  private makeKey(epic: string, phase: string, feature: string | undefined): string {
    return `${epic}:${phase}:${feature ?? ""}`;
  }

  get revision(): number {
    return this._revision;
  }

  push(
    epic: string,
    phase: string,
    feature: string | undefined,
    entry: Omit<LogEntry, "seq">,
  ): void {
    const key = this.makeKey(epic, phase, feature);
    const seq = this.seqCounters.get(key) ?? 0;
    this.seqCounters.set(key, seq + 1);

    const full: LogEntry = { ...entry, seq };
    const list = this.entries.get(key);
    if (list) {
      list.push(full);
    } else {
      this.entries.set(key, [full]);
    }
    this._revision++;
  }

  get(epic: string, phase: string, feature: string | undefined): LogEntry[] {
    const key = this.makeKey(epic, phase, feature);
    return this.entries.get(key) ?? [];
  }
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun test src/__tests__/event-log-fallback.test.ts`
Expected: PASS — all tests green

- [x] **Step 5: Commit**

```bash
git add cli/src/dashboard/lifecycle-entries.ts cli/src/__tests__/event-log-fallback.test.ts
git commit -m "feat(event-log-fallback): add lifecycle-to-LogEntry converter and FallbackEntryStore"
```

---

### Task 1: Wire fallback entries into useDashboardTreeState hook

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `cli/src/dashboard/hooks/use-dashboard-tree-state.ts`
- Modify: `cli/src/__tests__/use-dashboard-tree-state.test.ts`

- [x] **Step 1: Write the failing tests**

Add to `cli/src/__tests__/use-dashboard-tree-state.test.ts`:

```typescript
import { FallbackEntryStore } from "../dashboard/lifecycle-entries.js";

// ... existing tests ...

describe("buildTreeState with fallback entries", () => {
  function makeEntry(seq: number, timestamp: number, text: string, type: LogEntry["type"] = "text"): LogEntry {
    return { seq, timestamp, type, text };
  }

  test("session without events uses fallbackEntries when provided", () => {
    const store = new FallbackEntryStore();
    store.push("my-epic", "plan", undefined, {
      type: "text", timestamp: 1000, text: "dispatching",
    });

    const sessions = [{ epicSlug: "my-epic", phase: "plan" }];
    const state = buildTreeState(
      sessions,
      () => [], // no SDK entries
      store,
    );

    expect(state.epics[0].phases[0].entries).toHaveLength(1);
    expect(state.epics[0].phases[0].entries[0].message).toBe("dispatching");
  });

  test("session with SDK entries ignores fallbackEntries", () => {
    const store = new FallbackEntryStore();
    store.push("my-epic", "plan", undefined, {
      type: "text", timestamp: 1000, text: "dispatching",
    });

    const sdkEntries = [makeEntry(0, 2000, "streaming message")];
    const sessions = [{ epicSlug: "my-epic", phase: "plan" }];
    const state = buildTreeState(
      sessions,
      () => sdkEntries,
      store,
    );

    // SDK entries win — no fallback mixing
    expect(state.epics[0].phases[0].entries).toHaveLength(1);
    expect(state.epics[0].phases[0].entries[0].message).toBe("streaming message");
  });

  test("fallback entries for feature session appear under feature node", () => {
    const store = new FallbackEntryStore();
    store.push("my-epic", "implement", "auth-flow", {
      type: "text", timestamp: 1000, text: "dispatching",
    });

    const sessions = [{ epicSlug: "my-epic", phase: "implement", featureSlug: "auth-flow" }];
    const state = buildTreeState(
      sessions,
      () => [],
      store,
    );

    expect(state.epics[0].phases[0].features[0].entries).toHaveLength(1);
    expect(state.epics[0].phases[0].features[0].entries[0].message).toBe("dispatching");
  });

  test("no fallbackEntries param behaves same as before (backward compat)", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const state = buildTreeState(sessions, () => []);
    expect(state.epics[0].phases[0].entries).toHaveLength(0);
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun test src/__tests__/use-dashboard-tree-state.test.ts`
Expected: FAIL — `buildTreeState` doesn't accept third argument; tests with `store` param fail

- [x] **Step 3: Modify the hook to accept fallback entries**

Modify `cli/src/dashboard/hooks/use-dashboard-tree-state.ts`:

Add import:
```typescript
import type { FallbackEntryStore } from "../lifecycle-entries.js";
```

Change `buildTreeState` signature to accept optional fallback store:
```typescript
export function buildTreeState(
  sessions: Array<{ epicSlug: string; phase: string; featureSlug?: string }>,
  getEntries: (session: { epicSlug: string; phase: string; featureSlug?: string }) => LogEntry[],
  fallbackEntries?: FallbackEntryStore,
): TreeState {
```

In the loop body, after `const rawEntries = getEntries(session);`, add fallback logic:
```typescript
    // Get entries for this session — SDK entries if available, fallback if not
    let rawEntries = getEntries(session);
    if (rawEntries.length === 0 && fallbackEntries) {
      rawEntries = fallbackEntries.get(session.epicSlug, session.phase, session.featureSlug);
    }
```

Update `UseDashboardTreeStateOptions` interface:
```typescript
export interface UseDashboardTreeStateOptions {
  sessions: DispatchedSession[];
  selectedEpicSlug?: string;
  fallbackEntries?: FallbackEntryStore;
}
```

Update the hook to pass fallback through:
```typescript
export function useDashboardTreeState({
  sessions,
  selectedEpicSlug,
  fallbackEntries,
}: UseDashboardTreeStateOptions): UseDashboardTreeStateResult {
```

In the hook, subscribe to fallback revision for re-renders. Add after the existing useEffect:
```typescript
  // Subscribe to fallback entry changes for non-SDK sessions
  const [, setFallbackRevision] = useState(0);
  useEffect(() => {
    if (!fallbackEntries) return;
    const interval = setInterval(() => {
      setFallbackRevision(fallbackEntries.revision);
    }, 200);
    return () => clearInterval(interval);
  }, [fallbackEntries]);
```

Update the `buildTreeState` call:
```typescript
  const state = buildTreeState(
    filteredSessions,
    (session) => {
      const ds = filteredSessions.find(
        (s) =>
          s.epicSlug === session.epicSlug &&
          s.phase === session.phase &&
          s.featureSlug === session.featureSlug,
      );
      return ds?.events?.getBuffer() ?? [];
    },
    fallbackEntries,
  );
```

- [x] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun test src/__tests__/use-dashboard-tree-state.test.ts`
Expected: PASS — all tests green

- [x] **Step 5: Commit**

```bash
git add cli/src/dashboard/hooks/use-dashboard-tree-state.ts cli/src/__tests__/use-dashboard-tree-state.test.ts
git commit -m "feat(event-log-fallback): wire FallbackEntryStore into buildTreeState and hook"
```

---

### Task 2: Wire App.tsx to produce fallback entries from WatchLoop events

**Wave:** 3
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/dashboard/App.tsx`

- [x] **Step 1: Add fallback entry wiring to App.tsx**

Add imports:
```typescript
import { FallbackEntryStore, lifecycleToLogEntry } from "./lifecycle-entries.js";
```

Add a `useRef` for the store (stable across renders):
```typescript
  const fallbackStoreRef = useRef(new FallbackEntryStore());
```

In the existing WatchLoop event subscriptions `useEffect` block, extend the `onSessionStarted` and `onSessionCompleted` handlers to push fallback entries. Also add an error handler:

```typescript
    const onSessionStarted = (ev: WatchLoopEventMap["session-started"][0]) => {
      setActiveSessions((prev) => new Set([...prev, ev.epicSlug]));
      refreshSessions();
      // Push fallback entry for non-SDK sessions
      fallbackStoreRef.current.push(
        ev.epicSlug,
        ev.phase,
        ev.featureSlug,
        lifecycleToLogEntry("session-started", ev),
      );
    };

    const onSessionCompleted = (ev: WatchLoopEventMap["session-completed"][0]) => {
      setActiveSessions((prev) => {
        const next = new Set(prev);
        next.delete(ev.epicSlug);
        return next;
      });
      refreshSessions();
      // Push fallback entry for non-SDK sessions
      fallbackStoreRef.current.push(
        ev.epicSlug,
        ev.phase,
        ev.featureSlug,
        lifecycleToLogEntry("session-completed", ev),
      );
    };

    const onError = (ev: WatchLoopEventMap["error"][0]) => {
      if (ev.epicSlug) {
        fallbackStoreRef.current.push(
          ev.epicSlug,
          "unknown",
          undefined,
          lifecycleToLogEntry("error", ev),
        );
      }
    };
```

Add `onError` subscription:
```typescript
    loop.on("error", onError);
```

And in cleanup:
```typescript
    loop.off("error", onError);
```

Pass `fallbackEntries` to the hook:
```typescript
  const { state: treeState } = useDashboardTreeState({
    sessions: trackerSessions,
    selectedEpicSlug,
    fallbackEntries: fallbackStoreRef.current,
  });
```

- [x] **Step 2: Run the full test suite**

Run: `cd cli && bun test`
Expected: PASS — all existing and new tests green

- [x] **Step 3: Commit**

```bash
git add cli/src/dashboard/App.tsx
git commit -m "feat(event-log-fallback): wire WatchLoop lifecycle events into dashboard fallback entries"
```
