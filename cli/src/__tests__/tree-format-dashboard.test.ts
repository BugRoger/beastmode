import { describe, test, expect } from "vitest";
import { buildTreePrefix, formatTreeLine } from "../dashboard/tree-format.js";

describe("buildTreePrefix — new hierarchy", () => {
  test("cli depth has epic prefix", () => {
    expect(buildTreePrefix("cli")).toBe("│ ");
  });

  test("epic depth has single connector", () => {
    expect(buildTreePrefix("epic")).toBe("│ ");
  });

  test("feature depth has double connector", () => {
    expect(buildTreePrefix("feature")).toBe("│ │ ");
  });

  test("leaf-epic has dot connector", () => {
    expect(buildTreePrefix("leaf-epic")).toBe("│ · ");
  });

  test("leaf-feature has nested dot connector", () => {
    expect(buildTreePrefix("leaf-feature")).toBe("│ │ · ");
  });
});

describe("formatTreeLine — phase badge", () => {
  test("leaf entry includes phase badge", () => {
    const line = formatTreeLine("leaf-feature", "info", "implement", "test msg", Date.now());
    expect(line).toContain("implement");
  });

  test("cli node label renders with prefix", () => {
    const line = formatTreeLine("cli", "info", undefined, "SYSTEM", 0);
    expect(line).toBe("│ SYSTEM");
  });

  test("epic node label renders with prefix", () => {
    const line = formatTreeLine("epic", "info", undefined, "auth", 0);
    expect(line).toContain("auth");
    expect(line).toContain("│");
  });
});
