# env-prefix-helper — Write Plan

## Goal

Extract a shared env prefix builder that produces `BEASTMODE_*` inline env var strings for all command hooks. Rename old env var names, update all hook builders and consumers, add HITL env var fallback.

## Architecture

- **Shared builder:** Pure function `buildEnvPrefix(ctx)` in `cli/src/hooks/hitl-settings.ts` — no new files, co-located with hook builders
- **Five env vars (with feature):** `BEASTMODE_PHASE`, `BEASTMODE_EPIC_ID`, `BEASTMODE_EPIC_SLUG`, `BEASTMODE_FEATURE_ID`, `BEASTMODE_FEATURE_SLUG`
- **Three env vars (without feature):** `BEASTMODE_PHASE`, `BEASTMODE_EPIC_ID`, `BEASTMODE_EPIC_SLUG`
- **Interface rename:** `epic` → `epicId`, `slug` → `epicSlug` in `WriteSessionStartHookOptions` and `buildSessionStartHook` opts
- **HITL fallback:** `process.env.BEASTMODE_PHASE ?? positionalArg` in hooks.ts handlers
- **session-start reads:** `BEASTMODE_EPIC_ID` and `BEASTMODE_EPIC_SLUG` (replaces `BEASTMODE_EPIC` and `BEASTMODE_SLUG`)

## Tech Stack

- TypeScript, vitest, Bun runtime
- Test command: `cd cli && bun run test`

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/hooks/hitl-settings.ts` | Modify | Add `buildEnvPrefix()`, update all hook builders, rename interface fields |
| `cli/src/hooks/session-start.ts` | Modify | Read `BEASTMODE_EPIC_ID`/`BEASTMODE_EPIC_SLUG` instead of old names |
| `cli/src/commands/hooks.ts` | Modify | HITL auto/log env var fallback for phase |
| `cli/src/pipeline/runner.ts` | Modify | Pass `epicId`/`epicSlug` to `writeSessionStartHook` |
| `cli/src/commands/phase.ts` | Modify | Pass `epicId`/`epicSlug` to `writeSessionStartHook` |
| `cli/src/__tests__/env-prefix.test.ts` | Create | Unit tests for `buildEnvPrefix()` |
| `cli/src/__tests__/hitl-settings.test.ts` | Modify | Update command string expectations for new env vars |
| `cli/src/__tests__/hitl-prompt.test.ts` | Modify | Update command expectations for env prefix |
| `cli/src/__tests__/hooks-command.test.ts` | Modify | Update env var names, add HITL fallback tests |
| `cli/src/__tests__/session-start-hook.integration.test.ts` | Modify | Update env var names in test setup |

---

### Task 1: Shared env prefix builder + unit tests

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/hooks/hitl-settings.ts`
- Create: `cli/src/__tests__/env-prefix.test.ts`

**Step 1: Write the failing tests**

Create `cli/src/__tests__/env-prefix.test.ts`:

```typescript
import { describe, test, expect } from "vitest";
import { buildEnvPrefix } from "../hooks/hitl-settings";

describe("buildEnvPrefix", () => {
  test("produces 3 env vars without feature context", () => {
    const result = buildEnvPrefix({
      phase: "design",
      epicId: "bm-f3a7",
      epicSlug: "dashboard-redesign-f3a7",
    });
    expect(result).toBe(
      "BEASTMODE_PHASE=design BEASTMODE_EPIC_ID=bm-f3a7 BEASTMODE_EPIC_SLUG=dashboard-redesign-f3a7"
    );
  });

  test("produces 5 env vars with feature context", () => {
    const result = buildEnvPrefix({
      phase: "implement",
      epicId: "bm-f3a7",
      epicSlug: "dashboard-redesign-f3a7",
      featureId: "bm-f3a7.1",
      featureSlug: "auth-flow-1",
    });
    expect(result).toBe(
      "BEASTMODE_PHASE=implement BEASTMODE_EPIC_ID=bm-f3a7 BEASTMODE_EPIC_SLUG=dashboard-redesign-f3a7 BEASTMODE_FEATURE_ID=bm-f3a7.1 BEASTMODE_FEATURE_SLUG=auth-flow-1"
    );
  });

  test("omits feature vars when featureId is undefined", () => {
    const result = buildEnvPrefix({
      phase: "plan",
      epicId: "bm-abc1",
      epicSlug: "my-epic-abc1",
    });
    expect(result).not.toContain("BEASTMODE_FEATURE_ID");
    expect(result).not.toContain("BEASTMODE_FEATURE_SLUG");
  });

  test("omits feature vars when featureSlug is undefined", () => {
    const result = buildEnvPrefix({
      phase: "plan",
      epicId: "bm-abc1",
      epicSlug: "my-epic-abc1",
      featureId: "bm-abc1.1",
    });
    // Both must be present to include feature vars
    expect(result).not.toContain("BEASTMODE_FEATURE_ID");
    expect(result).not.toContain("BEASTMODE_FEATURE_SLUG");
  });

  test("does not contain old env var names", () => {
    const result = buildEnvPrefix({
      phase: "design",
      epicId: "bm-f3a7",
      epicSlug: "dashboard-redesign-f3a7",
    });
    expect(result).not.toContain("BEASTMODE_EPIC=");
    expect(result).not.toContain("BEASTMODE_SLUG=");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/env-prefix.test.ts`
Expected: FAIL — `buildEnvPrefix` is not exported

**Step 3: Implement `buildEnvPrefix` and `EnvPrefixContext` type**

In `cli/src/hooks/hitl-settings.ts`, add after the `PromptHookEntry` type (around line 58):

```typescript
/** Context for building the inline env var prefix string */
export interface EnvPrefixContext {
  phase: string;
  epicId: string;
  epicSlug: string;
  featureId?: string;
  featureSlug?: string;
}

/**
 * Build the inline env var prefix string for command hooks.
 * Produces 5 vars when feature context is present, 3 when absent.
 * Feature vars are only included when BOTH featureId and featureSlug are provided.
 */
export function buildEnvPrefix(ctx: EnvPrefixContext): string {
  const parts = [
    `BEASTMODE_PHASE=${ctx.phase}`,
    `BEASTMODE_EPIC_ID=${ctx.epicId}`,
    `BEASTMODE_EPIC_SLUG=${ctx.epicSlug}`,
  ];
  if (ctx.featureId && ctx.featureSlug) {
    parts.push(`BEASTMODE_FEATURE_ID=${ctx.featureId}`);
    parts.push(`BEASTMODE_FEATURE_SLUG=${ctx.featureSlug}`);
  }
  return parts.join(" ");
}
```

**Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/env-prefix.test.ts`
Expected: PASS — all 5 tests green

**Step 5: Commit**

```bash
git add cli/src/hooks/hitl-settings.ts cli/src/__tests__/env-prefix.test.ts
git commit -m "feat(env-prefix-helper): add shared buildEnvPrefix function with tests"
```

---

### Task 2: Update hook builders to use shared prefix

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/hooks/hitl-settings.ts`

**Step 1: Write the failing test**

The existing test in `hitl-settings.test.ts` at line 87 expects:
```
"bunx beastmode hooks hitl-log validate"
```
After our change, `buildPostToolUseHook` will require the full context and prepend env vars. But we can't modify tests in this task (different file boundary concern). Instead, we verify the code change directly.

No new test file needed — existing tests will be updated in Task 4. For this task, verify via manual inspection that the hook builders produce correct command strings.

**Step 2: Update `buildPostToolUseHook` to accept `EnvPrefixContext` and prepend env vars**

In `cli/src/hooks/hitl-settings.ts`, replace the `buildPostToolUseHook` function (lines 188-198):

```typescript
function buildPostToolUseHook(ctx: EnvPrefixContext): HookEntry {
  const envPrefix = buildEnvPrefix(ctx);
  return {
    matcher: "AskUserQuestion",
    hooks: [
      {
        type: "command",
        command: `${envPrefix} bunx beastmode hooks hitl-log ${ctx.phase}`,
      },
    ],
  };
}
```

**Step 3: Update `buildStopHook` to accept `EnvPrefixContext` and prepend env vars**

Replace the `buildStopHook` function (lines 204-214):

```typescript
function buildStopHook(ctx: EnvPrefixContext): HookEntry {
  const envPrefix = buildEnvPrefix(ctx);
  return {
    matcher: "",
    hooks: [
      {
        type: "command",
        command: `${envPrefix} bunx beastmode hooks generate-output`,
      },
    ],
  };
}
```

**Step 4: Update `buildPreToolUseHook` to accept `EnvPrefixContext` and prepend env vars**

Replace the `buildPreToolUseHook` function (lines 224-234):

```typescript
export function buildPreToolUseHook(ctx: EnvPrefixContext): PromptHookEntry {
  const envPrefix = buildEnvPrefix(ctx);
  return {
    matcher: "AskUserQuestion",
    hooks: [
      {
        type: "command",
        command: `${envPrefix} bunx beastmode hooks hitl-auto ${ctx.phase}`,
      },
    ],
  };
}
```

**Step 5: Update `WriteSessionStartHookOptions` and `buildSessionStartHook`**

Replace `WriteSessionStartHookOptions` (lines 250-256):

```typescript
export interface WriteSessionStartHookOptions {
  claudeDir: string;
  phase: string;
  epicId: string;
  epicSlug: string;
  featureId?: string;
  featureSlug?: string;
}
```

Replace `buildSessionStartHook` (lines 262-280):

```typescript
export function buildSessionStartHook(opts: EnvPrefixContext): HookEntry {
  const envPrefix = buildEnvPrefix(opts);
  return {
    matcher: "",
    hooks: [
      {
        type: "command",
        command: `${envPrefix} bunx beastmode hooks session-start`,
      },
    ],
  };
}
```

**Step 6: Update `writeHitlSettings` to pass `EnvPrefixContext` to internal builders**

The `WriteSettingsOptions` type needs the full context. Replace `WriteSettingsOptions` (lines 40-47):

```typescript
export interface WriteSettingsOptions {
  /** Path to the .claude directory in the worktree */
  claudeDir: string;
  /** PreToolUse hook entry for HITL auto-answering */
  preToolUseHook: HookEntry;
  /** Env prefix context for PostToolUse and Stop hooks */
  envContext: EnvPrefixContext;
}
```

Update `writeHitlSettings` function body (line 69) to use `envContext`:

```typescript
export function writeHitlSettings(options: WriteSettingsOptions): void {
  const { claudeDir, preToolUseHook, envContext } = options;
  // ... (rest stays the same until the builder calls)

  // Replace line 96:
  const postToolUseHook = buildPostToolUseHook(envContext);
  // Replace line 104:
  const stopHook = buildStopHook(envContext);
  // ... rest unchanged
}
```

**Step 7: Update `writeSessionStartHook` to use new field names**

Replace in `writeSessionStartHook` (lines 286-310):

```typescript
export function writeSessionStartHook(options: WriteSessionStartHookOptions): void {
  const { claudeDir, phase, epicId, epicSlug, featureId, featureSlug } = options;
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

  const hook = buildSessionStartHook({ phase, epicId, epicSlug, featureId, featureSlug });
  settings.hooks.SessionStart = [hook];

  mkdirSync(claudeDir, { recursive: true });
  const tmpPath = settingsPath + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(settings, null, 2) + "\n");
  renameSync(tmpPath, settingsPath);
}
```

**Step 8: Run typecheck**

Run: `cd cli && bun x tsc --noEmit`
Expected: Type errors in runner.ts and phase.ts (callers still use old field names) — this is expected, fixed in Task 3.

**Step 9: Commit**

```bash
git add cli/src/hooks/hitl-settings.ts
git commit -m "feat(env-prefix-helper): update all hook builders to use shared env prefix"
```

---

### Task 3: Update callers (runner.ts, phase.ts) + session-start env var reading

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Modify: `cli/src/pipeline/runner.ts` (lines 158-177)
- Modify: `cli/src/commands/phase.ts` (lines 88-105)
- Modify: `cli/src/hooks/session-start.ts` (lines 219-231)

**Step 1: Update runner.ts**

At line 158, change:
```typescript
const preToolUseHook = buildPreToolUseHook(config.phase);
writeHitlSettings({ claudeDir, preToolUseHook, phase: config.phase });
```
to:
```typescript
const envContext = {
  phase: config.phase,
  epicId: config.epicSlug,
  epicSlug: config.epicSlug,
  featureId: config.featureSlug,
  featureSlug: config.featureSlug,
};
const preToolUseHook = buildPreToolUseHook(envContext);
writeHitlSettings({ claudeDir, preToolUseHook, envContext });
```

At lines 171-177, change:
```typescript
writeSessionStartHook({
  claudeDir,
  phase: config.phase,
  epic: config.epicSlug,
  slug: config.epicSlug,
  feature: config.featureSlug,
});
```
to:
```typescript
writeSessionStartHook({
  claudeDir,
  phase: config.phase,
  epicId: config.epicSlug,
  epicSlug: config.epicSlug,
  featureId: config.featureSlug,
  featureSlug: config.featureSlug,
});
```

**Step 2: Update phase.ts**

At lines 91-92, change:
```typescript
const preToolUseHook = buildPreToolUseHook(phase);
writeHitlSettings({ claudeDir, preToolUseHook, phase });
```
to:
```typescript
const envContext = {
  phase,
  epicId: epicSlug,
  epicSlug,
  featureId: phase === "implement" ? args[1] : undefined,
  featureSlug: phase === "implement" ? args[1] : undefined,
};
const preToolUseHook = buildPreToolUseHook(envContext);
writeHitlSettings({ claudeDir, preToolUseHook, envContext });
```

At line 105, change:
```typescript
writeSessionStartHook({ claudeDir, phase, epic: epicSlug, slug: epicSlug, feature: featureSlug });
```
to:
```typescript
const featureSlug = phase === "implement" ? args[1] : undefined;
writeSessionStartHook({ claudeDir, phase, epicId: epicSlug, epicSlug, featureId: featureSlug, featureSlug });
```

**Step 3: Update session-start.ts env var reading**

In `runSessionStart` (lines 219-231), change:
```typescript
const epic = process.env.BEASTMODE_EPIC;
const slug = process.env.BEASTMODE_SLUG;
```
to:
```typescript
const epic = process.env.BEASTMODE_EPIC_ID;
const slug = process.env.BEASTMODE_EPIC_SLUG;
```

And update the error messages:
```typescript
if (!epic) throw new Error("Missing environment variable: BEASTMODE_EPIC_ID");
if (!slug) throw new Error("Missing environment variable: BEASTMODE_EPIC_SLUG");
```

Also update `SessionStartInput` interface — rename `epic` to `epicId` and `slug` to `epicSlug` is NOT done here because it affects the entire session-start module internals beyond this feature's scope. The env var reading is the only change.

**Step 4: Run typecheck**

Run: `cd cli && bun x tsc --noEmit`
Expected: PASS — all callers now match the new signatures

**Step 5: Commit**

```bash
git add cli/src/pipeline/runner.ts cli/src/commands/phase.ts cli/src/hooks/session-start.ts
git commit -m "feat(env-prefix-helper): update callers and session-start env var names"
```

---

### Task 4: HITL env var fallback + update all tests

**Wave:** 4
**Depends on:** Task 3

**Files:**
- Modify: `cli/src/commands/hooks.ts` (lines 71-88, 90-118)
- Modify: `cli/src/__tests__/hitl-settings.test.ts`
- Modify: `cli/src/__tests__/hitl-prompt.test.ts`
- Modify: `cli/src/__tests__/hooks-command.test.ts`
- Modify: `cli/src/__tests__/session-start-hook.integration.test.ts`

**Step 1: Add HITL env var fallback in hooks.ts**

In `runHitlAuto` (line 72), change:
```typescript
const phase = args[0];
if (!phase) return;
```
to:
```typescript
const phase = process.env.BEASTMODE_PHASE ?? args[0];
if (!phase) return;
```

In `runHitlLog` (line 91), change:
```typescript
const phase = args[0];
if (!phase) return;
```
to:
```typescript
const phase = process.env.BEASTMODE_PHASE ?? args[0];
if (!phase) return;
```

**Step 2: Update hitl-settings.test.ts**

The test at line 87 expects `"bunx beastmode hooks hitl-log validate"`. After the change, `writeHitlSettings` takes `envContext` instead of `phase`. Update:

- All `writeHitlSettings` calls: replace `phase: "..."` with `envContext: { phase: "...", epicId: "test-epic", epicSlug: "test-slug" }`
- PostToolUse command expectations: update to include env prefix, e.g., `"BEASTMODE_PHASE=validate BEASTMODE_EPIC_ID=test-epic BEASTMODE_EPIC_SLUG=test-slug bunx beastmode hooks hitl-log validate"`
- Stop hook command expectations: update similarly
- PreToolUse command expectations: `buildPreToolUseHook` now takes context — update the `mockPreToolUseHook` to pass full context
- All "portable CLI pattern" test expectations: update command strings

**Step 3: Update hitl-prompt.test.ts**

`buildPreToolUseHook` now takes `EnvPrefixContext` instead of `string`. Update all calls:
```typescript
const entry = buildPreToolUseHook({ phase: "design", epicId: "bm-test", epicSlug: "test-slug" });
```

Update command expectation tests to include env prefix:
```typescript
expect(entry.hooks[0].command).toBe(
  "BEASTMODE_PHASE=validate BEASTMODE_EPIC_ID=bm-test BEASTMODE_EPIC_SLUG=test-slug bunx beastmode hooks hitl-auto validate"
);
```

**Step 4: Update hooks-command.test.ts**

- Update env var names: `BEASTMODE_EPIC` → `BEASTMODE_EPIC_ID`, `BEASTMODE_SLUG` → `BEASTMODE_EPIC_SLUG`
- Add test: "hitl-auto reads phase from BEASTMODE_PHASE env var":
  ```typescript
  test("hitl-auto reads phase from BEASTMODE_PHASE env var", async () => {
    process.env.BEASTMODE_PHASE = "implement";
    try {
      await hooksCommand(["hitl-auto"]);
    } catch { /* exit mock */ }
    expect(decideResponse).toHaveBeenCalled();
  });
  ```
- Add test: "hitl-auto falls back to positional arg when env var missing":
  ```typescript
  test("hitl-auto falls back to positional arg when env var missing", async () => {
    delete process.env.BEASTMODE_PHASE;
    try {
      await hooksCommand(["hitl-auto", "plan"]);
    } catch { /* exit mock */ }
    expect(decideResponse).toHaveBeenCalled();
  });
  ```
- Add test: "hitl-log reads phase from BEASTMODE_PHASE env var":
  ```typescript
  test("hitl-log reads phase from BEASTMODE_PHASE env var", async () => {
    process.env.BEASTMODE_PHASE = "design";
    try {
      await hooksCommand(["hitl-log"]);
    } catch { /* exit mock */ }
    expect(routeAndFormat).toHaveBeenCalled();
  });
  ```

**Step 5: Update session-start-hook.integration.test.ts**

Update env var names from `BEASTMODE_EPIC`/`BEASTMODE_SLUG` to `BEASTMODE_EPIC_ID`/`BEASTMODE_EPIC_SLUG` in all test setup blocks.

**Step 6: Run full test suite**

Run: `cd cli && bun run test`
Expected: All hook-related tests pass (ignoring the pre-existing Bun global failures)

**Step 7: Commit**

```bash
git add cli/src/commands/hooks.ts cli/src/__tests__/hitl-settings.test.ts cli/src/__tests__/hitl-prompt.test.ts cli/src/__tests__/hooks-command.test.ts cli/src/__tests__/session-start-hook.integration.test.ts
git commit -m "feat(env-prefix-helper): add HITL env var fallback and update all tests"
```

---

### Task 5: Verification — full suite + acceptance criteria check

**Wave:** 5
**Depends on:** Task 4

**Files:**
- Read-only verification pass

**Step 1: Run full test suite**

Run: `cd cli && bun run test`
Expected: All tests pass (except pre-existing Bun global failures)

**Step 2: Verify acceptance criteria**

- [ ] `buildEnvPrefix` exported from `hitl-settings.ts`
- [ ] 5 vars with feature, 3 without — confirmed by `env-prefix.test.ts`
- [ ] No `BEASTMODE_EPIC=` or `BEASTMODE_SLUG=` in any command string — grep verification
- [ ] All 4 hook builders use `buildEnvPrefix` — code inspection
- [ ] HITL auto/log read `BEASTMODE_PHASE` with positional fallback — hooks.ts + tests
- [ ] `runSessionStart` reads `BEASTMODE_EPIC_ID`/`BEASTMODE_EPIC_SLUG` — session-start.ts
- [ ] Unit tests for prefix builder — `env-prefix.test.ts`
- [ ] Unit tests for HITL fallback — `hooks-command.test.ts`

Run: `grep -r "BEASTMODE_EPIC=" cli/src/ --include="*.ts" | grep -v "BEASTMODE_EPIC_ID" | grep -v "BEASTMODE_EPIC_SLUG" | grep -v test`
Expected: No matches (old var names purged from source)

Run: `grep -r "BEASTMODE_SLUG=" cli/src/ --include="*.ts" | grep -v "BEASTMODE_EPIC_SLUG" | grep -v "BEASTMODE_FEATURE_SLUG" | grep -v test`
Expected: No matches

**Step 3: No commit — verification only**
