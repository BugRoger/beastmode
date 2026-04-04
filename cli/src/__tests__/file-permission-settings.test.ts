import { describe, test, expect } from "bun:test";
import {
  buildFilePermissionPreToolUseHooks,
  buildFilePermissionPrompt,
  CATEGORY_PATH_MAP,
} from "../hooks/file-permission-settings";

describe("CATEGORY_PATH_MAP", () => {
  test("claude-settings maps to .claude/**", () => {
    expect(CATEGORY_PATH_MAP["claude-settings"]).toBe(".claude/**");
  });
});

describe("buildFilePermissionPrompt", () => {
  test("includes user prose in prompt", () => {
    const prompt = buildFilePermissionPrompt("auto-allow all .claude writes");
    expect(prompt).toContain("auto-allow all .claude writes");
  });

  test("includes three-outcome decision model", () => {
    const prompt = buildFilePermissionPrompt("some prose");
    expect(prompt).toContain("permissionDecision");
    expect(prompt).toContain('"allow"');
    expect(prompt).toContain('"deny"');
  });

  test("mentions $ARGUMENTS for tool input", () => {
    const prompt = buildFilePermissionPrompt("some prose");
    expect(prompt).toContain("$ARGUMENTS");
  });
});

describe("buildFilePermissionPreToolUseHooks", () => {
  test("returns two hook entries for Write and Edit", () => {
    const hooks = buildFilePermissionPreToolUseHooks("auto-allow all", 30);
    expect(hooks).toHaveLength(2);

    const matchers = hooks.map((h) => h.matcher);
    expect(matchers).toContain("Write");
    expect(matchers).toContain("Edit");
  });

  test("each hook has if condition with correct path pattern", () => {
    const hooks = buildFilePermissionPreToolUseHooks("auto-allow all", 30);
    const writeHook = hooks.find((h) => h.matcher === "Write")!;
    const editHook = hooks.find((h) => h.matcher === "Edit")!;

    expect(writeHook.hooks[0]).toHaveProperty("if");
    expect(writeHook.hooks[0]["if"]).toBe("Write(.claude/**)");
    expect(editHook.hooks[0]).toHaveProperty("if");
    expect(editHook.hooks[0]["if"]).toBe("Edit(.claude/**)");
  });

  test("each hook is a prompt type with timeout", () => {
    const hooks = buildFilePermissionPreToolUseHooks("test prose", 45);
    for (const hook of hooks) {
      expect(hook.hooks[0].type).toBe("prompt");
      expect(hook.hooks[0].timeout).toBe(45);
      expect(hook.hooks[0].prompt).toBeDefined();
    }
  });

  test("uses default timeout of 30 when not specified", () => {
    const hooks = buildFilePermissionPreToolUseHooks("test prose");
    for (const hook of hooks) {
      expect(hook.hooks[0].timeout).toBe(30);
    }
  });
});
