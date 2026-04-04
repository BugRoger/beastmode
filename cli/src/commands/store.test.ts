import { describe, it, expect } from "vitest";

describe("store command wiring", () => {
  it("store is a recognized command in UTILITY_COMMANDS", async () => {
    const { parseArgs } = await import("../args.js");
    const result = parseArgs(["bun", "script.ts", "store", "epic", "ls"]);
    expect(result.command).toBe("store");
    expect(result.args).toEqual(["epic", "ls"]);
  });
});
