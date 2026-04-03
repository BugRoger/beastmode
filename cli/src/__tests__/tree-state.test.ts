import { describe, test, expect } from "bun:test";
import {
  createTreeState,
  addEntry,
  openPhase,
  closePhase,
} from "../tree-view/tree-state.js";
import type { TreeState } from "../tree-view/types.js";

describe("createTreeState", () => {
  test("returns empty tree state", () => {
    const state = createTreeState();
    expect(state.epics).toEqual([]);
    expect(state.systemEntries).toEqual([]);
  });
});

describe("addEntry", () => {
  test("system message (no epic) goes to systemEntries", () => {
    const state = createTreeState();
    addEntry(state, "info", {}, "startup message");
    expect(state.systemEntries).toHaveLength(1);
    expect(state.systemEntries[0].message).toBe("startup message");
    expect(state.systemEntries[0].level).toBe("info");
    expect(state.epics).toHaveLength(0);
  });

  test("epic-only context creates epic node and adds entry", () => {
    const state = createTreeState();
    addEntry(state, "info", { epic: "my-epic" }, "epic message");
    expect(state.epics).toHaveLength(1);
    expect(state.epics[0].label).toBe("my-epic");
    expect(state.epics[0].type).toBe("epic");
    expect(state.epics[0].entries).toHaveLength(1);
    expect(state.epics[0].entries[0].message).toBe("epic message");
  });

  test("phase context creates epic > phase and adds entry there", () => {
    const state = createTreeState();
    addEntry(state, "info", { epic: "my-epic", phase: "plan" }, "phase message");
    expect(state.epics).toHaveLength(1);
    const epic = state.epics[0];
    expect(epic.children).toHaveLength(1);
    expect(epic.children[0].label).toBe("plan");
    expect(epic.children[0].type).toBe("phase");
    expect(epic.children[0].entries).toHaveLength(1);
    expect(epic.children[0].entries[0].message).toBe("phase message");
  });

  test("feature context creates epic > phase > feature and adds entry", () => {
    const state = createTreeState();
    addEntry(state, "info", { epic: "my-epic", phase: "implement", feature: "auth" }, "feature message");
    expect(state.epics).toHaveLength(1);
    const phase = state.epics[0].children[0];
    expect(phase.children).toHaveLength(1);
    expect(phase.children[0].label).toBe("auth");
    expect(phase.children[0].type).toBe("feature");
    expect(phase.children[0].entries).toHaveLength(1);
  });

  test("reuses existing epic node for same epic", () => {
    const state = createTreeState();
    addEntry(state, "info", { epic: "my-epic" }, "first");
    addEntry(state, "info", { epic: "my-epic" }, "second");
    expect(state.epics).toHaveLength(1);
    expect(state.epics[0].entries).toHaveLength(2);
  });

  test("different epics create separate nodes in insertion order", () => {
    const state = createTreeState();
    addEntry(state, "info", { epic: "alpha" }, "a");
    addEntry(state, "info", { epic: "beta" }, "b");
    expect(state.epics).toHaveLength(2);
    expect(state.epics[0].label).toBe("alpha");
    expect(state.epics[1].label).toBe("beta");
  });

  test("reuses existing phase node under same epic", () => {
    const state = createTreeState();
    addEntry(state, "info", { epic: "e", phase: "plan" }, "first");
    addEntry(state, "info", { epic: "e", phase: "plan" }, "second");
    expect(state.epics[0].children).toHaveLength(1);
    expect(state.epics[0].children[0].entries).toHaveLength(2);
  });

  test("different phases under same epic create separate nodes", () => {
    const state = createTreeState();
    addEntry(state, "info", { epic: "e", phase: "plan" }, "a");
    addEntry(state, "info", { epic: "e", phase: "implement" }, "b");
    expect(state.epics[0].children).toHaveLength(2);
    expect(state.epics[0].children[0].label).toBe("plan");
    expect(state.epics[0].children[1].label).toBe("implement");
  });

  test("entry has auto-generated id and timestamp", () => {
    const state = createTreeState();
    const before = Date.now();
    addEntry(state, "warn", { epic: "e" }, "msg");
    const after = Date.now();
    const entry = state.epics[0].entries[0];
    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toBeGreaterThanOrEqual(before);
    expect(entry.timestamp).toBeLessThanOrEqual(after);
  });

  test("preserves verbosity levels in entry", () => {
    const state = createTreeState();
    addEntry(state, "error", { epic: "e" }, "bad");
    expect(state.epics[0].entries[0].level).toBe("error");
  });
});

describe("openPhase", () => {
  test("creates a new phase node under epic", () => {
    const state = createTreeState();
    openPhase(state, "my-epic", "plan");
    expect(state.epics).toHaveLength(1);
    expect(state.epics[0].children).toHaveLength(1);
    expect(state.epics[0].children[0].label).toBe("plan");
    expect(state.epics[0].children[0].closed).toBe(false);
  });

  test("auto-closes prior open phase for same epic", () => {
    const state = createTreeState();
    openPhase(state, "my-epic", "plan");
    openPhase(state, "my-epic", "implement");
    const epic = state.epics[0];
    expect(epic.children).toHaveLength(2);
    expect(epic.children[0].closed).toBe(true);
    expect(epic.children[1].closed).toBe(false);
  });

  test("does not close phases on different epics", () => {
    const state = createTreeState();
    openPhase(state, "alpha", "plan");
    openPhase(state, "beta", "plan");
    expect(state.epics[0].children[0].closed).toBe(false);
    expect(state.epics[1].children[0].closed).toBe(false);
  });
});

describe("closePhase", () => {
  test("marks the specified phase as closed", () => {
    const state = createTreeState();
    openPhase(state, "my-epic", "plan");
    closePhase(state, "my-epic", "plan");
    expect(state.epics[0].children[0].closed).toBe(true);
  });

  test("no-op if phase does not exist", () => {
    const state = createTreeState();
    closePhase(state, "nonexistent", "plan");
    expect(state.epics).toHaveLength(0);
  });
});
