# Core Logger — Implementation Tasks

## Goal

Rewrite `cli/src/logger.ts` to a 4-level Logger interface (debug/info/warn/error) with a pluggable LogSink model. Update `formatLogLine` for 4 levels. Update `createNullLogger`. Update all tests.

## Architecture

- **Logger interface**: 4 methods (debug, info, warn, error) + child(). Accepts `(msg: string, data?: Record<string, unknown>)`. Delegates all calls to an injected `LogSink` — no verbosity gating in Logger.
- **LogEntry record**: `{ level, timestamp, msg, data, context }` — the structured object passed to sinks.
- **LogSink interface**: `{ write(entry: LogEntry): void }` — single contract for all transports.
- **StdioSink**: Default CLI sink. Writes info/debug to stdout, warn/error to stderr. Verbosity gating: at info level, debug entries suppressed; at debug level (-v), all pass.
- **formatLogLine**: 4 levels — INFO, DEBUG, WARN, ERR. Remove DETL and TRACE labels.
- **createNullLogger**: Updated to 4-level interface.
- **LogLevel type**: `"info" | "debug" | "warn" | "error"` (remove "detail" and "trace").

## Constraints (from design)

- Logger does NOT gate on verbosity — sinks do.
- StdioSink owns verbosity: info level = suppress debug; debug level = show all.
- Two verbosity thresholds only (info/debug), no graduated -vv/-vvv.
- LogContext: `{ phase?, epic?, feature? }` — unchanged structure.
- This feature does NOT migrate call sites (wave 3 handles that).

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/logger.ts` | Modify | New LogLevel, LogContext, LogEntry, LogSink, Logger, StdioSink, formatLogLine, createNullLogger, createLogger |
| `src/__tests__/logger.test.ts` | Modify | Tests for new Logger, StdioSink, createNullLogger |
| `src/__tests__/log-format.test.ts` | Modify | Tests for 4-level formatLogLine |

---

### Task 0: Update types and formatLogLine

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `src/logger.ts:14-52` (LogLevel, LEVEL_LABELS, colorLevel)
- Modify: `src/logger.ts:110-143` (formatLogLine)
- Modify: `src/__tests__/log-format.test.ts`

- [x] **Step 1: Write the updated test file for formatLogLine**

Replace `src/__tests__/log-format.test.ts` with tests for 4 levels (info, debug, warn, error). Remove all detail/trace references. Update level labels to match new set: INFO, DEBUG, WARN, ERR (all 5-char fixed width padded).

```typescript
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import chalk from "chalk";
import { formatLogLine } from "../logger";
import type { LogLevel, LogContext } from "../logger";

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

describe("formatLogLine", () => {
  describe("level labels", () => {
    const levels: [LogLevel, string][] = [
      ["info", "INFO "],
      ["debug", "DEBUG"],
      ["warn", "WARN "],
      ["error", "ERR  "],
    ];

    for (const [level, label] of levels) {
      test(`${level} renders as "${label}" (5-char fixed width)`, () => {
        const line = stripAnsi(formatLogLine(level, {}, "test"));
        expect(line).toContain(label);
        expect(label.length).toBe(5);
      });
    }
  });

  describe("scope construction", () => {
    test("epic + feature builds scope without phase", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic: "my-epic", feature: "feat1" }, "msg"));
      expect(line).toContain("(my-epic/feat1):");
      expect(line).not.toContain("(plan/");
    });

    test("epic-only builds single-part scope", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "implement", epic: "my-epic" }, "msg"));
      expect(line).toContain("(my-epic):");
      expect(line).not.toContain("(implement/");
    });

    test("phase-only falls back to (cli)", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "design" }, "msg"));
      expect(line).toContain("(cli):");
      expect(line).toContain("design");
    });

    test("no context falls back to (cli)", () => {
      const line = stripAnsi(formatLogLine("info", {}, "msg"));
      expect(line).toContain("(cli):");
    });
  });

  describe("phase column", () => {
    test("phase renders as 9-char fixed-width column", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "implement", epic: "test" }, "msg"));
      expect(line).toContain("implement");
      const match = line.match(/INFO \s{2}(.{9})\s{2}\(/);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("implement");
    });

    test("short phase is right-padded to 9 chars", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic: "test" }, "msg"));
      const match = line.match(/INFO \s{2}(.{9})\s{2}\(/);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("plan     ");
    });

    test("no phase renders as 9 spaces", () => {
      const line = stripAnsi(formatLogLine("info", {}, "msg"));
      const match = line.match(/INFO \s{2}(.{9})\s{2}\(/);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("         ");
    });

    test("phase appears between level and scope", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "design", epic: "test" }, "msg"));
      const levelIdx = line.indexOf("INFO ");
      const phaseIdx = line.indexOf("design");
      const scopeIdx = line.indexOf("(test):");
      expect(phaseIdx).toBeGreaterThan(levelIdx);
      expect(scopeIdx).toBeGreaterThan(phaseIdx);
    });
  });

  describe("scope truncation", () => {
    test("epic exactly 32 chars: no truncation", () => {
      const epic = "a".repeat(32);
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic }, "msg"));
      expect(line).toContain(`(${epic}):`);
    });

    test("epic 33 chars: truncated to 32 with ellipsis", () => {
      const epic = "a".repeat(33);
      const truncated = "a".repeat(31) + "\u2026";
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic }, "msg"));
      expect(line).toContain(`(${truncated}):`);
      expect(truncated.length).toBe(32);
    });

    test("epic + feature both under 16: no truncation", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic: "short", feature: "feat" }, "msg"));
      expect(line).toContain("(short/feat):");
    });

    test("epic over 16 with feature: epic truncated to 16", () => {
      const epic = "a".repeat(20);
      const truncated = "a".repeat(15) + "\u2026";
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic, feature: "feat" }, "msg"));
      expect(line).toContain(`(${truncated}/feat):`);
      expect(truncated.length).toBe(16);
    });

    test("feature over 16 with epic: feature truncated to 16", () => {
      const feature = "b".repeat(20);
      const truncated = "b".repeat(15) + "\u2026";
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic: "myep", feature }, "msg"));
      expect(line).toContain(`(myep/${truncated}):`);
      expect(truncated.length).toBe(16);
    });

    test("both epic and feature over 16: both truncated", () => {
      const epic = "a".repeat(20);
      const feature = "b".repeat(20);
      const tEpic = "a".repeat(15) + "\u2026";
      const tFeat = "b".repeat(15) + "\u2026";
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic, feature }, "msg"));
      expect(line).toContain(`(${tEpic}/${tFeat}):`);
    });
  });

  describe("output format", () => {
    test("matches format: [HH:MM:SS] LEVEL  PHASE  (scope):  message", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic: "test" }, "hello world"));
      expect(line).toMatch(/^\[\d{2}:\d{2}:\d{2}\] INFO\s{3}plan\s{7}\(test\):\s+hello world$/);
    });

    test("message is included at the end of the line", () => {
      const line = stripAnsi(formatLogLine("debug", {}, "my message here"));
      expect(line).toContain("my message here");
    });
  });

  describe("column alignment", () => {
    test("short scope is padded to target column", () => {
      const line = stripAnsi(formatLogLine("info", {}, "msg"));
      const colonIdx = line.indexOf("):");
      const msgIdx = line.indexOf("msg");
      expect(msgIdx).toBeGreaterThan(colonIdx + 3);
    });

    test("long scope overflows with minimum 2-space gap", () => {
      const longCtx: LogContext = {
        phase: "implement",
        epic: "very-long-epic-name",
        feature: "extremely-long-feature-name",
      };
      const line = stripAnsi(formatLogLine("info", longCtx, "msg"));
      const scopeEnd = line.indexOf("):");
      const afterColon = line.substring(scopeEnd + 2);
      expect(afterColon.startsWith("  ")).toBe(true);
    });
  });

  describe("WARN and ERR full-line coloring", () => {
    let savedLevel: typeof chalk.level;

    beforeEach(() => {
      savedLevel = chalk.level;
      chalk.level = 3;
    });

    afterEach(() => {
      chalk.level = savedLevel;
    });

    test("warn line contains ANSI yellow codes", () => {
      const line = formatLogLine("warn", { phase: "plan" }, "warning msg");
      expect(line).toContain("\x1b[33m");
    });

    test("error line contains ANSI red codes", () => {
      const line = formatLogLine("error", { phase: "plan" }, "error msg");
      expect(line).toContain("\x1b[31m");
    });

    test("warn line includes phase column in colored output", () => {
      const line = formatLogLine("warn", { phase: "design" }, "oops");
      const stripped = stripAnsi(line);
      expect(stripped).toContain("design");
    });

    test("error line includes phase column in colored output", () => {
      const line = formatLogLine("error", { phase: "validate" }, "bad");
      const stripped = stripAnsi(line);
      expect(stripped).toContain("validate");
    });
  });

  describe("NO_COLOR support", () => {
    let savedLevel: typeof chalk.level;

    beforeEach(() => {
      savedLevel = chalk.level;
    });

    afterEach(() => {
      chalk.level = savedLevel;
    });

    test("chalk.level = 0 produces no ANSI escape codes", () => {
      chalk.level = 0;
      const line = formatLogLine("info", { phase: "plan", epic: "test" }, "clean output");
      const hasAnsi = /\x1b\[/.test(line);
      expect(hasAnsi).toBe(false);
    });
  });
});
```

- [x] **Step 2: Update LogLevel, LEVEL_LABELS, and colorLevel in logger.ts**

In `src/logger.ts`, update:
- `LogLevel` to `"info" | "debug" | "warn" | "error"` (remove "detail" and "trace")
- `LEVEL_LABELS` to 4 entries: info→"INFO ", debug→"DEBUG", warn→"WARN ", error→"ERR  "
- `colorLevel` to 4 cases: info→green, debug→blue, warn→yellow, error→red

```typescript
export type LogLevel = "info" | "debug" | "warn" | "error";

const LEVEL_LABELS: Record<LogLevel, string> = {
  info:  "INFO ",
  debug: "DEBUG",
  warn:  "WARN ",
  error: "ERR  ",
};

function colorLevel(level: LogLevel, label: string): string {
  switch (level) {
    case "info":
      return chalk.green(label);
    case "debug":
      return chalk.blue(label);
    case "warn":
      return chalk.yellow(label);
    case "error":
      return chalk.red(label);
  }
}
```

- [x] **Step 3: Run tests to verify formatLogLine passes**

Run: `bun --bun vitest run src/__tests__/log-format.test.ts`
Expected: PASS — all tests pass with 4 levels

- [x] **Step 4: Commit**

```bash
git add src/logger.ts src/__tests__/log-format.test.ts
git commit -m "feat(core-logger): update LogLevel to 4 levels and formatLogLine labels"
```

---

### Task 1: Add LogEntry, LogSink interface, and rewrite Logger

**Wave:** 1
**Depends on:** Task 0

**Files:**
- Modify: `src/logger.ts:145-210` (Logger interface, createLogger, createNullLogger)
- Modify: `src/__tests__/logger.test.ts`

- [x] **Step 1: Write the updated test file for Logger, StdioSink, createNullLogger**

Replace `src/__tests__/logger.test.ts` with tests for:
- Logger interface (info, debug, warn, error, child — no log/detail/trace)
- Logger methods accept `(msg: string, data?: Record<string, unknown>)`
- Logger delegates ALL calls to sink without filtering
- LogEntry has level, timestamp, msg, data, context
- StdioSink gates verbosity (info level suppresses debug)
- StdioSink writes warn/error to stderr, info/debug to stdout
- child() merges context preserving epic > feature
- createNullLogger matches 4-level interface

```typescript
import { describe, test, expect } from "vitest";
import { createLogger, createNullLogger, createStdioSink } from "../logger";
import type { Logger, LogContext, LogEntry, LogSink } from "../logger";

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

/** Mock sink that captures all entries. */
function createMockSink(): LogSink & { entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  return {
    entries,
    write(entry: LogEntry) {
      entries.push(entry);
    },
  };
}

function captureStdio(fn: () => void): { stdout: string[]; stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const origStdout = process.stdout.write;
  const origStderr = process.stderr.write;
  process.stdout.write = ((chunk: string) => { stdout.push(chunk); return true; }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string) => { stderr.push(chunk); return true; }) as typeof process.stderr.write;
  try {
    fn();
  } finally {
    process.stdout.write = origStdout;
    process.stderr.write = origStderr;
  }
  return { stdout, stderr };
}

describe("Logger (with mock sink)", () => {
  test("exposes exactly info, debug, warn, error, child", () => {
    const sink = createMockSink();
    const logger = createLogger(sink);
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.child).toBe("function");
    // Old methods must NOT exist
    expect((logger as any).log).toBeUndefined();
    expect((logger as any).detail).toBeUndefined();
    expect((logger as any).trace).toBeUndefined();
  });

  test("delegates all calls to sink without filtering", () => {
    const sink = createMockSink();
    const logger = createLogger(sink);
    logger.info("a");
    logger.debug("b");
    logger.warn("c");
    logger.error("d");
    expect(sink.entries).toHaveLength(4);
    expect(sink.entries.map(e => e.level)).toEqual(["info", "debug", "warn", "error"]);
  });

  test("passes msg and data to sink", () => {
    const sink = createMockSink();
    const logger = createLogger(sink);
    logger.info("hello", { key: "value" });
    expect(sink.entries[0].msg).toBe("hello");
    expect(sink.entries[0].data).toEqual({ key: "value" });
  });

  test("data is optional (undefined when omitted)", () => {
    const sink = createMockSink();
    const logger = createLogger(sink);
    logger.info("hello");
    expect(sink.entries[0].data).toBeUndefined();
  });

  test("LogEntry includes timestamp", () => {
    const sink = createMockSink();
    const logger = createLogger(sink);
    const before = Date.now();
    logger.info("msg");
    const after = Date.now();
    expect(sink.entries[0].timestamp).toBeGreaterThanOrEqual(before);
    expect(sink.entries[0].timestamp).toBeLessThanOrEqual(after);
  });

  test("LogEntry includes context", () => {
    const sink = createMockSink();
    const ctx: LogContext = { phase: "plan", epic: "my-epic", feature: "auth" };
    const logger = createLogger(sink, ctx);
    logger.info("msg");
    expect(sink.entries[0].context).toEqual(ctx);
  });
});

describe("child logger", () => {
  test("merges parent and child context", () => {
    const sink = createMockSink();
    const logger = createLogger(sink, { phase: "plan", epic: "my-epic" });
    const child = logger.child({ feature: "auth" });
    child.info("msg");
    expect(sink.entries[0].context).toEqual({ phase: "plan", epic: "my-epic", feature: "auth" });
  });

  test("child context overrides parent fields", () => {
    const sink = createMockSink();
    const logger = createLogger(sink, { phase: "plan", epic: "old" });
    const child = logger.child({ epic: "new" });
    child.info("msg");
    expect(sink.entries[0].context.epic).toBe("new");
  });

  test("child does not modify parent context", () => {
    const sink = createMockSink();
    const logger = createLogger(sink, { phase: "plan", epic: "my-epic" });
    logger.child({ feature: "auth" });
    logger.info("msg");
    expect(sink.entries[0].context).toEqual({ phase: "plan", epic: "my-epic" });
  });

  test("child shares same sink", () => {
    const sink = createMockSink();
    const logger = createLogger(sink);
    const child = logger.child({ epic: "e" });
    logger.info("parent");
    child.info("child");
    expect(sink.entries).toHaveLength(2);
  });
});

describe("StdioSink", () => {
  test("info level: info writes to stdout", () => {
    const sink = createStdioSink(0);
    const { stdout, stderr } = captureStdio(() => {
      sink.write({ level: "info", timestamp: Date.now(), msg: "visible", context: { phase: "test" } });
    });
    expect(stdout).toHaveLength(1);
    expect(stderr).toHaveLength(0);
    expect(stripAnsi(stdout[0])).toContain("visible");
  });

  test("info level: debug is suppressed", () => {
    const sink = createStdioSink(0);
    const { stdout, stderr } = captureStdio(() => {
      sink.write({ level: "debug", timestamp: Date.now(), msg: "hidden", context: {} });
    });
    expect(stdout).toHaveLength(0);
    expect(stderr).toHaveLength(0);
  });

  test("debug level (-v): debug writes to stdout", () => {
    const sink = createStdioSink(1);
    const { stdout } = captureStdio(() => {
      sink.write({ level: "debug", timestamp: Date.now(), msg: "visible", context: {} });
    });
    expect(stdout).toHaveLength(1);
    expect(stripAnsi(stdout[0])).toContain("visible");
  });

  test("warn writes to stderr at any verbosity", () => {
    const sink = createStdioSink(0);
    const { stdout, stderr } = captureStdio(() => {
      sink.write({ level: "warn", timestamp: Date.now(), msg: "warning", context: { phase: "test" } });
    });
    expect(stdout).toHaveLength(0);
    expect(stderr).toHaveLength(1);
    expect(stripAnsi(stderr[0])).toContain("warning");
  });

  test("error writes to stderr at any verbosity", () => {
    const sink = createStdioSink(0);
    const { stdout, stderr } = captureStdio(() => {
      sink.write({ level: "error", timestamp: Date.now(), msg: "bad", context: { phase: "test" } });
    });
    expect(stdout).toHaveLength(0);
    expect(stderr).toHaveLength(1);
    expect(stripAnsi(stderr[0])).toContain("bad");
  });

  test("output includes formatted log line", () => {
    const sink = createStdioSink(0);
    const { stdout } = captureStdio(() => {
      sink.write({ level: "info", timestamp: Date.now(), msg: "hello", context: { phase: "plan", epic: "test" } });
    });
    const line = stripAnsi(stdout[0]);
    expect(line).toMatch(/^\[\d{2}:\d{2}:\d{2}\] INFO\s+plan\s+\(test\):\s+hello\n$/);
  });
});

describe("createNullLogger", () => {
  test("exposes 4-level interface", () => {
    const l = createNullLogger();
    expect(typeof l.info).toBe("function");
    expect(typeof l.debug).toBe("function");
    expect(typeof l.warn).toBe("function");
    expect(typeof l.error).toBe("function");
    expect(typeof l.child).toBe("function");
    // Old methods must NOT exist
    expect((l as any).log).toBeUndefined();
    expect((l as any).detail).toBeUndefined();
    expect((l as any).trace).toBeUndefined();
  });

  test("suppresses all output", () => {
    const { stdout, stderr } = captureStdio(() => {
      const l = createNullLogger();
      l.info("x"); l.debug("x"); l.warn("x"); l.error("x");
    });
    expect(stdout).toHaveLength(0);
    expect(stderr).toHaveLength(0);
  });

  test("child() returns a logger with 4-level interface", () => {
    const child = createNullLogger().child({ phase: "test" });
    expect(typeof child.info).toBe("function");
    expect(typeof child.debug).toBe("function");
    expect(typeof child.warn).toBe("function");
    expect(typeof child.error).toBe("function");
    expect(typeof child.child).toBe("function");
  });

  test("child also suppresses all output", () => {
    const { stdout, stderr } = captureStdio(() => {
      const child = createNullLogger().child({ phase: "test" });
      child.info("x"); child.debug("x"); child.warn("x"); child.error("x");
    });
    expect(stdout).toHaveLength(0);
    expect(stderr).toHaveLength(0);
  });
});
```

- [x] **Step 2: Rewrite Logger interface, add LogEntry, LogSink, StdioSink, update createLogger and createNullLogger in logger.ts**

Replace the Logger interface, factory, and null logger sections of `src/logger.ts` (lines 145-210) with:

```typescript
// ---------------------------------------------------------------------------
// LogEntry — structured record passed to sinks
// ---------------------------------------------------------------------------

export interface LogEntry {
  level: LogLevel;
  timestamp: number;
  msg: string;
  data?: Record<string, unknown>;
  context: LogContext;
}

// ---------------------------------------------------------------------------
// LogSink — single contract for all transports
// ---------------------------------------------------------------------------

export interface LogSink {
  write(entry: LogEntry): void;
}

// ---------------------------------------------------------------------------
// Logger interface and factory
// ---------------------------------------------------------------------------

/** Logger instance — 4 levels, delegates to injected sink. */
export interface Logger {
  info(msg: string, data?: Record<string, unknown>): void;
  debug(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  child(ctx: Partial<LogContext>): Logger;
}

/**
 * Create a logger that delegates all calls to the given sink.
 * No verbosity gating — sinks decide what to show.
 */
export function createLogger(sink: LogSink, context?: LogContext): Logger {
  const ctx = context ?? {};

  function emit(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
    sink.write({ level, timestamp: Date.now(), msg, data, context: ctx });
  }

  return {
    info(msg: string, data?: Record<string, unknown>) { emit("info", msg, data); },
    debug(msg: string, data?: Record<string, unknown>) { emit("debug", msg, data); },
    warn(msg: string, data?: Record<string, unknown>) { emit("warn", msg, data); },
    error(msg: string, data?: Record<string, unknown>) { emit("error", msg, data); },
    child(childCtx: Partial<LogContext>): Logger {
      return createLogger(sink, { ...ctx, ...childCtx });
    },
  };
}

// ---------------------------------------------------------------------------
// StdioSink — default CLI transport
// ---------------------------------------------------------------------------

/**
 * Create a StdioSink that writes formatted log lines to stdout/stderr.
 *
 * Verbosity gating:
 * - verbosity 0 (info): debug entries suppressed
 * - verbosity 1 (debug / -v flag): all entries pass through
 * - warn/error always shown
 */
export function createStdioSink(verbosity: number): LogSink {
  return {
    write(entry: LogEntry): void {
      // Verbosity gating: debug suppressed at info level
      if (entry.level === "debug" && verbosity < 1) return;

      const line = formatLogLine(entry.level, entry.context, entry.msg) + "\n";
      if (entry.level === "warn" || entry.level === "error") {
        process.stderr.write(line);
      } else {
        process.stdout.write(line);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Null logger — suppresses all output
// ---------------------------------------------------------------------------

/** Create a no-op logger that suppresses all output. Useful for tests. */
export function createNullLogger(): Logger {
  const noop = (() => {}) as (msg: string, data?: Record<string, unknown>) => void;
  const nl: Logger = {
    info: noop,
    debug: noop,
    warn: noop,
    error: noop,
    child: () => nl,
  };
  return nl;
}
```

- [x] **Step 3: Run tests to verify all pass**

Run: `bun --bun vitest run src/__tests__/logger.test.ts src/__tests__/log-format.test.ts`
Expected: PASS — all tests pass

- [x] **Step 4: Commit**

```bash
git add src/logger.ts src/__tests__/logger.test.ts
git commit -m "feat(core-logger): add LogEntry, LogSink, StdioSink, rewrite Logger to 4-level interface"
```

---

### Task 2: Verify full test suite

**Wave:** 2
**Depends on:** Task 0, Task 1

**Files:**
- Test: `src/__tests__/logger.test.ts`
- Test: `src/__tests__/log-format.test.ts`

- [x] **Step 1: Run the full logger test suite**

Run: `bun --bun vitest run src/__tests__/logger.test.ts src/__tests__/log-format.test.ts`
Expected: PASS — all tests pass

- [x] **Step 2: Run TypeScript type check**

Run: `bun x tsc --noEmit`
Expected: Type errors are expected in files that import the old Logger interface (tree-logger.ts, dashboard-logger.ts, verbosity.ts, etc.) — these will be updated in wave 3 features. Verify that `src/logger.ts` itself has no type errors.

- [x] **Step 3: Commit (if any fixes needed)**

Only commit if Step 1 or Step 2 required changes.
