# Env & Frontmatter Contract — Implementation Tasks

## Goal

Replace `BEASTMODE_SLUG` with `BEASTMODE_ID` in hook env vars. Replace `fm.slug` with `fm.id` in frontmatter interface and matching logic. Zero `BEASTMODE_SLUG` in production code after completion. Zero `fm.slug` in production code after completion.

## Architecture Decisions (from design)

- Entity IDs are internal identifiers (e.g., `bm-a3f2`). Slugs are human-facing (epic names, feature names).
- `BEASTMODE_ID` carries entity ID. `BEASTMODE_EPIC` carries epic slug. `BEASTMODE_FEATURE` carries feature slug.
- `ArtifactFrontmatter` gets `id?: string`, loses `slug?: string`.
- `buildOutput` fallback chain: `fm.epic ?? fm.id` (not `fm.slug`).
- `scanPlanFeatures` matches on `fm.epic` only (remove `fm.slug` fallback).

## Tech Stack

- TypeScript (strict), vitest, Bun runtime
- Test command: `bun --bun vitest run`

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/hooks/hitl-settings.ts` | Modify | Replace `slug` with `id` in `WriteSessionStartHookOptions` and `buildSessionStartHook` |
| `cli/src/hooks/session-start.ts` | Modify | Replace `BEASTMODE_SLUG` with `BEASTMODE_ID` in env reading; replace `slug` with `id` in interface |
| `cli/src/hooks/generate-output.ts` | Modify | Add `id` to `ArtifactFrontmatter`, remove `slug`; update `buildOutput` and `scanPlanFeatures` |
| `cli/src/types.ts` | Modify | Update `DesignArtifacts.slug` comment to reference `id` |
| `cli/src/commands/phase.ts` | Modify | Pass `id` instead of `slug` to `writeSessionStartHook` |
| `cli/src/pipeline/runner.ts` | Modify | Pass `id` instead of `slug` to `writeSessionStartHook` |
| `cli/src/__tests__/generate-output.test.ts` | Modify | Update tests for `id` field, remove `fm.slug` assertions |
| `cli/src/__tests__/session-start.test.ts` | Modify | Update tests for `BEASTMODE_ID` and `id` parameter |
| `cli/src/__tests__/hooks-command.test.ts` | Modify | Replace `BEASTMODE_SLUG` with `BEASTMODE_ID` in env var setup/teardown |

---

### Task 1: Environment Variable Contract — hitl-settings.ts + session-start.ts

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/hooks/hitl-settings.ts:252-282`
- Modify: `cli/src/hooks/session-start.ts:17-23,219-231`

- [ ] **Step 1: Update `WriteSessionStartHookOptions` interface**

In `cli/src/hooks/hitl-settings.ts`, replace the `slug` field with `id`:

```typescript
export interface WriteSessionStartHookOptions {
  claudeDir: string;
  phase: string;
  epic: string;
  id: string;
  feature?: string;
}
```

- [ ] **Step 2: Update `buildSessionStartHook` function**

In `cli/src/hooks/hitl-settings.ts`, replace `slug` parameter and `BEASTMODE_SLUG` with `id` and `BEASTMODE_ID`:

```typescript
export function buildSessionStartHook(opts: { phase: string; epic: string; id: string; feature?: string }): HookEntry {
  const envParts = [
    `BEASTMODE_PHASE=${opts.phase}`,
    `BEASTMODE_EPIC=${opts.epic}`,
    `BEASTMODE_ID=${opts.id}`,
  ];
  if (opts.feature) {
    envParts.push(`BEASTMODE_FEATURE=${opts.feature}`);
  }
  return {
    matcher: "",
    hooks: [
      {
        type: "command",
        command: `${envParts.join(" ")} bunx beastmode hooks session-start`,
      },
    ],
  };
}
```

- [ ] **Step 3: Update `writeSessionStartHook` function**

In `cli/src/hooks/hitl-settings.ts`, update the destructuring and call:

```typescript
export function writeSessionStartHook(options: WriteSessionStartHookOptions): void {
  const { claudeDir, phase, epic, id, feature } = options;
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

  const hook = buildSessionStartHook({ phase, epic, id, feature });
  settings.hooks.SessionStart = [hook];

  mkdirSync(claudeDir, { recursive: true });
  const tmpPath = settingsPath + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(settings, null, 2) + "\n");
  renameSync(tmpPath, settingsPath);
}
```

- [ ] **Step 4: Update `SessionStartInput` interface**

In `cli/src/hooks/session-start.ts`, replace `slug` with `id`:

```typescript
export interface SessionStartInput {
  phase: string;
  epic: string;
  id: string;
  feature?: string;
  repoRoot: string;
}
```

- [ ] **Step 5: Update `assembleContext` function**

In `cli/src/hooks/session-start.ts`, replace `slug` with `id` in destructuring and validation:

```typescript
export function assembleContext(input: SessionStartInput): string {
  const { phase, epic, id, feature, repoRoot } = input;

  // Validate required inputs
  if (!phase || !VALID_PHASES.includes(phase)) {
    throw new Error(`Missing or invalid phase: "${phase}". Valid phases: ${VALID_PHASES.join(", ")}`);
  }
  if (!epic) throw new Error("Missing required input: epic");
  if (!id) throw new Error("Missing required input: id");
  if (phase === "implement" && !feature) {
    throw new Error("Missing required input: feature (required for implement phase)");
  }
```

- [ ] **Step 6: Update `runSessionStart` function**

In `cli/src/hooks/session-start.ts`, replace `BEASTMODE_SLUG` with `BEASTMODE_ID`:

```typescript
export function runSessionStart(repoRoot: string): void {
  const phase = process.env.BEASTMODE_PHASE;
  const epic = process.env.BEASTMODE_EPIC;
  const id = process.env.BEASTMODE_ID;
  const feature = process.env.BEASTMODE_FEATURE;

  if (!phase) throw new Error("Missing environment variable: BEASTMODE_PHASE");
  if (!epic) throw new Error("Missing environment variable: BEASTMODE_EPIC");
  if (!id) throw new Error("Missing environment variable: BEASTMODE_ID");

  const context = assembleContext({ phase, epic, id, feature, repoRoot });
  process.stdout.write(formatOutput(context));
}
```

- [ ] **Step 7: Run tests to verify compilation and regressions**

Run: `bun --bun vitest run src/__tests__/session-start.test.ts src/__tests__/hooks-command.test.ts`
Expected: Some failures due to tests still using old `slug` parameter — will be fixed in Task 3.

- [ ] **Step 8: Commit**

```bash
git add cli/src/hooks/hitl-settings.ts cli/src/hooks/session-start.ts
git commit -m "feat(env-frontmatter-contract): replace BEASTMODE_SLUG with BEASTMODE_ID in hook env vars"
```

---

### Task 2: Frontmatter Contract — generate-output.ts

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/hooks/generate-output.ts:22-35,70-93,139-181`

- [ ] **Step 1: Update `ArtifactFrontmatter` interface**

In `cli/src/hooks/generate-output.ts`, add `id` field and remove `slug` field:

```typescript
/** Frontmatter extracted from a markdown artifact. */
export interface ArtifactFrontmatter {
  phase?: string;
  id?: string;
  epic?: string;
  feature?: string;
  status?: string;
  bump?: string;
  description?: string;
  problem?: string;
  solution?: string;
  wave?: string;
  failedFeatures?: string;
}
```

- [ ] **Step 2: Update `buildOutput` design case**

In `cli/src/hooks/generate-output.ts`, line 82, replace `fm.slug` with `fm.id`:

```typescript
    case "design": {
      const summary = fm.problem && fm.solution
        ? { problem: fm.problem, solution: fm.solution }
        : undefined;
      return {
        status: (fm.status as PhaseOutput["status"]) ?? "completed",
        artifacts: { design: basename(artifactPath), slug: fm.epic ?? fm.id, epic: fm.epic, summary },
      };
    }
```

- [ ] **Step 3: Update `buildOutput` plan case**

In `cli/src/hooks/generate-output.ts`, line 87, replace `fm.slug` with `fm.id`:

```typescript
    case "plan": {
      const epic = fm.epic ?? fm.id;
      const features = scanPlanFeatures(artifactsDir, epic);
      return {
        status: (fm.status as PhaseOutput["status"]) ?? "completed",
        artifacts: { features },
      };
    }
```

- [ ] **Step 4: Update `scanPlanFeatures` matching logic**

In `cli/src/hooks/generate-output.ts`, line 164, remove `fm.slug` fallback — match only on `fm.epic`:

```typescript
    const fm = parseFrontmatter(content);
    if (!fm.feature) continue;
    // Match on epic field only — slug fallback removed per env-frontmatter-contract
    if (fm.epic !== epic) continue;
```

- [ ] **Step 5: Run tests to verify compilation**

Run: `bun --bun vitest run src/__tests__/generate-output.test.ts`
Expected: Some failures due to tests still using `fm.slug` — will be fixed in Task 3.

- [ ] **Step 6: Commit**

```bash
git add cli/src/hooks/generate-output.ts
git commit -m "feat(env-frontmatter-contract): replace fm.slug with fm.id in frontmatter contract"
```

---

### Task 3: Update Tests

**Wave:** 2
**Depends on:** Task 1, Task 2

**Files:**
- Modify: `cli/src/__tests__/generate-output.test.ts`
- Modify: `cli/src/__tests__/session-start.test.ts`
- Modify: `cli/src/__tests__/hooks-command.test.ts`

- [ ] **Step 1: Update generate-output.test.ts — parseFrontmatter tests**

Replace `slug` references with `id` in frontmatter test strings and assertions:

In the "parses basic frontmatter" test:
```typescript
  test("parses basic frontmatter", () => {
    const fm = parseFrontmatter("---\nphase: design\nid: my-epic\n---\n\n# Content");
    expect(fm.phase).toBe("design");
    expect(fm.id).toBe("my-epic");
  });
```

In the "strips quotes from values" test:
```typescript
  test("strips quotes from values", () => {
    const fm = parseFrontmatter('---\nid: "my-epic"\nphase: \'plan\'\n---\n');
    expect(fm.id).toBe("my-epic");
    expect(fm.phase).toBe("plan");
  });
```

In the "handles all known fields" test — replace `slug: s` with `id: s`:
```typescript
  test("handles all known fields", () => {
    const fm = parseFrontmatter(
      "---\nphase: implement\nid: s\nepic: e\nfeature: f\nstatus: completed\nbump: minor\n---\n",
    );
    expect(fm.phase).toBe("implement");
    expect(fm.epic).toBe("e");
    expect(fm.feature).toBe("f");
    expect(fm.status).toBe("completed");
    expect(fm.bump).toBe("minor");
  });
```

- [ ] **Step 2: Update generate-output.test.ts — buildOutput tests**

Update design test cases to use `id` instead of `slug` in frontmatter input:

```typescript
  test("design phase output", () => {
    const output = buildOutput("path/to/design.md", { phase: "design", id: "abc123", epic: "my-epic" }, ARTIFACTS_DIR);
    expect(output).toEqual({
      status: "completed",
      artifacts: { design: "design.md", slug: "my-epic", epic: "my-epic", summary: undefined },
    });
  });
```

Update "design phase output without epic field" — now falls back to `fm.id`:
```typescript
  test("design phase output without epic field", () => {
    const output = buildOutput("path/to/design.md", { phase: "design", id: "abc123" }, ARTIFACTS_DIR);
    expect(output).toEqual({
      status: "completed",
      artifacts: { design: "design.md", slug: "abc123", summary: undefined },
    });
  });
```

Update all `slug: "abc123"` in design path tests to `id: "abc123"`:
```typescript
  test("design phase strips directory prefix from absolute path", () => {
    const output = buildOutput(
      "/worktree/.beastmode/artifacts/design/2026-04-06-epic.md",
      { phase: "design", id: "abc123", epic: "my-epic" },
      ARTIFACTS_DIR,
    );
    expect(output?.artifacts).toMatchObject({ design: "2026-04-06-epic.md" });
  });

  test("design phase preserves bare filename unchanged", () => {
    const output = buildOutput(
      "2026-04-06-epic.md",
      { phase: "design", id: "abc123", epic: "my-epic" },
      ARTIFACTS_DIR,
    );
    expect(output?.artifacts).toMatchObject({ design: "2026-04-06-epic.md" });
  });
```

- [ ] **Step 3: Update generate-output.test.ts — scanPlanFeatures tests**

Remove the "matches features by slug field (hex lookup)" test entirely — `fm.slug` matching is removed.

Remove the "does not double-count when epic and slug both match" test — no longer applicable.

Update the "skips files without feature field" test — use `id` instead of `slug` in frontmatter:
```typescript
  test("skips files without feature field", () => {
    writeArtifact("plan", "2026-03-30-my-epic.md",
      "---\nphase: plan\nepic: my-epic\nid: my-epic\n---\n# Epic-level plan");

    const features = scanPlanFeatures(ARTIFACTS_DIR, "my-epic");
    expect(features).toHaveLength(0);
  });
```

- [ ] **Step 4: Update generate-output.test.ts — processArtifact and generateAll tests**

Update frontmatter in test artifact strings to use `id` instead of `slug`:

In processArtifact "generates output.json for a design artifact":
```typescript
    const path = writeArtifact("design", "2026-03-30-my-epic.md",
      "---\nphase: design\nid: my-epic\n---\n# PRD");
```

In processArtifact "generates output.json for a plan artifact with features":
```typescript
    const planPath = writeArtifact("plan", "2026-03-30-my-epic.md",
      "---\nphase: plan\nepic: my-epic\nid: my-epic\n---\n# Plan");
```

In processArtifact "skips artifact without phase frontmatter":
```typescript
    const path = writeArtifact("design", "no-phase.md",
      "---\nid: test\n---\n# No phase");
```

In processArtifact "skips regeneration when output is newer":
```typescript
    const path = writeArtifact("design", "2026-03-30-cached.md",
      "---\nphase: design\nid: cached\n---\n# Cached");
```

In generateAll "processes artifacts across multiple phases":
```typescript
    writeArtifact("design", "2026-03-30-epic.md",
      "---\nphase: design\nid: epic\n---\n# PRD");
```

In generateAll "the bug scenario: stale plan features":
```typescript
    writeArtifact("plan", "2026-03-30-remove-persona-voice.md",
      "---\nphase: plan\nepic: remove-persona-voice\nid: remove-persona-voice\n---\n# Plan");
```

In "validate buildOutput with failedFeatures" tests — replace `slug: test` with `id: test`:
```typescript
    const fm = parseFrontmatter(
      "---\nphase: validate\nid: test\nepic: test\nstatus: failed\nfailedFeatures: token-cache,auth-lib\n---\n",
    );
```

```typescript
    const fm = parseFrontmatter(
      "---\nphase: validate\nid: test\nepic: test\nstatus: passed\n---\n",
    );
```

- [ ] **Step 5: Update session-start.test.ts**

Replace all `slug: "abc123"` with `id: "abc123"` in `assembleContext` calls:

```typescript
// In design phase tests:
const result = assembleContext({ phase: "design", epic: "my-epic", id: "abc123", repoRoot: tempDir });

// In plan phase tests:
const result = assembleContext({ phase: "plan", epic: "my-epic", id: "abc123", repoRoot: tempDir });

// In implement phase tests:
const result = assembleContext({ phase: "implement", epic: "my-epic", id: "abc123", feature: "my-feature", repoRoot: tempDir });

// In validate phase tests:
const result = assembleContext({ phase: "validate", epic: "my-epic", id: "abc123", repoRoot: tempDir });

// In release phase tests:
const result = assembleContext({ phase: "release", epic: "my-epic", id: "abc123", repoRoot: tempDir });
```

Update error handling tests:
```typescript
    test("throws on missing id", () => {
      expect(() => assembleContext({ phase: "design", epic: "e", id: "", repoRoot: tempDir })).toThrow(/id/i);
    });
```

Update `writeSessionStartHook` test calls to use `id` instead of `slug`:
```typescript
    writeSessionStartHook({ claudeDir, phase: "plan", epic: "my-epic", id: "abc123" });
```

```typescript
    writeSessionStartHook({ claudeDir, phase: "implement", epic: "my-epic", id: "abc123", feature: "my-feat" });
```

- [ ] **Step 6: Update hooks-command.test.ts**

Replace `BEASTMODE_SLUG` with `BEASTMODE_ID` everywhere:

In afterEach:
```typescript
    delete process.env.BEASTMODE_ID;
```

In "session-start writes JSON to stdout when env vars present":
```typescript
    process.env.BEASTMODE_ID = "abc123";
```

In "session-start exits non-zero when BEASTMODE_PHASE is missing":
```typescript
    delete process.env.BEASTMODE_ID;
```

In "session-start is recognized as valid hook name":
```typescript
    process.env.BEASTMODE_ID = "def456";
```

- [ ] **Step 7: Run all affected tests**

Run: `bun --bun vitest run src/__tests__/generate-output.test.ts src/__tests__/session-start.test.ts src/__tests__/hooks-command.test.ts`
Expected: PASS — all tests green

- [ ] **Step 8: Commit**

```bash
git add cli/src/__tests__/generate-output.test.ts cli/src/__tests__/session-start.test.ts cli/src/__tests__/hooks-command.test.ts
git commit -m "test(env-frontmatter-contract): update tests for id/slug contract change"
```

---

### Task 4: Update Call Sites — phase.ts, runner.ts, types.ts

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/commands/phase.ts:105`
- Modify: `cli/src/pipeline/runner.ts:171-177`
- Modify: `cli/src/types.ts:19-24`

- [ ] **Step 1: Update phase.ts call site**

In `cli/src/commands/phase.ts`, line 105, replace `slug: epicSlug` with `id: epicSlug`:

```typescript
    writeSessionStartHook({ claudeDir, phase, epic: epicSlug, id: epicSlug, feature: featureSlug });
```

- [ ] **Step 2: Update runner.ts call site**

In `cli/src/pipeline/runner.ts`, lines 171-177, replace `slug: config.epicSlug` with `id: config.epicSlug`:

```typescript
    writeSessionStartHook({
      claudeDir,
      phase: config.phase,
      epic: config.epicSlug,
      id: config.epicSlug,
      feature: config.featureSlug,
    });
```

- [ ] **Step 3: Update types.ts comments**

In `cli/src/types.ts`, update the `DesignArtifacts` comment to reference `id`:

```typescript
export interface DesignArtifacts {
  design: string; // path to PRD
  slug?: string;  // entity identifier from frontmatter (fm.epic ?? fm.id)
  epic?: string;  // human-readable epic name from standardized frontmatter
  summary?: { problem: string; solution: string };
}
```

And update the `PhaseOutput` JSDoc comment:

```typescript
/** Universal phase output contract.
 * Written by skill checkpoints to state/<phase>/YYYY-MM-DD-<id>.output.json
 * Read by CLI to enrich manifests.
 */
```

- [ ] **Step 4: Run full test suite**

Run: `bun --bun vitest run`
Expected: PASS — all tests green

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/phase.ts cli/src/pipeline/runner.ts cli/src/types.ts
git commit -m "feat(env-frontmatter-contract): update call sites for id parameter"
```

---

### Task 5: Verification Sweep

**Wave:** 3
**Depends on:** Task 1, Task 2, Task 3, Task 4

**Files:**
- None (verification only)

- [ ] **Step 1: Grep for zero BEASTMODE_SLUG in production code**

Run: `grep -r "BEASTMODE_SLUG" cli/src/ --include="*.ts" -l | grep -v __tests__`
Expected: No output (zero matches outside tests)

- [ ] **Step 2: Grep for zero fm.slug in production code**

Run: `grep -r "fm\.slug" cli/src/ --include="*.ts" -l | grep -v __tests__`
Expected: No output (zero matches outside tests)

- [ ] **Step 3: Grep for zero BEASTMODE_SLUG in tests**

Run: `grep -r "BEASTMODE_SLUG" cli/src/ --include="*.ts" -l`
Expected: No output (zero matches anywhere — tests updated too)

- [ ] **Step 4: Grep for zero fm.slug in tests**

Run: `grep -r "fm\.slug" cli/src/ --include="*.ts" -l`
Expected: No output (zero matches anywhere — tests updated too)

- [ ] **Step 5: Run full test suite one final time**

Run: `bun --bun vitest run`
Expected: PASS — all tests green

- [ ] **Step 6: Commit verification (no files to commit — just verification)**

No commit needed. Verification only.
