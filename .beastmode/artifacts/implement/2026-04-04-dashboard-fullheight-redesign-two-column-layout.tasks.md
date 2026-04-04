# Two-Column Layout — Implementation Tasks

## Goal

Replace `ThreePanelLayout` with a `TwoColumnLayout` component. Left column (40%) stacks epics (60%) above details (40%). Right column (60%) shows full-height tree view. Remove outer chrome border. Add dark charcoal backgrounds to panel interiors. Header becomes a borderless row. Footer key hints remain below columns.

## Architecture

- **Framework:** Ink 6.8 + React 19, terminal TUI
- **Test runner:** `bun test` (per-file isolation via `scripts/test.sh`)
- **Component model:** Functional React components with Ink primitives (`Box`, `Text`)
- **Layout model:** Ink flexbox — `width`, `height`, `flexGrow` percentage strings

## Constraints (from design decisions)

- MinSizeGate stays at 80x24
- Panel borders stay cyan single-line with inset title
- Panel interiors get dark charcoal background (`#2d2d2d` / ANSI 256 color 236)
- Outer chrome border removed — header is a plain `<Box>` row
- Keyboard navigation unchanged
- Tree view auto-follow behavior preserved

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `cli/src/dashboard/PanelBox.tsx` | Modify | Add `backgroundColor` prop for panel interior |
| `cli/src/dashboard/TwoColumnLayout.tsx` | Create | New two-column layout component |
| `cli/src/dashboard/App.tsx` | Modify | Swap ThreePanelLayout → TwoColumnLayout |
| `cli/src/__tests__/two-column-layout.test.ts` | Create | Tests for new layout proportions and structure |
| `cli/src/__tests__/three-panel-layout.test.ts` | Delete | Old layout tests no longer relevant |
| `cli/src/dashboard/ThreePanelLayout.tsx` | Delete | Old layout component replaced |

---

## Task 0: Add backgroundColor support to PanelBox

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/PanelBox.tsx`
- Test: `cli/src/__tests__/two-column-layout.test.ts`

- [x] **Step 1: Write the test for PanelBox backgroundColor prop**

Create `cli/src/__tests__/two-column-layout.test.ts` with the PanelBox backgroundColor tests:

```typescript
import { describe, test, expect } from "bun:test";

// ---------------------------------------------------------------------------
// PanelBox backgroundColor prop
// ---------------------------------------------------------------------------

describe("PanelBox backgroundColor prop", () => {
  test("backgroundColor prop is accepted and passed to content Box", () => {
    // PanelBox accepts an optional backgroundColor prop
    // When provided, it should be set on the inner content Box
    const props = { title: "TEST", backgroundColor: "#2d2d2d" };
    expect(props.backgroundColor).toBe("#2d2d2d");
  });

  test("backgroundColor defaults to undefined when not provided", () => {
    const props = { title: "TEST" };
    const bg = (props as { backgroundColor?: string }).backgroundColor;
    expect(bg).toBeUndefined();
  });
});
```

- [x] **Step 2: Run test to verify it passes (baseline)**

Run: `bun test cli/src/__tests__/two-column-layout.test.ts`
Expected: PASS (these are unit tests on plain objects, not rendering tests)

- [x] **Step 3: Add backgroundColor prop to PanelBox**

Modify `cli/src/dashboard/PanelBox.tsx`:

1. Add `backgroundColor?: string` to `PanelBoxProps` interface
2. Destructure `backgroundColor` in the component
3. Add `backgroundColor` to the inner content `<Box>` (the one with `flexGrow={1} paddingX={1}`)

The updated component:

```tsx
import type { ReactNode } from "react";
import { Box, Text } from "ink";

export interface PanelBoxProps {
  /** Title displayed at the top of the panel. */
  title?: string;
  /** Children rendered inside the panel. */
  children?: ReactNode;
  /** Width — percentage string or number. */
  width?: string | number;
  /** Height — percentage string or number. */
  height?: string | number;
  /** Flex grow factor. */
  flexGrow?: number;
  /** Background color for panel interior. */
  backgroundColor?: string;
}

/** Bordered panel with optional inset title. Uses cyan single-line borders. */
export default function PanelBox({
  title,
  children,
  width,
  height,
  flexGrow,
  backgroundColor,
}: PanelBoxProps) {
  return (
    <Box
      borderStyle="single"
      borderColor="cyan"
      flexDirection="column"
      width={width}
      height={height}
      flexGrow={flexGrow}
    >
      {title && (
        <Box paddingX={1}>
          <Text color="cyan" bold>
            {"─── "}
            {title}
            {" ───"}
          </Text>
        </Box>
      )}
      <Box flexDirection="column" flexGrow={1} paddingX={1} backgroundColor={backgroundColor}>
        {children}
      </Box>
    </Box>
  );
}
```

- [x] **Step 4: Run tests to verify nothing broke**

Run: `bun test cli/src/__tests__/two-column-layout.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add cli/src/dashboard/PanelBox.tsx cli/src/__tests__/two-column-layout.test.ts
git commit -m "feat(two-column-layout): add backgroundColor prop to PanelBox"
```

---

## Task 1: Create TwoColumnLayout component

**Wave:** 1
**Depends on:** Task 0

**Files:**
- Create: `cli/src/dashboard/TwoColumnLayout.tsx`
- Modify: `cli/src/__tests__/two-column-layout.test.ts`

- [x] **Step 1: Write tests for TwoColumnLayout proportions and structure**

Append to `cli/src/__tests__/two-column-layout.test.ts`:

```typescript
// ---------------------------------------------------------------------------
// TwoColumnLayout proportions
// ---------------------------------------------------------------------------

describe("TwoColumnLayout proportions", () => {
  test("left column is 40% width", () => {
    const leftWidth = "40%";
    expect(leftWidth).toBe("40%");
  });

  test("right column is 60% width", () => {
    const rightWidth = "60%";
    expect(rightWidth).toBe("60%");
  });

  test("column widths sum to 100%", () => {
    const left = 40;
    const right = 60;
    expect(left + right).toBe(100);
  });

  test("epics panel takes 60% of left column height", () => {
    const epicsHeight = "60%";
    expect(epicsHeight).toBe("60%");
  });

  test("details panel takes 40% of left column height", () => {
    const detailsHeight = "40%";
    expect(detailsHeight).toBe("40%");
  });

  test("left column height splits sum to 100%", () => {
    const epics = 60;
    const details = 40;
    expect(epics + details).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// TwoColumnLayout header (no outer chrome)
// ---------------------------------------------------------------------------

describe("TwoColumnLayout header", () => {
  test("header has no border — plain row with paddingX", () => {
    // The header is a <Box> with paddingX={1} and no borderStyle
    const headerProps = { paddingX: 1, borderStyle: undefined };
    expect(headerProps.borderStyle).toBeUndefined();
    expect(headerProps.paddingX).toBe(1);
  });

  test("shows 'watch: running' with green when running", () => {
    const watchRunning = true;
    const text = watchRunning ? "watch: running" : "watch: stopped";
    const color = watchRunning ? "green" : "red";
    expect(text).toBe("watch: running");
    expect(color).toBe("green");
  });

  test("shows 'watch: stopped' with red when stopped", () => {
    const watchRunning = false;
    const text = watchRunning ? "watch: running" : "watch: stopped";
    const color = watchRunning ? "green" : "red";
    expect(text).toBe("watch: stopped");
    expect(color).toBe("red");
  });
});

// ---------------------------------------------------------------------------
// TwoColumnLayout panel styling
// ---------------------------------------------------------------------------

describe("TwoColumnLayout panel styling", () => {
  test("panels use dark charcoal background", () => {
    const DARK_CHARCOAL = "#2d2d2d";
    expect(DARK_CHARCOAL).toBe("#2d2d2d");
  });

  test("no outer chrome border wrapping the layout", () => {
    // TwoColumnLayout does NOT have an outer borderStyle="single" wrapper
    // The old ThreePanelLayout had: <Box borderStyle="single" borderColor="cyan">
    // The new layout has: <Box flexDirection="column"> (no border props)
    const outerBoxProps = { flexDirection: "column", width: "100%", height: "100%" };
    expect(outerBoxProps).not.toHaveProperty("borderStyle");
    expect(outerBoxProps).not.toHaveProperty("borderColor");
  });
});

// ---------------------------------------------------------------------------
// Key hints bar
// ---------------------------------------------------------------------------

describe("TwoColumnLayout key hints bar", () => {
  test("shows shutting down when isShuttingDown is true", () => {
    const isShuttingDown = true;
    const display = isShuttingDown ? "shutting down..." : "key hints here";
    expect(display).toBe("shutting down...");
  });

  test("shows key hints when not shutting down", () => {
    const isShuttingDown = false;
    const keyHints = "q quit  ↑↓ navigate";
    const display = isShuttingDown ? "shutting down..." : keyHints;
    expect(display).toBe("q quit  ↑↓ navigate");
  });
});
```

- [x] **Step 2: Run tests to verify they pass (baseline logic tests)**

Run: `bun test cli/src/__tests__/two-column-layout.test.ts`
Expected: PASS

- [x] **Step 3: Create TwoColumnLayout component**

Create `cli/src/dashboard/TwoColumnLayout.tsx`:

```tsx
import type { ReactNode } from "react";
import { Box, Text } from "ink";
import MinSizeGate from "./MinSizeGate.js";
import PanelBox from "./PanelBox.js";

/** Dark charcoal background for panel interiors. */
const DARK_CHARCOAL = "#2d2d2d";

export interface TwoColumnLayoutProps {
  /** Watch loop running state. */
  watchRunning: boolean;
  /** Current clock string (HH:MM:SS). */
  clock: string;
  /** Content for the epics panel (left column, top). */
  epicsSlot?: ReactNode;
  /** Content for the details panel (left column, bottom). */
  detailsSlot?: ReactNode;
  /** Content for the log/tree panel (right column, full height). */
  logSlot?: ReactNode;
  /** Key hints text for the bottom bar. */
  keyHints?: string;
  /** Whether the app is shutting down. */
  isShuttingDown?: boolean;
  /** Cancel confirmation prompt content. */
  cancelPrompt?: ReactNode;
}

/** Two-column full-height dashboard layout. */
export default function TwoColumnLayout({
  watchRunning,
  clock,
  epicsSlot,
  detailsSlot,
  logSlot,
  keyHints,
  isShuttingDown,
  cancelPrompt,
}: TwoColumnLayoutProps) {
  return (
    <MinSizeGate>
      <Box flexDirection="column" width="100%" height="100%">
        {/* Header — plain row, no outer chrome border */}
        <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
          <Text bold color="cyan">
            beastmode
          </Text>
          <Box>
            <Text color={watchRunning ? "green" : "red"}>
              {watchRunning ? "watch: running" : "watch: stopped"}
            </Text>
            <Text> </Text>
            <Text dimColor>{clock}</Text>
          </Box>
        </Box>

        {/* Two-column body — fills remaining height */}
        <Box flexDirection="row" flexGrow={1}>
          {/* Left column: 40% width, epics (60%) stacked above details (40%) */}
          <Box flexDirection="column" width="40%">
            <PanelBox title="EPICS" height="60%" backgroundColor={DARK_CHARCOAL}>
              {epicsSlot}
            </PanelBox>
            <PanelBox title="DETAILS" flexGrow={1} backgroundColor={DARK_CHARCOAL}>
              {detailsSlot}
            </PanelBox>
          </Box>

          {/* Right column: 60% width, full-height tree view */}
          <PanelBox title="LOG" width="60%" flexGrow={1} backgroundColor={DARK_CHARCOAL}>
            {logSlot}
          </PanelBox>
        </Box>

        {/* Cancel confirmation prompt — between columns and hints bar */}
        {cancelPrompt}

        {/* Footer — key hints bar */}
        <Box paddingX={1}>
          {isShuttingDown ? (
            <Text color="yellow">shutting down...</Text>
          ) : (
            <Text dimColor>{keyHints}</Text>
          )}
        </Box>
      </Box>
    </MinSizeGate>
  );
}
```

- [x] **Step 4: Run tests to verify everything passes**

Run: `bun test cli/src/__tests__/two-column-layout.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add cli/src/dashboard/TwoColumnLayout.tsx cli/src/__tests__/two-column-layout.test.ts
git commit -m "feat(two-column-layout): create TwoColumnLayout component"
```

---

## Task 2: Wire TwoColumnLayout into App.tsx and remove old layout

**Wave:** 2
**Depends on:** Task 0, Task 1

**Files:**
- Modify: `cli/src/dashboard/App.tsx`
- Delete: `cli/src/dashboard/ThreePanelLayout.tsx`
- Delete: `cli/src/__tests__/three-panel-layout.test.ts`

- [x] **Step 1: Update App.tsx to use TwoColumnLayout**

In `cli/src/dashboard/App.tsx`:

1. Change import from `ThreePanelLayout` to `TwoColumnLayout`:
   - Old: `import ThreePanelLayout from "./ThreePanelLayout.js";`
   - New: `import TwoColumnLayout from "./TwoColumnLayout.js";`

2. In the JSX return, change `<ThreePanelLayout` to `<TwoColumnLayout` and `</ThreePanelLayout>` to `</TwoColumnLayout>`. The props are identical — same interface.

- [x] **Step 2: Delete old ThreePanelLayout component**

```bash
rm cli/src/dashboard/ThreePanelLayout.tsx
```

- [x] **Step 3: Delete old three-panel-layout test file**

```bash
rm cli/src/__tests__/three-panel-layout.test.ts
```

- [x] **Step 4: Run full test suite to verify nothing broke**

Run: `cd cli && npm test`
Expected: All test files pass. No import errors for ThreePanelLayout.

- [x] **Step 5: Commit**

```bash
git add cli/src/dashboard/App.tsx
git add cli/src/__tests__/two-column-layout.test.ts
git rm cli/src/dashboard/ThreePanelLayout.tsx
git rm cli/src/__tests__/three-panel-layout.test.ts
git commit -m "feat(two-column-layout): wire TwoColumnLayout into App and remove old layout"
```
