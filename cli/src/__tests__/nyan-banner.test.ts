import { describe, test, expect } from "bun:test";
import { NYAN_PALETTE, nyanColor } from "../dashboard/nyan-colors.js";

describe("NYAN_PALETTE", () => {
  test("has exactly 6 colors", () => {
    expect(NYAN_PALETTE).toHaveLength(6);
  });

  test("all entries are hex color strings", () => {
    for (const color of NYAN_PALETTE) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});

describe("nyanColor", () => {
  test("returns palette color for non-space character at index 0, offset 0", () => {
    expect(nyanColor("█", 0, 0)).toBe(NYAN_PALETTE[0]);
  });

  test("returns palette color based on (charIndex + tickOffset) % 6", () => {
    expect(nyanColor("█", 2, 3)).toBe(NYAN_PALETTE[5]); // (2+3)%6 = 5
  });

  test("returns undefined for space characters", () => {
    expect(nyanColor(" ", 0, 0)).toBeUndefined();
    expect(nyanColor(" ", 5, 3)).toBeUndefined();
  });

  test("wraps around palette boundary", () => {
    expect(nyanColor("█", 5, 0)).toBe(NYAN_PALETTE[5]);
    expect(nyanColor("█", 6, 0)).toBe(NYAN_PALETTE[0]); // wraps
    expect(nyanColor("█", 7, 0)).toBe(NYAN_PALETTE[1]);
  });

  test("tick offset shifts the color assignment", () => {
    expect(nyanColor("█", 0, 0)).toBe(NYAN_PALETTE[0]);
    expect(nyanColor("█", 0, 1)).toBe(NYAN_PALETTE[1]);
    expect(nyanColor("█", 0, 5)).toBe(NYAN_PALETTE[5]);
    expect(nyanColor("█", 0, 6)).toBe(NYAN_PALETTE[0]);
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
});

describe("banner text", () => {
  const BANNER_LINE_1 = "█▄▄ █▀▀ ▄▀█ █▀▀ ▀█▀ █▀▄▀█ █▀█ █▄▀ █▀▀";
  const BANNER_LINE_2 = "█▄█ ██▄ █▀█ ▄▄█  █  █ ▀ █ █▄█ █▀▄ ██▄";

  test("both banner lines have the same length", () => {
    expect(BANNER_LINE_1.length).toBe(BANNER_LINE_2.length);
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
    for (let i = 0; i < BANNER_LINE_1.length; i++) {
      const char1 = BANNER_LINE_1[i];
      const char2 = BANNER_LINE_2[i];
      if (char1 !== " " && char2 !== " ") {
        expect(nyanColor(char1, i, tick)).toBe(nyanColor(char2, i, tick));
      }
    }
  });
});
