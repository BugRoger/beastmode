import { describe, test, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import TreeView from "../dashboard/TreeView.js";
import type { TreeState, TreeEntry, SystemEntry } from "../dashboard/tree-types.js";
import { filterTreeByVerbosity } from "../dashboard/LogPanel.js";

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

function makeEntry(msg: string, seq: number, level: "info" | "debug" | "warn" | "error" = "info"): TreeEntry {
  return { timestamp: 1000, level, message: msg, seq, phase: "implement" };
}

function makeSystemEntry(msg: string, seq: number): SystemEntry {
  return { timestamp: 1000, level: "info", message: msg, seq };
}

describe("TreeView", () => {
  test("renders empty state when no epics or cli entries", () => {
    const state: TreeState = { cli: { entries: [] }, epics: [] };
    const { lastFrame } = render(React.createElement(TreeView, { state }));
    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("no activity");
  });

  test("renders epic label at top level", () => {
    const state: TreeState = {
      cli: { entries: [] },
      epics: [{
        slug: "my-epic",
        status: "implement",
        features: [],
        entries: [],
      }],
    };
    const { lastFrame } = render(React.createElement(TreeView, { state }));
    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("my-epic");
  });

  test("renders epic entries with bar-dot prefix", () => {
    const state: TreeState = {
      cli: { entries: [] },
      epics: [{
        slug: "my-epic",
        status: "implement",
        features: [],
        entries: [makeEntry("thinking hard", 1)],
      }],
    };
    const { lastFrame } = render(React.createElement(TreeView, { state }));
    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("│");
    expect(output).toContain("thinking hard");
  });

  test("renders feature node under epic", () => {
    const state: TreeState = {
      cli: { entries: [] },
      epics: [{
        slug: "my-epic",
        status: "implement",
        features: [{
          slug: "write-plan",
          status: "in-progress",
          entries: [],
        }],
        entries: [],
      }],
    };
    const { lastFrame } = render(React.createElement(TreeView, { state }));
    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("│ │");
    expect(output).toContain("write-plan");
  });

  test("renders leaf entries under feature", () => {
    const state: TreeState = {
      cli: { entries: [] },
      epics: [{
        slug: "my-epic",
        status: "implement",
        features: [{
          slug: "write-plan",
          status: "in-progress",
          entries: [makeEntry("compiling", 1)],
        }],
        entries: [],
      }],
    };
    const { lastFrame } = render(React.createElement(TreeView, { state }));
    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("│ │");
    expect(output).toContain("compiling");
  });

  test("renders CLI entries when present", () => {
    const state: TreeState = {
      cli: { entries: [makeSystemEntry("pipeline started", 1)] },
      epics: [],
    };
    const { lastFrame } = render(React.createElement(TreeView, { state }));
    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("pipeline started");
    expect(output).toContain("CLI");
  });

  test("renders multiple epics sequentially", () => {
    const state: TreeState = {
      cli: { entries: [] },
      epics: [
        { slug: "epic-a", status: "implement", features: [], entries: [] },
        { slug: "epic-b", status: "design", features: [], entries: [] },
      ],
    };
    const { lastFrame } = render(React.createElement(TreeView, { state }));
    const output = stripAnsi(lastFrame()!);
    const aIdx = output.indexOf("epic-a");
    const bIdx = output.indexOf("epic-b");
    expect(aIdx).toBeLessThan(bIdx);
  });

  test("leaf lines have timestamp and level", () => {
    const state: TreeState = {
      cli: { entries: [] },
      epics: [{
        slug: "my-epic",
        status: "implement",
        features: [],
        entries: [makeEntry("hello", 1)],
      }],
    };
    const { lastFrame } = render(React.createElement(TreeView, { state }));
    const output = stripAnsi(lastFrame()!);
    // Should have HH:MM:SS and INFO
    expect(output).toMatch(/\d{2}:\d{2}:\d{2}/);
    expect(output).toContain("INFO");
    // Should NOT have scope parens
    expect(output).not.toContain("(my-epic):");
  });
});

describe("filterTreeByVerbosity", () => {
  test("hides debug entries at verbosity 0", () => {
    const state: TreeState = {
      cli: { entries: [] },
      epics: [{
        slug: "e1",
        status: "implement",
        features: [],
        entries: [
          makeEntry("visible", 1, "info"),
          makeEntry("hidden", 2, "debug"),
        ],
      }],
    };
    const filtered = filterTreeByVerbosity(state, 0);
    expect(filtered.epics[0].entries).toHaveLength(1);
    expect(filtered.epics[0].entries[0].message).toBe("visible");
  });

  test("shows debug entries at verbosity 1", () => {
    const state: TreeState = {
      cli: { entries: [] },
      epics: [{
        slug: "e1",
        status: "implement",
        features: [],
        entries: [
          makeEntry("visible", 1, "info"),
          makeEntry("also visible", 2, "debug"),
        ],
      }],
    };
    const filtered = filterTreeByVerbosity(state, 1);
    expect(filtered.epics[0].entries).toHaveLength(2);
  });

  test("always shows warn entries at verbosity 0", () => {
    const state: TreeState = {
      cli: { entries: [] },
      epics: [{
        slug: "e1",
        status: "implement",
        features: [],
        entries: [makeEntry("warning", 1, "warn")],
      }],
    };
    const filtered = filterTreeByVerbosity(state, 0);
    expect(filtered.epics[0].entries).toHaveLength(1);
  });

  test("always shows error entries at verbosity 0", () => {
    const state: TreeState = {
      cli: { entries: [] },
      epics: [{
        slug: "e1",
        status: "implement",
        features: [],
        entries: [makeEntry("error", 1, "error")],
      }],
    };
    const filtered = filterTreeByVerbosity(state, 0);
    expect(filtered.epics[0].entries).toHaveLength(1);
  });

  test("filters feature entries by verbosity", () => {
    const state: TreeState = {
      cli: { entries: [] },
      epics: [{
        slug: "e1",
        status: "implement",
        features: [{
          slug: "feat-1",
          status: "in-progress",
          entries: [
            makeEntry("visible", 1, "info"),
            makeEntry("also visible", 2, "debug"),
          ],
        }],
        entries: [],
      }],
    };
    const filtered = filterTreeByVerbosity(state, 1);
    expect(filtered.epics[0].features[0].entries).toHaveLength(2);
  });

  test("CLI entries are filtered by verbosity", () => {
    const state: TreeState = {
      cli: { entries: [
        { timestamp: 1000, level: "debug", message: "sys debug", seq: 1 },
      ] },
      epics: [],
    };
    const filtered = filterTreeByVerbosity(state, 0);
    expect(filtered.cli.entries).toHaveLength(0);
  });

  test("verbosity 3 shows all levels", () => {
    const state: TreeState = {
      cli: { entries: [] },
      epics: [{
        slug: "e1",
        status: "implement",
        features: [],
        entries: [
          makeEntry("a", 1, "info"),
          makeEntry("b", 2, "debug"),
          makeEntry("c", 3, "debug"),
          makeEntry("d", 4, "debug"),
        ],
      }],
    };
    const filtered = filterTreeByVerbosity(state, 3);
    expect(filtered.epics[0].entries).toHaveLength(4);
  });
});
