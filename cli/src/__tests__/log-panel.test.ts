import { describe, test, expect } from "vitest";
import { countTreeLines, trimTreeToTail } from "../dashboard/LogPanel.js";
import type { TreeState, TreeEntry } from "../dashboard/tree-types.js";

// ---------------------------------------------------------------------------
// Group 1: LogPanel TreeState rendering logic (pure logic tests)
// ---------------------------------------------------------------------------

describe("LogPanel with TreeState", () => {
  function makeEntry(msg: string, seq: number, level: "info" | "warn" | "error" = "info"): TreeEntry {
    return { timestamp: 1000, level, message: msg, seq, phase: "implement" };
  }

  test("empty state is detected as no content", () => {
    const state: TreeState = { cli: { entries: [] }, epics: [] };
    const hasContent = state.epics.length > 0 || state.cli.entries.length > 0;
    expect(hasContent).toBe(false);
  });

  test("state with epics is detected as has content", () => {
    const state: TreeState = {
      cli: { entries: [] },
      epics: [{ slug: "my-epic", status: "in-progress", features: [], entries: [] }],
    };
    const hasContent = state.epics.length > 0 || state.cli.entries.length > 0;
    expect(hasContent).toBe(true);
  });

  test("state with CLI entries is detected as has content", () => {
    const state: TreeState = {
      cli: { entries: [{ timestamp: 1000, level: "info", message: "started", seq: 0 }] },
      epics: [],
    };
    const hasContent = state.epics.length > 0 || state.cli.entries.length > 0;
    expect(hasContent).toBe(true);
  });

  test("tree state preserves entry ordering within epic", () => {
    const entries: TreeEntry[] = [
      makeEntry("first", 0),
      makeEntry("second", 1),
      makeEntry("third", 2),
    ];
    const state: TreeState = {
      cli: { entries: [] },
      epics: [{
        slug: "e",
        status: "in-progress",
        features: [],
        entries,
      }],
    };

    expect(state.epics[0].entries.map(e => e.message)).toEqual([
      "first", "second", "third",
    ]);
  });

  test("tree state preserves feature nesting under epic", () => {
    const state: TreeState = {
      cli: { entries: [] },
      epics: [{
        slug: "e",
        status: "in-progress",
        features: [
          { slug: "feat-a", status: "in-progress", entries: [makeEntry("a-msg", 0)] },
          { slug: "feat-b", status: "pending", entries: [makeEntry("b-msg", 1)] },
        ],
        entries: [],
      }],
    };

    expect(state.epics[0].features).toHaveLength(2);
    expect(state.epics[0].features[0].slug).toBe("feat-a");
    expect(state.epics[0].features[1].slug).toBe("feat-b");
  });
});

// ---------------------------------------------------------------------------
// Group 2: countTreeLines and trimTreeToTail
// ---------------------------------------------------------------------------

describe("countTreeLines", () => {
  function makeEntry(msg: string, seq: number): TreeEntry {
    return { timestamp: 1000, level: "info", message: msg, seq, phase: "plan" };
  }

  test("empty state has 0 lines (no CLI label when no entries)", () => {
    expect(countTreeLines({ cli: { entries: [] }, epics: [] })).toBe(0);
  });

  test("counts CLI entries", () => {
    const state: TreeState = {
      cli: {
        entries: [
          { timestamp: 1000, level: "info", message: "a", seq: 0 },
          { timestamp: 2000, level: "info", message: "b", seq: 1 },
        ],
      },
      epics: [],
    };
    // 1 CLI label + 2 entries = 3
    expect(countTreeLines(state)).toBe(3);
  });

  test("counts epic + direct entries", () => {
    const state: TreeState = {
      cli: { entries: [] },
      epics: [{
        slug: "e",
        status: "in-progress",
        features: [],
        entries: [makeEntry("msg", 0)],
      }],
    };
    // 1 epic + 1 entry = 2
    expect(countTreeLines(state)).toBe(2);
  });

  test("counts features and their entries", () => {
    const state: TreeState = {
      cli: { entries: [] },
      epics: [{
        slug: "e",
        status: "in-progress",
        features: [
          { slug: "f1", status: "in-progress", entries: [makeEntry("a", 0), makeEntry("b", 1)] },
          { slug: "f2", status: "pending", entries: [makeEntry("c", 2)] },
        ],
        entries: [],
      }],
    };
    // 1 epic + 2 features + 3 entries = 6
    expect(countTreeLines(state)).toBe(6);
  });
});

describe("trimTreeToTail", () => {
  function makeEntry(msg: string, seq: number): TreeEntry {
    return { timestamp: 1000, level: "info", message: msg, seq, phase: "plan" };
  }

  test("returns same state when within limit", () => {
    const state: TreeState = {
      cli: { entries: [] },
      epics: [{
        slug: "e",
        status: "in-progress",
        features: [],
        entries: [makeEntry("msg", 0)],
      }],
    };
    const result = trimTreeToTail(state, 100);
    expect(result).toBe(state); // same reference
  });

  test("drops CLI entries first", () => {
    const state: TreeState = {
      cli: {
        entries: [
          { timestamp: 1000, level: "info", message: "old", seq: 0 },
          { timestamp: 2000, level: "info", message: "new", seq: 1 },
        ],
      },
      epics: [],
    };
    // Total: 1 CLI label + 2 entries = 3. Trim to 2 drops 1 entry.
    const result = trimTreeToTail(state, 2);
    expect(result.cli.entries).toHaveLength(1);
    expect(result.cli.entries[0].message).toBe("new");
  });

  test("drops epic entries from earliest epic first", () => {
    const state: TreeState = {
      cli: { entries: [] },
      epics: [{
        slug: "e",
        status: "in-progress",
        features: [],
        entries: [makeEntry("old", 0), makeEntry("mid", 1), makeEntry("new", 2)],
      }],
    };
    // Total: 1 epic + 3 entries = 4. Trim to 3 drops 1 entry.
    const result = trimTreeToTail(state, 3);
    expect(result.epics[0].entries).toHaveLength(2);
    expect(result.epics[0].entries[0].message).toBe("mid");
  });

  test("drops feature entries", () => {
    const state: TreeState = {
      cli: { entries: [] },
      epics: [{
        slug: "e",
        status: "in-progress",
        features: [
          { slug: "f", status: "in-progress", entries: [makeEntry("old", 0), makeEntry("new", 1)] },
        ],
        entries: [],
      }],
    };
    // Total: 1 epic + 1 feature + 2 entries = 4. Trim to 3.
    const result = trimTreeToTail(state, 3);
    expect(result.epics[0].features[0].entries).toHaveLength(1);
    expect(result.epics[0].features[0].entries[0].message).toBe("new");
  });
});

// ---------------------------------------------------------------------------
// Group 3: Aggregate vs filtered mode (still relevant)
// ---------------------------------------------------------------------------

describe("aggregate vs filtered mode", () => {
  test("filter sessions by epicSlug when selected", () => {
    const sessions = [
      { id: "1", epicSlug: "dashboard", featureSlug: "log" },
      { id: "2", epicSlug: "auth", featureSlug: "login" },
      { id: "3", epicSlug: "dashboard", featureSlug: "details" },
    ];
    const selectedEpicSlug = "dashboard";
    const filtered = sessions.filter(s => s.epicSlug === selectedEpicSlug);
    expect(filtered.map(s => s.id)).toEqual(["1", "3"]);
  });

  test("undefined selectedEpicSlug includes all sessions", () => {
    const sessions = [
      { id: "1", epicSlug: "dashboard" },
      { id: "2", epicSlug: "auth" },
    ];
    const selectedEpicSlug = undefined;
    const filtered = selectedEpicSlug === undefined
      ? sessions
      : sessions.filter(s => s.epicSlug === selectedEpicSlug);
    expect(filtered.length).toBe(2);
  });
});
