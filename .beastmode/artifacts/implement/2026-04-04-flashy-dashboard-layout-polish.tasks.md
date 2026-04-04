# Layout Polish — Implementation Tasks

## Goal

Replace PanelBox's separate title line with inline border titles, rename DETAILS → OVERVIEW, and make the dashboard fill the full terminal height dynamically.

## Architecture

- **Inline titles**: Modify `PanelBox` to render the title text embedded in the top border line itself (e.g., `┌─ EPICS ─────────┐`) instead of a separate `<Text>` row inside the box. Ink's `Box` component with `borderStyle="single"` draws borders automatically — we cannot inject text into Ink's border rendering. The solution: disable the top border (`borderTop={false}`) and render a custom top line that includes the title text between border characters.
- **Full terminal height**: Pass `rows` from `useTerminalSize()` to `ThreePanelLayout` as an explicit `height` on the outermost `Box`.
- **Title rename**: Change the `"DETAILS"` string to `"OVERVIEW"` in `ThreePanelLayout.tsx`.
- **No new dependencies**: Skip `@mishieck/ink-titled-box` — implement inline titles directly for zero-dep control and guaranteed Ink v6 compatibility.

## Tech Stack

- Ink v6.8.0, React 19, TypeScript 5.7, Bun runtime

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `cli/src/dashboard/PanelBox.tsx` | Modify | Replace title row with inline border title line |
| `cli/src/dashboard/ThreePanelLayout.tsx` | Modify | Add `rows` prop, set explicit height, rename DETAILS→OVERVIEW |
| `cli/src/dashboard/App.tsx` | Modify | Pass terminal `rows` to ThreePanelLayout |

---

## Task 1: Inline Border Titles in PanelBox

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/PanelBox.tsx`

- [x] **Step 1: Implement inline title rendering**

Replace the current PanelBox implementation. The new approach:
1. Disable the top border on Ink's Box (`borderTop={false}`)
2. Render a custom first line that looks like `┌─ TITLE ──────...─┐`
3. The box's left/right/bottom borders remain Ink-managed

```tsx
import type { ReactNode } from "react";
import { Box, Text } from "ink";

export interface PanelBoxProps {
  /** Title displayed inline in the top border of the panel. */
  title?: string;
  /** Children rendered inside the panel. */
  children?: ReactNode;
  /** Width — percentage string or number. */
  width?: string | number;
  /** Height — percentage string or number. */
  height?: string | number;
  /** Flex grow factor. */
  flexGrow?: number;
}

/** Bordered panel with title embedded in the top border line. Uses cyan single-line borders. */
export default function PanelBox({
  title,
  children,
  width,
  height,
  flexGrow,
}: PanelBoxProps) {
  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      flexGrow={flexGrow}
    >
      {/* Custom top border with inline title */}
      <Box>
        <Text color="cyan">
          {title ? `┌─ ${title} ` : "┌"}
          {"─".repeat(200)}
        </Text>
      </Box>

      {/* Content area with side + bottom borders from Ink */}
      <Box
        borderStyle="single"
        borderColor="cyan"
        borderTop={false}
        flexDirection="column"
        flexGrow={1}
      >
        <Box flexDirection="column" flexGrow={1} paddingX={1}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
```

Note: The `"─".repeat(200)` produces excess characters that get clipped by the terminal width. This is a standard terminal rendering trick — overflow is invisible. The top-left corner `┌` and the title are always visible.

- [x] **Step 2: Verify rendering**

Run: `cd cli && npx tsc --noEmit`
Expected: No type errors

- [x] **Step 3: Commit**

```bash
git add cli/src/dashboard/PanelBox.tsx
git commit -m "feat(layout-polish): inline border titles in PanelBox"
```

---

## Task 2: Full Terminal Height + Title Rename in ThreePanelLayout

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/dashboard/ThreePanelLayout.tsx`

- [x] **Step 1: Add rows prop and rename DETAILS to OVERVIEW**

Update `ThreePanelLayout` to accept a `rows` prop and set it as the explicit `height` on the outermost `Box`. Also rename the DETAILS panel title to OVERVIEW.

```tsx
import type { ReactNode } from "react";
import { Box, Text } from "ink";
import MinSizeGate from "./MinSizeGate.js";
import PanelBox from "./PanelBox.js";

export interface ThreePanelLayoutProps {
  /** Watch loop running state. */
  watchRunning: boolean;
  /** Current clock string (HH:MM:SS). */
  clock: string;
  /** Terminal row count for full-height rendering. */
  rows?: number;
  /** Content for the epics panel (top-left). */
  epicsSlot?: ReactNode;
  /** Content for the details panel (top-right). */
  detailsSlot?: ReactNode;
  /** Content for the log panel (bottom). */
  logSlot?: ReactNode;
  /** Key hints text for the bottom bar. */
  keyHints?: string;
  /** Whether the app is shutting down. */
  isShuttingDown?: boolean;
  /** Cancel confirmation prompt content. */
  cancelPrompt?: ReactNode;
}

/** Three-panel k9s-style dashboard layout. */
export default function ThreePanelLayout({
  watchRunning,
  clock,
  rows,
  epicsSlot,
  detailsSlot,
  logSlot,
  keyHints,
  isShuttingDown,
  cancelPrompt,
}: ThreePanelLayoutProps) {
  return (
    <MinSizeGate>
      <Box flexDirection="column" width="100%" height={rows ?? "100%"}>
        {/* Outer chrome — header line with title, watch status, and clock */}
        <Box
          borderStyle="single"
          borderColor="cyan"
          flexDirection="column"
          flexGrow={1}
        >
          {/* Status bar inside outer chrome */}
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

          {/* Top section: ~35% height, two panels side by side */}
          <Box flexDirection="row" height="35%">
            <PanelBox title="EPICS" width="30%">
              {epicsSlot}
            </PanelBox>
            <PanelBox title="OVERVIEW" width="70%">
              {detailsSlot}
            </PanelBox>
          </Box>

          {/* Bottom section: ~65% height, full-width log panel */}
          <PanelBox title="LOG" flexGrow={1}>
            {logSlot}
          </PanelBox>
        </Box>

        {/* Cancel confirmation prompt — between chrome and hints bar */}
        {cancelPrompt}

        {/* Bottom bar — key hints, outside the bordered area */}
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

- [x] **Step 2: Verify rendering**

Run: `cd cli && npx tsc --noEmit`
Expected: No type errors

- [x] **Step 3: Commit**

```bash
git add cli/src/dashboard/ThreePanelLayout.tsx
git commit -m "feat(layout-polish): full terminal height + OVERVIEW rename"
```

---

## Task 3: Wire Terminal Rows into App

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Modify: `cli/src/dashboard/App.tsx`

- [x] **Step 1: Pass rows to ThreePanelLayout**

Import `useTerminalSize` in App.tsx and pass `rows` to `ThreePanelLayout`.

In App.tsx, add the hook call inside the component:

```tsx
import { useTerminalSize } from "./hooks/use-terminal-size.js";
```

Inside the `App` function body, add after the existing state declarations:

```tsx
const { rows } = useTerminalSize();
```

Update the `ThreePanelLayout` JSX to include the `rows` prop:

```tsx
<ThreePanelLayout
  watchRunning={watchRunning}
  clock={clock}
  rows={rows}
  epicsSlot={...}
  ...
/>
```

- [x] **Step 2: Verify rendering**

Run: `cd cli && npx tsc --noEmit`
Expected: No type errors

- [x] **Step 3: Commit**

```bash
git add cli/src/dashboard/App.tsx
git commit -m "feat(layout-polish): wire terminal rows for fullscreen"
```
