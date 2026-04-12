import { describe, test, expect } from "vitest";
import { buildTreePrefix, formatTreeLine } from "../dashboard/tree-format.js";

describe("buildTreePrefix — new hierarchy", () => {
  test("cli depth has bullet prefix", () => {
    expect(buildTreePrefix("cli")).toBe("● ");
  });

  test("epic depth has bullet connector", () => {
    expect(buildTreePrefix("epic")).toBe("● ");
  });

  test("feature depth has box-drawing connector", () => {
    expect(buildTreePrefix("feature")).toBe("├─○ ");
  });

  test("leaf-epic has padded bar connector", () => {
    expect(buildTreePrefix("leaf-epic")).toBe("  │ ");
  });

  test("leaf-feature has padded nested bar connector", () => {
    expect(buildTreePrefix("leaf-feature")).toBe("  │ │ ");
  });
});

describe("formatTreeLine — leaf entries", () => {
  test("leaf entry has indent instead of phase badge", () => {
    const line = formatTreeLine("leaf-feature", "info", "implement", "test msg", Date.now());
    expect(line).not.toContain("implement");
    expect(line).toContain("test msg");
  });

  test("cli node label renders with prefix", () => {
    const line = formatTreeLine("cli", "info", undefined, "SYSTEM", 0);
    expect(line).toBe("● SYSTEM");
  });

  test("epic node label renders with prefix", () => {
    const line = formatTreeLine("epic", "info", undefined, "auth", 0);
    expect(line).toContain("auth");
    expect(line).toContain("●");
  });
});
