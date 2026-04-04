import { describe, test, expect } from "bun:test";
import {
  buildFilePermissionPreToolUseHooks,
  buildFilePermissionPrompt,
  buildFilePermissionPostToolUseHooks,
  writeFilePermissionSettings,
  cleanFilePermissionSettings,
  CATEGORY_PATH_MAP,
} from "../hooks/file-permission-settings";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

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

// --- Helpers ---

function makeTempClaudeDir(): string {
  const tempDir = mkdtempSync(join(tmpdir(), "fp-settings-test-"));
  const claudeDir = join(tempDir, ".claude");
  mkdirSync(claudeDir, { recursive: true });
  return claudeDir;
}

function readSettings(claudeDir: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(claudeDir, "settings.local.json"), "utf-8"));
}

describe("buildFilePermissionPostToolUseHooks", () => {
  test("returns two hook entries for Write and Edit", () => {
    const hooks = buildFilePermissionPostToolUseHooks("implement");
    expect(hooks).toHaveLength(2);
    const matchers = hooks.map((h) => h.matcher);
    expect(matchers).toContain("Write");
    expect(matchers).toContain("Edit");
  });

  test("each hook is a command type calling hitl-log.ts with phase", () => {
    const hooks = buildFilePermissionPostToolUseHooks("validate");
    for (const hook of hooks) {
      expect(hook.hooks[0].type).toBe("command");
      expect(hook.hooks[0].command).toContain("hitl-log.ts");
      expect(hook.hooks[0].command).toContain("validate");
    }
  });
});

describe("writeFilePermissionSettings", () => {
  test("creates settings.local.json when none exists", () => {
    const claudeDir = makeTempClaudeDir();
    const preToolUseHooks = buildFilePermissionPreToolUseHooks("test prose", 30);
    const postToolUseHooks = buildFilePermissionPostToolUseHooks("implement");

    writeFilePermissionSettings({ claudeDir, preToolUseHooks, postToolUseHooks });

    const settings = readSettings(claudeDir);
    expect(settings.hooks).toBeDefined();
    const hooks = settings.hooks as Record<string, unknown[]>;
    expect(hooks.PreToolUse).toHaveLength(2);
    expect(hooks.PostToolUse).toHaveLength(2);
  });

  test("PreToolUse hooks target Write and Edit with if conditions", () => {
    const claudeDir = makeTempClaudeDir();
    const preToolUseHooks = buildFilePermissionPreToolUseHooks("test", 30);
    const postToolUseHooks = buildFilePermissionPostToolUseHooks("implement");

    writeFilePermissionSettings({ claudeDir, preToolUseHooks, postToolUseHooks });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as any;
    const matchers = hooks.PreToolUse.map((h: any) => h.matcher);
    expect(matchers).toContain("Write");
    expect(matchers).toContain("Edit");

    const writeHook = hooks.PreToolUse.find((h: any) => h.matcher === "Write");
    expect(writeHook.hooks[0]["if"]).toBe("Write(.claude/**)");
  });

  test("preserves existing enabledPlugins", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(
      join(claudeDir, "settings.local.json"),
      JSON.stringify({ enabledPlugins: { "beastmode@beastmode-marketplace": true } }),
    );

    const preToolUseHooks = buildFilePermissionPreToolUseHooks("test", 30);
    const postToolUseHooks = buildFilePermissionPostToolUseHooks("implement");
    writeFilePermissionSettings({ claudeDir, preToolUseHooks, postToolUseHooks });

    const settings = readSettings(claudeDir);
    expect(settings.enabledPlugins).toEqual({ "beastmode@beastmode-marketplace": true });
  });

  test("replaces existing file-permission hooks on re-write", () => {
    const claudeDir = makeTempClaudeDir();

    writeFilePermissionSettings({
      claudeDir,
      preToolUseHooks: buildFilePermissionPreToolUseHooks("first", 30),
      postToolUseHooks: buildFilePermissionPostToolUseHooks("design"),
    });

    writeFilePermissionSettings({
      claudeDir,
      preToolUseHooks: buildFilePermissionPreToolUseHooks("second", 45),
      postToolUseHooks: buildFilePermissionPostToolUseHooks("implement"),
    });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as any;
    expect(hooks.PreToolUse).toHaveLength(2);
    expect(hooks.PostToolUse).toHaveLength(2);
    expect(hooks.PreToolUse[0].hooks[0].timeout).toBe(45);
  });

  test("preserves non-file-permission hooks (e.g. AskUserQuestion)", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(
      join(claudeDir, "settings.local.json"),
      JSON.stringify({
        hooks: {
          PreToolUse: [
            { matcher: "AskUserQuestion", hooks: [{ type: "prompt", prompt: "hitl prompt" }] },
          ],
          PostToolUse: [
            { matcher: "AskUserQuestion", hooks: [{ type: "command", command: "hitl-log.ts" }] },
          ],
        },
      }),
    );

    const preToolUseHooks = buildFilePermissionPreToolUseHooks("test", 30);
    const postToolUseHooks = buildFilePermissionPostToolUseHooks("implement");
    writeFilePermissionSettings({ claudeDir, preToolUseHooks, postToolUseHooks });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as any;
    expect(hooks.PreToolUse).toHaveLength(3);
    expect(hooks.PostToolUse).toHaveLength(3);
    const preMatchers = hooks.PreToolUse.map((h: any) => h.matcher);
    expect(preMatchers).toContain("AskUserQuestion");
    expect(preMatchers).toContain("Write");
    expect(preMatchers).toContain("Edit");
  });

  test("handles malformed existing JSON gracefully", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(join(claudeDir, "settings.local.json"), "not json{{{");

    const preToolUseHooks = buildFilePermissionPreToolUseHooks("test", 30);
    const postToolUseHooks = buildFilePermissionPostToolUseHooks("implement");
    writeFilePermissionSettings({ claudeDir, preToolUseHooks, postToolUseHooks });

    const settings = readSettings(claudeDir);
    expect(settings.hooks).toBeDefined();
  });
});

describe("cleanFilePermissionSettings", () => {
  test("removes Write/Edit hooks, preserves enabledPlugins", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(
      join(claudeDir, "settings.local.json"),
      JSON.stringify({
        enabledPlugins: { "beastmode@beastmode-marketplace": true },
        hooks: {
          PreToolUse: [
            { matcher: "Write", hooks: [{ type: "prompt", prompt: "test" }] },
            { matcher: "Edit", hooks: [{ type: "prompt", prompt: "test" }] },
          ],
          PostToolUse: [
            { matcher: "Write", hooks: [{ type: "command", command: "test" }] },
            { matcher: "Edit", hooks: [{ type: "command", command: "test" }] },
          ],
        },
      }),
    );

    cleanFilePermissionSettings(claudeDir);

    const settings = readSettings(claudeDir);
    expect(settings.enabledPlugins).toEqual({ "beastmode@beastmode-marketplace": true });
    expect(settings.hooks).toBeUndefined();
  });

  test("preserves non-file-permission hooks (AskUserQuestion)", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(
      join(claudeDir, "settings.local.json"),
      JSON.stringify({
        hooks: {
          PreToolUse: [
            { matcher: "AskUserQuestion", hooks: [{ type: "prompt", prompt: "hitl" }] },
            { matcher: "Write", hooks: [{ type: "prompt", prompt: "fp" }] },
            { matcher: "Edit", hooks: [{ type: "prompt", prompt: "fp" }] },
          ],
        },
      }),
    );

    cleanFilePermissionSettings(claudeDir);

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as any;
    expect(hooks.PreToolUse).toHaveLength(1);
    expect(hooks.PreToolUse[0].matcher).toBe("AskUserQuestion");
  });

  test("no-op when file does not exist", () => {
    const claudeDir = makeTempClaudeDir();
    cleanFilePermissionSettings(claudeDir);
  });

  test("no-op when no hooks section", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(
      join(claudeDir, "settings.local.json"),
      JSON.stringify({ enabledPlugins: {} }),
    );

    cleanFilePermissionSettings(claudeDir);

    const settings = readSettings(claudeDir);
    expect(settings.enabledPlugins).toEqual({});
    expect(settings.hooks).toBeUndefined();
  });
});

/**
 * Write HITL hooks directly as JSON — avoids Bun mock.module() pollution
 * from pipeline-runner.test.ts which mocks hitl-settings.js globally.
 */
function writeHitlHooksDirectly(claudeDir: string): void {
  const settingsPath = join(claudeDir, "settings.local.json");
  writeFileSync(
    settingsPath,
    JSON.stringify({
      hooks: {
        PreToolUse: [
          { matcher: "AskUserQuestion", hooks: [{ type: "prompt", prompt: "hitl prompt", timeout: 30 }] },
        ],
        PostToolUse: [
          { matcher: "AskUserQuestion", hooks: [{ type: "command", command: "hitl-log.ts implement" }] },
        ],
      },
    }),
  );
}

/**
 * Clean HITL hooks directly — removes AskUserQuestion entries, preserves others.
 * Avoids Bun mock.module() pollution from pipeline-runner.test.ts.
 */
function cleanHitlHooksDirectly(claudeDir: string): void {
  const settingsPath = join(claudeDir, "settings.local.json");
  const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  if (settings.hooks?.PreToolUse) {
    settings.hooks.PreToolUse = settings.hooks.PreToolUse.filter(
      (h: any) => h.matcher !== "AskUserQuestion",
    );
    if (settings.hooks.PreToolUse.length === 0) delete settings.hooks.PreToolUse;
  }
  if (settings.hooks?.PostToolUse) {
    settings.hooks.PostToolUse = settings.hooks.PostToolUse.filter(
      (h: any) => h.matcher !== "AskUserQuestion",
    );
    if (settings.hooks.PostToolUse.length === 0) delete settings.hooks.PostToolUse;
  }
  if (settings.hooks && Object.keys(settings.hooks).length === 0) delete settings.hooks;
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}

describe("HITL + file-permission coexistence", () => {
  test("both hook systems coexist in settings.local.json", () => {
    const claudeDir = makeTempClaudeDir();

    // Write HITL hooks directly (avoids mock.module pollution)
    writeHitlHooksDirectly(claudeDir);

    const preToolUseHooks = buildFilePermissionPreToolUseHooks("auto-allow all", 30);
    const postToolUseHooks = buildFilePermissionPostToolUseHooks("implement");
    writeFilePermissionSettings({ claudeDir, preToolUseHooks, postToolUseHooks });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as any;

    expect(hooks.PreToolUse).toHaveLength(3);
    const preMatchers = hooks.PreToolUse.map((h: any) => h.matcher).sort();
    expect(preMatchers).toEqual(["AskUserQuestion", "Edit", "Write"]);

    expect(hooks.PostToolUse).toHaveLength(3);
  });

  test("cleaning file-permission hooks preserves HITL hooks", () => {
    const claudeDir = makeTempClaudeDir();

    // Write HITL hooks directly, then file-permission hooks
    writeHitlHooksDirectly(claudeDir);
    writeFilePermissionSettings({
      claudeDir,
      preToolUseHooks: buildFilePermissionPreToolUseHooks("test", 30),
      postToolUseHooks: buildFilePermissionPostToolUseHooks("implement"),
    });

    cleanFilePermissionSettings(claudeDir);

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as any;
    expect(hooks.PreToolUse).toHaveLength(1);
    expect(hooks.PreToolUse[0].matcher).toBe("AskUserQuestion");
    expect(hooks.PostToolUse).toHaveLength(1);
    expect(hooks.PostToolUse[0].matcher).toBe("AskUserQuestion");
  });

  test("cleaning HITL hooks preserves file-permission hooks", () => {
    const claudeDir = makeTempClaudeDir();

    // Write HITL hooks directly, then file-permission hooks
    writeHitlHooksDirectly(claudeDir);
    writeFilePermissionSettings({
      claudeDir,
      preToolUseHooks: buildFilePermissionPreToolUseHooks("test", 30),
      postToolUseHooks: buildFilePermissionPostToolUseHooks("implement"),
    });

    // Clean HITL hooks directly
    cleanHitlHooksDirectly(claudeDir);

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as any;
    expect(hooks.PreToolUse).toHaveLength(2);
    const matchers = hooks.PreToolUse.map((h: any) => h.matcher).sort();
    expect(matchers).toEqual(["Edit", "Write"]);
    expect(hooks.PostToolUse).toHaveLength(2);
  });
});
