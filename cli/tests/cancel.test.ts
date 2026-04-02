import { describe, test, expect } from "bun:test";
import { parseArgs } from "../src/args";

describe("cancel command parsing", () => {
  test("parses cancel command with slug", () => {
    const result = parseArgs(["bun", "index.ts", "cancel", "my-epic"]);
    expect(result.command).toBe("cancel");
    expect(result.args).toEqual(["my-epic"]);
  });

  test("parses cancel command without slug", () => {
    const result = parseArgs(["bun", "index.ts", "cancel"]);
    expect(result.command).toBe("cancel");
    expect(result.args).toEqual([]);
  });

  test("parses cancel command with --force flag", () => {
    const result = parseArgs(["bun", "index.ts", "cancel", "my-epic", "--force"]);
    expect(result.command).toBe("cancel");
    expect(result.force).toBe(true);
    expect(result.args).toEqual(["my-epic"]);
  });

  test("parses cancel command without --force defaults to false", () => {
    const result = parseArgs(["bun", "index.ts", "cancel", "my-epic"]);
    expect(result.command).toBe("cancel");
    expect(result.force).toBe(false);
    expect(result.args).toEqual(["my-epic"]);
  });

  test("--force is stripped from cancel args", () => {
    const result = parseArgs(["bun", "index.ts", "cancel", "--force", "my-epic"]);
    expect(result.command).toBe("cancel");
    expect(result.force).toBe(true);
    expect(result.args).toEqual(["my-epic"]);
  });
});
