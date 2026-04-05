# field-mapping-fix — Implementation Tasks

## Goal

Fix the `syncGitHubForEpic` bridge function to correctly map store entity fields to sync input types:
1. Map `epicEntity.status` to `EpicSyncInput.phase` (fixes `phase/undefined`)
2. Build `artifacts` record from flat store fields (`design`, `plan`, `implement`, `validate`, `release`)
3. Normalize artifact paths to repo-relative form
4. Populate feature body enrichment fields from plan artifacts
5. Use `{epicName}: {featureSlug}` title format in early-issues
6. Normalize all artifact link URLs to repo-relative paths

## Architecture

- **Store types** (`cli/src/store/types.ts`): `Epic` has `status: EpicStatus` and flat phase fields (`design?`, `plan?`, etc.)
- **Sync input** (`cli/src/github/sync.ts`): `EpicSyncInput` has `phase: Phase` and `artifacts?: Record<string, string[]>`
- **Bridge** (`cli/src/github/sync.ts:884-956`): `syncGitHubForEpic` converts store entities to sync inputs
- **Early issues** (`cli/src/github/early-issues.ts`): Creates stub issues before dispatch
- **Section extraction** (`cli/src/artifacts/reader.ts`): `extractSection`/`extractSections` parse markdown headings
- **Body formatting** (`cli/src/github/sync.ts:115-211`): Pure functions `formatEpicBody`, `formatFeatureBody`
- **Test runner**: `bun --bun vitest run` from `cli/` directory

## Tech Stack

- TypeScript, Bun runtime, Vitest test runner
- Path module: `resolve` imported, `relative`/`isAbsolute` needed

## File Structure

- **Modify**: `cli/src/github/sync.ts` — fix bridge mapping, add path normalization import, fix artifact construction
- **Modify**: `cli/src/github/early-issues.ts` — use `featureTitle()` for feature stub issue titles, use `epicTitle()` for epic stubs
- **Modify**: `cli/src/__tests__/sync-helper.test.ts` — add/update tests for field mapping fixes
- **Create**: `cli/src/__tests__/field-mapping-fix.integration.test.ts` — integration test from Gherkin scenarios

---

### Task 0: Integration Test (BDD RED)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/field-mapping-fix.integration.test.ts`

- [x] **Step 1: Write the integration test file**

```typescript
/**
 * Integration test: field-mapping-fix
 *
 * Verifies that syncGitHubForEpic correctly maps store fields to sync inputs,
 * including phase labels, feature titles, and artifact path normalization.
 *
 * @github-sync-again
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { InMemoryTaskStore } from "../store/in-memory";
import { saveSyncRefs, loadSyncRefs } from "../github/sync-refs";

// --- Mock gh CLI ---
const mockCalls: { fn: string; args: unknown[] }[] = [];

function trackCall(fn: string, ...args: unknown[]): void {
  mockCalls.push({ fn, args });
}

function callsTo(fn: string): { fn: string; args: unknown[] }[] {
  return mockCalls.filter((c) => c.fn === fn);
}

vi.mock("../github/cli", () => ({
  ghIssueCreate: async (...args: unknown[]) => {
    trackCall("ghIssueCreate", ...args);
    return 42;
  },
  ghIssueEdit: async (...args: unknown[]) => {
    trackCall("ghIssueEdit", ...args);
    return true;
  },
  ghIssueClose: async (...args: unknown[]) => {
    trackCall("ghIssueClose", ...args);
    return true;
  },
  ghIssueReopen: async () => true,
  ghIssueComment: async () => true,
  ghIssueComments: async () => [],
  ghIssueState: async () => "open",
  ghIssueLabels: async (...args: unknown[]) => {
    trackCall("ghIssueLabels", ...args);
    return ["type/epic", "phase/implement"];
  },
  ghProjectItemAdd: async () => "item-123",
  ghProjectItemDelete: async () => true,
  ghProjectSetField: async () => true,
  ghSubIssueAdd: async () => true,
}));

vi.mock("../github/discovery", () => ({
  discoverGitHub: async () => ({
    repo: "org/repo",
    projectNumber: 7,
    projectId: "PVT_123",
  }),
}));

vi.mock("../config", () => ({
  loadConfig: () => ({
    github: { enabled: true, "project-name": "Test Board" },
    cli: { interval: 60 },
  }),
}));

const { syncGitHubForEpic } = await import("../github/sync");

describe("field-mapping-fix integration", () => {
  let tmpDir: string;
  let store: InMemoryTaskStore;
  let epicId: string;

  beforeEach(() => {
    mockCalls.length = 0;
    tmpDir = mkdtempSync(join(tmpdir(), "field-mapping-fix-"));
    store = new InMemoryTaskStore();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // --- Phase label from store status ---

  describe("Issue creation succeeds with correct phase label from store", () => {
    test("Epic issue creation uses correct phase label from store status", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      store.updateEpic(epic.id, { status: "design" });
      epicId = epic.id;

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      // Should create epic issue with phase/design label (not phase/undefined)
      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls.length).toBeGreaterThanOrEqual(1);

      // First create call is the epic — check labels argument (index 3)
      const epicCreateCall = createCalls[0];
      const labels = epicCreateCall.args[3] as string[];
      expect(labels).toContain("phase/design");
      expect(labels).not.toContain("phase/undefined");
    });

    test("Feature issue creation uses correct phase label from store", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      store.updateEpic(epic.id, { status: "implement" });
      epicId = epic.id;

      // Pre-populate epic ref
      saveSyncRefs(tmpDir, { [epicId]: { issue: 10 } });

      // Add features
      store.addFeature({ parent: epicId, name: "Feature A", slug: "feature-a" });
      store.addFeature({ parent: epicId, name: "Feature B", slug: "feature-b" });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      // Feature create calls should use status/ready labels (not phase/undefined)
      const createCalls = callsTo("ghIssueCreate");
      for (const call of createCalls) {
        const labels = call.args[3] as string[];
        expect(labels).not.toContain("phase/undefined");
      }
    });

    test("Phase label updates when status changes in store", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      store.updateEpic(epic.id, { status: "plan" });
      epicId = epic.id;

      // Pre-populate epic ref (existing issue)
      saveSyncRefs(tmpDir, { [epicId]: { issue: 10, bodyHash: "old" } });

      // Mock labels to return stale phase
      const origLabels = vi.mocked(await import("../github/cli")).ghIssueLabels;

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      // Should call ghIssueEdit to update phase label to phase/plan
      const editCalls = callsTo("ghIssueEdit");
      const labelEditCall = editCalls.find((c) => {
        const opts = c.args[2] as Record<string, unknown>;
        return opts.addLabels !== undefined;
      });
      if (labelEditCall) {
        const opts = labelEditCall.args[2] as { addLabels?: string[] };
        expect(opts.addLabels).toContain("phase/plan");
      }
    });
  });

  // --- Feature titles ---

  describe("Feature issue titles include epic name prefix", () => {
    test("Feature issue title uses epic-prefixed format", async () => {
      const epic = store.addEpic({ name: "auth-system", slug: "auth-system" });
      store.updateEpic(epic.id, { status: "implement" });
      epicId = epic.id;

      saveSyncRefs(tmpDir, { [epicId]: { issue: 10 } });
      store.addFeature({ parent: epicId, name: "login-flow", slug: "login-flow" });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId,
        epicSlug: "auth-system",
        store,
        resolved: { repo: "org/repo" },
      });

      // Feature create call should use "auth-system: login-flow" as title
      const createCalls = callsTo("ghIssueCreate");
      const featureCreate = createCalls.find((c) => {
        const title = c.args[1] as string;
        return title.includes("login-flow");
      });
      expect(featureCreate).toBeDefined();
      const title = featureCreate!.args[1] as string;
      expect(title).toBe("auth-system: login-flow");
    });

    test("Multiple features in same epic have distinct epic-prefixed titles", async () => {
      const epic = store.addEpic({ name: "data-pipeline", slug: "data-pipeline" });
      store.updateEpic(epic.id, { status: "implement" });
      epicId = epic.id;

      saveSyncRefs(tmpDir, { [epicId]: { issue: 10 } });
      store.addFeature({ parent: epicId, name: "ingestion", slug: "ingestion" });
      store.addFeature({ parent: epicId, name: "transform", slug: "transform" });
      store.addFeature({ parent: epicId, name: "export", slug: "export" });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId,
        epicSlug: "data-pipeline",
        store,
        resolved: { repo: "org/repo" },
      });

      const createCalls = callsTo("ghIssueCreate");
      const titles = createCalls.map((c) => c.args[1] as string);
      expect(titles).toContain("data-pipeline: ingestion");
      expect(titles).toContain("data-pipeline: transform");
      expect(titles).toContain("data-pipeline: export");
    });
  });

  // --- Artifact path normalization ---

  describe("Artifact link URLs use repo-relative paths on GitHub", () => {
    test("Epic issue body contains repo-relative artifact link", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      store.updateEpic(epic.id, {
        status: "plan",
        design: ".beastmode/artifacts/design/2026-04-05-example.md",
      });
      epicId = epic.id;

      // Create the design artifact file
      const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
      mkdirSync(designDir, { recursive: true });
      writeFileSync(
        join(designDir, "2026-04-05-example.md"),
        "---\nphase: design\n---\n\n## Problem Statement\n\nTest problem.\n\n## Solution\n\nTest solution.\n",
      );

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      // Epic body should contain repo-relative path, not absolute
      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls.length).toBeGreaterThanOrEqual(1);
      const body = createCalls[0].args[2] as string;
      expect(body).not.toContain(tmpDir);
      // Should contain the repo-relative design path
      expect(body).toContain(".beastmode/artifacts/design/2026-04-05-example.md");
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails (RED)**

Run: `cd cli && bun --bun vitest run src/__tests__/field-mapping-fix.integration.test.ts`
Expected: FAIL — `epicEntity.phase` is undefined because store has `status`, and `epicEntity.artifacts` is undefined because store has flat fields.

- [x] **Step 3: Commit**

```bash
git add cli/src/__tests__/field-mapping-fix.integration.test.ts
git commit -m "test(field-mapping-fix): add integration tests for store field mapping (RED)"
```

---

### Task 1: Fix Phase Field Mapping and Artifacts Construction

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/github/sync.ts:29,915,924`

- [x] **Step 1: Write the failing unit test**

Add to `cli/src/__tests__/sync-helper.test.ts`:

```typescript
test("maps epicEntity.status to EpicSyncInput.phase", async () => {
  // Store epic has status: "design" (not phase)
  const epic = store.addEpic({ name: "Phase Test", slug: "phase-test" });
  store.updateEpic(epic.id, { status: "design" });

  await syncGitHubForEpic({
    projectRoot: tmpDir,
    epicId: epic.id,
    epicSlug: "phase-test",
    store,
    resolved: { repo: "org/repo" },
  });

  // Should create epic with phase/design label
  const createCalls = callsTo("ghIssueCreate");
  expect(createCalls.length).toBeGreaterThanOrEqual(1);
  const labels = createCalls[0].args[3] as string[];
  expect(labels).toContain("phase/design");
  expect(labels).not.toContain("phase/undefined");
});

test("builds artifacts record from flat store fields", async () => {
  const epic = store.addEpic({ name: "Artifacts Test", slug: "artifacts-test" });
  store.updateEpic(epic.id, {
    status: "plan",
    design: ".beastmode/artifacts/design/2026-04-05-test.md",
  });

  // Create the design artifact so readPrdSections can find it
  const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
  const { mkdirSync, writeFileSync } = await import("fs");
  mkdirSync(designDir, { recursive: true });
  writeFileSync(
    join(designDir, "2026-04-05-test.md"),
    "---\nphase: design\n---\n\n## Problem Statement\n\nTest problem.\n\n## Solution\n\nTest solution.\n",
  );

  await syncGitHubForEpic({
    projectRoot: tmpDir,
    epicId: epic.id,
    epicSlug: "artifacts-test",
    store,
    resolved: { repo: "org/repo" },
  });

  // Epic body should contain the design artifact content (proves artifacts map was built)
  const createCalls = callsTo("ghIssueCreate");
  expect(createCalls.length).toBeGreaterThanOrEqual(1);
  const body = createCalls[0].args[2] as string;
  expect(body).toContain("Test problem.");
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-helper.test.ts`
Expected: FAIL — `epicEntity.phase` is undefined, `epicEntity.artifacts` is undefined.

- [x] **Step 3: Fix the bridge in syncGitHubForEpic**

In `cli/src/github/sync.ts`:

1. Add `relative` and `isAbsolute` to the path import (line 29):
   Change `import { resolve } from "path";` to `import { resolve, relative, isAbsolute } from "path";`

2. Fix phase mapping (line 915):
   Change `phase: epicEntity.phase,` to `phase: epicEntity.status,`

3. Replace the artifacts line (line 924) with artifact map construction:
   Change `artifacts: epicEntity.artifacts,` to:
   ```typescript
   artifacts: buildArtifactsMap(epicEntity),
   ```

4. Add the `buildArtifactsMap` helper function before `syncGitHubForEpic`:

```typescript
/**
 * Build an artifacts record from the store epic's flat phase fields.
 * Maps { design?: string, plan?: string, ... } to Record<string, string[]>.
 */
function buildArtifactsMap(
  entity: { design?: string; plan?: string; implement?: string; validate?: string; release?: string },
): Record<string, string[]> | undefined {
  const map: Record<string, string[]> = {};
  const phases = ["design", "plan", "implement", "validate", "release"] as const;
  for (const phase of phases) {
    const path = entity[phase];
    if (path) {
      map[phase] = [path];
    }
  }
  return Object.keys(map).length > 0 ? map : undefined;
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-helper.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add cli/src/github/sync.ts cli/src/__tests__/sync-helper.test.ts
git commit -m "fix(sync): map store status to phase, build artifacts from flat fields"
```

---

### Task 2: Normalize Artifact Paths to Repo-Relative

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/github/sync.ts:352-385,391-421`

- [ ] **Step 1: Write the failing unit test**

Add to `cli/src/__tests__/sync-helper.test.ts`:

```typescript
test("normalizes absolute artifact paths to repo-relative", async () => {
  const epic = store.addEpic({ name: "Path Test", slug: "path-test" });
  // Store an absolute path as the design artifact
  const absPath = join(tmpDir, ".beastmode", "artifacts", "design", "2026-04-05-test.md");
  store.updateEpic(epic.id, {
    status: "plan",
    design: absPath,
  });

  // Create the design artifact
  const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
  const { mkdirSync, writeFileSync } = await import("fs");
  mkdirSync(designDir, { recursive: true });
  writeFileSync(absPath, "---\nphase: design\n---\n\n## Problem Statement\n\nPath test.\n");

  await syncGitHubForEpic({
    projectRoot: tmpDir,
    epicId: epic.id,
    epicSlug: "path-test",
    store,
    resolved: { repo: "org/repo" },
  });

  const createCalls = callsTo("ghIssueCreate");
  expect(createCalls.length).toBeGreaterThanOrEqual(1);
  const body = createCalls[0].args[2] as string;
  // Body should NOT contain the absolute tmpDir path
  expect(body).not.toContain(tmpDir);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-helper.test.ts`
Expected: FAIL — absolute paths pass through to issue body.

- [ ] **Step 3: Add path normalization to buildArtifactsMap**

In `cli/src/github/sync.ts`, update `buildArtifactsMap` to accept `projectRoot` and normalize:

```typescript
/**
 * Build an artifacts record from the store epic's flat phase fields.
 * Maps { design?: string, plan?: string, ... } to Record<string, string[]>.
 * Normalizes absolute paths to repo-relative.
 */
function buildArtifactsMap(
  entity: { design?: string; plan?: string; implement?: string; validate?: string; release?: string },
  projectRoot?: string,
): Record<string, string[]> | undefined {
  const map: Record<string, string[]> = {};
  const phases = ["design", "plan", "implement", "validate", "release"] as const;
  for (const phase of phases) {
    const rawPath = entity[phase];
    if (rawPath) {
      const normalized = projectRoot && isAbsolute(rawPath)
        ? relative(projectRoot, rawPath)
        : rawPath;
      map[phase] = [normalized];
    }
  }
  return Object.keys(map).length > 0 ? map : undefined;
}
```

Update the call site in `syncGitHubForEpic` (line ~924):
```typescript
artifacts: buildArtifactsMap(epicEntity, opts.projectRoot),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-helper.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/github/sync.ts cli/src/__tests__/sync-helper.test.ts
git commit -m "fix(sync): normalize absolute artifact paths to repo-relative"
```

---

### Task 3: Feature Title Format in Early Issues

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/github/early-issues.ts:17,72-73,104-107`

- [ ] **Step 1: Write the failing unit test**

Create test in `cli/src/__tests__/sync-helper.test.ts`:

```typescript
describe("early-issues feature title format", () => {
  // This test verifies the early-issues module uses featureTitle format
  // The actual fix is in early-issues.ts — we test via the sync flow
  test("feature title includes epic name prefix in sync flow", async () => {
    const epic = store.addEpic({ name: "my-epic", slug: "my-epic" });
    store.updateEpic(epic.id, { status: "implement" });
    epicId = epic.id;

    saveSyncRefs(tmpDir, { [epicId]: { issue: 10 } });
    store.addFeature({ parent: epicId, name: "my-feature", slug: "my-feature" });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId,
      epicSlug: "my-epic",
      store,
      resolved: { repo: "org/repo" },
    });

    // The sync engine creates features with featureTitle(epicName, slug)
    const createCalls = callsTo("ghIssueCreate");
    const featureCreate = createCalls.find((c) => {
      const title = c.args[1] as string;
      return title.includes("my-feature");
    });
    expect(featureCreate).toBeDefined();
    expect(featureCreate!.args[1]).toBe("my-epic: my-feature");
  });
});
```

- [ ] **Step 2: Run test to verify it passes (sync engine already uses featureTitle)**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-helper.test.ts`
Expected: PASS (the sync engine at line 702 already uses `featureTitle(epicName, feature.slug)`)

- [ ] **Step 3: Fix early-issues.ts to use featureTitle format**

In `cli/src/github/early-issues.ts`:

1. Add import for `featureTitle` and `epicTitle` (after line 17):
   ```typescript
   import { featureTitle, epicTitle } from "./sync.js";
   ```

2. Change epic stub title (line 73):
   From: `epic.slug,`
   To: `epicTitle(epic.slug, epic.name),`

3. Change feature stub title (line 107):
   From: `feature.slug,`
   To: `featureTitle(epic.name, feature.slug),`

- [ ] **Step 4: Run the full test suite to verify no regressions**

Run: `cd cli && bun --bun vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/github/early-issues.ts cli/src/__tests__/sync-helper.test.ts
git commit -m "fix(early-issues): use epic-prefixed titles for stub issues"
```

---

### Task 4: Feature Plan Content Extraction in Bridge

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/github/sync.ts:917-923`

- [ ] **Step 1: Write the failing unit test**

Add to `cli/src/__tests__/sync-helper.test.ts`:

```typescript
test("feature plan content populates feature body enrichment", async () => {
  const epic = store.addEpic({ name: "Enrich Test", slug: "enrich-test" });
  store.updateEpic(epic.id, { status: "implement" });
  epicId = epic.id;

  // Add feature with plan path
  const feat = store.addFeature({
    parent: epicId,
    name: "my-feat",
    slug: "my-feat",
    description: "A cool feature",
  });
  store.updateFeature(feat.id, {
    plan: ".beastmode/artifacts/plan/2026-04-05-enrich-test-my-feat.md",
  });

  // Pre-populate epic ref
  saveSyncRefs(tmpDir, { [epicId]: { issue: 10 } });

  // Create plan artifact
  const planDir = join(tmpDir, ".beastmode", "artifacts", "plan");
  const { mkdirSync, writeFileSync } = await import("fs");
  mkdirSync(planDir, { recursive: true });
  writeFileSync(
    join(planDir, "2026-04-05-enrich-test-my-feat.md"),
    `---
phase: plan
---

## User Stories

1. As a user, I want to test enrichment.

## What to Build

Build the enrichment pipeline.

## Acceptance Criteria

- [ ] Enrichment works
`,
  );

  await syncGitHubForEpic({
    projectRoot: tmpDir,
    epicId,
    epicSlug: "enrich-test",
    store,
    resolved: { repo: "org/repo" },
  });

  // Feature create call body should contain plan sections
  const createCalls = callsTo("ghIssueCreate");
  const featureCreate = createCalls.find((c) => {
    const title = c.args[1] as string;
    return title.includes("my-feat");
  });
  expect(featureCreate).toBeDefined();
  const body = featureCreate!.args[2] as string;
  expect(body).toContain("As a user, I want to test enrichment");
  expect(body).toContain("Build the enrichment pipeline");
  expect(body).toContain("Enrichment works");
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-helper.test.ts`
Expected: PASS — the sync engine's `syncFeature` function (line 674-688) already reads feature plan content when `projectRoot` and `feature.plan` are present. The bridge at line 922 already passes `plan: f.plan`. This test verifies the plumbing works end-to-end.

- [ ] **Step 3: Commit (test-only, documents the contract)**

```bash
git add cli/src/__tests__/sync-helper.test.ts
git commit -m "test(sync): verify feature plan content populates body enrichment"
```

---

### Task 5: Run Integration Tests (GREEN)

**Wave:** 3
**Depends on:** Task 1, Task 2, Task 3, Task 4

**Files:**
- Test: `cli/src/__tests__/field-mapping-fix.integration.test.ts`

- [ ] **Step 1: Run the integration tests**

Run: `cd cli && bun --bun vitest run src/__tests__/field-mapping-fix.integration.test.ts`
Expected: PASS — all scenarios should now pass with the field mapping fixes.

- [ ] **Step 2: Run the full test suite**

Run: `cd cli && bun --bun vitest run`
Expected: PASS — no regressions.

- [ ] **Step 3: Commit (no code changes — verification only)**

No commit needed. This task is verification only.
