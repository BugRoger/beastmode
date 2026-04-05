import { describe, test, expect } from "vitest";
import {
  levelToVerbosity,
  cycleVerbosity,
  verbosityLabel,
  shouldShowEntry,
} from "../dashboard/verbosity.js";

describe("levelToVerbosity", () => {
  test("info maps to 0", () => {
    expect(levelToVerbosity("info")).toBe(0);
  });

  test("debug maps to 1", () => {
    expect(levelToVerbosity("debug")).toBe(1);
  });

  test("warn maps to -1 (always shown)", () => {
    expect(levelToVerbosity("warn")).toBe(-1);
  });

  test("error maps to -1 (always shown)", () => {
    expect(levelToVerbosity("error")).toBe(-1);
  });
});

describe("cycleVerbosity", () => {
  test("0 -> 1", () => {
    expect(cycleVerbosity(0)).toBe(1);
  });

  test("1 -> 0 (wrap)", () => {
    expect(cycleVerbosity(1)).toBe(0);
  });
});

describe("verbosityLabel", () => {
  test("0 -> info", () => {
    expect(verbosityLabel(0)).toBe("info");
  });

  test("1 -> debug", () => {
    expect(verbosityLabel(1)).toBe("debug");
  });
});

describe("shouldShowEntry", () => {
  test("info entry shown at verbosity 0", () => {
    expect(shouldShowEntry("info", 0)).toBe(true);
  });

  test("debug entry hidden at verbosity 0", () => {
    expect(shouldShowEntry("debug", 0)).toBe(false);
  });

  test("debug entry shown at verbosity 1", () => {
    expect(shouldShowEntry("debug", 1)).toBe(true);
  });

  test("warn always shown at verbosity 0", () => {
    expect(shouldShowEntry("warn", 0)).toBe(true);
  });

  test("error always shown at verbosity 0", () => {
    expect(shouldShowEntry("error", 0)).toBe(true);
  });

  test("info entry shown at all verbosity levels", () => {
    for (let v = 0; v <= 1; v++) {
      expect(shouldShowEntry("info", v)).toBe(true);
    }
  });
});
