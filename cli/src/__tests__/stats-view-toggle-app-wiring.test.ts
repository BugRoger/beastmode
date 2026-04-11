import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = readFileSync(
  resolve(import.meta.dirname, "../dashboard/App.tsx"),
  "utf-8",
);

describe("App.tsx stats view toggle wiring", () => {
  test("imports toSessionStats from stats-persistence", () => {
    expect(SRC).toContain("toSessionStats");
  });

  test("passes statsViewMode to DetailsPanel", () => {
    expect(SRC).toContain("statsViewMode");
  });

  test("passes statsViewMode to getKeyHints", () => {
    expect(SRC).toContain("statsViewMode: keyboard.statsViewMode");
  });

  test("conditionally selects stats based on view mode", () => {
    expect(SRC).toContain("toSessionStats");
    expect(SRC).toContain("allTimeStats");
  });
});
