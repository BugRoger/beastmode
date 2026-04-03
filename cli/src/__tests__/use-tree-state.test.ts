import { describe, test, expect } from "bun:test";
import { createTreeState, addEntry, openPhase, closePhase } from "../tree-view/tree-state.js";
import { TreeLogger } from "../tree-view/tree-logger.js";

/**
 * These tests validate the integration between TreeLogger and tree-state,
 * which is the core logic behind useTreeState. The React hook layer adds
 * only a revision bump for re-renders — tested via Ink snapshot tests later.
 */
describe("useTreeState integration", () => {
  test("TreeLogger with notify callback simulates hook re-render trigger", () => {
    const state = createTreeState();
    let renderCount = 0;
    const notify = () => { renderCount++; };

    const logger = new TreeLogger(state, 0, { epic: "e" }, notify);
    logger.log("a");
    logger.log("b");

    expect(renderCount).toBe(2);
    expect(state.epics[0].entries).toHaveLength(2);
  });

  test("createLogger from state produces working TreeLogger", () => {
    const state = createTreeState();
    let renderCount = 0;
    const notify = () => { renderCount++; };

    const logger = new TreeLogger(state, 0, { epic: "my-epic", phase: "plan" }, notify);
    logger.log("msg");

    expect(state.epics[0].children[0].entries[0].message).toBe("msg");
    expect(renderCount).toBe(1);
  });

  test("openPhase + addEntry integration", () => {
    const state = createTreeState();
    openPhase(state, "e", "plan");
    addEntry(state, "info", { epic: "e", phase: "plan" }, "msg");

    expect(state.epics[0].children[0].entries).toHaveLength(1);
    expect(state.epics[0].children[0].closed).toBe(false);
  });

  test("phase auto-close on openPhase", () => {
    const state = createTreeState();
    openPhase(state, "e", "plan");
    addEntry(state, "info", { epic: "e", phase: "plan" }, "planning");
    openPhase(state, "e", "implement");
    addEntry(state, "info", { epic: "e", phase: "implement" }, "implementing");

    expect(state.epics[0].children[0].closed).toBe(true);  // plan closed
    expect(state.epics[0].children[1].closed).toBe(false);  // implement open
  });

  test("closePhase marks phase closed", () => {
    const state = createTreeState();
    openPhase(state, "e", "plan");
    closePhase(state, "e", "plan");

    expect(state.epics[0].children[0].closed).toBe(true);
  });
});
