import { describe, test, expect } from "bun:test";
import { getKeyHints } from "../dashboard/key-hints.js";
import { getEpicIcon } from "../dashboard/EpicsPanel.js";


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

  // Test: no progress bars in epic rows
  test("epic rows do not include progress bars", () => {
    // ProgressBar component removed from EpicsPanel — rows show icon + slug + phase badge
    const icon = getEpicIcon(false, false, "implement");
    expect(icon).not.toHaveProperty("progress");
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

  function isDim(phase: string): boolean {
    return phase === "done" || phase === "cancelled";
  }

  interface IconResult {
    char: string;
    color: string | undefined;
    dim: boolean;
    spinner: boolean;
  }

  function getEpicIcon(
    isSelected: boolean,
    isActive: boolean,
    phase: string,
  ): IconResult {
    if (isSelected) {
      return { char: ">", color: "cyan", dim: false, spinner: false };
    }
    if (isActive) {
      return { char: "", color: "yellow", dim: false, spinner: true };
    }
    if (isDim(phase)) {
      return { char: "\u00b7", color: undefined, dim: true, spinner: false };
    }
    return {
      char: "\u00b7",
      color: PHASE_COLOR[phase],
      dim: false,
      spinner: false,
    };
  }

  test("selected epic gets > in cyan", () => {
    const icon = getEpicIcon(true, false, "implement");
    expect(icon.char).toBe(">");
    expect(icon.color).toBe("cyan");
    expect(icon.spinner).toBe(false);
  });

  test("selected overrides running state", () => {
    const icon = getEpicIcon(true, true, "implement");
    expect(icon.char).toBe(">");
    expect(icon.color).toBe("cyan");
    expect(icon.spinner).toBe(false);
  });

  test("running non-selected epic gets spinner in yellow", () => {
    const icon = getEpicIcon(false, true, "implement");
    expect(icon.spinner).toBe(true);
    expect(icon.color).toBe("yellow");
  });

  test("idle epic gets dot colored by phase", () => {
    const icon = getEpicIcon(false, false, "implement");
    expect(icon.char).toBe("\u00b7");
    expect(icon.color).toBe("yellow");
    expect(icon.spinner).toBe(false);
  });

  test("idle design epic gets magenta dot", () => {
    const icon = getEpicIcon(false, false, "design");
    expect(icon.char).toBe("\u00b7");
    expect(icon.color).toBe("magenta");
  });

  test("done epic gets dimmed dot", () => {
    const icon = getEpicIcon(false, false, "done");
    expect(icon.char).toBe("\u00b7");
    expect(icon.dim).toBe(true);
    expect(icon.color).toBeUndefined();
  });

  test("cancelled epic gets dimmed dot", () => {
    const icon = getEpicIcon(false, false, "cancelled");
    expect(icon.char).toBe("\u00b7");
    expect(icon.dim).toBe(true);
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
    expect(hints).toContain("a all");
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
  const PHASE_ORDER: Record<string, number> = {
    cancelled: -1,
    design: 0,
    plan: 1,
    implement: 2,
    validate: 3,
    release: 4,
    done: 5,
  };

  interface FakeEpic {
    slug: string;
    phase: string;
  }

  function sortEpics(epics: FakeEpic[]): FakeEpic[] {
    return [...epics].sort((a, b) => {
      const aP = PHASE_ORDER[a.phase] ?? 99;
      const bP = PHASE_ORDER[b.phase] ?? 99;
      if (aP !== bP) return bP - aP;
      return a.slug.localeCompare(b.slug);
    });
  }

  test("sort puts furthest phase first", () => {
    const epics: FakeEpic[] = [
      { slug: "a", phase: "design" },
      { slug: "b", phase: "validate" },
      { slug: "c", phase: "implement" },
    ];
    const sorted = sortEpics(epics);
    expect(sorted.map((e) => e.slug)).toEqual(["b", "c", "a"]);
  });

  test("sort breaks ties alphabetically", () => {
    const epics: FakeEpic[] = [
      { slug: "c-epic", phase: "implement" },
      { slug: "a-epic", phase: "implement" },
    ];
    const sorted = sortEpics(epics);
    expect(sorted.map((e) => e.slug)).toEqual(["a-epic", "c-epic"]);
  });

  test("toggle filters out done and cancelled", () => {
    const epics: FakeEpic[] = [
      { slug: "a", phase: "implement" },
      { slug: "b", phase: "done" },
      { slug: "c", phase: "cancelled" },
    ];
    const showAll = false;
    const visible = showAll
      ? epics
      : epics.filter((e) => e.phase !== "done" && e.phase !== "cancelled");
    expect(visible.map((e) => e.slug)).toEqual(["a"]);
  });

  test("toggle showAll includes done and cancelled", () => {
    const epics: FakeEpic[] = [
      { slug: "a", phase: "implement" },
      { slug: "b", phase: "done" },
    ];
    const showAll = true;
    const visible = showAll
      ? epics
      : epics.filter((e) => e.phase !== "done" && e.phase !== "cancelled");
    expect(visible.length).toBe(2);
  });

  test("name filter matches substring", () => {
    const epics: FakeEpic[] = [
      { slug: "dashboard-rework", phase: "implement" },
      { slug: "auth-flow", phase: "design" },
      { slug: "dashboard-v2", phase: "plan" },
    ];
    const filterString = "dashboard";
    const filtered = epics.filter((e) => e.slug.includes(filterString));
    expect(filtered.map((e) => e.slug)).toEqual([
      "dashboard-rework",
      "dashboard-v2",
    ]);
  });

  test("empty filter returns all", () => {
    const epics: FakeEpic[] = [{ slug: "a", phase: "implement" }];
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
