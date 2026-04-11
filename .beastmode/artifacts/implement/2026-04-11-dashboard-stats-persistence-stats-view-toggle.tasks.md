# stats-view-toggle — Implementation Tasks

## Goal

Add a keyboard-driven toggle (`s` key) that switches the dashboard DetailsPanel stats view between **all-time** (persisted historical) and **current-session** stats. Default view is all-time.

## Architecture

- **StatsViewMode:** `"all-time" | "session"` — new type, toggled via `s` key in normal mode
- **Data flow:** App.tsx already holds both `allTimeStats: PersistedStats` and `sessionStats: SessionStats`. A new `statsViewMode` state in App.tsx controls which one is passed to DetailsPanel.
- **PersistedStats → SessionStats conversion:** `toSessionStats(p: PersistedStats): SessionStats` — converts the on-disk format to the renderer format so DetailsPanel doesn't need to know about PersistedStats shape.
- **Keyboard:** `s`/`S` key added to `use-dashboard-keyboard.ts` — only effective in normal mode. New state `statsViewMode` added to `DashboardKeyboardState`.
- **Key hints:** Show `s stats:all-time` / `s stats:session` in normal mode hint bar.
- **DetailsPanel label:** A visible label "all-time" or "session" rendered above the stats sections.
- **Toggle only affects `kind === "stats"` rendering** — overview, artifact, not-found unaffected.

## Tech Stack

- TypeScript, React/Ink, Vitest
- Test runner: `cd cli && bun --bun vitest run`

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/dashboard/stats-persistence.ts` | Modify | Add `toSessionStats()` converter |
| `cli/src/dashboard/hooks/use-dashboard-keyboard.ts` | Modify | Add `s` key handler, `statsViewMode` state, export `StatsViewMode` type |
| `cli/src/dashboard/key-hints.ts` | Modify | Add `statsViewMode` to context, show in normal hints |
| `cli/src/dashboard/DetailsPanel.tsx` | Modify | Add `statsViewMode` prop, render label |
| `cli/src/dashboard/details-panel.ts` | Modify | Add `statsViewMode` to context, conditional stats source |
| `cli/src/dashboard/App.tsx` | Modify | Wire `statsViewMode` from keyboard to DetailsPanel, pass correct stats |
| `cli/src/__tests__/stats-view-toggle.integration.test.ts` | Create | Integration test (Task 0) |
| `cli/src/__tests__/stats-persistence.test.ts` | Modify | Add `toSessionStats` tests |
| `cli/src/__tests__/details-panel.test.ts` | Modify | Add toggle-aware resolver tests |
| `cli/src/__tests__/key-hints.test.ts` | Modify (or Create) | Add stats mode in hints tests |

---

## Task 0: Integration Test (BDD — RED)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/stats-view-toggle.integration.test.ts`

- [x] **Step 1: Write the integration test**

```typescript
import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveDetailsContent, type DetailsContentContext } from "../dashboard/details-panel.js";
import type { SessionStats } from "../dashboard/session-stats.js";
import type { PersistedStats } from "../dashboard/stats-persistence.js";
import { toSessionStats } from "../dashboard/stats-persistence.js";

// Source files for structural assertions
const DETAILS_PANEL_SRC = readFileSync(
  resolve(import.meta.dirname, "../dashboard/DetailsPanel.tsx"),
  "utf-8",
);
const KEYBOARD_SRC = readFileSync(
  resolve(import.meta.dirname, "../dashboard/hooks/use-dashboard-keyboard.ts"),
  "utf-8",
);
const KEY_HINTS_SRC = readFileSync(
  resolve(import.meta.dirname, "../dashboard/key-hints.ts"),
  "utf-8",
);

const samplePersistedStats: PersistedStats = {
  schemaVersion: 1,
  total: 10,
  successes: 8,
  failures: 2,
  reDispatches: 1,
  cumulativeMs: 600000,
  phaseDurations: {
    plan: { avgMs: 30000, count: 3 },
    implement: { avgMs: 120000, count: 5 },
    validate: { avgMs: 45000, count: 4 },
    release: { avgMs: 15000, count: 2 },
  },
  completedKeys: ["a:plan:", "b:implement:feat1"],
};

const sampleSessionStats: SessionStats = {
  total: 3,
  active: 1,
  successes: 2,
  failures: 1,
  reDispatches: 0,
  successRate: 67,
  uptimeMs: 120000,
  cumulativeMs: 180000,
  isEmpty: false,
  phaseDurations: { plan: 20000, implement: 80000, validate: null, release: null },
};

describe("Dashboard stats view toggle — integration", () => {
  describe("Scenario: Default stats view shows all-time statistics", () => {
    test("when no view toggle has been activated, stats panel displays all-time statistics", () => {
      // Default statsViewMode should be "all-time"
      // resolveDetailsContent with statsViewMode "all-time" should use historicalStats
      const historicalAsSession = toSessionStats(samplePersistedStats);
      const ctx: DetailsContentContext = {
        epics: [],
        activeSessions: 0,
        gitStatus: null,
        stats: historicalAsSession,
        statsViewMode: "all-time",
      };
      const result = resolveDetailsContent({ kind: "all" }, ctx);
      expect(result.kind).toBe("stats");
      if (result.kind === "stats") {
        expect(result.stats.total).toBe(10); // all-time total, not session total
      }
    });
  });

  describe("Scenario: Operator toggles to current-session stats view", () => {
    test("when toggle activated, stats panel displays current-session statistics", () => {
      const ctx: DetailsContentContext = {
        epics: [],
        activeSessions: 1,
        gitStatus: null,
        stats: sampleSessionStats,
        statsViewMode: "session",
      };
      const result = resolveDetailsContent({ kind: "all" }, ctx);
      expect(result.kind).toBe("stats");
      if (result.kind === "stats") {
        expect(result.stats.total).toBe(3); // session total
      }
    });
  });

  describe("Scenario: Operator toggles back to all-time stats view", () => {
    test("after toggling back, stats panel displays all-time statistics again", () => {
      const historicalAsSession = toSessionStats(samplePersistedStats);
      const ctx: DetailsContentContext = {
        epics: [],
        activeSessions: 0,
        gitStatus: null,
        stats: historicalAsSession,
        statsViewMode: "all-time",
      };
      const result = resolveDetailsContent({ kind: "all" }, ctx);
      expect(result.kind).toBe("stats");
      if (result.kind === "stats") {
        expect(result.stats.total).toBe(10);
      }
    });
  });

  describe("Scenario: Stats view label indicates which view is active", () => {
    test("DetailsPanel source contains all-time label", () => {
      expect(DETAILS_PANEL_SRC).toContain("all-time");
    });

    test("DetailsPanel source contains session label", () => {
      expect(DETAILS_PANEL_SRC).toContain("session");
    });

    test("DetailsPanel accepts statsViewMode prop", () => {
      expect(DETAILS_PANEL_SRC).toContain("statsViewMode");
    });
  });

  describe("Keyboard binding", () => {
    test("keyboard handler source contains s key handler", () => {
      // The 's' key should toggle stats view mode
      expect(KEYBOARD_SRC).toMatch(/input\s*===\s*["']s["']/);
    });

    test("keyboard handler exports StatsViewMode type", () => {
      expect(KEYBOARD_SRC).toContain("StatsViewMode");
    });

    test("keyboard handler exports statsViewMode state", () => {
      expect(KEYBOARD_SRC).toContain("statsViewMode");
    });
  });

  describe("Key hints", () => {
    test("key hints source references stats view mode", () => {
      expect(KEY_HINTS_SRC).toContain("stats:");
    });
  });

  describe("toSessionStats converter", () => {
    test("converts PersistedStats to SessionStats shape", () => {
      const result = toSessionStats(samplePersistedStats);
      expect(result.total).toBe(10);
      expect(result.successes).toBe(8);
      expect(result.failures).toBe(2);
      expect(result.reDispatches).toBe(1);
      expect(result.successRate).toBe(80);
      expect(result.cumulativeMs).toBe(600000);
      expect(result.isEmpty).toBe(false);
      expect(result.phaseDurations.plan).toBe(30000);
      expect(result.phaseDurations.implement).toBe(120000);
      expect(result.phaseDurations.validate).toBe(45000);
      expect(result.phaseDurations.release).toBe(15000);
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails (RED)**

Run: `cd cli && bun --bun vitest run src/__tests__/stats-view-toggle.integration.test.ts`
Expected: FAIL — `toSessionStats` not exported, `statsViewMode` not in types

- [x] **Step 3: Commit**

```bash
git add cli/src/__tests__/stats-view-toggle.integration.test.ts
git commit -m "test(stats-view-toggle): add integration test (RED)"
```

---

## Task 1: Add toSessionStats converter to stats-persistence.ts

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/stats-persistence.ts`
- Modify: `cli/src/__tests__/stats-persistence.test.ts`

- [x] **Step 1: Write the failing test**

Add to `cli/src/__tests__/stats-persistence.test.ts`:

```typescript
import { toSessionStats } from "../dashboard/stats-persistence.js";

describe("toSessionStats", () => {
  test("converts PersistedStats with populated phases to SessionStats", () => {
    const persisted: PersistedStats = {
      schemaVersion: 1,
      total: 10,
      successes: 8,
      failures: 2,
      reDispatches: 1,
      cumulativeMs: 600000,
      phaseDurations: {
        plan: { avgMs: 30000, count: 3 },
        implement: { avgMs: 120000, count: 5 },
        validate: { avgMs: 45000, count: 4 },
        release: { avgMs: 15000, count: 2 },
      },
      completedKeys: ["a:plan:", "b:implement:feat1"],
    };
    const result = toSessionStats(persisted);
    expect(result.total).toBe(10);
    expect(result.active).toBe(0);
    expect(result.successes).toBe(8);
    expect(result.failures).toBe(2);
    expect(result.reDispatches).toBe(1);
    expect(result.successRate).toBe(80);
    expect(result.uptimeMs).toBe(0);
    expect(result.cumulativeMs).toBe(600000);
    expect(result.isEmpty).toBe(false);
    expect(result.phaseDurations.plan).toBe(30000);
    expect(result.phaseDurations.implement).toBe(120000);
    expect(result.phaseDurations.validate).toBe(45000);
    expect(result.phaseDurations.release).toBe(15000);
  });

  test("converts empty PersistedStats to empty SessionStats", () => {
    const empty = emptyPersistedStats();
    const result = toSessionStats(empty);
    expect(result.total).toBe(0);
    expect(result.active).toBe(0);
    expect(result.isEmpty).toBe(true);
    expect(result.successRate).toBe(0);
    expect(result.phaseDurations.plan).toBeNull();
    expect(result.phaseDurations.implement).toBeNull();
    expect(result.phaseDurations.validate).toBeNull();
    expect(result.phaseDurations.release).toBeNull();
  });

  test("handles partial phase durations (missing phases get null)", () => {
    const partial: PersistedStats = {
      schemaVersion: 1,
      total: 2,
      successes: 2,
      failures: 0,
      reDispatches: 0,
      cumulativeMs: 100000,
      phaseDurations: {
        plan: { avgMs: 50000, count: 2 },
      },
      completedKeys: [],
    };
    const result = toSessionStats(partial);
    expect(result.phaseDurations.plan).toBe(50000);
    expect(result.phaseDurations.implement).toBeNull();
    expect(result.phaseDurations.validate).toBeNull();
    expect(result.phaseDurations.release).toBeNull();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/stats-persistence.test.ts`
Expected: FAIL with "toSessionStats is not exported" or similar

- [x] **Step 3: Implement toSessionStats**

Add to `cli/src/dashboard/stats-persistence.ts`:

```typescript
import type { SessionStats } from "./session-stats.js";

const TRACKED_PHASES = ["plan", "implement", "validate", "release"] as const;
type TrackedPhase = (typeof TRACKED_PHASES)[number];

/**
 * Convert persisted all-time stats into the SessionStats shape for rendering.
 * Sets active=0, uptimeMs=0 (not applicable for historical data).
 */
export function toSessionStats(p: PersistedStats): SessionStats {
  const phaseDurations = {} as Record<TrackedPhase, number | null>;
  for (const phase of TRACKED_PHASES) {
    const entry = p.phaseDurations[phase];
    phaseDurations[phase] = entry ? entry.avgMs : null;
  }

  return {
    total: p.total,
    active: 0,
    successes: p.successes,
    failures: p.failures,
    reDispatches: p.reDispatches,
    successRate: p.total > 0 ? Math.round((p.successes / p.total) * 100) : 0,
    uptimeMs: 0,
    cumulativeMs: p.cumulativeMs,
    isEmpty: p.total === 0,
    phaseDurations,
  };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/stats-persistence.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add cli/src/dashboard/stats-persistence.ts cli/src/__tests__/stats-persistence.test.ts
git commit -m "feat(stats-view-toggle): add toSessionStats converter"
```

---

## Task 2: Add StatsViewMode to keyboard handler

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/hooks/use-dashboard-keyboard.ts`

- [x] **Step 1: Write the failing test**

Create `cli/src/__tests__/stats-view-toggle-keyboard.test.ts`:

```typescript
import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = readFileSync(
  resolve(import.meta.dirname, "../dashboard/hooks/use-dashboard-keyboard.ts"),
  "utf-8",
);

describe("use-dashboard-keyboard stats view toggle", () => {
  test("exports StatsViewMode type", () => {
    expect(SRC).toContain("export type StatsViewMode");
  });

  test("has statsViewMode state", () => {
    expect(SRC).toContain("statsViewMode");
  });

  test("handles s key input", () => {
    expect(SRC).toMatch(/input\s*===\s*["']s["']/);
  });

  test("default stats view mode is all-time", () => {
    expect(SRC).toContain('"all-time"');
  });

  test("toggles between all-time and session", () => {
    expect(SRC).toContain('"session"');
  });

  test("statsViewMode is in DashboardKeyboardState interface", () => {
    // Verify the interface includes the new field
    const interfaceMatch = SRC.match(/export interface DashboardKeyboardState\s*\{[\s\S]*?\}/);
    expect(interfaceMatch).not.toBeNull();
    expect(interfaceMatch![0]).toContain("statsViewMode");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/stats-view-toggle-keyboard.test.ts`
Expected: FAIL — no `StatsViewMode` type exported

- [x] **Step 3: Implement the toggle**

In `cli/src/dashboard/hooks/use-dashboard-keyboard.ts`:

1. Add type export after `ViewFilter`:
```typescript
/** Stats view mode — controls whether DetailsPanel shows all-time or session stats. */
export type StatsViewMode = "all-time" | "session";
```

2. Add `statsViewMode` to `DashboardKeyboardState` interface:
```typescript
  /** Stats view mode — all-time or current session */
  statsViewMode: StatsViewMode;
```

3. Add state in `useDashboardKeyboard`:
```typescript
const [statsViewMode, setStatsViewMode] = useState<StatsViewMode>("all-time");
```

4. Add key handler in normal mode section, after verbosity cycling (priority 12) and before PgUp (priority 13):
```typescript
      // Priority 12.5: stats view toggle
      if (input === "s" || input === "S") {
        setStatsViewMode((prev) => (prev === "all-time" ? "session" : "all-time"));
        return;
      }
```

5. Add `statsViewMode` to the return object.

6. Add `statsViewMode` to the `handleInput` dependency array.

- [x] **Step 4: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/stats-view-toggle-keyboard.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add cli/src/dashboard/hooks/use-dashboard-keyboard.ts cli/src/__tests__/stats-view-toggle-keyboard.test.ts
git commit -m "feat(stats-view-toggle): add s key toggle to keyboard handler"
```

---

## Task 3: Add statsViewMode to key hints

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/key-hints.ts`

- [x] **Step 1: Write the failing test**

Create `cli/src/__tests__/stats-view-toggle-key-hints.test.ts`:

```typescript
import { describe, test, expect } from "vitest";
import { getKeyHints } from "../dashboard/key-hints.js";

describe("key-hints stats view mode", () => {
  test("normal mode includes stats view mode indicator", () => {
    const hints = getKeyHints("normal", { statsViewMode: "all-time" });
    expect(hints).toContain("s stats:all-time");
  });

  test("normal mode shows session when statsViewMode is session", () => {
    const hints = getKeyHints("normal", { statsViewMode: "session" });
    expect(hints).toContain("s stats:session");
  });

  test("defaults to all-time when statsViewMode not provided", () => {
    const hints = getKeyHints("normal", {});
    expect(hints).toContain("s stats:all-time");
  });

  test("filter mode does not include stats", () => {
    const hints = getKeyHints("filter", { filterInput: "test" });
    expect(hints).not.toContain("s stats:");
  });

  test("confirm mode does not include stats", () => {
    const hints = getKeyHints("confirm", { slug: "abc" });
    expect(hints).not.toContain("s stats:");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/stats-view-toggle-key-hints.test.ts`
Expected: FAIL — no stats mode in hints

- [x] **Step 3: Implement the hint**

In `cli/src/dashboard/key-hints.ts`:

1. Add `statsViewMode` to `KeyHintContext`:
```typescript
export interface KeyHintContext {
  slug?: string;
  filterInput?: string;
  verbosity?: number;
  phaseFilter?: string;
  viewFilter?: string;
  statsViewMode?: string;
}
```

2. Update the normal mode hint function to include stats view mode:
```typescript
  normal: (ctx) =>
    `q quit  ↑↓ navigate  j/k log  Tab focus  / filter  x cancel  ` +
    `v verb:${verbosityLabel(ctx?.verbosity ?? 0)}  ` +
    `p phase:${ctx?.phaseFilter ?? "all"}  ` +
    `b view:${ctx?.viewFilter ?? "active"}  ` +
    `s stats:${ctx?.statsViewMode ?? "all-time"}`,
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/stats-view-toggle-key-hints.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add cli/src/dashboard/key-hints.ts cli/src/__tests__/stats-view-toggle-key-hints.test.ts
git commit -m "feat(stats-view-toggle): add stats mode to key hints"
```

---

## Task 4: Update DetailsPanel to accept statsViewMode and render label

**Wave:** 2
**Depends on:** Task 1, Task 2

**Files:**
- Modify: `cli/src/dashboard/DetailsPanel.tsx`
- Modify: `cli/src/dashboard/details-panel.ts`
- Modify: `cli/src/__tests__/details-panel.test.ts`
- Modify: `cli/src/__tests__/details-panel-stats-rendering.test.ts`

- [x] **Step 1: Write the failing test**

Add to `cli/src/__tests__/details-panel.test.ts`:

```typescript
describe("resolveDetailsContent with statsViewMode", () => {
  test("returns stats with statsViewMode all-time", () => {
    const stats: SessionStats = {
      total: 5, active: 0, successes: 5, failures: 0, reDispatches: 0,
      successRate: 100, uptimeMs: 0, cumulativeMs: 200000,
      isEmpty: false,
      phaseDurations: { plan: 30000, implement: 80000, validate: 40000, release: 10000 },
    };
    const result = resolveDetailsContent(
      { kind: "all" },
      { epics: [], activeSessions: 0, gitStatus: null, stats, statsViewMode: "all-time" },
    );
    expect(result.kind).toBe("stats");
    if (result.kind === "stats") {
      expect(result.stats.total).toBe(5);
      expect(result.statsViewMode).toBe("all-time");
    }
  });

  test("returns stats with statsViewMode session", () => {
    const stats: SessionStats = {
      total: 2, active: 1, successes: 1, failures: 1, reDispatches: 0,
      successRate: 50, uptimeMs: 60000, cumulativeMs: 90000,
      isEmpty: false,
      phaseDurations: { plan: 20000, implement: null, validate: null, release: null },
    };
    const result = resolveDetailsContent(
      { kind: "all" },
      { epics: [], activeSessions: 1, gitStatus: null, stats, statsViewMode: "session" },
    );
    expect(result.kind).toBe("stats");
    if (result.kind === "stats") {
      expect(result.stats.total).toBe(2);
      expect(result.statsViewMode).toBe("session");
    }
  });
});
```

Add to `cli/src/__tests__/details-panel-stats-rendering.test.ts`:

```typescript
  test("renders statsViewMode label", () => {
    expect(source).toContain("statsViewMode");
  });

  test("renders all-time label text", () => {
    // The component should render "all-time" or "session" as a visible label
    expect(source).toMatch(/all-time|ALL-TIME/);
  });
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/details-panel.test.ts src/__tests__/details-panel-stats-rendering.test.ts`
Expected: FAIL — `statsViewMode` not in types

- [x] **Step 3: Update details-panel.ts**

In `cli/src/dashboard/details-panel.ts`:

1. Import `StatsViewMode` (or define inline):
```typescript
/** Stats view mode for toggle. */
export type StatsViewMode = "all-time" | "session";
```

2. Add `statsViewMode` to `DetailsContentContext`:
```typescript
export interface DetailsContentContext {
  epics?: EnrichedEpic[];
  activeSessions?: number;
  gitStatus?: GitStatus | null;
  projectRoot?: string;
  stats?: SessionStats;
  statsViewMode?: StatsViewMode;
}
```

3. Add `statsViewMode` to `StatsContent`:
```typescript
export interface StatsContent {
  kind: "stats";
  stats: SessionStats;
  statsViewMode: StatsViewMode;
}
```

4. Update the resolver to pass through `statsViewMode`:
```typescript
  if (selection.kind === "all") {
    if (ctx.stats) {
      return { kind: "stats", stats: ctx.stats, statsViewMode: ctx.statsViewMode ?? "all-time" };
    }
    // ... existing overview logic
  }
```

- [x] **Step 4: Update DetailsPanel.tsx**

In `cli/src/dashboard/DetailsPanel.tsx`:

1. Add `statsViewMode` to `DetailsPanelProps`:
```typescript
import type { StatsViewMode } from "./details-panel.js";

export interface DetailsPanelProps {
  selection: DetailsPanelSelection;
  projectRoot?: string;
  epics: EnrichedEpic[];
  activeSessions: number;
  gitStatus: GitStatus | null;
  scrollOffset: number;
  visibleHeight: number;
  stats?: SessionStats;
  statsViewMode?: StatsViewMode;
}
```

2. Accept `statsViewMode` in the component destructuring and pass to resolver:
```typescript
export default function DetailsPanel({
  selection,
  projectRoot,
  epics,
  activeSessions,
  gitStatus,
  scrollOffset,
  visibleHeight,
  stats,
  statsViewMode,
}: DetailsPanelProps) {
  const result = resolveDetailsContent(selection, {
    epics,
    activeSessions,
    gitStatus,
    projectRoot,
    stats,
    statsViewMode,
  });
```

3. Add a view mode label in the stats rendering block (inside `result.kind === "stats"`), after the empty check and before the first `<Text bold>` Sessions header:
```typescript
  if (result.kind === "stats") {
    if (result.stats.isEmpty) {
      return (
        <Box flexDirection="column" overflowY="hidden">
          <Text color={CHROME.muted}>waiting for sessions...</Text>
        </Box>
      );
    }

    const s = result.stats;
    const modeLabel = result.statsViewMode === "session" ? "session" : "all-time";
    const PHASES = ["plan", "implement", "validate", "release"] as const;

    return (
      <Box flexDirection="column" overflowY="hidden">
        <Text dimColor>[{modeLabel}]</Text>

        <Text bold>Sessions</Text>
        {/* ... rest unchanged ... */}
```

- [x] **Step 5: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/details-panel.test.ts src/__tests__/details-panel-stats-rendering.test.ts`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add cli/src/dashboard/details-panel.ts cli/src/dashboard/DetailsPanel.tsx cli/src/__tests__/details-panel.test.ts cli/src/__tests__/details-panel-stats-rendering.test.ts
git commit -m "feat(stats-view-toggle): add statsViewMode to DetailsPanel and resolver"
```

---

## Task 5: Wire toggle into App.tsx

**Wave:** 3
**Depends on:** Task 1, Task 2, Task 3, Task 4

**Files:**
- Modify: `cli/src/dashboard/App.tsx`

- [x] **Step 1: Write the failing test**

Create `cli/src/__tests__/stats-view-toggle-app-wiring.test.ts`:

```typescript
import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = readFileSync(
  resolve(import.meta.dirname, "../dashboard/App.tsx"),
  "utf-8",
);

describe("App.tsx stats view toggle wiring", () => {
  test("imports toSessionStats from stats-persistence", () => {
    expect(SRC).toContain("toSessionStats");
  });

  test("passes statsViewMode to DetailsPanel", () => {
    expect(SRC).toContain("statsViewMode");
  });

  test("passes statsViewMode to getKeyHints", () => {
    // The key hints context should include statsViewMode
    expect(SRC).toContain("statsViewMode: keyboard.statsViewMode");
  });

  test("conditionally selects stats based on view mode", () => {
    // App should use toSessionStats for all-time mode and sessionStats for session mode
    expect(SRC).toContain("toSessionStats");
    expect(SRC).toContain("allTimeStats");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/stats-view-toggle-app-wiring.test.ts`
Expected: FAIL — `toSessionStats` not imported in App.tsx

- [x] **Step 3: Wire the toggle into App.tsx**

In `cli/src/dashboard/App.tsx`:

1. Add `toSessionStats` to the existing stats-persistence import:
```typescript
import { loadStats, saveStats, mergeSessionCompleted, toSessionStats, type PersistedStats } from "./stats-persistence.js";
```

2. Compute the active stats based on keyboard toggle, before the return JSX (after the `keyHintText` computation):
```typescript
  // --- Stats view toggle: select stats source ---
  const activeStats = keyboard.statsViewMode === "session"
    ? sessionStats
    : allTimeStats
      ? toSessionStats(allTimeStats)
      : sessionStats; // fallback to session if no persisted stats loaded yet
```

3. Update the key hints to include `statsViewMode`:
```typescript
  const keyHintText = getKeyHints(keyboard.mode, {
    slug: cancelConfirmingSlug,
    filterInput: keyboard.filterInput,
    verbosity: keyboard.verbosity,
    phaseFilter: keyboard.phaseFilter,
    viewFilter: keyboard.viewFilter,
    statsViewMode: keyboard.statsViewMode,
  });
```

4. Update the DetailsPanel props to pass `activeStats` and `statsViewMode`:
```typescript
      detailsSlot={
        <DetailsPanel
          selection={detailsSelection}
          projectRoot={projectRoot}
          epics={filteredEpics}
          activeSessions={activeSessions.size}
          gitStatus={gitStatus}
          scrollOffset={keyboard.detailsScrollOffset}
          visibleHeight={detailsVisibleLines}
          stats={activeStats}
          statsViewMode={keyboard.statsViewMode}
        />
      }
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/stats-view-toggle-app-wiring.test.ts`
Expected: PASS

- [x] **Step 5: Run full test suite**

Run: `cd cli && bun --bun vitest run`
Expected: All previously passing tests still pass

- [x] **Step 6: Commit**

```bash
git add cli/src/dashboard/App.tsx cli/src/__tests__/stats-view-toggle-app-wiring.test.ts
git commit -m "feat(stats-view-toggle): wire toggle into App component"
```
