import { describe, test, expect } from "vitest";
import { buildTreePrefix, formatTreeLine } from "../dashboard/tree-format.js";

describe("SYSTEM node rendering", () => {
  test("system depth uses leaf-epic prefix (│ · )", () => {
    expect(buildTreePrefix("system")).toBe("│ · ");
  });

  test("cli depth uses epic prefix (│ )", () => {
    expect(buildTreePrefix("cli")).toBe("│ ");
  });

  test("formatTreeLine for cli renders SYSTEM label with prefix", () => {
    const line = formatTreeLine("cli", "info", undefined, "SYSTEM", 0);
    expect(line).toContain("│");
    expect(line).toContain("SYSTEM");
  });

  test("formatTreeLine for system entries includes tree connectors", () => {
    const line = formatTreeLine("system", "info", undefined, "watch started", 1000);
    expect(line).toContain("│");
    expect(line).toContain("·");
    expect(line).toContain("watch started");
  });
});
