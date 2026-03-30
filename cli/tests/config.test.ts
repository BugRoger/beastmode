import { describe, expect, test } from "bun:test";
import { loadConfig, resolveGateMode } from "../src/config";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("loadConfig", () => {
  test("returns defaults when no config file exists", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));
    const config = loadConfig(tempDir);
    expect(config.github.enabled).toBe(false);
    expect(config.cli.interval).toBe(60);
    expect(config.gates).toEqual({});
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
    expect(config.gates.implement?.["architectural-deviation"]).toBe("auto");
    expect(config.gates.implement?.["blocked-task-decision"]).toBe("human");
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
    expect(config.gates.plan?.["feature-set-approval"]).toBe("human");
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

describe("resolveGateMode", () => {
  test("returns configured gate mode", () => {
    const config = loadConfig("/nonexistent");
    config.gates = { implement: { "architectural-deviation": "human" } };
    expect(resolveGateMode(config, "implement.architectural-deviation")).toBe(
      "human",
    );
  });

  test("defaults to auto for unconfigured gate", () => {
    const config = loadConfig("/nonexistent");
    expect(resolveGateMode(config, "implement.unknown-gate")).toBe("auto");
  });

  test("defaults to auto for unconfigured phase", () => {
    const config = loadConfig("/nonexistent");
    expect(resolveGateMode(config, "nonexistent.gate")).toBe("auto");
  });
});
