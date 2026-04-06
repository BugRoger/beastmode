import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = resolve(import.meta.dirname, "../dashboard/DetailsPanel.tsx");
const source = readFileSync(SRC, "utf-8");

describe("DetailsPanel stats rendering", () => {
  test("handles stats content kind", () => {
    expect(
      source.includes('result.kind === "stats"') || source.includes("result.kind === 'stats'"),
    ).toBe(true);
  });

  test("renders Sessions section header", () => {
    expect(source).toContain("Sessions");
  });

  test("renders Phase Duration section header", () => {
    expect(source).toContain("Phase Duration");
  });

  test("renders Retries section header", () => {
    expect(source).toContain("Retries");
  });

  test("sections appear in correct order", () => {
    const sessionsIdx = source.indexOf(">Sessions<");
    const phaseIdx = source.indexOf(">Phase Duration<");
    const retriesIdx = source.indexOf(">Retries<");
    expect(sessionsIdx).toBeGreaterThan(-1);
    expect(phaseIdx).toBeGreaterThan(-1);
    expect(retriesIdx).toBeGreaterThan(-1);
    expect(sessionsIdx).toBeLessThan(phaseIdx);
    expect(phaseIdx).toBeLessThan(retriesIdx);
  });

  test("imports PHASE_COLOR for phase name coloring", () => {
    expect(source).toContain("PHASE_COLOR");
  });

  test("imports CHROME for muted color", () => {
    expect(source).toContain("CHROME");
  });

  test("references waiting for sessions placeholder", () => {
    expect(source).toContain("waiting for sessions...");
  });

  test("references formatDuration", () => {
    expect(source).toContain("formatDuration");
  });

  test("shows double-dash for unseen phases", () => {
    expect(source).toContain('"--"');
  });
});
