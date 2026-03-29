import { describe, test, expect } from "bun:test";
import {
  buildStatusRows,
  formatTable,
  formatFeatures,
  formatStatus,
  type StatusRow,
} from "../src/commands/status";
import type { EpicState } from "../src/state-scanner";

function makeEpic(overrides: Partial<EpicState> = {}): EpicState {
  return {
    slug: "test-epic",
    manifestPath: "/tmp/test.manifest.json",
    phase: "implement",
    nextAction: null,
    features: [],
    blocked: false,
    ...overrides,
  };
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

// ---------------------------------------------------------------------------
// formatFeatures
// ---------------------------------------------------------------------------

describe("formatFeatures", () => {
  test("returns dash for epic with no features", () => {
    const epic = makeEpic({ features: [] });
    expect(formatFeatures(epic)).toBe("-");
  });

  test("returns 0/2 for epic with 2 pending features", () => {
    const epic = makeEpic({
      features: [
        { slug: "f1", status: "pending" },
        { slug: "f2", status: "pending" },
      ],
    });
    expect(formatFeatures(epic)).toBe("0/2");
  });

  test("returns 2/3 for epic with 2 completed and 1 pending", () => {
    const epic = makeEpic({
      features: [
        { slug: "f1", status: "completed" },
        { slug: "f2", status: "completed" },
        { slug: "f3", status: "pending" },
      ],
    });
    expect(formatFeatures(epic)).toBe("2/3");
  });

  test("works for ALL phases, not just implement", () => {
    const phases = ["design", "plan", "implement", "validate", "release"] as const;
    for (const phase of phases) {
      const epic = makeEpic({
        phase,
        features: [
          { slug: "f1", status: "completed" },
          { slug: "f2", status: "pending" },
        ],
      });
      expect(formatFeatures(epic)).toBe("1/2");
    }
  });
});

// ---------------------------------------------------------------------------
// formatStatus
// ---------------------------------------------------------------------------

describe("formatStatus", () => {
  test("blocked epic shows blocked message with phase and slug", () => {
    const epic = makeEpic({
      slug: "my-epic",
      phase: "implement",
      blocked: true,
    });
    const result = formatStatus(epic);
    const visible = stripAnsi(result);
    expect(visible).toBe("blocked: run beastmode implement my-epic");
    // Should contain ANSI red
    expect(result).toContain("\x1b[31m");
  });

  test("release epic with null nextAction shows done", () => {
    const epic = makeEpic({
      phase: "release",
      nextAction: null,
    });
    const result = formatStatus(epic);
    const visible = stripAnsi(result);
    expect(visible).toBe("done");
    // Should contain ANSI green
    expect(result).toContain("\x1b[32m");
  });

  test("non-blocked implement epic shows implement", () => {
    const epic = makeEpic({
      phase: "implement",
      blocked: false,
    });
    expect(formatStatus(epic)).toBe("implement");
  });

  test("non-blocked design epic shows design", () => {
    const epic = makeEpic({
      phase: "design",
      blocked: false,
    });
    expect(formatStatus(epic)).toBe("design");
  });
});

// ---------------------------------------------------------------------------
// buildStatusRows
// ---------------------------------------------------------------------------

describe("buildStatusRows", () => {
  test("sorts by phase lifecycle, furthest first", () => {
    const epics: EpicState[] = [
      makeEpic({ slug: "a-design", phase: "design" }),
      makeEpic({ slug: "b-release", phase: "release", nextAction: null }),
      makeEpic({ slug: "c-implement", phase: "implement" }),
      makeEpic({ slug: "d-validate", phase: "validate" }),
      makeEpic({ slug: "e-plan", phase: "plan" }),
    ];

    const rows = buildStatusRows(epics);
    expect(rows.map(r => r.name)).toEqual([
      "b-release",
      "d-validate",
      "c-implement",
      "e-plan",
      "a-design",
    ]);
  });

  test("same phase sorts alphabetically", () => {
    const epics: EpicState[] = [
      makeEpic({ slug: "z-epic", phase: "implement" }),
      makeEpic({ slug: "a-epic", phase: "implement" }),
      makeEpic({ slug: "m-epic", phase: "implement" }),
    ];

    const rows = buildStatusRows(epics);
    expect(rows.map(r => r.name)).toEqual(["a-epic", "m-epic", "z-epic"]);
  });

  test("maps epic fields to row fields correctly", () => {
    const epic = makeEpic({
      slug: "my-epic",
      phase: "implement",
      features: [
        { slug: "f1", status: "completed" },
        { slug: "f2", status: "pending" },
      ],
      blocked: false,
    });

    const rows = buildStatusRows([epic]);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("my-epic");
    expect(stripAnsi(rows[0].phase)).toBe("implement");
    expect(rows[0].features).toBe("1/2");
    expect(stripAnsi(rows[0].status)).toBe("implement");
  });

  test("handles empty epics array", () => {
    const rows = buildStatusRows([]);
    expect(rows).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// formatTable
// ---------------------------------------------------------------------------

describe("formatTable", () => {
  test("returns message for empty rows", () => {
    expect(formatTable([])).toBe("No epics found.");
  });

  test("has 4 columns: Epic, Phase, Features, Status", () => {
    const rows: StatusRow[] = [
      {
        name: "my-epic",
        phase: "implement",
        features: "1/3",
        status: "implement",
      },
    ];
    const table = formatTable(rows);
    const lines = table.split("\n");
    const headerVisible = stripAnsi(lines[0]);
    expect(headerVisible).toContain("Epic");
    expect(headerVisible).toContain("Phase");
    expect(headerVisible).toContain("Features");
    expect(headerVisible).toContain("Status");
    // Old columns should NOT exist
    expect(headerVisible).not.toContain("Last Activity");
    expect(headerVisible).not.toContain("Blocked");
    expect(headerVisible).not.toContain("Progress");
    expect(headerVisible).not.toContain("Cost");
  });

  test("produces header, separator, and data lines", () => {
    const rows: StatusRow[] = [
      {
        name: "my-epic",
        phase: "implement",
        features: "2/5",
        status: "implement",
      },
    ];
    const table = formatTable(rows);
    const lines = table.split("\n");
    expect(lines).toHaveLength(3); // header + separator + 1 data row
    expect(stripAnsi(lines[0])).toContain("Epic");
    expect(lines[1]).toMatch(/^-+/);
    expect(stripAnsi(lines[2])).toContain("my-epic");
    expect(stripAnsi(lines[2])).toContain("implement");
    expect(stripAnsi(lines[2])).toContain("2/5");
  });

  test("handles ANSI-colored content with correct alignment", () => {
    const rows: StatusRow[] = [
      {
        name: "short",
        phase: "\x1b[33mimplement\x1b[0m",
        features: "-",
        status: "implement",
      },
      {
        name: "a-very-long-epic-name",
        phase: "\x1b[34mplan\x1b[0m",
        features: "10/20",
        status: "\x1b[31mblocked: run beastmode plan a-very-long-epic-name\x1b[0m",
      },
    ];
    const table = formatTable(rows);
    const lines = table.split("\n");
    expect(lines).toHaveLength(4); // header + separator + 2 data rows
    // Visible lengths of data rows should match header length
    // (ANSI codes don't affect visible width thanks to padDisplay)
    const headerVisibleLen = stripAnsi(lines[0]).length;
    const row1VisibleLen = stripAnsi(lines[2]).length;
    const row2VisibleLen = stripAnsi(lines[3]).length;
    expect(row1VisibleLen).toBe(headerVisibleLen);
    expect(row2VisibleLen).toBe(headerVisibleLen);
  });

  test("multiple rows produce correct structure", () => {
    const rows: StatusRow[] = [
      {
        name: "epic-a",
        phase: "implement",
        features: "3/5",
        status: "implement",
      },
      {
        name: "epic-b",
        phase: "design",
        features: "-",
        status: "design",
      },
    ];
    const table = formatTable(rows);
    const lines = table.split("\n");
    expect(lines).toHaveLength(4);
    expect(stripAnsi(lines[2])).toContain("epic-a");
    expect(stripAnsi(lines[3])).toContain("epic-b");
  });
});
