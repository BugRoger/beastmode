import { describe, test, expect } from "vitest";
import { toFlatTreeState } from "../tree-view/adapter.js";
import { createTreeState, addEntry, openPhase } from "../tree-view/tree-state.js";


describe("toFlatTreeState", () => {
  test("converts empty state", () => {
    const state = createTreeState();
    const flat = toFlatTreeState(state);
    expect(flat.epics).toEqual([]);
    expect(flat.system).toEqual([]);
  });

  test("converts system entries", () => {
    const state = createTreeState();
    addEntry(state, "info", {}, "system message");
    const flat = toFlatTreeState(state);
    expect(flat.system.length).toBe(1);
    expect(flat.system[0].message).toBe("system message");
    expect(flat.system[0].level).toBe("info");
    expect(typeof flat.system[0].seq).toBe("number");
  });

  test("converts epic with phase entries", () => {
    const state = createTreeState();
    openPhase(state, "my-epic", "plan");
    addEntry(state, "info", { epic: "my-epic", phase: "plan" }, "planning stuff");
    const flat = toFlatTreeState(state);
    expect(flat.epics.length).toBe(1);
    expect(flat.epics[0].slug).toBe("my-epic");
    expect(flat.epics[0].phases.length).toBe(1);
    expect(flat.epics[0].phases[0].phase).toBe("plan");
    expect(flat.epics[0].phases[0].entries.length).toBe(1);
    expect(flat.epics[0].phases[0].entries[0].message).toBe("planning stuff");
  });

  test("converts epic with feature entries", () => {
    const state = createTreeState();
    openPhase(state, "my-epic", "implement");
    addEntry(state, "info", { epic: "my-epic", phase: "implement", feature: "feat-a" }, "coding");
    const flat = toFlatTreeState(state);
    const phase = flat.epics[0].phases[0];
    expect(phase.features.length).toBe(1);
    expect(phase.features[0].slug).toBe("feat-a");
    expect(phase.features[0].entries.length).toBe(1);
    expect(phase.features[0].entries[0].message).toBe("coding");
  });

  test("preserves entry ordering via seq", () => {
    const state = createTreeState();
    openPhase(state, "my-epic", "plan");
    addEntry(state, "info", { epic: "my-epic", phase: "plan" }, "first");
    addEntry(state, "info", { epic: "my-epic", phase: "plan" }, "second");
    const flat = toFlatTreeState(state);
    const entries = flat.epics[0].phases[0].entries;
    expect(entries[0].seq).toBeLessThan(entries[1].seq);
  });

  test("handles multiple epics", () => {
    const state = createTreeState();
    openPhase(state, "epic-a", "plan");
    openPhase(state, "epic-b", "implement");
    addEntry(state, "info", { epic: "epic-a", phase: "plan" }, "a-msg");
    addEntry(state, "info", { epic: "epic-b", phase: "implement" }, "b-msg");
    const flat = toFlatTreeState(state);
    expect(flat.epics.length).toBe(2);
    expect(flat.epics[0].slug).toBe("epic-a");
    expect(flat.epics[1].slug).toBe("epic-b");
  });
});
