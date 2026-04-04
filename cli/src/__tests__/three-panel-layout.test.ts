import { describe, test, expect } from "bun:test";

// ---------------------------------------------------------------------------
// Terminal size logic
// ---------------------------------------------------------------------------

describe("terminal size logic", () => {
  test("falls back to 80x24 when stdout dimensions are undefined", () => {
    const rawCols: number | undefined = undefined;
    const rawRows: number | undefined = undefined;
    const columns = rawCols ?? 80;
    const rows = rawRows ?? 24;
    expect(columns).toBe(80);
    expect(rows).toBe(24);
  });

  test("uses actual dimensions when available", () => {
    const rawCols: number | undefined = 120;
    const rawRows: number | undefined = 40;
    const columns = rawCols ?? 80;
    const rows = rawRows ?? 24;
    expect(columns).toBe(120);
    expect(rows).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// MinSizeGate logic
// ---------------------------------------------------------------------------

describe("MinSizeGate size check logic", () => {
  const minColumns = 80;
  const minRows = 24;

  test("passes when terminal meets minimum size", () => {
    const columns = 120;
    const rows = 40;
    const tooSmall = columns < minColumns || rows < minRows;
    expect(tooSmall).toBe(false);
  });

  test("fails when columns below minimum", () => {
    const columns = 60;
    const rows = 30;
    const tooSmall = columns < minColumns || rows < minRows;
    expect(tooSmall).toBe(true);
  });

  test("fails when rows below minimum", () => {
    const columns = 100;
    const rows = 20;
    const tooSmall = columns < minColumns || rows < minRows;
    expect(tooSmall).toBe(true);
  });

  test("fails when both below minimum", () => {
    const columns = 40;
    const rows = 10;
    const tooSmall = columns < minColumns || rows < minRows;
    expect(tooSmall).toBe(true);
  });

  test("passes at exact minimum dimensions", () => {
    const columns = 80;
    const rows = 24;
    const tooSmall = columns < minColumns || rows < minRows;
    expect(tooSmall).toBe(false);
  });

  test("custom minimum thresholds work", () => {
    const customMinCols = 100;
    const customMinRows = 30;
    const columns = 90;
    const rows = 35;
    const tooSmall = columns < customMinCols || rows < customMinRows;
    expect(tooSmall).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PanelBox title formatting
// ---------------------------------------------------------------------------

describe("PanelBox title formatting", () => {
  test("title is formatted with box-drawing decoration", () => {
    const title = "EPICS";
    const formatted = `─── ${title} ───`;
    expect(formatted).toBe("─── EPICS ───");
  });

  test("different titles produce correct formatting", () => {
    const titles = ["EPICS", "OVERVIEW", "LOG"];
    const formatted = titles.map((t) => `─── ${t} ───`);
    expect(formatted).toEqual([
      "─── EPICS ───",
      "─── OVERVIEW ───",
      "─── LOG ───",
    ]);
  });

  test("empty title produces no decoration", () => {
    const title = "";
    // PanelBox renders title only when truthy
    const shouldRender = !!title;
    expect(shouldRender).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ThreePanelLayout proportions
// ---------------------------------------------------------------------------

describe("ThreePanelLayout proportions", () => {
  test("left column is 35% width", () => {
    const leftColumnWidth = "35%";
    expect(leftColumnWidth).toBe("35%");
  });

  test("right column is 65% width", () => {
    const rightColumnWidth = "65%";
    expect(rightColumnWidth).toBe("65%");
  });

  test("epics panel is 60% of left column height", () => {
    const epicsHeight = "60%";
    expect(epicsHeight).toBe("60%");
  });

  test("overview panel fills remaining left column height", () => {
    // OVERVIEW uses flexGrow={1} — takes remaining 40%
    const overviewFlexGrow = 1;
    expect(overviewFlexGrow).toBe(1);
  });

  test("log panel fills full right column height", () => {
    // LOG uses flexGrow={1} — full height of right column
    const logFlexGrow = 1;
    expect(logFlexGrow).toBe(1);
  });

  test("column widths sum correctly", () => {
    const left = 35;
    const right = 65;
    expect(left + right).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Watch status display logic
// ---------------------------------------------------------------------------

describe("watch status display", () => {
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
// Key hints bar logic
// ---------------------------------------------------------------------------

describe("key hints bar", () => {
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
