# Event Routing and Levels — Implementation Tasks

## Goal

Fix log level propagation so the dashboard tree respects explicit `level` fields on LogEntry objects, and ensure all lifecycle events have correct levels for verbosity filtering.

## Architecture

- **LogEntry** (`cli/src/dispatch/factory.ts`) — already has optional `level` field
- **lifecycleToLogEntry** (`cli/src/dashboard/lifecycle-entries.ts`) — already returns correct levels for all event kinds
- **entryTypeToLevel** (`cli/src/dashboard/hooks/use-dashboard-tree-state.ts`) — BUG: ignores `entry.level`, always infers from `entry.type`
- **toTreeEntry** calls `entryTypeToLevel` to convert LogEntry → TreeEntry level
- **App.tsx** — `onStarted` handler passes no level to `pushSystemEntry()` (defaults to "info", should be "debug")

## Tech Stack

- TypeScript, Vitest, Bun runtime

## File Structure

| File | Role |
|------|------|
| `cli/src/dashboard/hooks/use-dashboard-tree-state.ts` | Fix `entryTypeToLevel` to prefer explicit `level` |
| `cli/src/dashboard/App.tsx` | Fix `onStarted` to pass `"debug"` level |
| `cli/src/__tests__/event-routing-and-levels.integration.test.ts` | Add level-propagation-through-tree tests |
| `cli/src/__tests__/use-dashboard-tree-state.test.ts` | Add unit test for entryTypeToLevel with explicit level |

---

### Task 0: Add failing integration tests for level propagation through tree

**Wave:** 0
**Depends on:** -

**Files:**
- Modify: `cli/src/__tests__/event-routing-and-levels.integration.test.ts`
- Modify: `cli/src/__tests__/use-dashboard-tree-state.test.ts`

- [ ] **Step 1: Add tree-level propagation tests to integration test**

Add the following tests to `cli/src/__tests__/event-routing-and-levels.integration.test.ts` after the existing tests (before the closing `});`):

```typescript
  // --- Level propagation through tree ---

  test("debug-level lifecycle entry propagates debug to tree entry", () => {
    const store = new FallbackEntryStore();
    const entry = lifecycleToLogEntry("session-started", {
      epicSlug: "auth-system",
      phase: "implement",
      sessionId: "w:1",
    });
    store.push("auth-system", "implement", undefined, entry);

    const sessions = [{ epicSlug: "auth-system", phase: "implement" }];
    const state = buildTreeState(
      sessions,
      (s) => store.get(s.epicSlug, s.phase, s.featureSlug),
      store,
    );

    const epic = state.epics.find((e) => e.slug === "auth-system")!;
    expect(epic.entries[0].level).toBe("debug");
  });

  test("warn-level lifecycle entry propagates warn to tree entry", () => {
    const store = new FallbackEntryStore();
    const entry = lifecycleToLogEntry("epic-blocked", {
      epicSlug: "auth-system",
      gate: "validate",
      reason: "tests failing",
    });
    store.push("auth-system", "unknown", undefined, entry);

    const sessions = [{ epicSlug: "auth-system", phase: "unknown" }];
    const state = buildTreeState(
      sessions,
      (s) => store.get(s.epicSlug, s.phase, s.featureSlug),
      store,
    );

    const epic = state.epics.find((e) => e.slug === "auth-system")!;
    expect(epic.entries[0].level).toBe("warn");
  });

  test("error-level lifecycle entry propagates error to tree entry", () => {
    const store = new FallbackEntryStore();
    const entry = lifecycleToLogEntry("session-completed", {
      epicSlug: "auth-system",
      phase: "implement",
      success: false,
      durationMs: 3000,
    });
    store.push("auth-system", "implement", undefined, entry);

    const sessions = [{ epicSlug: "auth-system", phase: "implement" }];
    const state = buildTreeState(
      sessions,
      (s) => store.get(s.epicSlug, s.phase, s.featureSlug),
      store,
    );

    const epic = state.epics.find((e) => e.slug === "auth-system")!;
    expect(epic.entries[0].level).toBe("error");
  });
```

- [ ] **Step 2: Add unit test for entryTypeToLevel with explicit level**

Add the following test to `cli/src/__tests__/use-dashboard-tree-state.test.ts` at the end, after the existing describe blocks:

```typescript
describe("entryTypeToLevel respects explicit level", () => {
  function makeEntryWithLevel(
    type: "text" | "tool-start" | "tool-result" | "heartbeat" | "result",
    level: "info" | "debug" | "warn" | "error",
  ) {
    return { seq: 0, timestamp: 1000, type, text: "test", level };
  }

  test("text entry with explicit debug level produces debug tree entry", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const entries = [makeEntryWithLevel("text", "debug")];
    const state = buildTreeState(sessions, () => entries);
    expect(state.epics[0].entries[0].level).toBe("debug");
  });

  test("text entry with explicit warn level produces warn tree entry", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const entries = [makeEntryWithLevel("text", "warn")];
    const state = buildTreeState(sessions, () => entries);
    expect(state.epics[0].entries[0].level).toBe("warn");
  });

  test("result entry with explicit warn level uses explicit level not type inference", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const entries = [makeEntryWithLevel("result", "warn")];
    const state = buildTreeState(sessions, () => entries);
    expect(state.epics[0].entries[0].level).toBe("warn");
  });

  test("entry without explicit level falls back to type-based inference", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const entries = [{ seq: 0, timestamp: 1000, type: "text" as const, text: "test" }];
    const state = buildTreeState(sessions, () => entries);
    expect(state.epics[0].entries[0].level).toBe("info");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/event-routing-and-levels.integration.test.ts src/__tests__/use-dashboard-tree-state.test.ts`
Expected: FAIL — the new level propagation tests fail because `entryTypeToLevel` ignores `entry.level`

- [ ] **Step 4: Commit**

```bash
git add cli/src/__tests__/event-routing-and-levels.integration.test.ts cli/src/__tests__/use-dashboard-tree-state.test.ts
git commit -m "test(event-routing-and-levels): add failing tests for level propagation through tree"
```

---

### Task 1: Fix entryTypeToLevel to prefer explicit level field

**Wave:** 1
**Depends on:** Task 0

**Files:**
- Modify: `cli/src/dashboard/hooks/use-dashboard-tree-state.ts:28-43`

- [ ] **Step 1: Fix entryTypeToLevel**

Replace the `entryTypeToLevel` function in `cli/src/dashboard/hooks/use-dashboard-tree-state.ts` (lines 28-43):

```typescript
/** Map a LogEntry to a LogLevel for the tree view. Prefers explicit level when present. */
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

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/event-routing-and-levels.integration.test.ts src/__tests__/use-dashboard-tree-state.test.ts`
Expected: PASS — all tests pass now

- [ ] **Step 3: Commit**

```bash
git add cli/src/dashboard/hooks/use-dashboard-tree-state.ts
git commit -m "fix(event-routing-and-levels): prefer explicit level in entryTypeToLevel"
```

---

### Task 2: Fix watch-loop started level to debug

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/App.tsx:268`

- [ ] **Step 1: Fix onStarted level**

In `cli/src/dashboard/App.tsx`, change line 268 from:

```typescript
      pushSystemEntry("watch loop started");
```

to:

```typescript
      pushSystemEntry("watch loop started", "debug");
```

- [ ] **Step 2: Run full test suite to verify no regressions**

Run: `cd cli && bun --bun vitest run`
Expected: PASS — all tests pass

- [ ] **Step 3: Commit**

```bash
git add cli/src/dashboard/App.tsx
git commit -m "fix(event-routing-and-levels): classify watch-loop started as debug level"
```
