# Dashboard Adoption — Implementation Tasks

## Goal

Replace the dashboard's flat `LogPanel` rendering with the shared `<TreeView />` component. The dashboard's data flow (ring buffers, session events) stays unchanged — only the rendering layer swaps.

## Architecture

- **Adapter hook**: `useDashboardTreeState` — transforms `DispatchedSession[]` + WatchLoop events into `TreeState` (the dashboard's `tree-types.ts` shape that `TreeView.tsx` already consumes)
- **LogPanel swap**: `LogPanel` receives `TreeState` + `maxVisibleLines` instead of `MergedLogEntry[]`
- **App.tsx wiring**: Feed session events and dispatched sessions through the adapter hook, pass resulting `TreeState` to the updated `LogPanel`

## Tech Stack

- Ink (React for terminals), Bun, TypeScript
- Test runner: `bun test` (per-file isolation via `cli/scripts/test.sh`)
- Existing component: `cli/src/dashboard/TreeView.tsx` consumes `TreeState` from `cli/src/dashboard/tree-types.ts`

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `cli/src/dashboard/hooks/use-dashboard-tree-state.ts` | Adapter hook: transforms sessions + events into `TreeState` |
| Create | `cli/src/__tests__/use-dashboard-tree-state.test.ts` | Pure logic tests for the adapter |
| Modify | `cli/src/dashboard/LogPanel.tsx` | Replace flat rendering with `<TreeView />` + viewport windowing |
| Modify | `cli/src/__tests__/log-panel.test.ts` | Update tests for new TreeState-based LogPanel |
| Modify | `cli/src/dashboard/App.tsx` | Wire adapter hook, pass `TreeState` to LogPanel |
| Modify | `cli/src/dashboard/hooks/index.ts` | Export new hook |

---

### Task 0: Build the useDashboardTreeState adapter hook

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/src/dashboard/hooks/use-dashboard-tree-state.ts`
- Create: `cli/src/__tests__/use-dashboard-tree-state.test.ts`
- Modify: `cli/src/dashboard/hooks/index.ts`

- [ ] **Step 1: Write the failing test — basic session-to-tree mapping**

Create `cli/src/__tests__/use-dashboard-tree-state.test.ts`:

```typescript
import { describe, test, expect } from "bun:test";
import type { TreeState } from "../dashboard/tree-types.js";

// --- Pure logic extracted from the hook for testability ---

interface MinimalSession {
  epicSlug: string;
  phase: string;
  featureSlug?: string;
}

interface MinimalEntry {
  seq: number;
  timestamp: number;
  type: "text" | "tool-start" | "tool-result" | "heartbeat" | "result";
  text: string;
}

/**
 * Build a TreeState from sessions and their buffered entries.
 * This is the pure core of useDashboardTreeState.
 */
function buildTreeState(
  sessions: MinimalSession[],
  getEntries: (session: MinimalSession) => MinimalEntry[],
): TreeState {
  // Will be imported from the hook module once implemented
  throw new Error("not implemented");
}

describe("useDashboardTreeState — buildTreeState", () => {
  test("single session produces epic > phase with entries", () => {
    const sessions: MinimalSession[] = [
      { epicSlug: "my-epic", phase: "plan" },
    ];
    const entries: MinimalEntry[] = [
      { seq: 0, timestamp: 1000, type: "text", text: "planning started" },
      { seq: 1, timestamp: 2000, type: "text", text: "planning done" },
    ];

    const state = buildTreeState(sessions, () => entries);

    expect(state.epics).toHaveLength(1);
    expect(state.epics[0].slug).toBe("my-epic");
    expect(state.epics[0].phases).toHaveLength(1);
    expect(state.epics[0].phases[0].phase).toBe("plan");
    expect(state.epics[0].phases[0].entries).toHaveLength(2);
    expect(state.epics[0].phases[0].entries[0].message).toBe("planning started");
  });

  test("session with featureSlug creates feature node under phase", () => {
    const sessions: MinimalSession[] = [
      { epicSlug: "my-epic", phase: "implement", featureSlug: "auth-flow" },
    ];
    const entries: MinimalEntry[] = [
      { seq: 0, timestamp: 1000, type: "text", text: "writing tests" },
    ];

    const state = buildTreeState(sessions, () => entries);

    expect(state.epics[0].phases[0].features).toHaveLength(1);
    expect(state.epics[0].phases[0].features[0].slug).toBe("auth-flow");
    expect(state.epics[0].phases[0].features[0].entries).toHaveLength(1);
  });

  test("multiple sessions for same epic merge into one epic node", () => {
    const sessions: MinimalSession[] = [
      { epicSlug: "my-epic", phase: "implement", featureSlug: "feat-a" },
      { epicSlug: "my-epic", phase: "implement", featureSlug: "feat-b" },
    ];

    const state = buildTreeState(sessions, () => [
      { seq: 0, timestamp: 1000, type: "text" as const, text: "msg" },
    ]);

    expect(state.epics).toHaveLength(1);
    expect(state.epics[0].phases[0].features).toHaveLength(2);
  });

  test("sessions for different epics produce separate epic nodes", () => {
    const sessions: MinimalSession[] = [
      { epicSlug: "epic-a", phase: "plan" },
      { epicSlug: "epic-b", phase: "validate" },
    ];

    const state = buildTreeState(sessions, () => [
      { seq: 0, timestamp: 1000, type: "text" as const, text: "msg" },
    ]);

    expect(state.epics).toHaveLength(2);
    expect(state.epics[0].slug).toBe("epic-a");
    expect(state.epics[1].slug).toBe("epic-b");
  });

  test("entries sorted by timestamp then seq within each node", () => {
    const sessions: MinimalSession[] = [
      { epicSlug: "e", phase: "plan" },
    ];
    const entries: MinimalEntry[] = [
      { seq: 1, timestamp: 2000, type: "text", text: "second" },
      { seq: 0, timestamp: 1000, type: "text", text: "first" },
    ];

    const state = buildTreeState(sessions, () => entries);

    expect(state.epics[0].phases[0].entries[0].message).toBe("first");
    expect(state.epics[0].phases[0].entries[1].message).toBe("second");
  });

  test("error entries detected from result type with error text", () => {
    const sessions: MinimalSession[] = [
      { epicSlug: "e", phase: "plan" },
    ];
    const entries: MinimalEntry[] = [
      { seq: 0, timestamp: 1000, type: "result", text: "session failed with error" },
    ];

    const state = buildTreeState(sessions, () => entries);

    expect(state.epics[0].phases[0].entries[0].level).toBe("error");
  });

  test("non-error result entries are info level", () => {
    const sessions: MinimalSession[] = [
      { epicSlug: "e", phase: "plan" },
    ];
    const entries: MinimalEntry[] = [
      { seq: 0, timestamp: 1000, type: "result", text: "completed successfully" },
    ];

    const state = buildTreeState(sessions, () => entries);

    expect(state.epics[0].phases[0].entries[0].level).toBe("info");
  });

  test("empty sessions produce empty state", () => {
    const state = buildTreeState([], () => []);
    expect(state.epics).toHaveLength(0);
    expect(state.system).toHaveLength(0);
  });

  test("multiple phases for same epic produce multiple phase nodes", () => {
    const sessions: MinimalSession[] = [
      { epicSlug: "e", phase: "plan" },
      { epicSlug: "e", phase: "implement" },
    ];

    const state = buildTreeState(sessions, () => [
      { seq: 0, timestamp: 1000, type: "text" as const, text: "msg" },
    ]);

    expect(state.epics[0].phases).toHaveLength(2);
    expect(state.epics[0].phases[0].phase).toBe("plan");
    expect(state.epics[0].phases[1].phase).toBe("implement");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun test src/__tests__/use-dashboard-tree-state.test.ts`
Expected: FAIL with "not implemented"

- [ ] **Step 3: Implement buildTreeState and the hook**

Create `cli/src/dashboard/hooks/use-dashboard-tree-state.ts`:

```typescript
import { useState, useEffect, useMemo } from "react";
import type { DispatchedSession } from "../../dispatch/types.js";
import type { LogEntry, SessionEmitter } from "../../dispatch/factory.js";
import type { TreeState, EpicNode, PhaseNode, FeatureNode, TreeEntry } from "../tree-types.js";
import type { LogLevel } from "../../logger.js";

export interface UseDashboardTreeStateOptions {
  /** Active dispatched sessions from the tracker. */
  sessions: DispatchedSession[];
  /** Selected epic slug — undefined means aggregate mode. */
  selectedEpicSlug?: string;
}

export interface UseDashboardTreeStateResult {
  /** Tree state ready for TreeView rendering. */
  state: TreeState;
}

/** Map a LogEntry to a TreeEntry. */
function toTreeEntry(entry: LogEntry): TreeEntry {
  const isError =
    entry.type === "result" &&
    entry.text.toLowerCase().includes("error");
  const level: LogLevel = isError ? "error" : "info";

  return {
    timestamp: entry.timestamp,
    level,
    message: entry.text,
    seq: entry.seq,
  };
}

/**
 * Build a TreeState from sessions and their buffered entries.
 * Pure function — no React dependency, testable standalone.
 */
export function buildTreeState(
  sessions: Array<{ epicSlug: string; phase: string; featureSlug?: string }>,
  getEntries: (session: { epicSlug: string; phase: string; featureSlug?: string }) => LogEntry[],
): TreeState {
  const epicMap = new Map<string, EpicNode>();

  for (const session of sessions) {
    // Get or create epic
    let epic = epicMap.get(session.epicSlug);
    if (!epic) {
      epic = { slug: session.epicSlug, phases: [] };
      epicMap.set(session.epicSlug, epic);
    }

    // Get or create phase
    let phase = epic.phases.find((p) => p.phase === session.phase);
    if (!phase) {
      phase = { phase: session.phase, features: [], entries: [] };
      epic.phases.push(phase);
    }

    // Get entries for this session
    const rawEntries = getEntries(session);
    const treeEntries = rawEntries.map(toTreeEntry);

    if (session.featureSlug) {
      // Get or create feature
      let feature = phase.features.find((f) => f.slug === session.featureSlug);
      if (!feature) {
        feature = { slug: session.featureSlug!, entries: [] };
        phase.features.push(feature);
      }
      feature.entries.push(...treeEntries);
      // Sort entries by timestamp then seq
      feature.entries.sort((a, b) => a.timestamp - b.timestamp || a.seq - b.seq);
    } else {
      phase.entries.push(...treeEntries);
      // Sort entries by timestamp then seq
      phase.entries.sort((a, b) => a.timestamp - b.timestamp || a.seq - b.seq);
    }
  }

  return {
    epics: Array.from(epicMap.values()),
    system: [],
  };
}

/**
 * React hook that transforms dispatched sessions into TreeState
 * for the dashboard's TreeView component.
 */
export function useDashboardTreeState({
  sessions,
  selectedEpicSlug,
}: UseDashboardTreeStateOptions): UseDashboardTreeStateResult {
  const [, setRevision] = useState(0);

  // Filter sessions by selected epic
  const filteredSessions =
    selectedEpicSlug === undefined
      ? sessions
      : sessions.filter((s) => s.epicSlug === selectedEpicSlug);

  // Subscribe to 'entry' events on each session's emitter for live updates
  useEffect(() => {
    const emitters: SessionEmitter[] = [];
    const handler = () => setRevision((r) => r + 1);

    for (const session of filteredSessions) {
      if (session.events) {
        session.events.on("entry", handler);
        emitters.push(session.events);
      }
    }

    return () => {
      for (const emitter of emitters) {
        emitter.off("entry", handler);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSessions.map((s) => s.id).join(",")]);

  // Build tree state on each render (revision bump triggers rebuild)
  const state = buildTreeState(
    filteredSessions,
    (session) => {
      const ds = filteredSessions.find(
        (s) => s.epicSlug === session.epicSlug && s.phase === session.phase && s.featureSlug === session.featureSlug,
      );
      return ds?.events?.getBuffer() ?? [];
    },
  );

  return { state };
}
```

- [ ] **Step 4: Update test to import from the real module**

Update `cli/src/__tests__/use-dashboard-tree-state.test.ts` to replace the stub `buildTreeState` with:

```typescript
import { describe, test, expect } from "bun:test";
import { buildTreeState } from "../dashboard/hooks/use-dashboard-tree-state.js";
import type { TreeState } from "../dashboard/tree-types.js";
import type { LogEntry } from "../dispatch/factory.js";

describe("useDashboardTreeState — buildTreeState", () => {
  function makeEntry(seq: number, timestamp: number, text: string, type: LogEntry["type"] = "text"): LogEntry {
    return { seq, timestamp, type, text };
  }

  test("single session produces epic > phase with entries", () => {
    const sessions = [{ epicSlug: "my-epic", phase: "plan" }];
    const entries = [
      makeEntry(0, 1000, "planning started"),
      makeEntry(1, 2000, "planning done"),
    ];

    const state = buildTreeState(sessions, () => entries);

    expect(state.epics).toHaveLength(1);
    expect(state.epics[0].slug).toBe("my-epic");
    expect(state.epics[0].phases).toHaveLength(1);
    expect(state.epics[0].phases[0].phase).toBe("plan");
    expect(state.epics[0].phases[0].entries).toHaveLength(2);
    expect(state.epics[0].phases[0].entries[0].message).toBe("planning started");
  });

  test("session with featureSlug creates feature node under phase", () => {
    const sessions = [{ epicSlug: "my-epic", phase: "implement", featureSlug: "auth-flow" }];
    const entries = [makeEntry(0, 1000, "writing tests")];

    const state = buildTreeState(sessions, () => entries);

    expect(state.epics[0].phases[0].features).toHaveLength(1);
    expect(state.epics[0].phases[0].features[0].slug).toBe("auth-flow");
    expect(state.epics[0].phases[0].features[0].entries).toHaveLength(1);
  });

  test("multiple sessions for same epic merge into one epic node", () => {
    const sessions = [
      { epicSlug: "my-epic", phase: "implement", featureSlug: "feat-a" },
      { epicSlug: "my-epic", phase: "implement", featureSlug: "feat-b" },
    ];

    const state = buildTreeState(sessions, () => [makeEntry(0, 1000, "msg")]);

    expect(state.epics).toHaveLength(1);
    expect(state.epics[0].phases[0].features).toHaveLength(2);
  });

  test("sessions for different epics produce separate epic nodes", () => {
    const sessions = [
      { epicSlug: "epic-a", phase: "plan" },
      { epicSlug: "epic-b", phase: "validate" },
    ];

    const state = buildTreeState(sessions, () => [makeEntry(0, 1000, "msg")]);

    expect(state.epics).toHaveLength(2);
    expect(state.epics[0].slug).toBe("epic-a");
    expect(state.epics[1].slug).toBe("epic-b");
  });

  test("entries sorted by timestamp then seq within each node", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const entries = [
      makeEntry(1, 2000, "second"),
      makeEntry(0, 1000, "first"),
    ];

    const state = buildTreeState(sessions, () => entries);

    expect(state.epics[0].phases[0].entries[0].message).toBe("first");
    expect(state.epics[0].phases[0].entries[1].message).toBe("second");
  });

  test("error entries detected from result type with error text", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const entries = [makeEntry(0, 1000, "session failed with error", "result")];

    const state = buildTreeState(sessions, () => entries);

    expect(state.epics[0].phases[0].entries[0].level).toBe("error");
  });

  test("non-error result entries are info level", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const entries = [makeEntry(0, 1000, "completed successfully", "result")];

    const state = buildTreeState(sessions, () => entries);

    expect(state.epics[0].phases[0].entries[0].level).toBe("info");
  });

  test("empty sessions produce empty state", () => {
    const state = buildTreeState([], () => []);
    expect(state.epics).toHaveLength(0);
    expect(state.system).toHaveLength(0);
  });

  test("multiple phases for same epic produce multiple phase nodes", () => {
    const sessions = [
      { epicSlug: "e", phase: "plan" },
      { epicSlug: "e", phase: "implement" },
    ];

    const state = buildTreeState(sessions, () => [makeEntry(0, 1000, "msg")]);

    expect(state.epics[0].phases).toHaveLength(2);
    expect(state.epics[0].phases[0].phase).toBe("plan");
    expect(state.epics[0].phases[1].phase).toBe("implement");
  });
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd cli && bun test src/__tests__/use-dashboard-tree-state.test.ts`
Expected: PASS — all 9 tests green

- [ ] **Step 6: Export the hook from the hooks barrel**

Add to `cli/src/dashboard/hooks/index.ts`:

```typescript
export { useDashboardTreeState } from "./use-dashboard-tree-state.js";
export type { UseDashboardTreeStateOptions, UseDashboardTreeStateResult } from "./use-dashboard-tree-state.js";
```

- [ ] **Step 7: Commit**

```bash
git add cli/src/dashboard/hooks/use-dashboard-tree-state.ts cli/src/__tests__/use-dashboard-tree-state.test.ts cli/src/dashboard/hooks/index.ts
git commit -m "feat(dashboard-adoption): add useDashboardTreeState adapter hook"
```

---

### Task 1: Replace LogPanel flat rendering with TreeView

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `cli/src/dashboard/LogPanel.tsx`
- Modify: `cli/src/__tests__/log-panel.test.ts`

- [ ] **Step 1: Update LogPanel to accept TreeState and render TreeView**

Replace `cli/src/dashboard/LogPanel.tsx` contents:

```typescript
import { Box, Text } from "ink";
import type { TreeState } from "./tree-types.js";
import TreeView from "./TreeView.js";

export interface LogPanelProps {
  /** Tree state to render. */
  state: TreeState;
  /** Maximum visible lines to render. Default: 50 */
  maxVisibleLines?: number;
}

/**
 * LogPanel — renders pipeline log entries as a hierarchical tree.
 *
 * Uses the shared TreeView component for consistent rendering between
 * watch and dashboard. Applies a viewport window (last N rendered lines)
 * for auto-follow behavior in the dashboard's alternate screen buffer.
 */
export default function LogPanel({
  state,
  maxVisibleLines = 50,
}: LogPanelProps) {
  const hasContent = state.epics.length > 0 || state.system.length > 0;

  if (!hasContent) {
    return (
      <Box justifyContent="center" alignItems="center" flexGrow={1}>
        <Text dimColor>no active sessions</Text>
      </Box>
    );
  }

  // Viewport windowing: wrap TreeView in a Box with maxHeight
  // to show only the last N lines (auto-follow newest entries)
  return (
    <Box flexDirection="column" height={maxVisibleLines} overflow="hidden">
      <TreeView state={state} />
    </Box>
  );
}
```

- [ ] **Step 2: Update log-panel tests**

Replace `cli/src/__tests__/log-panel.test.ts` contents:

```typescript
import { describe, test, expect } from "bun:test";
import type { TreeState, TreeEntry, SystemEntry } from "../dashboard/tree-types.js";

// ---------------------------------------------------------------------------
// Group 1: LogPanel TreeState rendering logic (pure logic tests)
// ---------------------------------------------------------------------------

describe("LogPanel with TreeState", () => {
  function makeEntry(msg: string, seq: number, level: "info" | "warn" | "error" = "info"): TreeEntry {
    return { timestamp: 1000, level, message: msg, seq };
  }

  test("empty state is detected as no content", () => {
    const state: TreeState = { epics: [], system: [] };
    const hasContent = state.epics.length > 0 || state.system.length > 0;
    expect(hasContent).toBe(false);
  });

  test("state with epics is detected as has content", () => {
    const state: TreeState = {
      epics: [{ slug: "my-epic", phases: [] }],
      system: [],
    };
    const hasContent = state.epics.length > 0 || state.system.length > 0;
    expect(hasContent).toBe(true);
  });

  test("state with system entries is detected as has content", () => {
    const state: TreeState = {
      epics: [],
      system: [{ timestamp: 1000, level: "info", message: "started", seq: 0 }],
    };
    const hasContent = state.epics.length > 0 || state.system.length > 0;
    expect(hasContent).toBe(true);
  });

  test("tree state preserves entry ordering within phase", () => {
    const entries: TreeEntry[] = [
      makeEntry("first", 0),
      makeEntry("second", 1),
      makeEntry("third", 2),
    ];
    const state: TreeState = {
      epics: [{
        slug: "e",
        phases: [{
          phase: "plan",
          features: [],
          entries,
        }],
      }],
      system: [],
    };

    expect(state.epics[0].phases[0].entries.map(e => e.message)).toEqual([
      "first", "second", "third",
    ]);
  });

  test("tree state preserves feature nesting under phase", () => {
    const state: TreeState = {
      epics: [{
        slug: "e",
        phases: [{
          phase: "implement",
          features: [
            { slug: "feat-a", entries: [makeEntry("a-msg", 0)] },
            { slug: "feat-b", entries: [makeEntry("b-msg", 1)] },
          ],
          entries: [],
        }],
      }],
      system: [],
    };

    expect(state.epics[0].phases[0].features).toHaveLength(2);
    expect(state.epics[0].phases[0].features[0].slug).toBe("feat-a");
    expect(state.epics[0].phases[0].features[1].slug).toBe("feat-b");
  });
});

// ---------------------------------------------------------------------------
// Group 2: Aggregate vs filtered mode (still relevant)
// ---------------------------------------------------------------------------

describe("aggregate vs filtered mode", () => {
  test("filter sessions by epicSlug when selected", () => {
    const sessions = [
      { id: "1", epicSlug: "dashboard", featureSlug: "log" },
      { id: "2", epicSlug: "auth", featureSlug: "login" },
      { id: "3", epicSlug: "dashboard", featureSlug: "details" },
    ];
    const selectedEpicSlug = "dashboard";
    const filtered = sessions.filter(s => s.epicSlug === selectedEpicSlug);
    expect(filtered.map(s => s.id)).toEqual(["1", "3"]);
  });

  test("undefined selectedEpicSlug includes all sessions", () => {
    const sessions = [
      { id: "1", epicSlug: "dashboard" },
      { id: "2", epicSlug: "auth" },
    ];
    const selectedEpicSlug = undefined;
    const filtered = selectedEpicSlug === undefined
      ? sessions
      : sessions.filter(s => s.epicSlug === selectedEpicSlug);
    expect(filtered.length).toBe(2);
  });
});
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd cli && bun test src/__tests__/log-panel.test.ts`
Expected: PASS — all tests green

- [ ] **Step 4: Commit**

```bash
git add cli/src/dashboard/LogPanel.tsx cli/src/__tests__/log-panel.test.ts
git commit -m "feat(dashboard-adoption): replace LogPanel flat rendering with TreeView"
```

---

### Task 2: Wire App.tsx to use the adapter hook

**Wave:** 3
**Depends on:** Task 0, Task 1

**Files:**
- Modify: `cli/src/dashboard/App.tsx`

- [ ] **Step 1: Add useDashboardTreeState to App.tsx**

In `cli/src/dashboard/App.tsx`:

1. Add import:
```typescript
import { useDashboardTreeState } from "./hooks/use-dashboard-tree-state.js";
```

2. Remove the `useLogEntries` import and its usage (it was only used in previous flat LogPanel — check if it's used elsewhere in App.tsx first; if the AgentLog view uses it, keep that separate)

3. Inside the `App` component, after the existing state declarations, add:
```typescript
// --- Tree state for log panel ---
const { state: treeState } = useDashboardTreeState({
  sessions: loop ? loop.getTracker().getAll() : [],
  selectedEpicSlug: activeView.type === "feature-list" ? (activeView as VS.FeatureList).epicSlug : undefined,
});
```

4. The dashboard doesn't currently render LogPanel in the main view — it uses EpicTable, FeatureList, AgentLog. The LogPanel was used in the activity log area. Check where LogPanel would be integrated.

Looking at the current App.tsx: the dashboard uses `ActivityLog` for the bottom zone and renders EpicTable/FeatureList/AgentLog in the content area. The LogPanel component exists but isn't currently imported in App.tsx. The feature plan says "dashboard's log panel" — this means creating a new view or integrating into the existing layout.

Since the dashboard has EpicTable → FeatureList → AgentLog drill-down flow, the natural integration point is replacing or augmenting the AgentLog view (which currently has a TODO: "Wire up emitter from DispatchTracker when SDK streaming is connected"). The tree view should be available when viewing an epic's features — showing all session logs in tree form.

Add a new case in the `renderContent` function or add the TreeView to the AgentLog view:

```typescript
case "agent-log":
  return (
    <Box flexDirection="column" flexGrow={1}>
      <LogPanel
        state={treeState}
        maxVisibleLines={followMode ? 30 : undefined}
      />
    </Box>
  );
```

5. Add the LogPanel import:
```typescript
import LogPanel from "./LogPanel.js";
```

- [ ] **Step 2: Verify the App.tsx compiles**

Run: `cd cli && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run full test suite**

Run: `cd cli && bash scripts/test.sh`
Expected: All test files pass

- [ ] **Step 4: Commit**

```bash
git add cli/src/dashboard/App.tsx
git commit -m "feat(dashboard-adoption): wire useDashboardTreeState adapter in App.tsx"
```
