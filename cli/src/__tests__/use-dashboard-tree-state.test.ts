import { describe, test, expect } from "vitest";
import { buildTreeState } from "../dashboard/hooks/use-dashboard-tree-state.js";
import type { LogEntry } from "../dispatch/factory.js";

describe("useDashboardTreeState — buildTreeState", () => {
  function makeEntry(seq: number, timestamp: number, text: string, type: LogEntry["type"] = "text"): LogEntry {
    return { seq, timestamp, type, text };
  }

  test("single session produces epic > phase with entries", () => {
    const sessions = [{ epicSlug: "my-epic", phase: "plan" }];
    const entries = [
      makeEntry(0, 1000, "planning started"),
      makeEntry(1, 2000, "planning done"),
    ];

    const state = buildTreeState(sessions, () => entries);

    expect(state.epics).toHaveLength(1);
    expect(state.epics[0].slug).toBe("my-epic");
    expect(state.epics[0].phases).toHaveLength(1);
    expect(state.epics[0].phases[0].phase).toBe("plan");
    expect(state.epics[0].phases[0].entries).toHaveLength(2);
    expect(state.epics[0].phases[0].entries[0].message).toBe("planning started");
  });

  test("session with featureSlug creates feature node under phase", () => {
    const sessions = [{ epicSlug: "my-epic", phase: "implement", featureSlug: "auth-flow" }];
    const entries = [makeEntry(0, 1000, "writing tests")];

    const state = buildTreeState(sessions, () => entries);

    expect(state.epics[0].phases[0].features).toHaveLength(1);
    expect(state.epics[0].phases[0].features[0].slug).toBe("auth-flow");
    expect(state.epics[0].phases[0].features[0].entries).toHaveLength(1);
  });

  test("multiple sessions for same epic merge into one epic node", () => {
    const sessions = [
      { epicSlug: "my-epic", phase: "implement", featureSlug: "feat-a" },
      { epicSlug: "my-epic", phase: "implement", featureSlug: "feat-b" },
    ];

    const state = buildTreeState(sessions, () => [makeEntry(0, 1000, "msg")]);

    expect(state.epics).toHaveLength(1);
    expect(state.epics[0].phases[0].features).toHaveLength(2);
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

    expect(state.epics[0].phases[0].entries[0].message).toBe("first");
    expect(state.epics[0].phases[0].entries[1].message).toBe("second");
  });

  test("error entries detected from result type with error text", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const entries = [makeEntry(0, 1000, "session failed with error", "result")];

    const state = buildTreeState(sessions, () => entries);

    expect(state.epics[0].phases[0].entries[0].level).toBe("error");
  });

  test("non-error result entries are info level", () => {
    const sessions = [{ epicSlug: "e", phase: "plan" }];
    const entries = [makeEntry(0, 1000, "completed successfully", "result")];

    const state = buildTreeState(sessions, () => entries);

    expect(state.epics[0].phases[0].entries[0].level).toBe("info");
  });

  test("empty sessions produce empty state", () => {
    const state = buildTreeState([], () => []);
    expect(state.epics).toHaveLength(0);
    expect(state.system).toHaveLength(0);
  });

  test("multiple phases for same epic produce multiple phase nodes", () => {
    const sessions = [
      { epicSlug: "e", phase: "plan" },
      { epicSlug: "e", phase: "implement" },
    ];

    const state = buildTreeState(sessions, () => [makeEntry(0, 1000, "msg")]);

    expect(state.epics[0].phases).toHaveLength(2);
    expect(state.epics[0].phases[0].phase).toBe("plan");
    expect(state.epics[0].phases[1].phase).toBe("implement");
  });
});
