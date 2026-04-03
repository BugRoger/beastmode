import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import chalk from "chalk";
import { formatLogLine } from "../shared/log-format";
import type { LogLevel, LogContext } from "../shared/log-format";

// Strip ANSI codes for content assertions
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

describe("formatLogLine", () => {
  describe("level labels", () => {
    const levels: [LogLevel, string][] = [
      ["info", "INFO "],
      ["detail", "DETL "],
      ["debug", "DEBUG"],
      ["trace", "TRACE"],
      ["warn", "WARN "],
      ["error", "ERR  "],
    ];

    for (const [level, label] of levels) {
      test(`${level} renders as "${label}" (5-char fixed width)`, () => {
        const line = stripAnsi(formatLogLine(level, {}, "test"));
        expect(line).toContain(label);
        // All labels are exactly 5 chars
        expect(label.length).toBe(5);
      });
    }
  });

  describe("scope construction", () => {
    test("phase + epic + feature builds full scope", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic: "my-epic", feature: "feat1" }, "msg"));
      expect(line).toContain("(plan/my-epic/feat1):");
    });

    test("phase + epic builds two-part scope", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "implement", epic: "my-epic" }, "msg"));
      expect(line).toContain("(implement/my-epic):");
    });

    test("phase-only builds single-part scope", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "design" }, "msg"));
      expect(line).toContain("(design):");
    });

    test("no context falls back to (cli)", () => {
      const line = stripAnsi(formatLogLine("info", {}, "msg"));
      expect(line).toContain("(cli):");
    });
  });

  describe("output format", () => {
    test("matches format: [HH:MM:SS] LEVEL  (scope):  message", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic: "test" }, "hello world"));
      expect(line).toMatch(/^\[\d{2}:\d{2}:\d{2}\] INFO\s{3,}\(plan\/test\):\s{2,}hello world$/);
    });

    test("message is included at the end of the line", () => {
      const line = stripAnsi(formatLogLine("debug", {}, "my message here"));
      expect(line).toContain("my message here");
    });
  });

  describe("column alignment", () => {
    test("short scope is padded to target column", () => {
      const line = stripAnsi(formatLogLine("info", {}, "msg"));
      const colonIdx = line.indexOf("):");
      const msgIdx = line.indexOf("msg");
      expect(msgIdx).toBeGreaterThan(colonIdx + 3);
    });

    test("long scope overflows with minimum 2-space gap", () => {
      const longCtx: LogContext = {
        phase: "implement",
        epic: "very-long-epic-name",
        feature: "extremely-long-feature-name",
      };
      const line = stripAnsi(formatLogLine("info", longCtx, "msg"));
      const scopeEnd = line.indexOf("):");
      const afterColon = line.substring(scopeEnd + 2);
      expect(afterColon.startsWith("  ")).toBe(true);
    });
  });

  describe("WARN and ERR full-line coloring", () => {
    let savedLevel: typeof chalk.level;

    beforeEach(() => {
      savedLevel = chalk.level;
      chalk.level = 3;
    });

    afterEach(() => {
      chalk.level = savedLevel;
    });

    test("warn line contains ANSI yellow codes", () => {
      const line = formatLogLine("warn", { phase: "test" }, "warning msg");
      expect(line).toContain("\x1b[33m");
    });

    test("error line contains ANSI red codes", () => {
      const line = formatLogLine("error", { phase: "test" }, "error msg");
      expect(line).toContain("\x1b[31m");
    });
  });

  describe("NO_COLOR support", () => {
    let savedLevel: typeof chalk.level;

    beforeEach(() => {
      savedLevel = chalk.level;
    });

    afterEach(() => {
      chalk.level = savedLevel;
    });

    test("chalk.level = 0 produces no ANSI escape codes", () => {
      chalk.level = 0;
      const line = formatLogLine("info", { phase: "plan", epic: "test" }, "clean output");
      const hasAnsi = /\x1b\[/.test(line);
      expect(hasAnsi).toBe(false);
    });
  });
});
