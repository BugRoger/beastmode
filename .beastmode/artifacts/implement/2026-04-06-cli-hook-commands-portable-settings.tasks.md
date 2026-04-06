# portable-settings — Implementation Tasks

## Goal

Update settings builder functions to emit portable `bunx beastmode hooks <name>` commands instead of absolute `bun run "<path>"` commands. Update `cleanHitlSettings` to recognize the new command pattern. Delete the obsolete `absolute-hook-paths.feature` and its step definitions. Update unit tests. Add new integration test.

## Architecture

- **CLI invocation:** `bunx beastmode hooks <name> [phase]` — resolved at runtime via PATH, not at build time via `import.meta.dirname`
- **Hook names:** `hitl-auto`, `hitl-log`, `generate-output` — match existing script basenames (minus `.ts`)
- **Prompt-type hooks unaffected** — `buildFilePermissionPreToolUseHooks` produces `type: "prompt"` hooks, not commands
- **`cleanHitlSettings` Stop filter** — currently matches `generate-output.ts` in command string; must update to also match `bunx beastmode hooks generate-output`

## Tech Stack

- TypeScript, Bun, Vitest (unit tests), Cucumber/Gherkin (integration tests)
- Test command: `cd cli && bun --bun vitest run` (unit), `cd cli && bun run cucumber --profile=<name>` (integration)

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `cli/src/hooks/hitl-settings.ts` | Change `buildPreToolUseHook`, `buildPostToolUseHook`, `buildStopHook` to emit `bunx beastmode hooks` commands; update `cleanHitlSettings` Stop filter |
| Modify | `cli/src/hooks/file-permission-settings.ts` | Change `buildFilePermissionPostToolUseHooks` to emit `bunx beastmode hooks hitl-log` command |
| Modify | `cli/src/__tests__/hitl-settings.test.ts` | Update assertions from `bun run "/<path>"` pattern to `bunx beastmode hooks` pattern |
| Modify | `cli/src/__tests__/file-permission-settings.test.ts` | Update assertions from `bun run "/<path>"` pattern to `bunx beastmode hooks` pattern |
| Create | `cli/features/portable-settings.feature` | Integration test: Gherkin scenarios from feature plan |
| Create | `cli/features/step_definitions/portable-settings.steps.ts` | Step definitions for portable-settings integration test |
| Modify | `cli/cucumber.json` | Add `portable-settings` profile |
| Delete | `cli/features/absolute-hook-paths.feature` | Obsolete — replaced by portable-settings integration test |
| Delete | `cli/features/step_definitions/absolute-hook-paths.steps.ts` | Obsolete — replaced by portable-settings step definitions |

---

### Task 0: Integration Test (BDD RED)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/features/portable-settings.feature`
- Create: `cli/features/step_definitions/portable-settings.steps.ts`
- Modify: `cli/cucumber.json`

- [ ] **Step 1: Create the feature file**

```gherkin
@cli-hook-commands
Feature: Settings generation uses portable CLI-based hook commands

  The pipeline runner generates settings.local.json with hook commands
  that use `bunx beastmode hooks <name>` instead of absolute file paths.
  This ensures hook invocations are portable across machines, worktrees,
  and installation paths.

  Scenario: Generated PreToolUse hook uses CLI-based command
    Given HITL settings are generated for phase "design"
    Then the PreToolUse hook command should be "bunx beastmode hooks hitl-auto design"

  Scenario: Generated PostToolUse hook uses CLI-based command
    Given HITL settings are generated for phase "plan"
    Then the PostToolUse hook command should be "bunx beastmode hooks hitl-log plan"

  Scenario: Generated Stop hook uses CLI-based command
    Given HITL settings are generated for phase "implement"
    Then the Stop hook command should be "bunx beastmode hooks generate-output"

  Scenario: Generated settings contain no absolute paths to hook scripts
    Given a complete settings.local.json is generated for phase "design"
    Then no hook command in the settings should reference an absolute file path
    And all command-type hooks should use the portable CLI invocation pattern

  Scenario: File-permission PostToolUse hooks also use CLI-based command
    Given file-permission PostToolUse hooks are generated for phase "implement"
    Then all file-permission PostToolUse hook commands should be "bunx beastmode hooks hitl-log implement"

  Scenario: Prompt-type hooks are unaffected by the CLI migration
    Given a complete settings.local.json is generated for phase "design"
    Then file-permission PreToolUse hooks should be prompt-type
    And prompt-type hooks should not contain "bunx beastmode hooks"

  Scenario Outline: Hook commands include the correct phase argument
    Given HITL settings are generated for phase "<phase>"
    Then the PreToolUse hook command should be "bunx beastmode hooks hitl-auto <phase>"
    And the PostToolUse hook command should be "bunx beastmode hooks hitl-log <phase>"

    Examples:
      | phase     |
      | design    |
      | plan      |
      | implement |
      | validate  |
      | release   |
```

Write to `cli/features/portable-settings.feature`.

- [ ] **Step 2: Create the step definitions**

```typescript
/**
 * Step definitions for portable CLI-based hook command integration test.
 *
 * Exercises the real hook builder functions — no mocks.
 * Verifies commands use portable `bunx beastmode hooks` pattern
 * instead of absolute file paths.
 */

import { Given, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { readFileSync, mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
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
      for (const hook of entry.hooks ?? []) {
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
      for (const hook of entry.hooks ?? []) {
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
```

Write to `cli/features/step_definitions/portable-settings.steps.ts`.

- [ ] **Step 3: Add cucumber profile**

Add to `cli/cucumber.json` a new `"portable-settings"` profile:

```json
"portable-settings": {
  "paths": ["features/portable-settings.feature"],
  "import": [
    "features/step_definitions/portable-settings.steps.ts"
  ],
  "format": ["progress-bar"],
  "publishQuiet": true
}
```

- [ ] **Step 4: Run integration test to verify RED**

Run: `cd cli && bun run cucumber --profile=portable-settings`
Expected: FAIL — builders still emit absolute paths

- [ ] **Step 5: Commit**

```bash
git add cli/features/portable-settings.feature cli/features/step_definitions/portable-settings.steps.ts cli/cucumber.json
git commit -m "test(portable-settings): add integration test — RED"
```

---

### Task 1: Update HITL Settings Builders

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/hooks/hitl-settings.ts:188-216,226-237`
- Modify: `cli/src/__tests__/hitl-settings.test.ts:76-200`

- [ ] **Step 1: Update `buildPreToolUseHook` to emit portable command**

In `cli/src/hooks/hitl-settings.ts`, replace lines 226-237:

```typescript
export function buildPreToolUseHook(phase: string): PromptHookEntry {
  return {
    matcher: "AskUserQuestion",
    hooks: [
      {
        type: "command",
        command: `bunx beastmode hooks hitl-auto ${phase}`,
      },
    ],
  };
}
```

- [ ] **Step 2: Update `buildPostToolUseHook` to emit portable command**

In `cli/src/hooks/hitl-settings.ts`, replace lines 188-199:

```typescript
function buildPostToolUseHook(phase: string): HookEntry {
  return {
    matcher: "AskUserQuestion",
    hooks: [
      {
        type: "command",
        command: `bunx beastmode hooks hitl-log ${phase}`,
      },
    ],
  };
}
```

- [ ] **Step 3: Update `buildStopHook` to emit portable command**

In `cli/src/hooks/hitl-settings.ts`, replace lines 205-216:

```typescript
function buildStopHook(): HookEntry {
  return {
    matcher: "",
    hooks: [
      {
        type: "command",
        command: `bunx beastmode hooks generate-output`,
      },
    ],
  };
}
```

- [ ] **Step 4: Update `cleanHitlSettings` Stop hook filter**

In `cli/src/hooks/hitl-settings.ts`, line 155, change the Stop hook filter to recognize both old and new patterns:

```typescript
    settings.hooks.Stop = settings.hooks.Stop.filter(
      (h) => !h.hooks?.some((hk) => hk.command?.includes("generate-output")),
    );
```

(Changed from `"generate-output.ts"` to `"generate-output"` — matches both `bun run ".../generate-output.ts"` and `bunx beastmode hooks generate-output`)

- [ ] **Step 5: Remove unused `resolve` import**

In `cli/src/hooks/hitl-settings.ts`, line 11, the `resolve` import from `"node:path"` is no longer used. Remove it:

```typescript
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
```

(Delete the `import { resolve } from "node:path";` line entirely.)

- [ ] **Step 6: Update unit tests**

In `cli/src/__tests__/hitl-settings.test.ts`:

Replace the test "PostToolUse hook calls hitl-log.ts with phase" (lines 76-89):

```typescript
  test("PostToolUse hook uses portable CLI command with phase", () => {
    const claudeDir = makeTempClaudeDir();
    writeHitlSettings({
      claudeDir,
      preToolUseHook: mockPreToolUseHook,
      phase: "validate",
    });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, Array<{matcher: string; hooks: Array<{command?: string}>}>>;
    expect(hooks.PostToolUse[0].matcher).toBe("AskUserQuestion");
    expect(hooks.PostToolUse[0].hooks[0].command).toBe("bunx beastmode hooks hitl-log validate");
  });
```

Replace the test "Stop hook calls generate-output.ts" (lines 91-104):

```typescript
  test("Stop hook uses portable CLI command", () => {
    const claudeDir = makeTempClaudeDir();
    writeHitlSettings({
      claudeDir,
      preToolUseHook: mockPreToolUseHook,
      phase: "design",
    });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, Array<{matcher: string; hooks: Array<{command?: string}>}>>;
    expect(hooks.Stop).toHaveLength(1);
    expect(hooks.Stop[0].matcher).toBe("");
    expect(hooks.Stop[0].hooks[0].command).toBe("bunx beastmode hooks generate-output");
  });
```

Replace the test "hook commands use absolute paths, not shell substitution" (lines 175-200):

```typescript
  test("hook commands use portable CLI pattern, no absolute paths", () => {
    const claudeDir = makeTempClaudeDir();
    writeHitlSettings({
      claudeDir,
      preToolUseHook: mockPreToolUseHook,
      phase: "design",
    });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, Array<{matcher: string; hooks: Array<{command?: string}>}>>;

    // PreToolUse
    const preCmd = hooks.PreToolUse[0].hooks[0].command!;
    expect(preCmd).toBe("bunx beastmode hooks hitl-auto design");

    // PostToolUse
    const postCmd = hooks.PostToolUse[0].hooks[0].command!;
    expect(postCmd).toBe("bunx beastmode hooks hitl-log design");

    // Stop
    const stopCmd = hooks.Stop[0].hooks[0].command!;
    expect(stopCmd).toBe("bunx beastmode hooks generate-output");
  });
```

- [ ] **Step 7: Run unit tests**

Run: `cd cli && bun --bun vitest run src/__tests__/hitl-settings.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add cli/src/hooks/hitl-settings.ts cli/src/__tests__/hitl-settings.test.ts
git commit -m "feat(portable-settings): update HITL builders to emit CLI commands"
```

---

### Task 2: Update File-Permission Settings Builder

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/hooks/file-permission-settings.ts:136-147`
- Modify: `cli/src/__tests__/file-permission-settings.test.ts:90-116`

- [ ] **Step 1: Update `buildFilePermissionPostToolUseHooks` to emit portable command**

In `cli/src/hooks/file-permission-settings.ts`, replace lines 136-147:

```typescript
export function buildFilePermissionPostToolUseHooks(phase: string): Array<{ matcher: string; hooks: Array<Record<string, unknown>> }> {
  return FILE_PERMISSION_MATCHERS.map((tool) => ({
    matcher: tool,
    hooks: [
      {
        type: "command",
        command: `bunx beastmode hooks hitl-log ${phase}`,
      },
    ],
  }));
}
```

- [ ] **Step 2: Remove unused `resolve` import**

In `cli/src/hooks/file-permission-settings.ts`, line 11, the `resolve` import is still used by `writeFilePermissionSettings` (line 159) and `cleanFilePermissionSettings` (line 200). Check: `resolve(claudeDir, "settings.local.json")` — yes, still needed. Do NOT remove.

Actually, `resolve` is still used. Skip this step.

- [ ] **Step 3: Update unit tests**

In `cli/src/__tests__/file-permission-settings.test.ts`:

Replace the test "each hook is a command type calling hitl-log.ts with phase" (lines 99-106):

```typescript
  test("each hook uses portable CLI command with phase", () => {
    const hooks = buildFilePermissionPostToolUseHooks("validate");
    for (const hook of hooks) {
      expect(hook.hooks[0].type).toBe("command");
      expect(hook.hooks[0].command).toBe("bunx beastmode hooks hitl-log validate");
    }
  });
```

Replace the test "hook commands use absolute paths, not shell substitution" (lines 108-115):

```typescript
  test("hook commands use portable CLI pattern, no absolute paths", () => {
    const hooks = buildFilePermissionPostToolUseHooks("implement");
    for (const hook of hooks) {
      const cmd = hook.hooks[0].command as string;
      expect(cmd).toBe("bunx beastmode hooks hitl-log implement");
      expect(cmd).not.toContain('"/');
    }
  });
```

- [ ] **Step 4: Run unit tests**

Run: `cd cli && bun --bun vitest run src/__tests__/file-permission-settings.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/hooks/file-permission-settings.ts cli/src/__tests__/file-permission-settings.test.ts
git commit -m "feat(portable-settings): update file-permission builder to emit CLI commands"
```

---

### Task 3: Delete Obsolete BDD Test

**Wave:** 2
**Depends on:** Task 1, Task 2

**Files:**
- Delete: `cli/features/absolute-hook-paths.feature`
- Delete: `cli/features/step_definitions/absolute-hook-paths.steps.ts`
- Modify: `cli/cucumber.json` (remove `absolute-hook-paths` profile)

- [ ] **Step 1: Delete the obsolete feature file**

Delete `cli/features/absolute-hook-paths.feature`.

- [ ] **Step 2: Delete the obsolete step definitions**

Delete `cli/features/step_definitions/absolute-hook-paths.steps.ts`.

- [ ] **Step 3: Remove the cucumber profile**

In `cli/cucumber.json`, remove the `"absolute-hook-paths"` profile entry (lines 305-312).

- [ ] **Step 4: Run the new integration test to verify GREEN**

Run: `cd cli && bun run cucumber --profile=portable-settings`
Expected: PASS — builders now emit portable commands

- [ ] **Step 5: Run full unit test suite**

Run: `cd cli && bun --bun vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -u cli/features/absolute-hook-paths.feature cli/features/step_definitions/absolute-hook-paths.steps.ts cli/cucumber.json
git commit -m "refactor(portable-settings): delete obsolete absolute-hook-paths BDD test"
```
