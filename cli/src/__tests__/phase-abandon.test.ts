import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { loadWorktreePhaseOutput } from "../phase-output";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-phase-abandon");

function cleanup(): void {
  if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
}

function writeDesignOutput(slug: string, output: object): void {
  const date = new Date().toISOString().slice(0, 10);
  const dir = resolve(TEST_ROOT, ".beastmode", "artifacts", "design");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, `${date}-${slug}.output.json`),
    JSON.stringify(output, null, 2),
  );
}

describe("design abandon gate — detection signal", () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  test("returns undefined when no design output exists (abandon case)", () => {
    // No output.json at all — this triggers the abandon path in phase.ts
    mkdirSync(resolve(TEST_ROOT, ".beastmode", "artifacts", "design"), { recursive: true });
    const result = loadWorktreePhaseOutput(TEST_ROOT, "design", "test-epic");
    expect(result).toBeUndefined();
  });

  test("returns undefined when artifacts dir does not exist", () => {
    // Worktree exists but no .beastmode/artifacts/design/ directory at all
    mkdirSync(TEST_ROOT, { recursive: true });
    const result = loadWorktreePhaseOutput(TEST_ROOT, "design", "test-epic");
    expect(result).toBeUndefined();
  });

  test("returns output when design output.json is present (normal flow)", () => {
    writeDesignOutput("test-epic", {
      status: "completed",
      artifacts: { design: "some-prd.md", slug: "real-name" },
    });

    const result = loadWorktreePhaseOutput(TEST_ROOT, "design", "test-epic");
    expect(result).toBeDefined();
    expect(result!.status).toBe("completed");
  });

  test("returns undefined for wrong slug even when other output exists", () => {
    writeDesignOutput("other-epic", {
      status: "completed",
      artifacts: { design: "prd.md" },
    });

    // Looking for test-epic but only other-epic output exists
    const result = loadWorktreePhaseOutput(TEST_ROOT, "design", "test-epic");
    expect(result).toBeUndefined();
  });

  test("returns undefined for malformed output.json (loadOutput swallows errors)", () => {
    const date = new Date().toISOString().slice(0, 10);
    const dir = resolve(TEST_ROOT, ".beastmode", "artifacts", "design");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      resolve(dir, `${date}-test-epic.output.json`),
      "not valid json{{{",
    );

    const result = loadWorktreePhaseOutput(TEST_ROOT, "design", "test-epic");
    expect(result).toBeUndefined();
  });
});
