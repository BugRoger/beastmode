# hooks-command Implementation Tasks

## Goal

Add a `beastmode hooks <name> [phase]` CLI subcommand that dispatches to hook handler functions, replacing direct script execution via absolute paths. Hook modules become pure library exports with no `import.meta.main` entry points.

## Architecture

- **Runtime:** Bun (TypeScript, no compilation step)
- **Test runner:** vitest (`bun --bun vitest run`)
- **CLI entry:** `cli/src/index.ts` — parseArgs + command switch
- **Args parser:** `cli/src/args.ts` — UTILITY_COMMANDS set + ALL_COMMANDS set
- **Types:** `cli/src/types.ts` — Command union type
- **Hook modules:** `cli/src/hooks/hitl-auto.ts`, `hitl-log.ts`, `generate-output.ts`
- **Settings builders:** `cli/src/hooks/hitl-settings.ts`, `file-permission-settings.ts`

## Architectural Decisions (from design)

- One CLI subcommand per hook: `beastmode hooks hitl-auto <phase>`, `beastmode hooks hitl-log <phase>`, `beastmode hooks generate-output`
- CLI invoked via `bunx beastmode` in settings.local.json — not bare `beastmode`
- Hook interface unchanged: phase as positional argv, TOOL_INPUT/TOOL_OUTPUT from env vars
- New file `cli/src/commands/hooks.ts` handles subcommand dispatch
- `hooks` added as utility command in args.ts alongside watch, status, cancel, etc.
- Remove `import.meta.main` blocks from all three hook modules
- Settings builders updated to emit `bunx beastmode hooks <name>` instead of `bun run "<absolute-path>"`
- `cleanHitlSettings` updated to match new command pattern (`bunx beastmode hooks generate-output` instead of `generate-output.ts`)

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/commands/hooks.ts` | Create | Dispatch subcommand to hook handler functions |
| `cli/src/__tests__/hooks-command.test.ts` | Create | Unit tests for hooks dispatch |
| `cli/src/types.ts` | Modify | Add "hooks" to Command type |
| `cli/src/args.ts` | Modify | Add "hooks" to UTILITY_COMMANDS |
| `cli/src/index.ts` | Modify | Wire hooks command into switch |
| `cli/src/hooks/hitl-auto.ts` | Modify | Remove `import.meta.main` block, export handler |
| `cli/src/hooks/hitl-log.ts` | Modify | Remove `import.meta.main` block, export handler |
| `cli/src/hooks/generate-output.ts` | Modify | Remove `import.meta.main` block, export handler |
| `cli/src/hooks/hitl-settings.ts` | Modify | Change build functions to emit `bunx beastmode hooks` commands |
| `cli/src/hooks/file-permission-settings.ts` | Modify | Change build function to emit `bunx beastmode hooks` commands |
| `cli/src/__tests__/hitl-settings.test.ts` | Modify | Update assertions for new command pattern |
| `cli/src/__tests__/file-permission-settings.test.ts` | Modify | Update assertions for new command pattern |

---

### Task 0: Integration Test (BDD)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/hooks-command.integration.test.ts`

- [ ] **Step 1: Write the integration test file**

```typescript
import { describe, test, expect } from "vitest";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const CLI_PATH = resolve(import.meta.dirname, "../../src/index.ts");

/**
 * Integration tests for `beastmode hooks` subcommand.
 * Validates the full CLI dispatch path from argv to hook handler.
 */
describe("hooks-command integration", () => {
  describe("hooks hitl-auto dispatches to handler", () => {
    test("hitl-auto with phase and TOOL_INPUT produces JSON response", () => {
      const toolInput = JSON.stringify({
        questions: [{ question: "Approve?", options: [{ label: "Yes" }] }],
      });

      // We need a config with HITL prose that auto-answers
      // Create a minimal .beastmode/config.yaml in a temp dir
      const { mkdtempSync, writeFileSync, mkdirSync } = require("node:fs");
      const { join } = require("node:path");
      const { tmpdir } = require("node:os");

      const tempDir = mkdtempSync(join(tmpdir(), "hooks-int-"));
      mkdirSync(join(tempDir, ".beastmode"), { recursive: true });
      writeFileSync(
        join(tempDir, ".beastmode", "config.yaml"),
        "hitl:\n  implement: 'approve all tool calls without asking'\n",
      );

      const result = execSync(
        `bun run "${CLI_PATH}" hooks hitl-auto implement`,
        {
          encoding: "utf-8",
          cwd: tempDir,
          env: { ...process.env, TOOL_INPUT: toolInput },
        },
      );

      const parsed = JSON.parse(result.trim());
      expect(parsed.permissionDecision).toBe("allow");
      expect(parsed.updatedInput).toBeDefined();
    });
  });

  describe("hooks hitl-log dispatches to handler", () => {
    test("hitl-log with phase and env vars exits cleanly", () => {
      const toolInput = JSON.stringify({
        questions: [{ question: "Which DB?", options: [{ label: "Postgres" }] }],
        answers: { "Which DB?": "Postgres" },
      });
      const toolOutput = JSON.stringify({
        answers: { "Which DB?": "Postgres" },
      });

      const { mkdtempSync, writeFileSync, mkdirSync, existsSync } = require("node:fs");
      const { join } = require("node:path");
      const { tmpdir } = require("node:os");

      const tempDir = mkdtempSync(join(tmpdir(), "hooks-int-"));
      mkdirSync(join(tempDir, ".beastmode"), { recursive: true });
      writeFileSync(
        join(tempDir, ".beastmode", "config.yaml"),
        "hitl:\n  design: 'always defer to human'\n",
      );

      // hitl-log uses git rev-parse, so we need a git repo
      execSync("git init", { cwd: tempDir, encoding: "utf-8" });

      execSync(
        `bun run "${CLI_PATH}" hooks hitl-log design`,
        {
          encoding: "utf-8",
          cwd: tempDir,
          env: { ...process.env, TOOL_INPUT: toolInput, TOOL_OUTPUT: toolOutput },
        },
      );

      // Verify log file was created
      const logPath = join(tempDir, ".beastmode", "artifacts", "design", "hitl-log.md");
      expect(existsSync(logPath)).toBe(true);
    });
  });

  describe("hooks generate-output dispatches to handler", () => {
    test("generate-output exits cleanly", () => {
      const { mkdtempSync, writeFileSync, mkdirSync } = require("node:fs");
      const { join } = require("node:path");
      const { tmpdir } = require("node:os");

      const tempDir = mkdtempSync(join(tmpdir(), "hooks-int-"));
      mkdirSync(join(tempDir, ".beastmode"), { recursive: true });
      writeFileSync(
        join(tempDir, ".beastmode", "config.yaml"),
        "hitl:\n  design: 'always defer to human'\n",
      );

      execSync("git init", { cwd: tempDir, encoding: "utf-8" });

      // Should not throw
      execSync(
        `bun run "${CLI_PATH}" hooks generate-output`,
        {
          encoding: "utf-8",
          cwd: tempDir,
          env: { ...process.env },
        },
      );
    });
  });

  describe("hooks command rejects unknown subcommands", () => {
    test("unknown subcommand exits non-zero", () => {
      const { mkdtempSync, writeFileSync, mkdirSync } = require("node:fs");
      const { join } = require("node:path");
      const { tmpdir } = require("node:os");

      const tempDir = mkdtempSync(join(tmpdir(), "hooks-int-"));
      mkdirSync(join(tempDir, ".beastmode"), { recursive: true });
      writeFileSync(
        join(tempDir, ".beastmode", "config.yaml"),
        "hitl:\n  design: 'always defer to human'\n",
      );

      expect(() => {
        execSync(
          `bun run "${CLI_PATH}" hooks nonexistent`,
          {
            encoding: "utf-8",
            cwd: tempDir,
            env: { ...process.env },
          },
        );
      }).toThrow();
    });
  });

  describe("hooks command preserves env vars", () => {
    test("TOOL_INPUT is accessible to hitl-auto handler", () => {
      const toolInput = JSON.stringify({
        questions: [{ question: "Test?", options: [{ label: "Yes" }] }],
      });

      const { mkdtempSync, writeFileSync, mkdirSync } = require("node:fs");
      const { join } = require("node:path");
      const { tmpdir } = require("node:os");

      const tempDir = mkdtempSync(join(tmpdir(), "hooks-int-"));
      mkdirSync(join(tempDir, ".beastmode"), { recursive: true });
      writeFileSync(
        join(tempDir, ".beastmode", "config.yaml"),
        "hitl:\n  plan: 'auto-approve everything'\n",
      );

      const result = execSync(
        `bun run "${CLI_PATH}" hooks hitl-auto plan`,
        {
          encoding: "utf-8",
          cwd: tempDir,
          env: { ...process.env, TOOL_INPUT: toolInput },
        },
      );

      const parsed = JSON.parse(result.trim());
      expect(parsed.updatedInput.questions[0].question).toBe("Test?");
    });
  });

  describe("hook modules have no standalone entry points", () => {
    test("hitl-auto.ts has no import.meta.main block", () => {
      const src = readFileSync(
        resolve(import.meta.dirname, "../../src/hooks/hitl-auto.ts"),
        "utf-8",
      );
      expect(src).not.toContain("import.meta.main");
    });

    test("hitl-log.ts has no import.meta.main block", () => {
      const src = readFileSync(
        resolve(import.meta.dirname, "../../src/hooks/hitl-log.ts"),
        "utf-8",
      );
      expect(src).not.toContain("import.meta.main");
    });

    test("generate-output.ts has no import.meta.main block", () => {
      const src = readFileSync(
        resolve(import.meta.dirname, "../../src/hooks/generate-output.ts"),
        "utf-8",
      );
      expect(src).not.toContain("import.meta.main");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/hooks-command.integration.test.ts 2>&1 | tail -30`
Expected: FAIL — "hooks" is not a recognized command yet

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/hooks-command.integration.test.ts
git commit -m "test(hooks-command): add integration test (RED)"
```

---

### Task 1: Create hooks dispatch command module

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/src/commands/hooks.ts`
- Create: `cli/src/__tests__/hooks-command.test.ts`

- [ ] **Step 1: Write the failing unit test**

```typescript
import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock the hook modules to verify dispatch without side effects
vi.mock("../hooks/hitl-auto.js", () => ({
  decideResponse: vi.fn(() => '{"permissionDecision":"allow","updatedInput":{}}'),
}));

vi.mock("../hooks/hitl-log.js", () => ({
  routeAndFormat: vi.fn(() => "## 2026-01-01\n**Tag:** auto\n"),
}));

vi.mock("../hooks/generate-output.js", () => ({
  generateAll: vi.fn(() => 0),
}));

vi.mock("../config.js", () => ({
  loadConfig: vi.fn(() => ({
    hitl: { implement: "approve all" },
    github: { enabled: false },
    "file-permissions": {},
  })),
}));

vi.mock("../hooks/hitl-settings.js", () => ({
  getPhaseHitlProse: vi.fn(() => "approve all"),
}));

import { hooksCommand } from "../commands/hooks";
import { decideResponse } from "../hooks/hitl-auto.js";
import { routeAndFormat } from "../hooks/hitl-log.js";
import { generateAll } from "../hooks/generate-output.js";

describe("hooksCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("hitl-auto dispatches to decideResponse", async () => {
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });

    try {
      await hooksCommand(["hitl-auto", "implement"]);
    } catch { /* exit mock */ }

    expect(decideResponse).toHaveBeenCalled();
    writeSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("hitl-log dispatches to routeAndFormat", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });

    try {
      await hooksCommand(["hitl-log", "design"]);
    } catch { /* exit mock */ }

    expect(routeAndFormat).toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  test("generate-output dispatches to generateAll", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });

    try {
      await hooksCommand(["generate-output"]);
    } catch { /* exit mock */ }

    expect(generateAll).toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  test("unknown subcommand writes error and exits 1", async () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });

    try {
      await hooksCommand(["nonexistent"]);
    } catch { /* exit mock */ }

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("Unknown hook"));
    expect(exitSpy).toHaveBeenCalledWith(1);
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("missing subcommand writes error and exits 1", async () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });

    try {
      await hooksCommand([]);
    } catch { /* exit mock */ }

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("Usage"));
    expect(exitSpy).toHaveBeenCalledWith(1);
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/hooks-command.test.ts 2>&1 | tail -20`
Expected: FAIL — cannot resolve `../commands/hooks`

- [ ] **Step 3: Write the hooks command module**

Create `cli/src/commands/hooks.ts`:

```typescript
/**
 * `beastmode hooks <name> [phase]`
 *
 * Dispatch subcommand to hook handler functions.
 * Preserves existing hook protocol: phase as positional argv,
 * TOOL_INPUT and TOOL_OUTPUT as environment variables.
 *
 * Exits 0 always for hook handlers (hook failure must never block Claude).
 * Exits 1 for unknown subcommands.
 */

import { execSync } from "node:child_process";
import { resolve, basename } from "node:path";
import { mkdirSync, appendFileSync, existsSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { loadConfig } from "../config.js";
import { getPhaseHitlProse } from "../hooks/hitl-settings.js";
import { decideResponse } from "../hooks/hitl-auto.js";
import { routeAndFormat } from "../hooks/hitl-log.js";
import { generateAll } from "../hooks/generate-output.js";

const VALID_HOOKS = ["hitl-auto", "hitl-log", "generate-output"];

export async function hooksCommand(args: string[]): Promise<void> {
  const hookName = args[0];

  if (!hookName) {
    process.stderr.write("Usage: beastmode hooks <hitl-auto|hitl-log|generate-output> [phase]\n");
    process.exit(1);
  }

  if (!VALID_HOOKS.includes(hookName)) {
    process.stderr.write(`Unknown hook: ${hookName}\nValid hooks: ${VALID_HOOKS.join(", ")}\n`);
    process.exit(1);
  }

  try {
    switch (hookName) {
      case "hitl-auto":
        await runHitlAuto(args.slice(1));
        break;
      case "hitl-log":
        await runHitlLog(args.slice(1));
        break;
      case "generate-output":
        await runGenerateOutput();
        break;
    }
  } catch {
    // Silent exit — hook failure must never block Claude
  }
  process.exit(0);
}

async function runHitlAuto(args: string[]): Promise<void> {
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

async function runHitlLog(args: string[]): Promise<void> {
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

async function runGenerateOutput(): Promise<void> {
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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/hooks-command.test.ts 2>&1 | tail -20`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/hooks.ts cli/src/__tests__/hooks-command.test.ts
git commit -m "feat(hooks-command): add hooks dispatch command module"
```

---

### Task 2: Wire hooks into CLI entry point

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/types.ts:9`
- Modify: `cli/src/args.ts:4`
- Modify: `cli/src/index.ts:10,28,63-79`

- [ ] **Step 1: Write the failing test**

The integration test from Task 0 already covers this. Verify by running it — it should fail because "hooks" isn't a recognized command yet.

Run: `cd cli && bun --bun vitest run src/__tests__/hooks-command.integration.test.ts 2>&1 | tail -30`
Expected: FAIL — "Unknown command: hooks"

- [ ] **Step 2: Add "hooks" to Command type in types.ts**

In `cli/src/types.ts`, line 9, change:

```typescript
export type Command = Phase | "watch" | "status" | "cancel" | "compact" | "dashboard" | "store" | "help";
```

to:

```typescript
export type Command = Phase | "watch" | "status" | "cancel" | "compact" | "dashboard" | "store" | "hooks" | "help";
```

- [ ] **Step 3: Add "hooks" to UTILITY_COMMANDS in args.ts**

In `cli/src/args.ts`, line 4, change:

```typescript
const UTILITY_COMMANDS = new Set(["watch", "status", "cancel", "compact", "dashboard", "store", "help"]);
```

to:

```typescript
const UTILITY_COMMANDS = new Set(["watch", "status", "cancel", "compact", "dashboard", "store", "hooks", "help"]);
```

- [ ] **Step 4: Wire hooks command into index.ts**

In `cli/src/index.ts`:

Add import after line 10:
```typescript
import { hooksCommand } from "./commands/hooks";
```

Add help line after line 27:
```typescript
  beastmode hooks <name> [phase]       Run a hook handler
```

Add case in the switch before `"help"` (around line 76):
```typescript
    case "hooks":
      await hooksCommand(args);
      break;
```

- [ ] **Step 5: Run unit tests to verify existing tests pass**

Run: `cd cli && bun --bun vitest run src/__tests__/hooks-command.test.ts 2>&1 | tail -20`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add cli/src/types.ts cli/src/args.ts cli/src/index.ts
git commit -m "feat(hooks-command): wire hooks into CLI entry point"
```

---

### Task 3: Remove import.meta.main blocks from hook modules

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Modify: `cli/src/hooks/hitl-auto.ts:1,13,57-85`
- Modify: `cli/src/hooks/hitl-log.ts:1,16,201-245`
- Modify: `cli/src/hooks/generate-output.ts:1,18,319-340`

- [ ] **Step 1: Write the failing test**

The integration test Task 0 already has tests for "no import.meta.main block". These should currently pass incorrectly since the blocks still exist. We'll remove them and verify the integration test still passes end-to-end after removal.

First, verify the module-check tests currently fail (they should fail because import.meta.main blocks still exist):

Run: `cd cli && bun --bun vitest run src/__tests__/hooks-command.integration.test.ts -t "no standalone" 2>&1 | tail -20`
Expected: FAIL — modules still contain `import.meta.main`

- [ ] **Step 2: Remove import.meta.main block from hitl-auto.ts**

In `cli/src/hooks/hitl-auto.ts`:

1. Remove the shebang line (`#!/usr/bin/env bun` — line 1)
2. Remove the `execSync` import (line 13: `import { execSync } from "node:child_process";`)
3. Remove the `loadConfig` import (line 14: `import { loadConfig } from "../config.js";`)
4. Remove the `getPhaseHitlProse` import (line 15: `import { getPhaseHitlProse } from "./hitl-settings.js";`)
5. Remove the entire `if (import.meta.main)` block (lines 57-85) and the `// --- CLI entry point ---` comment (line 57)

The file should end after the `decideResponse` function (line 55).

- [ ] **Step 3: Remove import.meta.main block from hitl-log.ts**

In `cli/src/hooks/hitl-log.ts`:

1. Remove the shebang line (`#!/usr/bin/env bun` — line 1)
2. Remove unused imports from line 14-16:
   - `mkdirSync, appendFileSync, existsSync` from "node:fs" (line 14)
   - `resolve, dirname` from "node:path" (line 15)
   - `execSync` from "node:child_process" (line 16)
3. Remove the entire `// --- CLI entry point ---` comment and `if (import.meta.main)` block (lines 201-245)

The file should end after the `routeAndFormat` function (line 199).

- [ ] **Step 4: Remove import.meta.main block from generate-output.ts**

In `cli/src/hooks/generate-output.ts`:

1. Remove the shebang line (`#!/usr/bin/env bun` — line 1)
2. Remove the `execSync` import from line 18 (`import { execSync } from "node:child_process";`)
3. Remove `basename` from the path import on line 17 (keep `resolve`, `join`)
4. Remove `statSync` from the fs import on line 16 (keep `readdirSync, readFileSync, writeFileSync, renameSync, existsSync`)
5. Remove the entire `// --- CLI entry point ---` comment and `if (import.meta.main)` block (lines 319-340)

The file should end after the `generateChanged` function (line 317).

Note: `execSync` is still used in `generateChanged` (line 286, 291), so check if it's imported elsewhere. Looking at the code — `generateChanged` uses `execSync` directly, so the import at line 18 is still needed. DO NOT remove `execSync` import.

Similarly, `basename` is used in `scanPlanFeatures` (line 169), so keep it. And `statSync` is used in `processArtifact` (lines 218-219), so keep it.

Actually, re-checking: the only things to remove are:
1. The shebang line (line 1)
2. The `if (import.meta.main)` block and its comment (lines 319-340)

All imports stay because they're used by the exported functions.

- [ ] **Step 5: Run the module-check tests**

Run: `cd cli && bun --bun vitest run src/__tests__/hooks-command.integration.test.ts -t "no standalone" 2>&1 | tail -20`
Expected: PASS — no modules contain `import.meta.main`

- [ ] **Step 6: Run existing unit tests to verify no regressions**

Run: `cd cli && bun --bun vitest run src/__tests__/hitl-auto.test.ts src/__tests__/hitl-log.test.ts src/__tests__/generate-output.test.ts 2>&1 | tail -30`
Expected: PASS — existing tests for core logic still pass

- [ ] **Step 7: Commit**

```bash
git add cli/src/hooks/hitl-auto.ts cli/src/hooks/hitl-log.ts cli/src/hooks/generate-output.ts
git commit -m "refactor(hooks-command): remove import.meta.main from hook modules"
```

---

### Task 4: Update settings builders to emit bunx commands

**Wave:** 4
**Depends on:** Task 3

**Files:**
- Modify: `cli/src/hooks/hitl-settings.ts:188-199,205-216,226-237,152-158`
- Modify: `cli/src/hooks/file-permission-settings.ts:136-147`
- Modify: `cli/src/__tests__/hitl-settings.test.ts:87-88,103,130,188-199,218`
- Modify: `cli/src/__tests__/file-permission-settings.test.ts:103-104,111-113`

- [ ] **Step 1: Write the failing test updates**

Update `cli/src/__tests__/hitl-settings.test.ts`:

Line 87-88 — PostToolUse hook assertion:
```typescript
    expect(hooks.PostToolUse[0].hooks[0].command).toContain("bunx beastmode hooks hitl-log");
    expect(hooks.PostToolUse[0].hooks[0].command).toContain("validate");
```

Line 103 — Stop hook assertion:
```typescript
    expect(hooks.Stop[0].hooks[0].command).toBe("bunx beastmode hooks generate-output");
```

Line 130 — Re-write PostToolUse latest phase:
```typescript
    expect(hooks.PostToolUse[0].hooks[0].command).toContain("plan");
```
(This one stays the same — it just checks the phase is present.)

Lines 187-199 — absolute path test replaced with CLI command test:
```typescript
  test("hook commands use bunx beastmode hooks pattern", () => {
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

Line 218 — cleanHitlSettings Stop hook filter (the test data uses the old command format, update it):
In the `cleanHitlSettings` "removes HITL hooks" test (line 204-229), update the Stop hook fixture:
```typescript
          Stop: [
            { matcher: "", hooks: [{ type: "command", command: "bunx beastmode hooks generate-output" }] },
          ],
```

Update `cli/src/__tests__/file-permission-settings.test.ts`:

Lines 99-105 — PostToolUse assertions:
```typescript
  test("each hook is a command type calling hitl-log with phase", () => {
    const hooks = buildFilePermissionPostToolUseHooks("validate");
    for (const hook of hooks) {
      expect(hook.hooks[0].type).toBe("command");
      expect(hook.hooks[0].command).toBe("bunx beastmode hooks hitl-log validate");
    }
  });
```

Lines 108-115 — absolute path test replaced:
```typescript
  test("hook commands use bunx beastmode hooks pattern", () => {
    const hooks = buildFilePermissionPostToolUseHooks("implement");
    for (const hook of hooks) {
      const cmd = hook.hooks[0].command as string;
      expect(cmd).toBe("bunx beastmode hooks hitl-log implement");
    }
  });
```

- [ ] **Step 2: Run updated tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/hitl-settings.test.ts src/__tests__/file-permission-settings.test.ts 2>&1 | tail -30`
Expected: FAIL — builders still emit `bun run "<absolute-path>"`

- [ ] **Step 3: Update hitl-settings.ts builder functions**

In `cli/src/hooks/hitl-settings.ts`:

Change `buildPostToolUseHook` (lines 188-199):
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

Change `buildStopHook` (lines 205-216):
```typescript
function buildStopHook(): HookEntry {
  return {
    matcher: "",
    hooks: [
      {
        type: "command",
        command: "bunx beastmode hooks generate-output",
      },
    ],
  };
}
```

Change `buildPreToolUseHook` (lines 226-237):
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

Remove the `import { resolve } from "node:path";` import (line 11) since it's no longer needed by the build functions. Check: `resolve` is used in `writeHitlSettings` (line 70: `resolve(claudeDir, "settings.local.json")`). So keep it.

Update `cleanHitlSettings` Stop hook filter (lines 153-155):
```typescript
    settings.hooks.Stop = settings.hooks.Stop.filter(
      (h) => !h.hooks?.some((hk) => hk.command?.includes("beastmode hooks generate-output")),
    );
```

- [ ] **Step 4: Update file-permission-settings.ts builder function**

In `cli/src/hooks/file-permission-settings.ts`:

Change `buildFilePermissionPostToolUseHooks` (lines 136-147):
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

Remove the `import { resolve } from "node:path";` import (line 11) since it's no longer needed by this function. Check: `resolve` is used in `writeFilePermissionSettings` (line 159) and `cleanFilePermissionSettings` (line 200). So keep it.

- [ ] **Step 5: Run updated tests**

Run: `cd cli && bun --bun vitest run src/__tests__/hitl-settings.test.ts src/__tests__/file-permission-settings.test.ts 2>&1 | tail -30`
Expected: PASS

- [ ] **Step 6: Run the full test suite**

Run: `cd cli && bun --bun vitest run 2>&1 | tail -30`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add cli/src/hooks/hitl-settings.ts cli/src/hooks/file-permission-settings.ts cli/src/__tests__/hitl-settings.test.ts cli/src/__tests__/file-permission-settings.test.ts
git commit -m "feat(hooks-command): update settings builders to emit bunx commands"
```
