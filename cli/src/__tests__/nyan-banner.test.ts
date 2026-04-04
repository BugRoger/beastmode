import { describe, test, expect } from "bun:test";
import { NYAN_PALETTE, nyanColor } from "../dashboard/nyan-colors.js";

describe("NYAN_PALETTE", () => {
  test("has exactly 256 entries", () => {
    expect(NYAN_PALETTE).toHaveLength(256);
  });

  test("all entries are hex color strings", () => {
    for (const color of NYAN_PALETTE) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  test("first entry is the first anchor color (red)", () => {
    expect(NYAN_PALETTE[0]).toBe("#FF0000");
  });

  test("adjacent entries differ by small RGB deltas (smooth transitions)", () => {
    for (let i = 1; i < NYAN_PALETTE.length; i++) {
      const prev = NYAN_PALETTE[i - 1];
      const curr = NYAN_PALETTE[i];
      const pr = parseInt(prev.slice(1, 3), 16);
      const pg = parseInt(prev.slice(3, 5), 16);
      const pb = parseInt(prev.slice(5, 7), 16);
      const cr = parseInt(curr.slice(1, 3), 16);
      const cg = parseInt(curr.slice(3, 5), 16);
      const cb = parseInt(curr.slice(5, 7), 16);
      const maxDelta = Math.max(
        Math.abs(cr - pr),
        Math.abs(cg - pg),
        Math.abs(cb - pb),
      );
      // Each segment spans ~43 steps. Max channel delta per segment is 255,
      // so per-step max is ~6. Allow 7 for rounding.
      expect(maxDelta).toBeLessThanOrEqual(7);
    }
  });
});

describe("nyanColor", () => {
  test("returns palette color for non-space character at index 0, offset 0", () => {
    expect(nyanColor("█", 0, 0)).toBe(NYAN_PALETTE[0]);
  });

  test("returns palette color based on (charIndex + tickOffset) % 256", () => {
    expect(nyanColor("█", 2, 3)).toBe(NYAN_PALETTE[5]);
    expect(nyanColor("█", 100, 200)).toBe(NYAN_PALETTE[(100 + 200) % 256]);
  });

  test("returns undefined for space characters", () => {
    expect(nyanColor(" ", 0, 0)).toBeUndefined();
    expect(nyanColor(" ", 5, 3)).toBeUndefined();
  });

  test("wraps around palette boundary at 256", () => {
    expect(nyanColor("█", 255, 0)).toBe(NYAN_PALETTE[255]);
    expect(nyanColor("█", 256, 0)).toBe(NYAN_PALETTE[0]); // wraps
    expect(nyanColor("█", 257, 0)).toBe(NYAN_PALETTE[1]);
  });

  test("tick offset shifts the color assignment", () => {
    expect(nyanColor("█", 0, 0)).toBe(NYAN_PALETTE[0]);
    expect(nyanColor("█", 0, 1)).toBe(NYAN_PALETTE[1]);
    expect(nyanColor("█", 0, 255)).toBe(NYAN_PALETTE[255]);
    expect(nyanColor("█", 0, 256)).toBe(NYAN_PALETTE[0]);
  });

  test("both lines get same color at same charIndex and offset", () => {
    const line1Char = "█";
    const line2Char = "▄";
    const idx = 4;
    const offset = 2;
    expect(nyanColor(line1Char, idx, offset)).toBe(nyanColor(line2Char, idx, offset));
  });

  test("handles large tick offsets without error", () => {
    const color = nyanColor("█", 0, 100000);
    expect(color).toBeDefined();
    expect(NYAN_PALETTE as readonly string[]).toContain(color as string);
  });

  test("full rotation takes approximately 20 seconds at 80ms tick", () => {
    // 256 steps × 80ms = 20,480ms ≈ 20.5 seconds
    const stepsForFullRotation = NYAN_PALETTE.length;
    const tickMs = 80;
    const rotationMs = stepsForFullRotation * tickMs;
    expect(rotationMs).toBeGreaterThanOrEqual(20000);
    expect(rotationMs).toBeLessThanOrEqual(21000);
  });
});

describe("banner text", () => {
  const BANNER_LINE_1 = "█▄▄ █▀▀ ▄▀█ █▀▀ ▀█▀ █▀▄▀█ █▀█ █▀▄ █▀▀";
  const BANNER_LINE_2 = "█▄█ ██▄ █▀█ ▄▄█  █  █ ▀ █ █▄█ █▄▀ ██▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄";

  test("line 2 has 15 trailing dot characters", () => {
    const dotsSection = BANNER_LINE_2.slice(38); // after the text portion (37 chars) + space separator
    const dots = dotsSection.split(" ").filter((c) => c === "▄");
    expect(dots).toHaveLength(15);
  });

  test("banner lines contain block characters", () => {
    expect(BANNER_LINE_1).toMatch(/[█▄▀]/);
    expect(BANNER_LINE_2).toMatch(/[█▄▀]/);
  });

  test("banner lines contain spaces for word separation", () => {
    expect(BANNER_LINE_1).toContain(" ");
    expect(BANNER_LINE_2).toContain(" ");
  });

  test("vertical coherence: same charIndex gets same color on both lines", () => {
    const tick = 7;
    const minLen = Math.min(BANNER_LINE_1.length, BANNER_LINE_2.length);
    for (let i = 0; i < minLen; i++) {
      const char1 = BANNER_LINE_1[i];
      const char2 = BANNER_LINE_2[i];
      if (char1 !== " " && char2 !== " ") {
        expect(nyanColor(char1, i, tick)).toBe(nyanColor(char2, i, tick));
      }
    }
  });
});
