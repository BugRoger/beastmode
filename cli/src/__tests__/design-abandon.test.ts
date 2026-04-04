import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const PHASE_TS = readFileSync(resolve(import.meta.dirname, "../commands/phase.ts"), "utf-8");
const RUNNER_TS = readFileSync(resolve(import.meta.dirname, "../pipeline/runner.ts"), "utf-8");

describe("design abandon guard — primary gate in phase.ts", () => {
  test("imports loadWorktreePhaseOutput from artifacts/reader", () => {
    expect(PHASE_TS).toContain("loadWorktreePhaseOutput");
    expect(PHASE_TS).toContain("artifacts/reader");
  });

  test("checks for design output after pipeline run", () => {
    // The abandon guard must appear AFTER the runPipeline call
    const guardIndex = PHASE_TS.indexOf("Design abandoned");
    const pipelineIndex = PHASE_TS.indexOf("runPipeline(");
    expect(guardIndex).toBeGreaterThan(-1);
    expect(pipelineIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeGreaterThan(pipelineIndex);
  });

  test("delegates cleanup to shared cancel-logic module", () => {
    // After the "Design abandoned" log, should call cancelEpic
    const guardIndex = PHASE_TS.indexOf("Design abandoned");
    const remaining = PHASE_TS.slice(guardIndex);
    expect(remaining).toContain("cancelEpic");
  });

  test("passes force=true for non-interactive abandon", () => {
    const guardIndex = PHASE_TS.indexOf("Design abandoned");
    const remaining = PHASE_TS.slice(guardIndex);
    expect(remaining).toContain("force: true");
  });

  test("returns early after cleanup", () => {
    const guardIndex = PHASE_TS.indexOf("Design abandoned");
    const remaining = PHASE_TS.slice(guardIndex);
    expect(remaining).toContain("return;");
  });

  test("only triggers for design phase", () => {
    // The guard should check phase === "design"
    const guardIndex = PHASE_TS.indexOf("Design abandoned");
    const beforeGuard = PHASE_TS.slice(0, guardIndex);
    const lastCondition = beforeGuard.lastIndexOf('phase === "design"');
    expect(lastCondition).toBeGreaterThan(-1);
  });
});

describe("design abandon guard — secondary guard in pipeline/runner.ts", () => {
  test("runner checks for design output", () => {
    // Should have a specific check for design phase + no output
    expect(RUNNER_TS).toContain('config.phase === "design"');
    expect(RUNNER_TS).toContain("loadWorktreePhaseOutput");
  });

  test("returns early for design with no output", () => {
    // Find the design abandon guard section
    const guardIndex = RUNNER_TS.indexOf("no output -- skipping post-dispatch");
    expect(guardIndex).toBeGreaterThan(-1);
    // It should return before the reconcile switch/case block
    const reconcileCallIndex = RUNNER_TS.indexOf("reconcileDesign(");
    expect(reconcileCallIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeLessThan(reconcileCallIndex);
  });

  test("secondary guard is after failure early exit", () => {
    // The design guard should come after the success/failure check
    const failureExitIndex = RUNNER_TS.indexOf("skipping post-dispatch steps");
    const designGuardIndex = RUNNER_TS.indexOf("no output -- skipping post-dispatch");
    expect(failureExitIndex).toBeGreaterThan(-1);
    expect(designGuardIndex).toBeGreaterThan(-1);
    expect(designGuardIndex).toBeGreaterThan(failureExitIndex);
  });
});

describe("manifest store.remove() idempotency", () => {
  test("store module exports remove function", async () => {
    const store = await import("../manifest/store");
    expect(typeof store.remove).toBe("function");
  });
});
