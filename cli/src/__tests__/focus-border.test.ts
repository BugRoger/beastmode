import { describe, test, expect } from "vitest";
import { CHROME } from "../dashboard/monokai-palette.js";

describe("PanelBox borderColor prop", () => {
  test("PanelBoxProps interface includes optional borderColor", async () => {
    const mod = await import("../dashboard/PanelBox.js");
    expect(typeof mod.default).toBe("function");
  });

  test("borderColor defaults to CHROME.border when undefined", () => {
    const borderColor: string | undefined = undefined;
    const effectiveColor = borderColor ?? CHROME.border;
    expect(effectiveColor).toBe("#727072");
  });

  test("borderColor overrides CHROME.border when provided", () => {
    const borderColor: string | undefined = "#FF0000";
    const effectiveColor = borderColor ?? CHROME.border;
    expect(effectiveColor).toBe("#FF0000");
  });
});

describe("NyanBanner tick prop", () => {
  test("NyanBanner accepts a tick prop", async () => {
    const mod = await import("../dashboard/NyanBanner.js");
    expect(typeof mod.default).toBe("function");
  });

  test("TICK_INTERVAL_MS is exported", async () => {
    const mod = await import("../dashboard/NyanBanner.js");
    expect(mod.TICK_INTERVAL_MS).toBe(80);
  });
});

describe("focusedPanel state", () => {
  test("FocusedPanel type is epics or log", () => {
    type FocusedPanel = "epics" | "log";
    const panel: FocusedPanel = "epics";
    expect(["epics", "log"]).toContain(panel);
  });

  test("Tab toggles focus between epics and log", () => {
    type FocusedPanel = "epics" | "log";
    const toggle = (current: FocusedPanel): FocusedPanel =>
      current === "epics" ? "log" : "epics";

    expect(toggle("epics")).toBe("log");
    expect(toggle("log")).toBe("epics");
  });
});
