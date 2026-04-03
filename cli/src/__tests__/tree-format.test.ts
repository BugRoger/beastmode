import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import chalk from "chalk";
import { buildTreePrefix, formatTreeLine } from "../dashboard/tree-format";
import type { LogLevel } from "../logger";

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

describe("buildTreePrefix", () => {
  test("epic level returns empty string", () => {
    expect(buildTreePrefix("epic")).toBe("");
  });

  test("phase level returns vertical bar prefix", () => {
    expect(buildTreePrefix("phase")).toBe("│ ");
  });

  test("feature level returns double vertical bar prefix", () => {
    expect(buildTreePrefix("feature")).toBe("│ │ ");
  });

  test("leaf-phase level returns bar-dot prefix", () => {
    expect(buildTreePrefix("leaf-phase")).toBe("│ · ");
  });

  test("leaf-feature level returns double-bar-dot prefix", () => {
    expect(buildTreePrefix("leaf-feature")).toBe("│ │ · ");
  });
});

describe("formatTreeLine", () => {
  let savedLevel: typeof chalk.level;

  beforeEach(() => {
    savedLevel = chalk.level;
    chalk.level = 0; // No ANSI for content assertions
  });

  afterEach(() => {
    chalk.level = savedLevel;
  });

  test("leaf line has timestamp, level, message — no scope, no phase column", () => {
    const line = formatTreeLine("leaf-phase", "info", "plan", "hello world", 1000);
    // Format: [prefix] [HH:MM:SS] LEVEL  message
    expect(line).toMatch(/^│ · \d{2}:\d{2}:\d{2} INFO  hello world$/);
  });

  test("leaf-feature line uses double-depth prefix", () => {
    const line = formatTreeLine("leaf-feature", "info", "implement", "building", 1000);
    expect(line).toMatch(/^│ │ · \d{2}:\d{2}:\d{2} INFO  building$/);
  });

  test("warn line gets full yellow treatment", () => {
    chalk.level = 3;
    const line = formatTreeLine("leaf-phase", "warn", "plan", "watch out", 1000);
    expect(line).toContain("\x1b[33m"); // yellow ANSI
  });

  test("error line gets full red treatment", () => {
    chalk.level = 3;
    const line = formatTreeLine("leaf-phase", "error", "plan", "bad stuff", 1000);
    expect(line).toContain("\x1b[31m"); // red ANSI
  });

  test("system line has no prefix", () => {
    const line = formatTreeLine("system", "info", undefined, "startup complete", 1000);
    expect(line).toMatch(/^\d{2}:\d{2}:\d{2} INFO  startup complete$/);
  });

  test("phase coloring applied to connectors on normal lines", () => {
    chalk.level = 3;
    const line = formatTreeLine("leaf-phase", "info", "plan", "thinking", 1000);
    // The prefix should contain blue ANSI (plan = blue)
    expect(line).toContain("\x1b[34m"); // blue ANSI
  });

  test("epic node renders as label", () => {
    const line = formatTreeLine("epic", "info", undefined, "my-epic", 1000);
    expect(line).toBe("my-epic");
  });

  test("phase node renders with prefix and colored label", () => {
    chalk.level = 0;
    const line = formatTreeLine("phase", "info", "plan", "plan", 1000);
    expect(line).toBe("│ plan");
  });

  test("feature node renders with double prefix and label", () => {
    chalk.level = 0;
    const line = formatTreeLine("feature", "info", "implement", "write-plan", 1000);
    expect(line).toBe("│ │ write-plan");
  });
});
