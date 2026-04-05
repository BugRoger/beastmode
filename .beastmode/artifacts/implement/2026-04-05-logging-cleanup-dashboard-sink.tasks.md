# Dashboard Sink — Implementation Tasks

## Goal

Replace `createDashboardLogger()` with a `DashboardSink` implementing `LogSink`. The dashboard command constructs `createLogger(dashboardSink)` instead of calling the old factory. Verbosity cycling drops from 4 levels to 2. Dead code removed.

## Architecture

- **LogSink interface** (`cli/src/logger.ts`): `{ write(entry: LogEntry): void }` — already exists
- **LogEntry** (`cli/src/logger.ts`): `{ level, timestamp, msg, data?, context }` — already exists
- **Logger** (`cli/src/logger.ts`): `{ info, debug, warn, error, child }` via `createLogger(sink, context?)` — already exists
- **DashboardSink** (new): implements `LogSink`, receives LogEntry, transforms to dispatch LogEntry shape for FallbackEntryStore, and pushes to SystemEntryRef
- **FallbackEntryStore** (`cli/src/dashboard/lifecycle-entries.ts`): `push(epic, phase, feature, entry: Omit<DispatchLogEntry, "seq">)` — the dispatch LogEntry has `{seq, timestamp, type, text}`
- Two LogEntry types exist: the core one in `logger.ts` (level/msg/data/context) and the dispatch one in `dispatch/factory.ts` (type/text/seq). DashboardSink bridges them.

## Tech Stack

- TypeScript, Bun runtime, Vitest test runner
- `bun --bun vitest run` for tests

## File Structure

- **Create:** `cli/src/dashboard/dashboard-sink.ts` — DashboardSink class implementing LogSink
- **Create:** `cli/src/__tests__/dashboard-sink.test.ts` — unit tests for DashboardSink
- **Modify:** `cli/src/dashboard/verbosity.ts` — change VERBOSITY_COUNT from 4 to 2, update LEVEL_MAP and LABELS
- **Modify:** `cli/src/commands/dashboard.ts` — use createLogger + DashboardSink instead of createDashboardLogger
- **Modify:** `cli/src/dashboard/App.tsx` — use createLogger + DashboardSink instead of createDashboardLogger
- **Modify:** `cli/src/dashboard/hooks/use-dashboard-keyboard.ts` — no change needed (cycles via cycleVerbosity which uses VERBOSITY_COUNT)
- **Delete contents of:** `cli/src/dashboard/dashboard-logger.ts` — remove createDashboardLogger, keep SystemEntryRef export (still used)

---

### Task 0: Create DashboardSink with tests

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/src/dashboard/dashboard-sink.ts`
- Create: `cli/src/__tests__/dashboard-sink.test.ts`

- [x] **Step 1: Write the test file**

```typescript
// cli/src/__tests__/dashboard-sink.test.ts
import { describe, test, expect, beforeEach } from "vitest";
import { DashboardSink } from "../dashboard/dashboard-sink";
import type { LogEntry } from "../logger";
import { FallbackEntryStore } from "../dashboard/lifecycle-entries";
import type { SystemEntryRef } from "../dashboard/dashboard-logger";

function createSystemRef(): SystemEntryRef {
  let seq = 0;
  return {
    entries: [],
    nextSeq: () => seq++,
  };
}

describe("DashboardSink", () => {
  let fallbackStore: FallbackEntryStore;
  let systemRef: SystemEntryRef;

  beforeEach(() => {
    fallbackStore = new FallbackEntryStore();
    systemRef = createSystemRef();
  });

  test("implements LogSink.write", () => {
    const sink = new DashboardSink({ fallbackStore, systemRef });
    expect(typeof sink.write).toBe("function");
  });

  test("routes entry with epic context to fallbackStore", () => {
    const sink = new DashboardSink({ fallbackStore, systemRef });
    const entry: LogEntry = {
      level: "info",
      timestamp: 1000,
      msg: "test message",
      context: { epic: "my-epic", phase: "plan", feature: "auth" },
    };
    sink.write(entry);

    const stored = fallbackStore.get("my-epic", "plan", "auth");
    expect(stored).toHaveLength(1);
    expect(stored[0].text).toBe("test message");
    expect(stored[0].type).toBe("text");
    expect(stored[0].timestamp).toBe(1000);
  });

  test("maps warn/error level to 'result' type", () => {
    const sink = new DashboardSink({ fallbackStore, systemRef });
    sink.write({
      level: "warn",
      timestamp: 1000,
      msg: "warning",
      context: { epic: "e", phase: "p" },
    });
    sink.write({
      level: "error",
      timestamp: 2000,
      msg: "error",
      context: { epic: "e", phase: "p" },
    });

    const stored = fallbackStore.get("e", "p", undefined);
    expect(stored[0].type).toBe("result");
    expect(stored[1].type).toBe("result");
  });

  test("maps info/debug level to 'text' type", () => {
    const sink = new DashboardSink({ fallbackStore, systemRef });
    sink.write({
      level: "info",
      timestamp: 1000,
      msg: "info",
      context: { epic: "e", phase: "p" },
    });
    sink.write({
      level: "debug",
      timestamp: 2000,
      msg: "debug",
      context: { epic: "e", phase: "p" },
    });

    const stored = fallbackStore.get("e", "p", undefined);
    expect(stored[0].type).toBe("text");
    expect(stored[1].type).toBe("text");
  });

  test("always pushes to systemRef entries", () => {
    const sink = new DashboardSink({ fallbackStore, systemRef });
    sink.write({
      level: "info",
      timestamp: 1000,
      msg: "hello",
      context: { epic: "e", phase: "p" },
    });

    expect(systemRef.entries).toHaveLength(1);
    expect(systemRef.entries[0].message).toContain("hello");
    expect(systemRef.entries[0].level).toBe("info");
    expect(systemRef.entries[0].seq).toBe(0);
  });

  test("systemRef entry includes epic prefix when context has epic", () => {
    const sink = new DashboardSink({ fallbackStore, systemRef });
    sink.write({
      level: "info",
      timestamp: 1000,
      msg: "hello",
      context: { epic: "my-epic", phase: "plan" },
    });

    expect(systemRef.entries[0].message).toBe("[my-epic/plan] hello");
  });

  test("systemRef entry has no prefix when no epic context", () => {
    const sink = new DashboardSink({ fallbackStore, systemRef });
    sink.write({
      level: "info",
      timestamp: 1000,
      msg: "hello",
      context: {},
    });

    // No epic context — no fallbackStore entry, just system
    expect(systemRef.entries[0].message).toBe("hello");
    expect(fallbackStore.get("", "", undefined)).toHaveLength(0);
  });

  test("entry without epic context skips fallbackStore", () => {
    const sink = new DashboardSink({ fallbackStore, systemRef });
    sink.write({
      level: "info",
      timestamp: 1000,
      msg: "global",
      context: {},
    });

    // fallbackStore should have nothing
    expect(fallbackStore.revision).toBe(0);
    // systemRef should have the entry
    expect(systemRef.entries).toHaveLength(1);
  });

  test("uses 'unknown' phase when context.phase is missing", () => {
    const sink = new DashboardSink({ fallbackStore, systemRef });
    sink.write({
      level: "info",
      timestamp: 1000,
      msg: "test",
      context: { epic: "e" },
    });

    const stored = fallbackStore.get("e", "unknown", undefined);
    expect(stored).toHaveLength(1);
  });

  test("receives all entries regardless of level (no gating)", () => {
    const sink = new DashboardSink({ fallbackStore, systemRef });
    const levels = ["info", "debug", "warn", "error"] as const;
    for (const level of levels) {
      sink.write({
        level,
        timestamp: 1000,
        msg: `${level} msg`,
        context: { epic: "e", phase: "p" },
      });
    }

    const stored = fallbackStore.get("e", "p", undefined);
    expect(stored).toHaveLength(4);
    expect(systemRef.entries).toHaveLength(4);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/dashboard-sink.test.ts`
Expected: FAIL — cannot resolve `../dashboard/dashboard-sink`

- [x] **Step 3: Write DashboardSink implementation**

```typescript
// cli/src/dashboard/dashboard-sink.ts
/**
 * DashboardSink — LogSink implementation that routes entries to dashboard stores.
 *
 * Receives LogEntry records from the Logger (no gating) and:
 * 1. Routes epic-scoped entries to FallbackEntryStore (keyed by epic/phase/feature)
 * 2. Pushes all entries to SystemEntryRef for aggregate mode display
 *
 * Bridges the core LogEntry (level/msg/data/context) to the dispatch LogEntry
 * shape (type/text/seq) expected by FallbackEntryStore.
 */

import type { LogEntry, LogSink } from "../logger.js";
import type { LogEntry as DispatchLogEntry } from "../dispatch/factory.js";
import type { FallbackEntryStore } from "./lifecycle-entries.js";
import type { SystemEntryRef } from "./dashboard-logger.js";

export interface DashboardSinkOptions {
  fallbackStore: FallbackEntryStore;
  systemRef: SystemEntryRef;
}

export class DashboardSink implements LogSink {
  private fallbackStore: FallbackEntryStore;
  private systemRef: SystemEntryRef;

  constructor(opts: DashboardSinkOptions) {
    this.fallbackStore = opts.fallbackStore;
    this.systemRef = opts.systemRef;
  }

  write(entry: LogEntry): void {
    const { level, timestamp, msg, context } = entry;

    // Route to fallbackStore if epic context is present
    if (context.epic) {
      const dispatchEntry: Omit<DispatchLogEntry, "seq"> = {
        type: level === "error" || level === "warn" ? "result" : "text",
        timestamp,
        text: msg,
      };
      this.fallbackStore.push(
        context.epic,
        context.phase ?? "unknown",
        context.feature,
        dispatchEntry,
      );
    }

    // Always push to system entries (visible in aggregate mode)
    const prefix = context.epic
      ? `[${context.epic}${context.phase ? `/${context.phase}` : ""}] `
      : "";
    this.systemRef.entries.push({
      timestamp,
      level,
      message: `${prefix}${msg}`,
      seq: this.systemRef.nextSeq(),
    });
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/dashboard-sink.test.ts`
Expected: PASS — all tests green

- [x] **Step 5: Commit**

```bash
git add cli/src/dashboard/dashboard-sink.ts cli/src/__tests__/dashboard-sink.test.ts
git commit -m "feat(dashboard-sink): add DashboardSink implementing LogSink"
```

---

### Task 1: Update verbosity cycling to 2 levels

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/verbosity.ts`

- [x] **Step 1: Update verbosity.ts**

Change `VERBOSITY_COUNT` from 4 to 2. Update `LEVEL_MAP` to only have `info: 0` and `debug: 1` (remove `detail` and `trace`). Update `LABELS` to `["info", "debug"]`.

The new verbosity.ts content:

```typescript
/**
 * Verbosity cycling utilities for the dashboard.
 *
 * Maps LogLevel to numeric verbosity and provides cycling/filtering helpers.
 */

import type { LogLevel } from "../logger.js";

/** Number of verbosity levels (info, debug). */
const VERBOSITY_COUNT = 2;

/** Map LogLevel to numeric verbosity. warn/error return -1 (always shown). */
const LEVEL_MAP: Record<LogLevel, number> = {
  info: 0,
  debug: 1,
  warn: -1,
  error: -1,
};

/** Verbosity index labels. */
const LABELS: readonly string[] = ["info", "debug"];

/** Get the numeric verbosity for a log level. -1 means always shown. */
export function levelToVerbosity(level: LogLevel): number {
  return LEVEL_MAP[level];
}

/** Cycle to the next verbosity level (wraps 1 -> 0). */
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

- [x] **Step 2: Run existing tests to verify nothing breaks**

Run: `cd cli && bun --bun vitest run`
Expected: PASS (or any pre-existing failures unrelated to verbosity)

- [x] **Step 3: Commit**

```bash
git add cli/src/dashboard/verbosity.ts
git commit -m "feat(dashboard-sink): reduce verbosity cycle to 2 levels (info/debug)"
```

---

### Task 2: Wire DashboardSink into dashboard command and App

**Wave:** 2
**Depends on:** Task 0, Task 1

**Files:**
- Modify: `cli/src/commands/dashboard.ts`
- Modify: `cli/src/dashboard/App.tsx`
- Modify: `cli/src/dashboard/dashboard-logger.ts` (remove createDashboardLogger, keep SystemEntryRef)

- [x] **Step 1: Update dashboard.ts to use DashboardSink + createLogger**

Replace the import of `createDashboardLogger` with imports of `createLogger` from `logger.ts` and `DashboardSink` from `dashboard-sink.ts`. Replace the logger construction:

In `cli/src/commands/dashboard.ts`:

Old (lines 18-19):
```typescript
import { createDashboardLogger } from "../dashboard/dashboard-logger.js";
import type { SystemEntryRef } from "../dashboard/dashboard-logger.js";
```

New:
```typescript
import { createLogger } from "../logger.js";
import { DashboardSink } from "../dashboard/dashboard-sink.js";
import type { SystemEntryRef } from "../dashboard/dashboard-logger.js";
```

Old (lines 46-50):
```typescript
  const logger = createDashboardLogger({
    fallbackStore,
    systemRef,
    verbosity,
  });
```

New:
```typescript
  const dashboardSink = new DashboardSink({ fallbackStore, systemRef });
  const logger = createLogger(dashboardSink);
```

- [x] **Step 2: Update App.tsx to use DashboardSink + createLogger**

In `cli/src/dashboard/App.tsx`:

Old (line 19):
```typescript
import { createDashboardLogger } from "./dashboard-logger.js";
```

New:
```typescript
import { createLogger } from "../logger.js";
import { DashboardSink } from "./dashboard-sink.js";
```

Old (lines 58-67):
```typescript
  const dashboardLoggerRef = useRef(
    createDashboardLogger({
      fallbackStore: fallbackStoreRef.current,
      systemRef: systemRef ?? {
        entries: systemEntriesRef.current,
        nextSeq: () => systemSeqRef.current++,
      },
      verbosity,
    }),
  );
```

New:
```typescript
  const dashboardLoggerRef = useRef(
    createLogger(
      new DashboardSink({
        fallbackStore: fallbackStoreRef.current,
        systemRef: systemRef ?? {
          entries: systemEntriesRef.current,
          nextSeq: () => systemSeqRef.current++,
        },
      }),
    ),
  );
```

- [x] **Step 3: Remove createDashboardLogger from dashboard-logger.ts, keep SystemEntryRef**

Replace the contents of `cli/src/dashboard/dashboard-logger.ts` with just the SystemEntryRef type export:

```typescript
/**
 * Shared types for dashboard logging.
 */

import type { LogLevel } from "../logger.js";

export interface SystemEntryRef {
  entries: { timestamp: number; level: LogLevel; message: string; seq: number }[];
  nextSeq: () => number;
}
```

- [x] **Step 4: Run tests to verify**

Run: `cd cli && bun --bun vitest run`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add cli/src/commands/dashboard.ts cli/src/dashboard/App.tsx cli/src/dashboard/dashboard-logger.ts
git commit -m "feat(dashboard-sink): wire DashboardSink into dashboard command and remove createDashboardLogger"
```
