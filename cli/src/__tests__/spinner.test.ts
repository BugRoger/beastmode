import { describe, test, expect } from "vitest";
import { EPIC_SPINNER, FEATURE_SPINNER, SPINNER_INTERVAL_MS, isActive } from "../dashboard/spinner.js";

// ---------------------------------------------------------------------------
// Frame array correctness
// ---------------------------------------------------------------------------

describe("EPIC_SPINNER", () => {
  test("has exactly 5 frames", () => {
    expect(EPIC_SPINNER).toHaveLength(5);
  });

  test("frames are forward-only (no repeated subsequence / palindrome)", () => {
    const reversed = [...EPIC_SPINNER].reverse();
    expect(EPIC_SPINNER).not.toEqual(reversed);
  });

  test("contains the expected Unicode pie characters", () => {
    expect(EPIC_SPINNER).toEqual(["○", "◔", "◑", "◕", "●"]);
  });
});

describe("FEATURE_SPINNER", () => {
  test("has exactly 3 frames", () => {
    expect(FEATURE_SPINNER).toHaveLength(3);
  });

  test("frames are forward-only (no repeated subsequence / palindrome)", () => {
    const reversed = [...FEATURE_SPINNER].reverse();
    expect(FEATURE_SPINNER).not.toEqual(reversed);
  });

  test("contains the expected Unicode fisheye characters", () => {
    expect(FEATURE_SPINNER).toEqual(["◉", "◎", "○"]);
  });
});

describe("SPINNER_INTERVAL_MS", () => {
  test("is 120ms", () => {
    expect(SPINNER_INTERVAL_MS).toBe(120);
  });
});

// ---------------------------------------------------------------------------
// isActive
// ---------------------------------------------------------------------------

describe("isActive", () => {
  test("returns true for all six active statuses", () => {
    const activeStatuses = ["in-progress", "implement", "design", "plan", "validate", "release"];
    for (const status of activeStatuses) {
      expect(isActive(status)).toBe(true);
    }
  });

  test("returns false for terminal/inactive statuses", () => {
    const inactiveStatuses = ["completed", "blocked", "pending", "done", "cancelled"];
    for (const status of inactiveStatuses) {
      expect(isActive(status)).toBe(false);
    }
  });

  test("returns false for unknown status", () => {
    expect(isActive("nonexistent")).toBe(false);
  });
});
