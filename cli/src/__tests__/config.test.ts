import { describe, expect, test } from "bun:test";
import { loadConfig } from "../config";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("loadConfig", () => {
  test("returns defaults when no config file exists", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));
    const config = loadConfig(tempDir);
    expect(config.github.enabled).toBe(false);
    expect(config.cli.interval).toBe(60);
  });

  test("parses config.yaml correctly", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));
    mkdirSync(join(tempDir, ".beastmode"), { recursive: true });
    writeFileSync(
      join(tempDir, ".beastmode", "config.yaml"),
      `gates:
  implement:
    architectural-deviation: auto
    blocked-task-decision: human

github:
  enabled: true
  project-name: "Test Project"

cli:
  interval: 30
`,
    );

    const config = loadConfig(tempDir);
    expect(config.github.enabled).toBe(true);
    expect(config.github["project-name"]).toBe("Test Project");
    expect(config.cli.interval).toBe(30);
  });

  test("handles missing cli section", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));
    mkdirSync(join(tempDir, ".beastmode"), { recursive: true });
    writeFileSync(
      join(tempDir, ".beastmode", "config.yaml"),
      `gates:
  plan:
    feature-set-approval: human

github:
  enabled: false
`,
    );

    const config = loadConfig(tempDir);
    expect(config.cli.interval).toBe(60);
  });

  test("defaults dispatch-strategy to sdk when absent", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));
    const config = loadConfig(tempDir);
    expect(config.cli["dispatch-strategy"]).toBe("sdk");
  });

  test("parses dispatch-strategy from config.yaml", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));
    mkdirSync(join(tempDir, ".beastmode"), { recursive: true });
    writeFileSync(
      join(tempDir, ".beastmode", "config.yaml"),
      `cli:\n  dispatch-strategy: cmux\n`,
    );
    const config = loadConfig(tempDir);
    expect(config.cli["dispatch-strategy"]).toBe("cmux");
  });

  test("parses dispatch-strategy auto", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));
    mkdirSync(join(tempDir, ".beastmode"), { recursive: true });
    writeFileSync(
      join(tempDir, ".beastmode", "config.yaml"),
      `cli:\n  dispatch-strategy: auto\n`,
    );
    const config = loadConfig(tempDir);
    expect(config.cli["dispatch-strategy"]).toBe("auto");
  });
});
