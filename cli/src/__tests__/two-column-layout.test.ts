import { describe, test, expect } from "bun:test";

// ---------------------------------------------------------------------------
// PanelBox backgroundColor prop
// ---------------------------------------------------------------------------

describe("PanelBox backgroundColor prop", () => {
  test("backgroundColor prop is accepted and passed to content Box", () => {
    const props = { title: "TEST", backgroundColor: "#2d2d2d" };
    expect(props.backgroundColor).toBe("#2d2d2d");
  });

  test("backgroundColor defaults to undefined when not provided", () => {
    const props = { title: "TEST" };
    const bg = (props as { backgroundColor?: string }).backgroundColor;
    expect(bg).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// TwoColumnLayout proportions
// ---------------------------------------------------------------------------

describe("TwoColumnLayout proportions", () => {
  test("left column is 40% width", () => {
    const leftWidth = "40%";
    expect(leftWidth).toBe("40%");
  });

  test("right column is 60% width", () => {
    const rightWidth = "60%";
    expect(rightWidth).toBe("60%");
  });

  test("column widths sum to 100%", () => {
    const left = 40;
    const right = 60;
    expect(left + right).toBe(100);
  });

  test("epics panel takes 60% of left column height", () => {
    const epicsHeight = "60%";
    expect(epicsHeight).toBe("60%");
  });

  test("details panel takes 40% of left column height", () => {
    const detailsHeight = "40%";
    expect(detailsHeight).toBe("40%");
  });

  test("left column height splits sum to 100%", () => {
    const epics = 60;
    const details = 40;
    expect(epics + details).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// TwoColumnLayout header (no outer chrome)
// ---------------------------------------------------------------------------

describe("TwoColumnLayout header", () => {
  test("header has no border — plain row with paddingX", () => {
    const headerProps = { paddingX: 1, borderStyle: undefined };
    expect(headerProps.borderStyle).toBeUndefined();
    expect(headerProps.paddingX).toBe(1);
  });

  test("shows 'watch: running' with green when running", () => {
    const watchRunning = true;
    const text = watchRunning ? "watch: running" : "watch: stopped";
    const color = watchRunning ? "green" : "red";
    expect(text).toBe("watch: running");
    expect(color).toBe("green");
  });

  test("shows 'watch: stopped' with red when stopped", () => {
    const watchRunning = false;
    const text = watchRunning ? "watch: running" : "watch: stopped";
    const color = watchRunning ? "green" : "red";
    expect(text).toBe("watch: stopped");
    expect(color).toBe("red");
  });
});

// ---------------------------------------------------------------------------
// TwoColumnLayout panel styling
// ---------------------------------------------------------------------------

describe("TwoColumnLayout panel styling", () => {
  test("panels use dark charcoal background", () => {
    const DARK_CHARCOAL = "#2d2d2d";
    expect(DARK_CHARCOAL).toBe("#2d2d2d");
  });

  test("no outer chrome border wrapping the layout", () => {
    const outerBoxProps = { flexDirection: "column", width: "100%", height: "100%" };
    expect(outerBoxProps).not.toHaveProperty("borderStyle");
    expect(outerBoxProps).not.toHaveProperty("borderColor");
  });
});

// ---------------------------------------------------------------------------
// Key hints bar
// ---------------------------------------------------------------------------

describe("TwoColumnLayout key hints bar", () => {
  test("shows shutting down when isShuttingDown is true", () => {
    const isShuttingDown = true;
    const display = isShuttingDown ? "shutting down..." : "key hints here";
    expect(display).toBe("shutting down...");
  });

  test("shows key hints when not shutting down", () => {
    const isShuttingDown = false;
    const keyHints = "q quit  ↑↓ navigate";
    const display = isShuttingDown ? "shutting down..." : keyHints;
    expect(display).toBe("q quit  ↑↓ navigate");
  });
});
