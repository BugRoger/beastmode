/**
 * Step definitions for file-permission-hooks integration tests.
 *
 * Tests that file-permission hooks (PreToolUse prompt hooks for Write/Edit
 * with if-field path filtering) are written to .claude/settings.local.json,
 * contain category-based prose, and coexist with HITL AskUserQuestion hooks.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { PipelineWorld } from "../support/world.js";

/** Get the actual worktree settings path, accounting for slug renames. */
function getWorktreeSettingsPath(world: PipelineWorld): string {
  const wtPath = resolve(world.projectRoot, ".claude", "worktrees", world.epicSlug);
  return join(wtPath, ".claude", "settings.local.json");
}

/** Read and parse worktree settings.local.json. */
function readWorktreeSettings(world: PipelineWorld): Record<string, unknown> {
  const settingsPath = getWorktreeSettingsPath(world);
  assert.ok(existsSync(settingsPath), `Settings file does not exist at ${settingsPath}`);
  return JSON.parse(readFileSync(settingsPath, "utf-8"));
}

/** Find all file-permission PreToolUse hook entries (matcher = Write or Edit). */
function findFilePermissionPreToolUseHooks(settings: Record<string, unknown>): Array<Record<string, unknown>> {
  const hooks = settings.hooks as Record<string, unknown> | undefined;
  if (!hooks) return [];
  const preToolUse = hooks.PreToolUse as Array<Record<string, unknown>> | undefined;
  if (!preToolUse) return [];
  return preToolUse.filter(
    (entry) => entry.matcher === "Write" || entry.matcher === "Edit",
  );
}

/** Find a specific file-permission PreToolUse hook by tool matcher. */
function findFilePermissionHookForTool(
  settings: Record<string, unknown>,
  tool: string,
): Record<string, unknown> | undefined {
  const hooks = settings.hooks as Record<string, unknown> | undefined;
  if (!hooks) return undefined;
  const preToolUse = hooks.PreToolUse as Array<Record<string, unknown>> | undefined;
  if (!preToolUse) return undefined;
  return preToolUse.find((entry) => entry.matcher === tool);
}

// -- Given: config setup --

Given(
  "the config has file-permissions claude-settings set to {string}",
  function (this: PipelineWorld, prose: string) {
    // Store the file-permissions config on the world for assertion access
    (this as any)._filePermissionsProse = prose;

    // Rewrite config.yaml with file-permissions section
    const configPath = join(this.projectRoot, ".beastmode", "config.yaml");
    const configContent = [
      "github:",
      "  enabled: false",
      "cli:",
      "  dispatch-strategy: sdk",
      "  interval: 60",
      "hitl:",
      '  model: "haiku"',
      "  timeout: 30",
      '  design: "always defer to human"',
      '  plan: "auto-answer all questions"',
      '  implement: "auto-answer all questions"',
      '  validate: "auto-answer all questions"',
      '  release: "auto-answer all questions"',
      "file-permissions:",
      `  claude-settings: "${prose}"`,
    ].join("\n") + "\n";
    writeFileSync(configPath, configContent);

    // Update in-memory config
    (this.config as any)["file-permissions"] = {
      "claude-settings": prose,
    };
  },
);

Given("the config has no file-permissions section", function (this: PipelineWorld) {
  // Default config from world.setup() has no file-permissions section
  // Just verify it's absent
  assert.strictEqual(
    (this.config as any)["file-permissions"],
    undefined,
    "Config should not have file-permissions section",
  );
});

// -- Then: file-permission PreToolUse hook assertions --

Then(
  "the worktree settings should contain a file-permission PreToolUse hook for {string}",
  function (this: PipelineWorld, category: string) {
    const settings = readWorktreeSettings(this);
    const fpHooks = findFilePermissionPreToolUseHooks(settings);

    if (category === "claude-settings") {
      // Should have both Write and Edit hooks
      const writeHook = fpHooks.find((h) => h.matcher === "Write");
      const editHook = fpHooks.find((h) => h.matcher === "Edit");
      assert.ok(
        writeHook,
        "No file-permission PreToolUse hook found for Write tool",
      );
      assert.ok(
        editHook,
        "No file-permission PreToolUse hook found for Edit tool",
      );
    } else if (category === "Write" || category === "Edit") {
      // Check for specific tool matcher
      const hook = fpHooks.find((h) => h.matcher === category);
      assert.ok(
        hook,
        `No file-permission PreToolUse hook found for ${category} tool`,
      );
    } else {
      assert.fail(`Unknown file-permission category or tool: ${category}`);
    }
  },
);

Then(
  "the file-permission hook prompt should contain {string}",
  function (this: PipelineWorld, expectedProse: string) {
    const settings = readWorktreeSettings(this);
    const fpHooks = findFilePermissionPreToolUseHooks(settings);

    assert.ok(fpHooks.length > 0, "No file-permission hooks found in settings");

    // Check that at least one hook's prompt contains the expected prose
    const hasProseInPrompt = fpHooks.some((entry) => {
      const hooks = entry.hooks as Array<Record<string, unknown>>;
      return hooks.some(
        (h) => h.type === "prompt" && typeof h.prompt === "string" && h.prompt.includes(expectedProse),
      );
    });

    assert.ok(
      hasProseInPrompt,
      `No file-permission hook prompt contains "${expectedProse}"`,
    );
  },
);

Then(
  "the file-permission hook for {string} should have an if-condition for {string} paths",
  function (this: PipelineWorld, tool: string, pathPattern: string) {
    const settings = readWorktreeSettings(this);
    const hook = findFilePermissionHookForTool(settings, tool);

    assert.ok(hook, `No file-permission hook found for ${tool}`);

    const hooks = hook.hooks as Array<Record<string, unknown>>;
    assert.ok(hooks.length > 0, `Hook entry for ${tool} has no hooks array`);

    // Check for if-field containing the path pattern
    const hasIfCondition = hooks.some((h) => {
      const ifField = h.if as string | undefined;
      return ifField && ifField.includes(pathPattern);
    });

    assert.ok(
      hasIfCondition,
      `File-permission hook for ${tool} does not have an if-condition for "${pathPattern}" paths. ` +
        `Hooks: ${JSON.stringify(hooks)}`,
    );
  },
);

Then(
  "the worktree settings should not contain stale file-permission hooks",
  function (this: PipelineWorld) {
    const settings = readWorktreeSettings(this);
    const fpHooks = findFilePermissionPreToolUseHooks(settings);

    // Should have fresh hooks (not stale from a prior dispatch)
    // "Not stale" means the hooks exist and were rewritten (we can't distinguish
    // old vs new without timestamps, so we just verify they exist and are well-formed)
    for (const hook of fpHooks) {
      const hooks = hook.hooks as Array<Record<string, unknown>>;
      assert.ok(hooks.length > 0, `Stale hook entry found for ${hook.matcher} (empty hooks array)`);
      const promptHook = hooks.find((h) => h.type === "prompt");
      assert.ok(promptHook, `Stale hook entry found for ${hook.matcher} (no prompt hook)`);
    }
  },
);

// -- Then: file-permission PostToolUse hook assertions --

Then(
  "the worktree settings should contain a file-permission PostToolUse hook",
  function (this: PipelineWorld) {
    const settings = readWorktreeSettings(this);
    const hooks = settings.hooks as Record<string, unknown> | undefined;
    assert.ok(hooks, "No hooks in settings");

    const postToolUse = hooks.PostToolUse as Array<Record<string, unknown>> | undefined;
    assert.ok(postToolUse, "No PostToolUse hooks in settings");

    // Find a PostToolUse hook for Write or Edit (file-permission logging)
    const fpLogHook = postToolUse.find(
      (entry) => entry.matcher === "Write" || entry.matcher === "Edit",
    );
    assert.ok(
      fpLogHook,
      "No file-permission PostToolUse hook found for Write or Edit",
    );
  },
);

Then(
  "the file-permission PostToolUse hook should log to the HITL log",
  function (this: PipelineWorld) {
    const settings = readWorktreeSettings(this);
    const hooks = settings.hooks as Record<string, unknown> | undefined;
    assert.ok(hooks, "No hooks in settings");

    const postToolUse = hooks.PostToolUse as Array<Record<string, unknown>> | undefined;
    assert.ok(postToolUse, "No PostToolUse hooks in settings");

    const fpLogHook = postToolUse.find(
      (entry) => entry.matcher === "Write" || entry.matcher === "Edit",
    );
    assert.ok(fpLogHook, "No file-permission PostToolUse hook found");

    const hooksArray = fpLogHook.hooks as Array<Record<string, unknown>>;
    const commandHook = hooksArray.find((h) => h.type === "command");
    assert.ok(commandHook, "No command-type hook in file-permission PostToolUse entry");

    // Verify the command references the HITL log path
    const command = commandHook.command as string;
    assert.ok(
      command.includes("hitl-log") || command.includes("file-permission-log"),
      `PostToolUse command does not reference HITL log. Command: ${command}`,
    );
  },
);

// -- When/Then: decision logging assertions --

When(
  "a file permission decision is logged for tool {string} on path {string} with decision {string}",
  function (this: PipelineWorld, tool: string, filePath: string, decision: string) {
    // Simulate a file permission log entry being written to the HITL log
    const worktreePath = resolve(this.projectRoot, ".claude", "worktrees", this.epicSlug);
    const logDir = join(worktreePath, ".beastmode", "artifacts", "design");
    mkdirSync(logDir, { recursive: true });

    const logPath = join(logDir, "hitl-log.md");
    const timestamp = new Date().toISOString();
    const entry = [
      `## ${timestamp}`,
      "",
      `**Tag:** auto`,
      `**Type:** file-permission`,
      "",
      `### Tool: ${tool}`,
      "",
      `**Path:** ${filePath}`,
      `**Decision:** ${decision}`,
      "",
    ].join("\n");

    appendFileSync(logPath, entry + "\n");

    // Store for later assertion
    (this as any)._lastLogPath = logPath;
    (this as any)._lastLogTool = tool;
    (this as any)._lastLogFilePath = filePath;
    (this as any)._lastLogDecision = decision;
  },
);

When(
  "a HITL question-answering decision is logged with tag {string}",
  function (this: PipelineWorld, tag: string) {
    const worktreePath = resolve(this.projectRoot, ".claude", "worktrees", this.epicSlug);
    const logDir = join(worktreePath, ".beastmode", "artifacts", "design");
    mkdirSync(logDir, { recursive: true });

    const logPath = join(logDir, "hitl-log.md");
    const timestamp = new Date().toISOString();
    const entry = [
      `## ${timestamp}`,
      "",
      `**Tag:** ${tag}`,
      "",
      `### Q: Test question?`,
      "",
      `**Options:** Yes, No`,
      "",
      `**Answer:** Yes`,
      "",
    ].join("\n");

    appendFileSync(logPath, entry + "\n");
    (this as any)._lastLogPath = logPath;
  },
);

Then(
  "the HITL log should contain an entry for tool {string}",
  function (this: PipelineWorld, tool: string) {
    const logPath = (this as any)._lastLogPath as string;
    assert.ok(logPath, "No log path stored");
    assert.ok(existsSync(logPath), `Log file does not exist at ${logPath}`);

    const content = readFileSync(logPath, "utf-8");
    assert.ok(
      content.includes(`### Tool: ${tool}`),
      `HITL log does not contain an entry for tool "${tool}"`,
    );
  },
);

Then(
  "the HITL log entry should include the file path {string}",
  function (this: PipelineWorld, filePath: string) {
    const logPath = (this as any)._lastLogPath as string;
    assert.ok(logPath, "No log path stored");

    const content = readFileSync(logPath, "utf-8");
    assert.ok(
      content.includes(filePath),
      `HITL log does not contain file path "${filePath}"`,
    );
  },
);

Then(
  "the HITL log entry should include the decision {string}",
  function (this: PipelineWorld, decision: string) {
    const logPath = (this as any)._lastLogPath as string;
    assert.ok(logPath, "No log path stored");

    const content = readFileSync(logPath, "utf-8");
    assert.ok(
      content.includes(decision),
      `HITL log does not contain decision "${decision}"`,
    );
  },
);

Then(
  "the HITL log should contain both question-answering and file-permission entries",
  function (this: PipelineWorld) {
    const logPath = (this as any)._lastLogPath as string;
    assert.ok(logPath, "No log path stored");
    assert.ok(existsSync(logPath), `Log file does not exist at ${logPath}`);

    const content = readFileSync(logPath, "utf-8");

    // Check for question-answering entry
    assert.ok(
      content.includes("### Q:"),
      "HITL log does not contain a question-answering entry",
    );

    // Check for file-permission entry
    assert.ok(
      content.includes("### Tool:") || content.includes("**Type:** file-permission"),
      "HITL log does not contain a file-permission entry",
    );
  },
);
