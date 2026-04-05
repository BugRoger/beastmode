# Tree Sink — Implementation Tasks

## Goal

Replace the TreeLogger class with a TreeSink that implements the LogSink interface. Consumers create a Logger with a TreeSink injected instead of creating a TreeLogger directly. Update formatTreeLogLine to match the 4-level LogLevel type.

## Architecture

- **LogSink interface**: `{ write(entry: LogEntry): void }` — defined in `cli/src/logger.ts:157-159`
- **LogEntry**: `{ level, timestamp, msg, data?, context }` — defined in `cli/src/logger.ts:145-151`
- **LogLevel**: `"info" | "debug" | "warn" | "error"` — 4 levels only
- **TreeState**: `{ epics: TreeNode[], systemEntries: TreeEntry[] }` — defined in `cli/src/tree-view/types.ts`
- **addEntry()**: Routes entries to tree depth based on context — defined in `cli/src/tree-view/tree-state.ts:49-73`
- **Verbosity gating in sinks**: TreeSink filters debug at verbosity 0, passes all at verbosity 1+. Warn/error always pass.
- **Notify callback**: TreeSink accepts optional `notify` callback, called after each entry is added (drives React re-renders via useTreeState hook).

## Tech Stack

- TypeScript, Bun runtime, vitest test runner
- Test command: `bun --bun vitest run`

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `cli/src/tree-view/tree-sink.ts` | TreeSink factory — LogSink implementation routing to TreeState |
| Create | `cli/src/__tests__/tree-sink.test.ts` | Tests for TreeSink: routing, verbosity, notify, Logger integration |
| Modify | `cli/src/tree-view/format.ts` | Update LEVEL_LABELS to 4-level LogLevel (remove detail/trace) |
| Modify | `cli/src/__tests__/tree-format.test.ts` | Update level labels test to 4 levels |
| Modify | `cli/src/tree-view/use-tree-state.ts` | Replace TreeLogger with createTreeSink + createLogger |
| Modify | `cli/src/tree-view/index.ts` | Replace TreeLogger export with createTreeSink |
| Modify | `cli/src/__tests__/use-tree-state.test.ts` | Replace TreeLogger with createTreeSink + createLogger |
| Delete | `cli/src/tree-view/tree-logger.ts` | Old TreeLogger class — replaced by TreeSink |
| Delete | `cli/src/__tests__/tree-logger.test.ts` | Old TreeLogger tests — replaced by tree-sink.test.ts |

---

### Task 1: Create TreeSink implementation and tests

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/src/tree-view/tree-sink.ts`
- Create: `cli/src/__tests__/tree-sink.test.ts`

- [x] **Step 1: Write the test file**

```typescript
// cli/src/__tests__/tree-sink.test.ts
import { describe, test, expect } from "vitest";
import { createTreeSink } from "../tree-view/tree-sink.js";
import { createTreeState } from "../tree-view/tree-state.js";
import { createLogger } from "../logger.js";
import type { LogSink } from "../logger.js";

describe("createTreeSink", () => {
  describe("LogSink interface", () => {
    test("returns object with write method", () => {
      const state = createTreeState();
      const sink: LogSink = createTreeSink(state, 0);
      expect(typeof sink.write).toBe("function");
    });
  });

  describe("routing by context", () => {
    test("no context: entry goes to systemEntries", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const logger = createLogger(sink);
      logger.info("system msg");
      expect(state.systemEntries).toHaveLength(1);
      expect(state.systemEntries[0].message).toBe("system msg");
    });

    test("epic context: entry goes to epic node", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const logger = createLogger(sink, { epic: "my-epic" });
      logger.info("epic msg");
      expect(state.epics).toHaveLength(1);
      expect(state.epics[0].entries).toHaveLength(1);
    });

    test("phase context: entry goes to phase node", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const logger = createLogger(sink, { epic: "my-epic", phase: "plan" });
      logger.info("phase msg");
      expect(state.epics[0].children[0].entries).toHaveLength(1);
    });

    test("feature context: entry goes to feature node", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const logger = createLogger(sink, { epic: "my-epic", phase: "implement", feature: "auth" });
      logger.info("feature msg");
      const feature = state.epics[0].children[0].children[0];
      expect(feature.entries).toHaveLength(1);
    });
  });

  describe("verbosity gating", () => {
    test("verbosity 0: debug entries suppressed", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const logger = createLogger(sink, { epic: "e" });
      logger.info("a");
      logger.debug("b");
      expect(state.epics[0].entries).toHaveLength(1);
    });

    test("verbosity 1: all entries pass through", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 1);
      const logger = createLogger(sink, { epic: "e" });
      logger.info("a");
      logger.debug("b");
      expect(state.epics[0].entries).toHaveLength(2);
    });

    test("warn always passes regardless of verbosity", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const logger = createLogger(sink, { epic: "e" });
      logger.warn("w");
      expect(state.epics[0].entries).toHaveLength(1);
      expect(state.epics[0].entries[0].level).toBe("warn");
    });

    test("error always passes regardless of verbosity", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const logger = createLogger(sink, { epic: "e" });
      logger.error("e");
      expect(state.epics[0].entries).toHaveLength(1);
      expect(state.epics[0].entries[0].level).toBe("error");
    });
  });

  describe("notify callback", () => {
    test("calls notify on every entry added", () => {
      const state = createTreeState();
      let count = 0;
      const sink = createTreeSink(state, 0, () => { count++; });
      const logger = createLogger(sink);
      logger.info("a");
      logger.info("b");
      expect(count).toBe(2);
    });

    test("does not call notify when entry filtered by verbosity", () => {
      const state = createTreeState();
      let count = 0;
      const sink = createTreeSink(state, 0, () => { count++; });
      const logger = createLogger(sink);
      logger.debug("filtered");
      expect(count).toBe(0);
    });
  });

  describe("Logger integration", () => {
    test("child logger merges context correctly", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const parent = createLogger(sink, { epic: "my-epic" });
      const child = parent.child({ phase: "plan" });
      child.info("msg");
      expect(state.epics[0].children[0].label).toBe("plan");
      expect(state.epics[0].children[0].entries).toHaveLength(1);
    });

    test("child overrides parent context fields", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const parent = createLogger(sink, { epic: "old" });
      const child = parent.child({ epic: "new" });
      child.info("msg");
      expect(state.epics).toHaveLength(1);
      expect(state.epics[0].label).toBe("new");
    });

    test("multi-epic creates separate subtrees", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const a = createLogger(sink, { epic: "alpha" });
      const b = createLogger(sink, { epic: "beta" });
      a.info("a msg");
      b.info("b msg");
      expect(state.epics).toHaveLength(2);
      expect(state.epics[0].label).toBe("alpha");
      expect(state.epics[1].label).toBe("beta");
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun --bun vitest run src/__tests__/tree-sink.test.ts`
Expected: FAIL with "Cannot find module" (tree-sink.ts doesn't exist yet)

- [x] **Step 3: Write minimal implementation**

```typescript
// cli/src/tree-view/tree-sink.ts
import type { LogSink, LogEntry } from "../logger.js";
import type { TreeState } from "./types.js";
import { addEntry } from "./tree-state.js";

/**
 * Create a TreeSink that routes log entries into tree state.
 *
 * Verbosity gating:
 * - verbosity 0 (info): debug entries suppressed
 * - verbosity 1 (debug / -v flag): all entries pass through
 * - warn/error always shown
 */
export function createTreeSink(
  state: TreeState,
  verbosity: number,
  notify?: () => void,
): LogSink {
  return {
    write(entry: LogEntry): void {
      if (entry.level === "debug" && verbosity < 1) return;
      addEntry(state, entry.level, entry.context, entry.msg);
      notify?.();
    },
  };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `bun --bun vitest run src/__tests__/tree-sink.test.ts`
Expected: PASS — all 12 tests green

- [x] **Step 5: Commit**

```bash
git add src/tree-view/tree-sink.ts src/__tests__/tree-sink.test.ts
git commit -m "feat(tree-sink): add createTreeSink factory with tests"
```

---

### Task 2: Update formatTreeLogLine to 4-level LogLevel

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/tree-view/format.ts:5-12` (LEVEL_LABELS)
- Modify: `cli/src/tree-view/format.ts:39-41` (colorizer)
- Modify: `cli/src/__tests__/tree-format.test.ts:37-48` (level labels test)

- [x] **Step 1: Update format.ts LEVEL_LABELS to 4 levels**

In `cli/src/tree-view/format.ts`, replace the 6-entry LEVEL_LABELS record with:

```typescript
const LEVEL_LABELS: Record<LogLevel, string> = {
  info:  "INFO ",
  debug: "DEBUG",
  warn:  "WARN ",
  error: "ERR  ",
};
```

And update the colorizer from:
```typescript
  const coloredLabel = level === "info" || level === "detail"
    ? chalk.green(label)
    : chalk.blue(label);
```
to:
```typescript
  const coloredLabel = level === "info"
    ? chalk.green(label)
    : chalk.blue(label);
```

- [x] **Step 2: Update tree-format.test.ts level labels test**

In `cli/src/__tests__/tree-format.test.ts`, replace the level labels test array:

```typescript
  test("level labels are 5-char fixed width", () => {
    const levels: [LogLevel, string][] = [
      ["info", "INFO "],
      ["debug", "DEBUG"],
      ["warn", "WARN "],
      ["error", "ERR  "],
    ];
    for (const [level, label] of levels) {
      const line = stripAnsi(formatTreeLogLine(level, "msg"));
      expect(line).toContain(label);
    }
  });
```

- [x] **Step 3: Run tests to verify they pass**

Run: `bun --bun vitest run src/__tests__/tree-format.test.ts`
Expected: PASS — all 8 tests green

- [x] **Step 4: Commit**

```bash
git add src/tree-view/format.ts src/__tests__/tree-format.test.ts
git commit -m "fix(tree-format): align LEVEL_LABELS with 4-level LogLevel"
```

---

### Task 3: Replace TreeLogger with Logger+TreeSink in consumers

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/tree-view/use-tree-state.ts:1-78`
- Modify: `cli/src/tree-view/index.ts:7-8`
- Modify: `cli/src/__tests__/use-tree-state.test.ts:1-63`
- Delete: `cli/src/tree-view/tree-logger.ts`
- Delete: `cli/src/__tests__/tree-logger.test.ts`

- [x] **Step 1: Update use-tree-state.ts**

Replace TreeLogger import and createLogger callback. The full updated file:

```typescript
// cli/src/tree-view/use-tree-state.ts
import { useState, useRef, useCallback } from "react";
import type { LogLevel, LogContext, Logger } from "../logger.js";
import { createLogger as coreCreateLogger } from "../logger.js";
import type { TreeState } from "./types.js";
import {
  createTreeState,
  addEntry as stateAddEntry,
  openPhase as stateOpenPhase,
  closePhase as stateClosePhase,
} from "./tree-state.js";
import { createTreeSink } from "./tree-sink.js";

export interface UseTreeStateResult {
  /** Current tree state. */
  state: TreeState;
  /** Add a log entry at the correct tree depth. */
  addEntry: (level: LogLevel, context: LogContext, message: string) => void;
  /** Open a phase node under an epic (auto-closes prior phase). */
  openPhase: (epicSlug: string, phase: string) => void;
  /** Close a specific phase node. */
  closePhase: (epicSlug: string, phase: string) => void;
  /** Create a Logger backed by a TreeSink that writes to this state and triggers re-renders. */
  createLogger: (verbosity: number, context?: LogContext) => Logger;
}

export function useTreeState(): UseTreeStateResult {
  const stateRef = useRef<TreeState>(createTreeState());
  const [, setRevision] = useState(0);

  const bump = useCallback(() => {
    setRevision((r) => r + 1);
  }, []);

  const addEntry = useCallback(
    (level: LogLevel, context: LogContext, message: string) => {
      stateAddEntry(stateRef.current, level, context, message);
      bump();
    },
    [bump],
  );

  const openPhase = useCallback(
    (epicSlug: string, phase: string) => {
      stateOpenPhase(stateRef.current, epicSlug, phase);
      bump();
    },
    [bump],
  );

  const closePhase = useCallback(
    (epicSlug: string, phase: string) => {
      stateClosePhase(stateRef.current, epicSlug, phase);
      bump();
    },
    [bump],
  );

  const createLogger = useCallback(
    (verbosity: number, context?: LogContext): Logger => {
      return coreCreateLogger(createTreeSink(stateRef.current, verbosity, bump), context);
    },
    [bump],
  );

  return {
    state: stateRef.current,
    addEntry,
    openPhase,
    closePhase,
    createLogger,
  };
}
```

- [x] **Step 2: Update index.ts exports**

In `cli/src/tree-view/index.ts`, replace line 8:

From: `export { TreeLogger } from "./tree-logger.js";`
To: `export { createTreeSink } from "./tree-sink.js";`

- [x] **Step 3: Update use-tree-state.test.ts**

Replace the full file to use createTreeSink + createLogger instead of TreeLogger:

```typescript
// cli/src/__tests__/use-tree-state.test.ts
import { describe, test, expect } from "vitest";
import { createTreeState, addEntry, openPhase, closePhase } from "../tree-view/tree-state.js";
import { createTreeSink } from "../tree-view/tree-sink.js";
import { createLogger } from "../logger.js";

describe("useTreeState integration", () => {
  test("TreeSink with notify callback simulates hook re-render trigger", () => {
    const state = createTreeState();
    let renderCount = 0;
    const notify = () => { renderCount++; };

    const sink = createTreeSink(state, 0, notify);
    const logger = createLogger(sink, { epic: "e" });
    logger.info("a");
    logger.info("b");

    expect(renderCount).toBe(2);
    expect(state.epics[0].entries).toHaveLength(2);
  });

  test("createLogger from sink produces working Logger", () => {
    const state = createTreeState();
    let renderCount = 0;
    const notify = () => { renderCount++; };

    const sink = createTreeSink(state, 0, notify);
    const logger = createLogger(sink, { epic: "my-epic", phase: "plan" });
    logger.info("msg");

    expect(state.epics[0].children[0].entries[0].message).toBe("msg");
    expect(renderCount).toBe(1);
  });

  test("openPhase + addEntry integration", () => {
    const state = createTreeState();
    openPhase(state, "e", "plan");
    addEntry(state, "info", { epic: "e", phase: "plan" }, "msg");

    expect(state.epics[0].children[0].entries).toHaveLength(1);
    expect(state.epics[0].children[0].closed).toBe(false);
  });

  test("phase auto-close on openPhase", () => {
    const state = createTreeState();
    openPhase(state, "e", "plan");
    addEntry(state, "info", { epic: "e", phase: "plan" }, "planning");
    openPhase(state, "e", "implement");
    addEntry(state, "info", { epic: "e", phase: "implement" }, "implementing");

    expect(state.epics[0].children[0].closed).toBe(true);
    expect(state.epics[0].children[1].closed).toBe(false);
  });

  test("closePhase marks phase closed", () => {
    const state = createTreeState();
    openPhase(state, "e", "plan");
    closePhase(state, "e", "plan");

    expect(state.epics[0].children[0].closed).toBe(true);
  });
});
```

- [x] **Step 4: Delete old TreeLogger files**

```bash
rm src/tree-view/tree-logger.ts
rm src/__tests__/tree-logger.test.ts
```

- [x] **Step 5: Run full test suite for tree-view files**

Run: `bun --bun vitest run src/__tests__/tree-sink.test.ts src/__tests__/tree-format.test.ts src/__tests__/use-tree-state.test.ts`
Expected: PASS — all tests green, no references to deleted TreeLogger

- [x] **Step 6: Commit**

```bash
git add src/tree-view/use-tree-state.ts src/tree-view/index.ts src/__tests__/use-tree-state.test.ts
git rm src/tree-view/tree-logger.ts src/__tests__/tree-logger.test.ts
git commit -m "refactor(tree-sink): replace TreeLogger with Logger+TreeSink"
```
