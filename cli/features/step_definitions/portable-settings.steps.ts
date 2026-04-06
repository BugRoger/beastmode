/**
 * Step definitions for portable CLI-based hook command integration test.
 *
 * Exercises the real hook builder functions — no mocks.
 * Verifies commands use portable `bunx beastmode hooks` pattern
 * instead of absolute file paths.
 */

import { Given, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { readFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildPreToolUseHook, writeHitlSettings } from "../../src/hooks/hitl-settings.js";
import {
  buildFilePermissionPostToolUseHooks,
  buildFilePermissionPreToolUseHooks,
} from "../../src/hooks/file-permission-settings.js";

interface PortableSettingsWorld {
  claudeDir?: string;
  settings?: Record<string, any>;
  preToolUseCommand?: string;
  postToolUseCommand?: string;
  stopCommand?: string;
  filePermPostCommands?: string[];
}

function buildSettingsInTempDir(phase: string): { claudeDir: string; settings: Record<string, any> } {
  const tempDir = mkdtempSync(join(tmpdir(), "portable-settings-bdd-"));
  const claudeDir = join(tempDir, ".claude");
  mkdirSync(claudeDir, { recursive: true });

  const preToolUseHook = buildPreToolUseHook(phase);
  writeHitlSettings({ claudeDir, preToolUseHook, phase });

  const settings = JSON.parse(readFileSync(join(claudeDir, "settings.local.json"), "utf-8"));
  return { claudeDir, settings };
}

// --- Given ---

Given("HITL settings are generated for phase {string}", function (this: PortableSettingsWorld, phase: string) {
  const { claudeDir, settings } = buildSettingsInTempDir(phase);
  this.claudeDir = claudeDir;
  this.settings = settings;

  this.preToolUseCommand = settings.hooks?.PreToolUse?.[0]?.hooks?.[0]?.command;
  this.postToolUseCommand = settings.hooks?.PostToolUse?.[0]?.hooks?.[0]?.command;
  this.stopCommand = settings.hooks?.Stop?.[0]?.hooks?.[0]?.command;
});

Given("a complete settings.local.json is generated for phase {string}", function (this: PortableSettingsWorld, phase: string) {
  const { claudeDir, settings } = buildSettingsInTempDir(phase);
  this.claudeDir = claudeDir;
  this.settings = settings;

  // Also add file-permission hooks
  const preToolUseHooks = buildFilePermissionPreToolUseHooks("auto-allow all", 30);
  const postToolUseHooks = buildFilePermissionPostToolUseHooks(phase);

  // Merge file-permission hooks into settings
  if (!settings.hooks.PreToolUse) settings.hooks.PreToolUse = [];
  settings.hooks.PreToolUse.push(...preToolUseHooks);
  if (!settings.hooks.PostToolUse) settings.hooks.PostToolUse = [];
  settings.hooks.PostToolUse.push(...postToolUseHooks);

  this.settings = settings;
});

Given("file-permission PostToolUse hooks are generated for phase {string}", function (this: PortableSettingsWorld, phase: string) {
  const hooks = buildFilePermissionPostToolUseHooks(phase);
  this.filePermPostCommands = hooks.map((h) => h.hooks[0].command as string);
});

// --- Then ---

Then("the PreToolUse hook command should be {string}", function (this: PortableSettingsWorld, expected: string) {
  assert.ok(this.preToolUseCommand, "No PreToolUse hook command captured");
  assert.strictEqual(this.preToolUseCommand, expected);
});

Then("the PostToolUse hook command should be {string}", function (this: PortableSettingsWorld, expected: string) {
  assert.ok(this.postToolUseCommand, "No PostToolUse hook command captured");
  assert.strictEqual(this.postToolUseCommand, expected);
});

Then("the Stop hook command should be {string}", function (this: PortableSettingsWorld, expected: string) {
  assert.ok(this.stopCommand, "No Stop hook command captured");
  assert.strictEqual(this.stopCommand, expected);
});

Then("no hook command in the settings should reference an absolute file path", function (this: PortableSettingsWorld) {
  assert.ok(this.settings, "No settings captured");
  const hooks = this.settings.hooks;
  for (const [_category, entries] of Object.entries(hooks)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      for (const hook of (entry as any).hooks ?? []) {
        if (hook.type === "command" && hook.command) {
          assert.ok(
            !hook.command.includes('"/'),
            `Command contains absolute path: ${hook.command}`,
          );
        }
      }
    }
  }
});

Then("all command-type hooks should use the portable CLI invocation pattern", function (this: PortableSettingsWorld) {
  assert.ok(this.settings, "No settings captured");
  const hooks = this.settings.hooks;
  for (const [_category, entries] of Object.entries(hooks)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      for (const hook of (entry as any).hooks ?? []) {
        if (hook.type === "command" && hook.command) {
          assert.ok(
            hook.command.startsWith("bunx beastmode hooks "),
            `Command does not use portable pattern: ${hook.command}`,
          );
        }
      }
    }
  }
});

Then("all file-permission PostToolUse hook commands should be {string}", function (this: PortableSettingsWorld, expected: string) {
  assert.ok(this.filePermPostCommands && this.filePermPostCommands.length > 0, "No file-permission hook commands captured");
  for (const cmd of this.filePermPostCommands) {
    assert.strictEqual(cmd, expected);
  }
});

Then("file-permission PreToolUse hooks should be prompt-type", function (this: PortableSettingsWorld) {
  assert.ok(this.settings, "No settings captured");
  const preToolUse = this.settings.hooks?.PreToolUse ?? [];
  const fpHooks = preToolUse.filter((h: any) => h.matcher === "Write" || h.matcher === "Edit");
  assert.ok(fpHooks.length > 0, "No file-permission PreToolUse hooks found");
  for (const entry of fpHooks) {
    for (const hook of entry.hooks) {
      assert.strictEqual(hook.type, "prompt", `Expected prompt type, got: ${hook.type}`);
    }
  }
});

Then("prompt-type hooks should not contain {string}", function (this: PortableSettingsWorld, pattern: string) {
  assert.ok(this.settings, "No settings captured");
  const preToolUse = this.settings.hooks?.PreToolUse ?? [];
  const fpHooks = preToolUse.filter((h: any) => h.matcher === "Write" || h.matcher === "Edit");
  for (const entry of fpHooks) {
    for (const hook of entry.hooks) {
      if (hook.type === "prompt") {
        assert.ok(
          !hook.prompt?.includes(pattern),
          `Prompt contains "${pattern}": ${hook.prompt?.substring(0, 100)}...`,
        );
      }
    }
  }
});
