import { describe, test, expect } from "vitest";
import { countTreeLines, trimTreeToTail, filterTreeByVerbosity } from "../dashboard/LogPanel.js";
import type { TreeState, TreeEntry } from "../dashboard/tree-types.js";

function makeEntry(msg: string, seq: number, level: "info" | "debug" | "warn" | "error" = "info"): TreeEntry {
  return { timestamp: 1000, level, message: msg, seq, phase: "implement" };
}

function makeState(overrides?: Partial<TreeState>): TreeState {
  return {
    cli: { entries: [] },
    epics: [],
    ...overrides,
  };
}

describe("countTreeLines — flat structure", () => {
  test("empty state has 0 lines (no CLI label when no entries)", () => {
    expect(countTreeLines(makeState())).toBe(0);
  });

  test("counts CLI entries", () => {
    const state = makeState({
      cli: { entries: [
        { timestamp: 1000, level: "info", message: "a", seq: 0 },
        { timestamp: 2000, level: "info", message: "b", seq: 1 },
      ] },
    });
    // 1 cli label + 2 entries = 3
    expect(countTreeLines(state)).toBe(3);
  });

  test("counts epic + features (no phases)", () => {
    const state = makeState({
      epics: [{
        slug: "auth", status: "implement",
        features: [
          { slug: "login", status: "in-progress", entries: [makeEntry("a", 0), makeEntry("b", 1)] },
          { slug: "token", status: "blocked", entries: [] },
        ],
        entries: [],
      }],
    });
    // 1 epic + 2 features + 2 entries = 5
    expect(countTreeLines(state)).toBe(5);
  });

  test("counts epic direct entries", () => {
    const state = makeState({
      epics: [{
        slug: "auth", status: "plan",
        features: [],
        entries: [makeEntry("planning", 0)],
      }],
    });
    // 1 epic + 1 entry = 2
    expect(countTreeLines(state)).toBe(2);
  });
});

describe("trimTreeToTail — flat structure", () => {
  test("returns same state when within limit", () => {
    const state = makeState({
      epics: [{
        slug: "e", status: "plan",
        features: [], entries: [makeEntry("a", 0)],
      }],
    });
    expect(trimTreeToTail(state, 100)).toBe(state);
  });

  test("drops CLI entries first", () => {
    const state = makeState({
      cli: { entries: [
        { timestamp: 1000, level: "info", message: "old", seq: 0 },
        { timestamp: 2000, level: "info", message: "new", seq: 1 },
      ] },
    });
    // 1 cli label + 2 entries = 3 total. Trim to 2: drop 1 entry, keep cli label + 1 entry
    const result = trimTreeToTail(state, 2);
    expect(result.cli.entries).toHaveLength(1);
    expect(result.cli.entries[0].message).toBe("new");
  });

  test("drops epic entries from earliest first", () => {
    const state = makeState({
      epics: [{
        slug: "e", status: "plan",
        features: [],
        entries: [makeEntry("old", 0), makeEntry("mid", 1), makeEntry("new", 2)],
      }],
    });
    // 1 epic + 3 entries = 4 total. Trim to 2 drops 2 entries.
    const result = trimTreeToTail(state, 2);
    expect(result.epics[0].entries).toHaveLength(1);
    expect(result.epics[0].entries[0].message).toBe("new");
  });

  test("drops feature entries", () => {
    const state = makeState({
      epics: [{
        slug: "e", status: "implement",
        features: [
          { slug: "f", status: "in-progress", entries: [makeEntry("old", 0), makeEntry("mid", 1), makeEntry("new", 2)] },
        ],
        entries: [],
      }],
    });
    // 1 epic + 1 feature + 3 entries = 5 total. Trim to 3 drops 2 entries.
    const result = trimTreeToTail(state, 3);
    expect(result.epics[0].features[0].entries).toHaveLength(1);
    expect(result.epics[0].features[0].entries[0].message).toBe("new");
  });
});

describe("filterTreeByVerbosity — flat structure", () => {
  test("filters debug entries at verbosity 0", () => {
    const state = makeState({
      epics: [{
        slug: "e", status: "implement",
        features: [{
          slug: "f", status: "in-progress",
          entries: [
            makeEntry("info msg", 0, "info"),
            makeEntry("debug msg", 1, "debug"),
          ],
        }],
        entries: [makeEntry("epic debug", 2, "debug")],
      }],
    });
    const filtered = filterTreeByVerbosity(state, 0);
    expect(filtered.epics[0].features[0].entries).toHaveLength(1);
    expect(filtered.epics[0].entries).toHaveLength(0);
  });

  test("warn/error always shown", () => {
    const state = makeState({
      epics: [{
        slug: "e", status: "plan",
        features: [],
        entries: [makeEntry("warning", 0, "warn"), makeEntry("error", 1, "error")],
      }],
    });
    const filtered = filterTreeByVerbosity(state, 0);
    expect(filtered.epics[0].entries).toHaveLength(2);
  });

  test("CLI entries filtered by verbosity", () => {
    const state = makeState({
      cli: { entries: [
        { timestamp: 1000, level: "debug", message: "sys debug", seq: 0 },
      ] },
    });
    const filtered = filterTreeByVerbosity(state, 0);
    expect(filtered.cli.entries).toHaveLength(0);
  });
});
