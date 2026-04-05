import { describe, test, expect, beforeEach, afterEach } from "vitest";
import chalk from "chalk";
import { formatTreeLogLine } from "../tree-view/format.js";
import type { LogLevel } from "../logger.js";

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

describe("formatTreeLogLine", () => {
  let savedLevel: typeof chalk.level;

  beforeEach(() => {
    savedLevel = chalk.level;
    chalk.level = 3;
  });

  afterEach(() => {
    chalk.level = savedLevel;
  });
  test("format: [HH:MM:SS] LEVEL  message", () => {
    const line = stripAnsi(formatTreeLogLine("info", "hello world"));
    expect(line).toMatch(/^\[\d{2}:\d{2}:\d{2}\] INFO \s+hello world$/);
  });

  test("no phase column in output", () => {
    const line = stripAnsi(formatTreeLogLine("info", "test"));
    expect(line).not.toContain("plan");
    expect(line).not.toContain("implement");
  });

  test("no scope column in output", () => {
    const line = stripAnsi(formatTreeLogLine("info", "test"));
    expect(line).not.toContain("(");
    expect(line).not.toContain(")");
  });

  test("level labels are 5-char fixed width", () => {
    const levels: [LogLevel, string][] = [
      ["info", "INFO "],
      ["debug", "DEBUG"],
      ["warn", "WARN "],
      ["error", "ERR  "],
    ];
    for (const [level, label] of levels) {
      const line = stripAnsi(formatTreeLogLine(level, "msg"));
      expect(line).toContain(label);
    }
  });

  test("warn line is colored yellow", () => {
    const line = formatTreeLogLine("warn", "warning msg");
    expect(line).toContain("\x1b[33m");
  });

  test("error line is colored red", () => {
    const line = formatTreeLogLine("error", "error msg");
    expect(line).toContain("\x1b[31m");
  });

  test("info line has dim timestamp and green level", () => {
    const line = formatTreeLogLine("info", "msg");
    expect(line).toContain("\x1b[2m");
    expect(line).toContain("\x1b[32m");
  });

  test("duration text passes through unchanged", () => {
    const line = stripAnsi(formatTreeLogLine("info", "completed (202s)"));
    expect(line).toContain("completed (202s)");
  });
});
