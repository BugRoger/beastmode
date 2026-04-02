import { describe, test, expect } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

const PHASE_TS = readFileSync(resolve(import.meta.dir, "../src/commands/phase.ts"), "utf-8");
const POST_DISPATCH_TS = readFileSync(resolve(import.meta.dir, "../src/post-dispatch.ts"), "utf-8");

describe("design abandon guard — primary gate in phase.ts", () => {
  test("imports loadWorktreePhaseOutput from phase-output", () => {
    expect(PHASE_TS).toContain("loadWorktreePhaseOutput");
    expect(PHASE_TS).toContain("phase-output");
  });

  test("checks for design output before post-dispatch", () => {
    // The abandon guard must appear BEFORE the runPostDispatch call
    const guardIndex = PHASE_TS.indexOf("Design abandoned");
    const postDispatchIndex = PHASE_TS.indexOf("runPostDispatch(");
    expect(guardIndex).toBeGreaterThan(-1);
    expect(postDispatchIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeLessThan(postDispatchIndex);
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

  test("returns early after cleanup (skips post-dispatch)", () => {
    const guardIndex = PHASE_TS.indexOf("Design abandoned");
    const postDispatchIndex = PHASE_TS.indexOf("runPostDispatch(");
    // Between the guard and postDispatch, there should be a return
    const between = PHASE_TS.slice(guardIndex, postDispatchIndex);
    expect(between).toContain("return;");
  });

  test("only triggers for design phase in manual mode", () => {
    // The guard should check both phase === "design" and !inWorktree
    const guardIndex = PHASE_TS.indexOf("Design abandoned");
    // Look backwards for the condition
    const beforeGuard = PHASE_TS.slice(0, guardIndex);
    const lastCondition = beforeGuard.lastIndexOf('phase === "design"');
    expect(lastCondition).toBeGreaterThan(-1);
    expect(beforeGuard).toContain("!inWorktree");
  });
});

describe("design abandon guard — secondary guard in post-dispatch.ts", () => {
  test("post-dispatch checks for design output", () => {
    // Should have a specific check for design phase + no output
    expect(POST_DISPATCH_TS).toContain('opts.phase === "design"');
    // The design-specific guard should call loadWorktreePhaseOutput for design
    expect(POST_DISPATCH_TS).toContain('"design"');
  });

  test("returns early for design with no output", () => {
    // Find the design abandon guard section
    const guardIndex = POST_DISPATCH_TS.indexOf("skipping post-dispatch");
    expect(guardIndex).toBeGreaterThan(-1);
    // It should return before any DESIGN_COMPLETED event
    const designCompletedIndex = POST_DISPATCH_TS.indexOf("DESIGN_COMPLETED");
    expect(guardIndex).toBeLessThan(designCompletedIndex);
  });

  test("secondary guard is after failure early exit", () => {
    // The design guard should come after the success/failure check
    const failureExitIndex = POST_DISPATCH_TS.indexOf("skipping updates");
    const designGuardIndex = POST_DISPATCH_TS.indexOf("skipping post-dispatch");
    expect(failureExitIndex).toBeGreaterThan(-1);
    expect(designGuardIndex).toBeGreaterThan(-1);
    expect(designGuardIndex).toBeGreaterThan(failureExitIndex);
  });
});

describe("manifest store.remove() idempotency", () => {
  test("store module exports remove function", async () => {
    const store = await import("../src/manifest-store");
    expect(typeof store.remove).toBe("function");
  });
});
