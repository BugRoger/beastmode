import { describe, test, expect } from "vitest";
import { buildPreToolUseHook, getPhaseHitlProse } from "../hooks/hitl-settings";
import type { EnvPrefixContext } from "../hooks/hitl-settings";
import type { HitlConfig } from "../config";

const testCtx: EnvPrefixContext = { phase: "design", epicId: "bm-test", epicSlug: "test-slug" };

describe("buildPreToolUseHook", () => {
  test("returns entry targeting AskUserQuestion", () => {
    const entry = buildPreToolUseHook(testCtx);
    expect(entry.matcher).toBe("AskUserQuestion");
    expect(entry.hooks).toHaveLength(1);
    expect(entry.hooks[0].type).toBe("command");
  });

  test("command references hitl-auto hook", () => {
    const entry = buildPreToolUseHook(testCtx);
    expect(entry.hooks[0].command).toContain("hitl-auto");
  });

  test("command includes phase argument", () => {
    const entry = buildPreToolUseHook({ phase: "implement", epicId: "bm-test", epicSlug: "test-slug" });
    expect(entry.hooks[0].command).toContain("implement");
  });

  test("command uses bunx beastmode hooks", () => {
    const entry = buildPreToolUseHook({ phase: "plan", epicId: "bm-test", epicSlug: "test-slug" });
    expect(entry.hooks[0].command).toContain("bunx beastmode hooks");
  });

  test("command uses portable CLI pattern with env prefix", () => {
    const entry = buildPreToolUseHook({ phase: "validate", epicId: "bm-test", epicSlug: "test-slug" });
    expect(entry.hooks[0].command).toBe(
      "BEASTMODE_PHASE=validate BEASTMODE_EPIC_ID=bm-test BEASTMODE_EPIC_SLUG=test-slug bunx beastmode hooks hitl-auto validate"
    );
  });

  test("does not contain prompt field", () => {
    const entry = buildPreToolUseHook(testCtx);
    expect(entry.hooks[0]).not.toHaveProperty("prompt");
  });

  test("does not contain timeout field", () => {
    const entry = buildPreToolUseHook(testCtx);
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
