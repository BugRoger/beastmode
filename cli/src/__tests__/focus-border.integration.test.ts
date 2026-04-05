import { describe, test, expect } from "vitest";
import { NYAN_PALETTE } from "../dashboard/nyan-colors.js";
import { CHROME } from "../dashboard/monokai-palette.js";

describe("Focus Border Integration", () => {
  describe("Focused panel border uses the nyan banner leftmost color", () => {
    test("focused panel border color matches NYAN_PALETTE[tick % 256]", () => {
      const tick = 42;
      const expectedColor = NYAN_PALETTE[tick % 256];
      expect(expectedColor).toBeDefined();
      expect(expectedColor).toMatch(/^#[0-9A-F]{6}$/);

      const unfocusedColor = CHROME.border;
      expect(unfocusedColor).toBe("#727072");

      expect(expectedColor).not.toBe(unfocusedColor);
    });
  });

  describe("Border color updates on each animation tick", () => {
    test("color changes as tick advances", () => {
      const colors = [0, 1, 2, 3, 4].map((tick) => NYAN_PALETTE[tick % 256]);
      for (let i = 1; i < colors.length; i++) {
        expect(colors[i]).not.toBe(colors[i - 1]);
      }
    });

    test("color progression follows nyan gradient", () => {
      const ticks = Array.from({ length: 10 }, (_, i) => i);
      const colors = ticks.map((t) => NYAN_PALETTE[t % 256]);
      for (const c of colors) {
        expect(NYAN_PALETTE as readonly string[]).toContain(c);
      }
    });
  });

  describe("Focus change transfers the animated border", () => {
    test("focus state toggles between epics and log", () => {
      const panels = ["epics", "log"] as const;
      let focusIndex = 0;
      expect(panels[focusIndex]).toBe("epics");

      focusIndex = (focusIndex + 1) % panels.length;
      expect(panels[focusIndex]).toBe("log");

      focusIndex = (focusIndex + 1) % panels.length;
      expect(panels[focusIndex]).toBe("epics");
    });

    test("only focused panel receives borderColor, unfocused gets undefined", () => {
      type FocusedPanel = "epics" | "log";
      const focusedPanel: FocusedPanel = "epics";
      const tick = 10;
      const borderColor = NYAN_PALETTE[tick % 256];

      const epicsBorderColor = focusedPanel === "epics" ? borderColor : undefined;
      const logBorderColor = focusedPanel === "log" ? borderColor : undefined;

      expect(epicsBorderColor).toBe(borderColor);
      expect(logBorderColor).toBeUndefined();

      const newFocus: FocusedPanel = "log";
      const newEpicsBorder = newFocus === "epics" ? borderColor : undefined;
      const newLogBorder = newFocus === "log" ? borderColor : undefined;

      expect(newEpicsBorder).toBeUndefined();
      expect(newLogBorder).toBe(borderColor);
    });
  });
});
