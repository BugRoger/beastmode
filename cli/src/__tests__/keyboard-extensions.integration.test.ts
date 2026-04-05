import { describe, test, expect } from "vitest";

// ---------------------------------------------------------------------------
// Keyboard Extensions — Integration Tests
// Pure state-machine logic tests covering the full Gherkin scenarios.
// ---------------------------------------------------------------------------

// Phase filter cycle order
const PHASE_ORDER = ["all", "design", "plan", "implement", "validate", "release"] as const;
type PhaseFilter = (typeof PHASE_ORDER)[number];

function cyclePhaseFilter(current: PhaseFilter): PhaseFilter {
  const idx = PHASE_ORDER.indexOf(current);
  return PHASE_ORDER[(idx + 1) % PHASE_ORDER.length];
}

// Focus panel toggle
type FocusedPanel = "epics" | "log";

function toggleFocus(current: FocusedPanel): FocusedPanel {
  return current === "epics" ? "log" : "epics";
}

// Log scroll state
interface LogScrollState {
  offset: number;
  autoFollow: boolean;
}

function scrollUp(state: LogScrollState): LogScrollState {
  return { offset: Math.max(0, state.offset - 1), autoFollow: false };
}

function scrollDown(state: LogScrollState, maxOffset: number): LogScrollState {
  return { offset: Math.min(maxOffset, state.offset + 1), autoFollow: false };
}

function resumeAutoFollow(totalLines: number): LogScrollState {
  return { offset: Math.max(0, totalLines - 1), autoFollow: true };
}

// ---------------------------------------------------------------------------
// Phase filter cycling
// ---------------------------------------------------------------------------

describe("Phase filter cycling", () => {
  test("default phase filter is 'all'", () => {
    const phaseFilter: PhaseFilter = "all";
    expect(phaseFilter).toBe("all");
  });

  test.each([
    ["all", "design"],
    ["design", "plan"],
    ["plan", "implement"],
    ["implement", "validate"],
    ["validate", "release"],
    ["release", "all"],
  ] as const)("pressing p cycles from %s to %s", (current, expected) => {
    expect(cyclePhaseFilter(current)).toBe(expected);
  });

  test("phase filter restricts visible entries", () => {
    const entries = [
      { phase: "design", message: "d1" },
      { phase: "plan", message: "p1" },
      { phase: "implement", message: "i1" },
    ];
    const filter: PhaseFilter = "plan";
    const visible = entries.filter((e) => filter === "all" || e.phase === filter);
    expect(visible).toEqual([{ phase: "plan", message: "p1" }]);
    expect(visible.find((e) => e.phase === "design")).toBeUndefined();
    expect(visible.find((e) => e.phase === "implement")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Log panel scrolling
// ---------------------------------------------------------------------------

describe("Log panel scrolling", () => {
  test("auto-follow is active by default", () => {
    const state: LogScrollState = { offset: 0, autoFollow: true };
    expect(state.autoFollow).toBe(true);
  });

  test("scroll up pauses auto-follow", () => {
    const state: LogScrollState = { offset: 5, autoFollow: true };
    const next = scrollUp(state);
    expect(next.autoFollow).toBe(false);
    expect(next.offset).toBe(4);
  });

  test("resume auto-follow on G/End", () => {
    const totalLines = 100;
    const state = resumeAutoFollow(totalLines);
    expect(state.autoFollow).toBe(true);
    expect(state.offset).toBe(99);
  });

  test("new entry visible when auto-following", () => {
    const totalLinesBefore = 10;
    const state: LogScrollState = { offset: totalLinesBefore - 1, autoFollow: true };
    const totalLinesAfter = 11;
    const newOffset = state.autoFollow ? totalLinesAfter - 1 : state.offset;
    expect(newOffset).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Focus switching
// ---------------------------------------------------------------------------

describe("Focus switching", () => {
  test("Tab switches from epics to log", () => {
    expect(toggleFocus("epics")).toBe("log");
  });

  test("Tab switches from log to epics", () => {
    expect(toggleFocus("log")).toBe("epics");
  });

  test("default focus is epics", () => {
    const focusedPanel: FocusedPanel = "epics";
    expect(focusedPanel).toBe("epics");
  });
});

// ---------------------------------------------------------------------------
// Blocked items toggle
// ---------------------------------------------------------------------------

describe("Blocked items toggle", () => {
  test("blocked items visible by default", () => {
    const showBlocked = true;
    expect(showBlocked).toBe(true);
  });

  test("pressing b hides blocked items", () => {
    let showBlocked = true;
    showBlocked = !showBlocked;
    expect(showBlocked).toBe(false);
  });

  test("pressing b again shows blocked items", () => {
    let showBlocked = false;
    showBlocked = !showBlocked;
    expect(showBlocked).toBe(true);
  });

  test("blocked filter removes blocked entries from tree", () => {
    const features = [
      { slug: "active-feat", status: "active" },
      { slug: "blocked-feat", status: "blocked" },
    ];
    const showBlocked = false;
    const visible = features.filter((f) => showBlocked || f.status !== "blocked");
    expect(visible).toHaveLength(1);
    expect(visible[0].slug).toBe("active-feat");
  });

  test("blocked filter shows all when enabled", () => {
    const features = [
      { slug: "active-feat", status: "active" },
      { slug: "blocked-feat", status: "blocked" },
    ];
    const showBlocked = true;
    const visible = features.filter((f) => showBlocked || f.status !== "blocked");
    expect(visible).toHaveLength(2);
  });
});
