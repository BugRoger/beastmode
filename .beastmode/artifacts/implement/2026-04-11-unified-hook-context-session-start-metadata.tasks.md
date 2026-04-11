# session-start-metadata

## Goal

Add a structured metadata section at the top of the `additionalContext` string produced by `assembleContext` in `session-start.ts`. The metadata block tells skills the current phase, entity IDs/slugs, parent artifact filenames, and the exact output target path — eliminating filename derivation and argument parsing in skills.

## Architecture

- **SessionStartInput** gains `epicId?: string` and `featureId?: string` optional fields
- **resolveArtifacts** is refactored to return `{ paths: string[], contents: string[] }` instead of just `string[]`
- **computeOutputTarget** — new pure function computing the full artifact output path from date, phase, epic slug, and optional feature slug
- **buildMetadataSection** — new pure function producing the YAML-fenced metadata block
- **assembleContext** prepends the metadata section before L0 context
- **runSessionStart** reads `BEASTMODE_EPIC_ID` and `BEASTMODE_FEATURE_ID` from `process.env`

## Tech Stack

- TypeScript, vitest, Bun runtime
- Test runner: `bun --bun vitest run`
- Existing code in `cli/src/hooks/session-start.ts`
- Existing tests in `cli/src/__tests__/session-start.test.ts`

## File Structure

- **Modify:** `src/hooks/session-start.ts` — extend interface, refactor resolveArtifacts, add metadata functions, update assembleContext and runSessionStart
- **Modify:** `src/__tests__/session-start.test.ts` — add unit tests for metadata section, output target computation, and integration with existing context assembly

---

### Task 1: Extend SessionStartInput and refactor resolveArtifacts return type

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `src/hooks/session-start.ts:17-23` (SessionStartInput interface)
- Modify: `src/hooks/session-start.ts:85-131` (resolveArtifacts function)
- Modify: `src/hooks/session-start.ts:33-78` (assembleContext — update resolveArtifacts call site)
- Test: `src/__tests__/session-start.test.ts`

- [x] **Step 1: Write the failing test**

Add to `src/__tests__/session-start.test.ts`, inside a new `describe("metadata section")` block:

```typescript
describe("metadata section", () => {
  test("assembleContext accepts epicId and featureId in input", () => {
    writeFileSync(
      join(tempDir, ".beastmode", "artifacts", "plan", "2026-04-11-my-epic-my-feature.md"),
      "---\nphase: plan\nepic: my-epic\nfeature: my-feature\n---\n\n# Plan\n\nPlan body",
    );
    // Should not throw when epicId and featureId are provided
    const result = assembleContext({
      phase: "implement",
      epic: "my-epic",
      slug: "my-epic-abc123",
      feature: "my-feature",
      epicId: "bm-f3a7",
      featureId: "bm-f3a7.1",
      repoRoot: tempDir,
    });
    expect(result).toContain("Plan body");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun --bun vitest run src/__tests__/session-start.test.ts --reporter=verbose`
Expected: FAIL — `epicId` is not assignable to type `SessionStartInput`

- [x] **Step 3: Extend SessionStartInput interface**

In `src/hooks/session-start.ts`, update the interface:

```typescript
export interface SessionStartInput {
  phase: string;
  epic: string;
  slug: string;
  feature?: string;
  epicId?: string;
  featureId?: string;
  repoRoot: string;
}
```

- [x] **Step 4: Refactor resolveArtifacts to return paths alongside contents**

Change the return type and internal logic of `resolveArtifacts` in `src/hooks/session-start.ts`:

```typescript
interface ResolvedArtifacts {
  paths: string[];
  contents: string[];
}

function resolveArtifacts(
  phase: string,
  epic: string,
  feature: string | undefined,
  artifactsDir: string,
): ResolvedArtifacts {
  switch (phase) {
    case "design":
      return { paths: [], contents: [] };

    case "plan": {
      const designDir = join(artifactsDir, "design");
      const artifact = findLatestArtifact(designDir, epic);
      if (!artifact) {
        throw new Error(`No design artifact found for epic "${epic}". Expected pattern: *-${epic}.md in ${designDir}`);
      }
      return { paths: [artifact], contents: [readFileSync(artifact, "utf-8")] };
    }

    case "implement": {
      const planDir = join(artifactsDir, "plan");
      const pattern = `${epic}-${feature}`;
      const artifact = findLatestArtifact(planDir, pattern);
      if (!artifact) {
        throw new Error(`No plan artifact found for feature "${feature}" of epic "${epic}". Expected pattern: *-${pattern}.md in ${planDir}`);
      }
      return { paths: [artifact], contents: [readFileSync(artifact, "utf-8")] };
    }

    case "validate": {
      const implDir = join(artifactsDir, "implement");
      return findAllArtifactsWithPaths(implDir, epic);
    }

    case "release": {
      const allPaths: string[] = [];
      const allContents: string[] = [];
      for (const subdir of ["design", "plan", "validate"]) {
        const phaseDir = join(artifactsDir, subdir);
        const resolved = findAllArtifactsWithPaths(phaseDir, epic);
        allPaths.push(...resolved.paths);
        allContents.push(...resolved.contents);
      }
      return { paths: allPaths, contents: allContents };
    }

    default:
      return { paths: [], contents: [] };
  }
}
```

Also add the new helper alongside the existing `findAllArtifacts`:

```typescript
function findAllArtifactsWithPaths(dir: string, epic: string): ResolvedArtifacts {
  if (!existsSync(dir)) return { paths: [], contents: [] };

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f.includes(epic))
    .sort();

  return {
    paths: files.map((f) => join(dir, f)),
    contents: files.map((f) => readFileSync(join(dir, f), "utf-8")),
  };
}
```

Remove the old `findAllArtifacts` function since it's replaced.

- [x] **Step 5: Update assembleContext to use new resolveArtifacts return type**

In `assembleContext`, update the call site:

```typescript
  // Phase-specific artifact resolution
  const artifactsDir = join(beastmodeDir, "artifacts");
  const resolved = resolveArtifacts(phase, epic, feature, artifactsDir);
  if (resolved.contents.length > 0) {
    sections.push(...resolved.contents);
  }
```

- [x] **Step 6: Run tests to verify all existing tests still pass**

Run: `bun --bun vitest run src/__tests__/session-start.test.ts --reporter=verbose`
Expected: ALL PASS — interface extension is backward-compatible, resolveArtifacts refactor preserves behavior

- [x] **Step 7: Commit**

```bash
git add src/hooks/session-start.ts src/__tests__/session-start.test.ts
git commit -m "feat(session-start-metadata): extend SessionStartInput and refactor resolveArtifacts"
```

---

### Task 2: Add computeOutputTarget and buildMetadataSection functions

**Wave:** 1
**Depends on:** Task 1

**Files:**
- Modify: `src/hooks/session-start.ts` (add two new exported functions)
- Test: `src/__tests__/session-start.test.ts`

- [x] **Step 1: Write failing tests for computeOutputTarget**

Add to `src/__tests__/session-start.test.ts`:

```typescript
import { assembleContext, formatOutput, computeOutputTarget, buildMetadataSection } from "../hooks/session-start";
```

Update the import line at the top of the file. Then add a new describe block (sibling to the existing `describe("assembleContext", ...)` block):

```typescript
describe("computeOutputTarget", () => {
  test("design phase returns design artifact path", () => {
    const result = computeOutputTarget("design", "dashboard-redesign-f3a7", undefined);
    const today = new Date().toISOString().split("T")[0];
    expect(result).toBe(`.beastmode/artifacts/design/${today}-dashboard-redesign-f3a7.md`);
  });

  test("plan phase returns plan artifact path", () => {
    const result = computeOutputTarget("plan", "dashboard-redesign-f3a7", undefined);
    const today = new Date().toISOString().split("T")[0];
    expect(result).toBe(`.beastmode/artifacts/plan/${today}-dashboard-redesign-f3a7.md`);
  });

  test("implement phase includes feature slug", () => {
    const result = computeOutputTarget("implement", "dashboard-redesign-f3a7", "auth-flow-1");
    const today = new Date().toISOString().split("T")[0];
    expect(result).toBe(`.beastmode/artifacts/implement/${today}-dashboard-redesign-f3a7-auth-flow-1.md`);
  });

  test("validate phase returns validate artifact path", () => {
    const result = computeOutputTarget("validate", "dashboard-redesign-f3a7", undefined);
    const today = new Date().toISOString().split("T")[0];
    expect(result).toBe(`.beastmode/artifacts/validate/${today}-dashboard-redesign-f3a7.md`);
  });

  test("release phase returns release artifact path", () => {
    const result = computeOutputTarget("release", "dashboard-redesign-f3a7", undefined);
    const today = new Date().toISOString().split("T")[0];
    expect(result).toBe(`.beastmode/artifacts/release/${today}-dashboard-redesign-f3a7.md`);
  });
});
```

- [x] **Step 2: Write failing tests for buildMetadataSection**

Add to `src/__tests__/session-start.test.ts`:

```typescript
describe("buildMetadataSection", () => {
  test("includes phase and epic fields", () => {
    const result = buildMetadataSection({
      phase: "design",
      epicId: "bm-f3a7",
      epicSlug: "dashboard-redesign-f3a7",
      parentArtifacts: [],
      outputTarget: ".beastmode/artifacts/design/2026-04-11-dashboard-redesign-f3a7.md",
    });
    expect(result).toContain("phase: design");
    expect(result).toContain("epic-id: bm-f3a7");
    expect(result).toContain("epic-slug: dashboard-redesign-f3a7");
    expect(result).toContain("output-target: .beastmode/artifacts/design/2026-04-11-dashboard-redesign-f3a7.md");
  });

  test("includes feature fields for implement phase", () => {
    const result = buildMetadataSection({
      phase: "implement",
      epicId: "bm-f3a7",
      epicSlug: "dashboard-redesign-f3a7",
      featureId: "bm-f3a7.1",
      featureSlug: "auth-flow-1",
      parentArtifacts: ["2026-04-11-dashboard-redesign-f3a7-auth-flow-1.md"],
      outputTarget: ".beastmode/artifacts/implement/2026-04-11-dashboard-redesign-f3a7-auth-flow-1.md",
    });
    expect(result).toContain("feature-id: bm-f3a7.1");
    expect(result).toContain("feature-slug: auth-flow-1");
  });

  test("omits feature fields when not provided", () => {
    const result = buildMetadataSection({
      phase: "plan",
      epicId: "bm-f3a7",
      epicSlug: "dashboard-redesign-f3a7",
      parentArtifacts: ["2026-04-11-dashboard-redesign-f3a7.md"],
      outputTarget: ".beastmode/artifacts/plan/2026-04-11-dashboard-redesign-f3a7.md",
    });
    expect(result).not.toContain("feature-id:");
    expect(result).not.toContain("feature-slug:");
  });

  test("lists parent artifact filenames", () => {
    const result = buildMetadataSection({
      phase: "validate",
      epicId: "bm-f3a7",
      epicSlug: "dashboard-redesign-f3a7",
      parentArtifacts: ["2026-04-11-dashboard-redesign-f3a7-auth.md", "2026-04-11-dashboard-redesign-f3a7-billing.md"],
      outputTarget: ".beastmode/artifacts/validate/2026-04-11-dashboard-redesign-f3a7.md",
    });
    expect(result).toContain("  - 2026-04-11-dashboard-redesign-f3a7-auth.md");
    expect(result).toContain("  - 2026-04-11-dashboard-redesign-f3a7-billing.md");
  });

  test("is delimited with YAML fences", () => {
    const result = buildMetadataSection({
      phase: "design",
      epicId: "bm-f3a7",
      epicSlug: "dashboard-redesign-f3a7",
      parentArtifacts: [],
      outputTarget: ".beastmode/artifacts/design/2026-04-11-dashboard-redesign-f3a7.md",
    });
    const lines = result.split("\n");
    expect(lines[0]).toBe("---");
    expect(lines[lines.length - 1]).toBe("---");
  });
});
```

- [x] **Step 3: Run tests to verify they fail**

Run: `bun --bun vitest run src/__tests__/session-start.test.ts --reporter=verbose`
Expected: FAIL — `computeOutputTarget` and `buildMetadataSection` not exported from session-start

- [x] **Step 4: Implement computeOutputTarget**

Add to `src/hooks/session-start.ts`:

```typescript
/**
 * Compute the artifact output target path for the current phase.
 * Format: .beastmode/artifacts/<phase>/YYYY-MM-DD-<epicSlug>[-<featureSlug>].md
 */
export function computeOutputTarget(phase: string, epicSlug: string, featureSlug: string | undefined): string {
  const today = new Date().toISOString().split("T")[0];
  const suffix = featureSlug ? `${epicSlug}-${featureSlug}` : epicSlug;
  return `.beastmode/artifacts/${phase}/${today}-${suffix}.md`;
}
```

- [x] **Step 5: Implement buildMetadataSection**

Add to `src/hooks/session-start.ts`:

```typescript
export interface MetadataInput {
  phase: string;
  epicId?: string;
  epicSlug: string;
  featureId?: string;
  featureSlug?: string;
  parentArtifacts: string[];
  outputTarget: string;
}

/**
 * Build a YAML-fenced metadata section for prepending to additionalContext.
 * Feature fields are omitted when not provided.
 */
export function buildMetadataSection(input: MetadataInput): string {
  const lines: string[] = ["---"];
  lines.push(`phase: ${input.phase}`);
  if (input.epicId) {
    lines.push(`epic-id: ${input.epicId}`);
  }
  lines.push(`epic-slug: ${input.epicSlug}`);
  if (input.featureId) {
    lines.push(`feature-id: ${input.featureId}`);
  }
  if (input.featureSlug) {
    lines.push(`feature-slug: ${input.featureSlug}`);
  }
  if (input.parentArtifacts.length > 0) {
    lines.push("parent-artifacts:");
    for (const artifact of input.parentArtifacts) {
      lines.push(`  - ${artifact}`);
    }
  } else {
    lines.push("parent-artifacts: []");
  }
  lines.push(`output-target: ${input.outputTarget}`);
  lines.push("---");
  return lines.join("\n");
}
```

- [x] **Step 6: Run tests to verify they pass**

Run: `bun --bun vitest run src/__tests__/session-start.test.ts --reporter=verbose`
Expected: ALL PASS

- [x] **Step 7: Commit**

```bash
git add src/hooks/session-start.ts src/__tests__/session-start.test.ts
git commit -m "feat(session-start-metadata): add computeOutputTarget and buildMetadataSection"
```

---

### Task 3: Wire metadata section into assembleContext and update runSessionStart

**Wave:** 2
**Depends on:** Task 1, Task 2

**Files:**
- Modify: `src/hooks/session-start.ts:33-78` (assembleContext)
- Modify: `src/hooks/session-start.ts:219-231` (runSessionStart)
- Test: `src/__tests__/session-start.test.ts`

- [x] **Step 1: Write failing tests for metadata in assembleContext output**

Add to the `describe("metadata section")` block in `src/__tests__/session-start.test.ts`:

```typescript
  test("design phase includes metadata section at top of additionalContext", () => {
    const result = assembleContext({
      phase: "design",
      epic: "my-epic",
      slug: "my-epic-abc123",
      epicId: "bm-f3a7",
      repoRoot: tempDir,
    });
    // Metadata section should be the first thing in the output
    expect(result).toMatch(/^---\nphase: design/);
    expect(result).toContain("epic-id: bm-f3a7");
    expect(result).toContain("epic-slug: my-epic-abc123");
    expect(result).toContain("output-target: .beastmode/artifacts/design/");
    // L0 context should come after metadata section
    const metaEnd = result.indexOf("---\n\n");
    const l0Start = result.indexOf("L0 persona and map");
    expect(metaEnd).toBeLessThan(l0Start);
  });

  test("plan phase metadata lists parent artifact filename", () => {
    writeFileSync(
      join(tempDir, ".beastmode", "artifacts", "design", "2026-04-11-my-epic.md"),
      "---\nphase: design\nepic: my-epic\n---\n\nPRD content",
    );
    const result = assembleContext({
      phase: "plan",
      epic: "my-epic",
      slug: "my-epic-abc123",
      epicId: "bm-f3a7",
      repoRoot: tempDir,
    });
    expect(result).toContain("parent-artifacts:");
    expect(result).toContain("2026-04-11-my-epic.md");
    expect(result).toContain("epic-slug: my-epic-abc123");
  });

  test("implement phase metadata includes feature fields", () => {
    writeFileSync(
      join(tempDir, ".beastmode", "artifacts", "plan", "2026-04-11-my-epic-my-feature.md"),
      "---\nphase: plan\n---\n\nPlan content",
    );
    const result = assembleContext({
      phase: "implement",
      epic: "my-epic",
      slug: "my-epic-abc123",
      feature: "my-feature",
      epicId: "bm-f3a7",
      featureId: "bm-f3a7.1",
      repoRoot: tempDir,
    });
    expect(result).toContain("feature-id: bm-f3a7.1");
    expect(result).toContain("feature-slug: my-feature");
    expect(result).toContain("2026-04-11-my-epic-my-feature.md");
  });

  test("validate phase metadata lists all implement artifact filenames", () => {
    writeFileSync(
      join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-feat-a.md"),
      "---\nphase: implement\nepic: my-epic\nfeature: feat-a\nstatus: completed\n---\n\nImpl A",
    );
    writeFileSync(
      join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-feat-b.md"),
      "---\nphase: implement\nepic: my-epic\nfeature: feat-b\nstatus: completed\n---\n\nImpl B",
    );
    const result = assembleContext({
      phase: "validate",
      epic: "my-epic",
      slug: "my-epic-abc123",
      epicId: "bm-f3a7",
      repoRoot: tempDir,
    });
    expect(result).toContain("2026-04-11-my-epic-feat-a.md");
    expect(result).toContain("2026-04-11-my-epic-feat-b.md");
  });

  test("metadata section omits feature fields for non-implement phases", () => {
    const result = assembleContext({
      phase: "design",
      epic: "my-epic",
      slug: "my-epic-abc123",
      epicId: "bm-f3a7",
      repoRoot: tempDir,
    });
    expect(result).not.toContain("feature-id:");
    expect(result).not.toContain("feature-slug:");
  });

  test("existing context sections (L0, L1, artifacts) remain unchanged", () => {
    writeFileSync(
      join(tempDir, ".beastmode", "artifacts", "design", "2026-04-11-my-epic.md"),
      "---\nphase: design\n---\n\nPRD content here",
    );
    const result = assembleContext({
      phase: "plan",
      epic: "my-epic",
      slug: "my-epic-abc123",
      epicId: "bm-f3a7",
      repoRoot: tempDir,
    });
    expect(result).toContain("L0 persona and map");
    expect(result).toContain("Plan rules");
    expect(result).toContain("PRD content here");
  });

  test("metadata output-target path uses correct format", () => {
    const result = assembleContext({
      phase: "design",
      epic: "my-epic",
      slug: "my-epic-abc123",
      repoRoot: tempDir,
    });
    const today = new Date().toISOString().split("T")[0];
    expect(result).toContain(`output-target: .beastmode/artifacts/design/${today}-my-epic-abc123.md`);
  });
```

- [x] **Step 2: Run tests to verify they fail**

Run: `bun --bun vitest run src/__tests__/session-start.test.ts --reporter=verbose`
Expected: FAIL — metadata section not present in assembleContext output

- [x] **Step 3: Update assembleContext to prepend metadata section**

Replace the body of `assembleContext` in `src/hooks/session-start.ts`:

```typescript
export function assembleContext(input: SessionStartInput): string {
  const { phase, epic, slug, feature, epicId, featureId, repoRoot } = input;

  // Validate required inputs
  if (!phase || !VALID_PHASES.includes(phase)) {
    throw new Error(`Missing or invalid phase: "${phase}". Valid phases: ${VALID_PHASES.join(", ")}`);
  }
  if (!epic) throw new Error("Missing required input: epic");
  if (!slug) throw new Error("Missing required input: slug");
  if (phase === "implement" && !feature) {
    throw new Error("Missing required input: feature (required for implement phase)");
  }

  const beastmodeDir = join(repoRoot, ".beastmode");
  const sections: string[] = [];

  // Phase-specific artifact resolution
  const artifactsDir = join(beastmodeDir, "artifacts");
  const resolved = resolveArtifacts(phase, epic, feature, artifactsDir);

  // Build metadata section — prepended before all other context
  const parentArtifactFilenames = resolved.paths.map((p) => {
    const parts = p.split("/");
    return parts[parts.length - 1];
  });
  const outputTarget = computeOutputTarget(phase, slug, feature);
  const metadata = buildMetadataSection({
    phase,
    epicId,
    epicSlug: slug,
    featureId,
    featureSlug: feature,
    parentArtifacts: parentArtifactFilenames,
    outputTarget,
  });
  sections.push(metadata);

  // L0 context
  const l0Path = join(beastmodeDir, "BEASTMODE.md");
  if (!existsSync(l0Path)) {
    throw new Error(`L0 context file not found: BEASTMODE.md`);
  }
  sections.push(readFileSync(l0Path, "utf-8"));

  // L1 context
  const l1Filename = `${phase.toUpperCase()}.md`;
  const l1Path = join(beastmodeDir, "context", l1Filename);
  if (!existsSync(l1Path)) {
    throw new Error(`L1 context file not found: ${l1Filename}`);
  }
  sections.push(readFileSync(l1Path, "utf-8"));

  // Artifact contents
  if (resolved.contents.length > 0) {
    sections.push(...resolved.contents);
  }

  // Gate evaluation (validate phase only)
  if (phase === "validate") {
    const gateSection = evaluateGates(epic, artifactsDir);
    sections.push(gateSection);
  }

  return sections.join("\n\n---\n\n");
}
```

- [x] **Step 4: Update runSessionStart to read new env vars**

In `src/hooks/session-start.ts`, update `runSessionStart`:

```typescript
export function runSessionStart(repoRoot: string): void {
  const phase = process.env.BEASTMODE_PHASE;
  const epic = process.env.BEASTMODE_EPIC;
  const slug = process.env.BEASTMODE_SLUG;
  const feature = process.env.BEASTMODE_FEATURE;
  const epicId = process.env.BEASTMODE_EPIC_ID;
  const featureId = process.env.BEASTMODE_FEATURE_ID;

  if (!phase) throw new Error("Missing environment variable: BEASTMODE_PHASE");
  if (!epic) throw new Error("Missing environment variable: BEASTMODE_EPIC");
  if (!slug) throw new Error("Missing environment variable: BEASTMODE_SLUG");

  const context = assembleContext({ phase, epic, slug, feature, epicId, featureId, repoRoot });
  process.stdout.write(formatOutput(context));
}
```

- [x] **Step 5: Run tests to verify they pass**

Run: `bun --bun vitest run src/__tests__/session-start.test.ts --reporter=verbose`
Expected: ALL PASS — new metadata tests pass, existing tests still pass (metadata is prepended, existing content unchanged)

- [x] **Step 6: Commit**

```bash
git add src/hooks/session-start.ts src/__tests__/session-start.test.ts
git commit -m "feat(session-start-metadata): wire metadata section into assembleContext"
```

---

### Task 4: Update WriteSessionStartHookOptions and pipeline runner

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `src/hooks/hitl-settings.ts:250-310` (WriteSessionStartHookOptions, buildSessionStartHook, writeSessionStartHook)
- Modify: `src/pipeline/runner.ts:169-177` (writeSessionStartHook call site)
- Test: `src/__tests__/session-start.test.ts`

- [x] **Step 1: Write failing test for epicId in SessionStart hook**

Add to the `describe("session-start settings writer")` block in `src/__tests__/session-start.test.ts`:

```typescript
  test("includes epicId env var when provided", () => {
    const claudeDir = join(tempDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });

    writeSessionStartHook({
      claudeDir,
      phase: "plan",
      epic: "my-epic",
      slug: "my-epic-abc123",
      epicId: "bm-f3a7",
    });

    const settings = JSON.parse(readFileSync(join(claudeDir, "settings.local.json"), "utf-8"));
    const command = settings.hooks.SessionStart[0].hooks[0].command;
    expect(command).toContain("BEASTMODE_EPIC_ID=bm-f3a7");
  });

  test("includes featureId env var for implement phase", () => {
    const claudeDir = join(tempDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });

    writeSessionStartHook({
      claudeDir,
      phase: "implement",
      epic: "my-epic",
      slug: "my-epic-abc123",
      feature: "my-feat",
      epicId: "bm-f3a7",
      featureId: "bm-f3a7.1",
    });

    const settings = JSON.parse(readFileSync(join(claudeDir, "settings.local.json"), "utf-8"));
    const command = settings.hooks.SessionStart[0].hooks[0].command;
    expect(command).toContain("BEASTMODE_EPIC_ID=bm-f3a7");
    expect(command).toContain("BEASTMODE_FEATURE_ID=bm-f3a7.1");
  });

  test("omits epicId env var when not provided", () => {
    const claudeDir = join(tempDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });

    writeSessionStartHook({
      claudeDir,
      phase: "plan",
      epic: "my-epic",
      slug: "my-epic-abc123",
    });

    const settings = JSON.parse(readFileSync(join(claudeDir, "settings.local.json"), "utf-8"));
    const command = settings.hooks.SessionStart[0].hooks[0].command;
    expect(command).not.toContain("BEASTMODE_EPIC_ID");
  });
```

- [x] **Step 2: Run tests to verify they fail**

Run: `bun --bun vitest run src/__tests__/session-start.test.ts --reporter=verbose`
Expected: FAIL — `epicId` not accepted by `writeSessionStartHook`

- [x] **Step 3: Extend WriteSessionStartHookOptions and buildSessionStartHook**

In `src/hooks/hitl-settings.ts`, update the interface and function:

```typescript
export interface WriteSessionStartHookOptions {
  claudeDir: string;
  phase: string;
  epic: string;
  slug: string;
  feature?: string;
  epicId?: string;
  featureId?: string;
}

export function buildSessionStartHook(opts: {
  phase: string;
  epic: string;
  slug: string;
  feature?: string;
  epicId?: string;
  featureId?: string;
}): HookEntry {
  const envParts = [
    `BEASTMODE_PHASE=${opts.phase}`,
    `BEASTMODE_EPIC=${opts.epic}`,
    `BEASTMODE_SLUG=${opts.slug}`,
  ];
  if (opts.epicId) {
    envParts.push(`BEASTMODE_EPIC_ID=${opts.epicId}`);
  }
  if (opts.feature) {
    envParts.push(`BEASTMODE_FEATURE=${opts.feature}`);
  }
  if (opts.featureId) {
    envParts.push(`BEASTMODE_FEATURE_ID=${opts.featureId}`);
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

Update `writeSessionStartHook` to pass through the new fields:

```typescript
export function writeSessionStartHook(options: WriteSessionStartHookOptions): void {
  const { claudeDir, phase, epic, slug, feature, epicId, featureId } = options;
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

  const hook = buildSessionStartHook({ phase, epic, slug, feature, epicId, featureId });
  settings.hooks.SessionStart = [hook];

  mkdirSync(claudeDir, { recursive: true });
  const tmpPath = settingsPath + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(settings, null, 2) + "\n");
  renameSync(tmpPath, settingsPath);
}
```

- [x] **Step 4: Update pipeline runner to pass epicId**

In `src/pipeline/runner.ts`, update the `writeSessionStartHook` call at lines 169-177:

```typescript
    // Session-start hook
    cleanSessionStartHook(claudeDir);
    writeSessionStartHook({
      claudeDir,
      phase: config.phase,
      epic: config.epicSlug,
      slug: config.epicSlug,
      feature: config.featureSlug,
      epicId: config.epicId,
    });
```

Note: `featureId` is not yet available in PipelineConfig — it will be added when the pipeline runner gains feature entity resolution (future wave). For now, only epicId is passed.

- [x] **Step 5: Run tests to verify they pass**

Run: `bun --bun vitest run src/__tests__/session-start.test.ts --reporter=verbose`
Expected: ALL PASS

- [x] **Step 6: Commit**

```bash
git add src/hooks/hitl-settings.ts src/pipeline/runner.ts src/__tests__/session-start.test.ts
git commit -m "feat(session-start-metadata): extend hook options with epicId/featureId"
```

---

### Task 5: Final verification

**Wave:** 3
**Depends on:** Task 3, Task 4

**Files:**
- Read: `src/hooks/session-start.ts`
- Read: `src/hooks/hitl-settings.ts`
- Read: `src/pipeline/runner.ts`
- Test: `src/__tests__/session-start.test.ts`

- [x] **Step 1: Run full test suite**

Run: `bun --bun vitest run --reporter=verbose`
Expected: All session-start tests pass. Pre-existing failures (globalThis.Bun mock issues in 4 unrelated files) are unchanged.

- [x] **Step 2: Verify acceptance criteria**

Check each criterion against the implementation:
1. Metadata section appears at top of additionalContext output — verified by test
2. Metadata contains phase, epic-id, epic-slug — verified by test
3. Feature fields present for implement phase — verified by test
4. Parent artifact filenames listed — verified by test
5. Output target path computed correctly — verified by computeOutputTarget tests
6. SessionStartInput extended — verified by interface test
7. Pipeline runner passes epicId — verified by code
8. Existing context unchanged — verified by test
9. Output target format correct — verified by computeOutputTarget tests
10. Unit tests for metadata format — all present
11. Unit tests for output target — all present
12. Unit tests for metadata alongside existing context — verified

- [x] **Step 3: Commit verification**

```bash
git log --oneline -5
```

Expected: 4 commits for Tasks 1-4 on the impl branch.
