import { describe, test, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import TreeView from "../dashboard/TreeView.js";
import type { TreeState, TreeEntry, SystemEntry } from "../dashboard/tree-types.js";

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

function makeEntry(msg: string, seq: number, level: "info" | "warn" | "error" = "info"): TreeEntry {
  return { timestamp: 1000, level, message: msg, seq };
}

function makeSystemEntry(msg: string, seq: number): SystemEntry {
  return { timestamp: 1000, level: "info", message: msg, seq };
}

describe("TreeView", () => {
  test("renders empty state when no epics or system entries", () => {
    const state: TreeState = { epics: [], system: [] };
    const { lastFrame } = render(React.createElement(TreeView, { state }));
    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("no activity");
  });

  test("renders epic label at top level", () => {
    const state: TreeState = {
      epics: [{
        slug: "my-epic",
        phases: [],
      }],
      system: [],
    };
    const { lastFrame } = render(React.createElement(TreeView, { state }));
    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("my-epic");
  });

  test("renders phase node indented under epic", () => {
    const state: TreeState = {
      epics: [{
        slug: "my-epic",
        phases: [{
          phase: "plan",
          features: [],
          entries: [],
        }],
      }],
      system: [],
    };
    const { lastFrame } = render(React.createElement(TreeView, { state }));
    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("│ plan");
  });

  test("renders leaf entries under phase with bar-dot prefix", () => {
    const state: TreeState = {
      epics: [{
        slug: "my-epic",
        phases: [{
          phase: "plan",
          features: [],
          entries: [makeEntry("thinking hard", 1)],
        }],
      }],
      system: [],
    };
    const { lastFrame } = render(React.createElement(TreeView, { state }));
    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("│ ·");
    expect(output).toContain("thinking hard");
  });

  test("renders feature node under phase with double prefix", () => {
    const state: TreeState = {
      epics: [{
        slug: "my-epic",
        phases: [{
          phase: "implement",
          features: [{
            slug: "write-plan",
            entries: [],
          }],
          entries: [],
        }],
      }],
      system: [],
    };
    const { lastFrame } = render(React.createElement(TreeView, { state }));
    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("│ │ write-plan");
  });

  test("renders leaf entries under feature with double-bar-dot prefix", () => {
    const state: TreeState = {
      epics: [{
        slug: "my-epic",
        phases: [{
          phase: "implement",
          features: [{
            slug: "write-plan",
            entries: [makeEntry("compiling", 1)],
          }],
          entries: [],
        }],
      }],
      system: [],
    };
    const { lastFrame } = render(React.createElement(TreeView, { state }));
    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("│ │ ·");
    expect(output).toContain("compiling");
  });

  test("renders system entries flat (no tree prefix)", () => {
    const state: TreeState = {
      epics: [],
      system: [makeSystemEntry("pipeline started", 1)],
    };
    const { lastFrame } = render(React.createElement(TreeView, { state }));
    const output = stripAnsi(lastFrame()!);
    expect(output).toContain("pipeline started");
    // Should not have tree connectors
    expect(output).not.toContain("│");
  });

  test("renders multiple epics sequentially", () => {
    const state: TreeState = {
      epics: [
        { slug: "epic-a", phases: [] },
        { slug: "epic-b", phases: [] },
      ],
      system: [],
    };
    const { lastFrame } = render(React.createElement(TreeView, { state }));
    const output = stripAnsi(lastFrame()!);
    const aIdx = output.indexOf("epic-a");
    const bIdx = output.indexOf("epic-b");
    expect(aIdx).toBeLessThan(bIdx);
  });

  test("leaf lines have timestamp and level — no scope or phase column", () => {
    const state: TreeState = {
      epics: [{
        slug: "my-epic",
        phases: [{
          phase: "plan",
          features: [],
          entries: [makeEntry("hello", 1)],
        }],
      }],
      system: [],
    };
    const { lastFrame } = render(React.createElement(TreeView, { state }));
    const output = stripAnsi(lastFrame()!);
    // Should have HH:MM:SS and INFO
    expect(output).toMatch(/\d{2}:\d{2}:\d{2}/);
    expect(output).toContain("INFO");
    // Should NOT have scope parens or phase column
    expect(output).not.toContain("(my-epic):");
    expect(output).not.toMatch(/plan\s{5}/); // 9-char padded phase
  });
});
