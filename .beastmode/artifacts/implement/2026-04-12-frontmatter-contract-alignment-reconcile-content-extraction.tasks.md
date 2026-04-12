# reconcile-content-extraction — Write Plan

## Goal

Update the reconcile functions and BDD world artifact writers to use unified field names (`epic-slug`, `feature-slug`, `failed-features`) and extract content (problem, solution, description) from artifact markdown body sections instead of output.json.

## Architecture

- **reconcile.ts** — reconcileDesign reads `epic-slug` from output.json, extracts problem/solution from design artifact markdown body via `extractSection`. reconcilePlan reads `feature-slug` from output.json, extracts description from plan artifact markdown body. reconcileValidate reads `failed-features` from output.json.
- **reader.ts** — already has `extractSection` and `extractSectionFromFile` utilities.
- **world.ts** — BDD artifact writers updated to emit new frontmatter field names (`epic-id`, `epic-slug`, `feature-slug`, `failed-features`).
- **Cucumber .feature files** — DataTable fields updated to match new frontmatter names.

## Tech Stack

- TypeScript, vitest, Cucumber/Gherkin, Bun runtime

## File Structure

- Modify: `cli/src/pipeline/reconcile.ts` — update field name reads in reconcileDesign, reconcilePlan, reconcileValidate, extractFeaturesFromOutput
- Modify: `cli/features/support/world.ts` — update all artifact writers to use new frontmatter field names
- Modify: `cli/features/pipeline-happy-path.feature` — update DataTable fields
- Modify: `cli/features/design-slug-rename.feature` — update DataTable fields
- Modify: `cli/features/validate-feedback-loop.feature` — update DataTable fields
- Modify: `cli/features/regression-loop.feature` — update DataTable fields
- Modify: `cli/features/static-hitl-hooks.feature` — update DataTable fields
- Modify: `cli/features/pipeline-error-resilience.feature` — update DataTable fields
- Modify: `cli/features/hitl-hook-lifecycle.feature` — update DataTable fields
- Modify: `cli/features/file-permissions-logging.feature` — update DataTable fields
- Modify: `cli/features/file-permissions-config.feature` — update DataTable fields
- Modify: `cli/features/file-permissions-hooks.feature` — update DataTable fields
- Modify: `cli/features/file-permissions-lifecycle.feature` — update DataTable fields
- Modify: `cli/src/__tests__/reconcile-design.test.ts` — update mock output.json field names
- Modify: `cli/src/__tests__/reconcile-design-slug-suffix.test.ts` — update mock output.json field names

---

### Task 1: Update reconcileDesign to use unified field names and extract content from artifact body

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/pipeline/reconcile.ts:102-126,212-299`

**Step 1: Update extractFeaturesFromOutput to read `feature-slug` instead of `slug`**

In `cli/src/pipeline/reconcile.ts`, update the `extractFeaturesFromOutput` function to read `feature-slug` from output.json entries instead of `slug`. The function currently checks `typeof (entry as Record<string, unknown>).slug === "string"` and reads `rec.slug`. Change to read `rec["feature-slug"]`. Also drop reading `description` since it will no longer be in output.json.

```typescript
function extractFeaturesFromOutput(
  output: PhaseOutput | undefined,
): Array<{ slug: string; plan: string; wave?: number }> {
  if (!output) return [];
  const artifacts = output.artifacts as unknown as Record<string, unknown>;
  if (!artifacts || !Array.isArray(artifacts.features)) return [];

  const features: Array<{ slug: string; plan: string; wave?: number }> = [];
  for (const entry of artifacts.features) {
    if (
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as Record<string, unknown>)["feature-slug"] === "string"
    ) {
      const rec = entry as Record<string, unknown>;
      features.push({
        slug: rec["feature-slug"] as string,
        plan: typeof rec.plan === "string" ? rec.plan : "",
        wave: typeof rec.wave === "number" ? rec.wave : undefined,
      });
    }
  }
  return features;
}
```

- [ ] **Step 2: Update reconcileDesign to read `epic-slug` and extract content from artifact body**

In `reconcileDesign`, update lines 234-236 to read the new field name and extract content from the design artifact markdown body:

Add an import at the top of the file for `extractSectionFromFile`:
```typescript
import { extractSectionFromFile } from "../artifacts/reader.js";
```

Then update reconcileDesign:

```typescript
    const artifacts = output.artifacts as unknown as Record<string, unknown> | undefined;
    const realSlug = artifacts?.["epic-slug"] as string | undefined;
    const designPath = artifacts?.design as string | undefined;

    // Extract problem/solution from design artifact markdown body
    let summary: string | undefined;
    if (designPath) {
      const designFullPath = join(wtPath, ".beastmode", "artifacts", "design", designPath);
      const problem = await extractSectionFromFile(designFullPath, "Problem Statement");
      const solution = await extractSectionFromFile(designFullPath, "Solution");
      if (problem && solution) {
        summary = `${problem} — ${solution}`;
      }
    }
```

Then update line 243 (actor.send) to pass `summary` as the string instead of the object:
```typescript
    actor.send({ type: "DESIGN_COMPLETED", realSlug, summary, artifacts: eventArtifacts });
```

Update lines 257 and 285 where `summary` is stored — replace the object-formatting ternary with the direct string:
```typescript
        summary: summary ?? epic.summary,
```

- [ ] **Step 3: Update reconcileValidate to read `failed-features`**

In `reconcileValidate`, update line 508:
```typescript
      const failedFeatures = artifacts?.["failed-features"] as string[] | undefined;
```

- [ ] **Step 4: Update reconcilePlan to extract description from plan artifact body**

In `reconcilePlan`, after extracting features from output, add description extraction from plan artifact files. Update the feature creation loop to read description from the plan artifact body using `extractSectionFromFile`:

```typescript
    for (const f of features) {
      // Extract description from plan artifact body
      let description: string | undefined;
      if (f.plan) {
        const planFullPath = join(wtPath, ".beastmode", "artifacts", "plan", f.plan);
        description = await extractSectionFromFile(planFullPath, "What to Build")
          ?? await extractSectionFromFile(planFullPath, "Description");
      }

      const existing = store.listFeatures(epic.id).find(
        (ef) => ef.slug === f.slug || ef.name === f.slug,
      );
      let featureEntity: Feature;
      if (!existing) {
        featureEntity = store.addFeature({
          parent: epic.id,
          name: f.slug,
          description,
        });
        store.updateFeature(featureEntity.id, {
          ...(f.plan ? { plan: f.plan } : {}),
          ...(f.wave != null ? { wave: f.wave } : {}),
        });
      } else {
        // Update wave, plan, and description on existing features
        store.updateFeature(existing.id, {
          ...(f.plan ? { plan: f.plan } : {}),
          ...(f.wave != null ? { wave: f.wave } : {}),
          ...(description ? { description } : {}),
        });
        featureEntity = store.getFeature(existing.id)!;
      }
```

- [ ] **Step 5: Run tests to verify reconcile changes**

Run: `cd cli && bun --bun vitest run src/__tests__/reconcile-design-slug-suffix.test.ts -v`
Expected: Tests may fail due to mock output.json using old field names — that's expected, Task 2 fixes them.

- [ ] **Step 6: Commit**

```bash
git add cli/src/pipeline/reconcile.ts
git commit -m "feat(reconcile-content-extraction): update reconcile to use unified field names and extract content from artifact body"
```

---

### Task 2: Update reconcile unit tests to use unified field names

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/__tests__/reconcile-design.test.ts`
- Modify: `cli/src/__tests__/reconcile-design-slug-suffix.test.ts`

- [ ] **Step 1: Update reconcile-design.test.ts mock outputs**

All mock outputs in this file that use `slug` and `summary: { problem, solution }` need updating to `"epic-slug"` and no summary in artifacts. The summary will now be extracted from the design artifact body, but since the test mocks `loadWorktreePhaseOutput`, we don't have a real file to extract from. The tests that check summary should verify that when no artifact body exists, the summary falls back to `epic.summary`.

Update the mock output objects:

1. Test "returns undefined when entity not found" (line 73-83): Change `artifacts.slug` to `artifacts["epic-slug"]`, remove `summary` from artifacts.

2. Test "returns undefined when entity type is not epic" (line 93-101): Same changes.

3. Test "reconciles design normally when entity exists" (line 130-138): Change `artifacts.slug` to `artifacts["epic-slug"]`, remove `summary` from artifacts.

4. Test "handles slug rename during design reconciliation" (line 195-203): Change `artifacts.slug` to `artifacts["epic-slug"]`, remove `summary` from artifacts.

5. Test "includes progress when features exist" (line 261-269): Same changes.

For all tests: the mock artifacts should look like:
```typescript
artifacts: {
  "epic-slug": "test-slug",
  design: "/path/to/design.md",
},
```

- [ ] **Step 2: Update reconcile-design-slug-suffix.test.ts mock outputs**

Update the mock output objects that use `slug` and `summary`:

1. Test "should append hex suffix" (line 60-67): Change `slug` to `"epic-slug"`, remove `summary`.

2. Test "should preserve original slug" (line 80-84): Remove `summary`, no slug field.

3. Test "should rename git tags" (line 98-103): Change `slug` to `"epic-slug"`, remove `summary`.

4. Test "should produce slug matching pattern" (line 118-121): Change `slug` to `"epic-slug"`.

Mock artifacts should look like:
```typescript
artifacts: {
  "epic-slug": "dashboard-stats-persistence",
  design: "2026-04-11-dashboard-stats-persistence.md",
},
```

- [ ] **Step 3: Run reconcile tests**

Run: `cd cli && bun --bun vitest run src/__tests__/reconcile-design -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add cli/src/__tests__/reconcile-design.test.ts cli/src/__tests__/reconcile-design-slug-suffix.test.ts
git commit -m "test(reconcile-content-extraction): update reconcile tests to use unified field names"
```

---

### Task 3: Update BDD world artifact writers to use unified field names

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/features/support/world.ts:115-241`

- [ ] **Step 1: Update writeDesignArtifact**

The method receives a `fields` Record from Cucumber DataTables. The DataTables will be updated in Task 4 to use the new field names. The method already writes fields directly as frontmatter, so it just needs to use `fields["epic-slug"]` for the slug fallback and `fields["epic-slug"]` for the body heading:

```typescript
  writeDesignArtifact(wtPath: string, fields: Record<string, string>): void {
    const date = new Date().toISOString().slice(0, 10);
    const slug = fields["epic-slug"] ?? this.epicSlug;
    const dir = join(wtPath, ".beastmode", "artifacts", "design");
    mkdirSync(dir, { recursive: true });

    const frontmatter = Object.entries(fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    // Include Problem Statement and Solution sections in body for content extraction
    const problem = fields.problem ?? "";
    const solution = fields.solution ?? "";
    let body = `# ${fields["epic-slug"] ?? slug}\n\nDesign document.\n`;
    if (problem) {
      body = `# ${fields["epic-slug"] ?? slug}\n\n## Problem Statement\n\n${problem}\n\n## Solution\n\n${solution}\n`;
    }

    writeFileSync(
      join(dir, `${date}-${slug}.md`),
      `---\n${frontmatter}\n---\n\n${body}`,
    );
  }
```

Wait — the `fields` from the DataTable include `problem` and `solution` as frontmatter fields currently. After the update, they should NOT be in frontmatter but in the body. However, the `fields` Record gets directly serialized as frontmatter. We need to filter out `problem` and `solution` from the frontmatter entries.

Updated implementation:

```typescript
  writeDesignArtifact(wtPath: string, fields: Record<string, string>): void {
    const date = new Date().toISOString().slice(0, 10);
    const slug = fields["epic-slug"] ?? this.epicSlug;
    const dir = join(wtPath, ".beastmode", "artifacts", "design");
    mkdirSync(dir, { recursive: true });

    // Separate body content fields from frontmatter fields
    const bodyFields = new Set(["problem", "solution"]);
    const frontmatter = Object.entries(fields)
      .filter(([k]) => !bodyFields.has(k))
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    // Write problem/solution as markdown body sections (extracted by reconcile)
    const problem = fields.problem ?? "";
    const solution = fields.solution ?? "";
    let body = `# ${slug}\n\nDesign document.\n`;
    if (problem || solution) {
      body = `# ${slug}\n\n## Problem Statement\n\n${problem}\n\n## Solution\n\n${solution}\n`;
    }

    writeFileSync(
      join(dir, `${date}-${slug}.md`),
      `---\n${frontmatter}\n---\n\n${body}`,
    );
  }
```

- [ ] **Step 2: Update writePlanArtifacts**

Change frontmatter from `slug`/`epic`/`feature`/`description` to `epic-id`/`epic-slug`/`feature-slug`, and move description to body:

```typescript
  writePlanArtifacts(
    wtPath: string,
    epicSlug: string,
    features: Array<{ feature: string; wave: number; description: string }>,
  ): void {
    const date = new Date().toISOString().slice(0, 10);
    const dir = join(wtPath, ".beastmode", "artifacts", "plan");
    mkdirSync(dir, { recursive: true });

    for (const f of features) {
      const frontmatter = [
        `phase: plan`,
        `epic-slug: ${epicSlug}`,
        `feature-slug: ${f.feature}`,
        `wave: ${f.wave}`,
      ].join("\n");

      // Description goes in body as ## What to Build section
      const body = `# ${f.feature}\n\n## What to Build\n\n${f.description}\n`;

      writeFileSync(
        join(dir, `${date}-${epicSlug}-${f.feature}.md`),
        `---\n${frontmatter}\n---\n\n${body}`,
      );
    }
  }
```

- [ ] **Step 3: Update writeImplementArtifact**

Change `slug`/`epic`/`feature` to `epic-slug`/`feature-slug`:

```typescript
  writeImplementArtifact(wtPath: string, epicSlug: string, featureSlug: string): void {
    const date = new Date().toISOString().slice(0, 10);
    const dir = join(wtPath, ".beastmode", "artifacts", "implement");
    mkdirSync(dir, { recursive: true });

    const frontmatter = [
      `phase: implement`,
      `epic-slug: ${epicSlug}`,
      `feature-slug: ${featureSlug}`,
      `status: completed`,
    ].join("\n");

    writeFileSync(
      join(dir, `${date}-${epicSlug}-${featureSlug}.md`),
      `---\n${frontmatter}\n---\n\n# ${featureSlug}\n\nImplementation deviation log.\n`,
    );
  }
```

- [ ] **Step 4: Update writeValidateArtifact**

Change `slug`/`epic` to `epic-slug`:

```typescript
  writeValidateArtifact(wtPath: string, epicSlug: string, status: string): void {
    const date = new Date().toISOString().slice(0, 10);
    const dir = join(wtPath, ".beastmode", "artifacts", "validate");
    mkdirSync(dir, { recursive: true });

    const frontmatter = [
      `phase: validate`,
      `epic-slug: ${epicSlug}`,
      `status: ${status}`,
    ].join("\n");

    writeFileSync(
      join(dir, `${date}-${epicSlug}.md`),
      `---\n${frontmatter}\n---\n\n# Validation Report\n\nAll gates passed.\n`,
    );
  }
```

- [ ] **Step 5: Update writeValidateArtifactWithFailures**

Change `slug`/`epic`/`failedFeatures` to `epic-slug`/`failed-features`:

```typescript
  writeValidateArtifactWithFailures(
    wtPath: string,
    epicSlug: string,
    results: Array<{ feature: string; result: string }>,
  ): void {
    const date = new Date().toISOString().slice(0, 10);
    const dir = join(wtPath, ".beastmode", "artifacts", "validate");
    mkdirSync(dir, { recursive: true });

    const failedFeatures = results
      .filter((r) => r.result === "failed")
      .map((r) => r.feature);

    const allPassed = failedFeatures.length === 0;

    const frontmatter = [
      `phase: validate`,
      `epic-slug: ${epicSlug}`,
      `status: ${allPassed ? "passed" : "failed"}`,
      ...(failedFeatures.length > 0
        ? [`failed-features: ${failedFeatures.join(",")}`]
        : []),
    ].join("\n");

    writeFileSync(
      join(dir, `${date}-${epicSlug}.md`),
      `---\n${frontmatter}\n---\n\n# Validation Report\n\n## Results\n${results.map((r) => `- ${r.feature}: ${r.result}`).join("\n")}\n`,
    );
  }
```

- [ ] **Step 6: Update writeReleaseArtifact**

Change `slug`/`epic` to `epic-slug`:

```typescript
  writeReleaseArtifact(wtPath: string, epicSlug: string, bump: string): void {
    const date = new Date().toISOString().slice(0, 10);
    const dir = join(wtPath, ".beastmode", "artifacts", "release");
    mkdirSync(dir, { recursive: true });

    const frontmatter = [
      `phase: release`,
      `epic-slug: ${epicSlug}`,
      `bump: ${bump}`,
    ].join("\n");

    writeFileSync(
      join(dir, `${date}-${epicSlug}.md`),
      `---\n${frontmatter}\n---\n\n# Release Notes\n\n## Features\n\n- Widget auth via OAuth2\n`,
    );
  }
```

- [ ] **Step 7: Commit**

```bash
git add cli/features/support/world.ts
git commit -m "feat(reconcile-content-extraction): update BDD world artifact writers to use unified field names"
```

---

### Task 4: Update Cucumber feature files to use unified frontmatter field names

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/features/pipeline-happy-path.feature`
- Modify: `cli/features/design-slug-rename.feature`
- Modify: `cli/features/validate-feedback-loop.feature`
- Modify: `cli/features/regression-loop.feature`
- Modify: `cli/features/static-hitl-hooks.feature`
- Modify: `cli/features/pipeline-error-resilience.feature`
- Modify: `cli/features/hitl-hook-lifecycle.feature`
- Modify: `cli/features/file-permissions-logging.feature`
- Modify: `cli/features/file-permissions-config.feature`
- Modify: `cli/features/file-permissions-hooks.feature`
- Modify: `cli/features/file-permissions-lifecycle.feature`

- [ ] **Step 1: Update all design artifact DataTables**

In every Cucumber `.feature` file that has a "dispatch will write a design artifact" step with a DataTable, update:
- `slug` -> `epic-slug`
- `epic` -> (remove, redundant with epic-slug)
- Keep `problem` and `solution` (these become body content via world.ts, not frontmatter)
- Add `phase: design` if not already present

Before (typical):
```gherkin
| phase    | design          |
| slug     | my-feature      |
| epic     | my-feature      |
| problem  | Thing is broken |
| solution | Fix the thing   |
```

After:
```gherkin
| phase     | design          |
| epic-slug | my-feature      |
| problem   | Thing is broken |
| solution  | Fix the thing   |
```

Apply this transformation to all 11 feature files listed above.

- [ ] **Step 2: Verify no old field names remain**

Run: `cd cli && grep -rn "| slug " features/*.feature` and `grep -rn "| epic " features/*.feature`
Expected: No matches (all replaced with `epic-slug` / `feature-slug`)

Note: `| epic-slug |` will match `grep "| epic "` — only check for `| epic |` specifically (with trailing pipe or space-pipe pattern indicating end of key column). Better: `grep -P '^\s*\|\s+slug\s+\|' features/*.feature`

- [ ] **Step 3: Commit**

```bash
git add cli/features/*.feature
git commit -m "feat(reconcile-content-extraction): update Cucumber feature files to unified frontmatter field names"
```

---

### Task 5: Run full test suite to verify end-to-end integration

**Wave:** 3
**Depends on:** Task 1, Task 2, Task 3, Task 4

**Files:**
- (no new files — verification only)

- [ ] **Step 1: Run vitest unit tests**

Run: `cd cli && bun --bun vitest run -v`
Expected: PASS

- [ ] **Step 2: Run Cucumber BDD tests**

Run: `cd cli && bun --bun vitest run --config vitest.cucumber.config.ts -v`
(Or the appropriate cucumber command from the project)

Expected: PASS — The full pipeline path should work: Cucumber DataTables -> world.ts artifact writers -> session-stop hook -> output.json -> reconcile -> store.

- [ ] **Step 3: Verify store entities populated correctly**

Check that the pipeline-happy-path scenario exercises:
1. Design phase: epic.summary is populated from artifact body (not from output.json summary field)
2. Plan phase: feature.description is populated from plan artifact body (not from output.json description field)
3. Validate phase: failed-features correctly read from output.json

- [ ] **Step 4: Commit any fixes discovered during verification**

If tests reveal issues, fix them and commit:
```bash
git add -A
git commit -m "fix(reconcile-content-extraction): address integration test findings"
```
