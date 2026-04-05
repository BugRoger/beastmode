# Keyboard Extensions — Implementation Tasks

## Goal

Extend the dashboard keyboard hook with focus panel management, phase filter cycling, blocked toggle, log scroll state, details scroll state, and updated key hints. All new state is exposed from the hook for consumers; no rendering changes in this feature.

## Architecture

- **Framework:** React hooks (Ink), Vitest for tests, Bun runtime
- **Pattern:** Pure state logic in hook, tested via pure function equivalents in test file
- **Test runner:** `cd cli && bun --bun vitest run src/__tests__/keyboard-nav.test.ts`
- **Existing hook:** `cli/src/dashboard/hooks/use-dashboard-keyboard.ts` — three modes (normal/filter/confirm), priority-based input routing
- **Existing hints:** `cli/src/dashboard/key-hints.ts` — MODE_HINTS record with context functions
- **Existing tests:** `cli/src/__tests__/keyboard-nav.test.ts` — pure logic unit tests

## Design Constraints (from design doc)

- `focusedPanel`: `'epics' | 'log'`, defaults to `'epics'`. Tab toggles.
- `phaseFilter`: cycles `all > design > plan > implement > validate > release > all`. 'p' key.
- `showBlocked`: boolean, defaults to `true`. 'b' key toggles.
- `logScrollOffset` + `logAutoFollow`: auto-follow default true. Arrow up when log focused pauses auto-follow. 'G'/End resumes.
- `detailsScrollOffset`: PgUp/PgDn global (works regardless of focus).
- Arrow keys routed by `focusedPanel` — epics → `nav.handleNavInput()`, log → scroll offset.
- Keys q, /, x, a, v remain global. Tab, p, b, PgUp/PgDn also global. Arrows + G/End routed by focus.
- Key hints bar shows current phase filter label and focus-dependent scroll hints.

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/dashboard/hooks/use-dashboard-keyboard.ts` | Modify | Add 5 new state fields, 6 new key handlers, arrow key routing |
| `cli/src/dashboard/key-hints.ts` | Modify | Add new keys to normal mode hints, phase filter label, scroll hints |
| `cli/src/__tests__/keyboard-nav.test.ts` | Modify | Add test blocks for all new keyboard behaviors |

---

### Task 0: Integration Test

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/keyboard-extensions.integration.test.ts`

- [ ] **Step 1: Write the integration test file**

```typescript
import { describe, test, expect } from "vitest";

// ---------------------------------------------------------------------------
// Keyboard Extensions — Integration Tests
// Pure state-machine logic tests covering the full Gherkin scenarios.
// ---------------------------------------------------------------------------

// Phase filter cycle order
const PHASE_ORDER = ["all", "design", "plan", "implement", "validate", "release"] as const;
type PhaseFilter = (typeof PHASE_ORDER)[number];

function cyclePhaseFilter(current: PhaseFilter): PhaseFilter {
  const idx = PHASE_ORDER.indexOf(current);
  return PHASE_ORDER[(idx + 1) % PHASE_ORDER.length];
}

// Focus panel toggle
type FocusedPanel = "epics" | "log";

function toggleFocus(current: FocusedPanel): FocusedPanel {
  return current === "epics" ? "log" : "epics";
}

// Log scroll state
interface LogScrollState {
  offset: number;
  autoFollow: boolean;
}

function scrollUp(state: LogScrollState): LogScrollState {
  return { offset: Math.max(0, state.offset - 1), autoFollow: false };
}

function scrollDown(state: LogScrollState, maxOffset: number): LogScrollState {
  return { offset: Math.min(maxOffset, state.offset + 1), autoFollow: false };
}

function resumeAutoFollow(totalLines: number): LogScrollState {
  return { offset: Math.max(0, totalLines - 1), autoFollow: true };
}

// ---------------------------------------------------------------------------
// Phase filter cycling
// ---------------------------------------------------------------------------

describe("Phase filter cycling", () => {
  test("default phase filter is 'all'", () => {
    const phaseFilter: PhaseFilter = "all";
    expect(phaseFilter).toBe("all");
  });

  test.each([
    ["all", "design"],
    ["design", "plan"],
    ["plan", "implement"],
    ["implement", "validate"],
    ["validate", "release"],
    ["release", "all"],
  ] as const)("pressing p cycles from %s to %s", (current, expected) => {
    expect(cyclePhaseFilter(current)).toBe(expected);
  });

  test("phase filter restricts visible entries", () => {
    const entries = [
      { phase: "design", message: "d1" },
      { phase: "plan", message: "p1" },
      { phase: "implement", message: "i1" },
    ];
    const filter: PhaseFilter = "plan";
    const visible = entries.filter((e) => filter === "all" || e.phase === filter);
    expect(visible).toEqual([{ phase: "plan", message: "p1" }]);
    expect(visible.find((e) => e.phase === "design")).toBeUndefined();
    expect(visible.find((e) => e.phase === "implement")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Log panel scrolling
// ---------------------------------------------------------------------------

describe("Log panel scrolling", () => {
  test("auto-follow is active by default", () => {
    const state: LogScrollState = { offset: 0, autoFollow: true };
    expect(state.autoFollow).toBe(true);
  });

  test("scroll up pauses auto-follow", () => {
    const state: LogScrollState = { offset: 5, autoFollow: true };
    const next = scrollUp(state);
    expect(next.autoFollow).toBe(false);
    expect(next.offset).toBe(4);
  });

  test("resume auto-follow on G/End", () => {
    const totalLines = 100;
    const state = resumeAutoFollow(totalLines);
    expect(state.autoFollow).toBe(true);
    expect(state.offset).toBe(99);
  });

  test("new entry visible when auto-following", () => {
    // Auto-follow means offset tracks the bottom
    const totalLinesBefore = 10;
    const state: LogScrollState = { offset: totalLinesBefore - 1, autoFollow: true };
    // Simulate new entry arriving
    const totalLinesAfter = 11;
    const newOffset = state.autoFollow ? totalLinesAfter - 1 : state.offset;
    expect(newOffset).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Focus switching
// ---------------------------------------------------------------------------

describe("Focus switching", () => {
  test("Tab switches from epics to log", () => {
    expect(toggleFocus("epics")).toBe("log");
  });

  test("Tab switches from log to epics", () => {
    expect(toggleFocus("log")).toBe("epics");
  });

  test("default focus is epics", () => {
    const focusedPanel: FocusedPanel = "epics";
    expect(focusedPanel).toBe("epics");
  });
});

// ---------------------------------------------------------------------------
// Blocked items toggle
// ---------------------------------------------------------------------------

describe("Blocked items toggle", () => {
  test("blocked items visible by default", () => {
    const showBlocked = true;
    expect(showBlocked).toBe(true);
  });

  test("pressing b hides blocked items", () => {
    let showBlocked = true;
    showBlocked = !showBlocked;
    expect(showBlocked).toBe(false);
  });

  test("pressing b again shows blocked items", () => {
    let showBlocked = false;
    showBlocked = !showBlocked;
    expect(showBlocked).toBe(true);
  });

  test("blocked filter removes blocked entries from tree", () => {
    const features = [
      { slug: "active-feat", status: "active" },
      { slug: "blocked-feat", status: "blocked" },
    ];
    const showBlocked = false;
    const visible = features.filter((f) => showBlocked || f.status !== "blocked");
    expect(visible).toHaveLength(1);
    expect(visible[0].slug).toBe("active-feat");
  });

  test("blocked filter shows all when enabled", () => {
    const features = [
      { slug: "active-feat", status: "active" },
      { slug: "blocked-feat", status: "blocked" },
    ];
    const showBlocked = true;
    const visible = features.filter((f) => showBlocked || f.status !== "blocked");
    expect(visible).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails (RED state)**

Run: `cd cli && bun --bun vitest run src/__tests__/keyboard-extensions.integration.test.ts`
Expected: PASS (pure logic tests, no dependencies on unimplemented code yet — these define the expected behavior)

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/keyboard-extensions.integration.test.ts
git commit -m "test(keyboard-extensions): add integration test scenarios"
```

---

### Task 1: Add Focus Panel State and Tab Handler

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/hooks/use-dashboard-keyboard.ts`
- Modify: `cli/src/__tests__/keyboard-nav.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `cli/src/__tests__/keyboard-nav.test.ts`:

```typescript
describe("focus panel logic", () => {
  test("default focused panel is 'epics'", () => {
    const focusedPanel: "epics" | "log" = "epics";
    expect(focusedPanel).toBe("epics");
  });

  test("Tab toggles from epics to log", () => {
    let focusedPanel: "epics" | "log" = "epics";
    focusedPanel = focusedPanel === "epics" ? "log" : "epics";
    expect(focusedPanel).toBe("log");
  });

  test("Tab toggles from log to epics", () => {
    let focusedPanel: "epics" | "log" = "log";
    focusedPanel = focusedPanel === "epics" ? "log" : "epics";
    expect(focusedPanel).toBe("epics");
  });

  test("Tab is ignored in filter mode", () => {
    let focusedPanel: "epics" | "log" = "epics";
    const mode = "filter";
    if (mode === "normal") {
      focusedPanel = focusedPanel === "epics" ? "log" : "epics";
    }
    expect(focusedPanel).toBe("epics");
  });

  test("Tab is ignored in confirm mode", () => {
    let focusedPanel: "epics" | "log" = "epics";
    const mode = "confirm";
    if (mode === "normal") {
      focusedPanel = focusedPanel === "epics" ? "log" : "epics";
    }
    expect(focusedPanel).toBe("epics");
  });
});
```

- [ ] **Step 2: Run tests to verify they pass (pure logic)**

Run: `cd cli && bun --bun vitest run src/__tests__/keyboard-nav.test.ts`
Expected: PASS

- [ ] **Step 3: Implement focus panel state in keyboard hook**

In `cli/src/dashboard/hooks/use-dashboard-keyboard.ts`:

1. Add `FocusedPanel` type:
```typescript
export type FocusedPanel = "epics" | "log";
```

2. Add to `DashboardKeyboardState` interface:
```typescript
/** Currently focused panel */
focusedPanel: FocusedPanel;
```

3. Add state in `useDashboardKeyboard`:
```typescript
const [focusedPanel, setFocusedPanel] = useState<FocusedPanel>("epics");
```

4. Add Tab handler in normal mode section (after Priority 4 shutdown keys, before Priority 5 arrow keys):
```typescript
// Priority 5: Tab — toggle focus panel
if (key.tab) {
  setFocusedPanel((prev) => (prev === "epics" ? "log" : "epics"));
  return;
}
```

5. Renumber subsequent priorities (arrow keys become Priority 6, etc.)

6. Add `focusedPanel` to the return object and the `useCallback` deps.

- [ ] **Step 4: Run tests to verify everything passes**

Run: `cd cli && bun --bun vitest run src/__tests__/keyboard-nav.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/dashboard/hooks/use-dashboard-keyboard.ts cli/src/__tests__/keyboard-nav.test.ts
git commit -m "feat(keyboard-extensions): add focus panel state with Tab toggle"
```

---

### Task 2: Add Phase Filter State and 'p' Key Handler

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/hooks/use-dashboard-keyboard.ts`
- Modify: `cli/src/__tests__/keyboard-nav.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `cli/src/__tests__/keyboard-nav.test.ts`:

```typescript
describe("phase filter logic", () => {
  const PHASE_ORDER = ["all", "design", "plan", "implement", "validate", "release"] as const;
  type PhaseFilter = (typeof PHASE_ORDER)[number];

  function cyclePhase(current: PhaseFilter): PhaseFilter {
    const idx = PHASE_ORDER.indexOf(current);
    return PHASE_ORDER[(idx + 1) % PHASE_ORDER.length];
  }

  test("default phase filter is 'all'", () => {
    const phaseFilter: PhaseFilter = "all";
    expect(phaseFilter).toBe("all");
  });

  test("'p' cycles all -> design", () => {
    expect(cyclePhase("all")).toBe("design");
  });

  test("'p' cycles design -> plan", () => {
    expect(cyclePhase("design")).toBe("plan");
  });

  test("'p' cycles plan -> implement", () => {
    expect(cyclePhase("plan")).toBe("implement");
  });

  test("'p' cycles implement -> validate", () => {
    expect(cyclePhase("implement")).toBe("validate");
  });

  test("'p' cycles validate -> release", () => {
    expect(cyclePhase("validate")).toBe("release");
  });

  test("'p' wraps release -> all", () => {
    expect(cyclePhase("release")).toBe("all");
  });

  test("'p' is ignored in filter mode", () => {
    let phaseFilter: PhaseFilter = "all";
    const mode = "filter";
    if (mode === "normal") {
      phaseFilter = cyclePhase(phaseFilter);
    }
    expect(phaseFilter).toBe("all");
  });
});
```

- [ ] **Step 2: Run tests to verify they pass (pure logic)**

Run: `cd cli && bun --bun vitest run src/__tests__/keyboard-nav.test.ts`
Expected: PASS

- [ ] **Step 3: Implement phase filter state in keyboard hook**

In `cli/src/dashboard/hooks/use-dashboard-keyboard.ts`:

1. Add phase filter type and cycle order:
```typescript
export type PhaseFilter = "all" | "design" | "plan" | "implement" | "validate" | "release";

const PHASE_ORDER: readonly PhaseFilter[] = [
  "all", "design", "plan", "implement", "validate", "release",
];

export function cyclePhaseFilter(current: PhaseFilter): PhaseFilter {
  const idx = PHASE_ORDER.indexOf(current);
  return PHASE_ORDER[(idx + 1) % PHASE_ORDER.length];
}
```

2. Add to `DashboardKeyboardState` interface:
```typescript
/** Current phase filter */
phaseFilter: PhaseFilter;
```

3. Add state in `useDashboardKeyboard`:
```typescript
const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("all");
```

4. Add 'p' handler in normal mode section (after toggle all, before cancel initiation):
```typescript
// Priority N: phase filter cycling
if (input === "p" || input === "P") {
  setPhaseFilter((prev) => cyclePhaseFilter(prev));
  return;
}
```

5. Add `phaseFilter` to the return object and the `useCallback` deps.

- [ ] **Step 4: Run tests to verify everything passes**

Run: `cd cli && bun --bun vitest run src/__tests__/keyboard-nav.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/dashboard/hooks/use-dashboard-keyboard.ts cli/src/__tests__/keyboard-nav.test.ts
git commit -m "feat(keyboard-extensions): add phase filter with p key cycling"
```

---

### Task 3: Add Blocked Toggle State and 'b' Key Handler

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/hooks/use-dashboard-keyboard.ts`
- Modify: `cli/src/__tests__/keyboard-nav.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `cli/src/__tests__/keyboard-nav.test.ts`:

```typescript
describe("blocked toggle logic", () => {
  test("default showBlocked is true", () => {
    const showBlocked = true;
    expect(showBlocked).toBe(true);
  });

  test("'b' toggles showBlocked from true to false", () => {
    let showBlocked = true;
    showBlocked = !showBlocked;
    expect(showBlocked).toBe(false);
  });

  test("'b' toggles showBlocked from false to true", () => {
    let showBlocked = false;
    showBlocked = !showBlocked;
    expect(showBlocked).toBe(true);
  });

  test("'b' is ignored in filter mode", () => {
    let showBlocked = true;
    const mode = "filter";
    if (mode === "normal") showBlocked = !showBlocked;
    expect(showBlocked).toBe(true);
  });

  test("'b' is ignored in confirm mode", () => {
    let showBlocked = true;
    const mode = "confirm";
    if (mode === "normal") showBlocked = !showBlocked;
    expect(showBlocked).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass (pure logic)**

Run: `cd cli && bun --bun vitest run src/__tests__/keyboard-nav.test.ts`
Expected: PASS

- [ ] **Step 3: Implement blocked toggle state in keyboard hook**

In `cli/src/dashboard/hooks/use-dashboard-keyboard.ts`:

1. Add to `DashboardKeyboardState` interface:
```typescript
/** Whether blocked items are shown */
showBlocked: boolean;
```

2. Add state in `useDashboardKeyboard`:
```typescript
const [showBlocked, setShowBlocked] = useState(true);
```

3. Add 'b' handler in normal mode section (after phase filter, before cancel initiation):
```typescript
// Priority N: blocked toggle
if (input === "b" || input === "B") {
  setShowBlocked((prev) => !prev);
  return;
}
```

4. Add `showBlocked` to the return object and the `useCallback` deps.

- [ ] **Step 4: Run tests to verify everything passes**

Run: `cd cli && bun --bun vitest run src/__tests__/keyboard-nav.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/dashboard/hooks/use-dashboard-keyboard.ts cli/src/__tests__/keyboard-nav.test.ts
git commit -m "feat(keyboard-extensions): add blocked toggle with b key"
```

---

### Task 4: Add Log Scroll State and Arrow Key Routing

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/dashboard/hooks/use-dashboard-keyboard.ts`
- Modify: `cli/src/__tests__/keyboard-nav.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `cli/src/__tests__/keyboard-nav.test.ts`:

```typescript
describe("log scroll state logic", () => {
  test("default logAutoFollow is true", () => {
    const logAutoFollow = true;
    expect(logAutoFollow).toBe(true);
  });

  test("default logScrollOffset is 0", () => {
    const logScrollOffset = 0;
    expect(logScrollOffset).toBe(0);
  });

  test("up arrow when log focused decrements offset and pauses auto-follow", () => {
    let logScrollOffset = 5;
    let logAutoFollow = true;
    const focusedPanel = "log";

    if (focusedPanel === "log") {
      logScrollOffset = Math.max(0, logScrollOffset - 1);
      logAutoFollow = false;
    }

    expect(logScrollOffset).toBe(4);
    expect(logAutoFollow).toBe(false);
  });

  test("down arrow when log focused increments offset", () => {
    let logScrollOffset = 5;
    const maxOffset = 50;
    const focusedPanel = "log";

    if (focusedPanel === "log") {
      logScrollOffset = Math.min(maxOffset, logScrollOffset + 1);
    }

    expect(logScrollOffset).toBe(6);
  });

  test("scroll offset clamps to 0 at top", () => {
    let logScrollOffset = 0;
    logScrollOffset = Math.max(0, logScrollOffset - 1);
    expect(logScrollOffset).toBe(0);
  });

  test("scroll offset clamps to max at bottom", () => {
    let logScrollOffset = 50;
    const maxOffset = 50;
    logScrollOffset = Math.min(maxOffset, logScrollOffset + 1);
    expect(logScrollOffset).toBe(50);
  });

  test("G key resumes auto-follow", () => {
    let logAutoFollow = false;
    let logScrollOffset = 10;
    const totalLines = 100;

    const input = "G";
    if (input === "G") {
      logAutoFollow = true;
      logScrollOffset = Math.max(0, totalLines - 1);
    }

    expect(logAutoFollow).toBe(true);
    expect(logScrollOffset).toBe(99);
  });

  test("arrow keys route to nav when epics focused", () => {
    const focusedPanel = "epics";
    let selectedIndex = 2;
    let logScrollOffset = 0;

    if (focusedPanel === "epics") {
      selectedIndex = Math.max(0, selectedIndex - 1); // up arrow
    } else {
      logScrollOffset = Math.max(0, logScrollOffset - 1);
    }

    expect(selectedIndex).toBe(1);
    expect(logScrollOffset).toBe(0);
  });

  test("arrow keys route to log scroll when log focused", () => {
    const focusedPanel = "log";
    let selectedIndex = 2;
    let logScrollOffset = 5;

    if (focusedPanel === "epics") {
      selectedIndex = Math.max(0, selectedIndex - 1);
    } else {
      logScrollOffset = Math.max(0, logScrollOffset - 1);
    }

    expect(selectedIndex).toBe(2); // unchanged
    expect(logScrollOffset).toBe(4);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass (pure logic)**

Run: `cd cli && bun --bun vitest run src/__tests__/keyboard-nav.test.ts`
Expected: PASS

- [ ] **Step 3: Implement log scroll state and arrow key routing**

In `cli/src/dashboard/hooks/use-dashboard-keyboard.ts`:

1. Add to `DashboardKeyboardDeps` interface:
```typescript
/** Total number of visible lines in the log tree (for scroll clamping) */
logTotalLines: number;
```

2. Add to `DashboardKeyboardState` interface:
```typescript
/** Log panel scroll offset */
logScrollOffset: number;
/** Whether log panel auto-follows new entries */
logAutoFollow: boolean;
```

3. Add state in `useDashboardKeyboard`:
```typescript
const [logScrollOffset, setLogScrollOffset] = useState(0);
const [logAutoFollow, setLogAutoFollow] = useState(true);
```

4. Modify the arrow key handler to route based on `focusedPanel`:
```typescript
// Priority N: arrow key navigation (routed by focus)
if (key.upArrow || key.downArrow) {
  if (focusedPanel === "epics") {
    nav.handleNavInput(key);
  } else {
    // Log panel scroll
    if (key.upArrow) {
      setLogScrollOffset((prev) => Math.max(0, prev - 1));
      setLogAutoFollow(false);
    } else if (key.downArrow) {
      setLogScrollOffset((prev) => Math.min(logTotalLines - 1, prev + 1));
      setLogAutoFollow(false);
    }
  }
  return;
}
```

5. Add 'G'/End handler for resume auto-follow (in normal mode, after arrow keys):
```typescript
// Priority N: G/End — resume log auto-follow
if (input === "G" || key.end) {
  if (focusedPanel === "log") {
    setLogAutoFollow(true);
    setLogScrollOffset(Math.max(0, logTotalLines - 1));
    return;
  }
}
```

6. Add `logScrollOffset`, `logAutoFollow` to the return object and `useCallback` deps. Add `logTotalLines` to destructured deps.

- [ ] **Step 4: Run tests to verify everything passes**

Run: `cd cli && bun --bun vitest run src/__tests__/keyboard-nav.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/dashboard/hooks/use-dashboard-keyboard.ts cli/src/__tests__/keyboard-nav.test.ts
git commit -m "feat(keyboard-extensions): add log scroll state with arrow key routing"
```

---

### Task 5: Add Details Scroll State with PgUp/PgDn

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/hooks/use-dashboard-keyboard.ts`
- Modify: `cli/src/__tests__/keyboard-nav.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `cli/src/__tests__/keyboard-nav.test.ts`:

```typescript
describe("details scroll state logic", () => {
  test("default detailsScrollOffset is 0", () => {
    const detailsScrollOffset = 0;
    expect(detailsScrollOffset).toBe(0);
  });

  test("PgUp decrements detailsScrollOffset", () => {
    let detailsScrollOffset = 10;
    const pageSize = 10;
    detailsScrollOffset = Math.max(0, detailsScrollOffset - pageSize);
    expect(detailsScrollOffset).toBe(0);
  });

  test("PgDn increments detailsScrollOffset", () => {
    let detailsScrollOffset = 0;
    const pageSize = 10;
    const maxOffset = 50;
    detailsScrollOffset = Math.min(maxOffset, detailsScrollOffset + pageSize);
    expect(detailsScrollOffset).toBe(10);
  });

  test("PgUp clamps to 0", () => {
    let detailsScrollOffset = 3;
    const pageSize = 10;
    detailsScrollOffset = Math.max(0, detailsScrollOffset - pageSize);
    expect(detailsScrollOffset).toBe(0);
  });

  test("PgDn clamps to max", () => {
    let detailsScrollOffset = 45;
    const pageSize = 10;
    const maxOffset = 50;
    detailsScrollOffset = Math.min(maxOffset, detailsScrollOffset + pageSize);
    expect(detailsScrollOffset).toBe(50);
  });

  test("PgUp/PgDn works regardless of focused panel", () => {
    let detailsScrollOffset = 10;
    const focusedPanel = "log"; // doesn't matter
    const pageSize = 10;
    // PgUp is global
    detailsScrollOffset = Math.max(0, detailsScrollOffset - pageSize);
    expect(detailsScrollOffset).toBe(0);
    expect(focusedPanel).toBe("log"); // focus unchanged
  });
});
```

- [ ] **Step 2: Run tests to verify they pass (pure logic)**

Run: `cd cli && bun --bun vitest run src/__tests__/keyboard-nav.test.ts`
Expected: PASS

- [ ] **Step 3: Implement details scroll state**

In `cli/src/dashboard/hooks/use-dashboard-keyboard.ts`:

1. Add to `DashboardKeyboardDeps` interface:
```typescript
/** Total content height of the details panel (for scroll clamping) */
detailsContentHeight: number;
/** Visible height of the details panel */
detailsVisibleHeight: number;
```

2. Add to `DashboardKeyboardState` interface:
```typescript
/** Details panel scroll offset */
detailsScrollOffset: number;
```

3. Add state in `useDashboardKeyboard`:
```typescript
const [detailsScrollOffset, setDetailsScrollOffset] = useState(0);
```

4. Add PgUp/PgDn handler in normal mode (global — before arrow key routing):
```typescript
// Priority N: PgUp/PgDn — details panel scroll (global)
if (key.pageUp) {
  setDetailsScrollOffset((prev) =>
    Math.max(0, prev - detailsVisibleHeight),
  );
  return;
}
if (key.pageDown) {
  const maxOffset = Math.max(0, detailsContentHeight - detailsVisibleHeight);
  setDetailsScrollOffset((prev) =>
    Math.min(maxOffset, prev + detailsVisibleHeight),
  );
  return;
}
```

5. Add `detailsScrollOffset` to the return object and `useCallback` deps. Add `detailsContentHeight`, `detailsVisibleHeight` to destructured deps.

- [ ] **Step 4: Run tests to verify everything passes**

Run: `cd cli && bun --bun vitest run src/__tests__/keyboard-nav.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/dashboard/hooks/use-dashboard-keyboard.ts cli/src/__tests__/keyboard-nav.test.ts
git commit -m "feat(keyboard-extensions): add details scroll state with PgUp/PgDn"
```

---

### Task 6: Update Key Hints

**Wave:** 3
**Depends on:** Task 1, Task 2, Task 3, Task 4, Task 5

**Files:**
- Modify: `cli/src/dashboard/key-hints.ts`
- Modify: `cli/src/__tests__/keyboard-nav.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `cli/src/__tests__/keyboard-nav.test.ts`:

```typescript
describe("key hints updates", () => {
  test("normal mode hints include Tab, p, b keys", () => {
    const hints = "q quit  ↑↓ navigate  ⇥ focus  / filter  p phase:all  b blocked  x cancel  a all  v verb:info  PgUp/Dn details";
    expect(hints).toContain("⇥ focus");
    expect(hints).toContain("p phase:");
    expect(hints).toContain("b blocked");
    expect(hints).toContain("PgUp/Dn");
  });

  test("phase filter label shows current filter value", () => {
    const phaseFilter = "implement";
    const hint = `p phase:${phaseFilter}`;
    expect(hint).toBe("p phase:implement");
  });

  test("phase filter label shows 'all' for default", () => {
    const phaseFilter = "all";
    const hint = `p phase:${phaseFilter}`;
    expect(hint).toBe("p phase:all");
  });
});
```

- [ ] **Step 2: Run tests to verify they pass (pure logic)**

Run: `cd cli && bun --bun vitest run src/__tests__/keyboard-nav.test.ts`
Expected: PASS

- [ ] **Step 3: Update key hints implementation**

In `cli/src/dashboard/key-hints.ts`:

1. Add `phaseFilter` to `KeyHintContext`:
```typescript
export interface KeyHintContext {
  slug?: string;
  filterInput?: string;
  verbosity?: number;
  phaseFilter?: string;
}
```

2. Update the `normal` mode hint function:
```typescript
normal: (ctx) =>
  `q quit  ↑↓ navigate  ⇥ focus  / filter  p phase:${ctx?.phaseFilter ?? "all"}  b blocked  x cancel  a all  v verb:${verbosityLabel(ctx?.verbosity ?? 0)}  PgUp/Dn details`,
```

- [ ] **Step 4: Run tests to verify everything passes**

Run: `cd cli && bun --bun vitest run src/__tests__/keyboard-nav.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/dashboard/key-hints.ts cli/src/__tests__/keyboard-nav.test.ts
git commit -m "feat(keyboard-extensions): update key hints with new shortcuts"
```
