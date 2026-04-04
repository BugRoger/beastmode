import { describe, expect, test } from "bun:test";
import { loadConfig, DEFAULT_HITL_PROSE } from "../config";
import type { HitlConfig } from "../config";
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

  test("default hitl config returns safe defaults", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));
    const config = loadConfig(tempDir);
    expect(config.hitl.design).toBe("always defer to human");
    expect(config.hitl.plan).toBe("always defer to human");
    expect(config.hitl.implement).toBe("always defer to human");
    expect(config.hitl.validate).toBe("always defer to human");
    expect(config.hitl.release).toBe("always defer to human");
    expect(config.hitl.timeout).toBe(30);
  });

  test("parses hitl section with custom prose", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));
    mkdirSync(join(tempDir, ".beastmode"), { recursive: true });
    writeFileSync(
      join(tempDir, ".beastmode", "config.yaml"),
      `hitl:
  timeout: 60
  design: "auto-approve all section structure questions"
  plan: "auto-approve wave ordering"
  implement: "always defer to human"
  validate: "auto-approve lint fixes"
  release: "always defer to human"
`,
    );

    const config = loadConfig(tempDir);
    expect(config.hitl.timeout).toBe(60);
    expect(config.hitl.design).toBe("auto-approve all section structure questions");
    expect(config.hitl.plan).toBe("auto-approve wave ordering");
    expect(config.hitl.implement).toBe("always defer to human");
    expect(config.hitl.validate).toBe("auto-approve lint fixes");
    expect(config.hitl.release).toBe("always defer to human");
  });

  test("partial hitl fills defaults for missing phases", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));
    mkdirSync(join(tempDir, ".beastmode"), { recursive: true });
    writeFileSync(
      join(tempDir, ".beastmode", "config.yaml"),
      `hitl:\n  design: "auto-approve all"\n`,
    );

    const config = loadConfig(tempDir);
    expect(config.hitl.design).toBe("auto-approve all");
    expect(config.hitl.plan).toBe("always defer to human");
    expect(config.hitl.timeout).toBe(30);
  });

  test("hitl config exports types for downstream use", () => {
    expect(DEFAULT_HITL_PROSE).toBe("always defer to human");
    // Type-level check: HitlConfig is usable as a type annotation
    const stub: HitlConfig = {
      design: "test",
      plan: "test",
      implement: "test",
      validate: "test",
      release: "test",
      timeout: 30,
    };
    expect(stub.timeout).toBe(30);
  });
});
