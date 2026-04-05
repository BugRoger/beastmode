import { describe, test, expect } from "vitest";
import { filterTreeByVerbosity } from "../dashboard/LogPanel.js";
import type { TreeState } from "../dashboard/tree-types.js";

function makeState(): TreeState {
  return {
    cli: {
      entries: [
        { timestamp: 1000, level: "debug", message: "watch started", seq: 1 },
        { timestamp: 2000, level: "debug", message: "scan complete", seq: 2 },
        { timestamp: 3000, level: "warn", message: "pipeline error", seq: 3 },
      ],
    },
    epics: [],
  };
}

describe("CLI root entries respect the verbosity filter", () => {
  test("info verbosity hides debug-level CLI root entries", () => {
    const state = makeState();
    const filtered = filterTreeByVerbosity(state, 0);
    const messages = filtered.cli.entries.map((e) => e.message);
    expect(messages).not.toContain("watch started");
    expect(messages).not.toContain("scan complete");
    expect(messages).toContain("pipeline error");
  });

  test("debug verbosity shows all CLI root entries", () => {
    const state = makeState();
    const filtered = filterTreeByVerbosity(state, 1);
    const messages = filtered.cli.entries.map((e) => e.message);
    expect(messages).toContain("watch started");
    expect(messages).toContain("scan complete");
    expect(messages).toContain("pipeline error");
  });

  test("toggling verbosity updates CLI root entry visibility immediately", () => {
    const state = makeState();

    // At info, debug entries hidden
    const atInfo = filterTreeByVerbosity(state, 0);
    expect(atInfo.cli.entries.map((e) => e.message)).not.toContain("watch started");

    // Toggle to debug, debug entries visible
    const atDebug = filterTreeByVerbosity(state, 1);
    expect(atDebug.cli.entries.map((e) => e.message)).toContain("watch started");
  });

  test("warn and error CLI root entries are always visible regardless of verbosity", () => {
    const state: TreeState = {
      cli: {
        entries: [
          { timestamp: 1000, level: "warn", message: "a warning", seq: 1 },
          { timestamp: 2000, level: "error", message: "an error", seq: 2 },
        ],
      },
      epics: [],
    };
    const filtered = filterTreeByVerbosity(state, 0);
    expect(filtered.cli.entries).toHaveLength(2);
    expect(filtered.cli.entries.map((e) => e.message)).toContain("a warning");
    expect(filtered.cli.entries.map((e) => e.message)).toContain("an error");
  });
});
