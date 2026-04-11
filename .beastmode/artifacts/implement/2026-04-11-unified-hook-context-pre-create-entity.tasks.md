# Pre-Create Entity — Implementation Tasks

## Goal

Move store entity creation from `reconcileDesign` (post-dispatch) to the pipeline runner (pre-dispatch), so `BEASTMODE_EPIC_ID` is always available from the first hook invocation. Remove the create-if-missing fallback from `reconcileDesign`. Store worktree metadata on the entity at creation time.

## Architecture

- **Pipeline runner** (`cli/src/pipeline/runner.ts`): Insert Step 0 before Step 1 that loads the store, creates the epic entity for design phase (or looks up existing for non-design), captures `epicId`, and sets worktree metadata.
- **PipelineConfig**: `epicId` field (already declared optional) gets populated before Step 3 so hook context can use it.
- **reconcileDesign** (`cli/src/pipeline/reconcile.ts`): Remove lines 166-173 (create-if-missing fallback). If entity not found, return `undefined` (graceful exit).
- **Tests**: `pipeline-runner.test.ts` gets new tests for pre-creation; `reconcile.test.ts` is the GitHub reconcile test (unrelated). We need a new test for the reconcileDesign change.

## Tech Stack

- TypeScript, vitest, Bun runtime
- `JsonFileStore` for store operations
- Existing mock patterns from `pipeline-runner.test.ts`

## File Structure

| File | Role |
|------|------|
| `cli/src/pipeline/runner.ts` | Add Step 0: pre-dispatch entity creation, pass epicId |
| `cli/src/pipeline/reconcile.ts` | Remove create-if-missing from reconcileDesign |
| `cli/src/__tests__/pipeline-runner.test.ts` | Tests for pre-creation in runner |
| `cli/src/__tests__/reconcile-design.test.ts` | NEW: Unit tests for reconcileDesign without fallback |

---

### Task 1: Add pre-dispatch entity creation to pipeline runner

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/pipeline/runner.ts:127-178`
- Modify: `cli/src/__tests__/pipeline-runner.test.ts`

**Step 1: Write failing tests for pre-dispatch entity creation**

Add tests to `cli/src/__tests__/pipeline-runner.test.ts`:

First, add `addEpic` to the mock store class (it currently only has `find`, `listFeatures`, `updateEpic`, `load`, `save`):

In the `mockJsonFileStore` vi.hoisted block, add `addEpic` to the storeState and class:

```typescript
// Inside the storeState object, add:
addEpic: vi.fn((opts: { name: string }) => ({
  id: "bm-new1",
  slug: `${opts.name}-new1`,
  name: opts.name,
  type: "epic",
  status: "design",
})),
```

```typescript
// Inside the JsonFileStore class, add:
addEpic(opts: { name: string }) { return this.state.addEpic(opts); }
```

Then add the test cases:

```typescript
describe("pre-dispatch entity creation (Step 0)", () => {
  it("creates store entity for design phase before dispatch", async () => {
    const storeState = (mockJsonFileStore as any).__storeState;
    // Design phase: entity doesn't exist yet
    storeState.find = vi.fn(() => undefined);
    storeState.addEpic = vi.fn((opts: { name: string }) => ({
      id: "bm-new1",
      slug: `${opts.name}-new1`,
      name: opts.name,
      type: "epic",
      status: "design",
    }));

    const callOrder: string[] = [];
    storeState.addEpic = vi.fn((opts: { name: string }) => {
      callOrder.push("addEpic");
      return {
        id: "bm-new1",
        slug: `${opts.name}-new1`,
        name: opts.name,
        type: "epic",
        status: "design",
      };
    });

    const dispatch = async () => {
      callOrder.push("dispatch");
      return { success: true };
    };

    await run(makeConfig({ phase: "design", dispatch }));

    expect(callOrder.indexOf("addEpic")).toBeLessThan(callOrder.indexOf("dispatch"));
  });

  it("looks up existing entity for non-design phases", async () => {
    const storeState = (mockJsonFileStore as any).__storeState;
    storeState.find = vi.fn((idOrSlug: string) => {
      if (idOrSlug === "test-epic") {
        return { id: "epic-123", slug: "test-epic", name: "Test Epic", type: "epic" };
      }
      return undefined;
    });
    storeState.addEpic = vi.fn();

    await run(makeConfig({ phase: "plan" }));

    expect(storeState.addEpic).not.toHaveBeenCalled();
  });

  it("sets worktree metadata on newly created entity", async () => {
    const storeState = (mockJsonFileStore as any).__storeState;
    storeState.find = vi.fn(() => undefined);
    const updateCalls: any[] = [];
    storeState.addEpic = vi.fn((opts: { name: string }) => ({
      id: "bm-new1",
      slug: `${opts.name}-new1`,
      name: opts.name,
      type: "epic",
      status: "design",
    }));

    // Override updateEpic on the class to capture calls
    const origUpdateEpic = mockJsonFileStore.prototype.updateEpic;
    mockJsonFileStore.prototype.updateEpic = function(id: string, patch: any) {
      updateCalls.push({ id, patch });
    };

    await run(makeConfig({ phase: "design" }));

    // Should have called updateEpic with worktree metadata
    const worktreeUpdate = updateCalls.find(c => c.patch.worktree);
    expect(worktreeUpdate).toBeDefined();
    expect(worktreeUpdate.patch.worktree.branch).toContain("feature/");
    expect(worktreeUpdate.patch.worktree.path).toContain("worktrees/");

    // Restore
    mockJsonFileStore.prototype.updateEpic = origUpdateEpic;
  });

  it("skips entity creation when skipPreDispatch is true", async () => {
    const storeState = (mockJsonFileStore as any).__storeState;
    storeState.addEpic = vi.fn();

    await run(makeConfig({ phase: "design", skipPreDispatch: true }));

    expect(storeState.addEpic).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/pipeline-runner.test.ts`
Expected: FAIL — addEpic not called before dispatch, no worktree metadata set

**Step 3: Implement pre-dispatch entity creation in runner.ts**

In `cli/src/pipeline/runner.ts`, add Step 0 inside the `!config.skipPreDispatch` block, before Step 1 (worktree.prepare). Insert at line 138, before the worktree creation:

```typescript
    // -- Step 0: store.preCreate -----------------------------------------------
    // For design phase: create the store entity so epicId is available for hooks.
    // For non-design phases: look up existing entity and read its ID.
    {
      const storePath = resolve(config.projectRoot, ".beastmode", "state", "store.json");
      const preStore = new JsonFileStore(storePath);
      preStore.load();

      if (config.phase === "design") {
        const existing = preStore.find(epicSlug);
        if (!existing || existing.type !== "epic") {
          const newEpic = preStore.addEpic({ name: epicSlug });
          config.epicId = newEpic.id;
          logger.info(`store entity created: ${newEpic.id} (${newEpic.slug})`);
        } else {
          config.epicId = existing.id;
        }
      } else {
        const existing = preStore.find(epicSlug);
        if (existing && existing.type === "epic") {
          config.epicId = existing.id;
        }
      }

      preStore.save();
    }
```

Then, after Step 1 (worktree.prepare), add worktree metadata update:

```typescript
    // Set worktree metadata on newly created entity
    if (config.epicId && config.phase === "design") {
      const storePath = resolve(config.projectRoot, ".beastmode", "state", "store.json");
      const wtMetaStore = new JsonFileStore(storePath);
      wtMetaStore.load();
      const entity = wtMetaStore.getEpic(config.epicId);
      if (entity) {
        wtMetaStore.updateEpic(config.epicId, {
          worktree: {
            branch: `feature/${epicSlug}`,
            path: worktreePath,
          },
        });
        wtMetaStore.save();
      }
    }
```

**Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/pipeline-runner.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add cli/src/pipeline/runner.ts cli/src/__tests__/pipeline-runner.test.ts
git commit -m "feat(pre-create-entity): add pre-dispatch entity creation to pipeline runner"
```

---

### Task 2: Remove reconcileDesign create-if-missing fallback

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/pipeline/reconcile.ts:148-226`
- Create: `cli/src/__tests__/reconcile-design.test.ts`

**Step 1: Write failing tests for reconcileDesign without fallback**

Create `cli/src/__tests__/reconcile-design.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolve } from "node:path";

// Mock artifacts/reader
const mockLoadOutput = vi.hoisted(() => vi.fn());
vi.mock("../artifacts/reader.js", () => ({
  loadWorktreePhaseOutput: mockLoadOutput,
  loadWorktreeFeatureOutput: vi.fn(),
}));

// Mock pipeline-machine
const mockEpicMachine = vi.hoisted(() => ({
  resolveState: vi.fn((config: any) => config),
}));
const mockLoadEpic = vi.hoisted(() => vi.fn(() => {
  const snapshot = {
    value: "plan",
    context: { summary: "test summary" },
  };
  return {
    getSnapshot: () => snapshot,
    send: vi.fn(),
    stop: vi.fn(),
  };
}));
vi.mock("../pipeline-machine/index.js", () => ({
  epicMachine: mockEpicMachine,
  loadEpic: mockLoadEpic,
}));

// Mock git/tags
vi.mock("../git/tags.js", () => ({
  renameTags: vi.fn(async () => {}),
}));

// Mock store
const mockStoreState = vi.hoisted(() => ({
  entities: new Map<string, any>(),
}));

const mockJsonFileStore = vi.hoisted(() => {
  class JsonFileStore {
    constructor(_path: string) {}
    load() {}
    save() {}
    find(idOrSlug: string) {
      for (const entity of mockStoreState.entities.values()) {
        if (entity.id === idOrSlug || entity.slug === idOrSlug) return entity;
      }
      return undefined;
    }
    getEpic(id: string) {
      const entity = mockStoreState.entities.get(id);
      return entity?.type === "epic" ? entity : undefined;
    }
    listFeatures(_epicId: string) { return []; }
    addEpic: any = vi.fn();
    updateEpic: any = vi.fn((_id: string, _patch: any) => {});
  }
  return JsonFileStore;
});
vi.mock("../store/index.js", () => ({
  JsonFileStore: mockJsonFileStore,
}));

import { reconcileDesign } from "../pipeline/reconcile.js";

describe("reconcileDesign", () => {
  beforeEach(() => {
    mockStoreState.entities.clear();
    vi.clearAllMocks();
  });

  it("returns undefined when entity not found (no create-if-missing)", async () => {
    mockLoadOutput.mockReturnValue({
      status: "completed",
      artifacts: { slug: "my-epic", summary: { problem: "p", solution: "s" } },
    });

    // Store has no entity for this slug
    const result = await reconcileDesign("/tmp/test", "nonexistent-slug", "/tmp/wt");

    expect(result).toBeUndefined();
    // addEpic should NOT have been called
    expect(mockJsonFileStore.prototype.addEpic).not.toHaveBeenCalled();
  });

  it("reconciles normally when entity exists", async () => {
    mockLoadOutput.mockReturnValue({
      status: "completed",
      artifacts: { slug: "my-epic", summary: { problem: "p", solution: "s" }, design: "design.md" },
    });

    const epic = {
      id: "bm-1234",
      type: "epic",
      slug: "my-epic",
      name: "my-epic",
      status: "design",
      depends_on: [],
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    };
    mockStoreState.entities.set("bm-1234", epic);

    // Mock getEpic for the post-update read
    mockJsonFileStore.prototype.getEpic = vi.fn(() => ({
      ...epic,
      status: "plan",
    })) as any;

    const result = await reconcileDesign("/tmp/test", "my-epic", "/tmp/wt");

    expect(result).toBeDefined();
    expect(result!.phase).toBe("plan");
    expect(mockJsonFileStore.prototype.addEpic).not.toHaveBeenCalled();
  });

  it("returns undefined when output status is not completed", async () => {
    mockLoadOutput.mockReturnValue({ status: "error", artifacts: {} });

    const result = await reconcileDesign("/tmp/test", "my-epic", "/tmp/wt");

    expect(result).toBeUndefined();
  });

  it("returns undefined when no output exists", async () => {
    mockLoadOutput.mockReturnValue(undefined);

    const result = await reconcileDesign("/tmp/test", "my-epic", "/tmp/wt");

    expect(result).toBeUndefined();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/reconcile-design.test.ts`
Expected: "returns undefined when entity not found" FAILS because reconcileDesign currently creates the entity via addEpic

**Step 3: Remove create-if-missing fallback from reconcileDesign**

In `cli/src/pipeline/reconcile.ts`, replace lines 166-173:

```typescript
    let epic = store.find(slug);
    if (!epic || epic.type !== "epic") {
      // Create the epic entity during design reconciliation
      const newEpic = store.addEpic({
        name: realSlug ?? slug,
      });
      epic = newEpic;
    }
```

With:

```typescript
    const epic = store.find(slug);
    if (!epic || epic.type !== "epic") {
      // Entity must exist — pre-created by pipeline runner at Step 0
      return undefined;
    }
```

Note: Change `let epic` to `const epic` since we no longer reassign.

**Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/reconcile-design.test.ts`
Expected: PASS

**Step 5: Run full test suite to check for regressions**

Run: `cd cli && bun --bun vitest run`
Expected: PASS (no other tests depend on the create-if-missing behavior)

**Step 6: Commit**

```bash
git add cli/src/pipeline/reconcile.ts cli/src/__tests__/reconcile-design.test.ts
git commit -m "feat(pre-create-entity): remove reconcileDesign create-if-missing fallback"
```

---

### Task 3: Verification — full test suite and acceptance criteria check

**Wave:** 2
**Depends on:** Task 1, Task 2

**Files:**
- Read: `cli/src/pipeline/runner.ts`
- Read: `cli/src/pipeline/reconcile.ts`
- Read: `cli/src/__tests__/pipeline-runner.test.ts`
- Read: `cli/src/__tests__/reconcile-design.test.ts`

**Step 1: Run full test suite**

Run: `cd cli && bun --bun vitest run`
Expected: All tests PASS

**Step 2: Verify acceptance criteria**

Manually verify each criterion:

1. Design phase creates store entity before dispatch (Step 0/pre-Step 3) — check runner.ts
2. Entity ID is available in PipelineConfig before hook context is built — check config.epicId assignment
3. Non-design phases look up existing entity by slug and read its ID — check runner.ts non-design path
4. `reconcileDesign` no longer calls `store.addEpic()` — check reconcile.ts
5. `reconcileDesign` returns undefined if entity not found — check reconcile.ts
6. Worktree path and branch are set on entity at creation time — check runner.ts worktree metadata
7. Unit tests verify entity exists before reconciliation for design phase — check pipeline-runner.test.ts
8. Unit tests verify reconcileDesign with missing entity returns gracefully — check reconcile-design.test.ts

**Step 3: Commit verification report (no code changes expected)**

No commit needed — verification only.
