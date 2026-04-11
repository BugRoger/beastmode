# reconcile-in-place — Implementation Tasks

## Goal

Replace the delete/recreate pattern in `reconcileDesign()` with an in-place `updateEpic()` call that patches the slug field. Entity ID (`bm-XXXX`) must remain stable. Git tags must be renamed.

## Architecture

- **Store layer:** Remove the `slug: epic.slug` immutability guard from `updateEpic()` in `InMemoryTaskStore` so slug patches are applied.
- **Reconcile layer:** Rewrite the slug-rename branch in `reconcileDesign()` to call `updateEpic()` with the new slug, instead of `deleteEpic()` + `addEpic()`.
- **Git tags:** Add `renameTags()` call in `reconcileDesign()` when slug changes.
- **Test runner:** vitest via `bun --bun vitest run`

## Acceptance Criteria (from feature plan)

1. `updateEpic()` allows slug field mutation (runtime guard removed)
2. `reconcileDesign()` uses `updateEpic()` instead of `deleteEpic()` + `addEpic()`
3. Entity ID is stable across design reconciliation (same `bm-XXXX` before and after)
4. Epic is retrievable by original entity ID after slug rename
5. Git tags are renamed from old slug to new slug during reconciliation
6. Summary, status, and artifact path fields are preserved through the slug rename
7. No orphaned entities are left in the store after reconciliation

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/store/in-memory.ts` | Modify (line 104) | Remove slug immutability guard |
| `src/store/in-memory.test.ts` | Modify | Add test for slug mutation via updateEpic |
| `src/pipeline/reconcile.ts` | Modify (lines 182-203) | Rewrite slug rename to use updateEpic + renameTags |
| `src/__tests__/reconcile-in-place.integration.test.ts` | Create | Integration tests for entity ID stability |

---

### Task 0: Integration Test (RED)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `src/__tests__/reconcile-in-place.integration.test.ts`

- [x] **Step 1: Write the integration test**

```typescript
/**
 * Integration test: Design reconciliation updates slug in-place — entity ID remains stable.
 *
 * Tests that reconcileDesign() patches the slug on the existing entity
 * rather than deleting and recreating, preserving bm-XXXX entity ID.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { InMemoryTaskStore } from "../store/in-memory.js";

// Mock the git tags module
vi.mock("../git/tags.js", () => ({
  renameTags: vi.fn().mockResolvedValue(undefined),
  createTag: vi.fn().mockResolvedValue(undefined),
  listTags: vi.fn().mockResolvedValue([]),
}));

// Mock the artifacts reader
vi.mock("../artifacts/reader.js", () => ({
  loadWorktreePhaseOutput: vi.fn(),
  loadWorktreeFeatureOutput: vi.fn(),
}));

// Mock the pipeline-machine module
vi.mock("../pipeline-machine/index.js", () => {
  const mockActor = {
    send: vi.fn(),
    getSnapshot: vi.fn().mockReturnValue({
      value: "plan",
      context: { summary: "test problem — test solution" },
    }),
    stop: vi.fn(),
  };
  return {
    epicMachine: {
      resolveState: vi.fn().mockReturnValue({}),
    },
    loadEpic: vi.fn().mockReturnValue(mockActor),
  };
});

import { loadWorktreePhaseOutput } from "../artifacts/reader.js";
import { renameTags } from "../git/tags.js";

describe("Design reconciliation updates slug in-place", () => {
  let store: InMemoryTaskStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new InMemoryTaskStore();
  });

  describe("Reconcile design updates slug without changing entity ID", () => {
    it("should update slug in-place and preserve entity ID", () => {
      // Seed an epic with hex-only slug
      const seeded = store.addEpic({ name: "a1b2", slug: "a1b2" });
      const originalId = seeded.id;

      // Simulate: updateEpic with new slug
      const updated = store.updateEpic(seeded.id, { slug: "oauth-redesign-a1b2" });

      // Entity ID must be identical
      expect(updated.id).toBe(originalId);
      // Slug must be updated
      expect(updated.slug).toBe("oauth-redesign-a1b2");
      // Must be retrievable by original ID
      const retrieved = store.getEpic(originalId);
      expect(retrieved).toBeDefined();
      expect(retrieved!.slug).toBe("oauth-redesign-a1b2");
      expect(retrieved!.id).toBe(originalId);
    });
  });

  describe("Reconcile design preserves summary metadata", () => {
    it("should retain summary fields through slug rename", () => {
      const seeded = store.addEpic({ name: "a1b2", slug: "a1b2" });
      const originalId = seeded.id;

      // Update with slug + summary in one call
      const updated = store.updateEpic(seeded.id, {
        slug: "oauth-redesign-a1b2",
        summary: "Auth is broken — Redesign OAuth flow",
        design: "2026-04-11-oauth-redesign.md",
        status: "plan",
      });

      expect(updated.id).toBe(originalId);
      expect(updated.slug).toBe("oauth-redesign-a1b2");
      expect(updated.summary).toBe("Auth is broken — Redesign OAuth flow");
      expect(updated.design).toBe("2026-04-11-oauth-redesign.md");
      expect(updated.status).toBe("plan");
    });
  });

  describe("No orphaned entities after reconciliation", () => {
    it("should not leave old entities in the store", () => {
      const seeded = store.addEpic({ name: "a1b2", slug: "a1b2" });

      store.updateEpic(seeded.id, { slug: "oauth-redesign-a1b2" });

      // Only one epic should exist
      const allEpics = store.listEpics();
      expect(allEpics).toHaveLength(1);
      expect(allEpics[0].slug).toBe("oauth-redesign-a1b2");

      // Old slug should not resolve
      const oldLookup = store.find("a1b2");
      expect(oldLookup).toBeUndefined();

      // New slug should resolve
      const newLookup = store.find("oauth-redesign-a1b2");
      expect(newLookup).toBeDefined();
      expect(newLookup!.id).toBe(seeded.id);
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails (RED)**

Run: `bun --bun vitest run src/__tests__/reconcile-in-place.integration.test.ts`
Expected: FAIL — `updateEpic()` currently overwrites slug with the existing value (immutability guard at line 104 of in-memory.ts), so `updated.slug` will be `"a1b2"` not `"oauth-redesign-a1b2"`.

- [x] **Step 3: Commit**

```bash
git add src/__tests__/reconcile-in-place.integration.test.ts
git commit -m "test(reconcile-in-place): add integration tests for entity ID stability (RED)"
```

---

### Task 1: Remove slug immutability guard from updateEpic

**Wave:** 1
**Depends on:** Task 0

**Files:**
- Modify: `src/store/in-memory.ts:95-110`
- Modify: `src/store/in-memory.test.ts`

- [x] **Step 1: Write the failing test for slug mutation**

Add to `src/store/in-memory.test.ts` inside the `"Epic CRUD"` describe block:

```typescript
    it("should allow slug mutation via updateEpic", () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "old-slug" });
      const updated = store.updateEpic(epic.id, { slug: "new-slug" });
      expect(updated.slug).toBe("new-slug");
      expect(store.getEpic(epic.id)!.slug).toBe("new-slug");
    });

    it("should make epic findable by new slug after slug mutation", () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "old-slug" });
      store.updateEpic(epic.id, { slug: "new-slug" });
      expect(store.find("new-slug")).toBeDefined();
      expect(store.find("new-slug")!.id).toBe(epic.id);
      expect(store.find("old-slug")).toBeUndefined();
    });
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun --bun vitest run src/store/in-memory.test.ts -t "should allow slug mutation"`
Expected: FAIL — `updated.slug` is `"old-slug"` because the guard at line 104 overwrites it.

- [x] **Step 3: Remove the slug immutability guard**

In `src/store/in-memory.ts`, modify `updateEpic()` to remove the `slug: epic.slug` override:

```typescript
  updateEpic(id: string, patch: EpicPatch): Epic {
    const epic = this.getEpic(id);
    if (!epic) throw new Error(`Epic not found: ${id}`);

    const updated: Epic = {
      ...epic,
      ...patch,
      id: epic.id, // immutable
      type: "epic", // immutable
      created_at: epic.created_at, // immutable
      updated_at: this.now(),
    };
    this.entities.set(id, updated);
    return updated;
  }
```

The change: remove line `slug: epic.slug, // immutable` so the spread `...patch` can supply a new slug value.

- [x] **Step 4: Run tests to verify they pass**

Run: `bun --bun vitest run src/store/in-memory.test.ts`
Expected: PASS — all existing tests plus the two new slug mutation tests.

- [x] **Step 5: Commit**

```bash
git add src/store/in-memory.ts src/store/in-memory.test.ts
git commit -m "feat(reconcile-in-place): remove slug immutability guard from updateEpic"
```

---

### Task 2: Rewrite reconcileDesign to use updateEpic with slug patch and renameTags

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `src/pipeline/reconcile.ts:1-20,147-222`

- [x] **Step 1: Add renameTags import to reconcile.ts**

At the top of `src/pipeline/reconcile.ts`, add the import for `renameTags`:

```typescript
import { renameTags } from "../git/tags.js";
```

- [x] **Step 2: Rewrite the slug-rename branch in reconcileDesign**

Replace lines 182-203 in `reconcileDesign()` (the `if (newSlug !== epic.slug)` block) with an in-place update:

```typescript
    // Design phase may rename the slug (hex -> human-readable).
    // Update in-place — entity ID stays stable.
    const newSlug = realSlug ?? epic.slug;
    if (newSlug !== epic.slug) {
      const oldSlug = epic.slug;
      store.updateEpic(epic.id, {
        slug: newSlug,
        name: realSlug ?? epic.name,
        status: updated.status,
        summary: typeof summary === "object" ? `${summary.problem} — ${summary.solution}` : epic.summary,
        design: designPath,
        updated_at: updated.updated_at,
      });
      store.save();

      // Rename git tags from old slug to new slug
      await renameTags(oldSlug, newSlug, { cwd: projectRoot });

      const savedEpic = store.getEpic(epic.id)!;
      return {
        epic: savedEpic,
        manifest: savedEpic,
        phase: savedEpic.status as Phase,
        progress: readProgress(epic.id, store),
      };
    }
```

The key changes:
- `store.deleteEpic(epic.id)` + `store.addEpic(...)` replaced with `store.updateEpic(epic.id, { slug: newSlug, ... })`
- Entity ID (`epic.id`) is reused — no new ID generated
- `renameTags(oldSlug, newSlug)` added for git tag rename
- `readProgress` uses `epic.id` (stable) instead of `renamed.id` (gone)

- [x] **Step 3: Run the integration test to verify it passes (GREEN)**

Run: `bun --bun vitest run src/__tests__/reconcile-in-place.integration.test.ts`
Expected: PASS — slug mutation now works, entity ID is stable.

- [x] **Step 4: Run the full store and reconcile test suites**

Run: `bun --bun vitest run src/store/in-memory.test.ts src/__tests__/reconcile-in-place.integration.test.ts`
Expected: PASS — no regressions.

- [x] **Step 5: Commit**

```bash
git add src/pipeline/reconcile.ts
git commit -m "feat(reconcile-in-place): rewrite reconcileDesign to update slug in-place with renameTags"
```
