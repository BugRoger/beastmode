# CLI Integration — Implementation Tasks

## Goal

Wire the session-start hook into the CLI infrastructure across three integration points: command router registration, settings builder functions, and pipeline runner wiring.

## Architecture

- **Hook communication**: Claude Code `SessionStart` hook event with `additionalContext` injection
- **Hook input**: Environment variables `BEASTMODE_PHASE`, `BEASTMODE_EPIC`, `BEASTMODE_SLUG`, optionally `BEASTMODE_FEATURE`
- **CLI subcommand**: `bunx beastmode hooks session-start`
- **Settings pattern**: `buildSessionStartHook()` / `writeSessionStartHook()` / `cleanSessionStartHook()` following `hitl-settings.ts` pattern
- **Error handling**: Non-zero exit on missing inputs (fail-fast contract — unlike other hooks that exit 0)

## Tech Stack

- TypeScript, Bun runtime
- Vitest for unit tests
- Existing patterns in `cli/src/hooks/hitl-settings.ts` and `cli/src/commands/hooks.ts`

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/hooks/session-start-settings.ts` | Create | `buildSessionStartHook()`, `writeSessionStartHook()`, `cleanSessionStartHook()` |
| `cli/src/commands/hooks.ts` | Modify | Add `session-start` to router, call hook core function |
| `cli/src/pipeline/runner.ts` | Modify | Call session-start settings builder in step 3 |
| `cli/src/commands/phase.ts` | Modify | Call session-start settings builder in cmux path |
| `cli/src/__tests__/session-start-settings.test.ts` | Create | Unit tests for settings builder functions |
| `cli/src/__tests__/hooks-command.test.ts` | Modify | Add test for session-start hook dispatch |

---

### Task 0: Integration Test (RED state)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/cli-integration.integration.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
import { describe, test, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

/**
 * Integration test for session-start-hook cli-integration feature.
 * Validates that SessionStart hook is correctly registered in settings
 * alongside existing hooks across all dispatch paths.
 */

function makeTempClaudeDir(): string {
  const tempDir = mkdtempSync(join(tmpdir(), "session-start-int-"));
  const claudeDir = join(tempDir, ".claude");
  mkdirSync(claudeDir, { recursive: true });
  return claudeDir;
}

function readSettings(claudeDir: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(claudeDir, "settings.local.json"), "utf-8"));
}

describe("Session start hook registration", () => {
  // Lazy imports — loaded after the test file is parsed
  let writeHitlSettings: typeof import("../hooks/hitl-settings")["writeHitlSettings"];
  let cleanHitlSettings: typeof import("../hooks/hitl-settings")["cleanHitlSettings"];
  let buildPreToolUseHook: typeof import("../hooks/hitl-settings")["buildPreToolUseHook"];
  let buildSessionStartHook: typeof import("../hooks/session-start-settings")["buildSessionStartHook"];
  let writeSessionStartHook: typeof import("../hooks/session-start-settings")["writeSessionStartHook"];
  let cleanSessionStartHook: typeof import("../hooks/session-start-settings")["cleanSessionStartHook"];

  beforeAll(async () => {
    const hitl = await import("../hooks/hitl-settings");
    const ss = await import("../hooks/session-start-settings");
    writeHitlSettings = hitl.writeHitlSettings;
    cleanHitlSettings = hitl.cleanHitlSettings;
    buildPreToolUseHook = hitl.buildPreToolUseHook;
    buildSessionStartHook = ss.buildSessionStartHook;
    writeSessionStartHook = ss.writeSessionStartHook;
    cleanSessionStartHook = ss.cleanSessionStartHook;
  });

  test("SessionStart hook is present in settings after dispatch setup", () => {
    const claudeDir = makeTempClaudeDir();

    // Write HITL settings (existing behavior)
    const preToolUseHook = buildPreToolUseHook("design");
    writeHitlSettings({ claudeDir, preToolUseHook, phase: "design" });

    // Write SessionStart settings (new behavior)
    const sessionStartHook = buildSessionStartHook();
    writeSessionStartHook({ claudeDir, hook: sessionStartHook });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, unknown[]>;

    // SessionStart hook present
    expect(hooks.SessionStart).toBeDefined();
    expect(hooks.SessionStart).toHaveLength(1);

    // Uses portable CLI invocation
    const entry = hooks.SessionStart[0] as { matcher: string; hooks: Array<{ command: string }> };
    expect(entry.hooks[0].command).toBe("bunx beastmode hooks session-start");

    // Existing hooks preserved
    expect(hooks.PreToolUse).toBeDefined();
    expect(hooks.PostToolUse).toBeDefined();
    expect(hooks.Stop).toBeDefined();
  });

  test("SessionStart hook is cleaned and rewritten between dispatches", () => {
    const claudeDir = makeTempClaudeDir();

    // First dispatch (design)
    const hook1 = buildSessionStartHook();
    writeSessionStartHook({ claudeDir, hook: hook1 });

    // Clean between dispatches
    cleanSessionStartHook(claudeDir);

    // Second dispatch (plan)
    const hook2 = buildSessionStartHook();
    writeSessionStartHook({ claudeDir, hook: hook2 });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, unknown[]>;

    // Exactly one SessionStart entry
    expect(hooks.SessionStart).toHaveLength(1);
  });

  test("Both manual pipeline and watch loop share the same hook format", () => {
    // Manual pipeline path
    const manualDir = makeTempClaudeDir();
    const preToolUseHook = buildPreToolUseHook("implement");
    writeHitlSettings({ claudeDir: manualDir, preToolUseHook, phase: "implement" });
    const manualHook = buildSessionStartHook();
    writeSessionStartHook({ claudeDir: manualDir, hook: manualHook });

    // Watch loop path (same functions, different claudeDir)
    const watchDir = makeTempClaudeDir();
    const watchPreHook = buildPreToolUseHook("implement");
    writeHitlSettings({ claudeDir: watchDir, preToolUseHook: watchPreHook, phase: "implement" });
    const watchHook = buildSessionStartHook();
    writeSessionStartHook({ claudeDir: watchDir, hook: watchHook });

    const manualSettings = readSettings(manualDir);
    const watchSettings = readSettings(watchDir);

    const manualSS = (manualSettings.hooks as Record<string, unknown[]>).SessionStart;
    const watchSS = (watchSettings.hooks as Record<string, unknown[]>).SessionStart;

    // Same format
    expect(manualSS).toEqual(watchSS);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/cli-integration.integration.test.ts`
Expected: FAIL — module `../hooks/session-start-settings` does not exist

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/cli-integration.integration.test.ts
git commit -m "test(session-start-hook): add integration test for cli-integration (RED)"
```

---

### Task 1: Session Start Settings Builder

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/src/hooks/session-start-settings.ts`
- Create: `cli/src/__tests__/session-start-settings.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, test, expect } from "vitest";
import { buildSessionStartHook, writeSessionStartHook, cleanSessionStartHook } from "../hooks/session-start-settings";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

function makeTempClaudeDir(): string {
  const tempDir = mkdtempSync(join(tmpdir(), "session-start-settings-test-"));
  const claudeDir = join(tempDir, ".claude");
  mkdirSync(claudeDir, { recursive: true });
  return claudeDir;
}

function readSettings(claudeDir: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(claudeDir, "settings.local.json"), "utf-8"));
}

describe("buildSessionStartHook", () => {
  test("returns SessionStart hook entry with empty matcher", () => {
    const hook = buildSessionStartHook();
    expect(hook.matcher).toBe("");
  });

  test("uses portable CLI command", () => {
    const hook = buildSessionStartHook();
    expect(hook.hooks).toHaveLength(1);
    expect(hook.hooks[0].type).toBe("command");
    expect(hook.hooks[0].command).toBe("bunx beastmode hooks session-start");
  });
});

describe("writeSessionStartHook", () => {
  test("creates settings.local.json when none exists", () => {
    const claudeDir = makeTempClaudeDir();
    const hook = buildSessionStartHook();

    writeSessionStartHook({ claudeDir, hook });

    const settings = readSettings(claudeDir);
    expect(settings.hooks).toBeDefined();
    const hooks = settings.hooks as Record<string, unknown[]>;
    expect(hooks.SessionStart).toHaveLength(1);
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

    const hook = buildSessionStartHook();
    writeSessionStartHook({ claudeDir, hook });

    const settings = readSettings(claudeDir);
    expect(settings.enabledPlugins).toEqual({
      "commons@overrides": true,
      "beastmode@beastmode-marketplace": true,
    });
  });

  test("preserves existing PreToolUse hooks", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(
      join(claudeDir, "settings.local.json"),
      JSON.stringify({
        hooks: {
          PreToolUse: [
            { matcher: "AskUserQuestion", hooks: [{ type: "command", command: "bunx beastmode hooks hitl-auto design" }] },
          ],
          PostToolUse: [
            { matcher: "AskUserQuestion", hooks: [{ type: "command", command: "bunx beastmode hooks hitl-log design" }] },
          ],
          Stop: [
            { matcher: "", hooks: [{ type: "command", command: "bunx beastmode hooks generate-output" }] },
          ],
        },
      }),
    );

    const hook = buildSessionStartHook();
    writeSessionStartHook({ claudeDir, hook });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, unknown[]>;
    expect(hooks.PreToolUse).toHaveLength(1);
    expect(hooks.PostToolUse).toHaveLength(1);
    expect(hooks.Stop).toHaveLength(1);
    expect(hooks.SessionStart).toHaveLength(1);
  });

  test("replaces existing SessionStart hook on re-write", () => {
    const claudeDir = makeTempClaudeDir();
    const hook = buildSessionStartHook();

    writeSessionStartHook({ claudeDir, hook });
    writeSessionStartHook({ claudeDir, hook });

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, unknown[]>;
    expect(hooks.SessionStart).toHaveLength(1);
  });

  test("handles malformed existing JSON gracefully", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(join(claudeDir, "settings.local.json"), "not json{{{");

    const hook = buildSessionStartHook();
    writeSessionStartHook({ claudeDir, hook });

    const settings = readSettings(claudeDir);
    expect(settings.hooks).toBeDefined();
  });
});

describe("cleanSessionStartHook", () => {
  test("removes SessionStart hooks, preserves other hooks", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(
      join(claudeDir, "settings.local.json"),
      JSON.stringify({
        hooks: {
          PreToolUse: [
            { matcher: "AskUserQuestion", hooks: [{ type: "command", command: "test" }] },
          ],
          SessionStart: [
            { matcher: "", hooks: [{ type: "command", command: "bunx beastmode hooks session-start" }] },
          ],
        },
      }),
    );

    cleanSessionStartHook(claudeDir);

    const settings = readSettings(claudeDir);
    const hooks = settings.hooks as Record<string, unknown[]>;
    expect(hooks.SessionStart).toBeUndefined();
    expect(hooks.PreToolUse).toHaveLength(1);
  });

  test("no-op when file does not exist", () => {
    const claudeDir = makeTempClaudeDir();
    // Should not throw
    cleanSessionStartHook(claudeDir);
  });

  test("no-op when no hooks section", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(
      join(claudeDir, "settings.local.json"),
      JSON.stringify({ enabledPlugins: {} }),
    );

    cleanSessionStartHook(claudeDir);

    const settings = readSettings(claudeDir);
    expect(settings.enabledPlugins).toEqual({});
    expect(settings.hooks).toBeUndefined();
  });

  test("removes hooks key when empty after clean", () => {
    const claudeDir = makeTempClaudeDir();
    writeFileSync(
      join(claudeDir, "settings.local.json"),
      JSON.stringify({
        hooks: {
          SessionStart: [
            { matcher: "", hooks: [{ type: "command", command: "bunx beastmode hooks session-start" }] },
          ],
        },
      }),
    );

    cleanSessionStartHook(claudeDir);

    const settings = readSettings(claudeDir);
    expect(settings.hooks).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/session-start-settings.test.ts`
Expected: FAIL — module `../hooks/session-start-settings` does not exist

- [ ] **Step 3: Write the implementation**

```typescript
/**
 * session-start-settings.ts — SessionStart hook composition for settings.local.json.
 *
 * Builds, writes, and cleans SessionStart hook entries following the same
 * atomic read-merge-write pattern as hitl-settings.ts.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";

/** Shape of a hook entry in settings.local.json */
interface HookEntry {
  matcher: string;
  hooks: Array<{
    type: string;
    command?: string;
  }>;
}

/** Shape of settings.local.json */
interface SettingsLocal {
  enabledPlugins?: Record<string, boolean>;
  hooks?: {
    SessionStart?: HookEntry[];
    [key: string]: HookEntry[] | undefined;
  };
  [key: string]: unknown;
}

export interface WriteSessionStartOptions {
  /** Path to the .claude directory in the worktree */
  claudeDir: string;
  /** SessionStart hook entry */
  hook: HookEntry;
}

/**
 * Build the SessionStart hook entry.
 * Uses the portable CLI invocation pattern.
 */
export function buildSessionStartHook(): HookEntry {
  return {
    matcher: "",
    hooks: [
      {
        type: "command",
        command: "bunx beastmode hooks session-start",
      },
    ],
  };
}

/**
 * Read existing settings.local.json, merge SessionStart hook, write back atomically.
 * Preserves all existing keys and replaces only the SessionStart hook entry.
 */
export function writeSessionStartHook(options: WriteSessionStartOptions): void {
  const { claudeDir, hook } = options;
  const settingsPath = resolve(claudeDir, "settings.local.json");

  let settings: SettingsLocal = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      settings = {};
    }
  }

  if (!settings.hooks) {
    settings.hooks = {};
  }

  // Replace any existing SessionStart entries, then add the new one
  const existing = (settings.hooks.SessionStart ?? []).filter(
    (h) => !h.hooks?.some((hk) => hk.command?.includes("session-start")),
  );
  existing.push(hook);
  settings.hooks.SessionStart = existing;

  mkdirSync(claudeDir, { recursive: true });
  const tmpPath = settingsPath + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(settings, null, 2) + "\n");
  renameSync(tmpPath, settingsPath);
}

/**
 * Remove SessionStart hooks from settings.local.json, preserving everything else.
 */
export function cleanSessionStartHook(claudeDir: string): void {
  const settingsPath = resolve(claudeDir, "settings.local.json");
  if (!existsSync(settingsPath)) return;

  let settings: SettingsLocal;
  try {
    settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch {
    return;
  }

  if (!settings.hooks) return;

  if (settings.hooks.SessionStart) {
    delete settings.hooks.SessionStart;
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/session-start-settings.test.ts`
Expected: PASS — all tests green

- [ ] **Step 5: Commit**

```bash
git add cli/src/hooks/session-start-settings.ts cli/src/__tests__/session-start-settings.test.ts
git commit -m "feat(session-start-hook): add session-start settings builder"
```

---

### Task 2: Command Router Registration

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/commands/hooks.ts`
- Modify: `cli/src/__tests__/hooks-command.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `cli/src/__tests__/hooks-command.test.ts`:

```typescript
// Add mock for session-start hook module (after existing mocks, before imports)
vi.mock("../hooks/session-start.js", () => ({
  runSessionStart: vi.fn(() => '{"hookSpecificOutput":{"additionalContext":"test"}}'),
}));

// Add import after existing imports
import { runSessionStart } from "../hooks/session-start.js";
```

And add the test case inside the existing `describe("hooksCommand")` block:

```typescript
  test("session-start dispatches to runSessionStart", async () => {
    try {
      await hooksCommand(["session-start"]);
    } catch { /* exit mock */ }

    expect(runSessionStart).toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/hooks-command.test.ts`
Expected: FAIL — `session-start` is unknown hook

- [ ] **Step 3: Write the implementation**

Modify `cli/src/commands/hooks.ts`:

1. Add `session-start` to `VALID_HOOKS` array
2. Add import for the session-start hook module (placeholder — the actual hook core is in a different feature)
3. Add case in switch statement
4. Add `runSessionStart` handler function

The session-start hook differs from other hooks: it exits non-zero on missing inputs (fail-fast contract). The actual hook core function (`runSessionStart` in `hooks/session-start.ts`) is implemented by the "hook-core" feature. For this CLI integration feature, we wire the command router to call it. Since the core doesn't exist yet, we create a minimal stub that the hook-core feature will replace.

Updated `hooks.ts`:

```typescript
/**
 * `beastmode hooks <name> [phase]`
 *
 * Dispatch subcommand to hook handler functions.
 * Preserves existing hook protocol: phase as positional argv,
 * TOOL_INPUT and TOOL_OUTPUT as environment variables.
 *
 * Exits 0 always for hook handlers (hook failure must never block Claude).
 * Exception: session-start exits non-zero on missing inputs (fail-fast contract).
 * Exits 1 for unknown subcommands.
 */

import { execSync } from "node:child_process";
import { resolve, basename, dirname } from "node:path";
import { mkdirSync, appendFileSync, existsSync, statSync } from "node:fs";
import { loadConfig } from "../config.js";
import { getPhaseHitlProse } from "../hooks/hitl-settings.js";
import { decideResponse } from "../hooks/hitl-auto.js";
import { routeAndFormat } from "../hooks/hitl-log.js";
import { generateAll } from "../hooks/generate-output.js";

const VALID_HOOKS = ["hitl-auto", "hitl-log", "generate-output", "session-start"];

export async function hooksCommand(args: string[]): Promise<void> {
  const hookName = args[0];

  if (!hookName) {
    process.stderr.write("Usage: beastmode hooks <hitl-auto|hitl-log|generate-output|session-start> [phase]\n");
    process.exit(1);
  }

  if (!VALID_HOOKS.includes(hookName)) {
    process.stderr.write(`Unknown hook: ${hookName}\nValid hooks: ${VALID_HOOKS.join(", ")}\n`);
    process.exit(1);
  }

  // session-start has its own error handling — exits non-zero on failure
  if (hookName === "session-start") {
    runSessionStart();
    return;
  }

  try {
    switch (hookName) {
      case "hitl-auto":
        runHitlAuto(args.slice(1));
        break;
      case "hitl-log":
        runHitlLog(args.slice(1));
        break;
      case "generate-output":
        runGenerateOutput();
        break;
    }
  } catch {
    // Silent exit — hook failure must never block Claude
  }
  process.exit(0);
}

function runSessionStart(): void {
  // Read env vars set by the CLI before dispatch
  const phase = process.env.BEASTMODE_PHASE;
  const epic = process.env.BEASTMODE_EPIC;
  const slug = process.env.BEASTMODE_SLUG;

  if (!phase || !epic || !slug) {
    const missing = [
      !phase && "BEASTMODE_PHASE",
      !epic && "BEASTMODE_EPIC",
      !slug && "BEASTMODE_SLUG",
    ].filter(Boolean).join(", ");
    process.stderr.write(`session-start: missing required env vars: ${missing}\n`);
    process.exit(1);
  }

  // Output minimal valid SessionStart hook response
  // The hook-core feature will replace this with full context assembly
  const output = {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: `Phase: ${phase}, Epic: ${epic}, Slug: ${slug}`,
    },
  };
  process.stdout.write(JSON.stringify(output));
}

function runHitlAuto(args: string[]): void {
  const phase = args[0];
  if (!phase) return;

  const rawToolInput = process.env.TOOL_INPUT;
  if (!rawToolInput) return;

  const repoRoot = execSync("git rev-parse --show-toplevel", {
    encoding: "utf-8",
  }).trim();
  const config = loadConfig(repoRoot);
  const prose = getPhaseHitlProse(config.hitl, phase);

  const response = decideResponse(prose, rawToolInput);
  if (response) {
    process.stdout.write(response);
  }
}

function runHitlLog(args: string[]): void {
  const phase = args[0];
  if (!phase) return;

  const rawInput = process.env.TOOL_INPUT;
  const rawOutput = process.env.TOOL_OUTPUT;
  if (!rawInput || !rawOutput) return;

  const entry = routeAndFormat(rawInput, rawOutput);
  if (!entry) return;

  const repoRoot = execSync("git rev-parse --show-toplevel", {
    encoding: "utf-8",
  }).trim();
  const logPath = resolve(
    repoRoot,
    ".beastmode",
    "artifacts",
    phase,
    "hitl-log.md",
  );

  const logDir = dirname(logPath);
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  appendFileSync(logPath, entry + "\n");
}

function runGenerateOutput(): void {
  const repoRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
  const artifactsDir = resolve(repoRoot, ".beastmode", "artifacts");

  let isWorktree = false;
  try {
    const dotGit = resolve(repoRoot, ".git");
    isWorktree = statSync(dotGit).isFile();
  } catch {
    // not a worktree
  }
  const worktreeSlug = isWorktree ? basename(repoRoot) : undefined;
  generateAll(artifactsDir, isWorktree ? "changed" : "all", worktreeSlug);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/hooks-command.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/hooks.ts cli/src/__tests__/hooks-command.test.ts
git commit -m "feat(session-start-hook): register session-start in command router"
```

---

### Task 3: Pipeline Runner Wiring

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/pipeline/runner.ts`
- Modify: `cli/src/commands/phase.ts`

- [ ] **Step 1: Write the implementation for runner.ts**

Add imports at the top of `cli/src/pipeline/runner.ts` (after existing settings imports):

```typescript
import {
  writeSessionStartHook,
  cleanSessionStartHook,
  buildSessionStartHook,
} from "../hooks/session-start-settings.js";
```

In step 3 (`settings.create`), after the file-permission settings block (after line 165), add:

```typescript
    // Session-start hook
    cleanSessionStartHook(claudeDir);
    const sessionStartHook = buildSessionStartHook();
    writeSessionStartHook({ claudeDir, hook: sessionStartHook });
```

- [ ] **Step 2: Write the implementation for phase.ts**

Add imports at the top of `cli/src/commands/phase.ts` (after existing settings imports):

```typescript
import {
  writeSessionStartHook,
  cleanSessionStartHook,
  buildSessionStartHook,
} from "../hooks/session-start-settings";
```

In the cmux path (after line 100, after `writeFilePermissionSettings`), add:

```typescript
    // Session-start hook
    cleanSessionStartHook(claudeDir);
    const sessionStartHook = buildSessionStartHook();
    writeSessionStartHook({ claudeDir, hook: sessionStartHook });
```

- [ ] **Step 3: Run full test suite to verify no regressions**

Run: `cd cli && bun --bun vitest run`
Expected: PASS — all existing tests still green

- [ ] **Step 4: Commit**

```bash
git add cli/src/pipeline/runner.ts cli/src/commands/phase.ts
git commit -m "feat(session-start-hook): wire session-start settings into pipeline runner and phase command"
```

---

### Task 4: Environment Variable Setup

**Wave:** 2
**Depends on:** Task 2

**Files:**
- Modify: `cli/src/commands/hooks.ts` (already modified in Task 2 — this task adds env var documentation and verification)

This task is already handled by Task 2's implementation. The `runSessionStart()` function reads `BEASTMODE_PHASE`, `BEASTMODE_EPIC`, `BEASTMODE_SLUG`, and `BEASTMODE_FEATURE` from environment variables and exits non-zero if required vars are missing.

The env vars themselves are set by the hook-core feature's context assembly. For this CLI integration feature, the command router validates their presence and uses them.

- [ ] **Step 1: Add env var validation test to hooks-command.test.ts**

Add these tests inside the existing `describe("hooksCommand")` block in `cli/src/__tests__/hooks-command.test.ts`:

```typescript
  test("session-start exits non-zero when BEASTMODE_PHASE is missing", async () => {
    delete process.env.BEASTMODE_PHASE;
    delete process.env.BEASTMODE_EPIC;
    delete process.env.BEASTMODE_SLUG;

    try {
      await hooksCommand(["session-start"]);
    } catch { /* exit mock */ }

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("missing required env vars"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("session-start writes JSON to stdout when env vars present", async () => {
    process.env.BEASTMODE_PHASE = "design";
    process.env.BEASTMODE_EPIC = "test-epic";
    process.env.BEASTMODE_SLUG = "abc123";

    try {
      await hooksCommand(["session-start"]);
    } catch { /* exit mock */ }

    const output = stdoutSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.hookSpecificOutput.hookEventName).toBe("SessionStart");
    expect(parsed.hookSpecificOutput.additionalContext).toContain("design");
  });
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/hooks-command.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/hooks-command.test.ts
git commit -m "test(session-start-hook): add env var validation tests for session-start"
```

---

### Task 5: Mock Updates for Existing Tests

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/__tests__/reconciling-factory-cleanup.test.ts`
- Modify: `cli/src/__tests__/pipeline-runner.test.ts`

Tests that mock `../hooks/hitl-settings.js` or the pipeline runner may need session-start-settings mocks to avoid import failures.

- [ ] **Step 1: Add session-start-settings mock to reconciling-factory-cleanup.test.ts**

After the existing `vi.mock("../hooks/file-permission-settings.js")` block (around line 118), add:

```typescript
vi.mock("../hooks/session-start-settings.js", () => ({
  cleanSessionStartHook: vi.fn(() => {}),
  writeSessionStartHook: vi.fn(() => {}),
  buildSessionStartHook: vi.fn(() => ({ matcher: "", hooks: [{ type: "command", command: "test" }] })),
}));
```

- [ ] **Step 2: Add session-start-settings mock to pipeline-runner.test.ts if needed**

Check if `pipeline-runner.test.ts` mocks the hooks modules. If it does, add the same mock. If not, the import will resolve to the real module (which is fine since the functions are pure).

Run: `cd cli && bun --bun vitest run src/__tests__/reconciling-factory-cleanup.test.ts src/__tests__/pipeline-runner.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/reconciling-factory-cleanup.test.ts cli/src/__tests__/pipeline-runner.test.ts
git commit -m "test(session-start-hook): add session-start-settings mocks to existing tests"
```

---

### Task 6: Final Verification

**Wave:** 3
**Depends on:** Task 3, Task 4, Task 5

**Files:**
- All files from previous tasks (read-only verification)

- [ ] **Step 1: Run full test suite**

Run: `cd cli && bun --bun vitest run`
Expected: PASS — all tests green

- [ ] **Step 2: Run integration test (should be GREEN now)**

Run: `cd cli && bun --bun vitest run src/__tests__/cli-integration.integration.test.ts`
Expected: PASS — all 3 integration test scenarios green

- [ ] **Step 3: Verify settings output shape**

Run a manual check — create a temp settings file and verify the full hook structure:

```bash
cd cli && bun -e "
const { buildSessionStartHook, writeSessionStartHook } = require('./src/hooks/session-start-settings.ts');
const { writeHitlSettings, buildPreToolUseHook } = require('./src/hooks/hitl-settings.ts');
const { mkdtempSync, mkdirSync, readFileSync } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');
const tmp = mkdtempSync(join(tmpdir(), 'verify-'));
const cd = join(tmp, '.claude');
mkdirSync(cd, { recursive: true });
writeHitlSettings({ claudeDir: cd, preToolUseHook: buildPreToolUseHook('implement'), phase: 'implement' });
writeSessionStartHook({ claudeDir: cd, hook: buildSessionStartHook() });
console.log(readFileSync(join(cd, 'settings.local.json'), 'utf-8'));
"
```

Expected: JSON with `PreToolUse`, `PostToolUse`, `Stop`, and `SessionStart` keys all present.

- [ ] **Step 4: Commit (no changes expected — verification only)**

No commit needed. If verification reveals issues, fix them and commit the fix.
