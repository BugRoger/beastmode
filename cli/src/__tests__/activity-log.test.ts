import { describe, test, expect } from "bun:test";
import { formatLogLine, type LogLevel } from "../logger";

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

/**
 * eventTypeToLevel — mirrors the mapping in ActivityLog.tsx.
 * Tested here to verify the mapping logic without requiring React rendering.
 */
function eventTypeToLevel(type: "dispatched" | "completed" | "error" | "scan"): LogLevel {
  switch (type) {
    case "error":
      return "error";
    case "dispatched":
    case "completed":
    case "scan":
      return "info";
  }
}

describe("ActivityLog format integration", () => {
  describe("event type to log level mapping", () => {
    test("dispatched maps to info", () => {
      expect(eventTypeToLevel("dispatched")).toBe("info");
    });

    test("completed maps to info", () => {
      expect(eventTypeToLevel("completed")).toBe("info");
    });

    test("scan maps to info", () => {
      expect(eventTypeToLevel("scan")).toBe("info");
    });

    test("error maps to error", () => {
      expect(eventTypeToLevel("error")).toBe("error");
    });
  });

  describe("format output for dashboard events", () => {
    test("dispatched event with full context renders structured line", () => {
      const level = eventTypeToLevel("dispatched");
      const ctx = { phase: "implement", epic: "my-epic", feature: "feat1" };
      const line = stripAnsi(formatLogLine(level, ctx, "implement for my-epic/feat1"));
      expect(line).toContain("INFO");
      expect(line).toContain("implement"); // phase column
      expect(line).toContain("(my-epic/feat1):");
      expect(line).toContain("implement for my-epic/feat1");
    });

    test("completed event with phase and epic renders two-part scope", () => {
      const level = eventTypeToLevel("completed");
      const ctx = { phase: "plan", epic: "my-epic" };
      const line = stripAnsi(formatLogLine(level, ctx, "plan completed for my-epic (12s, $0.45)"));
      expect(line).toContain("INFO");
      expect(line).toContain("plan"); // phase column
      expect(line).toContain("(my-epic):");
      expect(line).toContain("plan completed for my-epic");
    });

    test("error event renders ERR level", () => {
      const level = eventTypeToLevel("error");
      const ctx = { epic: "my-epic" };
      const line = stripAnsi(formatLogLine(level, ctx, "my-epic: something failed"));
      expect(line).toContain("ERR");
      expect(line).toContain("(my-epic):");
      expect(line).toContain("my-epic: something failed");
    });

    test("scan event without context falls back to (cli) scope", () => {
      const level = eventTypeToLevel("scan");
      const line = stripAnsi(formatLogLine(level, {}, "scanned 3 epics, dispatched 1"));
      expect(line).toContain("(cli):");
      expect(line).toContain("scanned 3 epics, dispatched 1");
    });

    test("error event with only epic context uses epic as scope", () => {
      const level = eventTypeToLevel("error");
      const ctx = { epic: "broken" };
      const line = stripAnsi(formatLogLine(level, ctx, "crashed"));
      // Epic present means scope is the epic name, not "cli"
      expect(line).toContain("(broken):");
    });
  });
});
