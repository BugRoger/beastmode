import { describe, test, expect } from "bun:test";
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

  test("detail maps to 1", () => {
    expect(levelToVerbosity("detail")).toBe(1);
  });

  test("debug maps to 2", () => {
    expect(levelToVerbosity("debug")).toBe(2);
  });

  test("trace maps to 3", () => {
    expect(levelToVerbosity("trace")).toBe(3);
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

  test("1 -> 2", () => {
    expect(cycleVerbosity(1)).toBe(2);
  });

  test("2 -> 3", () => {
    expect(cycleVerbosity(2)).toBe(3);
  });

  test("3 -> 0 (wrap)", () => {
    expect(cycleVerbosity(3)).toBe(0);
  });
});

describe("verbosityLabel", () => {
  test("0 -> info", () => {
    expect(verbosityLabel(0)).toBe("info");
  });

  test("1 -> detail", () => {
    expect(verbosityLabel(1)).toBe("detail");
  });

  test("2 -> debug", () => {
    expect(verbosityLabel(2)).toBe("debug");
  });

  test("3 -> trace", () => {
    expect(verbosityLabel(3)).toBe("trace");
  });
});

describe("shouldShowEntry", () => {
  test("info entry shown at verbosity 0", () => {
    expect(shouldShowEntry("info", 0)).toBe(true);
  });

  test("detail entry hidden at verbosity 0", () => {
    expect(shouldShowEntry("detail", 0)).toBe(false);
  });

  test("detail entry shown at verbosity 1", () => {
    expect(shouldShowEntry("detail", 1)).toBe(true);
  });

  test("debug entry hidden at verbosity 1", () => {
    expect(shouldShowEntry("debug", 1)).toBe(false);
  });

  test("debug entry shown at verbosity 2", () => {
    expect(shouldShowEntry("debug", 2)).toBe(true);
  });

  test("trace entry hidden at verbosity 2", () => {
    expect(shouldShowEntry("trace", 2)).toBe(false);
  });

  test("trace entry shown at verbosity 3", () => {
    expect(shouldShowEntry("trace", 3)).toBe(true);
  });

  test("warn always shown at verbosity 0", () => {
    expect(shouldShowEntry("warn", 0)).toBe(true);
  });

  test("error always shown at verbosity 0", () => {
    expect(shouldShowEntry("error", 0)).toBe(true);
  });

  test("info entry shown at all verbosity levels", () => {
    for (let v = 0; v <= 3; v++) {
      expect(shouldShowEntry("info", v)).toBe(true);
    }
  });
});
