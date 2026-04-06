import { describe, test, expect } from "vitest";
import {
  lifecycleToLogEntry,
  FallbackEntryStore,
} from "../dashboard/lifecycle-entries.js";

describe("lifecycleToLogEntry", () => {
  test("session-started produces 'dispatching' text entry with sessionId", () => {
    const entries = lifecycleToLogEntry("session-started", {
      epicSlug: "my-epic",
      featureSlug: undefined,
      phase: "plan",
      sessionId: "s-1",
    });

    const arr = entries as Array<{ type: string; text: string; timestamp: number }>;
    expect(arr[0].type).toBe("text");
    expect(arr[0].text).toBe("dispatching");
    expect(arr[0].timestamp).toBeGreaterThan(0);
    expect(arr[1].type).toBe("text");
    expect(arr[1].text).toContain("session: s-1");
  });

  test("session-started has debug level", () => {
    const entries = lifecycleToLogEntry("session-started", {
      epicSlug: "my-epic",
      featureSlug: undefined,
      phase: "plan",
      sessionId: "s-1",
    });
    const arr = entries as Array<{ level: string }>;
    expect(arr[0].level).toBe("info");
    expect(arr[1].level).toBe("debug");
  });

  test("session-completed success has debug level", () => {
    const entry = lifecycleToLogEntry("session-completed", {
      epicSlug: "my-epic",
      featureSlug: undefined,
      phase: "plan",
      success: true,
      durationMs: 5000,
    });
    expect(entry.level).toBe("debug");
  });

  test("session-completed failure has error level", () => {
    const entry = lifecycleToLogEntry("session-completed", {
      epicSlug: "my-epic",
      featureSlug: undefined,
      phase: "plan",
      success: false,
      durationMs: 3000,
    });
    expect(entry.level).toBe("error");
  });

  test("session-dead has warn level", () => {
    const entry = lifecycleToLogEntry("session-dead", {
      epicSlug: "my-epic",
      phase: "implement",
      tty: "/dev/ttys001",
      sessionId: "s-1",
    });
    expect(entry.level).toBe("warn");
  });

  test("epic-blocked has warn level", () => {
    const entry = lifecycleToLogEntry("epic-blocked", {
      epicSlug: "my-epic",
      gate: "validate",
      reason: "tests failing",
    });
    expect(entry.level).toBe("warn");
  });

  test("release:held has warn level", () => {
    const entry = lifecycleToLogEntry("release:held", {
      waitingSlug: "e1",
      blockingSlug: "e2",
    });
    expect(entry.level).toBe("warn");
  });

  test("error has error level", () => {
    const entry = lifecycleToLogEntry("error", {
      epicSlug: "my-epic",
      message: "boom",
    });
    expect(entry.level).toBe("error");
  });

  test("epic-cancelled has info level", () => {
    const entry = lifecycleToLogEntry("epic-cancelled", {
      epicSlug: "my-epic",
    });
    expect(entry.level).toBe("info");
  });

  test("session-completed success produces 'completed' text entry", () => {
    const entry = lifecycleToLogEntry("session-completed", {
      epicSlug: "my-epic",
      featureSlug: undefined,
      phase: "plan",
      success: true,
      durationMs: 5000,
    });

    expect(entry.type).toBe("text");
    expect(entry.text).toBe("completed (5s)");
  });

  test("session-completed with cost includes cost in text", () => {
    const entry = lifecycleToLogEntry("session-completed", {
      epicSlug: "my-epic",
      featureSlug: undefined,
      phase: "plan",
      success: true,
      durationMs: 12000,
      costUsd: 1.23,
    });

    expect(entry.text).toBe("completed ($1.23, 12s)");
  });

  test("session-completed failure produces 'failed' text entry", () => {
    const entry = lifecycleToLogEntry("session-completed", {
      epicSlug: "my-epic",
      featureSlug: undefined,
      phase: "plan",
      success: false,
      durationMs: 3000,
    });

    expect(entry.type).toBe("result");
    expect(entry.text).toContain("failed");
  });

  test("error produces error text entry", () => {
    const entry = lifecycleToLogEntry("error", {
      epicSlug: "my-epic",
      message: "SDK import failed",
    });

    expect(entry.type).toBe("result");
    expect(entry.text).toBe("error: SDK import failed");
  });
});

describe("FallbackEntryStore", () => {
  test("stores entries keyed by session composite key", () => {
    const store = new FallbackEntryStore();

    store.push("my-epic", "plan", undefined, {
      type: "text",
      timestamp: 1000,
      text: "dispatching",
    });

    const entries = store.get("my-epic", "plan", undefined);
    expect(entries).toHaveLength(1);
    expect(entries[0].text).toBe("dispatching");
    expect(entries[0].seq).toBe(0);
  });

  test("assigns monotonic seq numbers per key", () => {
    const store = new FallbackEntryStore();
    const key = { epic: "e", phase: "p", feature: undefined };

    store.push(key.epic, key.phase, key.feature, {
      type: "text", timestamp: 1000, text: "first",
    });
    store.push(key.epic, key.phase, key.feature, {
      type: "text", timestamp: 2000, text: "second",
    });

    const entries = store.get(key.epic, key.phase, key.feature);
    expect(entries[0].seq).toBe(0);
    expect(entries[1].seq).toBe(1);
  });

  test("returns empty array for unknown key", () => {
    const store = new FallbackEntryStore();
    expect(store.get("nope", "plan", undefined)).toEqual([]);
  });

  test("separate keys for feature vs no-feature sessions", () => {
    const store = new FallbackEntryStore();

    store.push("e", "implement", "feat-a", {
      type: "text", timestamp: 1000, text: "a",
    });
    store.push("e", "implement", undefined, {
      type: "text", timestamp: 1000, text: "b",
    });

    expect(store.get("e", "implement", "feat-a")).toHaveLength(1);
    expect(store.get("e", "implement", undefined)).toHaveLength(1);
  });

  test("LogEntry level field is optional and preserved by store", () => {
    const store = new FallbackEntryStore();
    store.push("e", "plan", undefined, {
      type: "text",
      timestamp: 1000,
      text: "test",
      level: "debug",
    });
    const entries = store.get("e", "plan", undefined);
    expect(entries[0]).toHaveProperty("level", "debug");
  });

  test("revision increments on each push", () => {
    const store = new FallbackEntryStore();
    const r0 = store.revision;

    store.push("e", "p", undefined, {
      type: "text", timestamp: 1000, text: "x",
    });

    expect(store.revision).toBe(r0 + 1);
  });
});
