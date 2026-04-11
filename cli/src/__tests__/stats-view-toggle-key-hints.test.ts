import { describe, test, expect } from "vitest";
import { getKeyHints } from "../dashboard/key-hints.js";

describe("key-hints stats view mode", () => {
  test("normal mode includes stats view mode indicator", () => {
    const hints = getKeyHints("normal", { statsViewMode: "all-time" });
    expect(hints).toContain("s stats:all-time");
  });

  test("normal mode shows session when statsViewMode is session", () => {
    const hints = getKeyHints("normal", { statsViewMode: "session" });
    expect(hints).toContain("s stats:session");
  });

  test("defaults to all-time when statsViewMode not provided", () => {
    const hints = getKeyHints("normal", {});
    expect(hints).toContain("s stats:all-time");
  });

  test("filter mode does not include stats", () => {
    const hints = getKeyHints("filter", { filterInput: "test" });
    expect(hints).not.toContain("s stats:");
  });

  test("confirm mode does not include stats", () => {
    const hints = getKeyHints("confirm", { slug: "abc" });
    expect(hints).not.toContain("s stats:");
  });
});
