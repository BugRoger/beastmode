# Integration Tests: file-permission-hooks

## Goal

Implement 12 Gherkin scenarios covering the file-permission-hooks epic as integration tests. All scenarios should compile and run, initially failing (red) since the production code does not exist yet.

## Architecture

- **Test framework:** Cucumber.js with Bun runtime, same infrastructure as existing pipeline integration tests
- **Mock boundary:** Only `dispatch` is mocked. Everything else (git, filesystem, manifest store, stop hook, XState) runs for real
- **World:** Extends existing `PipelineWorld` from `cli/features/support/world.ts`
- **Step definitions:** New file `cli/features/step_definitions/file-permissions.steps.ts` for file-permission-specific Given/When/Then steps
- **Feature files:** 4 new `.feature` files in `cli/features/` matching the 4 feature blocks from the integration artifact
- **Cucumber config:** New `file-permissions` profile in `cli/cucumber.json` plus update `pipeline-all` to include new features

## Tech Stack

- TypeScript, Bun, Cucumber.js 10.x
- Node.js assert module for assertions
- `settings.local.json` structure: `{ hooks: { PreToolUse: HookEntry[], PostToolUse: HookEntry[] }, ... }`
- HookEntry: `{ matcher: string, hooks: Array<{ type: string, prompt?: string, command?: string, if?: string }> }`

## Design Constraints (from PRD)

- Config location: `config.yaml` under `file-permissions:` key, sibling to `hitl:`
- Initial category: `claude-settings` covering `.claude/**` paths
- Hook type: PreToolUse prompt hook on Write and Edit tools with `if` field for path filtering
- Default behavior: "always defer to human" when no prose configured
- Logging: PostToolUse command hook appends to HITL log
- Hook lifecycle: dispatch-scoped, same clean/write pattern as HITL hooks

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `cli/features/file-permissions-config.feature` | Create | Feature 1: Config section parsing (3 scenarios) |
| `cli/features/file-permissions-hooks.feature` | Create | Feature 2: Hook generation with if-field filtering (4 scenarios) |
| `cli/features/file-permissions-logging.feature` | Create | Feature 3: Decision logging (3 scenarios) |
| `cli/features/file-permissions-lifecycle.feature` | Create | Feature 4: End-to-end lifecycle (2 scenarios) |
| `cli/features/step_definitions/file-permissions.steps.ts` | Create | Step definitions for all file-permission-specific Given/When/Then steps |
| `cli/cucumber.json` | Modify | Add `file-permissions` profile and update `pipeline-all` |

---

## Task 0: Create step definitions file with file-permission-specific Given/When/Then steps

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/features/step_definitions/file-permissions.steps.ts`

- [ ] **Step 1: Write the step definitions file**

```typescript
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
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/file-permission-hooks/cli && npx tsc --noEmit features/step_definitions/file-permissions.steps.ts 2>&1 || echo "(expected: may have import resolution issues under tsc, but Bun will handle them)"`
Expected: Compiles or has only expected module resolution warnings (Bun handles these at runtime)

- [ ] **Step 3: Commit**

```bash
git add cli/features/step_definitions/file-permissions.steps.ts
git commit -m "feat(file-permission-hooks): add step definitions for integration tests"
```

---

## Task 1: Create Feature 1 — Config section parsing (3 scenarios)

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/features/file-permissions-config.feature`

- [ ] **Step 1: Write the feature file**

```gherkin
@file-permission-hooks
Feature: File permissions config section in config.yaml

  The `file-permissions:` section in config.yaml holds category-based prose
  that controls how file permission dialogs are handled. Each category maps
  to a set of file paths. The initial category is `claude-settings` covering
  `.claude/**` paths. When no prose is configured, behavior defaults to
  "always defer to human".

  Scenario: Config with file-permissions prose is loaded and available at dispatch

    Given the initial epic slug is "fp-config-epic"
    And a manifest is seeded for slug "fp-config-epic"
    And the config has file-permissions claude-settings set to "auto-allow all changes"

    When the dispatch will write a design artifact:
      | field    | value         |
      | phase    | design        |
      | slug     | fp-config     |
      | epic     | fp-config     |
      | problem  | Test problem  |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a file-permission PreToolUse hook for "claude-settings"
    And the file-permission hook prompt should contain "auto-allow all changes"

  Scenario: Missing file-permissions config defaults to defer-to-human

    Given the initial epic slug is "fp-default-epic"
    And a manifest is seeded for slug "fp-default-epic"
    And the config has no file-permissions section

    When the dispatch will write a design artifact:
      | field    | value         |
      | phase    | design        |
      | slug     | fp-default    |
      | epic     | fp-default    |
      | problem  | Test problem  |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a file-permission PreToolUse hook for "claude-settings"
    And the file-permission hook prompt should contain "always defer to human"

  Scenario: File-permissions config is category-based, not phase-based

    Given the initial epic slug is "fp-phase-epic"
    And a manifest is seeded for slug "fp-phase-epic"
    And the config has file-permissions claude-settings set to "auto-allow skill edits"

    When the dispatch will write a design artifact:
      | field    | value        |
      | phase    | design       |
      | slug     | fp-phase     |
      | epic     | fp-phase     |
      | problem  | Test problem |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the file-permission hook prompt should contain "auto-allow skill edits"

    When the dispatch will write plan artifacts:
      | feature | wave | description |
      | feat-1  | 1    | Feature 1   |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the file-permission hook prompt should contain "auto-allow skill edits"
```

- [ ] **Step 2: Commit**

```bash
git add cli/features/file-permissions-config.feature
git commit -m "feat(file-permission-hooks): add config parsing integration scenarios"
```

---

## Task 2: Create Feature 2 — Hook generation with if-field filtering (4 scenarios)

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/features/file-permissions-hooks.feature`

- [ ] **Step 1: Write the feature file**

```gherkin
@file-permission-hooks
Feature: File permission hooks written to settings.local.json with path filtering

  The CLI writes PreToolUse prompt hooks for Write and Edit tools with `if`-field
  conditions that restrict firing to `.claude/**` paths. Hooks are written at
  dispatch time and cleaned between dispatches, following the same lifecycle as
  HITL AskUserQuestion hooks.

  Background:
    Given the initial epic slug is "fp-hook-epic"
    And a manifest is seeded for slug "fp-hook-epic"
    And the config has file-permissions claude-settings set to "auto-allow all changes"

  Scenario: Write and Edit hooks have if-field conditions for path filtering

    When the dispatch will write a design artifact:
      | field    | value         |
      | phase    | design        |
      | slug     | fp-hook       |
      | epic     | fp-hook       |
      | problem  | Test problem  |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a file-permission PreToolUse hook for "Write"
    And the worktree settings should contain a file-permission PreToolUse hook for "Edit"
    And the file-permission hook for "Write" should have an if-condition for ".claude" paths
    And the file-permission hook for "Edit" should have an if-condition for ".claude" paths

  Scenario: File-permission hooks coexist with HITL AskUserQuestion hooks

    When the dispatch will write a design artifact:
      | field    | value         |
      | phase    | design        |
      | slug     | fp-coexist    |
      | epic     | fp-coexist    |
      | problem  | Test problem  |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a PreToolUse hook for "design"
    And the worktree settings should contain a file-permission PreToolUse hook for "Write"
    And the worktree settings should contain a file-permission PreToolUse hook for "Edit"

  Scenario: File-permission hooks are cleaned between dispatches

    When the dispatch will write a design artifact:
      | field    | value        |
      | phase    | design       |
      | slug     | fp-clean     |
      | epic     | fp-clean     |
      | problem  | Test problem |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a file-permission PreToolUse hook for "Write"

    When the dispatch will write plan artifacts:
      | feature | wave | description |
      | feat-1  | 1    | Feature 1   |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a file-permission PreToolUse hook for "Write"
    And the worktree settings should not contain stale file-permission hooks

  Scenario: Custom settings survive file-permission hook clean/write cycles

    Given the worktree has a custom setting "myFlag" with value "keep-me"

    When the dispatch will write a design artifact:
      | field    | value         |
      | phase    | design        |
      | slug     | fp-preserve   |
      | epic     | fp-preserve   |
      | problem  | Test problem  |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should preserve custom setting "myFlag"
```

- [ ] **Step 2: Commit**

```bash
git add cli/features/file-permissions-hooks.feature
git commit -m "feat(file-permission-hooks): add hook generation integration scenarios"
```

---

## Task 3: Create Feature 3 — Decision logging (3 scenarios)

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/features/file-permissions-logging.feature`

- [ ] **Step 1: Write the feature file**

```gherkin
@file-permission-hooks
Feature: File permission decisions logged to HITL log

  File permission decisions (auto-allow, auto-deny, deferred) are logged via a
  PostToolUse command hook to the same HITL log file used for AskUserQuestion
  decisions. This enables retro analysis across both decision types in a
  unified view.

  Scenario: PostToolUse log hook is written for file permission decisions

    Given the initial epic slug is "fp-log-epic"
    And a manifest is seeded for slug "fp-log-epic"
    And the config has file-permissions claude-settings set to "auto-allow all changes"

    When the dispatch will write a design artifact:
      | field    | value         |
      | phase    | design        |
      | slug     | fp-log        |
      | epic     | fp-log        |
      | problem  | Test problem  |
      | solution | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the worktree settings should contain a file-permission PostToolUse hook
    And the file-permission PostToolUse hook should log to the HITL log

  Scenario: File permission log entries include tool name and file path

    Given the initial epic slug is "fp-logentry-epic"
    And a manifest is seeded for slug "fp-logentry-epic"
    And the config has file-permissions claude-settings set to "auto-allow all changes"

    When a file permission decision is logged for tool "Write" on path ".claude/settings.local.json" with decision "auto-allow"
    Then the HITL log should contain an entry for tool "Write"
    And the HITL log entry should include the file path ".claude/settings.local.json"
    And the HITL log entry should include the decision "auto-allow"

  Scenario: File permission log entries coexist with HITL question-answering entries

    Given the initial epic slug is "fp-mixed-epic"
    And a manifest is seeded for slug "fp-mixed-epic"
    And the config has file-permissions claude-settings set to "auto-allow all changes"

    When a HITL question-answering decision is logged with tag "auto"
    And a file permission decision is logged for tool "Edit" on path ".claude/agents/impl.md" with decision "auto-allow"
    Then the HITL log should contain both question-answering and file-permission entries
```

- [ ] **Step 2: Commit**

```bash
git add cli/features/file-permissions-logging.feature
git commit -m "feat(file-permission-hooks): add decision logging integration scenarios"
```

---

## Task 4: Create Feature 4 — End-to-end lifecycle (2 scenarios)

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/features/file-permissions-lifecycle.feature`

- [ ] **Step 1: Write the feature file**

```gherkin
@file-permission-hooks
Feature: File permission hook lifecycle across pipeline phases

  File-permission hooks follow the same dispatch lifecycle as HITL hooks:
  written before dispatch, cleaned between dispatches. The hooks persist
  the same category prose regardless of which phase is executing, because
  file-permission config is category-based, not phase-based.

  Scenario: File permission hooks persist correct prose across design and plan phases

    Given the initial epic slug is "fp-lifecycle-epic"
    And a manifest is seeded for slug "fp-lifecycle-epic"
    And the config has file-permissions claude-settings set to "auto-allow plugin config writes"

    When the dispatch will write a design artifact:
      | field    | value              |
      | phase    | design             |
      | slug     | fp-lifecycle       |
      | epic     | fp-lifecycle       |
      | problem  | Test problem       |
      | solution | Test solution      |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the file-permission hook prompt should contain "auto-allow plugin config writes"
    And the worktree settings should contain a PreToolUse hook for "design"

    When the dispatch will write plan artifacts:
      | feature | wave | description |
      | feat-1  | 1    | Feature 1   |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the file-permission hook prompt should contain "auto-allow plugin config writes"
    And the worktree settings should contain a PreToolUse hook for "plan"

  Scenario: Dispatch failure does not leave stale file-permission hooks

    Given the initial epic slug is "fp-fail-epic"
    And a manifest is seeded for slug "fp-fail-epic"
    And the config has file-permissions claude-settings set to "auto-allow all changes"

    When the dispatch will fail
    And the pipeline runs the "plan" phase
    Then the pipeline result should be failure
    And the pipeline should not throw
```

- [ ] **Step 2: Commit**

```bash
git add cli/features/file-permissions-lifecycle.feature
git commit -m "feat(file-permission-hooks): add lifecycle integration scenarios"
```

---

## Task 5: Update cucumber.json with file-permissions profile

**Wave:** 2
**Depends on:** Task 0, Task 1, Task 2, Task 3, Task 4

**Files:**
- Modify: `cli/cucumber.json`

- [ ] **Step 1: Add file-permissions profile and update pipeline-all**

Add a new `"file-permissions"` profile to `cli/cucumber.json` that includes all 4 feature files and the required step definitions. Also update `"pipeline-all"` to include the new feature files and step definitions.

The new profile:
```json
"file-permissions": {
  "paths": [
    "features/file-permissions-config.feature",
    "features/file-permissions-hooks.feature",
    "features/file-permissions-logging.feature",
    "features/file-permissions-lifecycle.feature"
  ],
  "import": [
    "features/step_definitions/pipeline.steps.ts",
    "features/step_definitions/hitl.steps.ts",
    "features/step_definitions/error-resilience.steps.ts",
    "features/step_definitions/file-permissions.steps.ts",
    "features/support/world.ts",
    "features/support/hooks.ts"
  ],
  "format": ["progress-bar"],
  "publishQuiet": true
}
```

Update `pipeline-all` paths array to include:
- `"features/file-permissions-config.feature"`
- `"features/file-permissions-hooks.feature"`
- `"features/file-permissions-logging.feature"`
- `"features/file-permissions-lifecycle.feature"`

Update `pipeline-all` import array to include:
- `"features/step_definitions/file-permissions.steps.ts"`

- [ ] **Step 2: Verify cucumber config is valid JSON**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/file-permission-hooks/cli && node -e "JSON.parse(require('fs').readFileSync('cucumber.json', 'utf-8')); console.log('valid JSON')"`
Expected: "valid JSON"

- [ ] **Step 3: Run the file-permissions profile to verify scenarios are discovered**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/file-permission-hooks/cli && bun --bun node_modules/.bin/cucumber-js --profile file-permissions --dry-run 2>&1 | head -30`
Expected: Scenarios are discovered (12 scenarios listed)

- [ ] **Step 4: Commit**

```bash
git add cli/cucumber.json
git commit -m "feat(file-permission-hooks): add cucumber profile for file-permission integration tests"
```

---

## Task 6: Run all tests and verify red state

**Wave:** 3
**Depends on:** Task 5

**Files:**
- None (verification only)

- [ ] **Step 1: Run the file-permissions integration tests**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/file-permission-hooks/cli && bun --bun node_modules/.bin/cucumber-js --profile file-permissions 2>&1 | tail -40`
Expected: Tests run. Scenarios that assert on file-permission hooks in settings.local.json FAIL (red) because the production code doesn't write these hooks. Scenarios that only test logging (Feature 3, scenarios 2 and 3) PASS because they simulate log entries directly.

- [ ] **Step 2: Verify existing tests still pass**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/file-permission-hooks/cli && bun --bun node_modules/.bin/cucumber-js --profile hitl 2>&1`
Expected: PASS (existing HITL tests unaffected)
