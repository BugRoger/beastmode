import { describe, test, expect } from "bun:test";
import { buildPreToolUseHook, getPhaseHitlProse } from "../hitl-prompt";
import type { HitlConfig } from "../config";
import type { PromptHookEntry } from "../hitl-prompt";

describe("buildPreToolUseHook", () => {
  test("returns entry targeting AskUserQuestion", () => {
    const entry = buildPreToolUseHook("always defer to human");
    expect(entry.matcher).toBe("AskUserQuestion");
    expect(entry.hooks).toHaveLength(1);
    expect(entry.hooks[0].type).toBe("prompt");
  });

  test("injects prose into prompt", () => {
    const prose = "Auto-approve database choices, defer everything else";
    const entry = buildPreToolUseHook(prose);
    expect(entry.hooks[0].prompt).toContain(prose);
  });

  test("uses provided model", () => {
    const entry = buildPreToolUseHook("defer", "sonnet");
    expect(entry.hooks[0].model).toBe("sonnet");
  });

  test("uses provided timeout", () => {
    const entry = buildPreToolUseHook("defer", "haiku", 60);
    expect(entry.hooks[0].timeout).toBe(60);
  });

  test("defaults to haiku model and 30s timeout", () => {
    const entry = buildPreToolUseHook("defer");
    expect(entry.hooks[0].model).toBe("haiku");
    expect(entry.hooks[0].timeout).toBe(30);
  });

  test("prompt contains auto-answer format", () => {
    const entry = buildPreToolUseHook("defer");
    expect(entry.hooks[0].prompt).toContain("permissionDecision");
    expect(entry.hooks[0].prompt).toContain("updatedInput");
  });

  test("prompt contains defer format", () => {
    const entry = buildPreToolUseHook("defer");
    expect(entry.hooks[0].prompt).toContain('"permissionDecision": "allow"');
  });

  test("prompt instructs all-or-nothing for multi-question", () => {
    const entry = buildPreToolUseHook("defer");
    expect(entry.hooks[0].prompt).toContain("ANY question");
    expect(entry.hooks[0].prompt).toContain("defer ALL");
  });

  test("prompt instructs fail-open behavior", () => {
    const entry = buildPreToolUseHook("defer");
    expect(entry.hooks[0].prompt).toContain("fail-open");
  });

  test("prompt references $ARGUMENTS", () => {
    const entry = buildPreToolUseHook("defer");
    expect(entry.hooks[0].prompt).toContain("$ARGUMENTS");
  });
});

describe("getPhaseHitlProse", () => {
  const defaultConfig: HitlConfig = {
    design: "always defer to human",
    plan: "auto-approve feature ordering",
    implement: "approve all architectural decisions",
    validate: undefined,
    release: "",
    model: "haiku",
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
