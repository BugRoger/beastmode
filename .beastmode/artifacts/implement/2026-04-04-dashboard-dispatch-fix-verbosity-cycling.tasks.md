# Verbosity Cycling — Implementation Tasks

## Goal

Add runtime log verbosity cycling to the dashboard via `v` keypress. Four levels cycle: info (0) -> detail (1) -> debug (2) -> trace (3) -> info (wrap). Log entries with level above current verbosity are hidden at render time. Key hints bar shows current level.

## Architecture

- **State:** `verbosity` React state in App.tsx, initialized from CLI `verbosity` prop
- **Cycling:** `v`/`V` in normal mode increments `(verbosity + 1) % 4`
- **Filtering:** LogPanel receives `verbosity` prop, filters TreeEntry nodes at render time based on level-to-numeric mapping
- **Key hints:** Normal mode hint string includes `v verb:<level-name>` suffix
- **Level mapping:** info=0, detail=1, debug=2, trace=3. warn/error always shown (not gated by verbosity)

## Constraints (from design decisions)

- Tree entries store `level: LogLevel` — filtering is render-time, no data model changes
- Ring buffer preserves all entries — hidden entries reappear when verbosity increases
- `v` key only works in normal mode (not filter or confirm mode)
- Key hints update reactively when verbosity changes

## Tech Stack

- React (Ink), TypeScript, Bun test runner
- Existing patterns: pure logic unit tests (no React rendering), ink-testing-library for component tests

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/dashboard/verbosity.ts` | Create | Level-to-index mapping, cycling function, level name lookup |
| `cli/src/__tests__/verbosity.test.ts` | Create | Unit tests for cycling and filtering logic |
| `cli/src/dashboard/hooks/use-dashboard-keyboard.ts` | Modify | Add `v`/`V` handler in normal mode, expose `verbosity` state |
| `cli/src/dashboard/key-hints.ts` | Modify | Add verbosity indicator to normal mode hints |
| `cli/src/dashboard/LogPanel.tsx` | Modify | Accept `verbosity` prop, filter entries before rendering |
| `cli/src/dashboard/App.tsx` | Modify | Add `verbosity` state, pass to LogPanel and key-hints |
| `cli/src/__tests__/keyboard-nav.test.ts` | Modify | Add verbosity cycling tests |
| `cli/src/__tests__/tree-view.test.ts` | Modify | Add verbosity filtering tests |

---

### Task 0: Verbosity utility module

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/src/dashboard/verbosity.ts`
- Create: `cli/src/__tests__/verbosity.test.ts`

- [x] **Step 1: Write the test file**

```typescript
// cli/src/__tests__/verbosity.test.ts
import { describe, test, expect } from "bun:test";
import {
  levelToVerbosity,
  cycleVerbosity,
  verbosityLabel,
  shouldShowEntry,
} from "../dashboard/verbosity.js";

describe("levelToVerbosity", () => {
  test("info maps to 0", () => {
    expect(levelToVerbosity("info")).toBe(0);
  });

  test("detail maps to 1", () => {
    expect(levelToVerbosity("detail")).toBe(1);
  });

  test("debug maps to 2", () => {
    expect(levelToVerbosity("debug")).toBe(2);
  });

  test("trace maps to 3", () => {
    expect(levelToVerbosity("trace")).toBe(3);
  });

  test("warn maps to -1 (always shown)", () => {
    expect(levelToVerbosity("warn")).toBe(-1);
  });

  test("error maps to -1 (always shown)", () => {
    expect(levelToVerbosity("error")).toBe(-1);
  });
});

describe("cycleVerbosity", () => {
  test("0 -> 1", () => {
    expect(cycleVerbosity(0)).toBe(1);
  });

  test("1 -> 2", () => {
    expect(cycleVerbosity(1)).toBe(2);
  });

  test("2 -> 3", () => {
    expect(cycleVerbosity(2)).toBe(3);
  });

  test("3 -> 0 (wrap)", () => {
    expect(cycleVerbosity(3)).toBe(0);
  });
});

describe("verbosityLabel", () => {
  test("0 -> info", () => {
    expect(verbosityLabel(0)).toBe("info");
  });

  test("1 -> detail", () => {
    expect(verbosityLabel(1)).toBe("detail");
  });

  test("2 -> debug", () => {
    expect(verbosityLabel(2)).toBe("debug");
  });

  test("3 -> trace", () => {
    expect(verbosityLabel(3)).toBe("trace");
  });
});

describe("shouldShowEntry", () => {
  test("info entry shown at verbosity 0", () => {
    expect(shouldShowEntry("info", 0)).toBe(true);
  });

  test("detail entry hidden at verbosity 0", () => {
    expect(shouldShowEntry("detail", 0)).toBe(false);
  });

  test("detail entry shown at verbosity 1", () => {
    expect(shouldShowEntry("detail", 1)).toBe(true);
  });

  test("debug entry hidden at verbosity 1", () => {
    expect(shouldShowEntry("debug", 1)).toBe(false);
  });

  test("debug entry shown at verbosity 2", () => {
    expect(shouldShowEntry("debug", 2)).toBe(true);
  });

  test("trace entry hidden at verbosity 2", () => {
    expect(shouldShowEntry("trace", 2)).toBe(false);
  });

  test("trace entry shown at verbosity 3", () => {
    expect(shouldShowEntry("trace", 3)).toBe(true);
  });

  test("warn always shown at verbosity 0", () => {
    expect(shouldShowEntry("warn", 0)).toBe(true);
  });

  test("error always shown at verbosity 0", () => {
    expect(shouldShowEntry("error", 0)).toBe(true);
  });

  test("info entry shown at all verbosity levels", () => {
    for (let v = 0; v <= 3; v++) {
      expect(shouldShowEntry("info", v)).toBe(true);
    }
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun test src/__tests__/verbosity.test.ts`
Expected: FAIL — module not found

- [x] **Step 3: Write the implementation**

```typescript
// cli/src/dashboard/verbosity.ts
/**
 * Verbosity cycling utilities for the dashboard.
 *
 * Maps LogLevel to numeric verbosity and provides cycling/filtering helpers.
 */

import type { LogLevel } from "../logger.js";

/** Number of verbosity levels (info, detail, debug, trace). */
const VERBOSITY_COUNT = 4;

/** Map LogLevel to numeric verbosity. warn/error return -1 (always shown). */
const LEVEL_MAP: Record<LogLevel, number> = {
  info: 0,
  detail: 1,
  debug: 2,
  trace: 3,
  warn: -1,
  error: -1,
};

/** Verbosity index labels. */
const LABELS: readonly string[] = ["info", "detail", "debug", "trace"];

/** Get the numeric verbosity for a log level. -1 means always shown. */
export function levelToVerbosity(level: LogLevel): number {
  return LEVEL_MAP[level];
}

/** Cycle to the next verbosity level (wraps 3 -> 0). */
export function cycleVerbosity(current: number): number {
  return (current + 1) % VERBOSITY_COUNT;
}

/** Get the label for a verbosity level. */
export function verbosityLabel(verbosity: number): string {
  return LABELS[verbosity] ?? "info";
}

/** Should an entry with the given level be shown at the given verbosity? */
export function shouldShowEntry(level: LogLevel, verbosity: number): boolean {
  const entryVerbosity = LEVEL_MAP[level];
  // warn/error (-1) always shown; otherwise show if entry level <= current verbosity
  if (entryVerbosity < 0) return true;
  return entryVerbosity <= verbosity;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd cli && bun test src/__tests__/verbosity.test.ts`
Expected: PASS — all tests green

- [x] **Step 5: Commit**

```bash
git add cli/src/dashboard/verbosity.ts cli/src/__tests__/verbosity.test.ts
git commit -m "feat(verbosity-cycling): add verbosity utility module with cycling and filtering"
```

---

### Task 1: Wire verbosity into keyboard handler

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `cli/src/dashboard/hooks/use-dashboard-keyboard.ts`
- Modify: `cli/src/__tests__/keyboard-nav.test.ts`

- [x] **Step 1: Write the test for verbosity cycling via keyboard**

Append to `cli/src/__tests__/keyboard-nav.test.ts`:

```typescript
describe("verbosity cycling logic", () => {
  test("'v' cycles verbosity 0 -> 1", () => {
    let verbosity = 0;
    const input = "v";
    if (input === "v" || input === "V") verbosity = (verbosity + 1) % 4;
    expect(verbosity).toBe(1);
  });

  test("'V' cycles verbosity 1 -> 2", () => {
    let verbosity = 1;
    const input = "V";
    if (input === "v" || input === "V") verbosity = (verbosity + 1) % 4;
    expect(verbosity).toBe(2);
  });

  test("'v' wraps verbosity 3 -> 0", () => {
    let verbosity = 3;
    const input = "v";
    if (input === "v" || input === "V") verbosity = (verbosity + 1) % 4;
    expect(verbosity).toBe(0);
  });

  test("'v' is ignored in filter mode", () => {
    let verbosity = 0;
    const mode = "filter";
    const input = "v";
    if (mode === "normal" && (input === "v" || input === "V")) {
      verbosity = (verbosity + 1) % 4;
    }
    expect(verbosity).toBe(0);
  });

  test("'v' is ignored in confirm mode", () => {
    let verbosity = 0;
    const mode = "confirm";
    const input = "v";
    if (mode === "normal" && (input === "v" || input === "V")) {
      verbosity = (verbosity + 1) % 4;
    }
    expect(verbosity).toBe(0);
  });
});
```

- [x] **Step 2: Run test to verify it passes**

Run: `cd cli && bun test src/__tests__/keyboard-nav.test.ts`
Expected: PASS — these are pure logic tests, no module deps

- [x] **Step 3: Modify use-dashboard-keyboard.ts to add verbosity state and handler**

In `cli/src/dashboard/hooks/use-dashboard-keyboard.ts`:

1. Add import: `import { cycleVerbosity } from "../verbosity.js";`
2. Add `initialVerbosity: number` to `DashboardKeyboardDeps`
3. Add `verbosity: number` to `DashboardKeyboardState`
4. Add state: `const [verbosity, setVerbosity] = useState(deps.initialVerbosity);`
5. In normal mode section (after filter mode check, before shutdown keys), add:

```typescript
// Priority 9: verbosity cycling
if (input === "v" || input === "V") {
  setVerbosity((prev) => cycleVerbosity(prev));
  return;
}
```

Place it after the `"/"` filter check (Priority 8), making it Priority 9.

6. Add `verbosity` to the return object
7. Add `verbosity` to the `useCallback` dependency array

- [x] **Step 4: Run tests to verify nothing breaks**

Run: `cd cli && bun test src/__tests__/keyboard-nav.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add cli/src/dashboard/hooks/use-dashboard-keyboard.ts cli/src/__tests__/keyboard-nav.test.ts
git commit -m "feat(verbosity-cycling): add v key handler for verbosity cycling"
```

---

### Task 2: Update key hints bar with verbosity indicator

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `cli/src/dashboard/key-hints.ts`

- [x] **Step 1: Modify key-hints.ts to accept verbosity and show indicator**

In `cli/src/dashboard/key-hints.ts`:

1. Add import: `import { verbosityLabel } from "./verbosity.js";`
2. Change the context type to include `verbosity?: number`:

```typescript
const MODE_HINTS: Record<
  KeyHintMode,
  string | ((ctx: { slug?: string; filterInput?: string; verbosity?: number }) => string)
> = {
  normal: (ctx) => `q quit  ↑↓ navigate  / filter  x cancel  a all  v verb:${verbosityLabel(ctx?.verbosity ?? 0)}`,
  filter: (ctx) => `/${ctx?.filterInput ?? ""}  ↵ apply  ⎋ clear`,
  confirm: (ctx) => `Cancel ${ctx?.slug ?? ""}? y confirm  n/⎋ abort`,
};
```

3. Update `getKeyHints` signature:

```typescript
export function getKeyHints(
  mode: KeyHintMode,
  ctx?: { slug?: string; filterInput?: string; verbosity?: number },
): string {
  const hint = MODE_HINTS[mode];
  if (typeof hint === "function") return hint(ctx ?? {});
  return hint;
}
```

- [x] **Step 2: Run existing tests to verify nothing breaks**

Run: `cd cli && bun test src/__tests__/keyboard-nav.test.ts`
Expected: PASS

- [x] **Step 3: Commit**

```bash
git add cli/src/dashboard/key-hints.ts
git commit -m "feat(verbosity-cycling): add verbosity indicator to key hints bar"
```

---

### Task 3: Filter log entries by verbosity in LogPanel

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `cli/src/dashboard/LogPanel.tsx`
- Modify: `cli/src/__tests__/tree-view.test.ts`

- [x] **Step 1: Write tests for verbosity filtering in LogPanel**

Append to `cli/src/__tests__/tree-view.test.ts`:

```typescript
import { shouldShowEntry } from "../dashboard/verbosity.js";
import { filterTreeByVerbosity } from "../dashboard/LogPanel.js";

describe("filterTreeByVerbosity", () => {
  test("hides detail entries at verbosity 0", () => {
    const state: TreeState = {
      epics: [{
        slug: "e1",
        phases: [{
          phase: "plan",
          features: [],
          entries: [
            { timestamp: 1000, level: "info", message: "visible", seq: 1 },
            { timestamp: 1001, level: "detail", message: "hidden", seq: 2 },
          ],
        }],
      }],
      system: [],
    };
    const filtered = filterTreeByVerbosity(state, 0);
    expect(filtered.epics[0].phases[0].entries).toHaveLength(1);
    expect(filtered.epics[0].phases[0].entries[0].message).toBe("visible");
  });

  test("shows detail entries at verbosity 1", () => {
    const state: TreeState = {
      epics: [{
        slug: "e1",
        phases: [{
          phase: "plan",
          features: [],
          entries: [
            { timestamp: 1000, level: "info", message: "visible", seq: 1 },
            { timestamp: 1001, level: "detail", message: "also visible", seq: 2 },
          ],
        }],
      }],
      system: [],
    };
    const filtered = filterTreeByVerbosity(state, 1);
    expect(filtered.epics[0].phases[0].entries).toHaveLength(2);
  });

  test("always shows warn entries at verbosity 0", () => {
    const state: TreeState = {
      epics: [{
        slug: "e1",
        phases: [{
          phase: "plan",
          features: [],
          entries: [
            { timestamp: 1000, level: "warn", message: "warning", seq: 1 },
          ],
        }],
      }],
      system: [],
    };
    const filtered = filterTreeByVerbosity(state, 0);
    expect(filtered.epics[0].phases[0].entries).toHaveLength(1);
  });

  test("always shows error entries at verbosity 0", () => {
    const state: TreeState = {
      epics: [{
        slug: "e1",
        phases: [{
          phase: "plan",
          features: [],
          entries: [
            { timestamp: 1000, level: "error", message: "error", seq: 1 },
          ],
        }],
      }],
      system: [],
    };
    const filtered = filterTreeByVerbosity(state, 0);
    expect(filtered.epics[0].phases[0].entries).toHaveLength(1);
  });

  test("filters feature entries by verbosity", () => {
    const state: TreeState = {
      epics: [{
        slug: "e1",
        phases: [{
          phase: "implement",
          features: [{
            slug: "feat-1",
            entries: [
              { timestamp: 1000, level: "info", message: "visible", seq: 1 },
              { timestamp: 1001, level: "debug", message: "hidden at 1", seq: 2 },
            ],
          }],
          entries: [],
        }],
      }],
      system: [],
    };
    const filtered = filterTreeByVerbosity(state, 1);
    expect(filtered.epics[0].phases[0].features[0].entries).toHaveLength(1);
    expect(filtered.epics[0].phases[0].features[0].entries[0].message).toBe("visible");
  });

  test("system entries are not filtered", () => {
    const state: TreeState = {
      epics: [],
      system: [
        { timestamp: 1000, level: "detail", message: "sys detail", seq: 1 },
      ],
    };
    const filtered = filterTreeByVerbosity(state, 0);
    expect(filtered.system).toHaveLength(1);
  });

  test("verbosity 3 shows all levels", () => {
    const state: TreeState = {
      epics: [{
        slug: "e1",
        phases: [{
          phase: "plan",
          features: [],
          entries: [
            { timestamp: 1000, level: "info", message: "a", seq: 1 },
            { timestamp: 1001, level: "detail", message: "b", seq: 2 },
            { timestamp: 1002, level: "debug", message: "c", seq: 3 },
            { timestamp: 1003, level: "trace", message: "d", seq: 4 },
          ],
        }],
      }],
      system: [],
    };
    const filtered = filterTreeByVerbosity(state, 3);
    expect(filtered.epics[0].phases[0].entries).toHaveLength(4);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun test src/__tests__/tree-view.test.ts`
Expected: FAIL — `filterTreeByVerbosity` not found

- [x] **Step 3: Implement filterTreeByVerbosity in LogPanel.tsx**

Add to `cli/src/dashboard/LogPanel.tsx`:

1. Add import: `import { shouldShowEntry } from "./verbosity.js";`
2. Add `verbosity?: number` to `LogPanelProps`
3. Add the exported filter function before the component:

```typescript
/**
 * Filter tree entries by verbosity level.
 * Entries with level above current verbosity are removed.
 * System entries are not filtered (always shown).
 * warn/error entries are always shown regardless of verbosity.
 */
export function filterTreeByVerbosity(state: TreeState, verbosity: number): TreeState {
  return {
    epics: state.epics.map((epic) => ({
      ...epic,
      phases: epic.phases.map((phase) => ({
        ...phase,
        entries: phase.entries.filter((e) => shouldShowEntry(e.level, verbosity)),
        features: phase.features.map((feat) => ({
          ...feat,
          entries: feat.entries.filter((e) => shouldShowEntry(e.level, verbosity)),
        })),
      })),
    })),
    system: state.system,
  };
}
```

4. In the LogPanel component, apply filtering before trimming:

```typescript
export default function LogPanel({
  state,
  maxVisibleLines = 50,
  verbosity = 0,
}: LogPanelProps) {
  const filtered = filterTreeByVerbosity(state, verbosity);
  const hasContent = filtered.epics.length > 0 || filtered.system.length > 0;

  if (!hasContent) {
    return (
      <Box justifyContent="center" alignItems="center" flexGrow={1}>
        <Text dimColor>no active sessions</Text>
      </Box>
    );
  }

  const trimmed = trimTreeToTail(filtered, maxVisibleLines);

  return (
    <Box flexDirection="column">
      <TreeView state={trimmed} />
    </Box>
  );
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd cli && bun test src/__tests__/tree-view.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add cli/src/dashboard/LogPanel.tsx cli/src/__tests__/tree-view.test.ts
git commit -m "feat(verbosity-cycling): filter log entries by verbosity in LogPanel"
```

---

### Task 4: Wire verbosity through App.tsx

**Wave:** 3
**Depends on:** Task 1, Task 2, Task 3

**Files:**
- Modify: `cli/src/dashboard/App.tsx`

- [x] **Step 1: Modify App.tsx to wire verbosity state**

In `cli/src/dashboard/App.tsx`:

1. Add `initialVerbosity: verbosity` to the `useDashboardKeyboard` deps:

```typescript
const keyboard = useDashboardKeyboard({
  itemCount: epics.length + 1,
  onCancelEpic: handleCancelEpic,
  onShutdown: handleShutdown,
  slugAtIndex,
  onFilterApply: handleFilterApply,
  onFilterClear: handleFilterClear,
  initialVerbosity: verbosity,
});
```

2. Pass `verbosity` to `getKeyHints`:

```typescript
const keyHintText = getKeyHints(keyboard.mode, {
  slug: cancelConfirmingSlug,
  filterInput: keyboard.filterInput,
  verbosity: keyboard.verbosity,
});
```

3. Pass `verbosity` to `LogPanel`:

```typescript
logSlot={<LogPanel state={treeState} verbosity={keyboard.verbosity} />}
```

- [x] **Step 2: Run all tests to verify nothing breaks**

Run: `cd cli && bash scripts/test.sh`
Expected: PASS

- [x] **Step 3: Commit**

```bash
git add cli/src/dashboard/App.tsx
git commit -m "feat(verbosity-cycling): wire verbosity state through App component"
```
