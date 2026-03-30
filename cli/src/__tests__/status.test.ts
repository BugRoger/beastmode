import { describe, test, expect } from "bun:test";
import { buildStatusRows, formatTable, formatFeatures, formatStatus, renderStatusTable, formatWatchHeader, renderStatusScreen, renderWatchIndicator, renderBlockedDetails, buildSnapshot, detectChanges, highlightRow } from "../commands/status";
import type { WatchMeta, StatusSnapshot } from "../commands/status";
import type { EnrichedManifest } from "../state-scanner";

/**
 * Strip ANSI escape codes for assertion on visible text.
 */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Build a minimal EnrichedManifest with sensible defaults.
 */
function makeEpic(overrides: Partial<EnrichedManifest> = {}): EnrichedManifest {
  return {
    slug: "test-epic",
    manifestPath: "/tmp/test.manifest.json",
    phase: "design",
    nextAction: null,
    features: [],
    blocked: null,
    artifacts: {},
    lastUpdated: "2026-03-29T00:00:00Z",
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
          { slug: "feat-1", plan: "plan.md", status: "completed" },
          { slug: "feat-2", plan: "plan.md", status: "pending" },
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
        { slug: "a", plan: "plan.md", status: "completed" },
        { slug: "b", plan: "plan.md", status: "completed" },
        { slug: "c", plan: "plan.md", status: "pending" },
      ],
    });
    expect(formatFeatures(epic)).toBe("2/3");
  });

  test("shows feature count regardless of phase", () => {
    // formatFeatures does not filter by phase — any epic with features gets a count
    const epic = makeEpic({
      phase: "design",
      features: [
        { slug: "x", plan: "plan.md", status: "completed" },
        { slug: "y", plan: "plan.md", status: "pending" },
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
      blocked: { gate: "feature", reason: "blocked" },
    });
    const result = stripAnsi(formatStatus(epic));
    expect(result).toContain("blocked");
    expect(result).toContain("run beastmode implement my-epic");
  });

  test("returns 'done' for done phase", () => {
    const epic = makeEpic({
      phase: "done",
      nextAction: null,
    });
    const result = stripAnsi(formatStatus(epic));
    expect(result).toBe("done");
  });

  test("returns phase name for release phase (no heuristic)", () => {
    const epic = makeEpic({
      phase: "release",
      nextAction: null,
    });
    const result = formatStatus(epic);
    expect(result).toBe("release");
  });

  test("returns phase name when not blocked and not done", () => {
    const epic = makeEpic({
      phase: "implement",
      blocked: null,
      nextAction: { phase: "implement", args: ["test-epic"], type: "single" },
    });
    expect(formatStatus(epic)).toBe("implement");
  });
});

// ---------------------------------------------------------------------------
// buildStatusRows
// ---------------------------------------------------------------------------

describe("buildStatusRows", () => {
  test("maps EnrichedManifest to StatusRow with correct fields", () => {
    const epic = makeEpic({
      slug: "my-feature",
      phase: "implement",
      features: [
        { slug: "feat-a", plan: "plan.md", status: "completed" },
        { slug: "feat-b", plan: "plan.md", status: "completed" },
        { slug: "feat-c", plan: "plan.md", status: "pending" },
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
      blocked: { gate: "feature", reason: "blocked" },
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
      blocked: null,
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

  test("done phase is colored green+dim", () => {
    const epic = makeEpic({ slug: "finished", phase: "done", nextAction: null });
    const rows = buildStatusRows([epic], { all: true });
    // Should have ANSI green (\x1b[32m) and dim (\x1b[2m) codes
    expect(rows[0].phase).toContain("\x1b[32m");
    expect(rows[0].phase).toContain("\x1b[2m");
    expect(stripAnsi(rows[0].phase)).toBe("done");
  });

  test("cancelled phase is colored red+dim", () => {
    const epic = makeEpic({ slug: "dead", phase: "cancelled", nextAction: null });
    const rows = buildStatusRows([epic], { all: true });
    // Should have ANSI red (\x1b[31m) and dim (\x1b[2m) codes
    expect(rows[0].phase).toContain("\x1b[31m");
    expect(rows[0].phase).toContain("\x1b[2m");
    expect(stripAnsi(rows[0].phase)).toBe("cancelled");
  });

  test("done phase shows 'done' in status when --all is passed", () => {
    const epic = makeEpic({
      slug: "finished",
      phase: "done",
      nextAction: null,
    });
    const rows = buildStatusRows([epic], { all: true });
    expect(rows).toHaveLength(1);
    expect(stripAnsi(rows[0].status)).toBe("done");
  });

  test("filters out done epics by default", () => {
    const epics = [
      makeEpic({ slug: "active", phase: "implement" }),
      makeEpic({ slug: "finished", phase: "done", nextAction: null }),
    ];
    const rows = buildStatusRows(epics);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("active");
  });

  test("filters out cancelled epics by default", () => {
    const epics = [
      makeEpic({ slug: "active", phase: "design" }),
      makeEpic({ slug: "dead", phase: "cancelled", nextAction: null }),
    ];
    const rows = buildStatusRows(epics);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("active");
  });

  test("--all flag includes done and cancelled epics", () => {
    const epics = [
      makeEpic({ slug: "active", phase: "implement" }),
      makeEpic({ slug: "finished", phase: "done", nextAction: null }),
      makeEpic({ slug: "dead", phase: "cancelled", nextAction: null }),
    ];
    const rows = buildStatusRows(epics, { all: true });
    expect(rows).toHaveLength(3);
  });

  test("done sorts below active work, cancelled sorts to top", () => {
    const epics = [
      makeEpic({ slug: "active", phase: "implement" }),
      makeEpic({ slug: "finished", phase: "done", nextAction: null }),
      makeEpic({ slug: "dead", phase: "cancelled", nextAction: null }),
    ];
    const rows = buildStatusRows(epics, { all: true });
    expect(rows[0].name).toBe("finished");  // done: 5 (highest, sorted first)
    expect(rows[1].name).toBe("active");    // implement: 2
    expect(rows[2].name).toBe("dead");      // cancelled: -1 (lowest, sorted last)
  });
});

// ---------------------------------------------------------------------------
// renderStatusTable (extracted pure function)
// ---------------------------------------------------------------------------

describe("renderStatusTable", () => {
  test("returns formatted table string for enriched manifests", () => {
    const epics = [
      makeEpic({ slug: "alpha", phase: "implement" }),
      makeEpic({ slug: "beta", phase: "design" }),
    ];
    const result = renderStatusTable(epics);
    const plain = stripAnsi(result);
    expect(plain).toContain("Epic");
    expect(plain).toContain("alpha");
    expect(plain).toContain("beta");
    expect(plain).toContain("implement");
    expect(plain).toContain("design");
  });

  test("returns 'No epics found.' for empty input", () => {
    expect(renderStatusTable([])).toBe("No epics found.");
  });

  test("respects all flag to include done epics", () => {
    const epics = [
      makeEpic({ slug: "active", phase: "implement" }),
      makeEpic({ slug: "finished", phase: "done", nextAction: null }),
    ];
    const withoutAll = stripAnsi(renderStatusTable(epics));
    const withAll = stripAnsi(renderStatusTable(epics, { all: true }));
    expect(withoutAll).not.toContain("finished");
    expect(withAll).toContain("finished");
  });

  test("produces same output as buildStatusRows + formatTable", () => {
    const epics = [
      makeEpic({ slug: "x", phase: "validate" }),
    ];
    const direct = renderStatusTable(epics);
    const manual = formatTable(buildStatusRows(epics));
    expect(direct).toBe(manual);
  });
});

// ---------------------------------------------------------------------------
// formatWatchHeader
// ---------------------------------------------------------------------------

describe("formatWatchHeader", () => {
  test("includes timestamp in output", () => {
    const meta: WatchMeta = { timestamp: "14:30:05", watchRunning: true };
    const result = formatWatchHeader(meta);
    expect(result).toContain("14:30:05");
  });

  test("shows 'running' with green ANSI when watchRunning is true", () => {
    const meta: WatchMeta = { timestamp: "12:00:00", watchRunning: true };
    const result = formatWatchHeader(meta);
    expect(stripAnsi(result)).toContain("running");
    expect(result).toContain("\x1b[32m");
  });

  test("shows 'stopped' with dim ANSI when watchRunning is false", () => {
    const meta: WatchMeta = { timestamp: "12:00:00", watchRunning: false };
    const result = formatWatchHeader(meta);
    expect(stripAnsi(result)).toContain("stopped");
    expect(result).toContain("\x1b[2m");
  });

  test("includes 'Last updated:' prefix", () => {
    const meta: WatchMeta = { timestamp: "09:15:30", watchRunning: true };
    const result = formatWatchHeader(meta);
    expect(result).toMatch(/^Last updated:/);
  });

  test("includes 'watch:' label", () => {
    const meta: WatchMeta = { timestamp: "09:15:30", watchRunning: false };
    const result = formatWatchHeader(meta);
    expect(stripAnsi(result)).toContain("watch:");
  });
});

// ---------------------------------------------------------------------------
// renderWatchIndicator
// ---------------------------------------------------------------------------

describe("renderWatchIndicator", () => {
  test("returns 'watch: running' with green ANSI when true", () => {
    const result = renderWatchIndicator(true);
    expect(stripAnsi(result)).toBe("watch: running");
    expect(result).toContain("\x1b[32m");
  });

  test("returns 'watch: stopped' with dim ANSI when false", () => {
    const result = renderWatchIndicator(false);
    expect(stripAnsi(result)).toBe("watch: stopped");
    expect(result).toContain("\x1b[2m");
  });
});

// ---------------------------------------------------------------------------
// highlightRow
// ---------------------------------------------------------------------------

describe("highlightRow", () => {
  test("wraps all fields in bold+inverse ANSI", () => {
    const row = { name: "epic-a", phase: "design", features: "1/2", status: "design" };
    const highlighted = highlightRow(row);
    // Each field should start with bold (\x1b[1m) + inverse (\x1b[7m)
    expect(highlighted.name).toContain("\x1b[1m");
    expect(highlighted.name).toContain("\x1b[7m");
    expect(highlighted.phase).toContain("\x1b[1m");
    expect(highlighted.features).toContain("\x1b[1m");
    expect(highlighted.status).toContain("\x1b[1m");
  });

  test("preserves original text content", () => {
    const row = { name: "my-epic", phase: "implement", features: "3/5", status: "implement" };
    const highlighted = highlightRow(row);
    expect(stripAnsi(highlighted.name)).toBe("my-epic");
    expect(stripAnsi(highlighted.phase)).toBe("implement");
    expect(stripAnsi(highlighted.features)).toBe("3/5");
    expect(stripAnsi(highlighted.status)).toBe("implement");
  });
});

// ---------------------------------------------------------------------------
// renderStatusScreen
// ---------------------------------------------------------------------------

describe("renderStatusScreen", () => {
  test("returns just the table when meta is undefined", () => {
    const epics = [makeEpic({ slug: "alpha", phase: "implement" })];
    const withoutMeta = renderStatusScreen(epics);
    const tableOnly = renderStatusTable(epics);
    expect(withoutMeta).toBe(tableOnly);
  });

  test("prepends watch header when meta is provided", () => {
    const epics = [makeEpic({ slug: "beta", phase: "design" })];
    const meta: WatchMeta = { timestamp: "10:00:00", watchRunning: true };
    const result = renderStatusScreen(epics, {}, meta);
    const plain = stripAnsi(result);
    expect(plain).toContain("Last updated: 10:00:00");
    expect(plain).toContain("running");
    expect(plain).toContain("beta");
  });

  test("header is separated from table by blank line", () => {
    const epics = [makeEpic({ slug: "gamma", phase: "plan" })];
    const meta: WatchMeta = { timestamp: "11:00:00", watchRunning: false };
    const result = renderStatusScreen(epics, {}, meta);
    // Header line, then \n\n, then table
    expect(result).toContain("\n\n");
  });

  test("passes changedSlugs through to highlight rows", () => {
    const epics = [
      makeEpic({ slug: "changed-one", phase: "implement" }),
      makeEpic({ slug: "stable-one", phase: "design" }),
    ];
    const meta: WatchMeta = { timestamp: "12:00:00", watchRunning: true };
    const changed = new Set(["changed-one"]);
    const result = renderStatusScreen(epics, {}, meta, changed);
    // The changed row should have bold+inverse ANSI
    expect(result).toContain("\x1b[7m");
  });

  test("respects all flag with meta", () => {
    const epics = [
      makeEpic({ slug: "active", phase: "implement" }),
      makeEpic({ slug: "finished", phase: "done", nextAction: null }),
    ];
    const meta: WatchMeta = { timestamp: "13:00:00", watchRunning: false };
    const withAll = stripAnsi(renderStatusScreen(epics, { all: true }, meta));
    const withoutAll = stripAnsi(renderStatusScreen(epics, {}, meta));
    expect(withAll).toContain("finished");
    expect(withoutAll).not.toContain("finished");
  });
});

// ---------------------------------------------------------------------------
// buildSnapshot
// ---------------------------------------------------------------------------

describe("buildSnapshot", () => {
  test("extracts slug, phase, feature counts, and blocked status", () => {
    const epics = [
      makeEpic({
        slug: "alpha",
        phase: "implement",
        features: [
          { slug: "f1", plan: "p.md", status: "completed" },
          { slug: "f2", plan: "p.md", status: "pending" },
        ],
        blocked: null,
      }),
    ];
    const snap = buildSnapshot(epics);
    expect(snap).toEqual([
      { slug: "alpha", phase: "implement", featuresCompleted: 1, featuresTotal: 2, blocked: false },
    ]);
  });

  test("marks blocked when epic has blocked gate", () => {
    const epics = [
      makeEpic({
        slug: "stuck",
        phase: "implement",
        blocked: { gate: "feature", reason: "blocked" },
      }),
    ];
    const snap = buildSnapshot(epics);
    expect(snap[0].blocked).toBe(true);
  });

  test("handles empty features array", () => {
    const epics = [makeEpic({ slug: "bare", phase: "design", features: [] })];
    const snap = buildSnapshot(epics);
    expect(snap[0].featuresCompleted).toBe(0);
    expect(snap[0].featuresTotal).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// detectChanges
// ---------------------------------------------------------------------------

describe("detectChanges", () => {
  test("returns empty set when nothing changed", () => {
    const snap: StatusSnapshot[] = [
      { slug: "a", phase: "design", featuresCompleted: 0, featuresTotal: 0, blocked: false },
    ];
    expect(detectChanges(snap, snap)).toEqual(new Set());
  });

  test("detects phase change", () => {
    const prev: StatusSnapshot[] = [
      { slug: "a", phase: "design", featuresCompleted: 0, featuresTotal: 0, blocked: false },
    ];
    const curr: StatusSnapshot[] = [
      { slug: "a", phase: "plan", featuresCompleted: 0, featuresTotal: 0, blocked: false },
    ];
    expect(detectChanges(prev, curr)).toEqual(new Set(["a"]));
  });

  test("detects feature completion change", () => {
    const prev: StatusSnapshot[] = [
      { slug: "a", phase: "implement", featuresCompleted: 1, featuresTotal: 3, blocked: false },
    ];
    const curr: StatusSnapshot[] = [
      { slug: "a", phase: "implement", featuresCompleted: 2, featuresTotal: 3, blocked: false },
    ];
    expect(detectChanges(prev, curr)).toEqual(new Set(["a"]));
  });

  test("detects blocked status change", () => {
    const prev: StatusSnapshot[] = [
      { slug: "a", phase: "implement", featuresCompleted: 0, featuresTotal: 1, blocked: false },
    ];
    const curr: StatusSnapshot[] = [
      { slug: "a", phase: "implement", featuresCompleted: 0, featuresTotal: 1, blocked: true },
    ];
    expect(detectChanges(prev, curr)).toEqual(new Set(["a"]));
  });

  test("detects new epic appearing", () => {
    const prev: StatusSnapshot[] = [];
    const curr: StatusSnapshot[] = [
      { slug: "new-one", phase: "design", featuresCompleted: 0, featuresTotal: 0, blocked: false },
    ];
    expect(detectChanges(prev, curr)).toEqual(new Set(["new-one"]));
  });

  test("ignores unchanged epics in multi-epic set", () => {
    const prev: StatusSnapshot[] = [
      { slug: "a", phase: "design", featuresCompleted: 0, featuresTotal: 0, blocked: false },
      { slug: "b", phase: "implement", featuresCompleted: 1, featuresTotal: 2, blocked: false },
    ];
    const curr: StatusSnapshot[] = [
      { slug: "a", phase: "design", featuresCompleted: 0, featuresTotal: 0, blocked: false },
      { slug: "b", phase: "implement", featuresCompleted: 2, featuresTotal: 2, blocked: false },
    ];
    const changed = detectChanges(prev, curr);
    expect(changed).toEqual(new Set(["b"]));
    expect(changed.has("a")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// renderStatusTable with changedSlugs
// ---------------------------------------------------------------------------

describe("renderStatusTable with changedSlugs", () => {
  test("highlights changed rows with bold+inverse ANSI", () => {
    const epics = [
      makeEpic({ slug: "changed-one", phase: "implement" }),
      makeEpic({ slug: "stable-one", phase: "design" }),
    ];
    const changedSlugs = new Set(["changed-one"]);
    const result = renderStatusTable(epics, {}, changedSlugs);
    const lines = result.split("\n");
    // Find the line with changed-one — should have bold+inverse
    const changedLine = lines.find(l => stripAnsi(l).includes("changed-one"));
    expect(changedLine).toBeDefined();
    expect(changedLine).toContain("\x1b[1m");
    expect(changedLine).toContain("\x1b[7m");

    // Stable line should NOT have inverse
    const stableLine = lines.find(l => stripAnsi(l).includes("stable-one"));
    expect(stableLine).toBeDefined();
    expect(stableLine).not.toContain("\x1b[7m");
  });

  test("does not highlight when changedSlugs is empty", () => {
    const epics = [makeEpic({ slug: "no-change", phase: "design" })];
    const result = renderStatusTable(epics, {}, new Set());
    // Should not contain inverse code
    expect(result).not.toContain("\x1b[7m");
  });

  test("does not highlight when changedSlugs is undefined", () => {
    const epics = [makeEpic({ slug: "no-change", phase: "design" })];
    const result = renderStatusTable(epics);
    expect(result).not.toContain("\x1b[7m");
  });
});

// ---------------------------------------------------------------------------
// renderBlockedDetails
// ---------------------------------------------------------------------------

describe("renderBlockedDetails", () => {
  test("returns empty string when no epics are blocked", () => {
    const epics = [
      makeEpic({ slug: "happy", phase: "implement", blocked: null }),
      makeEpic({ slug: "also-happy", phase: "design", blocked: null }),
    ];
    expect(renderBlockedDetails(epics)).toBe("");
  });

  test("returns blocked header and details for one blocked epic", () => {
    const epics = [
      makeEpic({ slug: "stuck", phase: "implement", blocked: { gate: "feature", reason: "needs approval" } }),
      makeEpic({ slug: "happy", phase: "design", blocked: null }),
    ];
    const result = renderBlockedDetails(epics);
    const plain = stripAnsi(result);
    expect(plain).toContain("Blocked:");
    expect(plain).toContain("stuck");
    expect(plain).toContain("feature");
    expect(plain).toContain("needs approval");
    expect(plain).not.toContain("happy");
  });

  test("returns multiple blocked epics", () => {
    const epics = [
      makeEpic({ slug: "epic-a", phase: "implement", blocked: { gate: "gate-1", reason: "reason-1" } }),
      makeEpic({ slug: "epic-b", phase: "validate", blocked: { gate: "gate-2", reason: "reason-2" } }),
    ];
    const result = renderBlockedDetails(epics);
    const plain = stripAnsi(result);
    expect(plain).toContain("epic-a");
    expect(plain).toContain("gate-1");
    expect(plain).toContain("epic-b");
    expect(plain).toContain("gate-2");
  });

  test("uses red ANSI coloring for blocked lines", () => {
    const epics = [
      makeEpic({ slug: "red", phase: "implement", blocked: { gate: "g", reason: "r" } }),
    ];
    const result = renderBlockedDetails(epics);
    expect(result).toContain("\x1b[31m");
  });

  test("uses bold+red ANSI for Blocked: header", () => {
    const epics = [
      makeEpic({ slug: "x", phase: "implement", blocked: { gate: "g", reason: "r" } }),
    ];
    const result = renderBlockedDetails(epics);
    expect(result).toContain("\x1b[31m");
    expect(result).toContain("\x1b[1m");
  });
});

// ---------------------------------------------------------------------------
// renderStatusScreen — blocked details integration
// ---------------------------------------------------------------------------

describe("renderStatusScreen — blocked details", () => {
  test("includes blocked section in watch mode when epics are blocked", () => {
    const epics = [
      makeEpic({ slug: "blocked-epic", phase: "implement", blocked: { gate: "feature", reason: "waiting" } }),
    ];
    const meta: WatchMeta = { timestamp: "14:00:00", watchRunning: true };
    const result = renderStatusScreen(epics, {}, meta);
    const plain = stripAnsi(result);
    expect(plain).toContain("Blocked:");
    expect(plain).toContain("blocked-epic");
    expect(plain).toContain("feature");
    expect(plain).toContain("waiting");
  });

  test("does not include blocked section when no epics are blocked", () => {
    const epics = [
      makeEpic({ slug: "smooth", phase: "implement", blocked: null }),
    ];
    const meta: WatchMeta = { timestamp: "14:00:00", watchRunning: true };
    const result = renderStatusScreen(epics, {}, meta);
    const plain = stripAnsi(result);
    expect(plain).not.toContain("Blocked:");
  });

  test("does not include blocked section in one-shot mode (no meta)", () => {
    const epics = [
      makeEpic({ slug: "stuck", phase: "implement", blocked: { gate: "feature", reason: "waiting" } }),
    ];
    const result = renderStatusScreen(epics);
    const plain = stripAnsi(result);
    expect(plain).not.toContain("Blocked:");
  });
});

// ---------------------------------------------------------------------------
// renderStatusScreen — watch mode integration
// ---------------------------------------------------------------------------

describe("renderStatusScreen (watch mode)", () => {
  test("includes watch header with timestamp when meta is provided", () => {
    const epics = [makeEpic({ slug: "alpha", phase: "implement" })];
    const meta: WatchMeta = { timestamp: "14:30:05", watchRunning: true };
    const result = renderStatusScreen(epics, {}, meta);
    expect(result).toContain("14:30:05");
    expect(result).toContain("Last updated:");
  });

  test("includes status table content from manifests", () => {
    const epics = [
      makeEpic({ slug: "my-epic", phase: "implement", features: [
        { slug: "f1", plan: "p.md", status: "completed" },
        { slug: "f2", plan: "p.md", status: "pending" },
      ] }),
    ];
    const meta: WatchMeta = { timestamp: "10:00:00", watchRunning: false };
    const result = stripAnsi(renderStatusScreen(epics, {}, meta));
    expect(result).toContain("my-epic");
    expect(result).toContain("implement");
    expect(result).toContain("1/2");
  });

  test("includes watch running indicator when watch is active", () => {
    const epics = [makeEpic({ slug: "e", phase: "design" })];
    const meta: WatchMeta = { timestamp: "12:00:00", watchRunning: true };
    const result = stripAnsi(renderStatusScreen(epics, {}, meta));
    expect(result).toContain("running");
  });

  test("includes watch stopped indicator when watch is inactive", () => {
    const epics = [makeEpic({ slug: "e", phase: "design" })];
    const meta: WatchMeta = { timestamp: "12:00:00", watchRunning: false };
    const result = stripAnsi(renderStatusScreen(epics, {}, meta));
    expect(result).toContain("stopped");
  });

  test("returns just the table when no meta is provided (one-shot mode)", () => {
    const epics = [makeEpic({ slug: "one-shot", phase: "plan" })];
    const withMeta = renderStatusScreen(epics, {}, { timestamp: "09:00:00", watchRunning: false });
    const withoutMeta = renderStatusScreen(epics, {});
    // Without meta should not have the watch header
    expect(withoutMeta).not.toContain("Last updated:");
    // With meta should have it
    expect(withMeta).toContain("Last updated:");
  });

  test("highlights changed rows when changedSlugs are provided", () => {
    const epics = [
      makeEpic({ slug: "changed-epic", phase: "implement" }),
      makeEpic({ slug: "stable-epic", phase: "design" }),
    ];
    const meta: WatchMeta = { timestamp: "15:00:00", watchRunning: true };
    const changedSlugs = new Set(["changed-epic"]);
    const result = renderStatusScreen(epics, {}, meta, changedSlugs);
    // Changed row should have bold+inverse ANSI codes (\x1b[1m\x1b[7m)
    expect(result).toContain("\x1b[1m\x1b[7m");
    // The changed epic name should be wrapped in highlight
    // Find the line with "changed-epic" — it should have highlight codes
    const lines = result.split("\n");
    const changedLine = lines.find(l => l.includes("changed-epic"));
    expect(changedLine).toContain("\x1b[7m"); // inverse attribute
  });

  test("does not highlight unchanged rows", () => {
    const epics = [
      makeEpic({ slug: "stable-epic", phase: "design" }),
    ];
    const meta: WatchMeta = { timestamp: "15:00:00", watchRunning: true };
    const changedSlugs = new Set<string>(); // nothing changed
    const result = renderStatusScreen(epics, {}, meta, changedSlugs);
    // Should NOT have bold+inverse
    expect(result).not.toContain("\x1b[7m");
  });
});
