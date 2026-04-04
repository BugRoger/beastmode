# Monokai Palette — Implementation Tasks

## Goal

Centralize all dashboard color definitions into a single Monokai Pro palette module and update all consumers. Eliminate duplicate PHASE_COLOR maps in EpicsPanel, OverviewPanel, tree-format, and status.ts. Apply Monokai Pro hex colors to borders, titles, watch status, clock, and hints.

## Architecture

- Single shared module: `cli/src/dashboard/monokai-palette.ts`
- Exports: `PHASE_COLOR` map, `CHROME` object (borders, titles, watch, hints), `isDim()` helper
- All consumers import from the shared module instead of defining their own colors
- `status.ts` uses ANSI codes — it gets a separate `colorPhase()` that maps to ANSI escape sequences derived from the same palette intent

## Tech Stack

- TypeScript, Ink (React for terminals), chalk
- Testing: bun:test

## File Structure

- **Create:** `cli/src/dashboard/monokai-palette.ts` — centralized Monokai Pro color constants
- **Modify:** `cli/src/dashboard/EpicsPanel.tsx` — import from monokai-palette, remove local PHASE_COLOR and isDim
- **Modify:** `cli/src/dashboard/OverviewPanel.tsx` — import from monokai-palette, remove local PHASE_COLOR
- **Modify:** `cli/src/dashboard/tree-format.ts` — import from monokai-palette, remove local PHASE_COLOR
- **Modify:** `cli/src/dashboard/PanelBox.tsx` — use CHROME.border and CHROME.title hex colors
- **Modify:** `cli/src/dashboard/ThreePanelLayout.tsx` — use CHROME.watchRunning, CHROME.watchStopped, CHROME.muted for clock/hints
- **Modify:** `cli/src/commands/status.ts` — update ANSI color mappings to approximate Monokai Pro
- **Modify:** `cli/src/__tests__/epics-panel.test.ts` — update color assertions to match new hex values
- **Test:** `cli/src/__tests__/monokai-palette.test.ts` — test the shared palette module

---

### Task 1: Create shared Monokai palette module

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/src/dashboard/monokai-palette.ts`
- Create: `cli/src/__tests__/monokai-palette.test.ts`

- [x] **Step 1: Write the failing test**

```typescript
// cli/src/__tests__/monokai-palette.test.ts
import { describe, test, expect } from "bun:test";
import { PHASE_COLOR, CHROME, isDim } from "../dashboard/monokai-palette.js";

describe("monokai-palette", () => {
  test("PHASE_COLOR has all 8 phase/status entries", () => {
    expect(Object.keys(PHASE_COLOR).sort()).toEqual([
      "blocked",
      "cancelled",
      "design",
      "done",
      "implement",
      "plan",
      "release",
      "validate",
    ]);
  });

  test("phase colors match Monokai Pro hex values", () => {
    expect(PHASE_COLOR.design).toBe("#AB9DF2");
    expect(PHASE_COLOR.plan).toBe("#78DCE8");
    expect(PHASE_COLOR.implement).toBe("#FFD866");
    expect(PHASE_COLOR.validate).toBe("#A9DC76");
    expect(PHASE_COLOR.release).toBe("#FC9867");
    expect(PHASE_COLOR.done).toBe("#A9DC76");
    expect(PHASE_COLOR.cancelled).toBe("#FF6188");
    expect(PHASE_COLOR.blocked).toBe("#FF6188");
  });

  test("CHROME has border, title, watchRunning, watchStopped, muted", () => {
    expect(CHROME.border).toBe("#727072");
    expect(CHROME.title).toBe("#78DCE8");
    expect(CHROME.watchRunning).toBe("#A9DC76");
    expect(CHROME.watchStopped).toBe("#FF6188");
    expect(CHROME.muted).toBe("#727072");
  });

  test("isDim returns true for done and cancelled", () => {
    expect(isDim("done")).toBe(true);
    expect(isDim("cancelled")).toBe(true);
  });

  test("isDim returns false for active phases", () => {
    expect(isDim("design")).toBe(false);
    expect(isDim("plan")).toBe(false);
    expect(isDim("implement")).toBe(false);
    expect(isDim("validate")).toBe(false);
    expect(isDim("release")).toBe(false);
    expect(isDim("blocked")).toBe(false);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun test src/__tests__/monokai-palette.test.ts`
Expected: FAIL — module not found

- [x] **Step 3: Write the implementation**

```typescript
// cli/src/dashboard/monokai-palette.ts
/**
 * Centralized Monokai Pro color palette for the dashboard.
 *
 * Single source of truth for all phase colors, chrome colors,
 * and dim-state logic. Consumers import from here.
 */

/** Phase-to-hex-color mapping (Monokai Pro accent palette). */
export const PHASE_COLOR: Record<string, string> = {
  design: "#AB9DF2",
  plan: "#78DCE8",
  implement: "#FFD866",
  validate: "#A9DC76",
  release: "#FC9867",
  done: "#A9DC76",
  cancelled: "#FF6188",
  blocked: "#FF6188",
};

/** Chrome colors for borders, titles, status indicators, and muted text. */
export const CHROME = {
  border: "#727072",
  title: "#78DCE8",
  watchRunning: "#A9DC76",
  watchStopped: "#FF6188",
  muted: "#727072",
} as const;

/** Returns true for phases that should render dimmed. */
export function isDim(phase: string): boolean {
  return phase === "done" || phase === "cancelled";
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd cli && bun test src/__tests__/monokai-palette.test.ts`
Expected: PASS — all assertions match

- [x] **Step 5: Commit**

```bash
git add cli/src/dashboard/monokai-palette.ts cli/src/__tests__/monokai-palette.test.ts
git commit -m "feat(monokai-palette): add centralized Monokai Pro color module"
```

---

### Task 2: Update EpicsPanel to use shared palette

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/dashboard/EpicsPanel.tsx`

- [x] **Step 1: Replace local PHASE_COLOR and isDim with imports**

In `cli/src/dashboard/EpicsPanel.tsx`:

1. Add import: `import { PHASE_COLOR, isDim } from "./monokai-palette.js";`
2. Remove the local `PHASE_COLOR` constant (lines 9-17)
3. Remove the local `isDim` function (lines 19-21)

The rest of the file stays the same — it already references `PHASE_COLOR[phase]` and `isDim(phase)`.

- [x] **Step 2: Run tests to verify nothing breaks**

Run: `cd cli && bun test src/__tests__/epics-panel.test.ts`
Expected: PASS (test file has its own local PHASE_COLOR for assertions — will be updated in Task 6)

- [x] **Step 3: Commit**

```bash
git add cli/src/dashboard/EpicsPanel.tsx
git commit -m "refactor(monokai-palette): EpicsPanel imports shared palette"
```

---

### Task 3: Update OverviewPanel to use shared palette

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/dashboard/OverviewPanel.tsx`

- [x] **Step 1: Replace local PHASE_COLOR with import**

In `cli/src/dashboard/OverviewPanel.tsx`:

1. Add import: `import { PHASE_COLOR } from "./monokai-palette.js";`
2. Remove the local `PHASE_COLOR` constant (lines 10-18)

- [x] **Step 2: Run tests to verify nothing breaks**

Run: `cd cli && bun test`
Expected: No new failures

- [x] **Step 3: Commit**

```bash
git add cli/src/dashboard/OverviewPanel.tsx
git commit -m "refactor(monokai-palette): OverviewPanel imports shared palette"
```

---

### Task 4: Update tree-format to use shared palette

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/dashboard/tree-format.ts`

- [x] **Step 1: Replace local PHASE_COLOR with import**

In `cli/src/dashboard/tree-format.ts`:

1. Add import: `import { PHASE_COLOR } from "./monokai-palette.js";`
2. Remove the local `PHASE_COLOR` constant (lines 21-29)

The `colorPrefix` and `formatTreeLine` functions already use `PHASE_COLOR[phase]` as a key to look up colors. Since the values are now hex strings instead of named colors, and they're passed to `(chalk as any)[color](...)`, we need to switch to `chalk.hex(color)(...)`:

3. Update `colorPrefix` function:
```typescript
function colorPrefix(prefix: string, phase: string | undefined): string {
  if (!prefix || !phase) return prefix;
  const color = PHASE_COLOR[phase];
  if (!color) return prefix;
  return chalk.hex(color)(prefix);
}
```

4. Update `formatTreeLine` phase label rendering (line 105):
```typescript
    const label = color ? chalk.hex(color)(message) : message;
```

- [x] **Step 2: Run tests to verify nothing breaks**

Run: `cd cli && bun test`
Expected: No new failures

- [x] **Step 3: Commit**

```bash
git add cli/src/dashboard/tree-format.ts
git commit -m "refactor(monokai-palette): tree-format imports shared palette with hex colors"
```

---

### Task 5: Update PanelBox and ThreePanelLayout chrome colors

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/dashboard/PanelBox.tsx`
- Modify: `cli/src/dashboard/ThreePanelLayout.tsx`

- [x] **Step 1: Update PanelBox border and title colors**

In `cli/src/dashboard/PanelBox.tsx`:

1. Add import: `import { CHROME } from "./monokai-palette.js";`
2. Change line 34 from `<Text color="cyan">` to `<Text color={CHROME.title}>`
3. Change line 43 from `borderColor="cyan"` to `borderColor={CHROME.border}`

- [x] **Step 2: Update ThreePanelLayout watch status, clock, and hints**

In `cli/src/dashboard/ThreePanelLayout.tsx`:

1. Add import: `import { CHROME } from "./monokai-palette.js";`
2. Change line 46 from `borderColor="cyan"` to `borderColor={CHROME.border}`
3. Change line 55 from `<Text color={watchRunning ? "green" : "red"}>` to `<Text color={watchRunning ? CHROME.watchRunning : CHROME.watchStopped}>`
4. Change line 59 from `<Text dimColor>{clock}</Text>` to `<Text color={CHROME.muted}>{clock}</Text>`
5. Change line 88 from `<Text dimColor>{keyHints}</Text>` to `<Text color={CHROME.muted}>{keyHints}</Text>`

- [x] **Step 3: Run tests to verify nothing breaks**

Run: `cd cli && bun test`
Expected: No new failures

- [x] **Step 4: Commit**

```bash
git add cli/src/dashboard/PanelBox.tsx cli/src/dashboard/ThreePanelLayout.tsx
git commit -m "refactor(monokai-palette): PanelBox and ThreePanelLayout use Monokai chrome colors"
```

---

### Task 6: Update tests to match new Monokai hex values

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Modify: `cli/src/__tests__/epics-panel.test.ts`

- [x] **Step 1: Update PHASE_COLOR assertions in epics-panel.test.ts**

In `cli/src/__tests__/epics-panel.test.ts`:

1. Import the shared palette at top: `import { PHASE_COLOR, isDim } from "../dashboard/monokai-palette.js";`

2. In "phase colors match design spec" test (lines 31-48): Replace the local `PHASE_COLOR` constant and assertions:
```typescript
  test("phase colors match Monokai Pro spec", () => {
    expect(PHASE_COLOR.design).toBe("#AB9DF2");
    expect(PHASE_COLOR.plan).toBe("#78DCE8");
    expect(PHASE_COLOR.implement).toBe("#FFD866");
    expect(PHASE_COLOR.validate).toBe("#A9DC76");
    expect(PHASE_COLOR.release).toBe("#FC9867");
    expect(PHASE_COLOR.done).toBe("#A9DC76");
    expect(PHASE_COLOR.cancelled).toBe("#FF6188");
  });
```

3. In "dim logic" test (lines 51-57): Use the imported `isDim` instead of a local one:
```typescript
  test("done phase is dimmed", () => {
    expect(isDim("done")).toBe(true);
    expect(isDim("cancelled")).toBe(true);
    expect(isDim("implement")).toBe(false);
    expect(isDim("design")).toBe(false);
  });
```

4. In "epic row icon selection" describe block (lines 100-198): Remove the local `PHASE_COLOR` and `isDim` definitions, replace `getEpicIcon` with the import from EpicsPanel, and update all color value assertions:
   - Replace `expect(icon.color).toBe("yellow")` with `expect(icon.color).toBe("#FFD866")` (line 168)
   - Replace `expect(icon.color).toBe("magenta")` with `expect(icon.color).toBe("#AB9DF2")` (line 174)
   - Update "phase badge uses correct color" assertions (lines 191-197):
     ```typescript
     expect(PHASE_COLOR["implement"]).toBe("#FFD866");
     expect(PHASE_COLOR["validate"]).toBe("#A9DC76");
     expect(PHASE_COLOR["release"]).toBe("#FC9867");
     expect(PHASE_COLOR["design"]).toBe("#AB9DF2");
     expect(PHASE_COLOR["plan"]).toBe("#78DCE8");
     expect(PHASE_COLOR["done"]).toBe("#A9DC76");
     expect(PHASE_COLOR["cancelled"]).toBe("#FF6188");
     ```

- [x] **Step 2: Run tests to verify all pass**

Run: `cd cli && bun test src/__tests__/epics-panel.test.ts`
Expected: PASS

- [x] **Step 3: Commit**

```bash
git add cli/src/__tests__/epics-panel.test.ts
git commit -m "test(monokai-palette): update epics-panel tests for Monokai hex values"
```

---

### Task 7: Update status.ts color mapping

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/commands/status.ts`

- [x] **Step 1: Update colorPhase to use 24-bit ANSI from Monokai hex**

In `cli/src/commands/status.ts`, the `colorPhase` function (lines 238-249) and the `renderWatchIndicator` function (lines 228-231) use ANSI escape codes. Update them to use 24-bit true-color ANSI sequences that match the Monokai Pro palette.

Add a helper function after the existing ANSI block:

```typescript
/** Generate 24-bit true-color ANSI escape sequence from hex color. */
function hexAnsi(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}
```

Update `colorPhase`:
```typescript
function colorPhase(phase: string): string {
  switch (phase) {
    case "design": return color(phase, hexAnsi("#AB9DF2"));
    case "plan": return color(phase, hexAnsi("#78DCE8"));
    case "implement": return color(phase, hexAnsi("#FFD866"));
    case "validate": return color(phase, hexAnsi("#A9DC76"));
    case "release": return color(phase, hexAnsi("#FC9867"));
    case "done": return color(phase, hexAnsi("#A9DC76"), ANSI.dim);
    case "cancelled": return color(phase, hexAnsi("#FF6188"), ANSI.dim);
    default: return phase;
  }
}
```

Update `renderWatchIndicator`:
```typescript
export function renderWatchIndicator(running: boolean): string {
  return running
    ? color("watch: running", hexAnsi("#A9DC76"))
    : color("watch: stopped", ANSI.dim);
}
```

- [x] **Step 2: Run tests to verify no new failures**

Run: `cd cli && bun test`
Expected: No new test failures (status.test.ts tests may need updating if they assert exact ANSI codes)

- [x] **Step 3: Commit**

```bash
git add cli/src/commands/status.ts
git commit -m "refactor(monokai-palette): status.ts uses Monokai Pro 24-bit ANSI colors"
```
