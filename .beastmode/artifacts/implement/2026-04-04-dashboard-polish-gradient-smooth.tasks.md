# Gradient Smooth — Implementation Tasks

## Goal

Replace the 6-color hard-switch nyan cat palette with a 256-step interpolated palette for smooth, slow-drifting color bands in the dashboard banner.

## Architecture

- Linear RGB interpolation between the 6 nyan cat anchor colors
- ~43 steps per transition (256 / 6 ≈ 42.67)
- `nyanColor()` changes modulus from 6 to 256
- 80ms tick interval unchanged — 256 steps × 80ms ≈ 20.5s per full rotation
- Anchor colors unchanged: #FF0000, #FF9008, #F6FF00, #7CFF27, #5FFBFF, #6400FF

## Tech Stack

- TypeScript, Bun test runner
- Files in `cli/src/dashboard/` and `cli/src/__tests__/`

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/dashboard/nyan-colors.ts` | Modify | Add interpolation logic, replace NYAN_PALETTE with 256-entry palette, update nyanColor modulus |
| `cli/src/__tests__/nyan-banner.test.ts` | Modify | Update all tests to expect 256-entry palette and modulo-256 behavior |

---

### Task 1: Update nyan-colors.ts with 256-step interpolated palette

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/nyan-colors.ts`

- [x] **Step 1: Implement the interpolated palette and updated nyanColor function**

Replace the entire contents of `cli/src/dashboard/nyan-colors.ts` with:

```typescript
/**
 * Nyan cat rainbow color palette — 256-step smooth interpolation.
 * Linear RGB interpolation between the 6 classic nyan cat stripe colors.
 */

/** The 6 anchor colors from the classic nyan cat trail (top to bottom). */
const ANCHOR_COLORS = [
  "#FF0000", // Red
  "#FF9008", // Orange
  "#F6FF00", // Yellow
  "#7CFF27", // Green
  "#5FFBFF", // Cyan
  "#6400FF", // Purple
] as const;

/** Parse a hex color string to [r, g, b] tuple. */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** Format [r, g, b] tuple as a hex color string. */
function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
}

/** Build a 256-step interpolated palette from the anchor colors. */
function buildInterpolatedPalette(): readonly string[] {
  const anchors = ANCHOR_COLORS.map(hexToRgb);
  const segmentCount = anchors.length;
  const stepsPerSegment = 256 / segmentCount; // ~42.67
  const palette: string[] = [];

  for (let i = 0; i < 256; i++) {
    const segment = Math.floor(i / stepsPerSegment);
    const t = (i - segment * stepsPerSegment) / stepsPerSegment;
    const from = anchors[segment % segmentCount];
    const to = anchors[(segment + 1) % segmentCount];
    const r = Math.round(from[0] + (to[0] - from[0]) * t);
    const g = Math.round(from[1] + (to[1] - from[1]) * t);
    const b = Math.round(from[2] + (to[2] - from[2]) * t);
    palette.push(rgbToHex(r, g, b));
  }

  return Object.freeze(palette);
}

/** 256-step interpolated nyan cat rainbow palette. */
export const NYAN_PALETTE = buildInterpolatedPalette();

/**
 * Returns the hex color for a non-space character in the banner.
 * Space characters return undefined (no color applied).
 *
 * @param char - The character to colorize
 * @param charIndex - Position of the character in the banner line
 * @param tickOffset - Current animation tick (increments every 80ms)
 * @returns Hex color string or undefined for spaces
 */
export function nyanColor(
  char: string,
  charIndex: number,
  tickOffset: number,
): string | undefined {
  if (char === " ") return undefined;
  const paletteIndex = ((charIndex + tickOffset) % 256 + 256) % 256;
  return NYAN_PALETTE[paletteIndex];
}
```

- [x] **Step 2: Run the existing tests to verify they fail (expected — palette size changed)**

Run: `cd cli && bun test src/__tests__/nyan-banner.test.ts`
Expected: FAIL — tests expect palette length 6 and modulo-6 behavior

- [x] **Step 3: Commit**

```bash
git add cli/src/dashboard/nyan-colors.ts
git commit -m "feat(gradient-smooth): replace 6-color palette with 256-step interpolation"
```

---

### Task 2: Update tests for 256-step palette behavior

**Wave:** 1
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/__tests__/nyan-banner.test.ts`

- [x] **Step 1: Update test file for 256-step palette**

Replace the entire contents of `cli/src/__tests__/nyan-banner.test.ts` with:

```typescript
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
```

- [x] **Step 2: Run tests to verify they pass**

Run: `cd cli && bun test src/__tests__/nyan-banner.test.ts`
Expected: PASS — all tests green

- [x] **Step 3: Commit**
