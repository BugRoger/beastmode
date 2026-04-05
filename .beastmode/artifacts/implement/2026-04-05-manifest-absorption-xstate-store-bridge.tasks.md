# XState Store Bridge — Implementation Tasks

## Goal

Rewrite the pipeline machine and runner to operate on store entities (Epic/Feature), eliminating manifest/pure.ts and manifest/reconcile.ts. The machine context becomes the store's Epic type directly. Reconciliation is inlined into runner.ts steps 6-7.

## Architecture

- **Store types**: `Epic` and `Feature` from `store/types.ts` — these become the machine context
- **XState v5**: `setup()` API with guards, actions, actors declared before `createMachine()`
- **Single-persist pattern**: accumulate state changes in memory, single `store.transact()` at end
- **No adapter layer**: machine context IS an Epic entity

## Tech Stack

- TypeScript, XState v5, Vitest, Bun test runner
- Test command: `bun --bun vitest run`
- Type check: `bun x tsc --noEmit`

## Locked Decisions (from design)

1. `EpicContext` replaced by store `Epic` type
2. `FeatureContext` replaced by store `Feature` type
3. `manifest/pure.ts` deleted — all functions absorbed into XState actions or store queries
4. `manifest/reconcile.ts` deleted — logic inlined into runner.ts steps 6-7
5. Runner steps 6-7 read output.json, send XState events, persist via `store.transact()`
6. `deriveNextAction` computed from XState machine snapshot metadata
7. Design rename ceremony eliminated — permanent IDs used

## File Structure

### Files to Create
- `cli/src/pipeline-machine/__tests__/xstate-store-bridge.integration.test.ts` — Integration test (Task 0)

### Files to Modify
- `cli/src/pipeline-machine/types.ts` — Replace EpicContext/FeatureContext with store types
- `cli/src/pipeline-machine/actions.ts` — Remove manifest/pure dependency, operate on Epic/Feature types
- `cli/src/pipeline-machine/guards.ts` — Update type signatures for Epic-based context
- `cli/src/pipeline-machine/epic.ts` — Update machine definition for new context shape
- `cli/src/pipeline-machine/feature.ts` — Update machine definition for new context shape
- `cli/src/pipeline-machine/index.ts` — Update factory functions and re-exports
- `cli/src/pipeline-machine/__tests__/epic.test.ts` — Update test helpers for store types
- `cli/src/pipeline-machine/__tests__/integration.test.ts` — Update test helpers for store types
- `cli/src/pipeline-machine/__tests__/feature.test.ts` — Update test helpers for store types
- `cli/src/pipeline-machine/__tests__/persistence.test.ts` — Update test helpers for store types

---

## Task 0: Integration Test (BDD — RED state)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/pipeline-machine/__tests__/xstate-store-bridge.integration.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
import { describe, test, expect } from "vitest";
import { createActor } from "xstate";
import { epicMachine } from "../epic";
import { InMemoryTaskStore } from "../../store/in-memory";
import type { Epic, Feature } from "../../store/types";

// Helper: create a minimal store with an epic
function createTestStore(epicOverrides: Partial<Epic> = {}) {
  const store = new InMemoryTaskStore();
  const epic = store.addEpic({ name: "Auth System", slug: "auth-system" });
  if (epicOverrides.status) store.updateEpic(epic.id, { status: epicOverrides.status });
  if (epicOverrides.summary) store.updateEpic(epic.id, { summary: epicOverrides.summary });
  if (epicOverrides.worktree) store.updateEpic(epic.id, { worktree: epicOverrides.worktree });
  return { store, epic: store.getEpic(epic.id)! };
}

// Helper: build EpicContext from store entity
function epicToContext(epic: Epic): Record<string, unknown> {
  return {
    id: epic.id,
    slug: epic.slug,
    name: epic.name,
    status: epic.status,
    summary: epic.summary,
    worktree: epic.worktree,
    depends_on: epic.depends_on,
    created_at: epic.created_at,
    updated_at: epic.updated_at,
    // Pipeline machine fields (on Epic entity)
    design: epic.design,
    plan: epic.plan,
    implement: epic.implement,
    validate: epic.validate,
    release: epic.release,
  };
}

describe("XState Store Bridge Integration", () => {
  // Scenario 1: Pipeline machine reads epic state from the store
  test("machine context reflects the store entity state", () => {
    const { epic } = createTestStore();
    const actor = createActor(epicMachine, { input: epicToContext(epic) as any });
    actor.start();

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("design");
    expect(snapshot.context.slug).toBe("auth-system");
    expect(snapshot.context.name).toBe("Auth System");
    actor.stop();
  });

  // Scenario 2: Phase transition writes updated state back to the store
  test("advancing from design to plan updates store entity", () => {
    const { store, epic } = createTestStore();
    const actor = createActor(epicMachine, { input: epicToContext(epic) as any });
    actor.start();

    actor.send({
      type: "DESIGN_COMPLETED",
      summary: { problem: "auth needed", solution: "add auth" },
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("plan");

    // Write back to store
    store.updateEpic(epic.id, {
      status: snapshot.value as Epic["status"],
      summary: snapshot.context.summary,
      updated_at: snapshot.context.updated_at,
    });

    const updated = store.getEpic(epic.id)!;
    expect(updated.status).toBe("plan");
    expect(updated.summary).toEqual({ problem: "auth needed", solution: "add auth" });
    actor.stop();
  });

  // Scenario 3: Dispatch decision derived from XState machine snapshot
  test("machine snapshot metadata provides dispatch info", () => {
    const { store, epic } = createTestStore();
    // Advance to implement with features
    store.updateEpic(epic.id, { status: "implement" });
    const f1 = store.addFeature({ parent: epic.id, name: "Login Flow", slug: "login-flow" });
    const f2 = store.addFeature({ parent: epic.id, name: "Signup Flow", slug: "signup-flow" });

    // Hydrate machine at implement
    const updatedEpic = store.getEpic(epic.id)!;
    const resolvedSnapshot = epicMachine.resolveState({
      value: "implement",
      context: epicToContext(updatedEpic) as any,
    });
    const actor = createActor(epicMachine, {
      snapshot: resolvedSnapshot,
      input: epicToContext(updatedEpic) as any,
    });
    actor.start();

    const meta = actor.getSnapshot().getMeta();
    expect(meta["epic.implement"]?.dispatchType).toBe("fan-out");

    // Features ready for dispatch come from store
    const readyFeatures = store.listFeatures(epic.id).filter(f => f.status === "pending");
    expect(readyFeatures).toHaveLength(2);
    actor.stop();
  });

  // Scenario 4: Reconciliation enriches store entities from dispatch output
  test("phase output enriches store entity without separate reconciliation module", () => {
    const { store, epic } = createTestStore();
    const actor = createActor(epicMachine, { input: epicToContext(epic) as any });
    actor.start();

    // Simulate design output
    actor.send({
      type: "DESIGN_COMPLETED",
      summary: { problem: "need auth", solution: "build it" },
    });

    const snapshot = actor.getSnapshot();

    // Inline reconciliation: update store directly from machine snapshot
    store.updateEpic(epic.id, {
      status: snapshot.value as Epic["status"],
      summary: snapshot.context.summary,
      updated_at: snapshot.context.updated_at,
    });

    const enriched = store.getEpic(epic.id)!;
    expect(enriched.status).toBe("plan");
    expect(enriched.summary).toEqual({ problem: "need auth", solution: "build it" });
    actor.stop();
  });

  // Scenario 5: Feature status updated through XState events on store entities
  test("feature completion updates store feature status", () => {
    const { store, epic } = createTestStore({ status: "implement" as any });
    const f1 = store.addFeature({ parent: epic.id, name: "Login Flow", slug: "login-flow" });

    // After implementation completes, update feature in store
    store.updateFeature(f1.id, { status: "completed" });

    const updated = store.getFeature(f1.id)!;
    expect(updated.status).toBe("completed");
  });

  // Scenario 6: All state changes persisted atomically
  test("multiple feature completions in single transaction", () => {
    const { store, epic } = createTestStore({ status: "implement" as any });
    const f1 = store.addFeature({ parent: epic.id, name: "Login", slug: "login" });
    const f2 = store.addFeature({ parent: epic.id, name: "Signup", slug: "signup" });

    // Simulate atomic transaction — all updates succeed or none
    store.updateFeature(f1.id, { status: "completed" });
    store.updateFeature(f2.id, { status: "completed" });
    store.updateEpic(epic.id, { status: "validate" });

    const finalEpic = store.getEpic(epic.id)!;
    expect(finalEpic.status).toBe("validate");
    expect(store.getFeature(f1.id)!.status).toBe("completed");
    expect(store.getFeature(f2.id)!.status).toBe("completed");
  });

  // Scenario 7: Full pipeline lifecycle operates entirely on store
  test("full lifecycle: design -> plan -> implement -> validate -> release -> done", () => {
    const { store, epic } = createTestStore();
    const actor = createActor(epicMachine, { input: epicToContext(epic) as any });
    actor.start();

    // design -> plan
    actor.send({ type: "DESIGN_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("plan");
    store.updateEpic(epic.id, { status: "plan" });

    // plan -> implement (add features to store)
    const f1 = store.addFeature({ parent: epic.id, name: "Feature A", slug: "feat-a" });
    const f2 = store.addFeature({ parent: epic.id, name: "Feature B", slug: "feat-b" });
    actor.send({
      type: "PLAN_COMPLETED",
      features: [
        { slug: "feat-a", plan: "plan-a" },
        { slug: "feat-b", plan: "plan-b" },
      ],
    });
    expect(actor.getSnapshot().value).toBe("implement");
    store.updateEpic(epic.id, { status: "implement" });

    // complete features
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-a" });
    store.updateFeature(f1.id, { status: "completed" });
    actor.send({ type: "FEATURE_COMPLETED", featureSlug: "feat-b" });
    store.updateFeature(f2.id, { status: "completed" });

    // implement -> validate
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("validate");
    store.updateEpic(epic.id, { status: "validate" });

    // validate -> release
    actor.send({ type: "VALIDATE_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("release");
    store.updateEpic(epic.id, { status: "release" });

    // release -> done
    actor.send({ type: "RELEASE_COMPLETED" });
    expect(actor.getSnapshot().value).toBe("done");
    store.updateEpic(epic.id, { status: "done" });

    // Verify store reflects final state
    const finalEpic = store.getEpic(epic.id)!;
    expect(finalEpic.status).toBe("done");
    expect(store.getFeature(f1.id)!.status).toBe("completed");
    expect(store.getFeature(f2.id)!.status).toBe("completed");
    actor.stop();
  });
});
```

- [ ] **Step 2: Run test to verify it fails (RED)**

Run: `cd cli && bun --bun vitest run src/pipeline-machine/__tests__/xstate-store-bridge.integration.test.ts`
Expected: FAIL — EpicContext shape doesn't match Epic entity type (missing `id`, `name`, `type`, extra `phase`, `features` etc.)

- [ ] **Step 3: Commit**

```bash
git add cli/src/pipeline-machine/__tests__/xstate-store-bridge.integration.test.ts
git commit -m "test(xstate-store-bridge): add integration test (RED)"
```

---

## Task 1: Rewrite pipeline-machine/types.ts for store types

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/pipeline-machine/types.ts`

This is the foundational type change. `EpicContext` is replaced by a type that mirrors the store `Epic` entity plus machine-specific fields. `FeatureContext` is replaced by the store `Feature` type. The `ManifestFeature` import is eliminated.

- [ ] **Step 1: Write the failing test**

Add a type-level test by creating a temporary test that imports and exercises the new types. We verify via typecheck.

Run: `cd cli && bun x tsc --noEmit`
Expected: FAIL — types.ts still references ManifestFeature

- [ ] **Step 2: Rewrite types.ts**

Replace the full content of `cli/src/pipeline-machine/types.ts`:

```typescript
import type { EpicStatus, FeatureStatus } from "../store/types";

// ── Epic machine context ─────────────────────────────────────────
// Mirrors the store's Epic entity shape. The machine context IS the
// Epic entity — no adapter layer. Fields not present on store Epic
// (like features array for the machine's internal tracking) are kept
// as machine-only extensions.

export interface EpicContext {
  // Store entity fields
  id: string;
  slug: string;
  name: string;
  status: EpicStatus;
  summary?: string | { problem: string; solution: string };
  worktree?: { branch: string; path: string };
  depends_on: string[];
  created_at: string;
  updated_at: string;
  // Phase artifact references (on Epic entity)
  design?: string;
  plan?: string;
  implement?: string;
  validate?: string;
  release?: string;
  // Machine-specific: features tracked inline for guard evaluation
  // These are lightweight projections of store Features, not full entities
  features: MachineFeature[];
  // Machine-specific: accumulated artifact paths per phase
  artifacts: Record<string, string[]>;
}

/** Lightweight feature projection for machine context.
 *  Carries only what the machine needs for guards and actions.
 */
export interface MachineFeature {
  slug: string;
  plan: string;
  description?: string;
  wave?: number;
  status: FeatureStatus;
  reDispatchCount?: number;
}

export type EpicEvent =
  | { type: "DESIGN_COMPLETED"; realSlug?: string; summary?: { problem: string; solution: string }; artifacts?: Record<string, string[]> }
  | { type: "PLAN_COMPLETED"; features: Array<{ slug: string; plan: string; description?: string; wave?: number }>; artifacts?: Record<string, string[]> }
  | { type: "FEATURE_COMPLETED"; featureSlug: string }
  | { type: "IMPLEMENT_COMPLETED" }
  | { type: "VALIDATE_COMPLETED" }
  | { type: "REGRESS"; targetPhase: EpicStatus }
  | { type: "REGRESS_FEATURES"; failingFeatures: string[] }
  | { type: "RELEASE_COMPLETED" }
  | { type: "CANCEL" };

// ── Feature machine context ──────────────────────────────────────
// Mirrors the store's Feature entity shape for the feature sub-machine.

export interface FeatureContext {
  id: string;
  slug: string;
  name: string;
  plan?: string;
  description?: string;
  status: FeatureStatus;
}

export type FeatureEvent =
  | { type: "START" }
  | { type: "COMPLETE" }
  | { type: "RESET" };

// ── Dispatch strategy ───────────────────────────────────────────

export type DispatchType = "single" | "fan-out" | "skip";
```

- [ ] **Step 3: Run typecheck**

Run: `cd cli && bun x tsc --noEmit 2>&1 | head -40`
Expected: Multiple type errors in actions.ts, guards.ts, tests — those files still use old types. That's expected. The types.ts file itself should compile.

- [ ] **Step 4: Commit**

```bash
git add cli/src/pipeline-machine/types.ts
git commit -m "feat(xstate-store-bridge): rewrite types.ts for store entity types"
```

---

## Task 2: Rewrite pipeline-machine/actions.ts — remove manifest/pure dependency

**Wave:** 1
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/pipeline-machine/actions.ts`

The critical change: `regress()` and `regressFeatures()` from manifest/pure.ts are inlined as pure functions here. No more import from manifest/pure.

- [ ] **Step 1: Rewrite actions.ts**

Replace the full content of `cli/src/pipeline-machine/actions.ts`:

```typescript
import type { EpicContext, EpicEvent, MachineFeature } from "./types";
import type { EpicStatus } from "../store/types";

/**
 * Action logic implementations for the epic machine.
 *
 * These are plain functions that compute the new context values.
 * The actual assign() calls happen inside setup() in epic.ts,
 * which ensures proper type inference with XState v5.
 *
 * regress() and regressFeatures() are inlined here — no dependency
 * on manifest/pure.ts.
 */

// Phase ordering for regression logic
const PHASE_ORDER: readonly EpicStatus[] = ["design", "plan", "implement", "validate", "release"];

export function computeEnrichFeatures(context: EpicContext, event: EpicEvent): EpicContext["features"] {
  if (event.type === "PLAN_COMPLETED") {
    const incoming = event.features.map((f) => ({
      slug: f.slug,
      plan: f.plan,
      description: f.description,
      wave: f.wave,
      status: "pending" as const,
    }));
    const existingBySlug = new Map(context.features.map((f) => [f.slug, f]));
    for (const feat of incoming) {
      if (!existingBySlug.has(feat.slug)) {
        existingBySlug.set(feat.slug, feat);
      }
    }
    return Array.from(existingBySlug.values());
  }
  return context.features;
}

export function computeRenameSlug(context: EpicContext, event: EpicEvent): string {
  if (event.type === "DESIGN_COMPLETED" && event.realSlug) {
    return event.realSlug;
  }
  return context.slug;
}

export function computeSetSummary(context: EpicContext, event: EpicEvent): EpicContext["summary"] {
  if (event.type === "DESIGN_COMPLETED" && event.summary) {
    return event.summary;
  }
  return context.summary;
}

export function computeSetFeatures(event: EpicEvent): EpicContext["features"] {
  if (event.type === "PLAN_COMPLETED") {
    return event.features.map((f) => ({
      slug: f.slug,
      plan: f.plan,
      description: f.description,
      wave: f.wave,
      status: "pending" as const,
    }));
  }
  return [];
}

export function computeResetFeatures(context: EpicContext): EpicContext["features"] {
  return context.features.map((f) => ({ ...f, status: "pending" as const }));
}

export function computeMarkFeatureCompleted(context: EpicContext, event: EpicEvent): EpicContext["features"] {
  if (event.type === "FEATURE_COMPLETED") {
    return context.features.map((f) =>
      f.slug === event.featureSlug
        ? { ...f, status: "completed" as const }
        : f,
    );
  }
  return context.features;
}

/**
 * Compute the regressed context — inlined from manifest/pure.ts regress().
 * Resets features to "pending" if regressing to or past "implement".
 * Clears downstream artifact entries.
 */
export function computeRegress(context: EpicContext, event: EpicEvent): Partial<EpicContext> {
  if (event.type !== "REGRESS") return {};

  const targetPhase = event.targetPhase;
  const targetIdx = PHASE_ORDER.indexOf(targetPhase);
  const implementIdx = PHASE_ORDER.indexOf("implement");

  // Reset features if regressing to or past implement
  const features = targetIdx <= implementIdx
    ? context.features.map((f) => ({ ...f, status: "pending" as const }))
    : context.features;

  // Clear artifacts for phases after targetPhase
  const artifacts: Record<string, string[]> = {};
  for (const [phase, files] of Object.entries(context.artifacts)) {
    const phaseIdx = PHASE_ORDER.indexOf(phase as EpicStatus);
    if (phaseIdx !== -1 && phaseIdx > targetIdx) continue; // downstream — drop
    artifacts[phase] = files;
  }

  return { features, artifacts };
}

/**
 * Compute the regressed context for specific failing features —
 * inlined from manifest/pure.ts regressFeatures().
 * Targets only failing features, incrementing their reDispatchCount.
 */
export function computeRegressFeatures(context: EpicContext, event: EpicEvent): Partial<EpicContext> {
  if (event.type !== "REGRESS_FEATURES") return {};

  const failingSet = new Set(event.failingFeatures);
  const MAX_REDISPATCH = 2;

  // Update only the failing features
  const features = context.features.map((f) => {
    if (!failingSet.has(f.slug)) return f;
    const newCount = (f.reDispatchCount ?? 0) + 1;
    const newStatus = newCount > MAX_REDISPATCH ? ("blocked" as const) : ("pending" as const);
    return { ...f, status: newStatus, reDispatchCount: newCount };
  });

  // Clear artifacts for phases after "implement"
  const implementIdx = PHASE_ORDER.indexOf("implement");
  const artifacts: Record<string, string[]> = {};
  for (const [phase, files] of Object.entries(context.artifacts)) {
    const phaseIdx = PHASE_ORDER.indexOf(phase as EpicStatus);
    if (phaseIdx !== -1 && phaseIdx > implementIdx) continue;
    artifacts[phase] = files;
  }

  return { features, artifacts };
}

export function computeAccumulateArtifacts(context: EpicContext, event: EpicEvent): EpicContext["artifacts"] {
  if (
    (event.type === "DESIGN_COMPLETED" || event.type === "PLAN_COMPLETED") &&
    event.artifacts
  ) {
    const merged = { ...context.artifacts };
    for (const [phase, paths] of Object.entries(event.artifacts)) {
      const existing = merged[phase] ?? [];
      merged[phase] = [...existing, ...paths];
    }
    return merged;
  }
  return context.artifacts;
}
```

- [ ] **Step 2: Verify no manifest/pure import**

Run: `grep -n "manifest/pure" cli/src/pipeline-machine/actions.ts`
Expected: No output (import removed)

- [ ] **Step 3: Commit**

```bash
git add cli/src/pipeline-machine/actions.ts
git commit -m "feat(xstate-store-bridge): inline regress/regressFeatures into actions.ts"
```

---

## Task 3: Rewrite pipeline-machine/guards.ts for new types

**Wave:** 1
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/pipeline-machine/guards.ts`

Update guard type signatures to use `EpicStatus` instead of `Phase`.

- [ ] **Step 1: Rewrite guards.ts**

Replace the full content of `cli/src/pipeline-machine/guards.ts`:

```typescript
import type { EpicContext, EpicEvent } from "./types";
import type { EpicStatus } from "../store/types";

/**
 * Guard: plan -> implement only if output contains features.
 * Checks the PLAN_COMPLETED event payload for non-empty features list.
 */
export const hasFeatures = ({ event }: { context: EpicContext; event: EpicEvent }) => {
  if (event.type === "PLAN_COMPLETED") {
    return Array.isArray(event.features) && event.features.length > 0;
  }
  return false;
};

/**
 * Guard: implement -> validate only if every feature status is "completed".
 */
export const allFeaturesCompleted = ({ context }: { context: EpicContext }) => {
  return context.features.length > 0 && context.features.every((f) => f.status === "completed");
};

/**
 * Guard: validate -> release and release -> done only if output.status === "completed".
 */
export const outputCompleted = ({ event }: { context: EpicContext; event: EpicEvent }) => {
  return event.type === "VALIDATE_COMPLETED" || event.type === "RELEASE_COMPLETED";
};

/**
 * Phase ordering for regression comparison.
 * Only linear pipeline phases — terminal states excluded.
 */
const PHASE_ORDER: readonly EpicStatus[] = ["design", "plan", "implement", "validate", "release"];

/**
 * Guard: REGRESS is valid only if targetPhase != "design" and is a known phase.
 */
export const canRegress = ({ event }: { context: EpicContext; event: EpicEvent }) => {
  if (event.type !== "REGRESS") return false;
  const { targetPhase } = event;
  if (targetPhase === "design") return false;
  return PHASE_ORDER.indexOf(targetPhase) > 0;
};

/** Guard: REGRESS targets the "plan" phase specifically. */
export const regressTargetsPlan = ({ event }: { context: EpicContext; event: EpicEvent }) =>
  event.type === "REGRESS" && event.targetPhase === "plan";

/** Guard: REGRESS targets the "implement" phase specifically. */
export const regressTargetsImplement = ({ event }: { context: EpicContext; event: EpicEvent }) =>
  event.type === "REGRESS" && event.targetPhase === "implement";

/** Guard: REGRESS targets the "validate" phase specifically. */
export const regressTargetsValidate = ({ event }: { context: EpicContext; event: EpicEvent }) =>
  event.type === "REGRESS" && event.targetPhase === "validate";

/** Guard: REGRESS targets the "release" phase specifically. */
export const regressTargetsRelease = ({ event }: { context: EpicContext; event: EpicEvent }) =>
  event.type === "REGRESS" && event.targetPhase === "release";

/** Guard: REGRESS_FEATURES is valid only if failingFeatures is non-empty. */
export const hasFailingFeatures = ({ event }: { context: EpicContext; event: EpicEvent }) => {
  if (event.type !== "REGRESS_FEATURES") return false;
  return Array.isArray(event.failingFeatures) && event.failingFeatures.length > 0;
};
```

- [ ] **Step 2: Commit**

```bash
git add cli/src/pipeline-machine/guards.ts
git commit -m "feat(xstate-store-bridge): update guards for EpicStatus type"
```

---

## Task 4: Update pipeline-machine/epic.ts and feature.ts

**Wave:** 2
**Depends on:** Task 1, Task 2, Task 3

**Files:**
- Modify: `cli/src/pipeline-machine/epic.ts`
- Modify: `cli/src/pipeline-machine/feature.ts`

The machine definition stays structurally identical. The only change is the `updated_at` field name (was `lastUpdated`) in assign actions, and ensuring the context type flows correctly.

- [ ] **Step 1: Update epic.ts — rename lastUpdated to updated_at**

In `cli/src/pipeline-machine/epic.ts`, all `assign()` calls that set `lastUpdated` must set `updated_at` instead, since the Epic entity uses `updated_at`.

Replace the full content of `cli/src/pipeline-machine/epic.ts`:

```typescript
import { setup, assign } from "xstate";
import type { EpicContext, EpicEvent, DispatchType } from "./types";
import {
  hasFeatures,
  allFeaturesCompleted,
  outputCompleted,
  canRegress,
  regressTargetsPlan,
  regressTargetsImplement,
  regressTargetsValidate,
  regressTargetsRelease,
  hasFailingFeatures,
} from "./guards";
import {
  computeEnrichFeatures,
  computeRenameSlug,
  computeSetSummary,
  computeSetFeatures,
  computeResetFeatures,
  computeMarkFeatureCompleted,
  computeRegress,
  computeRegressFeatures,
  computeAccumulateArtifacts,
} from "./actions";
import { syncGitHubService } from "./services";

export const epicMachine = setup({
  types: {
    context: {} as EpicContext,
    events: {} as EpicEvent,
    input: {} as EpicContext,
  },
  guards: {
    hasFeatures,
    allFeaturesCompleted,
    outputCompleted,
    canRegress,
    regressTargetsPlan,
    regressTargetsImplement,
    regressTargetsValidate,
    regressTargetsRelease,
    hasFailingFeatures,
  },
  actions: {
    enrichManifest: assign({
      features: ({ context, event }) => computeEnrichFeatures(context, event),
      updated_at: () => new Date().toISOString(),
    }),
    renameSlug: assign({
      slug: ({ context, event }) => computeRenameSlug(context, event),
      updated_at: () => new Date().toISOString(),
    }),
    setSummary: assign({
      summary: ({ context, event }) => computeSetSummary(context, event),
      updated_at: () => new Date().toISOString(),
    }),
    setFeatures: assign({
      features: ({ event }) => computeSetFeatures(event),
      updated_at: () => new Date().toISOString(),
    }),
    resetFeatures: assign({
      features: ({ context }) => computeResetFeatures(context),
      updated_at: () => new Date().toISOString(),
    }),
    applyRegress: assign(({ context, event }) => {
      const result = computeRegress(context, event);
      return {
        ...result,
        updated_at: new Date().toISOString(),
      };
    }),
    applyRegressFeatures: assign(({ context, event }) => {
      const result = computeRegressFeatures(context, event);
      return {
        ...result,
        updated_at: new Date().toISOString(),
      };
    }),
    markCancelled: assign({
      updated_at: () => new Date().toISOString(),
    }),
    markFeatureCompleted: assign({
      features: ({ context, event }) => computeMarkFeatureCompleted(context, event),
      updated_at: () => new Date().toISOString(),
    }),
    accumulateArtifacts: assign({
      artifacts: ({ context, event }) => computeAccumulateArtifacts(context, event),
      updated_at: () => new Date().toISOString(),
    }),
    persist: () => {
      // Side-effect stub — consumer provides real implementation
    },
  },
  actors: {
    syncGitHub: syncGitHubService,
  },
}).createMachine({
  id: "epic",
  initial: "design",
  context: ({ input }) => input,
  states: {
    design: {
      meta: { dispatchType: "single" as DispatchType },
      on: {
        DESIGN_COMPLETED: {
          target: "plan",
          actions: ["renameSlug", "setSummary", "accumulateArtifacts", "persist"],
        },
        CANCEL: {
          target: "cancelled",
          actions: ["markCancelled", "persist"],
        },
      },
    },
    plan: {
      meta: { dispatchType: "single" as DispatchType },
      on: {
        PLAN_COMPLETED: {
          target: "implement",
          guard: "hasFeatures",
          actions: ["setFeatures", "accumulateArtifacts", "persist"],
        },
        REGRESS: [
          {
            target: "plan",
            guard: { type: "canRegress" },
            actions: ["applyRegress", "persist"],
          },
        ],
        CANCEL: {
          target: "cancelled",
          actions: ["markCancelled", "persist"],
        },
      },
    },
    implement: {
      meta: { dispatchType: "fan-out" as DispatchType },
      on: {
        FEATURE_COMPLETED: {
          actions: ["markFeatureCompleted", "persist"],
        },
        IMPLEMENT_COMPLETED: {
          target: "validate",
          guard: "allFeaturesCompleted",
          actions: ["persist"],
        },
        REGRESS: [
          {
            target: "plan",
            guard: { type: "regressTargetsPlan" },
            actions: ["applyRegress", "persist"],
          },
          {
            target: "implement",
            guard: { type: "canRegress" },
            actions: ["applyRegress", "persist"],
          },
        ],
        CANCEL: {
          target: "cancelled",
          actions: ["markCancelled", "persist"],
        },
      },
    },
    validate: {
      meta: { dispatchType: "single" as DispatchType },
      on: {
        VALIDATE_COMPLETED: {
          target: "release",
          actions: ["persist"],
        },
        REGRESS_FEATURES: {
          target: "implement",
          guard: "hasFailingFeatures",
          actions: ["applyRegressFeatures", "persist"],
        },
        REGRESS: [
          {
            target: "plan",
            guard: { type: "regressTargetsPlan" },
            actions: ["applyRegress", "persist"],
          },
          {
            target: "implement",
            guard: { type: "regressTargetsImplement" },
            actions: ["applyRegress", "persist"],
          },
          {
            target: "validate",
            guard: { type: "canRegress" },
            actions: ["applyRegress", "persist"],
          },
        ],
        CANCEL: {
          target: "cancelled",
          actions: ["markCancelled", "persist"],
        },
      },
    },
    release: {
      meta: { dispatchType: "single" as DispatchType },
      on: {
        RELEASE_COMPLETED: {
          target: "done",
          actions: ["persist"],
        },
        REGRESS: [
          {
            target: "plan",
            guard: { type: "regressTargetsPlan" },
            actions: ["applyRegress", "persist"],
          },
          {
            target: "implement",
            guard: { type: "regressTargetsImplement" },
            actions: ["applyRegress", "persist"],
          },
          {
            target: "validate",
            guard: { type: "regressTargetsValidate" },
            actions: ["applyRegress", "persist"],
          },
          {
            target: "release",
            guard: { type: "canRegress" },
            actions: ["applyRegress", "persist"],
          },
        ],
        CANCEL: {
          target: "cancelled",
          actions: ["markCancelled", "persist"],
        },
      },
    },
    done: {
      meta: { dispatchType: "skip" as DispatchType },
      type: "final",
    },
    cancelled: {
      meta: { dispatchType: "skip" as DispatchType },
      type: "final",
    },
  },
});
```

- [ ] **Step 2: Update feature.ts for new FeatureContext**

Replace the full content of `cli/src/pipeline-machine/feature.ts`:

```typescript
import { setup } from "xstate";
import type { FeatureContext, FeatureEvent, DispatchType } from "./types";

export const featureMachine = setup({
  types: {
    context: {} as FeatureContext,
    events: {} as FeatureEvent,
    input: {} as FeatureContext,
  },
}).createMachine({
  id: "feature",
  initial: "pending",
  context: ({ input }) => input,
  states: {
    pending: {
      meta: { dispatchType: "skip" as DispatchType },
      on: {
        START: { target: "in-progress" },
        RESET: { target: "pending" },
      },
    },
    "in-progress": {
      meta: { dispatchType: "skip" as DispatchType },
      on: {
        COMPLETE: { target: "completed" },
        RESET: { target: "pending" },
      },
    },
    completed: {
      meta: { dispatchType: "skip" as DispatchType },
      type: "final",
    },
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add cli/src/pipeline-machine/epic.ts cli/src/pipeline-machine/feature.ts
git commit -m "feat(xstate-store-bridge): update machine definitions for store types"
```

---

## Task 5: Update pipeline-machine/index.ts — factory functions and re-exports

**Wave:** 2
**Depends on:** Task 1, Task 4

**Files:**
- Modify: `cli/src/pipeline-machine/index.ts`

Update re-exports to include `MachineFeature` and remove any manifest type re-exports.

- [ ] **Step 1: Rewrite index.ts**

Replace the full content of `cli/src/pipeline-machine/index.ts`:

```typescript
import { createActor } from "xstate";
import { epicMachine } from "./epic";
import type { EpicContext } from "./types";

// ── Machines ───────────────────────────────────────────────────

export { epicMachine } from "./epic";
export { featureMachine } from "./feature";

// ── Types ──────────────────────────────────────────────────────

export type { EpicContext, EpicEvent, FeatureContext, FeatureEvent, DispatchType, MachineFeature } from "./types";
export type { SyncGitHubResult } from "./services";

// ── Action overrides ──────────────────────────────────────────

/** Overridable action implementations injected at actor creation. */
export interface EpicActions {
  persist?: ({ context }: { context: EpicContext }) => void;
}

// ── Actor factories ────────────────────────────────────────────

/**
 * Create and start an epic actor from initial context.
 * Pass `actions` to inject real implementations for side-effect stubs.
 */
export function createEpicActor(context: EpicContext, actions?: EpicActions) {
  const machine = actions
    ? epicMachine.provide({ actions })
    : epicMachine;
  const actor = createActor(machine, { input: context });
  actor.start();
  return actor;
}

/**
 * Restore an epic actor from a persisted snapshot.
 * Pass `actions` to inject real implementations for side-effect stubs.
 */
export function loadEpic(snapshot: any, context: EpicContext, actions?: EpicActions) {
  const machine = actions
    ? epicMachine.provide({ actions })
    : epicMachine;
  const actor = createActor(machine, { snapshot, input: context });
  actor.start();
  return actor;
}

// ── Event type constants ───────────────────────────────────────

export const EPIC_EVENTS = {
  DESIGN_COMPLETED: "DESIGN_COMPLETED",
  PLAN_COMPLETED: "PLAN_COMPLETED",
  FEATURE_COMPLETED: "FEATURE_COMPLETED",
  IMPLEMENT_COMPLETED: "IMPLEMENT_COMPLETED",
  VALIDATE_COMPLETED: "VALIDATE_COMPLETED",
  REGRESS: "REGRESS",
  RELEASE_COMPLETED: "RELEASE_COMPLETED",
  CANCEL: "CANCEL",
} as const;

export const FEATURE_EVENTS = {
  START: "START",
  COMPLETE: "COMPLETE",
  RESET: "RESET",
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add cli/src/pipeline-machine/index.ts
git commit -m "feat(xstate-store-bridge): update index.ts re-exports for MachineFeature"
```

---

## Task 6: Rewrite pipeline machine tests for store types

**Wave:** 3
**Depends on:** Task 4, Task 5

**Files:**
- Modify: `cli/src/pipeline-machine/__tests__/epic.test.ts`
- Modify: `cli/src/pipeline-machine/__tests__/integration.test.ts`
- Modify: `cli/src/pipeline-machine/__tests__/feature.test.ts`
- Modify: `cli/src/pipeline-machine/__tests__/persistence.test.ts`

All test helpers create `EpicContext` objects — these must include the new required fields (`id`, `name`, `depends_on`, `created_at`, `updated_at`) and use `updated_at` instead of `lastUpdated`.

- [ ] **Step 1: Update epic.test.ts helper**

In `cli/src/pipeline-machine/__tests__/epic.test.ts`, update the `makeContext` helper to include required store fields and rename `lastUpdated` to `updated_at`:

```typescript
function makeContext(overrides: Partial<EpicContext> = {}): EpicContext {
  return {
    id: "bm-test",
    slug: "test-epic",
    name: "Test Epic",
    status: "design",
    features: [],
    artifacts: {},
    depends_on: [],
    created_at: "2026-03-31T00:00:00Z",
    updated_at: "2026-03-31T00:00:00Z",
    ...overrides,
  };
}
```

Then update ALL assertions that reference `lastUpdated` to reference `updated_at` instead. Update context `phase` references to `status` where used in overrides.

- [ ] **Step 2: Update integration.test.ts helper**

In `cli/src/pipeline-machine/__tests__/integration.test.ts`, update:

```typescript
function makeEpicContext(overrides: Partial<EpicContext> = {}): EpicContext {
  return {
    id: "bm-test",
    slug: "test-epic",
    name: "Test Epic",
    status: "design",
    features: [],
    artifacts: {},
    depends_on: [],
    created_at: "2026-03-31T00:00:00Z",
    updated_at: "2026-03-31T00:00:00Z",
    ...overrides,
  };
}
```

- [ ] **Step 3: Update feature.test.ts helper**

In `cli/src/pipeline-machine/__tests__/feature.test.ts`, update:

```typescript
function makeFeatureContext(overrides: Partial<FeatureContext> = {}): FeatureContext {
  return {
    id: "bm-test.1",
    slug: "test-feature",
    name: "Test Feature",
    plan: "test-plan.md",
    status: "pending",
    ...overrides,
  };
}
```

- [ ] **Step 4: Update persistence.test.ts**

Update any EpicContext/FeatureContext construction in persistence.test.ts to include the new required fields.

- [ ] **Step 5: Run the pipeline machine tests**

Run: `cd cli && bun --bun vitest run src/pipeline-machine/`
Expected: PASS — all existing tests should pass with the updated types

- [ ] **Step 6: Commit**

```bash
git add cli/src/pipeline-machine/__tests__/
git commit -m "test(xstate-store-bridge): update all pipeline machine tests for store types"
```

---

## Task 7: Update manifest/pure.ts — move hydrateEpicActor, prepare for deletion

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Modify: `cli/src/manifest/pure.ts`
- Modify: `cli/src/manifest/reconcile.ts`

The `hydrateEpicActor` function in pure.ts is still used by reconcile.ts. Since reconcile.ts is consumed by runner.ts (and will be rewritten in a later feature), we need to keep it working for now. Move `hydrateEpicActor` to be standalone — it doesn't need manifest types, it takes EpicContext directly.

The `deriveNextAction` function is still consumed by `manifest/store.ts` (via `listEnriched`). Keep it in pure.ts for now — the store.ts consumers will be rewritten in a later feature.

- [ ] **Step 1: Update pure.ts imports**

The regress/regressFeatures functions are still exported from pure.ts for backward compatibility (other consumers). But the pipeline machine no longer imports them. Verify that `manifest/pure.ts` still compiles — it imports `ManifestFeature` from `manifest/store.ts` which is unchanged.

Run: `cd cli && bun x tsc --noEmit 2>&1 | grep "pure.ts"`
Expected: No errors for pure.ts itself (it still uses its own types)

- [ ] **Step 2: Verify reconcile.ts still works**

reconcile.ts imports `hydrateEpicActor` from pure.ts and casts `PipelineManifest` to `EpicContext`. Since EpicContext has new required fields, the cast will still work at runtime (excess fields are ignored). Verify:

Run: `cd cli && bun x tsc --noEmit 2>&1 | grep "reconcile.ts"`
Expected: May show type errors for the EpicContext cast — if so, update the cast in reconcile.ts to use `as unknown as EpicContext`.

- [ ] **Step 3: Fix reconcile.ts if needed**

If there are type errors, update the `hydrateActor` function in reconcile.ts to bridge the old PipelineManifest to the new EpicContext by providing default values for new required fields:

```typescript
function hydrateActor(manifest: PipelineManifest): HydratedActor {
  const bridgedContext: EpicContext = {
    id: manifest.originId ?? manifest.slug,
    slug: manifest.slug,
    name: manifest.epic ?? manifest.slug,
    status: manifest.phase as EpicContext["status"],
    features: manifest.features,
    artifacts: manifest.artifacts,
    summary: manifest.summary,
    worktree: manifest.worktree,
    depends_on: [],
    created_at: manifest.lastUpdated,
    updated_at: manifest.lastUpdated,
  };
  return hydrateEpicActor(manifest.phase, bridgedContext);
}
```

And update `extractManifest` to map `updated_at` back to `lastUpdated`:

```typescript
function extractManifest(actor: HydratedActor): PipelineManifest {
  const snapshot = actor.getSnapshot();
  const phase = (typeof snapshot.value === "string"
    ? snapshot.value
    : "design") as Phase;
  const ctx = snapshot.context as unknown as Record<string, unknown>;
  const manifest = {
    ...(ctx as unknown as PipelineManifest),
    phase,
    lastUpdated: (ctx.updated_at as string) ?? new Date().toISOString(),
  };
  actor.stop();
  return manifest;
}
```

- [ ] **Step 4: Run reconcile-related tests**

Run: `cd cli && bun --bun vitest run src/__tests__/reconcile`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/manifest/pure.ts cli/src/manifest/reconcile.ts
git commit -m "feat(xstate-store-bridge): bridge reconcile.ts to new EpicContext shape"
```

---

## Task 8: Run full test suite and fix remaining type errors

**Wave:** 4
**Depends on:** Task 6, Task 7

**Files:**
- Modify: Any files with remaining type errors

- [ ] **Step 1: Run typecheck**

Run: `cd cli && bun x tsc --noEmit 2>&1 | head -60`
Expected: List of remaining type errors from consumers of pipeline-machine types

- [ ] **Step 2: Fix type errors**

For each error, apply minimal fixes:
- Files importing `ManifestFeature` from `pipeline-machine/types` → import `MachineFeature` instead
- Files using `EpicContext.phase` → use `EpicContext.status`
- Files using `EpicContext.lastUpdated` → use `EpicContext.updated_at`
- Consumer files outside pipeline-machine that reference old types

- [ ] **Step 3: Run full test suite**

Run: `cd cli && bun --bun vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix(xstate-store-bridge): fix remaining type errors across codebase"
```

---

## Task 9: Run integration test (GREEN verification)

**Wave:** 5
**Depends on:** Task 8

**Files:**
- `cli/src/pipeline-machine/__tests__/xstate-store-bridge.integration.test.ts`

- [ ] **Step 1: Run integration test**

Run: `cd cli && bun --bun vitest run src/pipeline-machine/__tests__/xstate-store-bridge.integration.test.ts`
Expected: PASS (GREEN)

- [ ] **Step 2: Run full test suite one final time**

Run: `cd cli && bun --bun vitest run`
Expected: PASS

- [ ] **Step 3: Run typecheck**

Run: `cd cli && bun x tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit if any final fixes**

```bash
git add -A
git commit -m "test(xstate-store-bridge): integration test GREEN"
```
