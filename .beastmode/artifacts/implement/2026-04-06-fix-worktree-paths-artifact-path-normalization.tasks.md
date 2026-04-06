# Artifact Path Normalization — Implementation Tasks

## Goal

Fix three read-path bugs in `cli/src/github/sync.ts` where artifact paths stored in the epic/feature entities are resolved incorrectly, causing empty PRD sections in epic issue bodies, missing feature plan content, and stale worktree paths in the Artifacts table.

## Architecture

- **Pattern:** Each fix applies `basename()` to strip any directory prefix from the stored path, then `join()` to prefix the known artifact directory
- **Import change:** Add `basename` and `join` to the existing `import { resolve, relative, isAbsolute } from "path"` on line 29
- **No shared utility:** Each reader knows its own artifact directory — localized fixes in localized code
- **Test strategy:** Unit tests in a new `cli/src/__tests__/sync-path-normalization.test.ts` file covering all three path formats for each fix. Existing tests must continue to pass.

## Tech Stack

- TypeScript (Bun + vitest)
- Node `path` module (`basename`, `join`, `resolve`, `relative`, `isAbsolute`)
- Test runner: `bun --bun vitest run`

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `cli/src/github/sync.ts` | Modify | Fix `readPrdSections`, `syncFeature` plan path, `buildArtifactsMap` |
| `cli/src/__tests__/sync-path-normalization.test.ts` | Create | Unit tests for all three path normalization fixes |
| `cli/src/__tests__/artifact-path-normalization.integration.test.ts` | Create | Integration test from Gherkin scenarios |

---

### Task 0: Integration Test (BDD RED)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/artifact-path-normalization.integration.test.ts`

- [ ] **Step 1: Write the integration test file**

```typescript
/**
 * Integration test for artifact path normalization.
 * Exercises readPrdSections, syncFeature plan reading, and buildArtifactsMap
 * through the syncGitHubForEpic entry point with various path formats.
 *
 * @fix-worktree-paths
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
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

const DESIGN_CONTENT = `---
phase: design
---

## Problem Statement

The logging system is broken.

## Solution

Fix the logging pipeline.

## User Stories

1. As a developer, I want consistent logs.

## Implementation Decisions

- Use structured logging

## Testing Decisions

- Unit test each adapter

## Out of Scope

- Dashboard
`;

const PLAN_CONTENT = `---
phase: plan
---

## User Stories

1. As a user, I want enriched features.

## What to Build

Build the normalization layer.

## Acceptance Criteria

- [ ] Paths resolve correctly
`;

describe("Artifact Path Normalization Integration", () => {
  let tmpDir: string;
  let store: InMemoryTaskStore;
  let designDir: string;
  let planDir: string;

  beforeEach(() => {
    mockCalls.length = 0;
    tmpDir = mkdtempSync(join(tmpdir(), "artifact-path-norm-"));
    store = new InMemoryTaskStore();

    designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    planDir = join(tmpDir, ".beastmode", "artifacts", "plan");
    mkdirSync(designDir, { recursive: true });
    mkdirSync(planDir, { recursive: true });

    writeFileSync(join(designDir, "2026-04-05-test.md"), DESIGN_CONTENT);
    writeFileSync(join(planDir, "2026-04-05-test-my-feat.md"), PLAN_CONTENT);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // --- Epic body enrichment with path normalization (US1, US4) ---

  describe("Epic body contains full PRD when design path is an absolute worktree path", () => {
    test("body contains all six PRD sections", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      const absPath = join(tmpDir, ".beastmode", "artifacts", "design", "2026-04-05-test.md");
      store.updateEpic(epic.id, { status: "plan", design: absPath });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId: epic.id,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls.length).toBeGreaterThanOrEqual(1);
      const body = createCalls[0].args[2] as string;
      expect(body).toContain("The logging system is broken");
      expect(body).toContain("Fix the logging pipeline");
      expect(body).toContain("As a developer, I want consistent logs");
      expect(body).toContain("Use structured logging");
      expect(body).toContain("Unit test each adapter");
      expect(body).toContain("Dashboard");
    });
  });

  describe("Epic body contains full PRD when design path is a bare filename", () => {
    test("body contains PRD sections", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      store.updateEpic(epic.id, { status: "plan", design: "2026-04-05-test.md" });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId: epic.id,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls.length).toBeGreaterThanOrEqual(1);
      const body = createCalls[0].args[2] as string;
      expect(body).toContain("The logging system is broken");
      expect(body).toContain("Fix the logging pipeline");
      expect(body).toContain("As a developer, I want consistent logs");
      expect(body).toContain("Use structured logging");
    });
  });

  describe("Epic body contains full PRD when design path is repo-relative", () => {
    test("body contains PRD sections", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      store.updateEpic(epic.id, {
        status: "plan",
        design: ".beastmode/artifacts/design/2026-04-05-test.md",
      });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId: epic.id,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls.length).toBeGreaterThanOrEqual(1);
      const body = createCalls[0].args[2] as string;
      expect(body).toContain("The logging system is broken");
      expect(body).toContain("Fix the logging pipeline");
    });
  });

  // --- Feature body enrichment with path normalization (US2) ---

  describe("Feature body contains plan sections when plan path is a bare filename", () => {
    test("body contains user story, what to build, acceptance criteria", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      store.updateEpic(epic.id, { status: "implement" });
      const feat = store.addFeature({
        parent: epic.id,
        name: "my-feat",
        slug: "my-feat",
        description: "A feature",
      });
      store.updateFeature(feat.id, { plan: "2026-04-05-test-my-feat.md" });
      saveSyncRefs(tmpDir, { [epic.id]: { issue: 10 } });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId: epic.id,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      const createCalls = callsTo("ghIssueCreate");
      const featureCreate = createCalls.find((c) => {
        const title = c.args[1] as string;
        return title.includes("my-feat");
      });
      expect(featureCreate).toBeDefined();
      const body = featureCreate!.args[2] as string;
      expect(body).toContain("As a user, I want enriched features");
      expect(body).toContain("Build the normalization layer");
      expect(body).toContain("Paths resolve correctly");
    });
  });

  describe("Feature body contains plan sections when plan path is repo-relative", () => {
    test("body contains user story and what to build", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      store.updateEpic(epic.id, { status: "implement" });
      const feat = store.addFeature({
        parent: epic.id,
        name: "my-feat",
        slug: "my-feat",
        description: "A feature",
      });
      store.updateFeature(feat.id, {
        plan: ".beastmode/artifacts/plan/2026-04-05-test-my-feat.md",
      });
      saveSyncRefs(tmpDir, { [epic.id]: { issue: 10 } });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId: epic.id,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      const createCalls = callsTo("ghIssueCreate");
      const featureCreate = createCalls.find((c) => {
        const title = c.args[1] as string;
        return title.includes("my-feat");
      });
      expect(featureCreate).toBeDefined();
      const body = featureCreate!.args[2] as string;
      expect(body).toContain("As a user, I want enriched features");
      expect(body).toContain("Build the normalization layer");
    });
  });

  // --- Artifact links table display (US4) ---

  describe("Artifact table shows clean repo-relative paths from absolute inputs", () => {
    test("artifact rows use repo-relative paths, no worktree prefix", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      const absDesign = join(tmpDir, ".beastmode", "artifacts", "design", "2026-04-05-test.md");
      store.updateEpic(epic.id, { status: "plan", design: absDesign });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId: epic.id,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls.length).toBeGreaterThanOrEqual(1);
      const body = createCalls[0].args[2] as string;

      // Artifact table should use repo-relative paths
      expect(body).toContain(".beastmode/artifacts/design/");
      // Should NOT contain absolute tmpDir path in the artifact table
      expect(body).not.toContain(tmpDir);
    });
  });

  describe("Artifact table shows clean paths from bare filename inputs", () => {
    test("artifact rows display repo-relative paths", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      store.updateEpic(epic.id, { status: "plan", design: "2026-04-05-test.md" });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId: epic.id,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls.length).toBeGreaterThanOrEqual(1);
      const body = createCalls[0].args[2] as string;
      expect(body).toContain(".beastmode/artifacts/design/");
    });
  });

  // --- Epic body never contains absolute filesystem paths (US4) ---

  describe("Epic body never contains absolute filesystem paths", () => {
    test("no absolute paths in rendered body when stored as absolute worktree paths", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      const absDesign = join(tmpDir, ".beastmode", "artifacts", "design", "2026-04-05-test.md");
      store.updateEpic(epic.id, { status: "plan", design: absDesign });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId: epic.id,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls.length).toBeGreaterThanOrEqual(1);
      const body = createCalls[0].args[2] as string;

      // No absolute filesystem path should appear anywhere in the body
      expect(body).not.toMatch(/\/(Users|home|tmp|var)\//);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails (RED)**

Run: `cd cli && bun --bun vitest run src/__tests__/artifact-path-normalization.integration.test.ts`
Expected: FAIL — `readPrdSections` can't resolve bare filenames, `syncFeature` can't resolve bare filenames, `buildArtifactsMap` leaks absolute paths

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/artifact-path-normalization.integration.test.ts
git commit -m "test(artifact-path-normalization): add integration test (RED)"
```

---

### Task 1: Fix readPrdSections path resolution

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/github/sync.ts:29,360`
- Create: `cli/src/__tests__/sync-path-normalization.test.ts`

- [ ] **Step 1: Write the unit test file**

```typescript
/**
 * Unit tests for path normalization fixes in sync.ts.
 * Tests readPrdSections, syncFeature plan reading, and buildArtifactsMap
 * with absolute, repo-relative, and bare filename path formats.
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { InMemoryTaskStore } from "../store/in-memory";
import { saveSyncRefs } from "../github/sync-refs";

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
  ghIssueClose: async () => true,
  ghIssueReopen: async () => true,
  ghIssueComment: async () => true,
  ghIssueComments: async () => [],
  ghIssueState: async () => "open",
  ghIssueLabels: async () => ["type/epic", "phase/plan"],
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

const DESIGN_CONTENT = `---
phase: design
---

## Problem Statement

Test problem statement.

## Solution

Test solution.

## User Stories

1. As a tester, I want paths to work.

## Implementation Decisions

- Use basename

## Testing Decisions

- Unit tests for all formats

## Out of Scope

- Store migration
`;

describe("readPrdSections path normalization", () => {
  let tmpDir: string;
  let store: InMemoryTaskStore;

  beforeEach(() => {
    mockCalls.length = 0;
    tmpDir = mkdtempSync(join(tmpdir(), "sync-path-norm-"));
    store = new InMemoryTaskStore();

    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    writeFileSync(join(designDir, "2026-04-05-slug.md"), DESIGN_CONTENT);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("resolves absolute worktree path to correct design file", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    const absPath = join(tmpDir, ".beastmode", "artifacts", "design", "2026-04-05-slug.md");
    store.updateEpic(epic.id, { status: "plan", design: absPath });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const body = callsTo("ghIssueCreate")[0]?.args[2] as string;
    expect(body).toContain("Test problem statement");
    expect(body).toContain("Test solution");
  });

  test("resolves bare filename to correct design file", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    store.updateEpic(epic.id, { status: "plan", design: "2026-04-05-slug.md" });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const body = callsTo("ghIssueCreate")[0]?.args[2] as string;
    expect(body).toContain("Test problem statement");
    expect(body).toContain("Test solution");
  });

  test("resolves repo-relative path to correct design file", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    store.updateEpic(epic.id, {
      status: "plan",
      design: ".beastmode/artifacts/design/2026-04-05-slug.md",
    });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const body = callsTo("ghIssueCreate")[0]?.args[2] as string;
    expect(body).toContain("Test problem statement");
    expect(body).toContain("Test solution");
  });

  test("extracts all six PRD sections from absolute path", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    const absPath = join(tmpDir, ".beastmode", "artifacts", "design", "2026-04-05-slug.md");
    store.updateEpic(epic.id, { status: "plan", design: absPath });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const body = callsTo("ghIssueCreate")[0]?.args[2] as string;
    expect(body).toContain("Test problem statement");
    expect(body).toContain("Test solution");
    expect(body).toContain("As a tester, I want paths to work");
    expect(body).toContain("Use basename");
    expect(body).toContain("Unit tests for all formats");
    expect(body).toContain("Store migration");
  });
});
```

- [ ] **Step 2: Run test to verify it fails (RED)**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-path-normalization.test.ts`
Expected: FAIL — bare filename test fails because `resolve(projectRoot, "2026-04-05-slug.md")` places the file at the project root, missing the `artifacts/design/` prefix

- [ ] **Step 3: Fix the import on line 29 — add `basename` and `join`**

In `cli/src/github/sync.ts`, change line 29 from:

```typescript
import { resolve, relative, isAbsolute } from "path";
```

to:

```typescript
import { resolve, relative, isAbsolute, basename, join } from "path";
```

- [ ] **Step 4: Fix `readPrdSections` — replace line 360**

In `cli/src/github/sync.ts`, replace line 360:

```typescript
  const designPath = resolve(projectRoot, designPaths[0]);
```

with:

```typescript
  const designPath = join(projectRoot, ".beastmode", "artifacts", "design", basename(designPaths[0]));
```

- [ ] **Step 5: Run test to verify it passes (GREEN)**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-path-normalization.test.ts`
Expected: PASS — all three path formats resolve to the same design file

- [ ] **Step 6: Run existing tests to verify no regressions**

Run: `cd cli && bun --bun vitest run src/__tests__/body-format.test.ts src/__tests__/sync-helper.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add cli/src/github/sync.ts cli/src/__tests__/sync-path-normalization.test.ts
git commit -m "fix(sync): normalize readPrdSections path with basename + design dir prefix"
```

---

### Task 2: Fix syncFeature plan path resolution

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/github/sync.ts:689`
- Modify: `cli/src/__tests__/sync-path-normalization.test.ts`

- [ ] **Step 1: Add unit tests for feature plan path normalization**

Append to `cli/src/__tests__/sync-path-normalization.test.ts`:

```typescript
const PLAN_CONTENT = `---
phase: plan
---

## User Stories

1. As a user, I want plan paths to resolve.

## What to Build

Build the plan resolver.

## Acceptance Criteria

- [ ] Plan resolves from any format
`;

describe("syncFeature plan path normalization", () => {
  let tmpDir: string;
  let store: InMemoryTaskStore;

  beforeEach(() => {
    mockCalls.length = 0;
    tmpDir = mkdtempSync(join(tmpdir(), "sync-plan-norm-"));
    store = new InMemoryTaskStore();

    const planDir = join(tmpDir, ".beastmode", "artifacts", "plan");
    mkdirSync(planDir, { recursive: true });
    writeFileSync(join(planDir, "2026-04-05-test-my-feat.md"), PLAN_CONTENT);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("resolves bare filename to correct plan file", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    store.updateEpic(epic.id, { status: "implement" });
    const feat = store.addFeature({
      parent: epic.id,
      name: "my-feat",
      slug: "my-feat",
      description: "Desc",
    });
    store.updateFeature(feat.id, { plan: "2026-04-05-test-my-feat.md" });
    saveSyncRefs(tmpDir, { [epic.id]: { issue: 10 } });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const featureCreate = callsTo("ghIssueCreate").find((c) =>
      (c.args[1] as string).includes("my-feat"),
    );
    expect(featureCreate).toBeDefined();
    const body = featureCreate!.args[2] as string;
    expect(body).toContain("As a user, I want plan paths to resolve");
    expect(body).toContain("Build the plan resolver");
    expect(body).toContain("Plan resolves from any format");
  });

  test("resolves repo-relative path to correct plan file", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    store.updateEpic(epic.id, { status: "implement" });
    const feat = store.addFeature({
      parent: epic.id,
      name: "my-feat",
      slug: "my-feat",
      description: "Desc",
    });
    store.updateFeature(feat.id, {
      plan: ".beastmode/artifacts/plan/2026-04-05-test-my-feat.md",
    });
    saveSyncRefs(tmpDir, { [epic.id]: { issue: 10 } });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const featureCreate = callsTo("ghIssueCreate").find((c) =>
      (c.args[1] as string).includes("my-feat"),
    );
    expect(featureCreate).toBeDefined();
    const body = featureCreate!.args[2] as string;
    expect(body).toContain("As a user, I want plan paths to resolve");
    expect(body).toContain("Build the plan resolver");
  });

  test("resolves absolute worktree path to correct plan file", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    store.updateEpic(epic.id, { status: "implement" });
    const feat = store.addFeature({
      parent: epic.id,
      name: "my-feat",
      slug: "my-feat",
      description: "Desc",
    });
    const absPath = join(tmpDir, ".beastmode", "artifacts", "plan", "2026-04-05-test-my-feat.md");
    store.updateFeature(feat.id, { plan: absPath });
    saveSyncRefs(tmpDir, { [epic.id]: { issue: 10 } });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const featureCreate = callsTo("ghIssueCreate").find((c) =>
      (c.args[1] as string).includes("my-feat"),
    );
    expect(featureCreate).toBeDefined();
    const body = featureCreate!.args[2] as string;
    expect(body).toContain("As a user, I want plan paths to resolve");
  });
});
```

- [ ] **Step 2: Run test to verify it fails (RED)**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-path-normalization.test.ts`
Expected: FAIL — bare filename test fails because `resolve(projectRoot, "2026-04-05-test-my-feat.md")` places the file at the project root

- [ ] **Step 3: Fix `syncFeature` plan path — replace line 689**

In `cli/src/github/sync.ts`, replace line 689:

```typescript
    const planPath = resolve(opts.projectRoot, feature.plan);
```

with:

```typescript
    const planPath = join(opts.projectRoot, ".beastmode", "artifacts", "plan", basename(feature.plan));
```

- [ ] **Step 4: Run test to verify it passes (GREEN)**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-path-normalization.test.ts`
Expected: PASS

- [ ] **Step 5: Run existing tests to verify no regressions**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-helper.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add cli/src/github/sync.ts cli/src/__tests__/sync-path-normalization.test.ts
git commit -m "fix(sync): normalize syncFeature plan path with basename + plan dir prefix"
```

---

### Task 3: Fix buildArtifactsMap display paths

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/github/sync.ts:919-935`
- Modify: `cli/src/__tests__/sync-path-normalization.test.ts`

- [ ] **Step 1: Add unit tests for buildArtifactsMap normalization**

Append to `cli/src/__tests__/sync-path-normalization.test.ts`:

```typescript
describe("buildArtifactsMap path normalization", () => {
  let tmpDir: string;
  let store: InMemoryTaskStore;

  beforeEach(() => {
    mockCalls.length = 0;
    tmpDir = mkdtempSync(join(tmpdir(), "sync-artifacts-norm-"));
    store = new InMemoryTaskStore();

    // Create design artifact so PRD sections can be read
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    writeFileSync(
      join(designDir, "2026-04-05-slug.md"),
      "---\nphase: design\n---\n\n## Problem Statement\n\nTest.\n",
    );
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("normalizes absolute worktree path to repo-relative display path", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    const absPath = "/Users/someone/.claude/worktrees/old-slug/.beastmode/artifacts/design/2026-04-05-slug.md";
    store.updateEpic(epic.id, { status: "plan", design: absPath });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const body = callsTo("ghIssueCreate")[0]?.args[2] as string;
    // Artifact table should have clean path
    expect(body).toContain(".beastmode/artifacts/design/2026-04-05-slug.md");
    // Should NOT contain the stale worktree prefix
    expect(body).not.toContain("/Users/someone");
    expect(body).not.toContain("worktrees");
  });

  test("normalizes bare filename to repo-relative display path", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    store.updateEpic(epic.id, { status: "plan", design: "2026-04-05-slug.md" });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const body = callsTo("ghIssueCreate")[0]?.args[2] as string;
    expect(body).toContain(".beastmode/artifacts/design/2026-04-05-slug.md");
  });

  test("preserves already-correct repo-relative path", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    store.updateEpic(epic.id, {
      status: "plan",
      design: ".beastmode/artifacts/design/2026-04-05-slug.md",
    });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const body = callsTo("ghIssueCreate")[0]?.args[2] as string;
    expect(body).toContain(".beastmode/artifacts/design/2026-04-05-slug.md");
  });

  test("normalizes paths for all phase types", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    store.updateEpic(epic.id, {
      status: "validate",
      design: "/abs/path/.beastmode/artifacts/design/design-file.md",
      validate: "/abs/path/.beastmode/artifacts/validate/validate-file.md",
    });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const body = callsTo("ghIssueCreate")[0]?.args[2] as string;
    expect(body).toContain(".beastmode/artifacts/design/design-file.md");
    expect(body).toContain(".beastmode/artifacts/validate/validate-file.md");
    expect(body).not.toContain("/abs/path/");
  });
});
```

- [ ] **Step 2: Run test to verify it fails (RED)**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-path-normalization.test.ts`
Expected: FAIL — absolute paths produce `../../.claude/worktrees/...` traversal paths in the artifacts table

- [ ] **Step 3: Rewrite `buildArtifactsMap` in `cli/src/github/sync.ts`**

Replace lines 919-935:

```typescript
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

with:

```typescript
function buildArtifactsMap(
  entity: { design?: string; plan?: string; implement?: string; validate?: string; release?: string },
  _projectRoot?: string,
): Record<string, string[]> | undefined {
  const map: Record<string, string[]> = {};
  const phases = ["design", "plan", "implement", "validate", "release"] as const;
  for (const phase of phases) {
    const rawPath = entity[phase];
    if (rawPath) {
      const normalized = `.beastmode/artifacts/${phase}/${basename(rawPath)}`;
      map[phase] = [normalized];
    }
  }
  return Object.keys(map).length > 0 ? map : undefined;
}
```

- [ ] **Step 4: Run test to verify it passes (GREEN)**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-path-normalization.test.ts`
Expected: PASS

- [ ] **Step 5: Run existing tests to verify no regressions**

Run: `cd cli && bun --bun vitest run src/__tests__/body-format.test.ts src/__tests__/sync-helper.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add cli/src/github/sync.ts cli/src/__tests__/sync-path-normalization.test.ts
git commit -m "fix(sync): normalize buildArtifactsMap display paths with basename + phase dir prefix"
```

---

### Task 4: BDD GREEN verification

**Wave:** 2
**Depends on:** Task 1, Task 2, Task 3

**Files:**
- (no new files — runs integration test from Task 0)

- [ ] **Step 1: Run the integration test**

Run: `cd cli && bun --bun vitest run src/__tests__/artifact-path-normalization.integration.test.ts`
Expected: PASS — all scenarios GREEN now that all three fixes are applied

- [ ] **Step 2: Run full test suite**

Run: `cd cli && bun --bun vitest run`
Expected: PASS — no regressions

- [ ] **Step 3: Commit (no changes expected — verification only)**

No commit needed. If the test passes, this task is done.
