# CLI Verbosity Filter — Implementation Tasks

## Goal

Make `filterTreeByVerbosity()` filter CLI root entries through `shouldShowEntry()` instead of passing them through unfiltered. Update tests to match.

## Architecture

- `shouldShowEntry(level, verbosity)` already handles the filtering logic (warn/error always shown, info at 0+, debug at 1+)
- `SystemEntry` has a `level: LogLevel` field — compatible with `shouldShowEntry`
- Single function change in `filterTreeByVerbosity()` at `cli/src/dashboard/LogPanel.tsx:99`
- Two test files have "CLI entries not filtered" assertions that must flip

## Tech Stack

- TypeScript, Vitest, Bun test runner
- Test command: `cd cli && bun --bun vitest run`

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/dashboard/LogPanel.tsx` | Modify | Filter CLI entries through `shouldShowEntry` |
| `cli/src/__tests__/tree-view.test.ts` | Modify | Update "CLI entries are not filtered" test |
| `cli/src/__tests__/log-panel-refactor.test.ts` | Modify | Update "CLI entries not filtered" test |
| `cli/src/__tests__/cli-verbosity-filter.integration.test.ts` | Create | Integration test from BDD scenarios |

---

### Task 0: Integration Test (BDD RED)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/cli-verbosity-filter.integration.test.ts`

- [x] **Step 1: Write the integration test**

```typescript
import { describe, test, expect } from "vitest";
import { filterTreeByVerbosity } from "../dashboard/LogPanel.js";
import type { TreeState } from "../dashboard/tree-types.js";

function makeState(): TreeState {
  return {
    cli: {
      entries: [
        { timestamp: 1000, level: "debug", message: "watch started", seq: 1 },
        { timestamp: 2000, level: "debug", message: "scan complete", seq: 2 },
        { timestamp: 3000, level: "warn", message: "pipeline error", seq: 3 },
      ],
    },
    epics: [],
  };
}

describe("CLI root entries respect the verbosity filter", () => {
  test("info verbosity hides debug-level CLI root entries", () => {
    const state = makeState();
    const filtered = filterTreeByVerbosity(state, 0);
    const messages = filtered.cli.entries.map((e) => e.message);
    expect(messages).not.toContain("watch started");
    expect(messages).not.toContain("scan complete");
    expect(messages).toContain("pipeline error");
  });

  test("debug verbosity shows all CLI root entries", () => {
    const state = makeState();
    const filtered = filterTreeByVerbosity(state, 1);
    const messages = filtered.cli.entries.map((e) => e.message);
    expect(messages).toContain("watch started");
    expect(messages).toContain("scan complete");
    expect(messages).toContain("pipeline error");
  });

  test("toggling verbosity updates CLI root entry visibility immediately", () => {
    const state = makeState();

    // At info, debug entries hidden
    const atInfo = filterTreeByVerbosity(state, 0);
    expect(atInfo.cli.entries.map((e) => e.message)).not.toContain("watch started");

    // Toggle to debug, debug entries visible
    const atDebug = filterTreeByVerbosity(state, 1);
    expect(atDebug.cli.entries.map((e) => e.message)).toContain("watch started");
  });

  test("warn and error CLI root entries are always visible regardless of verbosity", () => {
    const state: TreeState = {
      cli: {
        entries: [
          { timestamp: 1000, level: "warn", message: "a warning", seq: 1 },
          { timestamp: 2000, level: "error", message: "an error", seq: 2 },
        ],
      },
      epics: [],
    };
    const filtered = filterTreeByVerbosity(state, 0);
    expect(filtered.cli.entries).toHaveLength(2);
    expect(filtered.cli.entries.map((e) => e.message)).toContain("a warning");
    expect(filtered.cli.entries.map((e) => e.message)).toContain("an error");
  });
});
```

- [x] **Step 2: Run the integration test to verify it fails (RED)**

Run: `cd cli && bun --bun vitest run src/__tests__/cli-verbosity-filter.integration.test.ts`
Expected: FAIL — "info verbosity hides debug-level CLI root entries" fails because `filterTreeByVerbosity` currently passes CLI entries through unfiltered.

- [x] **Step 3: Commit**

```bash
git add cli/src/__tests__/cli-verbosity-filter.integration.test.ts
git commit -m "test(cli-verbosity-filter): add integration test — RED"
```

---

### Task 1: Filter CLI entries in filterTreeByVerbosity

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/LogPanel.tsx:97-109`

- [x] **Step 1: Write a focused unit test for the new behavior**

In the existing test file `cli/src/__tests__/tree-view.test.ts`, the test at line 228 ("CLI entries are not filtered") currently asserts that a debug-level CLI entry survives filtering at verbosity 0. Write a replacement test that asserts the opposite.

No new test file needed — the existing test will be modified in Step 3.

- [x] **Step 2: Modify filterTreeByVerbosity to filter CLI entries**

In `cli/src/dashboard/LogPanel.tsx`, change line 99 from:

```typescript
    cli: state.cli, // CLI entries always shown
```

to:

```typescript
    cli: {
      entries: state.cli.entries.filter((e) => shouldShowEntry(e.level, verbosity)),
    },
```

- [x] **Step 3: Update the test in tree-view.test.ts**

In `cli/src/__tests__/tree-view.test.ts`, replace the test "CLI entries are not filtered" (lines 228-237) with:

```typescript
  test("CLI entries are filtered by verbosity", () => {
    const state: TreeState = {
      cli: { entries: [
        { timestamp: 1000, level: "debug", message: "sys debug", seq: 1 },
      ] },
      epics: [],
    };
    const filtered = filterTreeByVerbosity(state, 0);
    expect(filtered.cli.entries).toHaveLength(0);
  });
```

- [x] **Step 4: Update the test in log-panel-refactor.test.ts**

In `cli/src/__tests__/log-panel-refactor.test.ts`, replace the test "CLI entries not filtered" (lines 148-156) with:

```typescript
  test("CLI entries filtered by verbosity", () => {
    const state = makeState({
      cli: { entries: [
        { timestamp: 1000, level: "debug", message: "sys debug", seq: 0 },
      ] },
    });
    const filtered = filterTreeByVerbosity(state, 0);
    expect(filtered.cli.entries).toHaveLength(0);
  });
```

- [x] **Step 5: Run all tests to verify GREEN**

Run: `cd cli && bun --bun vitest run`
Expected: PASS — all tests pass including the new integration test from Task 0.

- [x] **Step 6: Commit**

```bash
git add cli/src/dashboard/LogPanel.tsx cli/src/__tests__/tree-view.test.ts cli/src/__tests__/log-panel-refactor.test.ts
git commit -m "feat(cli-verbosity-filter): filter CLI root entries through shouldShowEntry"
```

---

### Task 2: Update filterTreeByVerbosity JSDoc

**Wave:** 1
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/dashboard/LogPanel.tsx:92-96`

- [x] **Step 1: Update the JSDoc comment**

In `cli/src/dashboard/LogPanel.tsx`, replace lines 92-96:

```typescript
/**
 * Filter tree entries by verbosity level.
 * Entries with level above current verbosity are removed.
 * CLI entries are not filtered (always shown).
 * warn/error entries are always shown regardless of verbosity.
 */
```

with:

```typescript
/**
 * Filter tree entries by verbosity level.
 * Entries with level above current verbosity are removed.
 * warn/error entries are always shown regardless of verbosity.
 */
```

- [x] **Step 2: Commit**

```bash
git add cli/src/dashboard/LogPanel.tsx
git commit -m "docs(cli-verbosity-filter): remove stale CLI-passthrough comment"
```
