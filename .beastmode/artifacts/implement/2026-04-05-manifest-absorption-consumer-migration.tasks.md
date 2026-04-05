# Consumer Migration — Implementation Tasks

## Goal

Migrate all remaining manifest consumers to read from the store and XState machine snapshots. After this feature, no production file imports from `manifest/` for epic/feature state.

## Architecture

- **Store module** (`cli/src/store/`): `TaskStore` interface with `Epic`, `Feature`, `EnrichedEpic`, `NextAction` types
- **XState pipeline machine** (`cli/src/pipeline-machine/`): `epicMachine` with `EpicContext`, state metadata `dispatchType`
- **GitHub sync refs** (`cli/src/github/sync-refs.ts`): `SyncRefs` — separate from store entities
- **Manifest module** (`cli/src/manifest/`): being deprecated — `store.ts`, `pure.ts` exports being replaced

## Tech Stack

- TypeScript, Bun runtime, Vitest test runner
- XState v5 for state machine
- Ink/React for dashboard TUI
- Test command: `cd cli && bun --bun vitest run`

## File Structure

### New Files
- `cli/src/store/scan.ts` — Store-based `listEnrichedFromStore()` function replacing `manifest/store.listEnriched()`

### Modified Files (Production)
- `cli/src/dispatch/types.ts` — Re-export `EnrichedEpic`, `NextAction` from store instead of manifest
- `cli/src/commands/watch-loop.ts` — Use `EnrichedEpic` instead of `EnrichedManifest`, update `WatchDeps.scanEpics` signature
- `cli/src/commands/dashboard.ts` — Import `listEnrichedFromStore` from store/scan instead of `listEnriched` from manifest/store
- `cli/src/commands/phase.ts` — Remove manifest fallback path, use store exclusively; design phase creates store entity
- `cli/src/commands/cancel-logic.ts` — Replace `store.find/remove` (manifest) with TaskStore-based deletion
- `cli/src/dispatch/it2.ts` — Replace manifest `store.load()` with TaskStore `find()`
- `cli/src/dashboard/overview-panel.ts` — Use `EnrichedEpic` instead of `EnrichedManifest`
- `cli/src/dashboard/App.tsx` — Use `EnrichedEpic[]`, import from store instead of manifest
- `cli/src/dashboard/EpicsPanel.tsx` — Use `EnrichedEpic` instead of `EnrichedManifest`
- `cli/src/scripts/backfill-enrichment.ts` — Replace manifest `list`/`load` with store operations

### Modified Files (Tests)
- `cli/src/__tests__/watch.test.ts` — Use `EnrichedEpic` type
- `cli/src/__tests__/watch-events.test.ts` — Use `EnrichedEpic` type
- `cli/src/__tests__/watch-dispatch-race.test.ts` — Use `EnrichedEpic` type
- `cli/src/__tests__/wave-dispatch.test.ts` — Use `EnrichedEpic` type
- `cli/src/__tests__/cancel-logic.test.ts` — Update mocks from manifest store to TaskStore
- `cli/src/__tests__/overview-panel.test.ts` — Use `EnrichedEpic` type
- `cli/src/__tests__/app-integration.test.ts` — Use `EnrichedEpic` type
- `cli/src/__tests__/epics-panel.test.ts` — Use `EnrichedEpic` type
- `cli/src/__tests__/backfill-enrichment.test.ts` — Update mocks for store operations
- `cli/src/__tests__/phase-dispatch.test.ts` — Update imports

---

## Task 0: Integration Test

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/consumer-migration.integration.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
/**
 * Consumer Migration Integration Test
 *
 * Verifies that the watch loop and dashboard consume store entities
 * instead of manifests, and derive dispatch decisions from XState
 * machine snapshots.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryTaskStore } from "../store/in-memory.js";
import type { EnrichedEpic, NextAction } from "../store/types.js";
import type { Epic, Feature } from "../store/types.js";

describe("@manifest-absorption: Watch loop and dashboard consume store entities", () => {
  let store: InMemoryTaskStore;

  beforeEach(() => {
    store = new InMemoryTaskStore();
  });

  describe("Watch loop discovers epics by scanning the store", () => {
    it("finds all epics from the store", async () => {
      const epic1 = store.addEpic({ name: "Auth System", slug: "auth-system" });
      store.updateEpic(epic1.id, { status: "plan" });

      const epic2 = store.addEpic({ name: "Data Pipeline", slug: "data-pipeline" });
      store.updateEpic(epic2.id, { status: "implement" });

      // Import the store-based scan function
      const { listEnrichedFromStore } = await import("../store/scan.js");
      const result = listEnrichedFromStore(store);

      expect(result.length).toBe(2);
      expect(result.map(e => e.slug)).toContain("auth-system");
      expect(result.map(e => e.slug)).toContain("data-pipeline");
    });

    it("each epic has a machine-derived next action", async () => {
      const epic = store.addEpic({ name: "Auth System", slug: "auth-system" });
      store.updateEpic(epic.id, { status: "plan" });

      const { listEnrichedFromStore } = await import("../store/scan.js");
      const result = listEnrichedFromStore(store);
      const enriched = result.find(e => e.slug === "auth-system");

      expect(enriched).toBeDefined();
      expect(enriched!.nextAction).toBeDefined();
      expect(enriched!.nextAction!.phase).toBe("plan");
      expect(enriched!.nextAction!.type).toBe("single");
    });
  });

  describe("Watch loop derives dispatch decisions from machine snapshots", () => {
    it("identifies ready features based on dependency completion", async () => {
      const epic = store.addEpic({ name: "Auth System", slug: "auth-system" });
      store.updateEpic(epic.id, { status: "implement" });

      const f1 = store.addFeature({ parent: epic.id, name: "Login Flow", slug: "login-flow" });
      store.updateFeature(f1.id, { status: "completed" });

      const f2 = store.addFeature({ parent: epic.id, name: "Token Cache", slug: "token-cache" });
      // f2 depends on f1 — but f1 completed, so f2 is pending and dispatchable

      const { listEnrichedFromStore } = await import("../store/scan.js");
      const result = listEnrichedFromStore(store);
      const enriched = result.find(e => e.slug === "auth-system");

      expect(enriched).toBeDefined();
      expect(enriched!.nextAction).toBeDefined();
      expect(enriched!.nextAction!.type).toBe("fan-out");
      expect(enriched!.nextAction!.features).toContain("token-cache");
    });
  });

  describe("Watch loop scan is a single store parse", () => {
    it("all epic discovery happens from a single store read", async () => {
      store.addEpic({ name: "Epic 1", slug: "epic-1" });
      store.addEpic({ name: "Epic 2", slug: "epic-2" });
      store.addEpic({ name: "Epic 3", slug: "epic-3" });

      const { listEnrichedFromStore } = await import("../store/scan.js");
      // Single call — no manifest files consulted
      const result = listEnrichedFromStore(store);
      expect(result.length).toBe(3);
    });
  });

  describe("Dashboard renders epic state from store entities", () => {
    it("displays epic phase from store entity", async () => {
      const epic = store.addEpic({ name: "Auth System", slug: "auth-system" });
      store.updateEpic(epic.id, { status: "implement" });

      const f1 = store.addFeature({ parent: epic.id, name: "Login", slug: "login" });
      store.updateFeature(f1.id, { status: "completed" });
      store.addFeature({ parent: epic.id, name: "Signup", slug: "signup" });

      const { listEnrichedFromStore } = await import("../store/scan.js");
      const result = listEnrichedFromStore(store);
      const enriched = result.find(e => e.slug === "auth-system");

      expect(enriched).toBeDefined();
      expect(enriched!.status).toBe("implement");
    });
  });

  describe("Dashboard shows XState-derived enrichment", () => {
    it("shows machine-derived next action", async () => {
      const epic = store.addEpic({ name: "Auth System", slug: "auth-system" });
      store.updateEpic(epic.id, { status: "implement" });

      store.addFeature({ parent: epic.id, name: "Login", slug: "login" });

      const { listEnrichedFromStore } = await import("../store/scan.js");
      const result = listEnrichedFromStore(store);
      const enriched = result.find(e => e.slug === "auth-system");

      expect(enriched!.nextAction).toBeDefined();
      expect(enriched!.nextAction!.type).toBe("fan-out");
    });
  });

  describe("Dashboard and store commands show consistent data", () => {
    it("both views show same epic phase and feature statuses", async () => {
      const epic = store.addEpic({ name: "Auth System", slug: "auth-system" });
      store.updateEpic(epic.id, { status: "implement" });

      const f1 = store.addFeature({ parent: epic.id, name: "Login", slug: "login" });
      store.updateFeature(f1.id, { status: "completed" });
      const f2 = store.addFeature({ parent: epic.id, name: "Signup", slug: "signup" });
      const f3 = store.addFeature({ parent: epic.id, name: "Reset", slug: "reset" });

      // Store tree view
      const storeEpic = store.getEpic(epic.id);
      const storeFeatures = store.listFeatures(epic.id);

      // Enriched view (what dashboard would see)
      const { listEnrichedFromStore } = await import("../store/scan.js");
      const enrichedEpics = listEnrichedFromStore(store);
      const enriched = enrichedEpics.find(e => e.slug === "auth-system")!;

      // Both show same phase
      expect(enriched.status).toBe(storeEpic!.status);
      // Both have same number of features accessible
      expect(storeFeatures.length).toBe(3);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/consumer-migration.integration.test.ts`
Expected: FAIL — `../store/scan.js` module not found

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/consumer-migration.integration.test.ts
git commit -m "test(consumer-migration): add integration test (RED)"
```

---

## Task 1: Store Scan Function

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/src/store/scan.ts`
- Create: `cli/src/__tests__/store-scan.test.ts`
- Modify: `cli/src/store/index.ts`

- [ ] **Step 1: Write the unit test**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryTaskStore } from "../store/in-memory.js";
import { listEnrichedFromStore } from "../store/scan.js";
import type { EnrichedEpic } from "../store/types.js";

describe("listEnrichedFromStore", () => {
  let store: InMemoryTaskStore;

  beforeEach(() => {
    store = new InMemoryTaskStore();
  });

  it("returns empty array for empty store", () => {
    const result = listEnrichedFromStore(store);
    expect(result).toEqual([]);
  });

  it("returns enriched epics with nextAction for plan phase", () => {
    const epic = store.addEpic({ name: "Test", slug: "test-epic" });
    store.updateEpic(epic.id, { status: "plan" });

    const result = listEnrichedFromStore(store);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("test-epic");
    expect(result[0].nextAction).toEqual({
      phase: "plan",
      args: [epic.slug],
      type: "single",
    });
  });

  it("returns fan-out nextAction for implement phase with pending features", () => {
    const epic = store.addEpic({ name: "Test", slug: "test-epic" });
    store.updateEpic(epic.id, { status: "implement" });
    const f1 = store.addFeature({ parent: epic.id, name: "F1", slug: "f1" });
    const f2 = store.addFeature({ parent: epic.id, name: "F2", slug: "f2" });

    const result = listEnrichedFromStore(store);
    expect(result[0].nextAction).toEqual({
      phase: "implement",
      args: [epic.slug],
      type: "fan-out",
      features: ["f1", "f2"],
    });
  });

  it("returns null nextAction for done phase", () => {
    const epic = store.addEpic({ name: "Test", slug: "test-epic" });
    store.updateEpic(epic.id, { status: "done" });

    const result = listEnrichedFromStore(store);
    expect(result[0].nextAction).toBeNull();
  });

  it("returns null nextAction for cancelled phase", () => {
    const epic = store.addEpic({ name: "Test", slug: "test-epic" });
    store.updateEpic(epic.id, { status: "cancelled" });

    const result = listEnrichedFromStore(store);
    expect(result[0].nextAction).toBeNull();
  });

  it("skips completed features in fan-out", () => {
    const epic = store.addEpic({ name: "Test", slug: "test-epic" });
    store.updateEpic(epic.id, { status: "implement" });
    const f1 = store.addFeature({ parent: epic.id, name: "F1", slug: "f1" });
    store.updateFeature(f1.id, { status: "completed" });
    const f2 = store.addFeature({ parent: epic.id, name: "F2", slug: "f2" });

    const result = listEnrichedFromStore(store);
    expect(result[0].nextAction!.features).toEqual(["f2"]);
  });

  it("returns null nextAction when all features completed", () => {
    const epic = store.addEpic({ name: "Test", slug: "test-epic" });
    store.updateEpic(epic.id, { status: "implement" });
    const f1 = store.addFeature({ parent: epic.id, name: "F1", slug: "f1" });
    store.updateFeature(f1.id, { status: "completed" });

    const result = listEnrichedFromStore(store);
    // All features completed — no action
    expect(result[0].nextAction).toBeNull();
  });

  it("returns design phase as skip (null nextAction)", () => {
    const epic = store.addEpic({ name: "Test", slug: "test-epic" });
    // Default status is "design"

    const result = listEnrichedFromStore(store);
    expect(result[0].nextAction).toBeNull();
  });

  it("wave-aware: only dispatches lowest wave features", () => {
    const epic = store.addEpic({ name: "Test", slug: "test-epic" });
    store.updateEpic(epic.id, { status: "implement" });

    // f1 has no deps (wave 1), f2 depends on f1 (wave 2)
    const f1 = store.addFeature({ parent: epic.id, name: "F1", slug: "f1" });
    const f2 = store.addFeature({ parent: epic.id, name: "F2", slug: "f2" });
    store.updateFeature(f2.id, { depends_on: [f1.id] });

    const result = listEnrichedFromStore(store);
    // Only f1 should be in the dispatch (wave 1)
    expect(result[0].nextAction!.features).toEqual(["f1"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/store-scan.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the store scan function**

```typescript
/**
 * Store-based epic scan — replaces manifest/store.listEnriched().
 *
 * Lists all epics from the store, derives nextAction from dispatch
 * type logic (matching the XState machine state metadata), and returns
 * EnrichedEpic[] for consumption by watch loop and dashboard.
 */

import type { TaskStore, Epic, Feature, EnrichedEpic, NextAction } from "./types.js";

/** Dispatch type per phase — matches epicMachine state metadata. */
const DISPATCH_TYPE: Record<string, "single" | "fan-out" | "skip"> = {
  design: "skip",
  plan: "single",
  implement: "fan-out",
  validate: "single",
  release: "single",
  done: "skip",
  cancelled: "skip",
};

/**
 * Derive next action from an epic and its features.
 * Pure function — no filesystem, no XState actor hydration needed
 * because the dispatch type is a static property of the phase.
 */
function deriveNextAction(epic: Epic, features: Feature[]): NextAction | null {
  const dt = DISPATCH_TYPE[epic.status];
  if (!dt || dt === "skip") return null;

  if (dt === "fan-out") {
    const incompleteFeatures = features.filter(
      (f) => f.status === "pending" || f.status === "in-progress" || f.status === "blocked",
    );
    if (incompleteFeatures.length === 0) return null;

    // Wave-aware filtering: compute wave from dependency graph
    // Features with no dependencies are wave 1, features depending on wave N are wave N+1
    const waveOf = (f: Feature): number => {
      if (f.depends_on.length === 0) return 1;
      const depWaves = f.depends_on.map((depId) => {
        const dep = features.find((d) => d.id === depId);
        return dep ? waveOf(dep) : 1;
      });
      return Math.max(...depWaves) + 1;
    };

    const featureWaves = incompleteFeatures.map((f) => ({
      feature: f,
      wave: waveOf(f),
    }));

    const lowestWave = Math.min(...featureWaves.map((fw) => fw.wave));
    const lowestWaveFeatures = featureWaves
      .filter((fw) => fw.wave === lowestWave)
      .map((fw) => fw.feature);

    // Only dispatch pending/in-progress features (not blocked)
    const dispatchable = lowestWaveFeatures
      .filter((f) => f.status === "pending" || f.status === "in-progress")
      .map((f) => f.slug);

    if (dispatchable.length === 0) return null;

    return {
      phase: epic.status,
      args: [epic.slug],
      type: "fan-out",
      features: dispatchable,
    };
  }

  return {
    phase: epic.status,
    args: [epic.slug],
    type: "single",
  };
}

/**
 * List all epics enriched with nextAction from the store.
 * Single store read — no manifest files consulted.
 */
export function listEnrichedFromStore(store: TaskStore): EnrichedEpic[] {
  const epics = store.listEpics();

  return epics.map((epic) => {
    const features = store.listFeatures(epic.id);
    const nextAction = deriveNextAction(epic, features);

    return {
      ...epic,
      nextAction,
    };
  });
}
```

- [ ] **Step 4: Export from barrel**

Add to `cli/src/store/index.ts`:
```typescript
export { listEnrichedFromStore } from "./scan.js";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/store-scan.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add cli/src/store/scan.ts cli/src/store/index.ts cli/src/__tests__/store-scan.test.ts
git commit -m "feat(consumer-migration): add store-based listEnrichedFromStore scan"
```

---

## Task 2: Dispatch Types Re-export

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/dispatch/types.ts`

- [ ] **Step 1: Update dispatch/types.ts re-exports**

Replace the manifest re-exports with store re-exports:

Old:
```typescript
import type { EnrichedManifest, ScanResult, NextAction } from "../manifest/store.js";
export type { EnrichedManifest, ScanResult, NextAction };
```

New:
```typescript
import type { EnrichedEpic, NextAction } from "../store/types.js";
export type { EnrichedEpic, NextAction };
/**
 * @deprecated Use EnrichedEpic from store/types.js directly.
 * Kept as alias during migration for backward compat in tests.
 */
export type EnrichedManifest = EnrichedEpic;
/**
 * @deprecated Scan result wrapper removed — listEnrichedFromStore returns EnrichedEpic[] directly.
 */
export interface ScanResult {
  epics: EnrichedEpic[];
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd cli && bun x tsc --noEmit`
Expected: PASS (deprecated aliases maintain backward compat)

- [ ] **Step 3: Commit**

```bash
git add cli/src/dispatch/types.ts
git commit -m "feat(consumer-migration): re-export store types from dispatch/types"
```

---

## Task 3: Watch Loop Migration

**Wave:** 3
**Depends on:** Task 1, Task 2

**Files:**
- Modify: `cli/src/commands/watch-loop.ts`
- Modify: `cli/src/__tests__/watch.test.ts`
- Modify: `cli/src/__tests__/watch-events.test.ts`
- Modify: `cli/src/__tests__/watch-dispatch-race.test.ts`
- Modify: `cli/src/__tests__/wave-dispatch.test.ts`

- [ ] **Step 1: Update watch-loop.ts imports and types**

Replace:
```typescript
import type { EnrichedManifest, ScanResult } from "../manifest/store.js";
```
With:
```typescript
import type { EnrichedEpic } from "../store/types.js";
```

Update `WatchDeps` interface:
```typescript
export interface WatchDeps {
  scanEpics: (projectRoot: string) => Promise<EnrichedEpic[]>;
  sessionFactory: SessionFactory;
  logger?: Logger;
}
```

Update `tick()` method — remove `ScanResult` unwrap:
```typescript
let epics: EnrichedEpic[];
try {
  epics = await this.deps.scanEpics(this.config.projectRoot);
} catch (err) {
  this.logger.warn("state scan failed", { error: String(err) });
  return;
}
```

Update `processEpic` signature:
```typescript
private async processEpic(epic: EnrichedEpic): Promise<number>
```

Update `dispatchSingle` signature:
```typescript
private async dispatchSingle(epic: EnrichedEpic): Promise<number>
```

Update `dispatchFanOut` signature:
```typescript
private async dispatchFanOut(epic: EnrichedEpic, features: string[]): Promise<number>
```

Update `rescanEpic` — remove array check:
```typescript
private async rescanEpic(epicSlug: string): Promise<void> {
  try {
    const epics = await this.deps.scanEpics(this.config.projectRoot);
    const epic = epics.find((e) => e.slug === epicSlug);
    if (epic) {
      await this.processEpic(epic);
    }
  } catch (err) {
    this.logger.warn("epic re-scan failed", { epic: epicSlug, error: String(err) });
  }
}
```

In `dispatchFanOut`, update the `epic.features` access — `EnrichedEpic` extends `Epic` which doesn't have a `features` array inline. Features must be accessed differently. Since the watch loop gets features from `nextAction.features` (the slugs), and the provenance check needs the `plan` field, we need to change the validation logic.

The current code at line 263 does `epic.features.find(f => f.slug === featureSlug)` — but `Epic` doesn't have `.features`. The feature plan path needs to come from somewhere else. Two options:

1. Add a features accessor to the scan result
2. Pass features alongside the enriched epic

Best approach: extend `EnrichedEpic` in the scan function to include `features` for the watch loop's provenance check. Add a `featureList` field (array of `{slug, plan}` tuples) to the enriched result.

Actually, looking more carefully, the feature provenance check reads `feature.plan` to find the plan file on disk. Since the store `Feature` entity also has a `plan` field, we can add a `features` array to the scan result.

Update `cli/src/store/types.ts` — add a `features` field to `EnrichedEpic`:

No — that changes the store types which is a different feature. Instead, the scan function should return a richer type. Let's define a local type in the watch loop:

Actually, the cleanest approach: update `EnrichedEpic` in store/types.ts to include `features`:

```typescript
export interface EnrichedEpic extends Epic {
  nextAction: NextAction | null;
  features: Feature[];
}
```

Then `listEnrichedFromStore` already fetches features — just include them.

- [ ] **Step 2: Update store/types.ts EnrichedEpic to include features**

Add `features` field:
```typescript
export interface EnrichedEpic extends Epic {
  nextAction: NextAction | null;
  features: Feature[];
}
```

And update `listEnrichedFromStore` in `store/scan.ts` to include the features array in the returned objects.

- [ ] **Step 3: Update watch loop test files**

For each of `watch.test.ts`, `watch-events.test.ts`, `watch-dispatch-race.test.ts`, `wave-dispatch.test.ts`:

Replace:
```typescript
import type { EnrichedManifest } from "../manifest/store.js";
```
With:
```typescript
import type { EnrichedEpic } from "../store/types.js";
```

Replace all `EnrichedManifest` type annotations with `EnrichedEpic`.

The mock `scanEpics` functions need to return `EnrichedEpic[]` instead of `EnrichedManifest[] | ScanResult`. Key differences:
- `EnrichedEpic` has `id`, `type: "epic"`, `depends_on`, `created_at`, `updated_at` fields (from `Epic`)
- `EnrichedEpic` does NOT have `manifestPath` (from `EnrichedManifest`)
- `EnrichedEpic` has `features: Feature[]` array (from new EnrichedEpic)

Each test mock that creates fake epics needs these added:
```typescript
const fakeEpic: EnrichedEpic = {
  id: "bm-test",
  type: "epic",
  name: "Test Epic",
  slug: "test-epic",
  status: "plan",
  depends_on: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  nextAction: { phase: "plan", args: ["test-epic"], type: "single" },
  features: [],
};
```

- [ ] **Step 4: Run tests**

Run: `cd cli && bun --bun vitest run src/__tests__/watch.test.ts src/__tests__/watch-events.test.ts src/__tests__/watch-dispatch-race.test.ts src/__tests__/wave-dispatch.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/watch-loop.ts cli/src/store/types.ts cli/src/store/scan.ts cli/src/__tests__/watch.test.ts cli/src/__tests__/watch-events.test.ts cli/src/__tests__/watch-dispatch-race.test.ts cli/src/__tests__/wave-dispatch.test.ts
git commit -m "feat(consumer-migration): migrate watch loop to store types"
```

---

## Task 4: Dashboard Command and Panels

**Wave:** 3
**Depends on:** Task 1, Task 2

**Files:**
- Modify: `cli/src/commands/dashboard.ts`
- Modify: `cli/src/dashboard/overview-panel.ts`
- Modify: `cli/src/dashboard/App.tsx`
- Modify: `cli/src/dashboard/EpicsPanel.tsx`
- Modify: `cli/src/__tests__/overview-panel.test.ts`
- Modify: `cli/src/__tests__/app-integration.test.ts`
- Modify: `cli/src/__tests__/epics-panel.test.ts`

- [ ] **Step 1: Update dashboard.ts**

Replace:
```typescript
import { listEnriched } from "../manifest/store.js";
```
With:
```typescript
import { listEnrichedFromStore } from "../store/scan.js";
import { JsonFileStore } from "../store/json-file-store.js";
import { join } from "node:path";
```

Update the `scanEpics` dep:
```typescript
const deps: WatchDeps = {
  scanEpics: async (root: string) => {
    const storePath = join(root, ".beastmode", "state", "store.json");
    const taskStore = new JsonFileStore(storePath);
    taskStore.load();
    return listEnrichedFromStore(taskStore);
  },
  sessionFactory,
  logger,
};
```

- [ ] **Step 2: Update overview-panel.ts**

Replace:
```typescript
import type { EnrichedManifest } from "../manifest/store.js";
```
With:
```typescript
import type { EnrichedEpic } from "../store/types.js";
```

Update function signature:
```typescript
export function computePhaseDistribution(epics: EnrichedEpic[]): PhaseCount[]
```

- [ ] **Step 3: Update App.tsx**

Replace:
```typescript
import type { EnrichedManifest } from "../manifest/store.js";
```
With:
```typescript
import type { EnrichedEpic } from "../store/types.js";
```

Replace all `EnrichedManifest` with `EnrichedEpic`:
- `useState<EnrichedManifest[]>([])` → `useState<EnrichedEpic[]>([])`
- `useRef<EnrichedManifest[]>([])` → `useRef<EnrichedEpic[]>([])`

Update the `refreshEpics` effect (around line 336):
```typescript
const refreshEpics = async () => {
  try {
    const { listEnrichedFromStore } = await import("../store/scan.js");
    const { JsonFileStore } = await import("../store/json-file-store.js");
    const { join } = await import("node:path");
    const storePath = join(projectRoot!, ".beastmode", "state", "store.json");
    const taskStore = new JsonFileStore(storePath);
    taskStore.load();
    const epicList = listEnrichedFromStore(taskStore);
    setEpics(epicList);
  } catch {
    // Non-fatal — will retry on next scan
  }
};
```

- [ ] **Step 4: Update EpicsPanel.tsx**

Replace:
```typescript
import type { EnrichedManifest } from "../manifest/store.js";
```
With:
```typescript
import type { EnrichedEpic } from "../store/types.js";
```

Update `EpicsPanelProps`:
```typescript
export interface EpicsPanelProps {
  epics: EnrichedEpic[];
  activeSessions: Set<string>;
  selectedIndex: number;
  cancelConfirmingSlug?: string;
}
```

- [ ] **Step 5: Update test files**

For `overview-panel.test.ts`: replace `EnrichedManifest` import with `EnrichedEpic` from store/types. Update test data to include `id`, `type`, `depends_on`, `created_at`, `updated_at`, `features` fields.

For `app-integration.test.ts`: replace `EnrichedManifest` import with `EnrichedEpic`. Update mock data.

For `epics-panel.test.ts`: replace `EnrichedManifest` import with `EnrichedEpic`. Update mock data.

- [ ] **Step 6: Run tests**

Run: `cd cli && bun --bun vitest run src/__tests__/overview-panel.test.ts src/__tests__/app-integration.test.ts src/__tests__/epics-panel.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add cli/src/commands/dashboard.ts cli/src/dashboard/overview-panel.ts cli/src/dashboard/App.tsx cli/src/dashboard/EpicsPanel.tsx cli/src/__tests__/overview-panel.test.ts cli/src/__tests__/app-integration.test.ts cli/src/__tests__/epics-panel.test.ts
git commit -m "feat(consumer-migration): migrate dashboard to store types"
```

---

## Task 5: Phase Command Migration

**Wave:** 4
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/commands/phase.ts`
- Modify: `cli/src/__tests__/phase-dispatch.test.ts`

- [ ] **Step 1: Update phase.ts**

Remove manifest import:
```typescript
// DELETE: import * as store from "../manifest/store";
```

Update the epic resolution — remove manifest fallback:
```typescript
if (phase !== "design") {
  const storePath = join(projectRoot, ".beastmode", "state", "store.json");
  const taskStore = new JsonFileStore(storePath);
  taskStore.load();

  const resolution = resolveIdentifier(taskStore, worktreeSlug, { resolveToEpic: true });

  if (resolution.kind === "ambiguous") {
    const ids = resolution.matches.map(e => e.id).join(", ");
    logger.error("ambiguous identifier", { identifier: worktreeSlug, matches: ids });
    process.exit(1);
  }

  if (resolution.kind === "not-found") {
    logger.error("epic not found", { slug: worktreeSlug });
    process.exit(1);
  }

  if (resolution.entity.type === "epic") {
    worktreeSlug = resolution.entity.slug;
  }
}
```

Update design phase seeding — create store entity instead of manifest:
```typescript
if (phase === "design") {
  const storePath = join(projectRoot, ".beastmode", "state", "store.json");
  const taskStore = new JsonFileStore(storePath);
  taskStore.load();

  // Check if epic already exists in store
  const existing = taskStore.find(epicSlug);
  if (!existing) {
    const predictedPath = enterWorktree(epicSlug, { cwd: projectRoot });
    taskStore.addEpic({
      name: epicSlug,
      slug: epicSlug,
    });
    // Update with worktree info
    const epic = taskStore.find(epicSlug) as Epic;
    taskStore.updateEpic(epic.id, {
      worktree: { branch: `feature/${worktreeSlug}`, path: predictedPath },
    });
    taskStore.save();
  }
}
```

Add import for `Epic` type:
```typescript
import { JsonFileStore, resolveIdentifier, type Epic } from "../store/index.js";
```

Remove `manifestExists` and `store.create` imports (from manifest module).

- [ ] **Step 2: Update phase-dispatch.test.ts**

Replace:
```typescript
import { list } from "../manifest/store.js";
```
With appropriate store-based imports. Update test assertions to match new behavior (no manifest fallback).

- [ ] **Step 3: Run tests**

Run: `cd cli && bun --bun vitest run src/__tests__/phase-dispatch.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add cli/src/commands/phase.ts cli/src/__tests__/phase-dispatch.test.ts
git commit -m "feat(consumer-migration): migrate phase command to store-only"
```

---

## Task 6: Cancel Logic Migration

**Wave:** 4
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/commands/cancel-logic.ts`
- Modify: `cli/src/__tests__/cancel-logic.test.ts`

- [ ] **Step 1: Update cancel-logic.ts**

Replace manifest import:
```typescript
// DELETE: import * as store from "../manifest/store.js";
```
Add:
```typescript
import { JsonFileStore } from "../store/json-file-store.js";
import type { Epic } from "../store/types.js";
import { join } from "path";
import { loadSyncRefs, saveSyncRefs } from "../github/sync-refs.js";
```

Update `CancelConfig` — add optional `taskStore` for testing:
```typescript
export interface CancelConfig {
  identifier: string;
  projectRoot: string;
  githubEnabled: boolean;
  force: boolean;
  logger: Logger;
  taskStore?: import("../store/types.js").TaskStore;
}
```

Update self-resolution to use TaskStore:
```typescript
const storePath = join(projectRoot, ".beastmode", "state", "store.json");
const taskStore = config.taskStore ?? new JsonFileStore(storePath);
if (!config.taskStore) taskStore.load();

const entity = taskStore.find(identifier);
const epic = entity?.type === "epic" ? entity as Epic : undefined;
const slug = epic?.slug ?? identifier;
const epicName = epic?.name ?? identifier;

// Get GitHub refs from sync file
const syncRefs = loadSyncRefs(projectRoot);
const githubRef = epic ? syncRefs[epic.id] : undefined;
const githubEpicNumber = githubRef?.issue;
```

Update Step 6 (delete manifest) — replace with store entity deletion:
```typescript
// --- Step 6: Delete store entity ---
try {
  if (epic) {
    // Delete all features first
    const features = taskStore.listFeatures(epic.id);
    for (const f of features) {
      taskStore.deleteFeature(f.id);
    }
    // Delete epic
    taskStore.deleteEpic(epic.id);
    taskStore.save();

    // Clean up sync refs
    const currentRefs = loadSyncRefs(projectRoot);
    const updatedRefs = { ...currentRefs };
    delete updatedRefs[epic.id];
    // Also delete feature sync refs
    for (const f of features) {
      delete updatedRefs[f.id];
    }
    saveSyncRefs(projectRoot, updatedRefs);

    logger.debug("deleted store entity and sync refs", { slug });
  } else {
    logger.debug("no store entity found", { slug });
  }
  cleaned.push("store-entity");
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  logger.warn(`store entity deletion: ${msg}`);
  warned.push("store-entity");
}
```

- [ ] **Step 2: Update cancel-logic.test.ts**

Replace manifest mock with TaskStore-based test setup. Use `InMemoryTaskStore` for test isolation.

- [ ] **Step 3: Run tests**

Run: `cd cli && bun --bun vitest run src/__tests__/cancel-logic.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add cli/src/commands/cancel-logic.ts cli/src/__tests__/cancel-logic.test.ts
git commit -m "feat(consumer-migration): migrate cancel logic to store"
```

---

## Task 7: iTerm2 Dispatch Migration

**Wave:** 4
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/dispatch/it2.ts`

- [ ] **Step 1: Update it2.ts manifest imports**

Replace:
```typescript
import * as store from "../manifest/store.js";
```
With:
```typescript
import { JsonFileStore } from "../store/json-file-store.js";
import { join } from "node:path";
```

Update the `store.load()` call (around line 494) in the session adoption logic:
```typescript
// Old: const manifest = store.load(projectRoot, epicSlug);
// New:
if (projectRoot) {
  const storePath = join(projectRoot, ".beastmode", "state", "store.json");
  const taskStore = new JsonFileStore(storePath);
  taskStore.load();
  const entity = taskStore.find(epicSlug);
  if (entity?.type === "epic" && (entity.status === "done" || entity.status === "cancelled")) {
    try {
      await this.client.closeSession(session.id);
    } catch {
      // best-effort
    }
    continue;
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd cli && bun x tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add cli/src/dispatch/it2.ts
git commit -m "feat(consumer-migration): migrate it2 dispatch to store"
```

---

## Task 8: Backfill Script Migration

**Wave:** 4
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/scripts/backfill-enrichment.ts`
- Modify: `cli/src/__tests__/backfill-enrichment.test.ts`

- [ ] **Step 1: Update backfill-enrichment.ts**

Replace manifest imports:
```typescript
// DELETE: import * as store from "../manifest/store.js";
```
Add:
```typescript
import { JsonFileStore } from "../store/json-file-store.js";
import type { TaskStore, Epic } from "../store/types.js";
import { join } from "path";
```

Update `BackfillDeps` interface — replace `list`/`load` with store:
```typescript
export interface BackfillDeps {
  taskStore: TaskStore;
  syncGitHubForEpic: typeof syncGitHubForEpic;
  loadConfig: typeof loadConfig;
  discoverGitHub: typeof discoverGitHub;
  hasRemote: typeof hasRemote;
  pushBranches: typeof pushBranches;
  pushTags: typeof pushTags;
  amendCommitsInRange: typeof amendCommitsInRange;
  linkBranches: typeof linkBranches;
  git: typeof git;
}
```

Update the main function to iterate store epics instead of manifest list/load:
```typescript
const epics = deps.taskStore.listEpics();
for (const epic of epics) {
  // ... process epic using store entity fields
}
```

- [ ] **Step 2: Update backfill-enrichment.test.ts**

Replace mock patterns to use `InMemoryTaskStore`.

- [ ] **Step 3: Run tests**

Run: `cd cli && bun --bun vitest run src/__tests__/backfill-enrichment.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add cli/src/scripts/backfill-enrichment.ts cli/src/__tests__/backfill-enrichment.test.ts
git commit -m "feat(consumer-migration): migrate backfill script to store"
```

---

## Task 9: Final Verification

**Wave:** 5
**Depends on:** Task 2, Task 3, Task 4, Task 5, Task 6, Task 7, Task 8

**Files:**
- (verification only — no file changes)

- [ ] **Step 1: Run full test suite**

Run: `cd cli && bun --bun vitest run`
Expected: PASS

- [ ] **Step 2: Run typecheck**

Run: `cd cli && bun x tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Verify no production imports from manifest/**

Run: `grep -rn "from.*manifest/store" cli/src/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v ".test." | grep -v node_modules`
Expected: Only `dispatch/types.ts` deprecated aliases and files not yet migrated in other features (github/sync.ts, pipeline/runner.ts, manifest/ module itself)

- [ ] **Step 4: Commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(consumer-migration): final verification fixes"
```
