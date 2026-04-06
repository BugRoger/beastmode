# Event Routing and Levels — Implementation Tasks

## Goal

Eliminate duplicate log entries (dual-write), reclassify event log levels, and include session ID in dispatch entries. After this feature, epic-scoped events appear only in the hierarchical tree, lifecycle heartbeats are debug-level, abnormal conditions are warn-level, and dispatch entries show the iTerm session ID.

## Architecture

- **LogEntry** (factory.ts) gets an optional `level` field
- **lifecycleToLogEntry** (lifecycle-entries.ts) sets the `level` field per the reclassification table and includes sessionId in session-started text
- **entryTypeToLevel** (use-dashboard-tree-state.ts) prefers explicit `level` over type-based mapping
- **App.tsx** event handlers stop calling `pushSystemEntry()` for epic-scoped events; remaining global entries get correct levels
- Test framework: vitest (matching all existing test files)
- Test runner: `bun --bun vitest run`

## Tech Stack

- TypeScript, Ink (React for CLI), vitest
- No external dependencies added

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/__tests__/event-routing-and-levels.integration.test.ts` | Create | Integration test: no duplicates, correct levels, session ID |
| `cli/src/dispatch/factory.ts` | Modify | Add optional `level` field to LogEntry |
| `cli/src/__tests__/event-log-fallback.test.ts` | Modify | Update existing tests, add level/sessionId tests |
| `cli/src/dashboard/lifecycle-entries.ts` | Modify | Set level field, include sessionId |
| `cli/src/dashboard/hooks/use-dashboard-tree-state.ts` | Modify | entryTypeToLevel prefers explicit level |
| `cli/src/__tests__/use-dashboard-tree-state.test.ts` | Modify | Add test for explicit level preference |
| `cli/src/dashboard/App.tsx` | Modify | Remove pushSystemEntry from epic-scoped handlers, set levels on remaining |

---

### Task 0: Integration Test (RED)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/event-routing-and-levels.integration.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
import { describe, test, expect } from "vitest";
import { buildTreeState } from "../dashboard/hooks/use-dashboard-tree-state.js";
import { FallbackEntryStore, lifecycleToLogEntry } from "../dashboard/lifecycle-entries.js";
import type { SystemEntry } from "../dashboard/tree-types.js";

describe("Event routing, deduplication, and level assignment", () => {
  // --- US 1: Deduplication / hierarchical routing ---

  test("each log entry appears exactly once under its epic", () => {
    const store = new FallbackEntryStore();
    const entry = lifecycleToLogEntry("session-started", {
      epicSlug: "auth-system",
      phase: "implement",
      sessionId: "w:12345",
    });
    store.push("auth-system", "implement", undefined, entry);

    const sessions = [{ epicSlug: "auth-system", phase: "implement" }];
    // No system entries — epic-scoped events should not appear at CLI root
    const systemEntries: SystemEntry[] = [];

    const state = buildTreeState(
      sessions,
      (s) => store.get(s.epicSlug, s.phase, s.featureSlug),
      store,
      systemEntries,
    );

    // Entry appears under the epic node
    const epic = state.epics.find((e) => e.slug === "auth-system");
    expect(epic).toBeDefined();
    expect(epic!.entries.length).toBeGreaterThan(0);

    // Entry does NOT appear under CLI root
    const cliMessages = state.cli.entries.map((e) => e.message);
    expect(cliMessages).not.toContain(expect.stringContaining("auth-system"));
  });

  test("entry routed to a feature does not also appear at epic level", () => {
    const store = new FallbackEntryStore();
    const entry = lifecycleToLogEntry("session-started", {
      epicSlug: "auth-system",
      featureSlug: "login",
      phase: "implement",
      sessionId: "w:111",
    });
    store.push("auth-system", "implement", "login", entry);

    const sessions = [{ epicSlug: "auth-system", phase: "implement", featureSlug: "login" }];
    const state = buildTreeState(
      sessions,
      (s) => store.get(s.epicSlug, s.phase, s.featureSlug),
      store,
    );

    const epic = state.epics.find((e) => e.slug === "auth-system")!;
    const feature = epic.features.find((f) => f.slug === "login");
    expect(feature).toBeDefined();
    expect(feature!.entries.length).toBeGreaterThan(0);

    // Not duplicated at epic level
    expect(epic.entries).toHaveLength(0);
  });

  // --- US 2: Debug-level lifecycle events ---

  test("scan-complete is classified as debug level", () => {
    const store = new FallbackEntryStore();
    const entry = lifecycleToLogEntry("session-started", {
      epicSlug: "e",
      phase: "plan",
      sessionId: "w:1",
    });
    expect(entry).toHaveProperty("level", "debug");
  });

  test("session-started is classified as debug level", () => {
    const entry = lifecycleToLogEntry("session-started", {
      epicSlug: "e",
      phase: "plan",
      sessionId: "w:1",
    });
    expect(entry).toHaveProperty("level", "debug");
  });

  test("session-completed success is classified as debug level", () => {
    const entry = lifecycleToLogEntry("session-completed", {
      epicSlug: "e",
      phase: "plan",
      success: true,
      durationMs: 5000,
    });
    expect(entry).toHaveProperty("level", "debug");
  });

  test("session-completed failure remains error level", () => {
    const entry = lifecycleToLogEntry("session-completed", {
      epicSlug: "e",
      phase: "plan",
      success: false,
      durationMs: 3000,
    });
    expect(entry).toHaveProperty("level", "error");
  });

  // --- US 3: Warn-level abnormal condition events ---

  test("session-dead is classified as warn level", () => {
    const entry = lifecycleToLogEntry("session-dead", {
      epicSlug: "e",
      phase: "implement",
      tty: "/dev/ttys001",
      sessionId: "s-1",
    });
    expect(entry).toHaveProperty("level", "warn");
  });

  test("epic-blocked is classified as warn level", () => {
    const entry = lifecycleToLogEntry("epic-blocked", {
      epicSlug: "e",
      gate: "validate",
      reason: "tests failing",
    });
    expect(entry).toHaveProperty("level", "warn");
  });

  test("release:held is classified as warn level", () => {
    const entry = lifecycleToLogEntry("release:held", {
      waitingSlug: "e1",
      blockingSlug: "e2",
    });
    expect(entry).toHaveProperty("level", "warn");
  });

  // --- US 4: iTerm session ID in dispatch entries ---

  test("dispatch log entry includes the iTerm session identifier", () => {
    const entry = lifecycleToLogEntry("session-started", {
      epicSlug: "e",
      phase: "implement",
      sessionId: "w:12345",
    });
    expect(entry.text).toContain("session: w:12345");
  });

  test("dispatch entry with various session ID formats", () => {
    for (const sessionId of ["w:12345", "w:67890", "w:1"]) {
      const entry = lifecycleToLogEntry("session-started", {
        epicSlug: "e",
        phase: "implement",
        sessionId,
      });
      expect(entry.text).toContain(`session: ${sessionId}`);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/event-routing-and-levels.integration.test.ts`
Expected: FAIL — `level` property doesn't exist on LogEntry, text is just "dispatching" without session ID

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/event-routing-and-levels.integration.test.ts
git commit -m "test(event-routing-and-levels): add integration test — RED"
```

---

### Task 1: Add `level` field to LogEntry

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dispatch/factory.ts:12-21`

- [ ] **Step 1: Write the failing test**

Add to `cli/src/__tests__/event-log-fallback.test.ts`:

```typescript
test("LogEntry level field is optional and accepted by FallbackEntryStore", () => {
  const store = new FallbackEntryStore();
  store.push("e", "plan", undefined, {
    type: "text",
    timestamp: 1000,
    text: "test",
    level: "debug",
  });
  const entries = store.get("e", "plan", undefined);
  expect(entries[0]).toHaveProperty("level", "debug");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/event-log-fallback.test.ts`
Expected: FAIL — `level` not in LogEntry type (TypeScript error or missing property)

- [ ] **Step 3: Add optional `level` field to LogEntry interface**

In `cli/src/dispatch/factory.ts`, add the `level` field to the `LogEntry` interface:

```typescript
/** Structured log entry for terminal rendering. */
export interface LogEntry {
  /** Monotonic sequence number within the session */
  seq: number;
  /** Timestamp when the entry was created */
  timestamp: number;
  /** Entry type for rendering dispatch */
  type: "text" | "tool-start" | "tool-result" | "heartbeat" | "result";
  /** Display text — ready to render */
  text: string;
  /** Optional explicit log level — overrides type-based inference when present */
  level?: "info" | "debug" | "warn" | "error";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/event-log-fallback.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/dispatch/factory.ts cli/src/__tests__/event-log-fallback.test.ts
git commit -m "feat(event-routing-and-levels): add optional level field to LogEntry"
```

---

### Task 2: Set level and sessionId in lifecycleToLogEntry

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/lifecycle-entries.ts:60-108`
- Modify: `cli/src/__tests__/event-log-fallback.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `cli/src/__tests__/event-log-fallback.test.ts`:

```typescript
test("session-started includes sessionId in text", () => {
  const entry = lifecycleToLogEntry("session-started", {
    epicSlug: "my-epic",
    featureSlug: undefined,
    phase: "plan",
    sessionId: "w:12345",
  });
  expect(entry.text).toBe("dispatching (session: w:12345)");
});

test("session-started has debug level", () => {
  const entry = lifecycleToLogEntry("session-started", {
    epicSlug: "my-epic",
    featureSlug: undefined,
    phase: "plan",
    sessionId: "s-1",
  });
  expect(entry.level).toBe("debug");
});

test("session-completed success has debug level", () => {
  const entry = lifecycleToLogEntry("session-completed", {
    epicSlug: "my-epic",
    featureSlug: undefined,
    phase: "plan",
    success: true,
    durationMs: 5000,
  });
  expect(entry.level).toBe("debug");
});

test("session-completed failure has error level", () => {
  const entry = lifecycleToLogEntry("session-completed", {
    epicSlug: "my-epic",
    featureSlug: undefined,
    phase: "plan",
    success: false,
    durationMs: 3000,
  });
  expect(entry.level).toBe("error");
});

test("session-dead has warn level", () => {
  const entry = lifecycleToLogEntry("session-dead", {
    epicSlug: "my-epic",
    phase: "implement",
    tty: "/dev/ttys001",
    sessionId: "s-1",
  });
  expect(entry.level).toBe("warn");
});

test("epic-blocked has warn level", () => {
  const entry = lifecycleToLogEntry("epic-blocked", {
    epicSlug: "my-epic",
    gate: "validate",
    reason: "tests failing",
  });
  expect(entry.level).toBe("warn");
});

test("release:held has warn level", () => {
  const entry = lifecycleToLogEntry("release:held", {
    waitingSlug: "e1",
    blockingSlug: "e2",
  });
  expect(entry.level).toBe("warn");
});

test("error has error level", () => {
  const entry = lifecycleToLogEntry("error", {
    epicSlug: "my-epic",
    message: "boom",
  });
  expect(entry.level).toBe("error");
});

test("epic-cancelled has info level", () => {
  const entry = lifecycleToLogEntry("epic-cancelled", {
    epicSlug: "my-epic",
  });
  expect(entry.level).toBe("info");
});
```

- [ ] **Step 2: Run test to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/event-log-fallback.test.ts`
Expected: FAIL — no `level` on returned entries, session-started text is just "dispatching"

- [ ] **Step 3: Update lifecycleToLogEntry implementation**

Replace the implementation function body in `cli/src/dashboard/lifecycle-entries.ts`:

```typescript
export function lifecycleToLogEntry(
  kind: string,
  payload: LifecyclePayload,
): Omit<LogEntry, "seq"> {
  const timestamp = Date.now();

  switch (kind) {
    case "session-started": {
      const p = payload as SessionStartedEvent;
      return {
        type: "text",
        timestamp,
        text: `dispatching (session: ${p.sessionId})`,
        level: "debug",
      };
    }

    case "session-completed": {
      const p = payload as SessionCompletedEvent;
      const status = p.success ? "completed" : "failed";
      const dur = `${(p.durationMs / 1000).toFixed(0)}s`;
      const detail = p.costUsd != null ? `$${p.costUsd.toFixed(2)}, ${dur}` : dur;
      return {
        type: p.success ? "text" : "result",
        timestamp,
        text: `${status} (${detail})`,
        level: p.success ? "debug" : "error",
      };
    }

    case "session-dead": {
      const p = payload as SessionDeadEvent;
      return { type: "result", timestamp, text: `session dead (tty: ${p.tty})`, level: "warn" };
    }

    case "error": {
      const p = payload as WatchErrorEvent;
      return { type: "result", timestamp, text: `error: ${p.message}`, level: "error" };
    }

    case "epic-blocked": {
      const p = payload as { epicSlug: string; gate: string; reason: string };
      return { type: "text", timestamp, text: `blocked at ${p.gate}: ${p.reason}`, level: "warn" };
    }

    case "release:held": {
      const p = payload as ReleaseHeldEvent;
      return { type: "text", timestamp, text: `release held: blocked by ${p.blockingSlug}`, level: "warn" };
    }

    case "epic-cancelled":
      return { type: "text", timestamp, text: "cancelled", level: "info" };

    default:
      return { type: "text", timestamp, text: `unknown event: ${kind}`, level: "info" };
  }
}
```

Also update the existing test assertion that checks `entry.text === "dispatching"`:

In the first test case `session-started produces 'dispatching' text entry`, update:
```typescript
expect(entry.text).toBe("dispatching (session: s-1)");
```

- [ ] **Step 4: Run test to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/event-log-fallback.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/dashboard/lifecycle-entries.ts cli/src/__tests__/event-log-fallback.test.ts
git commit -m "feat(event-routing-and-levels): set level and sessionId in lifecycleToLogEntry"
```

---

### Task 3: entryTypeToLevel prefers explicit level

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/dashboard/hooks/use-dashboard-tree-state.ts:28-43`
- Modify: `cli/src/__tests__/use-dashboard-tree-state.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `cli/src/__tests__/use-dashboard-tree-state.test.ts`:

```typescript
import { buildTreeState } from "../dashboard/hooks/use-dashboard-tree-state.js";

describe("entryTypeToLevel with explicit level field", () => {
  test("explicit level on LogEntry overrides type-based mapping in tree", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const getEntries = () => [
      { timestamp: 1000, type: "text" as const, text: "dispatching", seq: 0, level: "debug" as const },
    ];
    const state = buildTreeState(sessions, getEntries);
    expect(state.epics[0].entries[0].level).toBe("debug");
  });

  test("type text without explicit level remains info", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const getEntries = () => [
      { timestamp: 1000, type: "text" as const, text: "hello", seq: 0 },
    ];
    const state = buildTreeState(sessions, getEntries);
    expect(state.epics[0].entries[0].level).toBe("info");
  });

  test("explicit warn level on text entry is respected", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const getEntries = () => [
      { timestamp: 1000, type: "text" as const, text: "blocked", seq: 0, level: "warn" as const },
    ];
    const state = buildTreeState(sessions, getEntries);
    expect(state.epics[0].entries[0].level).toBe("warn");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/use-dashboard-tree-state.test.ts`
Expected: FAIL — explicit level ignored, text entries always mapped to "info"

- [ ] **Step 3: Update entryTypeToLevel to prefer explicit level**

In `cli/src/dashboard/hooks/use-dashboard-tree-state.ts`, modify `entryTypeToLevel`:

```typescript
/** Map a LogEntry.type to a LogLevel for the tree view. */
function entryTypeToLevel(entry: LogEntry): LogLevel {
  if (entry.level) return entry.level;
  switch (entry.type) {
    case "text":
      return "info";
    case "tool-start":
      return "debug";
    case "tool-result":
      return "debug";
    case "heartbeat":
      return "debug";
    case "result":
      return entry.text.toLowerCase().includes("error") ? "error" : "info";
    default:
      return "info";
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/use-dashboard-tree-state.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/dashboard/hooks/use-dashboard-tree-state.ts cli/src/__tests__/use-dashboard-tree-state.test.ts
git commit -m "feat(event-routing-and-levels): entryTypeToLevel prefers explicit level"
```

---

### Task 4: Remove pushSystemEntry from epic-scoped handlers and set correct levels

**Wave:** 3
**Depends on:** Task 2, Task 3

**Files:**
- Modify: `cli/src/dashboard/App.tsx:264-360`

- [ ] **Step 1: Update App.tsx event handlers**

Remove `pushSystemEntry()` calls from epic-scoped handlers and set correct levels on remaining global handlers.

In `cli/src/dashboard/App.tsx`, replace the event handlers section (inside the useEffect):

**onStarted** — keep `pushSystemEntry`, set debug level:
```typescript
const onStarted = () => {
  setWatchRunning(true);
  pushSystemEntry("watch loop started", "debug");
};
```

**onStopped** — keep `pushSystemEntry`, set debug level:
```typescript
const onStopped = () => {
  setWatchRunning(false);
  pushSystemEntry("watch loop stopped", "debug");
};
```

**onSessionStarted** — REMOVE `pushSystemEntry`, keep fallbackStore:
```typescript
const onSessionStarted = (ev: WatchLoopEventMap["session-started"][0]) => {
  setActiveSessions((prev) => new Set([...prev, ev.epicSlug]));
  refreshSessions();
  fallbackStoreRef.current.push(
    ev.epicSlug,
    ev.phase,
    ev.featureSlug,
    lifecycleToLogEntry("session-started", ev),
  );
};
```

**onSessionCompleted** — REMOVE `pushSystemEntry`, keep fallbackStore:
```typescript
const onSessionCompleted = (ev: WatchLoopEventMap["session-completed"][0]) => {
  setActiveSessions((prev) => {
    const next = new Set(prev);
    next.delete(ev.epicSlug);
    return next;
  });
  refreshSessions();
  fallbackStoreRef.current.push(
    ev.epicSlug,
    ev.phase,
    ev.featureSlug,
    lifecycleToLogEntry("session-completed", ev),
  );
};
```

**onScanComplete** — keep `pushSystemEntry`, set debug level:
```typescript
const onScanComplete = (_ev: WatchLoopEventMap["scan-complete"][0]) => {
  const activeEpicSlugs = new Set(loop.getTracker().getAll().map((s) => s.epicSlug));
  setActiveSessions(activeEpicSlugs);
  refreshSessions();
  pushSystemEntry(`scan complete — ${activeEpicSlugs.size} active session(s)`, "debug");
};
```

**onError** — keep `pushSystemEntry` for unscoped errors, REMOVE for scoped:
```typescript
const onError = (ev: WatchLoopEventMap["error"][0]) => {
  if (ev.epicSlug) {
    fallbackStoreRef.current.push(
      ev.epicSlug,
      "unknown",
      undefined,
      lifecycleToLogEntry("error", ev),
    );
  } else {
    pushSystemEntry(`error: ${ev.message}`, "error");
  }
};
```

**onEpicBlocked** — REMOVE `pushSystemEntry`, keep fallbackStore:
```typescript
const onEpicBlocked = (ev: WatchLoopEventMap["epic-blocked"][0]) => {
  fallbackStoreRef.current.push(
    ev.epicSlug,
    "unknown",
    undefined,
    lifecycleToLogEntry("epic-blocked", ev),
  );
};
```

**onReleaseHeld** — REMOVE `pushSystemEntry`, keep fallbackStore:
```typescript
const onReleaseHeld = (ev: WatchLoopEventMap["release:held"][0]) => {
  fallbackStoreRef.current.push(
    ev.waitingSlug,
    "release",
    undefined,
    lifecycleToLogEntry("release:held", ev),
  );
};
```

**onSessionDead** — REMOVE `pushSystemEntry`, keep fallbackStore:
```typescript
const onSessionDead = (ev: WatchLoopEventMap["session-dead"][0]) => {
  fallbackStoreRef.current.push(
    ev.epicSlug,
    ev.phase,
    ev.featureSlug,
    lifecycleToLogEntry("session-dead", ev),
  );
};
```

**onEpicCancelled** — REMOVE `pushSystemEntry`, keep fallbackStore:
```typescript
const onEpicCancelled = (ev: WatchLoopEventMap["epic-cancelled"][0]) => {
  fallbackStoreRef.current.push(
    ev.epicSlug,
    "unknown",
    undefined,
    lifecycleToLogEntry("epic-cancelled", ev),
  );
  refreshSessions();
};
```

- [ ] **Step 2: Run tests to verify nothing broke**

Run: `cd cli && bun --bun vitest run`
Expected: PASS (existing tests still pass; integration test from Task 0 should now pass)

- [ ] **Step 3: Commit**

```bash
git add cli/src/dashboard/App.tsx
git commit -m "feat(event-routing-and-levels): remove dual-write, set correct log levels"
```

---
