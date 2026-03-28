import { describe, expect, test } from "bun:test";
import { parseArgs } from "../src/args";

describe("parseArgs", () => {
  test("parses run command with phase and slug", () => {
    const result = parseArgs(["bun", "index.ts", "run", "plan", "foo"]);
    expect(result.command).toBe("run");
    expect(result.args).toEqual(["plan", "foo"]);
  });

  test("parses watch command", () => {
    const result = parseArgs(["bun", "index.ts", "watch"]);
    expect(result.command).toBe("watch");
    expect(result.args).toEqual([]);
  });

  test("parses status command", () => {
    const result = parseArgs(["bun", "index.ts", "status"]);
    expect(result.command).toBe("status");
    expect(result.args).toEqual([]);
  });

  test("returns help when no args", () => {
    const result = parseArgs(["bun", "index.ts"]);
    expect(result.command).toBe("help");
    expect(result.args).toEqual([]);
  });

  test("parses help command explicitly", () => {
    const result = parseArgs(["bun", "index.ts", "help"]);
    expect(result.command).toBe("help");
    expect(result.args).toEqual([]);
  });

  test("passes extra args to run command", () => {
    const result = parseArgs([
      "bun",
      "index.ts",
      "run",
      "implement",
      "design-name",
      "feature-name",
    ]);
    expect(result.command).toBe("run");
    expect(result.args).toEqual(["implement", "design-name", "feature-name"]);
  });
});
