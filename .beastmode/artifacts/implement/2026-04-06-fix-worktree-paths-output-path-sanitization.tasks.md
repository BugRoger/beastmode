# Output Path Sanitization — Tasks

## Goal

Apply `basename(artifactPath)` in three switch cases within `buildOutput` (design, validate, release) so that the epic store always contains bare filenames — not absolute worktree paths that become stale after rename or cleanup.

## Architecture

- **Path contract**: Store bare filenames in epic/feature store fields. Readers prefix the known artifact directory at read time.
- **No shared utility**: Each phase case already knows its own artifact directory. `basename()` is already imported in `generate-output.ts`.
- **No store migration**: `basename()` is a universal adapter — it produces the correct filename regardless of what format the store contains.

## Tech Stack

- TypeScript, Bun runtime
- vitest for unit tests, Cucumber.js for integration tests
- Test command: `bun --bun vitest run`
- Integration test command: `bun --bun node_modules/.bin/cucumber-js`

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/hooks/generate-output.ts` | Modify | Apply `basename()` to `artifactPath` in design, validate, release cases |
| `cli/src/__tests__/generate-output.test.ts` | Modify | Add unit tests for absolute path stripping in all three cases |
| `cli/features/output-path-sanitization.feature` | Create | Integration test (Gherkin) for BDD verification |
| `cli/features/step_definitions/output-path-sanitization.steps.ts` | Create | Step definitions for the integration test |

---

### Task 0: Integration Test (BDD — RED state)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/features/output-path-sanitization.feature`
- Create: `cli/features/step_definitions/output-path-sanitization.steps.ts`

- [x] **Step 1: Write the Gherkin feature file**

Create `cli/features/output-path-sanitization.feature`:

```gherkin
@fix-worktree-paths
Feature: Build output stores bare filenames for artifact paths

  The buildOutput function produces the output record consumed by
  the store. Artifact path fields must contain bare filenames (no
  directory prefix, no absolute path) so downstream readers can
  resolve them against the known artifact directory.

  Scenario: Design phase output stores bare filename for artifact path
    Given a design artifact at absolute path "/worktree/.beastmode/artifacts/design/2026-04-06-test.md"
    When buildOutput processes the design artifact
    Then the output design artifact field is "2026-04-06-test.md"
    And the output design artifact field does not contain "/"

  Scenario: Validate phase output stores bare filename for report path
    Given a validate artifact at absolute path "/worktree/.beastmode/artifacts/validate/2026-04-06-test.md"
    When buildOutput processes the validate artifact
    Then the output report field is "2026-04-06-test.md"
    And the output report field does not contain "/"

  Scenario: Release phase output stores bare filename for changelog path
    Given a release artifact at absolute path "/worktree/.beastmode/artifacts/release/2026-04-06-test.md"
    When buildOutput processes the release artifact
    Then the output changelog field is "2026-04-06-test.md"
    And the output changelog field does not contain "/"

  Scenario: buildOutput preserves bare filename input unchanged
    Given a design artifact at absolute path "2026-04-06-epic.md"
    When buildOutput processes the design artifact
    Then the output design artifact field is "2026-04-06-epic.md"

  Scenario: Plan phase scan already stores bare filenames
    Given plan artifacts exist for epic "test-epic" with features "alpha" and "beta"
    When the plan features are scanned for epic "test-epic"
    Then each feature plan field is a bare filename
```

- [x] **Step 2: Write the step definitions**

Create `cli/features/step_definitions/output-path-sanitization.steps.ts`:

```typescript
/**
 * Step definitions for output path sanitization integration test.
 *
 * Exercises the real buildOutput and scanPlanFeatures functions — no mocks.
 * Verifies artifact path fields contain bare filenames, never absolute paths.
 */

import { Given, When, Then, Before, After } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildOutput, scanPlanFeatures } from "../../src/hooks/generate-output.js";

interface OutputPathWorld {
  artifactPath: string;
  phase: string;
  output: ReturnType<typeof buildOutput>;
  artifactsDir: string;
  features: Array<{ slug: string; plan: string; wave?: number }>;
}

const TEST_ROOT = resolve(import.meta.dirname, "../../../.test-output-path-sanitization");
const ARTIFACTS_DIR = join(TEST_ROOT, ".beastmode", "artifacts");

Before(function (this: OutputPathWorld) {
  if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
  for (const phase of ["design", "plan", "implement", "validate", "release"]) {
    mkdirSync(join(ARTIFACTS_DIR, phase), { recursive: true });
  }
  this.artifactsDir = ARTIFACTS_DIR;
});

After(function () {
  if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
});

// --- Given ---

Given("a design artifact at absolute path {string}", function (this: OutputPathWorld, path: string) {
  this.artifactPath = path;
  this.phase = "design";
});

Given("a validate artifact at absolute path {string}", function (this: OutputPathWorld, path: string) {
  this.artifactPath = path;
  this.phase = "validate";
});

Given("a release artifact at absolute path {string}", function (this: OutputPathWorld, path: string) {
  this.artifactPath = path;
  this.phase = "release";
});

Given(
  "plan artifacts exist for epic {string} with features {string} and {string}",
  function (this: OutputPathWorld, epic: string, feat1: string, feat2: string) {
    this.phase = "plan";
    for (const feat of [feat1, feat2]) {
      const filename = `2026-04-06-${epic}-${feat}.md`;
      const content = `---\nphase: plan\nepic: ${epic}\nfeature: ${feat}\n---\n# ${feat}`;
      writeFileSync(join(ARTIFACTS_DIR, "plan", filename), content);
    }
  },
);

// --- When ---

When("buildOutput processes the design artifact", function (this: OutputPathWorld) {
  this.output = buildOutput(this.artifactPath, { phase: "design", slug: "test" }, this.artifactsDir);
});

When("buildOutput processes the validate artifact", function (this: OutputPathWorld) {
  this.output = buildOutput(this.artifactPath, { phase: "validate" }, this.artifactsDir);
});

When("buildOutput processes the release artifact", function (this: OutputPathWorld) {
  this.output = buildOutput(this.artifactPath, { phase: "release" }, this.artifactsDir);
});

When("the plan features are scanned for epic {string}", function (this: OutputPathWorld, epic: string) {
  this.features = scanPlanFeatures(this.artifactsDir, epic);
});

// --- Then ---

Then("the output design artifact field is {string}", function (this: OutputPathWorld, expected: string) {
  assert.ok(this.output, "buildOutput returned undefined");
  const artifacts = this.output.artifacts as Record<string, unknown>;
  assert.strictEqual(artifacts.design, expected);
});

Then("the output design artifact field does not contain {string}", function (this: OutputPathWorld, char: string) {
  assert.ok(this.output, "buildOutput returned undefined");
  const artifacts = this.output.artifacts as Record<string, unknown>;
  const value = artifacts.design as string;
  assert.ok(!value.includes(char), `Expected design field "${value}" to not contain "${char}"`);
});

Then("the output report field is {string}", function (this: OutputPathWorld, expected: string) {
  assert.ok(this.output, "buildOutput returned undefined");
  const artifacts = this.output.artifacts as Record<string, unknown>;
  assert.strictEqual(artifacts.report, expected);
});

Then("the output report field does not contain {string}", function (this: OutputPathWorld, char: string) {
  assert.ok(this.output, "buildOutput returned undefined");
  const artifacts = this.output.artifacts as Record<string, unknown>;
  const value = artifacts.report as string;
  assert.ok(!value.includes(char), `Expected report field "${value}" to not contain "${char}"`);
});

Then("the output changelog field is {string}", function (this: OutputPathWorld, expected: string) {
  assert.ok(this.output, "buildOutput returned undefined");
  const artifacts = this.output.artifacts as Record<string, unknown>;
  assert.strictEqual(artifacts.changelog, expected);
});

Then("the output changelog field does not contain {string}", function (this: OutputPathWorld, char: string) {
  assert.ok(this.output, "buildOutput returned undefined");
  const artifacts = this.output.artifacts as Record<string, unknown>;
  const value = artifacts.changelog as string;
  assert.ok(!value.includes(char), `Expected changelog field "${value}" to not contain "${char}"`);
});

Then("each feature plan field is a bare filename", function (this: OutputPathWorld) {
  assert.ok(this.features.length > 0, "No features found");
  for (const feat of this.features) {
    assert.ok(!feat.plan.includes("/"), `Feature plan "${feat.plan}" contains a directory separator`);
  }
});
```

- [x] **Step 3: Run integration test to verify RED state**

Run: `cd cli && bun --bun node_modules/.bin/cucumber-js features/output-path-sanitization.feature --require 'features/step_definitions/output-path-sanitization.steps.ts' --require 'features/support/hooks.ts'`
Expected: FAIL — design/validate/release scenarios fail because `buildOutput` still stores full paths

- [x] **Step 4: Commit**

```bash
git add cli/features/output-path-sanitization.feature cli/features/step_definitions/output-path-sanitization.steps.ts
git commit -m "test(output-path-sanitization): add integration test — RED state"
```

---

### Task 1: Apply basename() to buildOutput and add unit tests

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/hooks/generate-output.ts:77-129`
- Modify: `cli/src/__tests__/generate-output.test.ts:76-143`

- [x] **Step 1: Write the failing unit tests**

Add to `cli/src/__tests__/generate-output.test.ts` inside the existing `describe("buildOutput", ...)` block, after the "unknown phase returns undefined" test (line 143):

```typescript
  test("design phase strips directory prefix from absolute path", () => {
    const output = buildOutput(
      "/worktree/.beastmode/artifacts/design/2026-04-06-epic.md",
      { phase: "design", slug: "abc123", epic: "my-epic" },
      ARTIFACTS_DIR,
    );
    expect(output?.artifacts).toMatchObject({ design: "2026-04-06-epic.md" });
  });

  test("design phase preserves bare filename unchanged", () => {
    const output = buildOutput(
      "2026-04-06-epic.md",
      { phase: "design", slug: "abc123", epic: "my-epic" },
      ARTIFACTS_DIR,
    );
    expect(output?.artifacts).toMatchObject({ design: "2026-04-06-epic.md" });
  });

  test("validate phase strips directory prefix from absolute path", () => {
    const output = buildOutput(
      "/worktree/.beastmode/artifacts/validate/2026-04-06-report.md",
      { phase: "validate" },
      ARTIFACTS_DIR,
    );
    expect(output?.artifacts).toMatchObject({ report: "2026-04-06-report.md" });
  });

  test("validate phase preserves bare filename unchanged", () => {
    const output = buildOutput(
      "2026-04-06-report.md",
      { phase: "validate" },
      ARTIFACTS_DIR,
    );
    expect(output?.artifacts).toMatchObject({ report: "2026-04-06-report.md" });
  });

  test("release phase strips directory prefix from absolute path", () => {
    const output = buildOutput(
      "/worktree/.beastmode/artifacts/release/2026-04-06-changelog.md",
      { phase: "release", bump: "minor" },
      ARTIFACTS_DIR,
    );
    expect(output?.artifacts).toMatchObject({ changelog: "2026-04-06-changelog.md" });
  });

  test("release phase preserves bare filename unchanged", () => {
    const output = buildOutput(
      "2026-04-06-changelog.md",
      { phase: "release", bump: "minor" },
      ARTIFACTS_DIR,
    );
    expect(output?.artifacts).toMatchObject({ changelog: "2026-04-06-changelog.md" });
  });
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/generate-output.test.ts`
Expected: FAIL — the three "strips directory prefix" tests fail because `buildOutput` stores the full path

- [x] **Step 3: Apply basename() to the three switch cases**

In `cli/src/hooks/generate-output.ts`, modify the three cases:

**Design case (line 83):** Change `design: artifactPath` to `design: basename(artifactPath)`
**Validate case (line 115):** Change `report: artifactPath` to `report: basename(artifactPath)`
**Release case (line 127):** Change `changelog: artifactPath` to `changelog: basename(artifactPath)`

- [x] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/generate-output.test.ts`
Expected: PASS — all tests pass including the new ones

- [x] **Step 5: Update existing test expectations**

The existing tests at lines 78-83, 86-88, 90-96, 111-117, 119-125, 127-133, 135-138, 146-165 use bare filenames like `"path/to/design.md"` and `"validate.md"` as input. After applying `basename()`:
- `"path/to/design.md"` → stored as `"design.md"` (existing test at line 81 expects `"path/to/design.md"` — must update to `"design.md"`)
- `"validate.md"` → stored as `"validate.md"` (already bare, no change)
- `"release.md"` → stored as `"release.md"` (already bare, no change)

Update these existing test expectations:
- Line 78-83: Change expected `design: "path/to/design.md"` to `design: "design.md"`
- Line 91-95: Change expected `design: "path/to/design.md"` to `design: "design.md"`
- Line 270: Change expected `.design` assertion from `toBe(path)` to `toBe("2026-03-30-my-epic.md")` (processArtifact test)

- [x] **Step 6: Run full test suite to verify no regressions**

Run: `cd cli && bun --bun vitest run src/__tests__/generate-output.test.ts`
Expected: PASS — all existing and new tests pass

- [x] **Step 7: Commit**

```bash
git add cli/src/hooks/generate-output.ts cli/src/__tests__/generate-output.test.ts
git commit -m "feat(output-path-sanitization): apply basename() to buildOutput design/validate/release cases"
```
