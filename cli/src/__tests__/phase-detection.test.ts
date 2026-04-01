import { describe, test, expect } from "bun:test";
import {
  classifyPhaseRequest,
  predecessorOf,
  formatRegressionWarning,
} from "../phase-detection";

// ── predecessorOf ──────────────────────────────────────────────────

describe("predecessorOf", () => {
  test("design has no predecessor", () => {
    expect(predecessorOf("design")).toBeUndefined();
  });

  test("plan predecessor is design", () => {
    expect(predecessorOf("plan")).toBe("design");
  });

  test("implement predecessor is plan", () => {
    expect(predecessorOf("implement")).toBe("plan");
  });

  test("validate predecessor is implement", () => {
    expect(predecessorOf("validate")).toBe("implement");
  });

  test("release predecessor is validate", () => {
    expect(predecessorOf("release")).toBe("validate");
  });

  test("terminal phases return undefined", () => {
    expect(predecessorOf("done")).toBeUndefined();
    expect(predecessorOf("cancelled")).toBeUndefined();
  });
});

// ── classifyPhaseRequest ───────────────────────────────────────────

describe("classifyPhaseRequest", () => {
  describe("forward jump (blocked)", () => {
    test("plan request when at design", () => {
      const result = classifyPhaseRequest("plan", "design");
      expect(result.type).toBe("forward-jump");
    });

    test("implement request when at plan", () => {
      const result = classifyPhaseRequest("implement", "plan");
      expect(result.type).toBe("forward-jump");
    });

    test("validate request when at design", () => {
      const result = classifyPhaseRequest("validate", "design");
      expect(result.type).toBe("forward-jump");
    });

    test("release request when at implement", () => {
      const result = classifyPhaseRequest("release", "implement");
      expect(result.type).toBe("forward-jump");
    });
  });

  describe("regression (requested < current)", () => {
    test("plan request when at implement", () => {
      const result = classifyPhaseRequest("plan", "implement");
      expect(result.type).toBe("regression");
      expect(result.predecessorPhase).toBe("design");
    });

    test("plan request when at validate", () => {
      const result = classifyPhaseRequest("plan", "validate");
      expect(result.type).toBe("regression");
      expect(result.predecessorPhase).toBe("design");
    });

    test("implement request when at validate", () => {
      const result = classifyPhaseRequest("implement", "validate");
      expect(result.type).toBe("regression");
      expect(result.predecessorPhase).toBe("plan");
    });

    test("implement request when at release", () => {
      const result = classifyPhaseRequest("implement", "release");
      expect(result.type).toBe("regression");
      expect(result.predecessorPhase).toBe("plan");
    });

    test("validate request when at release", () => {
      const result = classifyPhaseRequest("validate", "release");
      expect(result.type).toBe("regression");
      expect(result.predecessorPhase).toBe("implement");
    });

    test("plan request when at release", () => {
      const result = classifyPhaseRequest("plan", "release");
      expect(result.type).toBe("regression");
      expect(result.predecessorPhase).toBe("design");
    });
  });

  describe("same-phase rerun (requested == current)", () => {
    test("plan at plan", () => {
      const result = classifyPhaseRequest("plan", "plan");
      expect(result.type).toBe("same-rerun");
      expect(result.predecessorPhase).toBe("design");
    });

    test("implement at implement", () => {
      const result = classifyPhaseRequest("implement", "implement");
      expect(result.type).toBe("same-rerun");
      expect(result.predecessorPhase).toBe("plan");
    });

    test("validate at validate", () => {
      const result = classifyPhaseRequest("validate", "validate");
      expect(result.type).toBe("same-rerun");
      expect(result.predecessorPhase).toBe("implement");
    });

    test("release at release", () => {
      const result = classifyPhaseRequest("release", "release");
      expect(result.type).toBe("same-rerun");
      expect(result.predecessorPhase).toBe("validate");
    });

    test("design at design", () => {
      const result = classifyPhaseRequest("design", "design");
      expect(result.type).toBe("same-rerun");
      expect(result.predecessorPhase).toBeUndefined();
    });
  });

  describe("terminal phase handling", () => {
    test("any request against done manifest", () => {
      const result = classifyPhaseRequest("plan", "done");
      expect(result.type).toBe("forward-jump");
    });

    test("any request against cancelled manifest", () => {
      const result = classifyPhaseRequest("plan", "cancelled");
      expect(result.type).toBe("forward-jump");
    });
  });
});

// ── formatRegressionWarning ────────────────────────────────────────

describe("formatRegressionWarning", () => {
  test("includes current and target phase", () => {
    const warning = formatRegressionWarning(
      "my-epic",
      "validate",
      "plan",
      "beastmode/my-epic/design",
    );
    expect(warning).toContain("validate");
    expect(warning).toContain("plan");
  });

  test("includes tag name", () => {
    const warning = formatRegressionWarning(
      "my-epic",
      "validate",
      "implement",
      "beastmode/my-epic/plan",
    );
    expect(warning).toContain("beastmode/my-epic/plan");
  });

  test("lists phases that will be lost", () => {
    const warning = formatRegressionWarning(
      "my-epic",
      "release",
      "plan",
      "beastmode/my-epic/design",
    );
    expect(warning).toContain("plan");
    expect(warning).toContain("implement");
    expect(warning).toContain("validate");
    expect(warning).toContain("release");
  });
});
