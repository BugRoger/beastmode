import { describe, test, expect } from "vitest";
import { filterTreeByPhase, filterTreeByViewFilter, countTreeLines } from "../dashboard/LogPanel.js";
import type { TreeState, EpicNode, FeatureNode, TreeEntry, SystemEntry } from "../dashboard/tree-types.js";

function makeEntry(msg: string, seq: number, phase = "implement"): TreeEntry {
  return { timestamp: Date.now(), level: "info", message: msg, seq, phase };
}

function makeFeature(slug: string, status = "in-progress", entries: TreeEntry[] = []): FeatureNode {
  return { slug, status, entries };
}

function makeEpic(slug: string, status = "implement", features: FeatureNode[] = [], entries: TreeEntry[] = []): EpicNode {
  return { slug, status, features, entries };
}

function makeSystem(msg: string, seq: number): SystemEntry {
  return { timestamp: Date.now(), level: "info", message: msg, seq };
}

function makeState(epics: EpicNode[] = [], cliEntries: SystemEntry[] = []): TreeState {
  return { cli: { entries: cliEntries }, epics };
}

describe("filterTreeByPhase", () => {
  test("returns tree unchanged when phase is 'all'", () => {
    const state = makeState([
      makeEpic("e1", "implement", [], [
        makeEntry("d1", 1, "design"),
        makeEntry("i1", 2, "implement"),
      ]),
    ]);
    const result = filterTreeByPhase(state, "all");
    expect(result).toBe(state); // same reference
  });

  test("filters entries to only matching phase", () => {
    const state = makeState([
      makeEpic("e1", "implement", [], [
        makeEntry("d1", 1, "design"),
        makeEntry("i1", 2, "implement"),
      ]),
    ]);
    const result = filterTreeByPhase(state, "design");
    expect(result.epics[0].entries).toHaveLength(1);
    expect(result.epics[0].entries[0].message).toBe("d1");
  });

  test("filters feature entries by phase", () => {
    const state = makeState([
      makeEpic("e1", "implement", [
        makeFeature("f1", "in-progress", [
          makeEntry("fe1", 1, "plan"),
          makeEntry("fe2", 2, "implement"),
        ]),
      ]),
    ]);
    const result = filterTreeByPhase(state, "plan");
    expect(result.epics[0].features[0].entries).toHaveLength(1);
    expect(result.epics[0].features[0].entries[0].message).toBe("fe1");
  });

  test("preserves epic/feature skeleton nodes even when all entries filtered", () => {
    const state = makeState([
      makeEpic("e1", "implement", [
        makeFeature("f1", "in-progress", [makeEntry("i1", 1, "implement")]),
      ], [makeEntry("i2", 2, "implement")]),
    ]);
    const result = filterTreeByPhase(state, "design");
    expect(result.epics).toHaveLength(1);
    expect(result.epics[0].features).toHaveLength(1);
    expect(result.epics[0].entries).toHaveLength(0);
    expect(result.epics[0].features[0].entries).toHaveLength(0);
  });

  test("CLI entries are never filtered", () => {
    const state = makeState([], [makeSystem("sys1", 0), makeSystem("sys2", 1)]);
    const result = filterTreeByPhase(state, "design");
    expect(result.cli.entries).toHaveLength(2);
  });
});

describe("filterTreeByViewFilter", () => {
  const noSessions = new Set<string>();

  test("returns tree unchanged when viewFilter is 'all'", () => {
    const state = makeState([
      makeEpic("e1", "blocked"),
      makeEpic("e2", "implement"),
    ]);
    const result = filterTreeByViewFilter(state, "all", noSessions);
    expect(result).toBe(state);
  });

  test("active: removes done/cancelled/blocked epics", () => {
    const state = makeState([
      makeEpic("e1", "blocked"),
      makeEpic("e2", "done"),
      makeEpic("e3", "cancelled"),
      makeEpic("e4", "implement"),
    ]);
    const result = filterTreeByViewFilter(state, "active", noSessions);
    expect(result.epics).toHaveLength(1);
    expect(result.epics[0].slug).toBe("e4");
  });

  test("active: removes blocked/completed features", () => {
    const state = makeState([
      makeEpic("e1", "implement", [
        makeFeature("f1", "blocked"),
        makeFeature("f2", "completed"),
        makeFeature("f3", "in-progress"),
        makeFeature("f4", "pending"),
      ]),
    ]);
    const result = filterTreeByViewFilter(state, "active", noSessions);
    expect(result.epics[0].features).toHaveLength(2);
    expect(result.epics[0].features.map(f => f.slug)).toEqual(["f3", "f4"]);
  });

  test("running: only shows epics with active sessions", () => {
    const sessions = new Set(["e2"]);
    const state = makeState([
      makeEpic("e1", "implement"),
      makeEpic("e2", "implement"),
      makeEpic("e3", "design"),
    ]);
    const result = filterTreeByViewFilter(state, "running", sessions);
    expect(result.epics).toHaveLength(1);
    expect(result.epics[0].slug).toBe("e2");
  });

  test("running: filters features to in-progress/pending only", () => {
    const sessions = new Set(["e1"]);
    const state = makeState([
      makeEpic("e1", "implement", [
        makeFeature("f1", "completed"),
        makeFeature("f2", "in-progress"),
        makeFeature("f3", "pending"),
        makeFeature("f4", "blocked"),
      ]),
    ]);
    const result = filterTreeByViewFilter(state, "running", sessions);
    expect(result.epics[0].features).toHaveLength(2);
    expect(result.epics[0].features.map(f => f.slug)).toEqual(["f2", "f3"]);
  });
});

describe("countTreeLines", () => {
  test("counts lines matching TreeView flattenTree output", () => {
    // No CLI entries = no SYSTEM label
    const noCliState = makeState([
      makeEpic("e1", "implement", [
        makeFeature("f1", "in-progress", [makeEntry("x", 1)]),
      ], [makeEntry("y", 2)]),
    ], []);
    // epic label (1) + 1 entry + feature label (1) + 1 entry = 4
    expect(countTreeLines(noCliState)).toBe(4);

    // With CLI entries = SYSTEM label + entries
    const withCliState = makeState([
      makeEpic("e1", "implement"),
    ], [makeSystem("s1", 0), makeSystem("s2", 1)]);
    // SYSTEM label (1) + 2 entries + epic label (1) = 4
    expect(countTreeLines(withCliState)).toBe(4);
  });

  test("empty CLI entries produces no SYSTEM lines", () => {
    const state = makeState([], []);
    expect(countTreeLines(state)).toBe(0);
  });
});
