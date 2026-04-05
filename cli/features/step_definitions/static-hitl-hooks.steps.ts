/**
 * Step definitions for static HITL hooks integration test.
 *
 * Tests that the static command hook (hitl-auto.ts) produces correct output
 * based on config prose, and that the hook builder generates command-type entries.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";
import type { PipelineWorld } from "../support/world.js";

/** Get the actual worktree settings path. */
function getWorktreeSettingsPath(world: PipelineWorld): string {
  const wtPath = resolve(world.projectRoot, ".claude", "worktrees", world.epicSlug);
  return join(wtPath, ".claude", "settings.local.json");
}

/** Resolve path to hitl-auto.ts from actual source tree (not temp repo). */
function getHitlAutoScriptPath(): string {
  return resolve(__dirname, "../../../src/hooks/hitl-auto.ts");
}

// -- Given: HITL config prose setup --

Given("the HITL config prose for {string} is {string}", function (
  this: PipelineWorld,
  phase: string,
  prose: string,
) {
  const configPath = join(this.projectRoot, ".beastmode", "config.yaml");
  const configContent = readFileSync(configPath, "utf-8");

  const lines = configContent.split("\n");
  const newLines: string[] = [];
  let inHitl = false;
  let updated = false;

  for (const line of lines) {
    if (line.match(/^hitl:/)) {
      inHitl = true;
      newLines.push(line);
      continue;
    }
    if (inHitl && line.match(new RegExp(`^\\s+${phase}:`))) {
      newLines.push(`  ${phase}: "${prose}"`);
      updated = true;
      continue;
    }
    if (inHitl && !line.startsWith(" ") && line.length > 0) {
      inHitl = false;
    }
    newLines.push(line);
  }

  if (!updated) {
    const hitlIdx = newLines.findIndex((l) => l.match(/^hitl:/));
    if (hitlIdx >= 0) {
      newLines.splice(hitlIdx + 1, 0, `  ${phase}: "${prose}"`);
    }
  }

  writeFileSync(configPath, newLines.join("\n"));

  (this as any)._hitlAutoPhase = phase;
  (this as any)._hitlAutoProse = prose;
});

Given("the config has file-permissions claude-settings set to {string}", function (
  this: PipelineWorld,
  value: string,
) {
  const configPath = join(this.projectRoot, ".beastmode", "config.yaml");
  const configContent = readFileSync(configPath, "utf-8");

  const lines = configContent.split("\n");
  const newLines: string[] = [];
  let inFp = false;
  let updated = false;

  for (const line of lines) {
    if (line.match(/^file-permissions:/)) {
      inFp = true;
      newLines.push(line);
      continue;
    }
    if (inFp && line.match(/^\s+claude-settings:/)) {
      newLines.push(`  claude-settings: "${value}"`);
      updated = true;
      continue;
    }
    if (inFp && !line.startsWith(" ") && line.length > 0) {
      inFp = false;
    }
    newLines.push(line);
  }

  if (!updated) {
    const fpIdx = newLines.findIndex((l) => l.match(/^file-permissions:/));
    if (fpIdx >= 0) {
      newLines.splice(fpIdx + 1, 0, `  claude-settings: "${value}"`);
    }
  }

  writeFileSync(configPath, newLines.join("\n"));
});

// -- When: run the hook script directly --

When("the HITL auto hook runs for phase {string}", function (
  this: PipelineWorld,
  phase: string,
) {
  const toolInput = JSON.stringify({
    questions: [
      {
        question: "Which approach should we use?",
        header: "Approach",
        options: [
          { label: "Option A", description: "First option" },
          { label: "Option B", description: "Second option" },
        ],
        multiSelect: false,
      },
    ],
  });

  const scriptPath = getHitlAutoScriptPath();

  try {
    const result = execSync(`bun run "${scriptPath}" ${phase}`, {
      encoding: "utf-8",
      cwd: this.projectRoot,
      env: {
        ...process.env,
        TOOL_INPUT: toolInput,
      },
      timeout: 10000,
    });
    (this as any)._hookOutput = result;
  } catch (err: any) {
    (this as any)._hookOutput = err.stdout ?? "";
  }
});

// -- Then: hook script output assertions --

Then("the hook script should produce no output", function (this: PipelineWorld) {
  const output = ((this as any)._hookOutput ?? "").trim();
  assert.strictEqual(output, "", `Expected no output but got: ${output}`);
});

Then("the hook script should produce a JSON response", function (this: PipelineWorld) {
  const output = ((this as any)._hookOutput ?? "").trim();
  assert.ok(output.length > 0, "Expected JSON output but got empty string");

  let parsed: any;
  try {
    parsed = JSON.parse(output);
  } catch {
    assert.fail(`Expected valid JSON but got: ${output}`);
  }

  assert.ok(parsed.permissionDecision === "allow", "Expected permissionDecision=allow");
  assert.ok(parsed.updatedInput, "Expected updatedInput in response");
  (this as any)._hookParsedOutput = parsed;
});

Then("the hook script should auto-answer", function (this: PipelineWorld) {
  const output = ((this as any)._hookOutput ?? "").trim();
  assert.ok(output.length > 0, "Expected auto-answer output but got empty string");
  let parsed: any;
  try {
    parsed = JSON.parse(output);
  } catch {
    assert.fail(`Expected valid JSON but got: ${output}`);
  }
  assert.ok(parsed.permissionDecision === "allow", "Expected permissionDecision=allow");
  assert.ok(parsed.updatedInput, "Expected updatedInput in response");
});

Then("the response should set the answer to {string}", function (
  this: PipelineWorld,
  expectedAnswer: string,
) {
  const parsed = (this as any)._hookParsedOutput;
  assert.ok(parsed, "No parsed output available");

  const answers = parsed.updatedInput?.answers;
  assert.ok(answers, "No answers in updatedInput");

  const values = Object.values(answers) as string[];
  assert.ok(
    values.some((v) => v === expectedAnswer),
    `Expected at least one answer to be "${expectedAnswer}", got: ${JSON.stringify(answers)}`,
  );
});

Then("the response should include the prose in the annotation notes", function (
  this: PipelineWorld,
) {
  const parsed = (this as any)._hookParsedOutput;
  assert.ok(parsed, "No parsed output available");

  const prose = (this as any)._hitlAutoProse;
  assert.ok(prose, "No prose stored from Given step");

  const annotations = parsed.updatedInput?.annotations;
  assert.ok(annotations, "No annotations in updatedInput");

  const notesValues = Object.values(annotations).map((a: any) => a.notes);
  assert.ok(
    notesValues.some((n) => n === prose),
    `Expected annotation notes to include "${prose}", got: ${JSON.stringify(annotations)}`,
  );
});

// -- Then: settings.local.json hook type assertions --

Then("the AskUserQuestion PreToolUse hook should be command-type", function (
  this: PipelineWorld,
) {
  const settingsPath = getWorktreeSettingsPath(this);
  assert.ok(existsSync(settingsPath), `Settings file does not exist at ${settingsPath}`);

  const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  assert.ok(settings.hooks?.PreToolUse, "No PreToolUse hooks in settings");

  const hitlEntry = settings.hooks.PreToolUse.find(
    (entry: any) => entry.matcher === "AskUserQuestion",
  );
  assert.ok(hitlEntry, "No PreToolUse hook found for AskUserQuestion");

  const commandHook = hitlEntry.hooks.find((h: any) => h.type === "command");
  assert.ok(commandHook, "Expected command-type hook but found none");
  assert.ok(commandHook.command, "Command hook has no command field");
  assert.ok(
    commandHook.command.includes("hitl-auto.ts"),
    `Command should reference hitl-auto.ts, got: ${commandHook.command}`,
  );
});

Then("the hook command should include the phase {string} as an argument", function (
  this: PipelineWorld,
  phase: string,
) {
  const settingsPath = getWorktreeSettingsPath(this);
  const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));

  const hitlEntry = settings.hooks.PreToolUse.find(
    (entry: any) => entry.matcher === "AskUserQuestion",
  );
  const commandHook = hitlEntry.hooks.find((h: any) => h.type === "command");
  assert.ok(
    commandHook.command.includes(phase),
    `Command should include phase "${phase}", got: ${commandHook.command}`,
  );
});

Then("the file-permission PreToolUse hook for {string} should be prompt-type", function (
  this: PipelineWorld,
  tool: string,
) {
  const settingsPath = getWorktreeSettingsPath(this);
  const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  assert.ok(settings.hooks?.PreToolUse, "No PreToolUse hooks in settings");

  const fpEntry = settings.hooks.PreToolUse.find(
    (entry: any) => entry.matcher === tool,
  );
  assert.ok(fpEntry, `No PreToolUse hook found for ${tool}`);

  const promptHook = fpEntry.hooks.find((h: any) => h.type === "prompt");
  assert.ok(promptHook, `Expected prompt-type hook for ${tool} but found none`);
});
