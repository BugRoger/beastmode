import { describe, test, expect } from "vitest";
import { createTreeState, addEntry, openPhase, closePhase } from "../tree-view/tree-state.js";
import { createTreeSink } from "../tree-view/tree-sink.js";
import { createLogger } from "../logger.js";

describe("useTreeState integration", () => {
  test("TreeSink with notify callback simulates hook re-render trigger", () => {
    const state = createTreeState();
    let renderCount = 0;
    const notify = () => { renderCount++; };

    const sink = createTreeSink(state, 0, notify);
    const logger = createLogger(sink, { epic: "e" });
    logger.info("a");
    logger.info("b");

    expect(renderCount).toBe(2);
    expect(state.epics[0].entries).toHaveLength(2);
  });

  test("createLogger from sink produces working Logger", () => {
    const state = createTreeState();
    let renderCount = 0;
    const notify = () => { renderCount++; };

    const sink = createTreeSink(state, 0, notify);
    const logger = createLogger(sink, { epic: "my-epic", phase: "plan" });
    logger.info("msg");

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

    expect(state.epics[0].children[0].closed).toBe(true);
    expect(state.epics[0].children[1].closed).toBe(false);
  });

  test("closePhase marks phase closed", () => {
    const state = createTreeState();
    openPhase(state, "e", "plan");
    closePhase(state, "e", "plan");

    expect(state.epics[0].children[0].closed).toBe(true);
  });
});
