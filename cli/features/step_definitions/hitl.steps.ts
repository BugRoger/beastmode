/**
 * Step definitions for HITL hook lifecycle integration test.
 *
 * Tests that HITL settings (PreToolUse/PostToolUse hooks) are written to
 * .claude/settings.local.json before dispatch, contain phase-specific prose,
 * and survive across phases while cleaning appropriately.
 */

import { Given, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { PipelineWorld } from "../support/world.js";

/** Get the actual worktree settings path, accounting for slug renames. */
function getWorktreeSettingsPath(world: PipelineWorld): string {
  // After design rename, this.worktreePath may still point to the old hex slug.
  // Compute from projectRoot + current epicSlug which is always up to date.
  const wtPath = resolve(world.projectRoot, ".claude", "worktrees", world.epicSlug);
  return join(wtPath, ".claude", "settings.local.json");
}

// -- Given: worktree state setup --

Given("the worktree has a custom setting {string} with value {string}", async function (
  this: PipelineWorld,
  key: string,
  value: string,
) {
  // Store the custom setting to write once the worktree exists
  (this as any)._customSettingsToAdd = (this as any)._customSettingsToAdd || {};
  (this as any)._customSettingsToAdd[key] = value;
  (this as any)._customSettings = (this as any)._customSettings || {};
  (this as any)._customSettings[key] = value;

  // Wrap makeDispatch to inject custom settings before the real dispatch runs
  const world = this;
  const originalMakeDispatch = world.makeDispatch.bind(world);
  world.makeDispatch = () => {
    const originalDispatch = originalMakeDispatch();
    return async (opts: { phase: any; args: string[]; cwd: string }) => {
      // Write custom settings into the worktree's settings.local.json
      const settingsPath = join(opts.cwd, ".claude", "settings.local.json");
      if (existsSync(settingsPath)) {
        const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
        const customs = (world as any)._customSettingsToAdd || {};
        for (const [k, v] of Object.entries(customs)) {
          settings[k] = v;
        }
        writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
      }
      return originalDispatch(opts);
    };
  };
});

// -- Then: HITL settings assertions --

Then("the worktree settings should contain a PreToolUse hook for {string}", function (
  this: PipelineWorld,
  phase: string,
) {
  const settingsPath = getWorktreeSettingsPath(this);
  assert.ok(existsSync(settingsPath), `Settings file does not exist at ${settingsPath}`);

  const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  assert.ok(settings.hooks, "No hooks in settings");
  assert.ok(settings.hooks.PreToolUse, "No PreToolUse in settings.hooks");
  assert.ok(Array.isArray(settings.hooks.PreToolUse), "PreToolUse is not an array");

  const hitlEntry = settings.hooks.PreToolUse.find(
    (entry: any) => entry.matcher === "AskUserQuestion",
  );

  assert.ok(hitlEntry, "No PreToolUse hook found for AskUserQuestion in settings");
  assert.ok(hitlEntry.hooks, "Hook entry has no hooks array");
  assert.ok(Array.isArray(hitlEntry.hooks) && hitlEntry.hooks.length > 0, "Hook entry has empty hooks array");

  const commandHook = hitlEntry.hooks.find((h: any) => h.type === "command");
  assert.ok(commandHook, "No command-type hook found in AskUserQuestion PreToolUse entry");
  assert.ok(
    commandHook.command.includes("hitl-auto"),
    `Command should reference hitl-auto, got: ${commandHook.command}`,
  );
  assert.ok(
    commandHook.command.includes(phase),
    `Command should include phase "${phase}", got: ${commandHook.command}`,
  );

  (this as any)._lastCapturedSettings = settings;
});

Then("the worktree settings should contain a command-type PreToolUse hook for {string}", function (
  this: PipelineWorld,
  phase: string,
) {
  const settingsPath = getWorktreeSettingsPath(this);
  assert.ok(existsSync(settingsPath), `Settings file does not exist at ${settingsPath}`);

  const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  assert.ok(settings.hooks, "No hooks in settings");
  assert.ok(settings.hooks.PreToolUse, "No PreToolUse in settings.hooks");
  assert.ok(Array.isArray(settings.hooks.PreToolUse), "PreToolUse is not an array");

  const hitlEntry = settings.hooks.PreToolUse.find(
    (entry: any) => entry.matcher === "AskUserQuestion",
  );

  assert.ok(hitlEntry, "No PreToolUse hook found for AskUserQuestion in settings");
  assert.ok(hitlEntry.hooks, "Hook entry has no hooks array");

  const commandHook = hitlEntry.hooks.find((h: any) => h.type === "command");
  assert.ok(commandHook, "No command-type hook found in AskUserQuestion PreToolUse entry");
  assert.ok(
    commandHook.command.includes("hitl-auto"),
    `Command should reference hitl-auto, got: ${commandHook.command}`,
  );
  assert.ok(
    commandHook.command.includes(phase),
    `Command should include phase "${phase}", got: ${commandHook.command}`,
  );

  (this as any)._lastCapturedSettings = settings;
});

Then("the worktree settings should contain a PostToolUse hook for phase {string}", function (
  this: PipelineWorld,
  phase: string,
) {
  const settingsPath = getWorktreeSettingsPath(this);
  assert.ok(existsSync(settingsPath), `Settings file does not exist at ${settingsPath}`);

  const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  assert.ok(settings.hooks, "No hooks in settings");
  assert.ok(settings.hooks.PostToolUse, "No PostToolUse in settings.hooks");

  // Find the AskUserQuestion PostToolUse hook entry
  const hitlEntry = settings.hooks.PostToolUse.find(
    (entry: any) => entry.matcher === "AskUserQuestion",
  );

  assert.ok(hitlEntry, `No PostToolUse hook found for AskUserQuestion in settings for phase "${phase}"`);
});

Then("the worktree settings should not contain HITL hooks", function (this: PipelineWorld) {
  const settingsPath = getWorktreeSettingsPath(this);

  if (!existsSync(settingsPath)) {
    // No settings file means no hooks
    return;
  }

  const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));

  if (!settings.hooks) {
    // No hooks means we're clean
    return;
  }

  // Check that no HITL-specific hooks exist for AskUserQuestion
  const preToolHits = (settings.hooks.PreToolUse ?? []).filter(
    (entry: any) => entry.matcher === "AskUserQuestion",
  );
  const postToolHits = (settings.hooks.PostToolUse ?? []).filter(
    (entry: any) => entry.matcher === "AskUserQuestion",
  );

  assert.strictEqual(
    preToolHits.length + postToolHits.length,
    0,
    `Found ${preToolHits.length + postToolHits.length} HITL hooks but expected 0`,
  );
});

Then("the worktree settings should preserve custom setting {string}", function (
  this: PipelineWorld,
  key: string,
) {
  const settingsPath = getWorktreeSettingsPath(this);
  assert.ok(existsSync(settingsPath), `Settings file does not exist at ${settingsPath}`);

  const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));

  // Get expected custom value from earlier setup
  const expectedValue = (this as any)._customSettings?.[key];
  assert.ok(expectedValue !== undefined, `No custom setting "${key}" was set up`);

  // Check it survived
  assert.strictEqual(
    settings[key],
    expectedValue,
    `Custom setting "${key}" was not preserved. Expected "${expectedValue}", got "${settings[key]}"`,
  );
});
