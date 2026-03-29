import { describe, test, expect } from "bun:test";
import {
  buildStatusRows,
  formatTable,
  type StatusRow,
} from "../src/commands/status";
import type { EpicState } from "../src/state-scanner";

function makeEpic(overrides: Partial<EpicState> = {}): EpicState {
  return {
    slug: "test-epic",
    designPath: "/tmp/design.md",
    phase: "implement",
    nextAction: null,
    features: [],
    blocked: false,
    gateBlocked: false,
    ...overrides,
  };
}

describe("buildStatusRows", () => {
  test("builds rows sorted by last activity descending", () => {
    const epics: EpicState[] = [
      makeEpic({
        slug: "old-epic",
        phase: "plan",
        lastUpdated: "2026-03-28T08:00:00Z",
      }),
      makeEpic({
        slug: "new-epic",
        phase: "implement",
        features: [
          { slug: "f1", status: "completed" },
          { slug: "f2", status: "pending" },
          { slug: "f3", status: "in-progress" },
        ],
        lastUpdated: "2026-03-28T12:00:00Z",
      }),
    ];

    const rows = buildStatusRows(epics);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("new-epic");
    expect(rows[0].progress).toBe("1/3");
    expect(rows[0].lastActivity).toBe("2026-03-28 12:00:00");
    expect(rows[1].name).toBe("old-epic");
    expect(rows[1].progress).toBe("-");
  });

  test("shows blocked status with gate name", () => {
    const epics: EpicState[] = [
      makeEpic({
        slug: "blocked-epic",
        phase: "implement",
        features: [{ slug: "f1", status: "pending" }],
        blocked: true,
        blockedGate: "implement.architectural-deviation",
        gateBlocked: true,
        gateName: "implement.architectural-deviation",
      }),
    ];
    const rows = buildStatusRows(epics);
    expect(rows[0].blocked).toBe("implement.architectural-deviation");
  });

  test("shows dash for non-blocked epics", () => {
    const epics: EpicState[] = [
      makeEpic({
        slug: "ok-epic",
        phase: "plan",
      }),
    ];
    const rows = buildStatusRows(epics);
    expect(rows[0].blocked).toBe("-");
  });

  test("handles empty epics array", () => {
    const rows = buildStatusRows([]);
    expect(rows).toEqual([]);
  });

  test("shows progress only for implement phase", () => {
    const epics: EpicState[] = [
      makeEpic({
        slug: "plan-epic",
        phase: "plan",
        features: [
          { slug: "f1", status: "pending" },
          { slug: "f2", status: "pending" },
        ],
      }),
      makeEpic({
        slug: "impl-epic",
        phase: "implement",
        features: [
          { slug: "f1", status: "completed" },
          { slug: "f2", status: "completed" },
          { slug: "f3", status: "pending" },
        ],
      }),
    ];
    const rows = buildStatusRows(epics);
    const planRow = rows.find((r) => r.name === "plan-epic")!;
    const implRow = rows.find((r) => r.name === "impl-epic")!;
    expect(planRow.progress).toBe("-");
    expect(implRow.progress).toBe("2/3");
  });

  test("shows dash for lastActivity when no lastUpdated", () => {
    const epics: EpicState[] = [
      makeEpic({
        slug: "no-activity",
      }),
    ];
    const rows = buildStatusRows(epics);
    expect(rows[0].lastActivity).toBe("-");
  });

  test("formats lastActivity from lastUpdated timestamp", () => {
    const epics: EpicState[] = [
      makeEpic({
        slug: "has-activity",
        lastUpdated: "2026-03-28T15:30:45Z",
      }),
    ];
    const rows = buildStatusRows(epics);
    expect(rows[0].lastActivity).toBe("2026-03-28 15:30:45");
  });

  test("epics with no activity sort alphabetically after active epics", () => {
    const epics: EpicState[] = [
      makeEpic({ slug: "z-epic" }),
      makeEpic({ slug: "a-epic" }),
      makeEpic({ slug: "m-epic" }),
    ];
    const rows = buildStatusRows(epics);
    expect(rows.map((r) => r.name)).toEqual(["a-epic", "m-epic", "z-epic"]);
  });
});

describe("formatTable", () => {
  test("returns message for empty rows", () => {
    expect(formatTable([])).toBe("No epics found.");
  });

  test("formats a table with header, separator, and data", () => {
    const rows: StatusRow[] = [
      {
        name: "my-epic",
        phase: "implement",
        progress: "2/5",
        blocked: "-",
        lastActivity: "2026-03-28 12:00:00",
      },
    ];
    const table = formatTable(rows);
    const lines = table.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("Epic");
    expect(lines[0]).toContain("Phase");
    expect(lines[0]).toContain("Progress");
    expect(lines[0]).toContain("Blocked");
    expect(lines[0]).toContain("Last Activity");
    expect(lines[0]).not.toContain("Cost");
    expect(lines[1]).toMatch(/^-+/);
    expect(lines[2]).toContain("my-epic");
    expect(lines[2]).toContain("implement");
    expect(lines[2]).toContain("2/5");
  });

  test("aligns columns based on widest value", () => {
    const rows: StatusRow[] = [
      {
        name: "short",
        phase: "plan",
        progress: "-",
        blocked: "-",
        lastActivity: "-",
      },
      {
        name: "a-very-long-epic-name",
        phase: "implement",
        progress: "10/20",
        blocked: "implement.architectural-deviation",
        lastActivity: "2026-03-28 15:30:00",
      },
    ];
    const table = formatTable(rows);
    const lines = table.split("\n");
    expect(lines).toHaveLength(4);
    const headerLen = lines[0].length;
    const row1Len = lines[2].length;
    const row2Len = lines[3].length;
    expect(row1Len).toBe(headerLen);
    expect(row2Len).toBe(headerLen);
  });

  test("multiple rows produce correct structure", () => {
    const rows: StatusRow[] = [
      {
        name: "epic-a",
        phase: "implement",
        progress: "3/5",
        blocked: "-",
        lastActivity: "2026-03-28 14:00:00",
      },
      {
        name: "epic-b",
        phase: "design",
        progress: "-",
        blocked: "-",
        lastActivity: "-",
      },
    ];
    const table = formatTable(rows);
    const lines = table.split("\n");
    expect(lines).toHaveLength(4);
    expect(lines[2]).toContain("epic-a");
    expect(lines[3]).toContain("epic-b");
  });
});
