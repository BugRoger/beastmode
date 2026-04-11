# Session-Stop Rename — Tasks

## Goal

Rename `generate-output` hook to `session-stop` for naming symmetry with `session-start`. Replace worktree-based slug inference with `BEASTMODE_EPIC_SLUG` env var reading.

## Architecture

- **Runtime:** Bun + TypeScript
- **Test framework:** vitest (`bun --bun vitest run`)
- **BDD:** Cucumber with `@cucumber/cucumber`
- **Hook protocol:** Claude Code settings.local.json hooks (PreToolUse, PostToolUse, Stop, SessionStart)

## Constraints (from design)

- `parseFrontmatter`, `buildOutput`, `scanPlanFeatures`, `processArtifact` retain their names — they describe what they do
- `generateAll` renames to `runSessionStop`
- If `BEASTMODE_EPIC_SLUG` is missing, exit with error (fail-fast, matching session-start behavior)
- `scope: "changed"` behavior remains unchanged
- No YAML frontmatter in this file

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `cli/src/hooks/generate-output.ts` | Rename to `session-stop.ts` | Core hook logic |
| `cli/src/hooks/session-stop.ts` | Create (rename target) | Renamed hook with env var slug |
| `cli/src/commands/hooks.ts` | Modify | Import path, VALID_HOOKS, case handler, usage string |
| `cli/src/hooks/hitl-settings.ts` | Modify | `buildStopHook` command string, `cleanHitlSettings` filter |
| `cli/src/hooks/session-start.ts` | Modify | Import path for `parseFrontmatter` |
| `cli/src/__tests__/generate-output.test.ts` | Modify (rename to session-stop.test.ts) | Import path update |
| `cli/src/__tests__/hooks-command.test.ts` | Modify | Mock path, import path, test description |
| `cli/src/__tests__/hooks-command.integration.test.ts` | Modify | CLI invocations, test descriptions, file path reference |
| `cli/src/__tests__/hitl-settings.test.ts` | Modify | Assertion strings from `generate-output` to `session-stop` |
| `cli/features/portable-settings.feature` | Modify | Expected Stop hook command string |
| `cli/features/support/world.ts` | Modify | Import path for `generateAll` → `runSessionStop` |
| `cli/features/step_definitions/output-path-sanitization.steps.ts` | Modify | Import path |

---

## Task 0: Integration Test (BDD)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/session-stop-rename.integration.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
import { describe, test, expect } from "vitest";
import { execSync } from "node:child_process";
import { resolve, join } from "node:path";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

const CLI_PATH = resolve(import.meta.dirname, "../../src/index.ts");

function makeTempProjectWithGit(): string {
  const tempDir = mkdtempSync(join(tmpdir(), "session-stop-int-"));
  mkdirSync(join(tempDir, ".beastmode"), { recursive: true });
  writeFileSync(
    join(tempDir, ".beastmode", "config.yaml"),
    `hitl:\n  design: 'always defer to human'\n`,
  );
  execSync("git init", { cwd: tempDir, encoding: "utf-8" });
  return tempDir;
}

describe("session-stop-rename integration", () => {
  test("session-stop subcommand is recognized by the hook dispatcher", () => {
    const tempDir = makeTempProjectWithGit();
    // Should not throw — session-stop is a valid hook
    execSync(
      `BEASTMODE_EPIC_SLUG=test-epic bun run "${CLI_PATH}" hooks session-stop`,
      { encoding: "utf-8", cwd: tempDir, env: { ...process.env, BEASTMODE_EPIC_SLUG: "test-epic" } },
    );
  });

  test("session-stop reads epic slug from BEASTMODE_EPIC_SLUG env var", () => {
    const tempDir = makeTempProjectWithGit();
    const artifactsDir = join(tempDir, ".beastmode", "artifacts");
    mkdirSync(join(artifactsDir, "design"), { recursive: true });
    writeFileSync(
      join(artifactsDir, "design", "2026-04-11-my-epic.md"),
      "---\nphase: design\nslug: my-epic\nepic: my-epic\n---\n# Design\n",
    );
    // Commit so git diff works
    execSync("git add . && git commit -m init", { cwd: tempDir, encoding: "utf-8" });

    execSync(
      `bun run "${CLI_PATH}" hooks session-stop`,
      { encoding: "utf-8", cwd: tempDir, env: { ...process.env, BEASTMODE_EPIC_SLUG: "my-epic" } },
    );

    // Output should be derived from "my-epic" slug
    const outputPath = join(artifactsDir, "design", "2026-04-11-my-epic.output.json");
    const output = JSON.parse(readFileSync(outputPath, "utf-8"));
    expect(output.status).toBe("completed");
  });

  test("session-stop exits non-zero when BEASTMODE_EPIC_SLUG is missing", () => {
    const tempDir = makeTempProjectWithGit();
    expect(() => {
      execSync(
        `bun run "${CLI_PATH}" hooks session-stop`,
        {
          encoding: "utf-8",
          cwd: tempDir,
          env: { ...process.env, BEASTMODE_EPIC_SLUG: undefined },
        },
      );
    }).toThrow();
  });

  test("generate-output subcommand is no longer recognized", () => {
    const tempDir = makeTempProjectWithGit();
    expect(() => {
      execSync(
        `bun run "${CLI_PATH}" hooks generate-output`,
        { encoding: "utf-8", cwd: tempDir, env: { ...process.env } },
      );
    }).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/session-stop-rename.integration.test.ts 2>&1 | tail -30`
Expected: FAIL — `session-stop` is not yet a valid hook subcommand

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/session-stop-rename.integration.test.ts
git commit -m "test(session-stop-rename): add integration test (RED)"
```

---

## Task 1: Rename Module File and Update Exports

**Wave:** 1
**Depends on:** -

**Files:**
- Rename: `cli/src/hooks/generate-output.ts` → `cli/src/hooks/session-stop.ts`
- Modify: `cli/src/hooks/session-stop.ts` (rename `generateAll` to `runSessionStop`, add env var slug reading, remove isWorktree inference from callers)

- [ ] **Step 1: Write test updates for generate-output.test.ts → session-stop.test.ts**

Rename `cli/src/__tests__/generate-output.test.ts` to `cli/src/__tests__/session-stop.test.ts` and update the import:

Change line 10 from:
```typescript
} from "../hooks/generate-output";
```
to:
```typescript
  runSessionStop,
} from "../hooks/session-stop";
```

Add a new test at the end of the `generateAll` describe block (rename the describe to `runSessionStop`):

```typescript
describe("runSessionStop", () => {
  // ... existing tests with generateAll renamed to runSessionStop ...

  test("returns 0 when artifacts dir does not exist", () => {
    rmSync(TEST_ROOT, { recursive: true });
    expect(runSessionStop(ARTIFACTS_DIR)).toBe(0);
  });
});
```

- [ ] **Step 2: Rename the source file**

```bash
cd cli
git mv src/hooks/generate-output.ts src/hooks/session-stop.ts
git mv src/__tests__/generate-output.test.ts src/__tests__/session-stop.test.ts
```

- [ ] **Step 3: Update session-stop.ts — rename generateAll to runSessionStop**

In `cli/src/hooks/session-stop.ts`:

1. Update the file header comment: replace "generate-output.ts" with "session-stop.ts" and "Replaces generate-output-json.sh" with "Stop hook that reads artifact frontmatter"
2. Rename `export function generateAll(` to `export function runSessionStop(`
3. In `generateChanged`, update the fallback call from `generateAll(artifactsDir, "all", worktreeSlug)` to `runSessionStop(artifactsDir, "all", worktreeSlug)`

- [ ] **Step 4: Update test file imports**

In `cli/src/__tests__/session-stop.test.ts`:
1. Change the import path from `"../hooks/generate-output"` to `"../hooks/session-stop"`
2. Add `runSessionStop` to the import list
3. Rename all references from `generateAll` to `runSessionStop` in test code (describe block name and function calls)

- [ ] **Step 5: Run the unit tests**

Run: `cd cli && bun --bun vitest run src/__tests__/session-stop.test.ts 2>&1 | tail -30`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(session-stop-rename): rename generate-output.ts to session-stop.ts, generateAll to runSessionStop"
```

---

## Task 2: Update Hook Dispatcher and VALID_HOOKS

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/commands/hooks.ts`
- Modify: `cli/src/__tests__/hooks-command.test.ts`
- Modify: `cli/src/__tests__/hooks-command.integration.test.ts`

- [ ] **Step 1: Update hooks.ts**

In `cli/src/commands/hooks.ts`:

1. Change import (line 20) from:
   ```typescript
   import { generateAll } from "../hooks/generate-output.js";
   ```
   to:
   ```typescript
   import { runSessionStop } from "../hooks/session-stop.js";
   ```

2. Change VALID_HOOKS (line 23) from:
   ```typescript
   const VALID_HOOKS = ["hitl-auto", "hitl-log", "generate-output", "session-start"];
   ```
   to:
   ```typescript
   const VALID_HOOKS = ["hitl-auto", "hitl-log", "session-stop", "session-start"];
   ```

3. Change usage message (line 29) from:
   ```typescript
   process.stderr.write("Usage: beastmode hooks <hitl-auto|hitl-log|generate-output|session-start> [phase]\n");
   ```
   to:
   ```typescript
   process.stderr.write("Usage: beastmode hooks <hitl-auto|hitl-log|session-stop|session-start> [phase]\n");
   ```

4. Change the case handler (lines 61-63) from:
   ```typescript
   case "generate-output":
     runGenerateOutput();
     break;
   ```
   to:
   ```typescript
   case "session-stop":
     runSessionStopHandler();
     break;
   ```

5. Rename `runGenerateOutput` function (line 120) to `runSessionStopHandler` and update its body:

   Replace the entire function with:
   ```typescript
   function runSessionStopHandler(): void {
     const epicSlug = process.env.BEASTMODE_EPIC_SLUG;
     if (!epicSlug) {
       process.stderr.write("session-stop hook failed: Missing environment variable: BEASTMODE_EPIC_SLUG\n");
       process.exit(1);
     }

     const repoRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
     const artifactsDir = resolve(repoRoot, ".beastmode", "artifacts");
     runSessionStop(artifactsDir, "changed", epicSlug);
   }
   ```

   Note: This removes the `isWorktree` detection and `basename(repoRoot)` inference. The slug always comes from the env var now. It also always uses "changed" scope since the env var implies a worktree context.

- [ ] **Step 2: Update hooks-command.test.ts**

1. Change the mock (line 12) from:
   ```typescript
   vi.mock("../hooks/generate-output.js", () => ({
     generateAll: vi.fn(() => 0),
   }));
   ```
   to:
   ```typescript
   vi.mock("../hooks/session-stop.js", () => ({
     runSessionStop: vi.fn(() => 0),
   }));
   ```

2. Change the import (line 62) from:
   ```typescript
   import { generateAll } from "../hooks/generate-output.js";
   ```
   to:
   ```typescript
   import { runSessionStop } from "../hooks/session-stop.js";
   ```

3. Change the test (lines 105-111) from:
   ```typescript
   test("generate-output dispatches to generateAll", async () => {
     try {
       await hooksCommand(["generate-output"]);
     } catch { /* exit mock */ }

     expect(generateAll).toHaveBeenCalled();
   });
   ```
   to:
   ```typescript
   test("session-stop dispatches to runSessionStop", async () => {
     process.env.BEASTMODE_EPIC_SLUG = "test-epic";
     try {
       await hooksCommand(["session-stop"]);
     } catch { /* exit mock */ }

     expect(runSessionStop).toHaveBeenCalled();
     delete process.env.BEASTMODE_EPIC_SLUG;
   });
   ```

4. Add cleanup of `BEASTMODE_EPIC_SLUG` to the afterEach block.

- [ ] **Step 3: Update hooks-command.integration.test.ts**

1. Change the describe and test at lines 76-88 from `"hooks generate-output dispatches to handler"` to `"hooks session-stop dispatches to handler"` and update the CLI invocation from `hooks generate-output` to `hooks session-stop`, passing `BEASTMODE_EPIC_SLUG` env var:
   ```typescript
   describe("hooks session-stop dispatches to handler", () => {
     test("session-stop exits cleanly with BEASTMODE_EPIC_SLUG set", () => {
       const tempDir = makeTempProjectWithGit();
       execSync(
         `bun run "${CLI_PATH}" hooks session-stop`,
         {
           encoding: "utf-8",
           cwd: tempDir,
           env: { ...process.env, BEASTMODE_EPIC_SLUG: "test-epic" },
         },
       );
     });
   });
   ```

2. Change the test at lines 147-153 from `"generate-output.ts has no import.meta.main block"` to `"session-stop.ts has no import.meta.main block"` and update the file path:
   ```typescript
   test("session-stop.ts has no import.meta.main block", () => {
     const src = readFileSync(
       resolve(import.meta.dirname, "../../src/hooks/session-stop.ts"),
       "utf-8",
     );
     expect(src).not.toContain("import.meta.main");
   });
   ```

- [ ] **Step 4: Run unit tests**

Run: `cd cli && bun --bun vitest run src/__tests__/hooks-command.test.ts 2>&1 | tail -30`
Expected: PASS

- [ ] **Step 5: Run integration tests**

Run: `cd cli && bun --bun vitest run src/__tests__/hooks-command.integration.test.ts 2>&1 | tail -30`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(session-stop-rename): update hook dispatcher, VALID_HOOKS, and command tests"
```

---

## Task 3: Update HITL Settings and Consumer Imports

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/hooks/hitl-settings.ts`
- Modify: `cli/src/hooks/session-start.ts`
- Modify: `cli/src/__tests__/hitl-settings.test.ts`

- [ ] **Step 1: Update hitl-settings.ts**

1. In `buildStopHook()` (line 210), change the command string from:
   ```typescript
   command: `bunx beastmode hooks generate-output`,
   ```
   to:
   ```typescript
   command: `bunx beastmode hooks session-stop`,
   ```

2. In `cleanHitlSettings()` (line 155), change the filter from:
   ```typescript
   (h) => !h.hooks?.some((hk) => hk.command?.includes("generate-output")),
   ```
   to:
   ```typescript
   (h) => !h.hooks?.some((hk) => hk.command?.includes("session-stop")),
   ```

3. Update the JSDoc comment on `buildStopHook()` (line 202-203) from:
   ```typescript
   * Calls generate-output via portable CLI after Claude finishes responding.
   ```
   to:
   ```typescript
   * Calls session-stop via portable CLI after Claude finishes responding.
   ```

- [ ] **Step 2: Update session-start.ts import**

Change line 13 from:
```typescript
import { parseFrontmatter } from "./generate-output.js";
```
to:
```typescript
import { parseFrontmatter } from "./session-stop.js";
```

- [ ] **Step 3: Update hitl-settings.test.ts**

1. Line 102: Change assertion from:
   ```typescript
   expect(hooks.Stop[0].hooks[0].command).toBe("bunx beastmode hooks generate-output");
   ```
   to:
   ```typescript
   expect(hooks.Stop[0].hooks[0].command).toBe("bunx beastmode hooks session-stop");
   ```

2. Line 195: Change assertion from:
   ```typescript
   expect(stopCmd).toBe("bunx beastmode hooks generate-output");
   ```
   to:
   ```typescript
   expect(stopCmd).toBe("bunx beastmode hooks session-stop");
   ```

3. Line 214: Change test data from:
   ```typescript
   { matcher: "", hooks: [{ type: "command", command: "bunx beastmode hooks generate-output" }] },
   ```
   to:
   ```typescript
   { matcher: "", hooks: [{ type: "command", command: "bunx beastmode hooks session-stop" }] },
   ```

- [ ] **Step 4: Run tests**

Run: `cd cli && bun --bun vitest run src/__tests__/hitl-settings.test.ts 2>&1 | tail -30`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(session-stop-rename): update hitl-settings and session-start imports"
```

---

## Task 4: Update BDD Feature and Step Definitions

**Wave:** 3
**Depends on:** Task 1, Task 3

**Files:**
- Modify: `cli/features/portable-settings.feature`
- Modify: `cli/features/support/world.ts`
- Modify: `cli/features/step_definitions/output-path-sanitization.steps.ts`

- [ ] **Step 1: Update portable-settings.feature**

Change line 19 from:
```gherkin
  Then the Stop hook command should be "bunx beastmode hooks generate-output"
```
to:
```gherkin
  Then the Stop hook command should be "bunx beastmode hooks session-stop"
```

- [ ] **Step 2: Update world.ts**

1. Change import (line 16) from:
   ```typescript
   import { generateAll } from "../../src/hooks/generate-output.js";
   ```
   to:
   ```typescript
   import { runSessionStop } from "../../src/hooks/session-stop.js";
   ```

2. Change `runStopHook` method (lines 245-249) from:
   ```typescript
   runStopHook(wtPath: string): void {
     const artifactsDir = join(wtPath, ".beastmode", "artifacts");
     const worktreeSlug = basename(wtPath);
     generateAll(artifactsDir, "all", worktreeSlug);
   }
   ```
   to:
   ```typescript
   runStopHook(wtPath: string): void {
     const artifactsDir = join(wtPath, ".beastmode", "artifacts");
     const worktreeSlug = basename(wtPath);
     runSessionStop(artifactsDir, "all", worktreeSlug);
   }
   ```

- [ ] **Step 3: Update output-path-sanitization.steps.ts**

Change import (line 12) from:
```typescript
import { buildOutput, scanPlanFeatures } from "../../src/hooks/generate-output.js";
```
to:
```typescript
import { buildOutput, scanPlanFeatures } from "../../src/hooks/session-stop.js";
```

- [ ] **Step 4: Run BDD tests**

Run: `cd cli && bun --bun cucumber-js --profile portable-settings 2>&1 | tail -20`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(session-stop-rename): update BDD features and step definitions"
```

---

## Task 5: Final Verification

**Wave:** 4
**Depends on:** Task 2, Task 3, Task 4

**Files:**
- All files from tasks 1-4

- [ ] **Step 1: Verify no remaining references to generate-output**

Run: `cd cli && grep -r "generate-output" --include="*.ts" --include="*.feature" src/ features/ 2>&1`
Expected: No matches

- [ ] **Step 2: Run full test suite**

Run: `cd cli && bun --bun vitest run 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 3: Run full BDD suite**

Run: `cd cli && bun --bun cucumber-js 2>&1 | tail -20`
Expected: All scenarios pass

- [ ] **Step 4: Run integration tests**

Run: `cd cli && bun --bun vitest run src/__tests__/session-stop-rename.integration.test.ts 2>&1 | tail -30`
Expected: All tests PASS (GREEN)

- [ ] **Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "verify(session-stop-rename): all tests green"
```
