import { describe, expect, test } from "bun:test";
import { parseArgs, parseVerbosity } from "../src/args";
import { slugify } from "../src/commands/phase";

describe("parseArgs", () => {
  test("parses design phase with topic", () => {
    const result = parseArgs(["bun", "index.ts", "design", "my", "cool", "topic"]);
    expect(result.command).toBe("design");
    expect(result.args).toEqual(["my", "cool", "topic"]);
  });

  test("parses plan phase with slug", () => {
    const result = parseArgs(["bun", "index.ts", "plan", "my-design"]);
    expect(result.command).toBe("plan");
    expect(result.args).toEqual(["my-design"]);
  });

  test("parses implement phase with slug and feature", () => {
    const result = parseArgs(["bun", "index.ts", "implement", "my-design", "my-feature"]);
    expect(result.command).toBe("implement");
    expect(result.args).toEqual(["my-design", "my-feature"]);
  });

  test("parses validate phase with slug", () => {
    const result = parseArgs(["bun", "index.ts", "validate", "my-design"]);
    expect(result.command).toBe("validate");
    expect(result.args).toEqual(["my-design"]);
  });

  test("parses release phase with slug", () => {
    const result = parseArgs(["bun", "index.ts", "release", "my-design"]);
    expect(result.command).toBe("release");
    expect(result.args).toEqual(["my-design"]);
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

  test("rejects unknown commands", () => {
    const mockExit = (() => { throw new Error("process.exit"); }) as never;
    const origExit = process.exit;
    process.exit = mockExit;
    try {
      expect(() => parseArgs(["bun", "index.ts", "run", "plan", "foo"])).toThrow("process.exit");
    } finally {
      process.exit = origExit;
    }
  });
});

describe("parseVerbosity", () => {
  test("-v produces verbosity 1", () => {
    const result = parseVerbosity(["-v", "my-slug"]);
    expect(result.verbosity).toBe(1);
    expect(result.rest).toEqual(["my-slug"]);
  });

  test("-vv produces verbosity 2", () => {
    const result = parseVerbosity(["-vv", "my-slug"]);
    expect(result.verbosity).toBe(2);
    expect(result.rest).toEqual(["my-slug"]);
  });

  test("-vvv produces verbosity 3", () => {
    const result = parseVerbosity(["-vvv", "my-slug"]);
    expect(result.verbosity).toBe(3);
    expect(result.rest).toEqual(["my-slug"]);
  });

  test("separate -v flags are summed", () => {
    const result = parseVerbosity(["-v", "-v", "-v", "my-slug"]);
    expect(result.verbosity).toBe(3);
    expect(result.rest).toEqual(["my-slug"]);
  });

  test("mixed -v and -vv flags are summed", () => {
    const result = parseVerbosity(["-v", "-vv", "my-slug"]);
    expect(result.verbosity).toBe(3);
    expect(result.rest).toEqual(["my-slug"]);
  });

  test("no flags produces verbosity 0", () => {
    const result = parseVerbosity(["my-slug", "my-feature"]);
    expect(result.verbosity).toBe(0);
    expect(result.rest).toEqual(["my-slug", "my-feature"]);
  });

  test("flags are stripped from positional args", () => {
    const result = parseVerbosity(["my-slug", "-vv", "my-feature"]);
    expect(result.verbosity).toBe(2);
    expect(result.rest).toEqual(["my-slug", "my-feature"]);
  });

  test("empty args produces verbosity 0", () => {
    const result = parseVerbosity([]);
    expect(result.verbosity).toBe(0);
    expect(result.rest).toEqual([]);
  });
});

describe("parseArgs verbosity", () => {
  test("watch -v produces verbosity 1", () => {
    const result = parseArgs(["bun", "index.ts", "watch", "-v"]);
    expect(result.command).toBe("watch");
    expect(result.verbosity).toBe(1);
    expect(result.args).toEqual([]);
  });

  test("status -vvv produces verbosity 3", () => {
    const result = parseArgs(["bun", "index.ts", "status", "-vvv"]);
    expect(result.command).toBe("status");
    expect(result.verbosity).toBe(3);
    expect(result.args).toEqual([]);
  });

  test("implement with -vv strips flag from args", () => {
    const result = parseArgs(["bun", "index.ts", "implement", "-vv", "my-slug", "my-feature"]);
    expect(result.command).toBe("implement");
    expect(result.verbosity).toBe(2);
    expect(result.args).toEqual(["my-slug", "my-feature"]);
  });

  test("no -v flag defaults to verbosity 0", () => {
    const result = parseArgs(["bun", "index.ts", "watch"]);
    expect(result.verbosity).toBe(0);
  });

  test("help with no args defaults to verbosity 0", () => {
    const result = parseArgs(["bun", "index.ts"]);
    expect(result.verbosity).toBe(0);
  });
});

describe("slugify", () => {
  test("lowercases and converts spaces to hyphens", () => {
    expect(slugify("My Cool Topic")).toBe("my-cool-topic");
  });

  test("strips non-alphanumeric characters", () => {
    expect(slugify("TypeScript's Pipeline!")).toBe("typescripts-pipeline");
  });

  test("collapses multiple hyphens", () => {
    expect(slugify("foo  --  bar")).toBe("foo-bar");
  });

  test("strips leading and trailing hyphens", () => {
    expect(slugify("-hello-world-")).toBe("hello-world");
  });

  test("handles empty string", () => {
    expect(slugify("")).toBe("");
  });
});
