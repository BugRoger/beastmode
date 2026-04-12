# Spinner Shared Module -- Implementation Tasks

## Goal

Create a single shared spinner module (`cli/src/dashboard/spinner.ts`) that becomes the source of truth for all spinner-related constants, hooks, and activation logic. Rewire both `EpicsPanel.tsx` and `TreeView.tsx` to import from it, eliminating duplication. Fix the EpicsPanel spinner guard to use phase-based `isActive(epic.status)` instead of `activeSessions.has(epic.slug)` so design-phase epics show spinners. Replace palindrome frame arrays with forward-only sequences.

## Architecture

- **Shared module**: Pure exports (constants, hook, function) in `cli/src/dashboard/spinner.ts`
- **Consumers**: `EpicsPanel.tsx` and `TreeView.tsx` import from shared module; local definitions removed
- **Test runner**: vitest with Bun runtime (`bun --bun vitest run`)
- **Test location**: `cli/src/__tests__/spinner.test.ts` (matches vitest include pattern `src/__tests__/*.test.ts`)
- **Module system**: ESM with `.js` import extensions in source code

## Tech Stack

- TypeScript (strict, `noUnusedLocals`, `noUnusedParameters`)
- React 19 + Ink 6 (hooks: `useState`, `useEffect`)
- vitest 4.x (import from `"vitest"`, not `bun:test`)

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/dashboard/spinner.ts` | Create | Exports `EPIC_SPINNER`, `FEATURE_SPINNER`, `SPINNER_INTERVAL_MS`, `useSpinnerTick`, `isActive` |
| `cli/src/__tests__/spinner.test.ts` | Create | Unit tests for frame arrays, `isActive`, and `useSpinnerTick` hook |
| `cli/src/dashboard/EpicsPanel.tsx` | Modify (lines 1-24, 50, 83, 97) | Remove local spinner defs, import from shared module, replace `activeSessions.has` guard with `isActive` |
| `cli/src/dashboard/TreeView.tsx` | Modify (lines 12-47) | Remove local spinner defs, import from shared module |

## Wave Isolation

| Wave | Tasks | Files | Parallel-safe | Reason |
|------|-------|-------|---------------|--------|
| 1 | T1, T2 | T1: `cli/src/dashboard/spinner.ts`, `cli/src/__tests__/spinner.test.ts` / T2: (no files -- verification only) | no | T2 depends on T1 |
| 2 | T3, T4 | T3: `cli/src/dashboard/EpicsPanel.tsx` / T4: `cli/src/dashboard/TreeView.tsx` | yes | disjoint files, both import from spinner.ts (read-only), no shared state |
| 3 | T5 | (no files -- verification only) | n/a | single task |

---

### Task 1: Create shared spinner module with tests

**Wave:** 1
**Depends on:** `-`

**Files:**
- Create: `cli/src/dashboard/spinner.ts`
- Create: `cli/src/__tests__/spinner.test.ts`

**Step 1: Write the failing tests**

Create `cli/src/__tests__/spinner.test.ts`:

```typescript
import { describe, test, expect } from "vitest";
import { EPIC_SPINNER, FEATURE_SPINNER, SPINNER_INTERVAL_MS, isActive } from "../dashboard/spinner.js";

// ---------------------------------------------------------------------------
// Frame array correctness
// ---------------------------------------------------------------------------

describe("EPIC_SPINNER", () => {
  test("has exactly 5 frames", () => {
    expect(EPIC_SPINNER).toHaveLength(5);
  });

  test("frames are forward-only (no repeated subsequence / palindrome)", () => {
    // A palindrome array reads the same forwards and backwards.
    // A forward-only array must NOT equal its reverse.
    const reversed = [...EPIC_SPINNER].reverse();
    expect(EPIC_SPINNER).not.toEqual(reversed);
  });

  test("contains the expected Unicode pie characters", () => {
    expect(EPIC_SPINNER).toEqual(["○", "◔", "◑", "◕", "●"]);
  });
});

describe("FEATURE_SPINNER", () => {
  test("has exactly 3 frames", () => {
    expect(FEATURE_SPINNER).toHaveLength(3);
  });

  test("frames are forward-only (no repeated subsequence / palindrome)", () => {
    const reversed = [...FEATURE_SPINNER].reverse();
    expect(FEATURE_SPINNER).not.toEqual(reversed);
  });

  test("contains the expected Unicode fisheye characters", () => {
    expect(FEATURE_SPINNER).toEqual(["◉", "◎", "○"]);
  });
});

describe("SPINNER_INTERVAL_MS", () => {
  test("is 120ms", () => {
    expect(SPINNER_INTERVAL_MS).toBe(120);
  });
});

// ---------------------------------------------------------------------------
// isActive
// ---------------------------------------------------------------------------

describe("isActive", () => {
  test("returns true for all six active statuses", () => {
    const activeStatuses = ["in-progress", "implement", "design", "plan", "validate", "release"];
    for (const status of activeStatuses) {
      expect(isActive(status)).toBe(true);
    }
  });

  test("returns false for terminal/inactive statuses", () => {
    const inactiveStatuses = ["completed", "blocked", "pending", "done", "cancelled"];
    for (const status of inactiveStatuses) {
      expect(isActive(status)).toBe(false);
    }
  });

  test("returns false for unknown status", () => {
    expect(isActive("nonexistent")).toBe(false);
  });
});
```

- [x] **Step 1 complete: test file written**

**Step 2: Run tests to verify they fail**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-spinner-bug-fixes-3459/cli && bun --bun vitest run src/__tests__/spinner.test.ts`

Expected: FAIL -- module `../dashboard/spinner.js` does not exist.

- [x] **Step 2 complete: tests fail as expected**

**Step 3: Write the shared spinner module**

Create `cli/src/dashboard/spinner.ts`:

```typescript
/**
 * Shared spinner module -- single source of truth for spinner frames,
 * tick interval, tick hook, and phase-based activation logic.
 *
 * Consumers: EpicsPanel, TreeView.
 */

import { useState, useEffect } from "react";

/** Forward-only epic spinner frames (5 frames, 600ms full rotation at 120ms tick). */
export const EPIC_SPINNER = ["○", "◔", "◑", "◕", "●"];

/** Forward-only feature spinner frames (3 frames, 360ms full rotation at 120ms tick). */
export const FEATURE_SPINNER = ["◉", "◎", "○"];

/** Tick interval in milliseconds. */
export const SPINNER_INTERVAL_MS = 120;

/**
 * React hook that returns a monotonically incrementing tick counter.
 * Consumers index into frame arrays with `frames[tick % frames.length]`.
 */
export function useSpinnerTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, SPINNER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);
  return tick;
}

/** Returns true for statuses representing active work. */
export function isActive(status: string): boolean {
  return (
    status === "in-progress" ||
    status === "implement" ||
    status === "design" ||
    status === "plan" ||
    status === "validate" ||
    status === "release"
  );
}
```

- [x] **Step 3 complete: spinner.ts written**

**Step 4: Run tests to verify they pass**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-spinner-bug-fixes-3459/cli && bun --bun vitest run src/__tests__/spinner.test.ts`

Expected: All 10 tests PASS.

- [x] **Step 4 complete: all tests pass**

**Step 5: Commit**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-spinner-bug-fixes-3459
git add cli/src/dashboard/spinner.ts cli/src/__tests__/spinner.test.ts
git commit -m "feat(spinner): create shared spinner module with tests"
```

- [x] **Step 5 complete: committed**

---

### Task 2: Verify existing tests pass before rewiring

**Wave:** 1
**Depends on:** Task 1

**Files:**
- (no files created or modified)

This task runs the existing test suite to establish a green baseline before modifying consumer files. If tests fail here, the rewiring tasks should not proceed.

**Step 1: Run full test suite**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-spinner-bug-fixes-3459/cli && bun --bun vitest run`

Expected: All existing tests PASS (including `epics-panel.test.ts` and any TreeView-related tests).

- [x] **Step 1 complete: baseline green**

**Step 2: Run typecheck**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-spinner-bug-fixes-3459/cli && bun x tsc --noEmit`

Expected: No type errors.

- [x] **Step 2 complete: typecheck passes**

---

### Task 3: Rewire EpicsPanel to use shared spinner module

**Wave:** 2
**Depends on:** Task 1, Task 2

**Files:**
- Modify: `cli/src/dashboard/EpicsPanel.tsx:1-24,50,83,97`

**Step 1: Remove local spinner definitions and add shared import**

In `cli/src/dashboard/EpicsPanel.tsx`, replace the import block and local spinner definitions (lines 1-24) with:

```typescript
import { useState, useEffect } from "react";
import { Box, Text } from "ink";
import type { EnrichedEpic } from "../store/index.js";
import { PHASE_COLOR, FEATURE_STATUS_COLOR, CHROME, isDim, isFeatureDim, BADGE_WIDTH } from "./monokai-palette.js";
import { EPIC_SPINNER, FEATURE_SPINNER, useSpinnerTick, isActive } from "./spinner.js";
import type { SelectableRow } from "./epics-tree-model.js";

type InkColor = Parameters<typeof Text>[0]["color"];
```

This removes:
- `const EPIC_SPINNER = [...]` (line 11)
- `const FEATURE_SPINNER = [...]` (line 12)
- `const SPINNER_INTERVAL_MS = 120` (line 13)
- The entire `useSpinnerFrame` function (lines 15-24)
- The `// --- Shared utilities ---` comment (line 9)

Note: `SPINNER_INTERVAL_MS` is not imported because EpicsPanel never references it directly -- the hook uses it internally.

- [x] **Step 1 complete: imports updated, local defs removed**

**Step 2: Replace `useSpinnerFrame()` with `useSpinnerTick()`**

On line 50 (inside the component body), change:

```typescript
  const tick = useSpinnerFrame();
```

to:

```typescript
  const tick = useSpinnerTick();
```

- [x] **Step 2 complete: hook call updated**

**Step 3: Replace `activeSessions.has(epic.slug)` spinner guard with `isActive(epic.status)`**

On line 83, change:

```typescript
      const isActive = activeSessions.has(epic.slug);
```

to:

```typescript
      const active = isActive(epic.status);
```

This is the critical bug fix. The old code used `activeSessions.has(epic.slug)` which only matched epics with running tmux sessions, missing design-phase epics. The new code uses the shared `isActive()` function that checks for all active phase statuses.

Then on line 97, change:

```typescript
            {isActive && !isSelected ? (
```

to:

```typescript
            {active && !isSelected ? (
```

The variable name changes from `isActive` to `active` because `isActive` is now the imported function name.

- [x] **Step 3 complete: spinner guard fixed**

**Step 4: Prefix unused `activeSessions` parameter with underscore**

After removing the `.has()` call, `activeSessions` is no longer referenced in the component body. TypeScript's `noUnusedParameters: true` will flag this as an error. The prop must remain in the `EpicsPanelProps` interface (App.tsx passes it on line 555), but the destructured parameter needs an underscore prefix to suppress the error.

In the component function destructuring (around line 43-49), change:

```typescript
export default function EpicsPanel({
  flatRows,
  activeSessions,
  selectedIndex,
  cancelConfirmingSlug,
  visibleHeight,
}: EpicsPanelProps) {
```

to:

```typescript
export default function EpicsPanel({
  flatRows,
  activeSessions: _activeSessions,
  selectedIndex,
  cancelConfirmingSlug,
  visibleHeight,
}: EpicsPanelProps) {
```

This preserves the prop in the interface, accepts it at callsites, but marks it as intentionally unused in this component's body via the `_` prefix convention.

- [x] **Step 4 complete: unused parameter prefixed**

**Step 5: Run typecheck to verify no unused locals**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-spinner-bug-fixes-3459/cli && bun x tsc --noEmit`

Expected: No type errors. The `tsconfig.json` has `noUnusedLocals: true` and `noUnusedParameters: true` -- if any removed symbol is still referenced, any import is unused, or any parameter is unused without underscore prefix, this will catch it.

- [x] **Step 5 complete: typecheck passes**

**Step 6: Run tests to verify nothing is broken**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-spinner-bug-fixes-3459/cli && bun --bun vitest run`

Expected: All tests PASS (including `epics-panel.test.ts` and `spinner.test.ts`).

- [x] **Step 6 complete: all tests pass**

**Step 7: Commit**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-spinner-bug-fixes-3459
git add cli/src/dashboard/EpicsPanel.tsx
git commit -m "fix(EpicsPanel): use shared spinner module and phase-based activation"
```

- [x] **Step 7 complete: committed**

---

### Task 4: Rewire TreeView to use shared spinner module

**Wave:** 2
**Depends on:** Task 1, Task 2

**Files:**
- Modify: `cli/src/dashboard/TreeView.tsx:12-47`

**Step 1: Remove local spinner definitions and add shared import**

In `cli/src/dashboard/TreeView.tsx`, replace lines 12-17 (the imports and blank line before spinner defs):

Current lines 12-47:
```typescript
import { useState, useEffect } from "react";
import { Box, Text } from "ink";
import type { TreeState, EpicNode, FeatureNode, TreeEntry } from "./tree-types.js";
import { formatTreeLine } from "./tree-format.js";
import { isDim, isFeatureDim, PHASE_COLOR, FEATURE_STATUS_COLOR, CHROME, BADGE_WIDTH } from "./monokai-palette.js";
```
followed by lines 27-47 with local spinner constants and functions.

Replace the entire block from line 1 through line 47 with:

```typescript
/**
 * TreeView — Ink component that renders pipeline hierarchy as a terminal tree.
 *
 * Renders: SYSTEM > Epic > Feature with dot connectors and phase-based coloring.
 * Phase is displayed as a colored badge on each entry line.
 * Blocked/upcoming nodes render dimmed with status badge visible.
 * Active nodes show a spinner indicator.
 *
 * Output is flattened to a line array and sliced to maxLines to prevent overflow.
 */

import { Box, Text } from "ink";
import type { TreeState, EpicNode, FeatureNode, TreeEntry } from "./tree-types.js";
import { formatTreeLine } from "./tree-format.js";
import { isDim, isFeatureDim, PHASE_COLOR, FEATURE_STATUS_COLOR, CHROME, BADGE_WIDTH } from "./monokai-palette.js";
import { EPIC_SPINNER, FEATURE_SPINNER, useSpinnerTick, isActive } from "./spinner.js";
```

This removes:
- `import { useState, useEffect } from "react"` (line 12 -- no longer needed since `useSpinnerTick` is imported)
- `const EPIC_SPINNER = [...]` (line 28)
- `const FEATURE_SPINNER = [...]` (line 30)
- `const SPINNER_INTERVAL_MS = 120` (line 31)
- The local `useSpinnerTick` function (lines 33-42)
- The local `isActive` function (lines 44-47)
- The JSDoc comments for the local spinner constants (lines 27, 29)

Note: `useState` and `useEffect` imports are removed because TreeView.tsx does not use them directly -- the only usage was inside the now-removed local `useSpinnerTick` function. The imported `useSpinnerTick` from the shared module handles its own React imports internally.

- [x] **Step 1 complete: imports updated, local defs removed**

**Step 2: Run typecheck to verify no unused locals or missing imports**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-spinner-bug-fixes-3459/cli && bun x tsc --noEmit`

Expected: No type errors. With `noUnusedLocals: true`, any leftover unused import or missing symbol will be caught.

- [x] **Step 2 complete: typecheck passes**

**Step 3: Run tests to verify nothing is broken**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-spinner-bug-fixes-3459/cli && bun --bun vitest run`

Expected: All tests PASS.

- [x] **Step 3 complete: all tests pass**

**Step 4: Commit**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-spinner-bug-fixes-3459
git add cli/src/dashboard/TreeView.tsx
git commit -m "refactor(TreeView): use shared spinner module, remove local defs"
```

- [x] **Step 4 complete: committed**

---

### Task 5: Final verification

**Wave:** 3
**Depends on:** Task 3, Task 4

**Files:**
- (no files created or modified)

**Step 1: Run full test suite**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-spinner-bug-fixes-3459/cli && bun --bun vitest run`

Expected: All tests PASS.

- [x] **Step 1 complete: full suite green**

**Step 2: Run typecheck**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-spinner-bug-fixes-3459/cli && bun x tsc --noEmit`

Expected: No type errors.

- [x] **Step 2 complete: typecheck passes**

**Step 3: Verify no local spinner definitions remain in consumers**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-spinner-bug-fixes-3459 && grep -n "EPIC_SPINNER\|FEATURE_SPINNER\|SPINNER_INTERVAL_MS\|useSpinnerFrame\|useSpinnerTick\|isActive" cli/src/dashboard/EpicsPanel.tsx cli/src/dashboard/TreeView.tsx`

Expected output should show ONLY import lines from `./spinner.js` and usage sites -- no `const EPIC_SPINNER`, no `function useSpinnerTick`, no `function isActive` definitions. Specifically:

- `EpicsPanel.tsx`: one import line with `{ EPIC_SPINNER, FEATURE_SPINNER, useSpinnerTick, isActive }`, usage lines referencing `EPIC_SPINNER[`, `FEATURE_SPINNER[`, `useSpinnerTick()`, `isActive(`
- `TreeView.tsx`: one import line with `{ EPIC_SPINNER, FEATURE_SPINNER, useSpinnerTick, isActive }`, usage lines referencing `EPIC_SPINNER[`, `FEATURE_SPINNER[`, `useSpinnerTick()`, `isActive(`

- [x] **Step 3 complete: no local definitions remain**

**Step 4: Verify `activeSessions.has` is NOT used for spinner activation in EpicsPanel**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-spinner-bug-fixes-3459 && grep -n "activeSessions.has" cli/src/dashboard/EpicsPanel.tsx`

Expected: No matches. The `activeSessions.has(epic.slug)` call on old line 83 has been replaced with `isActive(epic.status)`. The `activeSessions` prop itself is still in the interface (used upstream) but no `.has()` call should remain in EpicsPanel.

- [x] **Step 4 complete: activeSessions.has removed from spinner guard**

**Step 5: Verify `activeSessions` prop is preserved in EpicsPanelProps**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-spinner-bug-fixes-3459 && grep -n "activeSessions" cli/src/dashboard/EpicsPanel.tsx`

Expected: The `activeSessions: Set<string>` field still exists in `EpicsPanelProps` interface. The destructured parameter shows `activeSessions: _activeSessions` (underscore prefix for unused parameter). No `.has()` call remains.

- [x] **Step 5 complete: activeSessions prop preserved**
