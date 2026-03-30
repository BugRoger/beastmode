import { describe, test, expect } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { randomHex, slugify } from "../src/commands/phase";

const PHASE_TS_PATH = resolve(import.meta.dir, "../src/commands/phase.ts");

describe("randomHex function", () => {
  test("randomHex is exported", () => {
    expect(typeof randomHex).toBe("function");
  });

  test("returns string of requested length", () => {
    const hex = randomHex(6);
    expect(hex).toHaveLength(6);
  });

  test("returns valid hex characters only", () => {
    const hex = randomHex(6);
    expect(hex).toMatch(/^[0-9a-f]{6}$/);
  });

  test("produces different values on successive calls", () => {
    const results = new Set(Array.from({ length: 10 }, () => randomHex(6)));
    // With 16^6 = 16M possibilities, 10 calls should all be unique
    expect(results.size).toBeGreaterThan(1);
  });
});

describe("deriveWorktreeSlug hex generation (source checks)", () => {
  test("design branch uses randomHex, not slugify", () => {
    const source = readFileSync(PHASE_TS_PATH, "utf-8");
    const fnMatch = source.match(/function deriveWorktreeSlug[\s\S]*?^}/m);
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch![0];
    expect(fnBody).toContain("randomHex");
    expect(fnBody).not.toContain("slugify");
    expect(fnBody).not.toContain("args.join");
  });

  test("non-design phases still use args directly", () => {
    const source = readFileSync(PHASE_TS_PATH, "utf-8");
    expect(source).toContain('args[0] || "default"');
  });

  test("epicSlug uses worktreeSlug for design phase", () => {
    const source = readFileSync(PHASE_TS_PATH, "utf-8");
    expect(source).toContain('phase === "design" ? worktreeSlug');
  });
});
