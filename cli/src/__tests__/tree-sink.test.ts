import { describe, test, expect } from "vitest";
import { createTreeSink } from "../tree-view/tree-sink.js";
import { createTreeState } from "../tree-view/tree-state.js";
import { createLogger } from "../logger.js";
import type { LogSink } from "../logger.js";

describe("createTreeSink", () => {
  describe("LogSink interface", () => {
    test("returns object with write method", () => {
      const state = createTreeState();
      const sink: LogSink = createTreeSink(state, 0);
      expect(typeof sink.write).toBe("function");
    });
  });

  describe("routing by context", () => {
    test("no context: entry goes to systemEntries", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const logger = createLogger(sink);
      logger.info("system msg");
      expect(state.systemEntries).toHaveLength(1);
      expect(state.systemEntries[0].message).toBe("system msg");
    });

    test("epic context: entry goes to epic node", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const logger = createLogger(sink, { epic: "my-epic" });
      logger.info("epic msg");
      expect(state.epics).toHaveLength(1);
      expect(state.epics[0].entries).toHaveLength(1);
    });

    test("phase context: entry goes to phase node", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const logger = createLogger(sink, { epic: "my-epic", phase: "plan" });
      logger.info("phase msg");
      expect(state.epics[0].children[0].entries).toHaveLength(1);
    });

    test("feature context: entry goes to feature node", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const logger = createLogger(sink, { epic: "my-epic", phase: "implement", feature: "auth" });
      logger.info("feature msg");
      const feature = state.epics[0].children[0].children[0];
      expect(feature.entries).toHaveLength(1);
    });
  });

  describe("verbosity gating", () => {
    test("verbosity 0: debug entries suppressed", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const logger = createLogger(sink, { epic: "e" });
      logger.info("a");
      logger.debug("b");
      expect(state.epics[0].entries).toHaveLength(1);
    });

    test("verbosity 1: all entries pass through", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 1);
      const logger = createLogger(sink, { epic: "e" });
      logger.info("a");
      logger.debug("b");
      expect(state.epics[0].entries).toHaveLength(2);
    });

    test("warn always passes regardless of verbosity", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const logger = createLogger(sink, { epic: "e" });
      logger.warn("w");
      expect(state.epics[0].entries).toHaveLength(1);
      expect(state.epics[0].entries[0].level).toBe("warn");
    });

    test("error always passes regardless of verbosity", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const logger = createLogger(sink, { epic: "e" });
      logger.error("e");
      expect(state.epics[0].entries).toHaveLength(1);
      expect(state.epics[0].entries[0].level).toBe("error");
    });
  });

  describe("notify callback", () => {
    test("calls notify on every entry added", () => {
      const state = createTreeState();
      let count = 0;
      const sink = createTreeSink(state, 0, () => { count++; });
      const logger = createLogger(sink);
      logger.info("a");
      logger.info("b");
      expect(count).toBe(2);
    });

    test("does not call notify when entry filtered by verbosity", () => {
      const state = createTreeState();
      let count = 0;
      const sink = createTreeSink(state, 0, () => { count++; });
      const logger = createLogger(sink);
      logger.debug("filtered");
      expect(count).toBe(0);
    });
  });

  describe("Logger integration", () => {
    test("child logger merges context correctly", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const parent = createLogger(sink, { epic: "my-epic" });
      const child = parent.child({ phase: "plan" });
      child.info("msg");
      expect(state.epics[0].children[0].label).toBe("plan");
      expect(state.epics[0].children[0].entries).toHaveLength(1);
    });

    test("child overrides parent context fields", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const parent = createLogger(sink, { epic: "old" });
      const child = parent.child({ epic: "new" });
      child.info("msg");
      expect(state.epics).toHaveLength(1);
      expect(state.epics[0].label).toBe("new");
    });

    test("multi-epic creates separate subtrees", () => {
      const state = createTreeState();
      const sink = createTreeSink(state, 0);
      const a = createLogger(sink, { epic: "alpha" });
      const b = createLogger(sink, { epic: "beta" });
      a.info("a msg");
      b.info("b msg");
      expect(state.epics).toHaveLength(2);
      expect(state.epics[0].label).toBe("alpha");
      expect(state.epics[1].label).toBe("beta");
    });
  });
});
