import { describe, test, expect } from "bun:test";
import { parseVerbosity, parseArgs } from "../args";

describe("parseVerbosity", () => {
  test("-v produces verbosity 1", () => {
    const { verbosity, rest } = parseVerbosity(["-v"]);
    expect(verbosity).toBe(1);
    expect(rest).toEqual([]);
  });

  test("-vv produces verbosity 2", () => {
    const { verbosity, rest } = parseVerbosity(["-vv"]);
    expect(verbosity).toBe(2);
    expect(rest).toEqual([]);
  });

  test("-vvv produces verbosity 3", () => {
    const { verbosity, rest } = parseVerbosity(["-vvv"]);
    expect(verbosity).toBe(3);
    expect(rest).toEqual([]);
  });

  test("-v -v -v produces verbosity 3", () => {
    const { verbosity, rest } = parseVerbosity(["-v", "-v", "-v"]);
    expect(verbosity).toBe(3);
    expect(rest).toEqual([]);
  });

  test("no flags produces verbosity 0", () => {
    const { verbosity, rest } = parseVerbosity(["my-epic"]);
    expect(verbosity).toBe(0);
    expect(rest).toEqual(["my-epic"]);
  });

  test("-v flags are stripped from remaining args", () => {
    const { verbosity, rest } = parseVerbosity(["-v", "my-epic", "feature-a"]);
    expect(verbosity).toBe(1);
    expect(rest).toEqual(["my-epic", "feature-a"]);
  });

  test("mixed combined and separate flags", () => {
    const { verbosity, rest } = parseVerbosity(["-vv", "-v", "slug"]);
    expect(verbosity).toBe(3);
    expect(rest).toEqual(["slug"]);
  });

  test("non-v flags are not consumed", () => {
    const { verbosity, rest } = parseVerbosity(["--all", "-w"]);
    expect(verbosity).toBe(0);
    expect(rest).toEqual(["--all", "-w"]);
  });
});

describe("parseArgs verbosity integration", () => {
  test("parseArgs returns verbosity 0 with no flags", () => {
    const result = parseArgs(["bun", "script.ts", "watch"]);
    expect(result.verbosity).toBe(0);
    expect(result.command).toBe("watch");
  });

  test("parseArgs returns verbosity from -v flag", () => {
    const result = parseArgs(["bun", "script.ts", "watch", "-vv"]);
    expect(result.verbosity).toBe(2);
    expect(result.command).toBe("watch");
    expect(result.args).toEqual([]);
  });

  test("parseArgs strips -v from args", () => {
    const result = parseArgs(["bun", "script.ts", "implement", "-v", "my-epic", "feature"]);
    expect(result.verbosity).toBe(1);
    expect(result.args).toEqual(["my-epic", "feature"]);
  });

  test("help command has verbosity 0", () => {
    const result = parseArgs(["bun", "script.ts"]);
    expect(result.command).toBe("help");
    expect(result.verbosity).toBe(0);
  });
});
