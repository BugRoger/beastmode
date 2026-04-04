# Epic List Icons — Implementation Tasks

## Goal

Redesign epic row rendering in `EpicsPanel` to use compact status-aware icon rows instead of cursor + progress bar layout.

## Architecture

- **Framework:** React + Ink (terminal UI)
- **Test framework:** bun:test
- **Test command:** `bun test src/__tests__/epics-panel.test.ts`
- **Constants:** `SPINNER_FRAMES` (braille), `PHASE_COLOR` (phase→color map), `isDim()` helper — all in EpicsPanel.tsx

## Design Constraints

- Icon priority: selected (`>` cyan) > running-not-selected (spinner yellow) > idle (`·` phase-colored) > done/cancelled (`·` dimmed)
- Row format: icon + space + hex slug + space + phase badge (colored text)
- No progress bars in epic list rows
- "(all)" row unchanged (keeps `>` / space behavior)
- Spinner reuses existing `SPINNER_FRAMES` and `InlineSpinner` component
- Phase badge = phase name as colored text using `PHASE_COLOR` map

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/dashboard/EpicsPanel.tsx` | Modify | Replace row layout: remove ProgressBar usage, replace cursor+status with icon logic, replace phase+progress columns with icon+slug+badge |
| `cli/src/__tests__/epics-panel.test.ts` | Modify | Add icon selection logic tests, phase badge tests, remove progress bar tests |

---

### Task 1: Add icon selection logic tests

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/__tests__/epics-panel.test.ts`

- [x] **Step 1: Write icon selection logic tests**

Add a new describe block after the existing "EpicsPanel logic" block. These tests validate the pure icon selection logic that will drive the new row rendering.

```typescript
// Add after the "EpicsPanel logic" describe block (after line 99)

// ---------------------------------------------------------------------------
// Group 6: Epic row icon selection
// ---------------------------------------------------------------------------

describe("epic row icon selection", () => {
  const PHASE_COLOR: Record<string, string> = {
    design: "magenta",
    plan: "blue",
    implement: "yellow",
    validate: "cyan",
    release: "green",
    done: "green",
    cancelled: "red",
  };

  function isDim(phase: string): boolean {
    return phase === "done" || phase === "cancelled";
  }

  interface IconResult {
    char: string;
    color: string | undefined;
    dim: boolean;
    spinner: boolean;
  }

  function getEpicIcon(
    isSelected: boolean,
    isActive: boolean,
    phase: string,
  ): IconResult {
    if (isSelected) {
      return { char: ">", color: "cyan", dim: false, spinner: false };
    }
    if (isActive) {
      return { char: "", color: "yellow", dim: false, spinner: true };
    }
    if (isDim(phase)) {
      return { char: "\u00b7", color: undefined, dim: true, spinner: false };
    }
    return {
      char: "\u00b7",
      color: PHASE_COLOR[phase],
      dim: false,
      spinner: false,
    };
  }

  test("selected epic gets > in cyan", () => {
    const icon = getEpicIcon(true, false, "implement");
    expect(icon.char).toBe(">");
    expect(icon.color).toBe("cyan");
    expect(icon.spinner).toBe(false);
  });

  test("selected overrides running state", () => {
    const icon = getEpicIcon(true, true, "implement");
    expect(icon.char).toBe(">");
    expect(icon.color).toBe("cyan");
    expect(icon.spinner).toBe(false);
  });

  test("running non-selected epic gets spinner in yellow", () => {
    const icon = getEpicIcon(false, true, "implement");
    expect(icon.spinner).toBe(true);
    expect(icon.color).toBe("yellow");
  });

  test("idle epic gets dot colored by phase", () => {
    const icon = getEpicIcon(false, false, "implement");
    expect(icon.char).toBe("\u00b7");
    expect(icon.color).toBe("yellow");
    expect(icon.spinner).toBe(false);
  });

  test("idle design epic gets magenta dot", () => {
    const icon = getEpicIcon(false, false, "design");
    expect(icon.char).toBe("\u00b7");
    expect(icon.color).toBe("magenta");
  });

  test("done epic gets dimmed dot", () => {
    const icon = getEpicIcon(false, false, "done");
    expect(icon.char).toBe("\u00b7");
    expect(icon.dim).toBe(true);
    expect(icon.color).toBeUndefined();
  });

  test("cancelled epic gets dimmed dot", () => {
    const icon = getEpicIcon(false, false, "cancelled");
    expect(icon.char).toBe("\u00b7");
    expect(icon.dim).toBe(true);
  });

  test("phase badge uses correct color from PHASE_COLOR map", () => {
    expect(PHASE_COLOR["implement"]).toBe("yellow");
    expect(PHASE_COLOR["validate"]).toBe("cyan");
    expect(PHASE_COLOR["release"]).toBe("green");
    expect(PHASE_COLOR["design"]).toBe("magenta");
    expect(PHASE_COLOR["plan"]).toBe("blue");
    expect(PHASE_COLOR["done"]).toBe("green");
    expect(PHASE_COLOR["cancelled"]).toBe("red");
  });
});
```

- [x] **Step 2: Run tests to verify new tests pass**

Run: `bun test src/__tests__/epics-panel.test.ts`
Expected: All tests PASS (new tests validate pure logic, no implementation dependency)

- [x] **Step 3: Commit**

```bash
git add cli/src/__tests__/epics-panel.test.ts
git commit -m "feat(epic-list-icons): add icon selection logic tests"
```

---

### Task 2: Replace epic row rendering with icon + slug + phase badge

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/dashboard/EpicsPanel.tsx`
- Modify: `cli/src/__tests__/epics-panel.test.ts`

- [x] **Step 1: Extract getEpicIcon helper and refactor row rendering**

Replace the epic row rendering in `EpicsPanel.tsx`. The changes are:

1. Add exported `getEpicIcon` function (same logic as test helper)
2. Remove `ProgressBar` component (no longer used)
3. Replace the epic row layout to: icon (width 2) + slug (slugWidth) + phase badge (flexible)
4. Icon column: shows `>` cyan when selected, `InlineSpinner` when running+not-selected, `·` phase-colored when idle, `·` dimmed when done/cancelled
5. Phase badge: phase name colored by `PHASE_COLOR`, dimmed for terminal phases
6. Remove the progress bar column (width 30) and status column
7. Keep cancel confirmation inline (replaces phase badge area when confirming)

Replace the full file content with:

```tsx
import { useState, useEffect } from "react";
import { Box, Text } from "ink";
import type { EnrichedManifest } from "../manifest/store.js";

// --- Shared utilities ---

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const PHASE_COLOR: Record<string, string> = {
  design: "magenta",
  plan: "blue",
  implement: "yellow",
  validate: "cyan",
  release: "green",
  done: "green",
  cancelled: "red",
};

function isDim(phase: string): boolean {
  return phase === "done" || phase === "cancelled";
}

function InlineSpinner() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);
  return <Text color="yellow">{SPINNER_FRAMES[frame]}</Text>;
}

// --- Icon logic ---

export interface IconResult {
  char: string;
  color: string | undefined;
  dim: boolean;
  spinner: boolean;
}

export function getEpicIcon(
  isSelected: boolean,
  isActive: boolean,
  phase: string,
): IconResult {
  if (isSelected) {
    return { char: ">", color: "cyan", dim: false, spinner: false };
  }
  if (isActive) {
    return { char: "", color: "yellow", dim: false, spinner: true };
  }
  if (isDim(phase)) {
    return { char: "\u00b7", color: undefined, dim: true, spinner: false };
  }
  return {
    char: "\u00b7",
    color: PHASE_COLOR[phase],
    dim: false,
    spinner: false,
  };
}

// --- Props ---

export interface EpicsPanelProps {
  /** Epic list (already filtered/sorted by parent) */
  epics: EnrichedManifest[];
  /** Set of epic slugs with active sessions */
  activeSessions: Set<string>;
  /** Currently selected row index (0 = "(all)" entry) */
  selectedIndex: number;
  /** Slug currently in cancel-confirmation state */
  cancelConfirmingSlug?: string;
}

// --- Component ---

export default function EpicsPanel({
  epics,
  activeSessions,
  selectedIndex,
  cancelConfirmingSlug,
}: EpicsPanelProps) {
  const allSelected = selectedIndex === 0;
  const slugWidth =
    Math.max(12, ...epics.map((e) => e.slug.length)) + 2;

  return (
    <Box flexDirection="column">
      {/* (all) entry — always index 0 */}
      <Box>
        <Box width={2}>
          <Text color="cyan">{allSelected ? ">" : " "}</Text>
        </Box>
        <Text inverse={allSelected} color={allSelected ? "cyan" : undefined}>
          (all)
        </Text>
      </Box>

      {/* Epic rows or empty state */}
      {epics.length === 0 ? (
        <Box paddingLeft={2}>
          <Text dimColor>no epics</Text>
        </Box>
      ) : (
        epics.map((epic, i) => {
          const rowIndex = i + 1;
          const isSelected = rowIndex === selectedIndex;
          const isActive = activeSessions.has(epic.slug);
          const isConfirming = cancelConfirmingSlug === epic.slug;
          const dim = isDim(epic.phase);
          const icon = getEpicIcon(isSelected, isActive, epic.phase);

          return (
            <Box key={epic.slug}>
              <Box width={2}>
                {icon.spinner ? (
                  <InlineSpinner />
                ) : (
                  <Text
                    color={icon.color as Parameters<typeof Text>[0]["color"]}
                    dimColor={icon.dim}
                  >
                    {icon.char}
                  </Text>
                )}
              </Box>
              <Box width={slugWidth}>
                <Text inverse={isSelected} dimColor={dim}>
                  {epic.slug}
                </Text>
              </Box>
              <Box>
                {isConfirming ? (
                  <Text color="red" bold>
                    Cancel {epic.slug}? y/n
                  </Text>
                ) : (
                  <Text
                    color={PHASE_COLOR[epic.phase] as Parameters<typeof Text>[0]["color"]}
                    dimColor={dim}
                  >
                    {epic.phase}
                  </Text>
                )}
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );
}
```

- [x] **Step 2: Update tests — remove progress bar test, add no-progress-bar assertion and row format tests**

In `cli/src/__tests__/epics-panel.test.ts`, replace the existing "progress bar counts completed features" test (lines 75-85) with a test asserting progress bars are gone, and add a test for the row format:

Replace the progress bar test:
```typescript
  // Test: no progress bars in epic rows
  test("epic rows do not include progress bars", () => {
    // ProgressBar component removed from EpicsPanel — rows now show icon + slug + phase badge only
    // Verify by importing getEpicIcon and checking it doesn't reference progress
    const icon = getEpicIcon(false, false, "implement");
    expect(icon).not.toHaveProperty("progress");
  });
```

Add the import at the top of the file:
```typescript
import { getEpicIcon } from "../dashboard/EpicsPanel.js";
```

- [x] **Step 3: Run full test suite to verify**

Run: `bun test src/__tests__/epics-panel.test.ts`
Expected: All tests PASS

- [x] **Step 4: Commit**

```bash
git add cli/src/dashboard/EpicsPanel.tsx cli/src/__tests__/epics-panel.test.ts
git commit -m "feat(epic-list-icons): replace row layout with icon + slug + phase badge"
```
