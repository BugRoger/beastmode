import { describe, test, expect } from "bun:test";
import { buildPreToolUseHook, getPhaseHitlProse } from "../hooks/hitl-settings";
import type { HitlConfig } from "../config";
import type { PromptHookEntry } from "../hooks/hitl-settings";

describe("buildPreToolUseHook", () => {
  test("returns entry targeting AskUserQuestion", () => {
    const entry = buildPreToolUseHook("always defer to human");
    expect(entry.matcher).toBe("AskUserQuestion");
    expect(entry.hooks).toHaveLength(1);
    expect(entry.hooks[0].type).toBe("prompt");
  });

  test("injects prose into prompt", () => {
    const prose = "auto-answer all questions, never defer to human";
    const entry = buildPreToolUseHook(prose);
    expect(entry.hooks[0].prompt).toContain(prose);
  });

  test("uses provided timeout", () => {
    const entry = buildPreToolUseHook("defer", 60);
    expect(entry.hooks[0].timeout).toBe(60);
  });

  test("defaults to 30s timeout", () => {
    const entry = buildPreToolUseHook("defer");
    expect(entry.hooks[0].timeout).toBe(30);
  });

  test("prompt contains relay format with permissionDecision and updatedInput", () => {
    const entry = buildPreToolUseHook("auto-answer all questions");
    expect(entry.hooks[0].prompt).toContain("permissionDecision");
    expect(entry.hooks[0].prompt).toContain("updatedInput");
  });

  test("prompt contains defer format", () => {
    const entry = buildPreToolUseHook("defer");
    expect(entry.hooks[0].prompt).toContain('"permissionDecision": "allow"');
  });

  test("prompt references $ARGUMENTS", () => {
    const entry = buildPreToolUseHook("defer");
    expect(entry.hooks[0].prompt).toContain("$ARGUMENTS");
  });

  test("prompt embeds prose as the literal answer value in relay format", () => {
    const prose = "auto-answer all questions, never defer to human";
    const entry = buildPreToolUseHook(prose);
    // The relay format should contain the prose as the answer value
    expect(entry.hooks[0].prompt).toContain(`"${prose}"`);
  });

  test("prompt instructs defer when prose says always defer", () => {
    const entry = buildPreToolUseHook("always defer to human");
    expect(entry.hooks[0].prompt).toContain("always defer to human");
    expect(entry.hooks[0].prompt).toContain("DEFER");
  });

  test("prompt is a relay, not a decision-maker", () => {
    const entry = buildPreToolUseHook("auto-answer all questions");
    const prompt = entry.hooks[0].prompt;
    // Should describe itself as a relay
    expect(prompt).toContain("relay");
    // Should NOT contain the old ambiguity-based decision rules
    expect(prompt).not.toContain("high confidence");
    expect(prompt).not.toContain("fail-open");
    expect(prompt).not.toContain("selected option label");
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
