import { describe, test, expect } from "bun:test";
import { buildStatusRows, formatTable, formatFeatures, formatStatus } from "../commands/status";
import type { EpicState } from "../state-scanner";

/**
 * Strip ANSI escape codes for assertion on visible text.
 */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Build a minimal EpicState with sensible defaults.
 */
function makeEpic(overrides: Partial<EpicState> = {}): EpicState {
  return {
    slug: "test-epic",
    manifestPath: "/tmp/test.manifest.json",
    phase: "design",
    nextAction: null,
    features: [],
    blocked: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// formatTable
// ---------------------------------------------------------------------------

describe("formatTable", () => {
  test("returns 'No epics found.' for empty array", () => {
    const result = formatTable([]);
    expect(result).toBe("No epics found.");
  });

  test("produces correct headers", () => {
    const rows = buildStatusRows([makeEpic()]);
    const output = stripAnsi(formatTable(rows));
    expect(output).toContain("Epic");
    expect(output).toContain("Phase");
    expect(output).toContain("Features");
    expect(output).toContain("Status");
  });

  test("aligns columns with separator line", () => {
    const rows = buildStatusRows([makeEpic({ slug: "my-epic", phase: "design" })]);
    const output = formatTable(rows);
    const lines = output.split("\n");
    // Line 0 = headers, line 1 = separator, line 2+ = data
    expect(lines.length).toBeGreaterThanOrEqual(3);

    const separator = stripAnsi(lines[1]);
    // Separator should only contain dashes and spaces (column gaps)
    expect(separator).toMatch(/^[-\s]+$/);

    // Each column dash block should have length >= the header label
    const dashSegments = separator.split(/  +/);
    expect(dashSegments.length).toBe(4); // Epic, Phase, Features, Status
  });

  test("formats multiple rows correctly", () => {
    const epics = [
      makeEpic({ slug: "alpha", phase: "design" }),
      makeEpic({
        slug: "beta",
        phase: "implement",
        features: [
          { slug: "feat-1", status: "completed" },
          { slug: "feat-2", status: "pending" },
        ],
      }),
    ];
    const rows = buildStatusRows(epics);
    const output = stripAnsi(formatTable(rows));
    expect(output).toContain("alpha");
    expect(output).toContain("beta");
    expect(output).toContain("design");
    expect(output).toContain("implement");
  });
});

// ---------------------------------------------------------------------------
// formatFeatures (exported helper)
// ---------------------------------------------------------------------------

describe("formatFeatures", () => {
  test("returns '-' when epic has no features", () => {
    const epic = makeEpic({ features: [] });
    expect(formatFeatures(epic)).toBe("-");
  });

  test("returns completed/total count", () => {
    const epic = makeEpic({
      phase: "implement",
      features: [
        { slug: "a", status: "completed" },
        { slug: "b", status: "completed" },
        { slug: "c", status: "pending" },
      ],
    });
    expect(formatFeatures(epic)).toBe("2/3");
  });

  test("shows feature count regardless of phase", () => {
    // formatFeatures does not filter by phase — any epic with features gets a count
    const epic = makeEpic({
      phase: "design",
      features: [
        { slug: "x", status: "completed" },
        { slug: "y", status: "pending" },
      ],
    });
    expect(formatFeatures(epic)).toBe("1/2");
  });
});

// ---------------------------------------------------------------------------
// formatStatus (exported helper)
// ---------------------------------------------------------------------------

describe("formatStatus", () => {
  test("returns blocked message when epic is blocked", () => {
    const epic = makeEpic({
      slug: "my-epic",
      phase: "implement",
      blocked: true,
    });
    const result = stripAnsi(formatStatus(epic));
    expect(result).toContain("blocked");
    expect(result).toContain("run beastmode implement my-epic");
  });

  test("returns 'done' for release phase with no nextAction", () => {
    const epic = makeEpic({
      phase: "release",
      nextAction: null,
    });
    const result = stripAnsi(formatStatus(epic));
    expect(result).toBe("done");
  });

  test("returns phase name when not blocked and not done", () => {
    const epic = makeEpic({
      phase: "implement",
      blocked: false,
      nextAction: { phase: "implement", args: ["test-epic"], type: "single" },
    });
    expect(formatStatus(epic)).toBe("implement");
  });
});

// ---------------------------------------------------------------------------
// buildStatusRows
// ---------------------------------------------------------------------------

describe("buildStatusRows", () => {
  test("maps EpicState to StatusRow with correct fields", () => {
    const epic = makeEpic({
      slug: "my-feature",
      phase: "implement",
      features: [
        { slug: "feat-a", status: "completed" },
        { slug: "feat-b", status: "completed" },
        { slug: "feat-c", status: "pending" },
      ],
    });
    const rows = buildStatusRows([epic]);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("my-feature");
    expect(stripAnsi(rows[0].phase)).toBe("implement");
    expect(rows[0].features).toBe("2/3");
  });

  test("features column shows '-' for epic with no features", () => {
    const epic = makeEpic({
      slug: "empty",
      phase: "implement",
      features: [],
    });
    const rows = buildStatusRows([epic]);
    expect(rows[0].features).toBe("-");
  });

  test("status shows blocked message when epic is blocked", () => {
    const epic = makeEpic({
      slug: "stuck",
      phase: "implement",
      blocked: true,
    });
    const rows = buildStatusRows([epic]);
    const status = stripAnsi(rows[0].status);
    expect(status).toContain("blocked");
    expect(status).toContain("run beastmode implement stuck");
  });

  test("status shows phase name when not blocked", () => {
    const epic = makeEpic({
      slug: "moving",
      phase: "validate",
      blocked: false,
      nextAction: { phase: "validate", args: ["moving"], type: "single" },
    });
    const rows = buildStatusRows([epic]);
    expect(rows[0].status).toBe("validate");
  });

  test("sorts by phase lifecycle descending, furthest phase first", () => {
    const epics = [
      makeEpic({ slug: "early", phase: "design" }),
      makeEpic({ slug: "late", phase: "validate" }),
      makeEpic({ slug: "mid", phase: "implement" }),
    ];
    const rows = buildStatusRows(epics);
    expect(rows[0].name).toBe("late");
    expect(rows[1].name).toBe("mid");
    expect(rows[2].name).toBe("early");
  });

  test("sorts alphabetically by slug within same phase", () => {
    const epics = [
      makeEpic({ slug: "charlie", phase: "implement" }),
      makeEpic({ slug: "alpha", phase: "implement" }),
      makeEpic({ slug: "bravo", phase: "implement" }),
    ];
    const rows = buildStatusRows(epics);
    expect(rows[0].name).toBe("alpha");
    expect(rows[1].name).toBe("bravo");
    expect(rows[2].name).toBe("charlie");
  });

  test("phase values contain ANSI color codes", () => {
    const epic = makeEpic({ slug: "colored", phase: "implement" });
    const rows = buildStatusRows([epic]);
    // Raw phase should have ANSI codes
    expect(rows[0].phase).not.toBe("implement");
    // But stripped should be the plain phase name
    expect(stripAnsi(rows[0].phase)).toBe("implement");
  });

  test("release with no nextAction shows 'done' in status", () => {
    const epic = makeEpic({
      slug: "finished",
      phase: "release",
      nextAction: null,
    });
    const rows = buildStatusRows([epic]);
    expect(stripAnsi(rows[0].status)).toBe("done");
  });
});
