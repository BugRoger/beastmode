import { describe, test, expect, beforeEach, afterEach } from "vitest";
import chalk from "chalk";
import { buildTreePrefix, formatTreeLine } from "../dashboard/tree-format.js";

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

describe("tree-format with monokai-palette", () => {
  let savedLevel: typeof chalk.level;

  beforeEach(() => {
    savedLevel = chalk.level;
    chalk.level = 3; // Enable colors for testing
  });

  afterEach(() => {
    chalk.level = savedLevel;
  });

  test("buildTreePrefix returns correct connectors", () => {
    expect(buildTreePrefix("cli")).toBe("● ");
    expect(buildTreePrefix("epic")).toBe("● ");
    expect(buildTreePrefix("feature")).toBe("├─○ ");
    expect(buildTreePrefix("leaf-epic")).toBe("│ ");
    expect(buildTreePrefix("leaf-feature")).toBe("│ │ ");
    expect(buildTreePrefix("system")).toBe("│ ");
  });

  test("formatTreeLine feature with phase prefix applies color", () => {
    const timestamp = new Date("2024-04-04T10:30:45Z").getTime();
    const line = formatTreeLine("feature", "info", "plan", "Feature X", timestamp);

    // Should have ANSI codes for the colored prefix
    expect(line).toContain("\x1b[");

    // Plain text should have the tree prefix and message
    const plain = stripAnsi(line);
    expect(plain).toContain("├─○");
    expect(plain).toContain("Feature X");
  });

  test("formatTreeLine leaf-feature with phase renders colored prefix and timestamp", () => {
    const timestamp = new Date("2024-04-04T10:30:45Z").getTime();
    const localTime = new Date(timestamp).toLocaleTimeString("en-GB", { hour12: false });
    const line = formatTreeLine("leaf-feature", "info", "implement", "Leaf message", timestamp);

    const plain = stripAnsi(line);
    expect(plain).toContain("│ │");
    expect(plain).toContain(localTime);
    expect(plain).toContain("INFO");
    expect(plain).toContain("Leaf message");
  });

  test("formatTreeLine epic returns prefixed message", () => {
    const timestamp = new Date("2024-04-04T10:30:45Z").getTime();
    const line = formatTreeLine("epic", "info", undefined, "Epic Name", timestamp);

    const plain = stripAnsi(line);
    expect(plain).toContain("Epic Name");
    expect(plain).toContain("●");
  });

  test("formatTreeLine warn level is colored yellow", () => {
    const timestamp = new Date("2024-04-04T10:30:45Z").getTime();
    const line = formatTreeLine("leaf-epic", "warn", "plan", "Warning!", timestamp);

    // Yellow ANSI code
    expect(line).toContain("\x1b[33m");
  });

  test("formatTreeLine error level is colored red", () => {
    const timestamp = new Date("2024-04-04T10:30:45Z").getTime();
    const line = formatTreeLine("leaf-epic", "error", "plan", "Error!", timestamp);

    // Red ANSI code
    expect(line).toContain("\x1b[31m");
  });

  test("formatTreeLine normal level has dim timestamp and green label", () => {
    const timestamp = new Date("2024-04-04T10:30:45Z").getTime();
    const line = formatTreeLine("leaf-epic", "info", "plan", "Normal msg", timestamp);

    // Dim (2) and green (32) ANSI codes
    expect(line).toContain("\x1b[2m"); // dim
    expect(line).toContain("\x1b[32m"); // green
  });

  test("formatTreeLine system depth has tree prefix", () => {
    const timestamp = new Date("2024-04-04T10:30:45Z").getTime();
    const localTime = new Date(timestamp).toLocaleTimeString("en-GB", { hour12: false });
    const line = formatTreeLine("system", "info", undefined, "System msg", timestamp);

    const plain = stripAnsi(line);
    expect(plain).toContain("│");
    expect(plain).toContain(localTime);
    expect(plain).toContain("INFO");
    expect(plain).toContain("System msg");
  });
});
