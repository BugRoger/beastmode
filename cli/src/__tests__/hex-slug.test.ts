import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const PHASE_TS_PATH = resolve(import.meta.dirname, "../commands/phase.ts");

describe("phase.ts slug deduplication", () => {
  test("no slugify function defined in phase.ts", () => {
    const source = readFileSync(PHASE_TS_PATH, "utf-8");
    expect(source).not.toMatch(/export function slugify/);
    expect(source).not.toMatch(/function slugify/);
  });

  test("no randomHex function defined in phase.ts", () => {
    const source = readFileSync(PHASE_TS_PATH, "utf-8");
    expect(source).not.toMatch(/export function randomHex/);
    expect(source).not.toMatch(/function randomHex/);
  });

  test("design branch uses generatePlaceholderName", () => {
    const source = readFileSync(PHASE_TS_PATH, "utf-8");
    const fnMatch = source.match(/function deriveWorktreeSlug[\s\S]*?^}/m);
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch![0];
    expect(fnBody).toContain("generatePlaceholderName");
    expect(fnBody).not.toContain("randomHex");
  });

  test("non-design phases still use args directly", () => {
    const source = readFileSync(PHASE_TS_PATH, "utf-8");
    expect(source).toContain('args[0] || "default"');
  });

  test("epicSlug is assigned from worktreeSlug", () => {
    const source = readFileSync(PHASE_TS_PATH, "utf-8");
    expect(source).toContain("const epicSlug = worktreeSlug");
  });
});
