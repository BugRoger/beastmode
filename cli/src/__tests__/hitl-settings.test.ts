import { describe, test, expect, beforeEach } from "bun:test";
import { writeHitlSettings, cleanHitlSettings } from "../hooks/pre-tool-use";
import type { WriteSettingsOptions } from "../hooks/pre-tool-use";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

function makeTempClaudeDir(): string {
  const tempDir = mkdtempSync(join(tmpdir(), "hitl-settings-test-"));
  const claudeDir = join(tempDir, ".claude");
  mkdirSync(claudeDir, { recursive: true });
  return claudeDir;
}

function readSettings(claudeDir: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(claudeDir, "settings.local.json"), "utf-8"));
}

const mockPreToolUseHook = {
  matcher: "AskUserQuestion",
  hooks: [
    {
      type: "prompt" as const,
      prompt: "You are a HITL hook...",
      model: "haiku",
      timeout: 30,
    },
  ],
};

describe("writeHitlSettings", () => {
  test("creates settings.local.json when none exists", () => {
    const claudeDir = makeTempClaudeDir();
    // Remove any auto-created file
    const settingsPath = join(claudeDir, "settings.local.json");

    writeHitlSettings({
      claudeDir,
      preToolUseHook: mockPreToolUseHook,
      phase: "design",
    });

    const settings = readSettings(claudeDir);
    expect(settings.hooks).toBeDefined();
    const hooks = settings.hooks as Record<string, unknown[]>;
    expect(hooks.PreToolUse).toHaveLength(1);
    expect(hooks.PostToolUse).toHaveLength(1);
  });

  test("preserves existing enabledPlugins", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(
      join(claudeDir, "settings.local.json"),
      JSON.stringify({
        enabledPlugins: {
          "commons@overrides": true,
          "beastmode@beastmode-marketplace": true,
        },
      }),
    );

    writeHitlSettings({
      claudeDir,
      preToolUseHook: mockPreToolUseHook,
      phase: "implement",
    });

    const settings = readSettings(claudeDir);
    expect(settings.enabledPlugins).toEqual({
      "commons@overrides": true,
      "beastmode@beastmode-marketplace": true,
    });
  });

  test("PreToolUse hook targets AskUserQuestion", () => {
    const claudeDir = makeTempClaudeDir();
    writeHitlSettings({
      claudeDir,
      preToolUseHook: mockPreToolUseHook,
      phase: "plan",
    });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, Array<{matcher: string}>>;
    expect(hooks.PreToolUse[0].matcher).toBe("AskUserQuestion");
  });

  test("PostToolUse hook calls hitl-log.ts with phase", () => {
    const claudeDir = makeTempClaudeDir();
    writeHitlSettings({
      claudeDir,
      preToolUseHook: mockPreToolUseHook,
      phase: "validate",
    });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, Array<{matcher: string; hooks: Array<{command?: string}>}>>;
    expect(hooks.PostToolUse[0].matcher).toBe("AskUserQuestion");
    expect(hooks.PostToolUse[0].hooks[0].command).toContain("hitl-log.ts");
    expect(hooks.PostToolUse[0].hooks[0].command).toContain("validate");
  });

  test("replaces existing HITL hooks on re-write", () => {
    const claudeDir = makeTempClaudeDir();

    // First write
    writeHitlSettings({
      claudeDir,
      preToolUseHook: mockPreToolUseHook,
      phase: "design",
    });

    // Second write with different phase
    writeHitlSettings({
      claudeDir,
      preToolUseHook: mockPreToolUseHook,
      phase: "plan",
    });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, Array<{matcher: string; hooks: Array<{command?: string}>}>>;
    // Should have exactly one PreToolUse and one PostToolUse — not duplicated
    expect(hooks.PreToolUse).toHaveLength(1);
    expect(hooks.PostToolUse).toHaveLength(1);
    // PostToolUse should have the latest phase
    expect(hooks.PostToolUse[0].hooks[0].command).toContain("plan");
  });

  test("preserves non-HITL hooks", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(
      join(claudeDir, "settings.local.json"),
      JSON.stringify({
        hooks: {
          PreToolUse: [
            { matcher: "SomeOtherTool", hooks: [{ type: "command", command: "echo hi" }] },
          ],
        },
      }),
    );

    writeHitlSettings({
      claudeDir,
      preToolUseHook: mockPreToolUseHook,
      phase: "design",
    });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, Array<{matcher: string}>>;
    expect(hooks.PreToolUse).toHaveLength(2);
    const matchers = hooks.PreToolUse.map((h) => h.matcher);
    expect(matchers).toContain("SomeOtherTool");
    expect(matchers).toContain("AskUserQuestion");
  });

  test("handles malformed existing JSON gracefully", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(join(claudeDir, "settings.local.json"), "not json{{{");

    // Should not throw
    writeHitlSettings({
      claudeDir,
      preToolUseHook: mockPreToolUseHook,
      phase: "design",
    });

    const settings = readSettings(claudeDir);
    expect(settings.hooks).toBeDefined();
  });
});

describe("cleanHitlSettings", () => {
  test("removes HITL hooks, preserves enabledPlugins", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(
      join(claudeDir, "settings.local.json"),
      JSON.stringify({
        enabledPlugins: { "beastmode@beastmode-marketplace": true },
        hooks: {
          PreToolUse: [
            { matcher: "AskUserQuestion", hooks: [{ type: "prompt", prompt: "test" }] },
          ],
          PostToolUse: [
            { matcher: "AskUserQuestion", hooks: [{ type: "command", command: "test" }] },
          ],
        },
      }),
    );

    cleanHitlSettings(claudeDir);

    const settings = readSettings(claudeDir);
    expect(settings.enabledPlugins).toEqual({ "beastmode@beastmode-marketplace": true });
    expect(settings.hooks).toBeUndefined();
  });

  test("preserves non-HITL hooks", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(
      join(claudeDir, "settings.local.json"),
      JSON.stringify({
        hooks: {
          PreToolUse: [
            { matcher: "AskUserQuestion", hooks: [{ type: "prompt", prompt: "hitl" }] },
            { matcher: "OtherTool", hooks: [{ type: "command", command: "other" }] },
          ],
        },
      }),
    );

    cleanHitlSettings(claudeDir);

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, Array<{matcher: string}>>;
    expect(hooks.PreToolUse).toHaveLength(1);
    expect(hooks.PreToolUse[0].matcher).toBe("OtherTool");
  });

  test("no-op when file does not exist", () => {
    const claudeDir = makeTempClaudeDir();
    // Should not throw
    cleanHitlSettings(claudeDir);
  });

  test("no-op when no hooks section", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(
      join(claudeDir, "settings.local.json"),
      JSON.stringify({ enabledPlugins: {} }),
    );

    cleanHitlSettings(claudeDir);

    const settings = readSettings(claudeDir);
    expect(settings.enabledPlugins).toEqual({});
    expect(settings.hooks).toBeUndefined();
  });
});
