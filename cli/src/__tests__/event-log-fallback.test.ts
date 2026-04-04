import { describe, test, expect } from "bun:test";
import {
  lifecycleToLogEntry,
  FallbackEntryStore,
} from "../dashboard/lifecycle-entries.js";

describe("lifecycleToLogEntry", () => {
  test("session-started produces 'dispatching' text entry", () => {
    const entry = lifecycleToLogEntry("session-started", {
      epicSlug: "my-epic",
      featureSlug: undefined,
      phase: "plan",
      sessionId: "s-1",
    });

    expect(entry.type).toBe("text");
    expect(entry.text).toBe("dispatching");
    expect(entry.timestamp).toBeGreaterThan(0);
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

  test("revision increments on each push", () => {
    const store = new FallbackEntryStore();
    const r0 = store.revision;

    store.push("e", "p", undefined, {
      type: "text", timestamp: 1000, text: "x",
    });

    expect(store.revision).toBe(r0 + 1);
  });
});
