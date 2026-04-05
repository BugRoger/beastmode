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

    expect(fallbackStore.revision).toBe(0);
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
