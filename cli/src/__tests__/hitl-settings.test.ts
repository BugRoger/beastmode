import { describe, test, expect } from "vitest";
import { writeHitlSettings, cleanHitlSettings, buildPreToolUseHook } from "../hooks/hitl-settings";
import type { EnvPrefixContext } from "../hooks/hitl-settings";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "fs";
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

const testCtx: EnvPrefixContext = { phase: "design", epicId: "bm-test", epicSlug: "test-slug" };
const mockPreToolUseHook = buildPreToolUseHook(testCtx);

describe("writeHitlSettings", () => {
  test("creates settings.local.json when none exists", () => {
    const claudeDir = makeTempClaudeDir();
    writeHitlSettings({ claudeDir, preToolUseHook: mockPreToolUseHook, envContext: testCtx });
    const settings = readSettings(claudeDir);
    expect(settings.hooks).toBeDefined();
    const hooks = settings.hooks as Record<string, unknown[]>;
    expect(hooks.PreToolUse).toHaveLength(1);
    expect(hooks.PostToolUse).toHaveLength(1);
    expect(hooks.Stop).toHaveLength(1);
  });

  test("preserves existing enabledPlugins", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(join(claudeDir, "settings.local.json"), JSON.stringify({
      enabledPlugins: { "commons@overrides": true, "beastmode@beastmode-marketplace": true },
    }));
    writeHitlSettings({ claudeDir, preToolUseHook: mockPreToolUseHook, envContext: { phase: "implement", epicId: "bm-test", epicSlug: "test-slug" } });
    const settings = readSettings(claudeDir);
    expect(settings.enabledPlugins).toEqual({ "commons@overrides": true, "beastmode@beastmode-marketplace": true });
  });

  test("PreToolUse hook targets AskUserQuestion", () => {
    const claudeDir = makeTempClaudeDir();
    writeHitlSettings({ claudeDir, preToolUseHook: mockPreToolUseHook, envContext: { phase: "plan", epicId: "bm-test", epicSlug: "test-slug" } });
    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, Array<{matcher: string}>>;
    expect(hooks.PreToolUse[0].matcher).toBe("AskUserQuestion");
  });

  test("PostToolUse hook uses portable CLI command with env prefix", () => {
    const claudeDir = makeTempClaudeDir();
    const ctx: EnvPrefixContext = { phase: "validate", epicId: "bm-test", epicSlug: "test-slug" };
    writeHitlSettings({ claudeDir, preToolUseHook: buildPreToolUseHook(ctx), envContext: ctx });
    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, Array<{matcher: string; hooks: Array<{command?: string}>}>>;
    expect(hooks.PostToolUse[0].matcher).toBe("AskUserQuestion");
    expect(hooks.PostToolUse[0].hooks[0].command).toBe("BEASTMODE_PHASE=validate BEASTMODE_EPIC_ID=bm-test BEASTMODE_EPIC_SLUG=test-slug bunx beastmode hooks hitl-log validate");
  });

  test("Stop hook uses portable CLI command with env prefix", () => {
    const claudeDir = makeTempClaudeDir();
    writeHitlSettings({ claudeDir, preToolUseHook: mockPreToolUseHook, envContext: testCtx });
    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, Array<{matcher: string; hooks: Array<{command?: string}>}>>;
    expect(hooks.Stop).toHaveLength(1);
    expect(hooks.Stop[0].matcher).toBe("");
    expect(hooks.Stop[0].hooks[0].command).toBe("BEASTMODE_PHASE=design BEASTMODE_EPIC_ID=bm-test BEASTMODE_EPIC_SLUG=test-slug bunx beastmode hooks generate-output");
  });

  test("replaces existing HITL hooks on re-write", () => {
    const claudeDir = makeTempClaudeDir();
    writeHitlSettings({ claudeDir, preToolUseHook: mockPreToolUseHook, envContext: testCtx });
    const ctx2: EnvPrefixContext = { phase: "plan", epicId: "bm-test", epicSlug: "test-slug" };
    writeHitlSettings({ claudeDir, preToolUseHook: buildPreToolUseHook(ctx2), envContext: ctx2 });
    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, Array<{matcher: string; hooks: Array<{command?: string}>}>>;
    expect(hooks.PreToolUse).toHaveLength(1);
    expect(hooks.PostToolUse).toHaveLength(1);
    expect(hooks.Stop).toHaveLength(1);
    expect(hooks.PostToolUse[0].hooks[0].command).toContain("plan");
  });

  test("preserves non-HITL hooks", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(join(claudeDir, "settings.local.json"), JSON.stringify({
      hooks: { PreToolUse: [{ matcher: "SomeOtherTool", hooks: [{ type: "command", command: "echo hi" }] }] },
    }));
    writeHitlSettings({ claudeDir, preToolUseHook: mockPreToolUseHook, envContext: testCtx });
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
    writeHitlSettings({ claudeDir, preToolUseHook: mockPreToolUseHook, envContext: testCtx });
    const settings = readSettings(claudeDir);
    expect(settings.hooks).toBeDefined();
  });

  test("hook commands use portable CLI pattern with env prefix", () => {
    const claudeDir = makeTempClaudeDir();
    writeHitlSettings({ claudeDir, preToolUseHook: mockPreToolUseHook, envContext: testCtx });
    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, Array<{matcher: string; hooks: Array<{command?: string}>}>>;
    const preCmd = hooks.PreToolUse[0].hooks[0].command!;
    expect(preCmd).toBe("BEASTMODE_PHASE=design BEASTMODE_EPIC_ID=bm-test BEASTMODE_EPIC_SLUG=test-slug bunx beastmode hooks hitl-auto design");
    const postCmd = hooks.PostToolUse[0].hooks[0].command!;
    expect(postCmd).toBe("BEASTMODE_PHASE=design BEASTMODE_EPIC_ID=bm-test BEASTMODE_EPIC_SLUG=test-slug bunx beastmode hooks hitl-log design");
    const stopCmd = hooks.Stop[0].hooks[0].command!;
    expect(stopCmd).toBe("BEASTMODE_PHASE=design BEASTMODE_EPIC_ID=bm-test BEASTMODE_EPIC_SLUG=test-slug bunx beastmode hooks generate-output");
  });
});

describe("cleanHitlSettings", () => {
  test("removes HITL hooks, preserves enabledPlugins", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(join(claudeDir, "settings.local.json"), JSON.stringify({
      enabledPlugins: { "beastmode@beastmode-marketplace": true },
      hooks: {
        PreToolUse: [{ matcher: "AskUserQuestion", hooks: [{ type: "prompt", prompt: "test" }] }],
        PostToolUse: [{ matcher: "AskUserQuestion", hooks: [{ type: "command", command: "test" }] }],
        Stop: [{ matcher: "", hooks: [{ type: "command", command: "bunx beastmode hooks generate-output" }] }],
      },
    }));
    cleanHitlSettings(claudeDir);
    const settings = readSettings(claudeDir);
    expect(settings.enabledPlugins).toEqual({ "beastmode@beastmode-marketplace": true });
    expect(settings.hooks).toBeUndefined();
  });

  test("preserves non-HITL hooks", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(join(claudeDir, "settings.local.json"), JSON.stringify({
      hooks: { PreToolUse: [
        { matcher: "AskUserQuestion", hooks: [{ type: "prompt", prompt: "hitl" }] },
        { matcher: "OtherTool", hooks: [{ type: "command", command: "other" }] },
      ]},
    }));
    cleanHitlSettings(claudeDir);
    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, Array<{matcher: string}>>;
    expect(hooks.PreToolUse).toHaveLength(1);
    expect(hooks.PreToolUse[0].matcher).toBe("OtherTool");
  });

  test("no-op when file does not exist", () => {
    const claudeDir = makeTempClaudeDir();
    cleanHitlSettings(claudeDir);
  });

  test("no-op when no hooks section", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(join(claudeDir, "settings.local.json"), JSON.stringify({ enabledPlugins: {} }));
    cleanHitlSettings(claudeDir);
    const settings = readSettings(claudeDir);
    expect(settings.enabledPlugins).toEqual({});
    expect(settings.hooks).toBeUndefined();
  });
});
