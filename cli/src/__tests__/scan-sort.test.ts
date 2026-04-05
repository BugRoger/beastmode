import { describe, test, expect } from "vitest";
import { compareEpics } from "../store/scan.js";
import type { Epic } from "../store/types.js";

function makeEpic(slug: string, status: Epic["status"], createdAt: string): Epic {
  return {
    id: `bm-${slug}`,
    type: "epic",
    name: slug,
    slug,
    status,
    depends_on: [],
    created_at: createdAt,
    updated_at: createdAt,
  };
}

describe("compareEpics", () => {
  test("active epic sorts before done epic", () => {
    const a = makeEpic("active", "implement", "2025-01-01T00:00:00.000Z");
    const b = makeEpic("done", "done", "2025-06-01T00:00:00.000Z");
    expect(compareEpics(a, b)).toBeLessThan(0);
  });

  test("active epic sorts before cancelled epic", () => {
    const a = makeEpic("active", "design", "2025-01-01T00:00:00.000Z");
    const b = makeEpic("cancelled", "cancelled", "2025-12-01T00:00:00.000Z");
    expect(compareEpics(a, b)).toBeLessThan(0);
  });

  test("done epic sorts after active epic", () => {
    const a = makeEpic("done", "done", "2025-12-01T00:00:00.000Z");
    const b = makeEpic("active", "plan", "2025-01-01T00:00:00.000Z");
    expect(compareEpics(a, b)).toBeGreaterThan(0);
  });

  test("newer active epic sorts before older active epic", () => {
    const a = makeEpic("new", "design", "2025-12-01T00:00:00.000Z");
    const b = makeEpic("old", "implement", "2025-01-01T00:00:00.000Z");
    expect(compareEpics(a, b)).toBeLessThan(0);
  });

  test("newer terminal epic sorts before older terminal epic", () => {
    const a = makeEpic("new-done", "done", "2025-12-01T00:00:00.000Z");
    const b = makeEpic("old-done", "done", "2025-01-01T00:00:00.000Z");
    expect(compareEpics(a, b)).toBeLessThan(0);
  });

  test("equal timestamps return 0", () => {
    const a = makeEpic("x", "plan", "2025-06-01T00:00:00.000Z");
    const b = makeEpic("y", "implement", "2025-06-01T00:00:00.000Z");
    expect(compareEpics(a, b)).toBe(0);
  });

  test("both terminal same group — newer first", () => {
    const a = makeEpic("cancelled", "cancelled", "2025-12-15T00:00:00.000Z");
    const b = makeEpic("done", "done", "2025-11-20T00:00:00.000Z");
    expect(compareEpics(a, b)).toBeLessThan(0);
  });

  test("all active phases sort above done", () => {
    const phases: Epic["status"][] = ["design", "plan", "implement", "validate", "release"];
    for (const phase of phases) {
      const a = makeEpic("a", phase, "2025-01-01T00:00:00.000Z");
      const b = makeEpic("b", "done", "2025-12-01T00:00:00.000Z");
      expect(compareEpics(a, b)).toBeLessThan(0);
    }
  });

  test("all active phases sort above cancelled", () => {
    const phases: Epic["status"][] = ["design", "plan", "implement", "validate", "release"];
    for (const phase of phases) {
      const a = makeEpic("a", phase, "2025-01-01T00:00:00.000Z");
      const b = makeEpic("b", "cancelled", "2025-12-01T00:00:00.000Z");
      expect(compareEpics(a, b)).toBeLessThan(0);
    }
  });
});
