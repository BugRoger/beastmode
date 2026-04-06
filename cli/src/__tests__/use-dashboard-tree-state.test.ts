import { describe, test, expect } from "vitest";
import { buildTreeState } from "../dashboard/hooks/use-dashboard-tree-state.js";
import type { LogEntry } from "../dispatch/factory.js";
import { FallbackEntryStore } from "../dashboard/lifecycle-entries.js";

describe("useDashboardTreeState — buildTreeState", () => {
  function makeEntry(seq: number, timestamp: number, text: string, type: LogEntry["type"] = "text"): LogEntry {
    return { seq, timestamp, type, text };
  }

  test("single session produces epic with entries (no phase level)", () => {
    const sessions = [{ epicSlug: "my-epic", phase: "plan" }];
    const entries = [
      makeEntry(0, 1000, "planning started"),
      makeEntry(1, 2000, "planning done"),
    ];

    const state = buildTreeState(sessions, () => entries);

    expect(state.epics).toHaveLength(1);
    expect(state.epics[0].slug).toBe("my-epic");
    expect(state.epics[0].entries).toHaveLength(2);
    expect(state.epics[0].entries[0].message).toBe("planning started");
    expect(state.epics[0].entries[0].phase).toBe("plan");
  });

  test("session with featureSlug creates feature node under epic", () => {
    const sessions = [{ epicSlug: "my-epic", phase: "implement", featureSlug: "auth-flow" }];
    const entries = [makeEntry(0, 1000, "writing tests")];

    const state = buildTreeState(sessions, () => entries);

    expect(state.epics[0].features).toHaveLength(1);
    expect(state.epics[0].features[0].slug).toBe("auth-flow");
    expect(state.epics[0].features[0].entries).toHaveLength(1);
  });

  test("multiple sessions for same epic merge into one epic node", () => {
    const sessions = [
      { epicSlug: "my-epic", phase: "implement", featureSlug: "feat-a" },
      { epicSlug: "my-epic", phase: "implement", featureSlug: "feat-b" },
    ];

    const state = buildTreeState(sessions, () => [makeEntry(0, 1000, "msg")]);

    expect(state.epics).toHaveLength(1);
    expect(state.epics[0].features).toHaveLength(2);
  });

  test("sessions for different epics produce separate epic nodes", () => {
    const sessions = [
      { epicSlug: "epic-a", phase: "plan" },
      { epicSlug: "epic-b", phase: "validate" },
    ];

    const state = buildTreeState(sessions, () => [makeEntry(0, 1000, "msg")]);

    expect(state.epics).toHaveLength(2);
    expect(state.epics[0].slug).toBe("epic-a");
    expect(state.epics[1].slug).toBe("epic-b");
  });

  test("entries sorted by timestamp then seq within each node", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const entries = [
      makeEntry(1, 2000, "second"),
      makeEntry(0, 1000, "first"),
    ];

    const state = buildTreeState(sessions, () => entries);

    expect(state.epics[0].entries[0].message).toBe("first");
    expect(state.epics[0].entries[1].message).toBe("second");
  });

  test("error entries detected from result type with error text", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const entries = [makeEntry(0, 1000, "session failed with error", "result")];

    const state = buildTreeState(sessions, () => entries);

    expect(state.epics[0].entries[0].level).toBe("error");
  });

  test("non-error result entries are info level", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const entries = [makeEntry(0, 1000, "completed successfully", "result")];

    const state = buildTreeState(sessions, () => entries);

    expect(state.epics[0].entries[0].level).toBe("info");
  });

  test("empty sessions produce empty state", () => {
    const state = buildTreeState([], () => []);
    expect(state.epics).toHaveLength(0);
    expect(state.cli.entries).toHaveLength(0);
  });

  test("multiple phases for same epic merge entries into one epic node", () => {
    const sessions = [
      { epicSlug: "e", phase: "plan" },
      { epicSlug: "e", phase: "implement" },
    ];

    const state = buildTreeState(sessions, () => [makeEntry(0, 1000, "msg")]);

    // Both sessions merge into one epic — phase is a label, not a tree level
    expect(state.epics).toHaveLength(1);
    expect(state.epics[0].entries).toHaveLength(2);
    expect(state.epics[0].entries[0].phase).toBe("plan");
    expect(state.epics[0].entries[1].phase).toBe("implement");
  });
});

describe("buildTreeState with fallback entries", () => {
  function makeEntry(seq: number, timestamp: number, text: string, type: LogEntry["type"] = "text"): LogEntry {
    return { seq, timestamp, type, text };
  }

  test("session without events uses fallbackEntries when provided", () => {
    const store = new FallbackEntryStore();
    store.push("my-epic", "plan", undefined, {
      type: "text", timestamp: 1000, text: "dispatching",
    });

    const sessions = [{ epicSlug: "my-epic", phase: "plan" }];
    const state = buildTreeState(
      sessions,
      () => [],
      store,
    );

    expect(state.epics[0].entries).toHaveLength(1);
    expect(state.epics[0].entries[0].message).toBe("dispatching");
  });

  test("session with SDK entries ignores fallbackEntries", () => {
    const store = new FallbackEntryStore();
    store.push("my-epic", "plan", undefined, {
      type: "text", timestamp: 1000, text: "dispatching",
    });

    const sdkEntries = [makeEntry(0, 2000, "streaming message")];
    const sessions = [{ epicSlug: "my-epic", phase: "plan" }];
    const state = buildTreeState(
      sessions,
      () => sdkEntries,
      store,
    );

    expect(state.epics[0].entries).toHaveLength(1);
    expect(state.epics[0].entries[0].message).toBe("streaming message");
  });

  test("fallback entries for feature session appear under feature node", () => {
    const store = new FallbackEntryStore();
    store.push("my-epic", "implement", "auth-flow", {
      type: "text", timestamp: 1000, text: "dispatching",
    });

    const sessions = [{ epicSlug: "my-epic", phase: "implement", featureSlug: "auth-flow" }];
    const state = buildTreeState(
      sessions,
      () => [],
      store,
    );

    expect(state.epics[0].features[0].entries).toHaveLength(1);
    expect(state.epics[0].features[0].entries[0].message).toBe("dispatching");
  });

  test("no fallbackEntries param behaves same as before (backward compat)", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const state = buildTreeState(sessions, () => []);
    expect(state.epics[0].entries).toHaveLength(0);
  });
});

describe("entryTypeToLevel respects explicit level", () => {
  function makeEntryWithLevel(
    type: "text" | "tool-start" | "tool-result" | "heartbeat" | "result",
    level: "info" | "debug" | "warn" | "error",
  ) {
    return { seq: 0, timestamp: 1000, type, text: "test", level };
  }

  test("text entry with explicit debug level produces debug tree entry", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const entries = [makeEntryWithLevel("text", "debug")];
    const state = buildTreeState(sessions, () => entries);
    expect(state.epics[0].entries[0].level).toBe("debug");
  });

  test("text entry with explicit warn level produces warn tree entry", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const entries = [makeEntryWithLevel("text", "warn")];
    const state = buildTreeState(sessions, () => entries);
    expect(state.epics[0].entries[0].level).toBe("warn");
  });

  test("result entry with explicit warn level uses explicit level not type inference", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const entries = [makeEntryWithLevel("result", "warn")];
    const state = buildTreeState(sessions, () => entries);
    expect(state.epics[0].entries[0].level).toBe("warn");
  });

  test("entry without explicit level falls back to type-based inference", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const entries = [{ seq: 0, timestamp: 1000, type: "text" as const, text: "test" }];
    const state = buildTreeState(sessions, () => entries);
    expect(state.epics[0].entries[0].level).toBe("info");
  });
});
