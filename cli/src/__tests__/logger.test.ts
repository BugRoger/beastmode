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
