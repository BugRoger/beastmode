import { describe, test, expect } from "vitest";
import { buildPreToolUseHook, getPhaseHitlProse } from "../hooks/hitl-settings";
import type { HitlConfig } from "../config";

describe("buildPreToolUseHook", () => {
  test("returns entry targeting AskUserQuestion", () => {
    const entry = buildPreToolUseHook("design");
    expect(entry.matcher).toBe("AskUserQuestion");
    expect(entry.hooks).toHaveLength(1);
    expect(entry.hooks[0].type).toBe("command");
  });

  test("command references hitl-auto hook", () => {
    const entry = buildPreToolUseHook("design");
    expect(entry.hooks[0].command).toContain("hitl-auto");
  });

  test("command includes phase argument", () => {
    const entry = buildPreToolUseHook("implement");
    expect(entry.hooks[0].command).toContain("implement");
  });

  test("command uses bunx beastmode hooks", () => {
    const entry = buildPreToolUseHook("plan");
    expect(entry.hooks[0].command).toContain("bunx beastmode hooks");
  });

  test("command uses portable CLI pattern", () => {
    const entry = buildPreToolUseHook("validate");
    expect(entry.hooks[0].command).toBe("bunx beastmode hooks hitl-auto validate");
  });

  test("does not contain prompt field", () => {
    const entry = buildPreToolUseHook("design");
    expect(entry.hooks[0]).not.toHaveProperty("prompt");
  });

  test("does not contain timeout field", () => {
    const entry = buildPreToolUseHook("design");
    expect(entry.hooks[0]).not.toHaveProperty("timeout");
  });
});

describe("getPhaseHitlProse", () => {
  const defaultConfig: HitlConfig = {
    design: "always defer to human",
    plan: "auto-approve feature ordering",
    implement: "approve all architectural decisions",
    validate: undefined,
    release: "",
    timeout: 30,
  };

  test("returns configured prose for phase", () => {
    expect(getPhaseHitlProse(defaultConfig, "plan")).toBe("auto-approve feature ordering");
  });

  test("returns default prose for undefined phase", () => {
    expect(getPhaseHitlProse(defaultConfig, "validate")).toBe("always defer to human");
  });

  test("returns default prose for empty string phase", () => {
    expect(getPhaseHitlProse(defaultConfig, "release")).toBe("always defer to human");
  });

  test("returns default prose for unknown phase", () => {
    expect(getPhaseHitlProse(defaultConfig, "nonexistent")).toBe("always defer to human");
  });

  test("returns prose for design phase", () => {
    expect(getPhaseHitlProse(defaultConfig, "design")).toBe("always defer to human");
  });
});
