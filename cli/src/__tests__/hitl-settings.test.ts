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

const mockEnvContext: EnvPrefixContext = {
  phase: "design",
  epicId: "bm-test1",
  epicSlug: "test-epic",
};

const mockPreToolUseHook = buildPreToolUseHook(mockEnvContext);

describe("writeHitlSettings", () => {
  test("creates settings.local.json when none exists", () => {
    const claudeDir = makeTempClaudeDir();

    writeHitlSettings({
      claudeDir,
      preToolUseHook: mockPreToolUseHook,
      envContext: mockEnvContext,
    });

    const settings = readSettings(claudeDir);
    expect(settings.hooks).toBeDefined();
    const hooks = settings.hooks as Record<string, unknown[]>;
    expect(hooks.PreToolUse).toHaveLength(1);
    expect(hooks.PostToolUse).toHaveLength(1);
    expect(hooks.Stop).toHaveLength(1);
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

    const implCtx: EnvPrefixContext = { phase: "implement", epicId: "bm-test1", epicSlug: "test-epic", featureId: "bm-test1.1", featureSlug: "auth-flow" };
    writeHitlSettings({
      claudeDir,
      preToolUseHook: buildPreToolUseHook(implCtx),
      envContext: implCtx,
    });

    const settings = readSettings(claudeDir);
    expect(settings.enabledPlugins).toEqual({
      "commons@overrides": true,
      "beastmode@beastmode-marketplace": true,
    });
  });

  test("PreToolUse hook targets AskUserQuestion", () => {
    const claudeDir = makeTempClaudeDir();
    const planCtx: EnvPrefixContext = { phase: "plan", epicId: "bm-test1", epicSlug: "test-epic" };
    writeHitlSettings({
      claudeDir,
      preToolUseHook: buildPreToolUseHook(planCtx),
      envContext: planCtx,
    });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, Array<{matcher: string}>>;
    expect(hooks.PreToolUse[0].matcher).toBe("AskUserQuestion");
  });

  test("PostToolUse hook uses portable CLI command with phase", () => {
    const claudeDir = makeTempClaudeDir();
    const valCtx: EnvPrefixContext = { phase: "validate", epicId: "bm-test1", epicSlug: "test-epic" };
    writeHitlSettings({
      claudeDir,
      preToolUseHook: buildPreToolUseHook(valCtx),
      envContext: valCtx,
    });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, Array<{matcher: string; hooks: Array<{command?: string}>}>>;
    expect(hooks.PostToolUse[0].matcher).toBe("AskUserQuestion");
    expect(hooks.PostToolUse[0].hooks[0].command).toContain("hitl-log");
    expect(hooks.PostToolUse[0].hooks[0].command).toContain("validate");
  });

  test("Stop hook uses portable CLI command", () => {
    const claudeDir = makeTempClaudeDir();
    writeHitlSettings({
      claudeDir,
      preToolUseHook: mockPreToolUseHook,
      envContext: mockEnvContext,
    });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, Array<{matcher: string; hooks: Array<{command?: string}>}>>;
    expect(hooks.Stop).toHaveLength(1);
    expect(hooks.Stop[0].matcher).toBe("");
    expect(hooks.Stop[0].hooks[0].command).toContain("session-stop");
  });

  test("replaces existing HITL hooks on re-write", () => {
    const claudeDir = makeTempClaudeDir();

    // First write
    writeHitlSettings({
      claudeDir,
      preToolUseHook: mockPreToolUseHook,
      envContext: mockEnvContext,
    });

    // Second write with different phase
    const planCtx: EnvPrefixContext = { phase: "plan", epicId: "bm-test1", epicSlug: "test-epic" };
    writeHitlSettings({
      claudeDir,
      preToolUseHook: buildPreToolUseHook(planCtx),
      envContext: planCtx,
    });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, Array<{matcher: string; hooks: Array<{command?: string}>}>>;
    // Should have exactly one PreToolUse, one PostToolUse, one Stop — not duplicated
    expect(hooks.PreToolUse).toHaveLength(1);
    expect(hooks.PostToolUse).toHaveLength(1);
    expect(hooks.Stop).toHaveLength(1);
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
      envContext: mockEnvContext,
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
      envContext: mockEnvContext,
    });

    const settings = readSettings(claudeDir);
    expect(settings.hooks).toBeDefined();
  });

  test("hook commands use portable CLI pattern, no absolute paths", () => {
    const claudeDir = makeTempClaudeDir();
    writeHitlSettings({
      claudeDir,
      preToolUseHook: mockPreToolUseHook,
      envContext: mockEnvContext,
    });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, Array<{matcher: string; hooks: Array<{command?: string}>}>>;

    // PreToolUse — contains env prefix + bunx command
    const preCmd = hooks.PreToolUse[0].hooks[0].command!;
    expect(preCmd).toContain("bunx beastmode hooks hitl-auto");
    expect(preCmd).toContain("design");

    // PostToolUse — contains env prefix + bunx command
    const postCmd = hooks.PostToolUse[0].hooks[0].command!;
    expect(postCmd).toContain("bunx beastmode hooks hitl-log");
    expect(postCmd).toContain("design");

    // Stop — contains env prefix + bunx command
    const stopCmd = hooks.Stop[0].hooks[0].command!;
    expect(stopCmd).toContain("bunx beastmode hooks session-stop");
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
          Stop: [
            { matcher: "", hooks: [{ type: "command", command: "BEASTMODE_PHASE=design bunx beastmode hooks session-stop" }] },
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
