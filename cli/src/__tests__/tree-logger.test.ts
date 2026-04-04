import { describe, test, expect } from "vitest";
import { TreeLogger } from "../tree-view/tree-logger.js";
import { createTreeState } from "../tree-view/tree-state.js";
import type { Logger } from "../logger.js";

describe("TreeLogger", () => {
  describe("Logger interface", () => {
    test("implements all Logger methods", () => {
      const state = createTreeState();
      const logger: Logger = new TreeLogger(state, 0);
      expect(typeof logger.log).toBe("function");
      expect(typeof logger.detail).toBe("function");
      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.trace).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.child).toBe("function");
    });
  });

  describe("routing by context", () => {
    test("no context: message goes to systemEntries", () => {
      const state = createTreeState();
      const logger = new TreeLogger(state, 0);
      logger.log("system msg");
      expect(state.systemEntries).toHaveLength(1);
      expect(state.systemEntries[0].message).toBe("system msg");
    });

    test("epic context: message goes to epic node", () => {
      const state = createTreeState();
      const logger = new TreeLogger(state, 0, { epic: "my-epic" });
      logger.log("epic msg");
      expect(state.epics).toHaveLength(1);
      expect(state.epics[0].entries).toHaveLength(1);
    });

    test("phase context: message goes to phase node", () => {
      const state = createTreeState();
      const logger = new TreeLogger(state, 0, { epic: "my-epic", phase: "plan" });
      logger.log("phase msg");
      expect(state.epics[0].children[0].entries).toHaveLength(1);
    });

    test("feature context: message goes to feature node", () => {
      const state = createTreeState();
      const logger = new TreeLogger(state, 0, { epic: "my-epic", phase: "implement", feature: "auth" });
      logger.log("feature msg");
      const feature = state.epics[0].children[0].children[0];
      expect(feature.entries).toHaveLength(1);
    });
  });

  describe("verbosity gating", () => {
    test("verbosity 0: only log() adds entry", () => {
      const state = createTreeState();
      const logger = new TreeLogger(state, 0, { epic: "e" });
      logger.log("a");
      logger.detail("b");
      logger.debug("c");
      logger.trace("d");
      expect(state.epics[0].entries).toHaveLength(1);
    });

    test("verbosity 1: log() and detail() add entries", () => {
      const state = createTreeState();
      const logger = new TreeLogger(state, 1, { epic: "e" });
      logger.log("a");
      logger.detail("b");
      logger.debug("c");
      expect(state.epics[0].entries).toHaveLength(2);
    });

    test("verbosity 2: log(), detail(), debug() add entries", () => {
      const state = createTreeState();
      const logger = new TreeLogger(state, 2, { epic: "e" });
      logger.log("a");
      logger.detail("b");
      logger.debug("c");
      logger.trace("d");
      expect(state.epics[0].entries).toHaveLength(3);
    });

    test("verbosity 3: all levels add entries", () => {
      const state = createTreeState();
      const logger = new TreeLogger(state, 3, { epic: "e" });
      logger.log("a");
      logger.detail("b");
      logger.debug("c");
      logger.trace("d");
      expect(state.epics[0].entries).toHaveLength(4);
    });

    test("warn always adds entry regardless of verbosity", () => {
      const state = createTreeState();
      const logger = new TreeLogger(state, 0, { epic: "e" });
      logger.warn("w");
      expect(state.epics[0].entries).toHaveLength(1);
      expect(state.epics[0].entries[0].level).toBe("warn");
    });

    test("error always adds entry regardless of verbosity", () => {
      const state = createTreeState();
      const logger = new TreeLogger(state, 0, { epic: "e" });
      logger.error("e");
      expect(state.epics[0].entries).toHaveLength(1);
      expect(state.epics[0].entries[0].level).toBe("error");
    });
  });

  describe("child()", () => {
    test("child merges parent and child context", () => {
      const state = createTreeState();
      const parent = new TreeLogger(state, 0, { epic: "my-epic" });
      const child = parent.child({ phase: "plan" });
      child.log("msg");
      expect(state.epics[0].children[0].label).toBe("plan");
      expect(state.epics[0].children[0].entries).toHaveLength(1);
    });

    test("child overrides parent context fields", () => {
      const state = createTreeState();
      const parent = new TreeLogger(state, 0, { epic: "old" });
      const child = parent.child({ epic: "new" });
      child.log("msg");
      expect(state.epics).toHaveLength(1);
      expect(state.epics[0].label).toBe("new");
    });

    test("child does not modify parent context", () => {
      const state = createTreeState();
      const parent = new TreeLogger(state, 0, { epic: "my-epic" });
      parent.child({ phase: "plan" });
      parent.log("msg");
      expect(state.epics[0].entries).toHaveLength(1);
      expect(state.epics[0].children).toHaveLength(0);
    });

    test("child inherits verbosity", () => {
      const state = createTreeState();
      const parent = new TreeLogger(state, 0, { epic: "e" });
      const child = parent.child({ phase: "plan" });
      child.log("visible");
      child.detail("hidden");
      expect(state.epics[0].children[0].entries).toHaveLength(1);
    });

    test("child shares same tree state", () => {
      const state = createTreeState();
      const parent = new TreeLogger(state, 0);
      const child = parent.child({ epic: "my-epic" });
      parent.log("system msg");
      child.log("epic msg");
      expect(state.systemEntries).toHaveLength(1);
      expect(state.epics).toHaveLength(1);
    });
  });

  describe("multi-epic", () => {
    test("messages from different epics create separate subtrees", () => {
      const state = createTreeState();
      const a = new TreeLogger(state, 0, { epic: "alpha" });
      const b = new TreeLogger(state, 0, { epic: "beta" });
      a.log("a msg");
      b.log("b msg");
      expect(state.epics).toHaveLength(2);
      expect(state.epics[0].label).toBe("alpha");
      expect(state.epics[1].label).toBe("beta");
    });
  });

  describe("notify callback", () => {
    test("calls notify on every entry added", () => {
      const state = createTreeState();
      let count = 0;
      const logger = new TreeLogger(state, 0, {}, () => { count++; });
      logger.log("a");
      logger.log("b");
      expect(count).toBe(2);
    });

    test("child inherits notify callback", () => {
      const state = createTreeState();
      let count = 0;
      const parent = new TreeLogger(state, 0, {}, () => { count++; });
      const child = parent.child({ epic: "e" });
      child.log("msg");
      expect(count).toBe(1);
    });
  });
});
