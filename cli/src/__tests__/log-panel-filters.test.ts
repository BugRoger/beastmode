import { describe, test, expect } from "vitest";
import { filterTreeByPhase, filterTreeByBlocked, trimTreeFromHead, countTreeLines } from "../dashboard/LogPanel.js";
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

describe("filterTreeByBlocked", () => {
  test("returns tree unchanged when showBlocked is true", () => {
    const state = makeState([
      makeEpic("e1", "blocked"),
      makeEpic("e2", "implement"),
    ]);
    const result = filterTreeByBlocked(state, true);
    expect(result).toBe(state);
  });

  test("removes blocked epics when showBlocked is false", () => {
    const state = makeState([
      makeEpic("e1", "blocked"),
      makeEpic("e2", "implement"),
    ]);
    const result = filterTreeByBlocked(state, false);
    expect(result.epics).toHaveLength(1);
    expect(result.epics[0].slug).toBe("e2");
  });

  test("removes blocked features when showBlocked is false", () => {
    const state = makeState([
      makeEpic("e1", "implement", [
        makeFeature("f1", "blocked"),
        makeFeature("f2", "in-progress"),
      ]),
    ]);
    const result = filterTreeByBlocked(state, false);
    expect(result.epics[0].features).toHaveLength(1);
    expect(result.epics[0].features[0].slug).toBe("f2");
  });
});

describe("trimTreeFromHead", () => {
  test("returns tree unchanged when linesToDrop is 0", () => {
    const state = makeState([makeEpic("e1")]);
    const result = trimTreeFromHead(state, 0);
    expect(result).toBe(state);
  });

  test("drops CLI entries before epic entries", () => {
    const state = makeState(
      [makeEpic("e1", "implement", [], [makeEntry("x", 1)])],
      [makeSystem("s1", 0), makeSystem("s2", 1)],
    );
    // CLI root label (1) + 2 CLI entries + epic label (1) + 1 entry = 5 total
    const total = countTreeLines(state);
    expect(total).toBe(5);

    // Drop 2 lines: CLI label + 1 CLI entry
    const result = trimTreeFromHead(state, 2);
    expect(result.cli.entries).toHaveLength(1);
    expect(result.epics).toHaveLength(1);
  });

  test("drops lines from epics after CLI is exhausted", () => {
    const state = makeState(
      [makeEpic("e1", "implement", [], [
        makeEntry("x1", 1),
        makeEntry("x2", 2),
        makeEntry("x3", 3),
      ])],
      [],
    );
    // CLI label (1) + 0 CLI entries + epic label (1) + 3 entries = 5
    expect(countTreeLines(state)).toBe(5);

    // Drop 3: CLI label + epic label + 1 entry
    const result = trimTreeFromHead(state, 3);
    expect(result.epics[0].entries).toHaveLength(2);
  });
});
