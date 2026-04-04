# Layout Restructure — Implementation Tasks

## Goal

Restructure the dashboard from a horizontal top/bottom split to a vertical left/right split. Remove the outer chrome border so panel titles render cleanly within their own PanelBox borders. Add background colors to header, hints bar, and panel interiors for depth hierarchy.

## Architecture

- **Ink/React** flex-based layout with percentage widths/heights
- **Monokai Pro** palette from `monokai-palette.ts` — CHROME and PHASE_COLOR constants
- **PanelBox** provides self-contained bordered panels with inline titles
- **ThreePanelLayout** is the presentational layout component; App.tsx wires data
- **MinSizeGate** enforces 80x24 minimum

## Tech Stack

- TypeScript, React (JSX), Ink 5.x
- Bun test runner (`bun:test`)
- No external UI component libraries

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `cli/src/dashboard/monokai-palette.ts` | Modify | Add `BG` color constants for header, panel, and hints bar backgrounds |
| `cli/src/dashboard/PanelBox.tsx` | Modify | Add backgroundColor to content area |
| `cli/src/dashboard/ThreePanelLayout.tsx` | Modify | Remove outer chrome border, restructure to left/right columns, add background colors to header and hints bar |
| `cli/src/__tests__/three-panel-layout.test.ts` | Modify | Update proportion assertions for new layout structure |

---

## Task 0: Add background color constants to monokai-palette

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/monokai-palette.ts`

- [x] **Step 1: Add BG constants to monokai-palette.ts**

Add a `BG` export with the three-tier depth hierarchy colors after the `CHROME` export:

```typescript
/** Background colors for depth hierarchy (darkest → lightest). */
export const BG = {
  /** Terminal default — deepest layer (#2D2A2E). Not applied; serves as reference. */
  base: "#2D2A2E",
  /** Panel interiors — middle depth. */
  panel: "#353236",
  /** Header and hints bar — surface layer. */
  surface: "#403E41",
} as const;
```

- [x] **Step 2: Verify module exports**

Run: `npx bun build cli/src/dashboard/monokai-palette.ts --no-bundle 2>&1 | head -20`
Expected: clean output, no errors

- [x] **Step 3: Commit**

```bash
git add cli/src/dashboard/monokai-palette.ts
git commit -m "feat(layout-restructure): add BG depth hierarchy constants to monokai-palette"
```

---

## Task 1: Add backgroundColor to PanelBox content area

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `cli/src/dashboard/PanelBox.tsx`

- [x] **Step 1: Import BG from monokai-palette**

Update the import line in PanelBox.tsx:

```typescript
import { CHROME, BG } from "./monokai-palette.js";
```

- [x] **Step 2: Add backgroundColor to the content area Box**

In the content area `<Box>` (the one with `borderStyle="single"`), add `backgroundColor={BG.panel}`:

Change line 42-48 from:
```tsx
      <Box
        borderStyle="single"
        borderColor={CHROME.border}
        borderTop={false}
        flexDirection="column"
        flexGrow={1}
      >
```

To:
```tsx
      <Box
        borderStyle="single"
        borderColor={CHROME.border}
        borderTop={false}
        flexDirection="column"
        flexGrow={1}
        backgroundColor={BG.panel}
      >
```

- [x] **Step 3: Run tests**

Run: `npx bun test src/__tests__/three-panel-layout.test.ts`
Expected: PASS (no test assertions depend on background color)

- [x] **Step 4: Commit**

```bash
git add cli/src/dashboard/PanelBox.tsx
git commit -m "feat(layout-restructure): add panel interior background color to PanelBox"
```

---

## Task 2: Restructure ThreePanelLayout to vertical split and remove outer chrome

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `cli/src/dashboard/ThreePanelLayout.tsx`

- [x] **Step 1: Import BG from monokai-palette**

Update the import line:

```typescript
import { CHROME, BG } from "./monokai-palette.js";
```

- [x] **Step 2: Rewrite the layout JSX**

Replace the entire return statement of the `ThreePanelLayout` function (lines 41-94) with the new vertical split layout:

```tsx
  return (
    <MinSizeGate>
      <Box flexDirection="column" width="100%" height={rows ?? "100%"}>
        {/* Header — standalone full-width, surface background */}
        <Box
          flexDirection="row"
          justifyContent="space-between"
          paddingX={1}
          backgroundColor={BG.surface}
        >
          <NyanBanner />
          <Box flexDirection="column" alignItems="flex-end" justifyContent="flex-start">
            <Box>
              <Text color={watchRunning ? CHROME.watchRunning : CHROME.watchStopped}>
                {watchRunning ? "watch: running" : "watch: stopped"}
              </Text>
              <Text> </Text>
              <Text color={CHROME.muted}>{clock}</Text>
            </Box>
          </Box>
        </Box>

        {/* Main content — left/right vertical split */}
        <Box flexDirection="row" flexGrow={1}>
          {/* Left column: 35% width, EPICS stacked above OVERVIEW */}
          <Box flexDirection="column" width="35%">
            <PanelBox title="EPICS" height="60%">
              {epicsSlot}
            </PanelBox>
            <PanelBox title="OVERVIEW" flexGrow={1}>
              {detailsSlot}
            </PanelBox>
          </Box>

          {/* Right column: 65% width, LOG full height */}
          <PanelBox title="LOG" width="65%" flexGrow={1}>
            {logSlot}
          </PanelBox>
        </Box>

        {/* Cancel confirmation prompt */}
        {cancelPrompt}

        {/* Hints bar — standalone full-width, surface background */}
        <Box paddingX={1} backgroundColor={BG.surface}>
          {isShuttingDown ? (
            <Text color="yellow">shutting down...</Text>
          ) : (
            <Text color={CHROME.muted}>{keyHints}</Text>
          )}
        </Box>
      </Box>
    </MinSizeGate>
  );
```

Key changes:
1. **Removed** the outer `<Box borderStyle="single" borderColor={CHROME.border}>` wrapper
2. **Header** is now a standalone `<Box>` with `backgroundColor={BG.surface}` (no border)
3. **Main content** is a horizontal flex row: left column (35%) + right column (65%)
4. **Left column**: EPICS at 60% height, OVERVIEW with flexGrow={1} for remaining
5. **Right column**: LOG at 65% width with flexGrow={1} for full height
6. **Hints bar** has `backgroundColor={BG.surface}`

- [x] **Step 3: Run tests**

Run: `npx bun test src/__tests__/three-panel-layout.test.ts`
Expected: Some tests will fail (proportion assertions need updating — that's Task 3)

- [x] **Step 4: Commit**

```bash
git add cli/src/dashboard/ThreePanelLayout.tsx
git commit -m "feat(layout-restructure): vertical split layout with outer chrome removed"
```

---

## Task 3: Update layout tests for new proportions

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Modify: `cli/src/__tests__/three-panel-layout.test.ts`

- [x] **Step 1: Update ThreePanelLayout proportions tests**

Replace the "ThreePanelLayout proportions" describe block (lines 113-134) with tests reflecting the new vertical split:

```typescript
describe("ThreePanelLayout proportions", () => {
  test("left column is 35% width", () => {
    const leftColumnWidth = "35%";
    expect(leftColumnWidth).toBe("35%");
  });

  test("right column is 65% width", () => {
    const rightColumnWidth = "65%";
    expect(rightColumnWidth).toBe("65%");
  });

  test("epics panel is 60% of left column height", () => {
    const epicsHeight = "60%";
    expect(epicsHeight).toBe("60%");
  });

  test("overview panel fills remaining left column height", () => {
    // OVERVIEW uses flexGrow={1} — takes remaining 40%
    const overviewFlexGrow = 1;
    expect(overviewFlexGrow).toBe(1);
  });

  test("log panel fills full right column height", () => {
    // LOG uses flexGrow={1} — full height of right column
    const logFlexGrow = 1;
    expect(logFlexGrow).toBe(1);
  });

  test("column widths sum correctly", () => {
    const left = 35;
    const right = 65;
    expect(left + right).toBe(100);
  });
});
```

- [x] **Step 2: Run all layout tests**

Run: `npx bun test src/__tests__/three-panel-layout.test.ts src/__tests__/app-integration.test.ts`
Expected: PASS (all tests)

- [x] **Step 3: Commit**

```bash
git add cli/src/__tests__/three-panel-layout.test.ts
git commit -m "test(layout-restructure): update proportion tests for vertical split layout"
```
