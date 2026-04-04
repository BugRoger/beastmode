import { describe, test, expect } from "vitest";
import { parseWatchArgs } from "../commands/watch.js";

describe("parseWatchArgs", () => {
  test("no args returns plain=false", () => {
    const result = parseWatchArgs([]);
    expect(result.plain).toBe(false);
  });

  test("--plain returns plain=true", () => {
    const result = parseWatchArgs(["--plain"]);
    expect(result.plain).toBe(true);
  });

  test("--plain mixed with other args", () => {
    const result = parseWatchArgs(["--verbose", "--plain"]);
    expect(result.plain).toBe(true);
  });

  test("args without --plain", () => {
    const result = parseWatchArgs(["--verbose"]);
    expect(result.plain).toBe(false);
  });
});
