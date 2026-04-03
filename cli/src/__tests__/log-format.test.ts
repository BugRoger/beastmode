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
    test("epic + feature builds scope without phase", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic: "my-epic", feature: "feat1" }, "msg"));
      // Phase is a separate column, scope contains only epic/feature
      expect(line).toContain("(my-epic/feat1):");
      // Phase should NOT be inside the scope parens
      expect(line).not.toContain("(plan/");
    });

    test("epic-only builds single-part scope", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "implement", epic: "my-epic" }, "msg"));
      expect(line).toContain("(my-epic):");
      expect(line).not.toContain("(implement/");
    });

    test("phase-only falls back to (cli)", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "design" }, "msg"));
      // No epic means scope is "cli", phase appears as column
      expect(line).toContain("(cli):");
      expect(line).toContain("design");
    });

    test("no context falls back to (cli)", () => {
      const line = stripAnsi(formatLogLine("info", {}, "msg"));
      expect(line).toContain("(cli):");
    });
  });

  describe("phase column", () => {
    test("phase renders as 9-char fixed-width column", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "implement", epic: "test" }, "msg"));
      // "implement" is exactly 9 chars — should appear without extra padding
      expect(line).toContain("implement");
      // label is "INFO " (5 chars) then "  " then phase(9) then "  " then "("
      // So after "] " we have "INFO   implement  ("
      const match = line.match(/INFO \s{2}(.{9})\s{2}\(/);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("implement");
    });

    test("short phase is right-padded to 9 chars", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic: "test" }, "msg"));
      // "plan" + 5 spaces = 9 chars
      const match = line.match(/INFO \s{2}(.{9})\s{2}\(/);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("plan     ");
    });

    test("no phase renders as 9 spaces", () => {
      const line = stripAnsi(formatLogLine("info", {}, "msg"));
      // 9 spaces where phase would be
      const match = line.match(/INFO \s{2}(.{9})\s{2}\(/);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("         ");
    });

    test("phase appears between level and scope", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "design", epic: "test" }, "msg"));
      const levelIdx = line.indexOf("INFO ");
      const phaseIdx = line.indexOf("design");
      const scopeIdx = line.indexOf("(test):");
      expect(phaseIdx).toBeGreaterThan(levelIdx);
      expect(scopeIdx).toBeGreaterThan(phaseIdx);
    });
  });

  describe("scope truncation", () => {
    test("epic exactly 32 chars: no truncation", () => {
      const epic = "a".repeat(32);
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic }, "msg"));
      expect(line).toContain(`(${epic}):`);
    });

    test("epic 33 chars: truncated to 32 with ellipsis", () => {
      const epic = "a".repeat(33);
      const truncated = "a".repeat(31) + "\u2026";
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic }, "msg"));
      expect(line).toContain(`(${truncated}):`);
      expect(truncated.length).toBe(32);
    });

    test("epic + feature both under 16: no truncation", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic: "short", feature: "feat" }, "msg"));
      expect(line).toContain("(short/feat):");
    });

    test("epic over 16 with feature: epic truncated to 16", () => {
      const epic = "a".repeat(20);
      const truncated = "a".repeat(15) + "\u2026";
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic, feature: "feat" }, "msg"));
      expect(line).toContain(`(${truncated}/feat):`);
      expect(truncated.length).toBe(16);
    });

    test("feature over 16 with epic: feature truncated to 16", () => {
      const feature = "b".repeat(20);
      const truncated = "b".repeat(15) + "\u2026";
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic: "myep", feature }, "msg"));
      expect(line).toContain(`(myep/${truncated}):`);
      expect(truncated.length).toBe(16);
    });

    test("both epic and feature over 16: both truncated", () => {
      const epic = "a".repeat(20);
      const feature = "b".repeat(20);
      const tEpic = "a".repeat(15) + "\u2026";
      const tFeat = "b".repeat(15) + "\u2026";
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic, feature }, "msg"));
      expect(line).toContain(`(${tEpic}/${tFeat}):`);
    });
  });

  describe("output format", () => {
    test("matches format: [HH:MM:SS] LEVEL  PHASE  (scope):  message", () => {
      const line = stripAnsi(formatLogLine("info", { phase: "plan", epic: "test" }, "hello world"));
      // Format: [HH:MM:SS] INFO  plan       (test):  hello world
      // "INFO " (5) + "  " (2) + "plan     " (9) + "  " (2) + "(test):" + padding + msg
      expect(line).toMatch(/^\[\d{2}:\d{2}:\d{2}\] INFO\s{3}plan\s{7}\(test\):\s+hello world$/);
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
      const line = formatLogLine("warn", { phase: "plan" }, "warning msg");
      expect(line).toContain("\x1b[33m");
    });

    test("error line contains ANSI red codes", () => {
      const line = formatLogLine("error", { phase: "plan" }, "error msg");
      expect(line).toContain("\x1b[31m");
    });

    test("warn line includes phase column in colored output", () => {
      const line = formatLogLine("warn", { phase: "design" }, "oops");
      const stripped = stripAnsi(line);
      expect(stripped).toContain("design");
    });

    test("error line includes phase column in colored output", () => {
      const line = formatLogLine("error", { phase: "validate" }, "bad");
      const stripped = stripAnsi(line);
      expect(stripped).toContain("validate");
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
