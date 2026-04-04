# Store Backend — Implementation Tasks

## Goal

Implement `JsonFileStore`, the persistent file-backed implementation of the `TaskStore` interface. Backed by `.beastmode/state/store.json` with async mutex concurrency, version field for future migrations, and full round-trip load/save.

## Architecture

- **Interface**: `TaskStore` (already defined in `cli/src/store/types.ts`)
- **In-memory reference**: `InMemoryTaskStore` (already implemented in `cli/src/store/in-memory.ts`)
- **New**: `JsonFileStore` in `cli/src/store/json-file-store.ts` — implements `TaskStore`, delegates all logic to `InMemoryTaskStore` internally, adds file I/O and async mutex
- **Storage file**: `.beastmode/state/store.json` (single file, gitignored)
- **JSON schema**: `{ version: 1, entities: Record<string, Entity> }`
- **Concurrency**: per-file async mutex using promise-chain pattern from `cli/src/manifest/store.ts`
- **Testing**: vitest (bun test runner), same patterns as `in-memory.test.ts`

## Constraints (from Design Decisions)

- IDs: `bm-xxxx` for epics, `bm-xxxx.n` for features (sequential ordinal)
- `depends_on` stored inline on entities
- Wave computed on-read, not stored
- Status enums: `EpicStatus` and `FeatureStatus` as defined in types.ts
- `load()` and `save()` are synchronous in the interface but `JsonFileStore` uses sync fs for simplicity
- Concurrency handled by `transact()` wrapper (async mutex around load-mutate-save)
- Parent-child derived from dot-notation ID hierarchy

## Tech Stack

- TypeScript, ESM modules (.js extensions in imports)
- Bun runtime
- Vitest for unit tests (run: `bun test <file>`)
- Node `fs` (readFileSync, writeFileSync, existsSync, mkdirSync)
- Node `path` (resolve)

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/store/json-file-store.ts` | Create | `JsonFileStore` class — file I/O, async mutex, delegates to `InMemoryTaskStore` |
| `src/store/json-file-store.test.ts` | Create | Unit tests for `JsonFileStore` — CRUD, load/save round-trip, concurrency, file I/O |
| `src/store/index.ts` | Create | Barrel export — re-exports types, InMemoryTaskStore, JsonFileStore |

---

## Task 0: Create JsonFileStore with load/save

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `src/store/json-file-store.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/json-file-store.test.ts` with the first test:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { JsonFileStore } from "./json-file-store.js";
import { existsSync, mkdirSync, rmSync, readFileSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

describe("JsonFileStore", () => {
  let storeDir: string;
  let storePath: string;
  let store: JsonFileStore;

  beforeEach(() => {
    storeDir = resolve(tmpdir(), `beastmode-test-${randomUUID()}`);
    mkdirSync(storeDir, { recursive: true });
    storePath = resolve(storeDir, "store.json");
    store = new JsonFileStore(storePath);
  });

  afterEach(() => {
    rmSync(storeDir, { recursive: true, force: true });
  });

  describe("load/save round-trip", () => {
    it("should create store file on first save", () => {
      const epic = store.addEpic({ name: "Test Epic" });
      store.save();

      expect(existsSync(storePath)).toBe(true);

      const raw = JSON.parse(readFileSync(storePath, "utf-8"));
      expect(raw.version).toBe(1);
      expect(raw.entities[epic.id]).toBeDefined();
      expect(raw.entities[epic.id].name).toBe("Test Epic");
    });

    it("should load existing store from file", () => {
      const epic = store.addEpic({ name: "Test Epic" });
      const feature = store.addFeature({ parent: epic.id, name: "Feature 1" });
      store.save();

      // Create new store instance pointing to same file
      const store2 = new JsonFileStore(storePath);
      store2.load();

      const loadedEpic = store2.getEpic(epic.id);
      expect(loadedEpic).toBeDefined();
      expect(loadedEpic!.name).toBe("Test Epic");

      const loadedFeature = store2.getFeature(feature.id);
      expect(loadedFeature).toBeDefined();
      expect(loadedFeature!.name).toBe("Feature 1");
      expect(loadedFeature!.parent).toBe(epic.id);
    });

    it("should preserve all entity fields through save/load", () => {
      const epic = store.addEpic({ name: "My Epic", slug: "my-epic" });
      store.updateEpic(epic.id, {
        status: "implement",
        summary: "A summary",
        design: "artifacts/design/2026-04-04-my-epic.md",
        depends_on: [],
        worktree: { branch: "feature/my-epic", path: ".claude/worktrees/my-epic" },
      });

      const feature = store.addFeature({ parent: epic.id, name: "Feature", description: "Desc" });
      store.updateFeature(feature.id, {
        status: "in-progress",
        plan: "artifacts/plan/2026-04-04-my-epic-feature.md",
        depends_on: [],
      });

      store.save();

      const store2 = new JsonFileStore(storePath);
      store2.load();

      const e = store2.getEpic(epic.id)!;
      expect(e.status).toBe("implement");
      expect(e.summary).toBe("A summary");
      expect(e.design).toBe("artifacts/design/2026-04-04-my-epic.md");
      expect(e.worktree).toEqual({ branch: "feature/my-epic", path: ".claude/worktrees/my-epic" });

      const f = store2.getFeature(feature.id)!;
      expect(f.status).toBe("in-progress");
      expect(f.plan).toBe("artifacts/plan/2026-04-04-my-epic-feature.md");
      expect(f.description).toBe("Desc");
    });

    it("should handle load when file does not exist (empty store)", () => {
      store.load(); // Should not throw
      expect(store.listEpics()).toEqual([]);
    });

    it("should create parent directory on save if needed", () => {
      const nestedPath = resolve(storeDir, "nested", "deep", "store.json");
      const nestedStore = new JsonFileStore(nestedPath);
      nestedStore.addEpic({ name: "Epic" });
      nestedStore.save();
      expect(existsSync(nestedPath)).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/store/json-file-store.test.ts`
Expected: FAIL — module `./json-file-store.js` not found

- [ ] **Step 3: Write JsonFileStore implementation**

Create `src/store/json-file-store.ts`:

```typescript
/**
 * JSON file-backed implementation of TaskStore.
 *
 * Delegates all business logic to InMemoryTaskStore.
 * Adds file I/O (load/save) and async mutex for concurrency.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "fs";
import { dirname } from "path";
import { InMemoryTaskStore } from "./in-memory.js";
import type {
  TaskStore,
  Entity,
  Epic,
  Feature,
  EpicPatch,
  FeaturePatch,
  TreeNode,
  EntityType,
} from "./types.js";

/** On-disk JSON schema */
interface StoreFile {
  version: number;
  entities: Record<string, Entity>;
}

const CURRENT_VERSION = 1;

export class JsonFileStore implements TaskStore {
  private inner: InMemoryTaskStore;
  private filePath: string;

  /** Per-file async mutex — promise chain serializes concurrent transact() calls. */
  private lock: Promise<void> = Promise.resolve();

  constructor(filePath: string) {
    this.filePath = filePath;
    this.inner = new InMemoryTaskStore();
  }

  // --- Lifecycle ---

  load(): void {
    if (!existsSync(this.filePath)) return; // Empty store

    const raw = readFileSync(this.filePath, "utf-8");
    const data: StoreFile = JSON.parse(raw);

    // Rebuild InMemoryTaskStore from persisted entities
    this.inner = new InMemoryTaskStore();
    this.inner.loadEntities(data.entities);
  }

  save(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const data: StoreFile = {
      version: CURRENT_VERSION,
      entities: this.inner.dumpEntities(),
    };

    writeFileSync(this.filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  }

  /**
   * Atomically load → mutate → save under an async mutex.
   * Serializes concurrent mutations to prevent data races.
   */
  async transact<T>(fn: (store: JsonFileStore) => T): Promise<T> {
    const prev = this.lock;
    let release!: () => void;
    this.lock = new Promise<void>((r) => { release = r; });
    await prev;
    try {
      this.load();
      const result = fn(this);
      this.save();
      return result;
    } finally {
      release();
    }
  }

  // --- Epic CRUD (delegate to inner) ---

  getEpic(id: string): Epic | undefined {
    return this.inner.getEpic(id);
  }

  listEpics(): Epic[] {
    return this.inner.listEpics();
  }

  addEpic(opts: { name: string; slug?: string }): Epic {
    return this.inner.addEpic(opts);
  }

  updateEpic(id: string, patch: EpicPatch): Epic {
    return this.inner.updateEpic(id, patch);
  }

  deleteEpic(id: string): void {
    this.inner.deleteEpic(id);
  }

  // --- Feature CRUD (delegate to inner) ---

  getFeature(id: string): Feature | undefined {
    return this.inner.getFeature(id);
  }

  listFeatures(epicId: string): Feature[] {
    return this.inner.listFeatures(epicId);
  }

  addFeature(opts: { parent: string; name: string; description?: string }): Feature {
    return this.inner.addFeature(opts);
  }

  updateFeature(id: string, patch: FeaturePatch): Feature {
    return this.inner.updateFeature(id, patch);
  }

  deleteFeature(id: string): void {
    this.inner.deleteFeature(id);
  }

  // --- Queries (delegate to inner) ---

  ready(opts?: { epicId?: string; type?: EntityType }): Entity[] {
    return this.inner.ready(opts);
  }

  blocked(): Entity[] {
    return this.inner.blocked();
  }

  tree(rootId?: string): TreeNode[] {
    return this.inner.tree(rootId);
  }

  find(idOrSlug: string): Entity | undefined {
    return this.inner.find(idOrSlug);
  }

  // --- Dependency graph (delegate to inner) ---

  dependencyChain(id: string): Entity[] {
    return this.inner.dependencyChain(id);
  }

  computeWave(id: string): number {
    return this.inner.computeWave(id);
  }

  detectCycles(): string[][] {
    return this.inner.detectCycles();
  }
}
```

- [ ] **Step 4: Add loadEntities/dumpEntities to InMemoryTaskStore**

Add two methods to `src/store/in-memory.ts` that `JsonFileStore` needs for serialization:

```typescript
/**
 * Bulk-load entities from a flat map (used by JsonFileStore on load).
 * Reconstructs the internal entity map and epic counters.
 */
loadEntities(entities: Record<string, Entity>): void {
  this.entities.clear();
  this.epicCounters.clear();

  for (const [id, entity] of Object.entries(entities)) {
    this.entities.set(id, entity);
  }

  // Reconstruct epic counters from existing feature IDs
  for (const entity of this.entities.values()) {
    if (entity.type === "feature") {
      const parts = entity.id.split(".");
      const parentId = parts.slice(0, -1).join(".");
      const ordinal = parseInt(parts[parts.length - 1], 10);
      const current = this.epicCounters.get(parentId) ?? 0;
      if (ordinal > current) {
        this.epicCounters.set(parentId, ordinal);
      }
    }
  }

  // Ensure all epics have counters
  for (const entity of this.entities.values()) {
    if (entity.type === "epic" && !this.epicCounters.has(entity.id)) {
      this.epicCounters.set(entity.id, 0);
    }
  }
}

/**
 * Dump all entities as a flat record (used by JsonFileStore on save).
 */
dumpEntities(): Record<string, Entity> {
  const result: Record<string, Entity> = {};
  for (const [id, entity] of this.entities) {
    result[id] = entity;
  }
  return result;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test src/store/json-file-store.test.ts`
Expected: PASS — all 5 tests pass

- [ ] **Step 6: Commit**

```bash
git add src/store/json-file-store.ts src/store/json-file-store.test.ts src/store/in-memory.ts
git commit -m "feat(store): add JsonFileStore with load/save round-trip"
```

---

## Task 1: Add CRUD tests for JsonFileStore

**Wave:** 1
**Depends on:** Task 0

**Files:**
- Modify: `src/store/json-file-store.test.ts`

- [ ] **Step 1: Add CRUD test cases**

Append to `src/store/json-file-store.test.ts` inside the main `describe` block:

```typescript
  describe("Epic CRUD", () => {
    it("should add epic with auto-generated ID", () => {
      const epic = store.addEpic({ name: "Test Epic" });
      expect(epic.id).toMatch(/^bm-[0-9a-f]{4}$/);
      expect(epic.name).toBe("Test Epic");
      expect(epic.slug).toBe("test-epic");
      expect(epic.status).toBe("design");
      expect(epic.type).toBe("epic");
      expect(epic.depends_on).toEqual([]);
    });

    it("should get, update, delete epic", () => {
      const epic = store.addEpic({ name: "Epic" });
      expect(store.getEpic(epic.id)).toBeDefined();

      const updated = store.updateEpic(epic.id, { status: "plan" });
      expect(updated.status).toBe("plan");

      store.deleteEpic(epic.id);
      expect(store.getEpic(epic.id)).toBeUndefined();
    });

    it("should list all epics", () => {
      store.addEpic({ name: "Epic 1" });
      store.addEpic({ name: "Epic 2" });
      expect(store.listEpics()).toHaveLength(2);
    });

    it("should delete child features when deleting epic", () => {
      const epic = store.addEpic({ name: "Epic" });
      const feat = store.addFeature({ parent: epic.id, name: "Feat" });
      store.deleteEpic(epic.id);
      expect(store.getFeature(feat.id)).toBeUndefined();
    });
  });

  describe("Feature CRUD", () => {
    it("should add feature with hierarchical ID", () => {
      const epic = store.addEpic({ name: "Epic" });
      const f1 = store.addFeature({ parent: epic.id, name: "Feature 1" });
      const f2 = store.addFeature({ parent: epic.id, name: "Feature 2" });
      expect(f1.id).toBe(`${epic.id}.1`);
      expect(f2.id).toBe(`${epic.id}.2`);
      expect(f1.type).toBe("feature");
      expect(f1.parent).toBe(epic.id);
      expect(f1.status).toBe("pending");
    });

    it("should get, update, delete feature", () => {
      const epic = store.addEpic({ name: "Epic" });
      const feat = store.addFeature({ parent: epic.id, name: "Feat" });
      expect(store.getFeature(feat.id)).toBeDefined();

      const updated = store.updateFeature(feat.id, { status: "in-progress" });
      expect(updated.status).toBe("in-progress");

      store.deleteFeature(feat.id);
      expect(store.getFeature(feat.id)).toBeUndefined();
    });

    it("should list features for a specific epic", () => {
      const e1 = store.addEpic({ name: "E1" });
      const e2 = store.addEpic({ name: "E2" });
      store.addFeature({ parent: e1.id, name: "F1" });
      store.addFeature({ parent: e2.id, name: "F2" });
      expect(store.listFeatures(e1.id)).toHaveLength(1);
      expect(store.listFeatures(e2.id)).toHaveLength(1);
    });

    it("should throw when adding feature to non-existent epic", () => {
      expect(() => store.addFeature({ parent: "bm-0000", name: "X" })).toThrow();
    });

    it("should continue sequential IDs after load", () => {
      const epic = store.addEpic({ name: "Epic" });
      store.addFeature({ parent: epic.id, name: "F1" });
      store.addFeature({ parent: epic.id, name: "F2" });
      store.save();

      const store2 = new JsonFileStore(storePath);
      store2.load();
      const f3 = store2.addFeature({ parent: epic.id, name: "F3" });
      expect(f3.id).toBe(`${epic.id}.3`);
    });
  });
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `bun test src/store/json-file-store.test.ts`
Expected: PASS — all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/store/json-file-store.test.ts
git commit -m "test(store): add CRUD tests for JsonFileStore"
```

---

## Task 2: Add query and dependency graph tests

**Wave:** 1
**Depends on:** Task 1

**Files:**
- Modify: `src/store/json-file-store.test.ts`

- [ ] **Step 1: Add query and dependency tests**

Append to `src/store/json-file-store.test.ts` inside the main `describe` block:

```typescript
  describe("Queries", () => {
    it("should find entity by ID", () => {
      const epic = store.addEpic({ name: "Epic" });
      expect(store.find(epic.id)).toEqual(epic);
    });

    it("should find epic by slug", () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-slug" });
      expect(store.find("test-slug")).toEqual(epic);
    });

    it("should return undefined for unknown", () => {
      expect(store.find("nope")).toBeUndefined();
    });

    it("should return blocked entities", () => {
      const epic = store.addEpic({ name: "Epic" });
      const f1 = store.addFeature({ parent: epic.id, name: "F1" });
      store.updateFeature(f1.id, { status: "blocked" });
      const blocked = store.blocked();
      expect(blocked).toHaveLength(1);
      expect(blocked[0].id).toBe(f1.id);
    });

    it("should build tree hierarchy", () => {
      const epic = store.addEpic({ name: "Epic" });
      store.addFeature({ parent: epic.id, name: "F1" });
      store.addFeature({ parent: epic.id, name: "F2" });
      const tree = store.tree();
      expect(tree.length).toBeGreaterThanOrEqual(1);
      const node = tree.find((n) => n.entity.id === epic.id);
      expect(node?.children).toHaveLength(2);
    });

    it("should return ready features (no unresolved deps, parent not cancelled)", () => {
      const epic = store.addEpic({ name: "Epic" });
      store.addFeature({ parent: epic.id, name: "F1" }); // pending, no deps
      const ready = store.ready({ type: "feature" });
      expect(ready).toHaveLength(1);
    });

    it("should exclude features with unresolved deps from ready", () => {
      const epic = store.addEpic({ name: "Epic" });
      const f1 = store.addFeature({ parent: epic.id, name: "F1" });
      const f2 = store.addFeature({ parent: epic.id, name: "F2" });
      store.updateFeature(f2.id, { depends_on: [f1.id] });
      const ready = store.ready({ type: "feature" });
      expect(ready).toHaveLength(1);
      expect(ready[0].id).toBe(f1.id);
    });
  });

  describe("Dependency graph", () => {
    it("should compute wave 1 for entity with no deps", () => {
      const epic = store.addEpic({ name: "Epic" });
      expect(store.computeWave(epic.id)).toBe(1);
    });

    it("should compute wave based on dependency depth", () => {
      const e1 = store.addEpic({ name: "E1" });
      const e2 = store.addEpic({ name: "E2" });
      const e3 = store.addEpic({ name: "E3" });
      store.updateEpic(e2.id, { depends_on: [e1.id] });
      store.updateEpic(e3.id, { depends_on: [e2.id] });
      expect(store.computeWave(e1.id)).toBe(1);
      expect(store.computeWave(e2.id)).toBe(2);
      expect(store.computeWave(e3.id)).toBe(3);
    });

    it("should return dependency chain in topological order", () => {
      const e1 = store.addEpic({ name: "E1" });
      const e2 = store.addEpic({ name: "E2" });
      store.updateEpic(e2.id, { depends_on: [e1.id] });
      const chain = store.dependencyChain(e2.id);
      expect(chain.map((e) => e.id)).toEqual([e1.id, e2.id]);
    });

    it("should detect cycles", () => {
      const e1 = store.addEpic({ name: "E1" });
      const e2 = store.addEpic({ name: "E2" });
      store.updateEpic(e1.id, { depends_on: [e2.id] });
      store.updateEpic(e2.id, { depends_on: [e1.id] });
      const cycles = store.detectCycles();
      expect(cycles.length).toBeGreaterThan(0);
    });

    it("should detect no cycles in acyclic graph", () => {
      const e1 = store.addEpic({ name: "E1" });
      const e2 = store.addEpic({ name: "E2" });
      store.updateEpic(e2.id, { depends_on: [e1.id] });
      expect(store.detectCycles()).toHaveLength(0);
    });
  });
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `bun test src/store/json-file-store.test.ts`
Expected: PASS — all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/store/json-file-store.test.ts
git commit -m "test(store): add query and dependency graph tests for JsonFileStore"
```

---

## Task 3: Add concurrency (transact) tests

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `src/store/json-file-store.test.ts`

- [ ] **Step 1: Add transact/concurrency tests**

Append to `src/store/json-file-store.test.ts` inside the main `describe` block:

```typescript
  describe("transact() — async mutex", () => {
    it("should serialize concurrent mutations", async () => {
      // Pre-populate
      store.addEpic({ name: "Epic" });
      store.save();

      const store2 = new JsonFileStore(storePath);

      // Fire 10 concurrent transact calls that each add an epic
      const promises = Array.from({ length: 10 }, (_, i) =>
        store2.transact((s) => {
          s.addEpic({ name: `Concurrent Epic ${i}` });
        })
      );

      await Promise.all(promises);

      // Reload and verify all 11 epics exist (1 original + 10 concurrent)
      const store3 = new JsonFileStore(storePath);
      store3.load();
      expect(store3.listEpics()).toHaveLength(11);
    });

    it("should reload from disk on each transact call", async () => {
      // Store1 adds an epic and saves
      store.addEpic({ name: "Epic From Store 1" });
      store.save();

      // Store2 transacts — should see Store1's epic
      const store2 = new JsonFileStore(storePath);
      await store2.transact((s) => {
        const epics = s.listEpics();
        expect(epics).toHaveLength(1);
        expect(epics[0].name).toBe("Epic From Store 1");
        s.addEpic({ name: "Epic From Store 2" });
      });

      // Verify both epics persisted
      const store3 = new JsonFileStore(storePath);
      store3.load();
      expect(store3.listEpics()).toHaveLength(2);
    });

    it("should not save if transact callback throws", async () => {
      store.addEpic({ name: "Existing" });
      store.save();

      const store2 = new JsonFileStore(storePath);
      await expect(
        store2.transact(() => {
          throw new Error("Oops");
        })
      ).rejects.toThrow("Oops");

      // Original data should be unchanged
      const store3 = new JsonFileStore(storePath);
      store3.load();
      expect(store3.listEpics()).toHaveLength(1);
      expect(store3.listEpics()[0].name).toBe("Existing");
    });
  });
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `bun test src/store/json-file-store.test.ts`
Expected: PASS — all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/store/json-file-store.test.ts
git commit -m "test(store): add transact concurrency tests for JsonFileStore"
```

---

## Task 4: Create barrel export (index.ts)

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Create: `src/store/index.ts`

- [ ] **Step 1: Create index.ts**

```typescript
/**
 * Store module barrel export.
 *
 * Re-exports the TaskStore interface, entity types, and implementations.
 */

export type {
  TaskStore,
  Entity,
  Epic,
  Feature,
  EpicPatch,
  FeaturePatch,
  TreeNode,
  EntityType,
  EpicStatus,
  FeatureStatus,
} from "./types.js";

export { InMemoryTaskStore } from "./in-memory.js";
export { JsonFileStore } from "./json-file-store.js";
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `bun x tsc --noEmit src/store/index.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/store/index.ts
git commit -m "feat(store): add barrel export for store module"
```

---

## Task 5: Run full test suite and verify

**Wave:** 3
**Depends on:** Task 0, Task 1, Task 2, Task 3, Task 4

**Files:**
- (none — verification only)

- [ ] **Step 1: Run all store tests**

Run: `bun test src/store/json-file-store.test.ts`
Expected: PASS — all tests pass

- [ ] **Step 2: Run InMemoryTaskStore tests (regression check)**

Run: `bun test src/store/in-memory.test.ts`
Expected: 41 pass, 1 known failure (ready() epic filtering — pre-existing)

- [ ] **Step 3: Run typecheck**

Run: `bun x tsc --noEmit`
Expected: No errors (or only pre-existing ones)
