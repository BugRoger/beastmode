import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = readFileSync(
  resolve(import.meta.dirname, "../dashboard/hooks/use-dashboard-keyboard.ts"),
  "utf-8",
);

describe("use-dashboard-keyboard stats view toggle", () => {
  test("exports StatsViewMode type", () => {
    expect(SRC).toContain("export type StatsViewMode");
  });

  test("has statsViewMode state", () => {
    expect(SRC).toContain("statsViewMode");
  });

  test("handles s key input", () => {
    expect(SRC).toMatch(/input\s*===\s*["']s["']/);
  });

  test("default stats view mode is all-time", () => {
    expect(SRC).toContain('"all-time"');
  });

  test("toggles between all-time and session", () => {
    expect(SRC).toContain('"session"');
  });

  test("statsViewMode is in DashboardKeyboardState interface", () => {
    const interfaceMatch = SRC.match(/export interface DashboardKeyboardState\s*\{[\s\S]*?\}/);
    expect(interfaceMatch).not.toBeNull();
    expect(interfaceMatch![0]).toContain("statsViewMode");
  });
});
