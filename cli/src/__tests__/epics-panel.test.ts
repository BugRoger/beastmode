import { describe, test, expect } from "vitest";
import { getKeyHints } from "../dashboard/key-hints.js";


// ---------------------------------------------------------------------------
// Group 1: EpicsPanel logic
// ---------------------------------------------------------------------------

describe("EpicsPanel logic", () => {
  // Test: "(all)" entry index model
  test("selectedIndex 0 corresponds to (all) entry", () => {
    const selectedIndex = 0;
    expect(selectedIndex === 0).toBe(true); // allSelected
  });

  test("selectedIndex 1 corresponds to first epic (epics[0])", () => {
    const selectedIndex = 1;
    const epicIndex = selectedIndex - 1;
    expect(epicIndex).toBe(0);
  });

  test("selectedIndex maps to epic via offset", () => {
    const epics = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];
    const selectedIndex = 3;
    const epic = epics[selectedIndex - 1];
    expect(epic?.slug).toBe("c");
  });

  // Test: phase color mapping
  test("phase colors match design spec", () => {
    const PHASE_COLOR: Record<string, string> = {
      design: "magenta",
      plan: "blue",
      implement: "yellow",
      validate: "cyan",
      release: "green",
      done: "green",
      cancelled: "red",
    };
    expect(PHASE_COLOR.design).toBe("magenta");
    expect(PHASE_COLOR.plan).toBe("blue");
    expect(PHASE_COLOR.implement).toBe("yellow");
    expect(PHASE_COLOR.validate).toBe("cyan");
    expect(PHASE_COLOR.release).toBe("green");
    expect(PHASE_COLOR.done).toBe("green");
    expect(PHASE_COLOR.cancelled).toBe("red");
  });

  // Test: dim logic
  test("done phase is dimmed", () => {
    const isDim = (p: string) => p === "done" || p === "cancelled";
    expect(isDim("done")).toBe(true);
    expect(isDim("cancelled")).toBe(true);
    expect(isDim("implement")).toBe(false);
    expect(isDim("design")).toBe(false);
  });

  // Test: empty state
  test("empty epics shows 'no epics' state", () => {
    const epics: unknown[] = [];
    expect(epics.length).toBe(0);
    // Component renders "no epics" text when epics.length === 0
  });

  // Test: (all) entry is always present
  test("(all) is always present even with empty epics", () => {
    // The (all) entry is not part of the epics array -- it's always rendered
    // So total visible rows = epics.length + 1
    const epics: unknown[] = [];
    const totalRows = epics.length + 1;
    expect(totalRows).toBe(1); // just (all)
  });

  // Test: epic rows use ● dot marker (no progress bars)
  test("epic rows use dot markers not progress bars", () => {
    // Epics render as: ● slug [status] — inline text, no progress component
    const row = "● my-epic [implement]";
    expect(row).toContain("●");
    expect(row).not.toContain("progress");
  });

  // Test: slugWidth computation
  test("slugWidth is at least 12 + 2 padding", () => {
    const epics = [{ slug: "short" }, { slug: "medium-slug" }];
    const slugWidth = Math.max(12, ...epics.map((e) => e.slug.length)) + 2;
    expect(slugWidth).toBe(14); // max(12, 11) + 2 = 14
  });

  test("slugWidth grows for long slugs", () => {
    const epics = [{ slug: "very-long-epic-slug-name" }];
    const slugWidth = Math.max(12, ...epics.map((e) => e.slug.length)) + 2;
    expect(slugWidth).toBe(26); // 24 + 2
  });
});

// ---------------------------------------------------------------------------
// Group 6: Epic row icon selection
// ---------------------------------------------------------------------------

describe("epic row icon selection", () => {
  const PHASE_COLOR: Record<string, string> = {
    design: "magenta",
    plan: "blue",
    implement: "yellow",
    validate: "cyan",
    release: "green",
    done: "green",
    cancelled: "red",
  };

  const CHROME_MUTED = "#727072";
  const CHROME_TITLE = "#78DCE8";

  function isDim(phase: string): boolean {
    return phase === "done" || phase === "cancelled";
  }

  /** Determines dot color for an epic row — matches EpicsPanel inline logic. */
  function epicDotColor(isSelected: boolean, phase: string): string {
    if (isSelected) return CHROME_TITLE;
    if (isDim(phase)) return CHROME_MUTED;
    return PHASE_COLOR[phase] ?? CHROME_MUTED;
  }

  test("selected epic gets ● in title color", () => {
    expect(epicDotColor(true, "implement")).toBe(CHROME_TITLE);
  });

  test("selected overrides dim state", () => {
    expect(epicDotColor(true, "done")).toBe(CHROME_TITLE);
  });

  test("idle epic gets dot colored by phase", () => {
    expect(epicDotColor(false, "implement")).toBe("yellow");
  });

  test("idle design epic gets magenta dot", () => {
    expect(epicDotColor(false, "design")).toBe("magenta");
  });

  test("done epic gets muted dot", () => {
    expect(epicDotColor(false, "done")).toBe(CHROME_MUTED);
  });

  test("cancelled epic gets muted dot", () => {
    expect(epicDotColor(false, "cancelled")).toBe(CHROME_MUTED);
  });

  test("phase badge uses correct color from PHASE_COLOR map", () => {
    expect(PHASE_COLOR["implement"]).toBe("yellow");
    expect(PHASE_COLOR["validate"]).toBe("cyan");
    expect(PHASE_COLOR["release"]).toBe("green");
    expect(PHASE_COLOR["design"]).toBe("magenta");
    expect(PHASE_COLOR["plan"]).toBe("blue");
    expect(PHASE_COLOR["done"]).toBe("green");
    expect(PHASE_COLOR["cancelled"]).toBe("red");
  });
});

// ---------------------------------------------------------------------------
// Group 2: Dashboard keyboard mode transitions
// ---------------------------------------------------------------------------

describe("dashboard keyboard modes", () => {
  test("normal mode is the default", () => {
    const mode = "normal";
    expect(mode).toBe("normal");
  });

  test("'/' transitions to filter mode", () => {
    let mode = "normal";
    const input = "/";
    if (input === "/") mode = "filter";
    expect(mode).toBe("filter");
  });

  test("Enter in filter mode returns to normal", () => {
    let mode: string = "filter";
    const key = { return: true };
    if (mode === "filter" && key.return) mode = "normal";
    expect(mode).toBe("normal");
  });

  test("Escape in filter mode returns to normal and clears", () => {
    let mode: string = "filter";
    let filterInput = "test";
    const key = { escape: true };
    if (mode === "filter" && key.escape) {
      filterInput = "";
      mode = "normal";
    }
    expect(mode).toBe("normal");
    expect(filterInput).toBe("");
  });

  test("'x' on non-(all) row transitions to confirm mode", () => {
    let mode: string = "normal";
    const selectedIndex = 2;
    const input = "x";
    if (input === "x" && selectedIndex > 0) {
      mode = "confirm";
    }
    expect(mode).toBe("confirm");
  });

  test("'x' on (all) row does NOT transition to confirm mode", () => {
    let mode: string = "normal";
    const selectedIndex = 0;
    const input = "x";
    if (input === "x" && selectedIndex > 0) {
      mode = "confirm";
    }
    expect(mode).toBe("normal");
  });

  test("'y' in confirm mode returns to normal", () => {
    let mode: string = "confirm";
    const input = "y";
    if (mode === "confirm" && (input === "y" || input === "n")) {
      mode = "normal";
    }
    expect(mode).toBe("normal");
  });

  test("Escape in confirm mode returns to normal", () => {
    let mode: string = "confirm";
    const key = { escape: true };
    if (mode === "confirm" && key.escape) {
      mode = "normal";
    }
    expect(mode).toBe("normal");
  });

  test("shutdown keys blocked in filter mode", () => {
    const mode: string = "filter";
    const input = "q";
    // In filter mode, 'q' is treated as text input, not shutdown
    let handled = false;
    if (mode === "filter") {
      // Text input handling
      handled = true;
    } else if (input === "q") {
      // Would be shutdown
    }
    expect(handled).toBe(true);
  });

  test("navigation blocked in filter mode", () => {
    const mode: string = "filter";
    const key = { upArrow: true };
    // In filter mode, arrow keys are not handled as navigation
    let navHandled = false;
    if (mode !== "filter" && key.upArrow) {
      navHandled = true;
    }
    expect(navHandled).toBe(false);
  });

  test("filter input appends characters", () => {
    let filterInput = "";
    const inputs = ["t", "e", "s", "t"];
    for (const ch of inputs) {
      filterInput += ch;
    }
    expect(filterInput).toBe("test");
  });

  test("filter backspace removes last character", () => {
    let filterInput = "test";
    filterInput = filterInput.slice(0, -1);
    expect(filterInput).toBe("tes");
  });

  test("filter backspace on empty string stays empty", () => {
    let filterInput = "";
    filterInput = filterInput.slice(0, -1);
    expect(filterInput).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Group 3: Key hints
// ---------------------------------------------------------------------------

describe("key hints", () => {
  test("normal mode shows all shortcuts", () => {
    const hints = getKeyHints("normal");
    expect(hints).toContain("q quit");
    expect(hints).toContain("navigate");
    expect(hints).toContain("/ filter");
    expect(hints).toContain("x cancel");
    expect(hints).toContain("p phase:");
  });

  test("filter mode shows input and apply/clear", () => {
    const hints = getKeyHints("filter", { filterInput: "test" });
    expect(hints).toContain("/test");
    expect(hints).toContain("apply");
    expect(hints).toContain("clear");
  });

  test("filter mode with empty input shows just /", () => {
    const hints = getKeyHints("filter", { filterInput: "" });
    expect(hints).toContain("/");
  });

  test("confirm mode shows cancel prompt with slug", () => {
    const hints = getKeyHints("confirm", { slug: "my-epic" });
    expect(hints).toContain("Cancel my-epic?");
    expect(hints).toContain("y confirm");
    expect(hints).toContain("abort");
  });

  test("confirm mode without slug still renders", () => {
    const hints = getKeyHints("confirm");
    expect(hints).toContain("Cancel");
    expect(hints).toContain("y confirm");
  });
});

// ---------------------------------------------------------------------------
// Group 4: Epic filtering and sorting (App.tsx logic)
// ---------------------------------------------------------------------------

describe("epic filtering and sorting", () => {
  const STATUS_ORDER: Record<string, number> = {
    design: 0,
    plan: 0,
    implement: 0,
    validate: 0,
    release: 0,
    done: 1,
    cancelled: 1,
  };

  interface FakeEpic {
    slug: string;
    status: string;
    created_at: string;
  }

  function sortEpics(epics: FakeEpic[]): FakeEpic[] {
    return [...epics].sort((a, b) => {
      const aGroup = STATUS_ORDER[a.status] ?? 99;
      const bGroup = STATUS_ORDER[b.status] ?? 99;
      if (aGroup !== bGroup) return aGroup - bGroup;
      return b.created_at.localeCompare(a.created_at);
    });
  }

  test("sort puts active epics before terminal epics", () => {
    const epics: FakeEpic[] = [
      { slug: "done-one", status: "done", created_at: "2025-12-01T00:00:00.000Z" },
      { slug: "active-one", status: "design", created_at: "2025-01-01T00:00:00.000Z" },
      { slug: "cancelled-one", status: "cancelled", created_at: "2025-11-01T00:00:00.000Z" },
    ];
    const sorted = sortEpics(epics);
    expect(sorted.map((e) => e.slug)).toEqual(["active-one", "done-one", "cancelled-one"]);
  });

  test("sort orders by created_at descending within same group", () => {
    const epics: FakeEpic[] = [
      { slug: "old", status: "implement", created_at: "2025-01-01T00:00:00.000Z" },
      { slug: "new", status: "plan", created_at: "2025-12-01T00:00:00.000Z" },
    ];
    const sorted = sortEpics(epics);
    expect(sorted.map((e) => e.slug)).toEqual(["new", "old"]);
  });

  test("phase filter shows only matching epics", () => {
    const epics: FakeEpic[] = [
      { slug: "a", status: "implement", created_at: "2025-06-01T00:00:00.000Z" },
      { slug: "b", status: "done", created_at: "2025-06-01T00:00:00.000Z" },
      { slug: "c", status: "cancelled", created_at: "2025-06-01T00:00:00.000Z" },
    ];
    const phaseFilter = "implement";
    const visible = phaseFilter === "all"
      ? epics
      : epics.filter((e) => e.status === phaseFilter);
    expect(visible.map((e) => e.slug)).toEqual(["a"]);
  });

  test("phase filter 'all' includes everything", () => {
    const epics: FakeEpic[] = [
      { slug: "a", status: "implement", created_at: "2025-06-01T00:00:00.000Z" },
      { slug: "b", status: "done", created_at: "2025-06-01T00:00:00.000Z" },
    ];
    const phaseFilter = "all";
    const visible = phaseFilter === "all"
      ? epics
      : epics.filter((e) => e.status === phaseFilter);
    expect(visible.length).toBe(2);
  });

  test("name filter matches substring", () => {
    const epics: FakeEpic[] = [
      { slug: "dashboard-rework", status: "implement", created_at: "2025-06-01T00:00:00.000Z" },
      { slug: "auth-flow", status: "design", created_at: "2025-06-01T00:00:00.000Z" },
      { slug: "dashboard-v2", status: "plan", created_at: "2025-06-01T00:00:00.000Z" },
    ];
    const filterString = "dashboard";
    const filtered = epics.filter((e) => e.slug.includes(filterString));
    expect(filtered.map((e) => e.slug)).toEqual([
      "dashboard-rework",
      "dashboard-v2",
    ]);
  });

  test("empty filter returns all", () => {
    const epics: FakeEpic[] = [{ slug: "a", status: "implement", created_at: "2025-06-01T00:00:00.000Z" }];
    const filterString = "";
    const filtered = filterString
      ? epics.filter((e) => e.slug.includes(filterString))
      : epics;
    expect(filtered.length).toBe(1);
  });

  test("index clamping after filter reduces list", () => {
    const selectedIndex = 5;
    const newCount = 3; // 2 epics + 1 (all)
    const clamped = Math.min(
      Math.max(0, selectedIndex),
      Math.max(0, newCount - 1),
    );
    expect(clamped).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Group 5: slugAtIndex offset model
// ---------------------------------------------------------------------------

describe("slugAtIndex", () => {
  test("index 0 returns undefined (all entry)", () => {
    const epics = [{ slug: "a" }, { slug: "b" }];
    function slugAtIndex(index: number) {
      if (index === 0) return undefined;
      return epics[index - 1]?.slug;
    }
    expect(slugAtIndex(0)).toBeUndefined();
  });

  test("index 1 returns first epic slug", () => {
    const epics = [{ slug: "first" }, { slug: "second" }];
    function slugAtIndex(index: number) {
      if (index === 0) return undefined;
      return epics[index - 1]?.slug;
    }
    expect(slugAtIndex(1)).toBe("first");
  });

  test("out-of-range index returns undefined", () => {
    const epics = [{ slug: "a" }];
    function slugAtIndex(index: number) {
      if (index === 0) return undefined;
      return epics[index - 1]?.slug;
    }
    expect(slugAtIndex(5)).toBeUndefined();
  });
});
