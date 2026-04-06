# Wiring Fixes — Implementation Tasks

## Goal

Fix three dashboard wiring bugs: (1) seed tree skeleton with enriched epics, (2) compute maxVisibleLines dynamically from terminal rows, (3) split session-started lifecycle entry into info + debug pair. Plus one prerequisite: make `toTreeEntry` respect the explicit `level` field on `LogEntry`, without which the session-started split is invisible to verbosity filtering.

## Architecture

- **Dashboard stack:** React (Ink) → App.tsx → hooks → lifecycle-entries → LogPanel → TreeView
- **Data flow:** WatchLoop events → `lifecycleToLogEntry()` → `FallbackEntryStore` → `buildTreeState()` → filter pipeline → `LogPanel` → `TreeView`
- **Key types:** `LogEntry` (dispatch/factory.ts), `TreeEntry` (tree-types.ts), `SystemEntry` (tree-types.ts)
- **Test runner:** `cd cli && bun --bun vitest run`

## Tech Stack

- TypeScript, React (Ink), Vitest, Bun

## File Structure

| File | Responsibility |
|------|---------------|
| `cli/src/dashboard/hooks/use-dashboard-tree-state.ts` | `toTreeEntry` — respect explicit `entry.level` (Task 1); `buildTreeState` already accepts `enrichedEpics` param |
| `cli/src/dashboard/App.tsx` | Pass `enrichedEpics` to hook (Task 2); compute `maxVisibleLines` (Task 3); push array from session-started (Task 4) |
| `cli/src/dashboard/lifecycle-entries.ts` | Split session-started return type to array (Task 4) |
| `cli/src/__tests__/use-dashboard-tree-state.test.ts` | Test for `toTreeEntry` level override (Task 1) |
| `cli/src/__tests__/event-routing-and-levels.integration.test.ts` | Tests for session-started split (Task 4) |
| `cli/src/__tests__/wiring-fixes.integration.test.ts` | Integration test — Task 0 |

---

### Task 0: Integration Test (BDD RED)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/wiring-fixes.integration.test.ts`

- [x] **Step 1: Write the integration test**

```typescript
import { describe, test, expect } from "vitest";
import { buildTreeState } from "../dashboard/hooks/use-dashboard-tree-state.js";
import { FallbackEntryStore, lifecycleToLogEntry } from "../dashboard/lifecycle-entries.js";
import { filterTreeByVerbosity } from "../dashboard/LogPanel.js";
import type { EnrichedEpic, Feature } from "../store/types.js";
import type { SystemEntry } from "../dashboard/tree-types.js";

function mockFeature(slug: string, status: Feature["status"], parent: string): Feature {
  return {
    id: slug, type: "feature", parent, name: slug, slug, status,
    depends_on: [], created_at: "2026-01-01", updated_at: "2026-01-01",
  };
}

function mockEpic(slug: string, status: string, features: Feature[] = []): EnrichedEpic {
  return {
    id: slug, type: "epic" as const, name: slug, slug,
    status: status as EnrichedEpic["status"],
    depends_on: [], created_at: "2026-01-01", updated_at: "2026-01-01",
    nextAction: null, features,
  };
}

describe("Wiring Fixes Integration", () => {
  // US1: Log entries appear in tree panel (enrichedEpics seeding)
  test("log entries render under epic nodes when enrichedEpics seeds the skeleton", () => {
    const epics = [
      mockEpic("auth", "implement", [mockFeature("login", "in-progress", "auth")]),
    ];
    const store = new FallbackEntryStore();
    store.push("auth", "implement", undefined, {
      type: "text", timestamp: 1000, text: "working", level: "info",
    });

    const sessions = [{ epicSlug: "auth", phase: "implement" }];
    const state = buildTreeState(
      sessions,
      (s) => store.get(s.epicSlug, s.phase, s.featureSlug),
      store,
      [],
      epics,
    );

    const epic = state.epics.find((e) => e.slug === "auth");
    expect(epic).toBeDefined();
    expect(epic!.entries.length).toBeGreaterThan(0);
    expect(epic!.features).toHaveLength(1);
    expect(epic!.features[0].slug).toBe("login");
  });

  // US2: Auto-follow — tree has entries, so trimTreeToTail can work
  test("tree skeleton enables auto-follow by providing nodes for entries", () => {
    const epics = [mockEpic("auth", "implement")];
    const store = new FallbackEntryStore();
    for (let i = 0; i < 10; i++) {
      store.push("auth", "implement", undefined, {
        type: "text", timestamp: 1000 + i, text: `msg-${i}`, level: "info",
      });
    }

    const sessions = [{ epicSlug: "auth", phase: "implement" }];
    const state = buildTreeState(
      sessions,
      (s) => store.get(s.epicSlug, s.phase, s.featureSlug),
      store,
      [],
      epics,
    );

    expect(state.epics[0].entries.length).toBe(10);
  });

  // US3: Verbosity filtering — debug entries hidden at default verbosity
  test("debug entries are hidden at default verbosity (0), visible at verbosity 1", () => {
    const epics = [mockEpic("auth", "implement")];
    const store = new FallbackEntryStore();
    store.push("auth", "implement", undefined, {
      type: "text", timestamp: 1000, text: "info msg", level: "info",
    });
    store.push("auth", "implement", undefined, {
      type: "text", timestamp: 2000, text: "debug msg", level: "debug",
    });

    const sessions = [{ epicSlug: "auth", phase: "implement" }];
    const state = buildTreeState(
      sessions,
      (s) => store.get(s.epicSlug, s.phase, s.featureSlug),
      store,
      [],
      epics,
    );

    // At verbosity 0 (info) — debug entry should be hidden
    const filtered0 = filterTreeByVerbosity(state, 0);
    const entries0 = filtered0.epics[0].entries;
    expect(entries0).toHaveLength(1);
    expect(entries0[0].message).toBe("info msg");

    // At verbosity 1 (debug) — all entries visible
    const filtered1 = filterTreeByVerbosity(state, 1);
    const entries1 = filtered1.epics[0].entries;
    expect(entries1).toHaveLength(2);
  });

  // US5+6: Session-started produces info + debug entries
  test("session-started returns array with info dispatching + debug session ID", () => {
    const entries = lifecycleToLogEntry("session-started", {
      epicSlug: "auth",
      phase: "implement",
      sessionId: "w:12345",
    });

    expect(Array.isArray(entries)).toBe(true);
    const arr = entries as Array<{ level: string; text: string }>;
    expect(arr).toHaveLength(2);

    // First: info-level dispatch message
    expect(arr[0].level).toBe("info");
    expect(arr[0].text).toContain("dispatching");
    expect(arr[0].text).not.toContain("session:");

    // Second: debug-level session ID
    expect(arr[1].level).toBe("debug");
    expect(arr[1].text).toContain("session:");
    expect(arr[1].text).toContain("w:12345");
  });

  // Verbosity filtering respects explicit level field on entries
  test("toTreeEntry preserves explicit level from LogEntry", () => {
    const epics = [mockEpic("auth", "implement")];
    const store = new FallbackEntryStore();
    // Push entry with type "text" but explicit level "debug"
    store.push("auth", "implement", undefined, {
      type: "text", timestamp: 1000, text: "debug detail", level: "debug",
    });

    const sessions = [{ epicSlug: "auth", phase: "implement" }];
    const state = buildTreeState(
      sessions,
      (s) => store.get(s.epicSlug, s.phase, s.featureSlug),
      store,
      [],
      epics,
    );

    // The tree entry should have level "debug", not "info"
    expect(state.epics[0].entries[0].level).toBe("debug");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/wiring-fixes.integration.test.ts`
Expected: FAIL — `lifecycleToLogEntry("session-started", ...)` returns a single object not an array, and `toTreeEntry` ignores explicit level field.

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/wiring-fixes.integration.test.ts
git commit -m "test(wiring-fixes): add integration test — RED"
```

---

### Task 1: Fix toTreeEntry to respect explicit level field

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/hooks/use-dashboard-tree-state.ts:28-54`
- Modify: `cli/src/__tests__/use-dashboard-tree-state.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `cli/src/__tests__/use-dashboard-tree-state.test.ts`:

```typescript
test("entries with explicit level override type-based inference", () => {
  const sessions = [{ epicSlug: "e", phase: "plan" }];
  const entries = [
    { seq: 0, timestamp: 1000, type: "text" as const, text: "debug detail", level: "debug" as const },
  ];

  const state = buildTreeState(sessions, () => entries);

  // "text" type would normally map to "info", but explicit level "debug" should win
  expect(state.epics[0].entries[0].level).toBe("debug");
});

test("entries with explicit warn level override type-based inference", () => {
  const sessions = [{ epicSlug: "e", phase: "plan" }];
  const entries = [
    { seq: 0, timestamp: 1000, type: "text" as const, text: "blocked", level: "warn" as const },
  ];

  const state = buildTreeState(sessions, () => entries);

  expect(state.epics[0].entries[0].level).toBe("warn");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/use-dashboard-tree-state.test.ts`
Expected: FAIL — entries with explicit `level: "debug"` get mapped to `"info"` because `entryTypeToLevel` ignores the field.

- [ ] **Step 3: Fix toTreeEntry to check entry.level first**

In `cli/src/dashboard/hooks/use-dashboard-tree-state.ts`, modify `toTreeEntry` (lines 46-54):

```typescript
/** Map a LogEntry to a TreeEntry with phase. */
function toTreeEntry(entry: LogEntry, phase: string): TreeEntry {
  return {
    timestamp: entry.timestamp,
    level: entry.level ?? entryTypeToLevel(entry),
    message: entry.text,
    seq: entry.seq,
    phase,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/use-dashboard-tree-state.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/dashboard/hooks/use-dashboard-tree-state.ts cli/src/__tests__/use-dashboard-tree-state.test.ts
git commit -m "fix(wiring-fixes): toTreeEntry respects explicit level field"
```

---

### Task 2: Pass enrichedEpics to useDashboardTreeState

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/App.tsx:190-195`

- [ ] **Step 1: Add enrichedEpics to hook call**

In `cli/src/dashboard/App.tsx`, modify the `useDashboardTreeState` call at lines 190-195:

```typescript
  const { state: treeState } = useDashboardTreeState({
    sessions: trackerSessions,
    selectedEpicSlug,
    fallbackEntries: fallbackStoreRef.current,
    systemEntries: systemEntriesRef.current,
    enrichedEpics: epics,
  });
```

The only change is adding `enrichedEpics: epics` — the `epics` state variable is already populated by `refreshEpics` on scan-complete events.

- [ ] **Step 2: Run tests to verify no regressions**

Run: `cd cli && bun --bun vitest run`
Expected: PASS (all existing tests still pass)

- [ ] **Step 3: Commit**

```bash
git add cli/src/dashboard/App.tsx
git commit -m "fix(wiring-fixes): pass enrichedEpics to useDashboardTreeState"
```

---

### Task 3: Compute maxVisibleLines from terminal rows

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/App.tsx:462-468`

- [ ] **Step 1: Compute maxVisibleLines and pass to LogPanel**

In `cli/src/dashboard/App.tsx`, the layout structure from `ThreePanelLayout.tsx` is:
- Header bar: banner + status — uses `paddingY={1}` which means 1 line top padding + content + 1 line bottom padding. The NyanBanner is 1 line. Status is 1-2 lines. With paddingY={1} the header takes roughly 4-5 rows.
- Main content: flexGrow={1} — takes remaining space
- Bottom bar: key hints — 1 row + paddingX

The log panel is inside a PanelBox with border (2 rows for top/bottom border). The right column is 65% width at full height of main content.

Compute the value before the JSX return. Add this computation after line 201 (after `logTotalLinesRef.current = logTotalLines;`):

```typescript
  // Compute maxVisibleLines for log panel from terminal dimensions
  // Layout: header (5 rows: padY top + banner + status×2 + padY bottom) + bottom bar (1) + panel border (2)
  const headerHeight = 5;
  const footerHeight = 1;
  const panelBorderHeight = 2;
  const maxVisibleLines = Math.max(5, (rows ?? 24) - headerHeight - footerHeight - panelBorderHeight);
```

Then pass it to LogPanel in the JSX (around line 462-468):

```typescript
      logSlot={
        <LogPanel
          state={filteredTreeState}
          verbosity={keyboard.verbosity}
          scrollOffset={keyboard.logScrollOffset}
          autoFollow={keyboard.logAutoFollow}
          maxVisibleLines={maxVisibleLines}
        />
      }
```

- [ ] **Step 2: Run tests to verify no regressions**

Run: `cd cli && bun --bun vitest run`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add cli/src/dashboard/App.tsx
git commit -m "fix(wiring-fixes): compute maxVisibleLines from terminal rows"
```

---

### Task 4: Split session-started into info + debug entries

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/dashboard/lifecycle-entries.ts:32-70`
- Modify: `cli/src/dashboard/App.tsx:275-284`
- Modify: `cli/src/__tests__/event-routing-and-levels.integration.test.ts`

- [ ] **Step 1: Write the failing test**

Update existing tests in `cli/src/__tests__/event-routing-and-levels.integration.test.ts` and add new tests for the array return:

```typescript
  // Replace the existing "session-started is classified as debug level" test:
  test("session-started returns array of two entries", () => {
    const entries = lifecycleToLogEntry("session-started", {
      epicSlug: "e",
      phase: "plan",
      sessionId: "w:1",
    });
    expect(Array.isArray(entries)).toBe(true);
    const arr = entries as Array<{ level: string; text: string }>;
    expect(arr).toHaveLength(2);
  });

  test("session-started first entry is info with dispatching message", () => {
    const entries = lifecycleToLogEntry("session-started", {
      epicSlug: "e",
      phase: "plan",
      sessionId: "w:1",
    });
    const arr = entries as Array<{ level: string; text: string }>;
    expect(arr[0].level).toBe("info");
    expect(arr[0].text).toBe("dispatching");
  });

  test("session-started second entry is debug with session ID", () => {
    const entries = lifecycleToLogEntry("session-started", {
      epicSlug: "e",
      phase: "plan",
      sessionId: "w:1",
    });
    const arr = entries as Array<{ level: string; text: string }>;
    expect(arr[1].level).toBe("debug");
    expect(arr[1].text).toBe("session: w:1");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/event-routing-and-levels.integration.test.ts`
Expected: FAIL — `lifecycleToLogEntry("session-started", ...)` returns a single object, not an array.

- [ ] **Step 3: Modify lifecycleToLogEntry to return array for session-started**

In `cli/src/dashboard/lifecycle-entries.ts`, change the session-started overload signature (lines 32-35) and implementation (lines 67-70):

Change the overload at lines 32-35:
```typescript
export function lifecycleToLogEntry(
  kind: "session-started",
  payload: SessionStartedEvent,
): Omit<LogEntry, "seq">[];
```

Change the implementation case at lines 67-70:
```typescript
    case "session-started": {
      const p = payload as SessionStartedEvent;
      return [
        { type: "text", timestamp, text: "dispatching", level: "info" },
        { type: "text", timestamp, text: `session: ${p.sessionId}`, level: "debug" },
      ];
    }
```

Change the implementation signature (line 60-63) to return the union:
```typescript
export function lifecycleToLogEntry(
  kind: string,
  payload: LifecyclePayload,
): Omit<LogEntry, "seq"> | Omit<LogEntry, "seq">[] {
```

- [ ] **Step 4: Update the caller in App.tsx to push both entries**

In `cli/src/dashboard/App.tsx`, modify `onSessionStarted` (lines 275-284):

```typescript
    const onSessionStarted = (ev: WatchLoopEventMap["session-started"][0]) => {
      setActiveSessions((prev) => new Set([...prev, ev.epicSlug]));
      refreshSessions();
      const entries = lifecycleToLogEntry("session-started", ev);
      for (const entry of entries) {
        fallbackStoreRef.current.push(ev.epicSlug, ev.phase, ev.featureSlug, entry);
      }
    };
```

- [ ] **Step 5: Update existing tests that assert on the old single-entry behavior**

In `cli/src/__tests__/event-routing-and-levels.integration.test.ts`:

Replace "session-started is classified as debug level" (lines 67-74):
```typescript
  test("session-started returns info + debug pair", () => {
    const entries = lifecycleToLogEntry("session-started", {
      epicSlug: "e",
      phase: "plan",
      sessionId: "w:1",
    });
    const arr = entries as Array<{ level: string; text: string }>;
    expect(arr[0]).toHaveProperty("level", "info");
    expect(arr[1]).toHaveProperty("level", "debug");
  });
```

Replace "dispatch log entry includes the iTerm session identifier" (lines 127-134):
```typescript
  test("dispatch debug entry includes the iTerm session identifier", () => {
    const entries = lifecycleToLogEntry("session-started", {
      epicSlug: "e",
      phase: "implement",
      sessionId: "w:12345",
    });
    const arr = entries as Array<{ level: string; text: string }>;
    expect(arr[1].text).toContain("session: w:12345");
  });
```

Replace "dispatch entry with various session ID formats" (lines 136-145):
```typescript
  test("dispatch debug entry with various session ID formats", () => {
    for (const sessionId of ["w:12345", "w:67890", "w:1"]) {
      const entries = lifecycleToLogEntry("session-started", {
        epicSlug: "e",
        phase: "implement",
        sessionId,
      });
      const arr = entries as Array<{ level: string; text: string }>;
      expect(arr[1].text).toContain(`session: ${sessionId}`);
    }
  });
```

Also update the routing test "each log entry appears exactly once under its epic" (lines 9-37) — push both entries from the array:
```typescript
  test("each log entry appears exactly once under its epic", () => {
    const store = new FallbackEntryStore();
    const entries = lifecycleToLogEntry("session-started", {
      epicSlug: "auth-system",
      phase: "implement",
      sessionId: "w:12345",
    });
    for (const entry of entries) {
      store.push("auth-system", "implement", undefined, entry);
    }

    const sessions = [{ epicSlug: "auth-system", phase: "implement" }];
    const systemEntries: SystemEntry[] = [];

    const state = buildTreeState(
      sessions,
      (s) => store.get(s.epicSlug, s.phase, s.featureSlug),
      store,
      systemEntries,
    );

    const epic = state.epics.find((e) => e.slug === "auth-system");
    expect(epic).toBeDefined();
    expect(epic!.entries.length).toBeGreaterThan(0);

    const cliMessages = state.cli.entries.map((e) => e.message);
    expect(cliMessages).not.toContain(expect.stringContaining("auth-system"));
  });
```

And "entry routed to a feature does not also appear at epic level" (lines 39-63):
```typescript
  test("entry routed to a feature does not also appear at epic level", () => {
    const store = new FallbackEntryStore();
    const entries = lifecycleToLogEntry("session-started", {
      epicSlug: "auth-system",
      featureSlug: "login",
      phase: "implement",
      sessionId: "w:111",
    });
    for (const entry of entries) {
      store.push("auth-system", "implement", "login", entry);
    }

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

    expect(epic.entries).toHaveLength(0);
  });
```

- [ ] **Step 6: Run all tests**

Run: `cd cli && bun --bun vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add cli/src/dashboard/lifecycle-entries.ts cli/src/dashboard/App.tsx cli/src/__tests__/event-routing-and-levels.integration.test.ts
git commit -m "fix(wiring-fixes): split session-started into info + debug entries"
```
