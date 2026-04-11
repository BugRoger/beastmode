import { describe, test, expect } from "vitest";
import { isPhaseAtOrPast } from "../types.js";
import type { Phase } from "../types.js";

describe("isPhaseAtOrPast", () => {
  describe("identity cases — phase equals threshold", () => {
    test.each<Phase>(["design", "plan", "implement", "validate", "release"])(
      "%s is at or past itself",
      (phase) => {
        expect(isPhaseAtOrPast(phase, phase)).toBe(true);
      },
    );
  });

  describe("forward progression — current past threshold", () => {
    test("implement is past plan", () => {
      expect(isPhaseAtOrPast("implement", "plan")).toBe(true);
    });

    test("release is past design", () => {
      expect(isPhaseAtOrPast("release", "design")).toBe(true);
    });

    test("validate is past implement", () => {
      expect(isPhaseAtOrPast("validate", "implement")).toBe(true);
    });
  });

  describe("backward — current before threshold", () => {
    test("design is not past plan", () => {
      expect(isPhaseAtOrPast("design", "plan")).toBe(false);
    });

    test("plan is not past implement", () => {
      expect(isPhaseAtOrPast("plan", "implement")).toBe(false);
    });

    test("implement is not past validate", () => {
      expect(isPhaseAtOrPast("implement", "validate")).toBe(false);
    });
  });

  describe("boundary pairs", () => {
    test("design/plan boundary", () => {
      expect(isPhaseAtOrPast("design", "plan")).toBe(false);
      expect(isPhaseAtOrPast("plan", "design")).toBe(true);
    });

    test("plan/implement boundary", () => {
      expect(isPhaseAtOrPast("plan", "implement")).toBe(false);
      expect(isPhaseAtOrPast("implement", "plan")).toBe(true);
    });

    test("implement/validate boundary", () => {
      expect(isPhaseAtOrPast("implement", "validate")).toBe(false);
      expect(isPhaseAtOrPast("validate", "implement")).toBe(true);
    });

    test("validate/release boundary", () => {
      expect(isPhaseAtOrPast("validate", "release")).toBe(false);
      expect(isPhaseAtOrPast("release", "validate")).toBe(true);
    });
  });

  describe("terminal phases — done and cancelled", () => {
    test("done is past all workflow phases", () => {
      expect(isPhaseAtOrPast("done", "design")).toBe(true);
      expect(isPhaseAtOrPast("done", "plan")).toBe(true);
      expect(isPhaseAtOrPast("done", "implement")).toBe(true);
      expect(isPhaseAtOrPast("done", "validate")).toBe(true);
      expect(isPhaseAtOrPast("done", "release")).toBe(true);
    });

    test("cancelled is past all workflow phases", () => {
      expect(isPhaseAtOrPast("cancelled", "design")).toBe(true);
      expect(isPhaseAtOrPast("cancelled", "plan")).toBe(true);
      expect(isPhaseAtOrPast("cancelled", "implement")).toBe(true);
      expect(isPhaseAtOrPast("cancelled", "validate")).toBe(true);
      expect(isPhaseAtOrPast("cancelled", "release")).toBe(true);
    });

    test("workflow phases are not past terminal threshold done", () => {
      expect(isPhaseAtOrPast("design", "done")).toBe(false);
      expect(isPhaseAtOrPast("release", "done")).toBe(false);
    });

    test("workflow phases are not past terminal threshold cancelled", () => {
      expect(isPhaseAtOrPast("design", "cancelled")).toBe(false);
      expect(isPhaseAtOrPast("release", "cancelled")).toBe(false);
    });

    test("done satisfies done threshold", () => {
      expect(isPhaseAtOrPast("done", "done")).toBe(true);
    });

    test("cancelled satisfies cancelled threshold", () => {
      expect(isPhaseAtOrPast("cancelled", "cancelled")).toBe(true);
    });

    test("done satisfies cancelled threshold", () => {
      expect(isPhaseAtOrPast("done", "cancelled")).toBe(true);
    });

    test("cancelled satisfies done threshold", () => {
      expect(isPhaseAtOrPast("cancelled", "done")).toBe(true);
    });
  });
});
