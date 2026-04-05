# Enrichment Pipeline Fix — Tasks

## Goal

Fix the three root causes that break the enrichment data pipeline so PRD content flows from design artifacts into GitHub issue bodies and feature descriptions + user stories flow into feature issue bodies.

## Architecture

- **State machine event types** carry artifact paths through state transitions
- **Reconcile functions** extract artifact paths from phase output and include them in events
- **Runner** passes `projectRoot` to `syncGitHub()` on the manual CLI path
- Dead `enrich()` function in `pure.ts` is deleted — artifact accumulation happens in state machine actions
- Body formatters (`formatEpicBody`, `formatFeatureBody`) already accept the right shapes — they just need data to reach them

## Tech Stack

- TypeScript, XState v5, Bun, Vitest
- Test runner: `cd cli && bun --bun vitest run`

## File Structure

### Modified Files

- `cli/src/pipeline-machine/types.ts` — Add `artifacts` field to `DESIGN_COMPLETED` and `PLAN_COMPLETED` event variants
- `cli/src/pipeline-machine/actions.ts` — Add `computeAccumulateArtifacts()` action to merge event artifacts into context
- `cli/src/pipeline-machine/epic.ts` — Wire `accumulateArtifacts` action into DESIGN_COMPLETED and PLAN_COMPLETED transitions
- `cli/src/manifest/reconcile.ts` — Extract artifact paths from phase output and include in state machine events
- `cli/src/pipeline/runner.ts` — Pass `projectRoot` to `syncGitHub()` on manual CLI path
- `cli/src/manifest/pure.ts` — Delete dead `enrich()` function

### Test Files

- `cli/src/pipeline-machine/__tests__/epic.test.ts` — Add tests for artifact propagation through state machine
- `cli/src/__tests__/body-format.test.ts` — (Existing tests, verify they still pass)

---

## Task 0: Add `artifacts` field to EpicEvent types and accumulate action

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/pipeline-machine/types.ts:17-25`
- Modify: `cli/src/pipeline-machine/actions.ts`
- Modify: `cli/src/pipeline-machine/epic.ts:41-56,88-93,100-107`

- [x] **Step 1: Write failing test for artifact propagation through DESIGN_COMPLETED**

Add to `cli/src/pipeline-machine/__tests__/epic.test.ts`:

```typescript
describe("artifact propagation", () => {
  test("DESIGN_COMPLETED stores artifacts in context", () => {
    const actor = startActor();
    actor.send({
      type: "DESIGN_COMPLETED",
      artifacts: { design: [".beastmode/artifacts/design/2026-04-04-my-epic.md"] },
    });
    expect(actor.getSnapshot().value).toBe("plan");
    expect(actor.getSnapshot().context.artifacts).toEqual({
      design: [".beastmode/artifacts/design/2026-04-04-my-epic.md"],
    });
  });

  test("PLAN_COMPLETED stores artifacts in context", () => {
    const actor = startActor();
    actor.send({ type: "DESIGN_COMPLETED" });
    actor.send({
      type: "PLAN_COMPLETED",
      features: [{ slug: "feat-a", plan: "plan-a" }],
      artifacts: { plan: [".beastmode/artifacts/plan/2026-04-04-my-epic-feat-a.md"] },
    });
    expect(actor.getSnapshot().value).toBe("implement");
    expect(actor.getSnapshot().context.artifacts).toEqual({
      plan: [".beastmode/artifacts/plan/2026-04-04-my-epic-feat-a.md"],
    });
  });

  test("artifacts accumulate across phases", () => {
    const actor = startActor();
    actor.send({
      type: "DESIGN_COMPLETED",
      artifacts: { design: [".beastmode/artifacts/design/prd.md"] },
    });
    actor.send({
      type: "PLAN_COMPLETED",
      features: [{ slug: "feat-a", plan: "plan-a" }],
      artifacts: { plan: [".beastmode/artifacts/plan/feat-a.md"] },
    });
    expect(actor.getSnapshot().context.artifacts).toEqual({
      design: [".beastmode/artifacts/design/prd.md"],
      plan: [".beastmode/artifacts/plan/feat-a.md"],
    });
  });

  test("DESIGN_COMPLETED without artifacts leaves context.artifacts unchanged", () => {
    const actor = startActor({ artifacts: { existing: ["file.md"] } });
    actor.send({ type: "DESIGN_COMPLETED" });
    expect(actor.getSnapshot().context.artifacts).toEqual({ existing: ["file.md"] });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/pipeline-machine/__tests__/epic.test.ts`
Expected: FAIL — TypeScript errors (artifacts field not in EpicEvent type)

- [x] **Step 3: Add artifacts field to EpicEvent type variants**

In `cli/src/pipeline-machine/types.ts`, update EpicEvent:

```typescript
export type EpicEvent =
  | { type: "DESIGN_COMPLETED"; realSlug?: string; summary?: { problem: string; solution: string }; artifacts?: Record<string, string[]> }
  | { type: "PLAN_COMPLETED"; features: Array<{ slug: string; plan: string; description?: string; wave?: number }>; artifacts?: Record<string, string[]> }
  | { type: "FEATURE_COMPLETED"; featureSlug: string }
  | { type: "IMPLEMENT_COMPLETED" }
  | { type: "VALIDATE_COMPLETED" }
  | { type: "REGRESS"; targetPhase: Phase }
  | { type: "RELEASE_COMPLETED" }
  | { type: "CANCEL" };
```

- [x] **Step 4: Add computeAccumulateArtifacts action**

In `cli/src/pipeline-machine/actions.ts`, add:

```typescript
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

- [x] **Step 5: Wire accumulateArtifacts into epic.ts transitions**

In `cli/src/pipeline-machine/epic.ts`:

1. Add `computeAccumulateArtifacts` to the import from `./actions`.
2. Add an `accumulateArtifacts` action in the `actions` section of `setup()`:

```typescript
accumulateArtifacts: assign({
  artifacts: ({ context, event }) => computeAccumulateArtifacts(context, event),
  lastUpdated: () => new Date().toISOString(),
}),
```

3. Add `"accumulateArtifacts"` to the DESIGN_COMPLETED transition actions (after `"setSummary"`):

```typescript
DESIGN_COMPLETED: {
  target: "plan",
  actions: ["renameSlug", "setSummary", "accumulateArtifacts", "persist"],
},
```

4. Add `"accumulateArtifacts"` to the PLAN_COMPLETED transition actions (after `"setFeatures"`):

```typescript
PLAN_COMPLETED: {
  target: "implement",
  guard: "hasFeatures",
  actions: ["setFeatures", "accumulateArtifacts", "persist"],
},
```

- [x] **Step 6: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/pipeline-machine/__tests__/epic.test.ts`
Expected: PASS

- [x] **Step 7: Commit**

```bash
git add cli/src/pipeline-machine/types.ts cli/src/pipeline-machine/actions.ts cli/src/pipeline-machine/epic.ts cli/src/pipeline-machine/__tests__/epic.test.ts
git commit -m "feat(enrichment-pipeline-fix): add artifacts field to EpicEvent and accumulate action"
```

---

## Task 1: Wire artifact paths through reconcile functions

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `cli/src/manifest/reconcile.ts:96-138`

- [x] **Step 1: Update reconcileDesign to include artifacts in event**

In `cli/src/manifest/reconcile.ts`, update `reconcileDesign()` to extract the design artifact path from the phase output and include it in the DESIGN_COMPLETED event:

```typescript
export async function reconcileDesign(
  projectRoot: string,
  slug: string,
  wtPath: string,
): Promise<ReconcileResult | undefined> {
  const output = loadWorktreePhaseOutput(wtPath, "design", slug);
  if (!output || output.status !== "completed") return undefined;

  const artifacts = output.artifacts as unknown as Record<string, unknown> | undefined;
  const realSlug = artifacts?.slug as string | undefined;
  const summary = artifacts?.summary as { problem: string; solution: string } | undefined;

  // Extract design artifact path for manifest enrichment
  const designPath = artifacts?.design as string | undefined;
  const eventArtifacts: Record<string, string[]> | undefined = designPath
    ? { design: [designPath] }
    : undefined;

  const updated = await store.transact(projectRoot, slug, (m) => {
    const actor = hydrateActor(m);
    actor.send({ type: "DESIGN_COMPLETED", realSlug, summary, artifacts: eventArtifacts });
    return extractManifest(actor);
  });

  return { manifest: updated, phase: updated.phase as Phase, progress: readProgress(updated) };
}
```

- [x] **Step 2: Update reconcilePlan to include artifacts in event**

In `cli/src/manifest/reconcile.ts`, update `reconcilePlan()`. The plan artifact paths come from the feature entries — each feature has a `plan` field with the plan path:

```typescript
export async function reconcilePlan(
  projectRoot: string,
  slug: string,
  wtPath: string,
): Promise<ReconcileResult | undefined> {
  const output = loadWorktreePhaseOutput(wtPath, "plan", slug);
  if (!output || output.status !== "completed") return undefined;

  const features = extractFeaturesFromOutput(output);

  // Collect plan artifact paths from feature entries
  const planPaths = features.map((f) => f.plan).filter(Boolean);
  const eventArtifacts: Record<string, string[]> | undefined = planPaths.length > 0
    ? { plan: planPaths }
    : undefined;

  const updated = await store.transact(projectRoot, slug, (m) => {
    const actor = hydrateActor(m);
    actor.send({ type: "PLAN_COMPLETED", features, artifacts: eventArtifacts });
    return extractManifest(actor);
  });

  return { manifest: updated, phase: updated.phase as Phase, progress: readProgress(updated) };
}
```

- [x] **Step 3: Run tests to verify existing reconcile and epic tests still pass**

Run: `cd cli && bun --bun vitest run`
Expected: PASS (all existing tests)

- [x] **Step 4: Commit**

```bash
git add cli/src/manifest/reconcile.ts
git commit -m "feat(enrichment-pipeline-fix): wire artifact paths through reconcile functions"
```

---

## Task 2: Pass projectRoot to syncGitHub on manual CLI path

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `cli/src/pipeline/runner.ts:268`

- [x] **Step 1: Fix runner.ts to pass projectRoot**

In `cli/src/pipeline/runner.ts`, change line 268 from:

```typescript
const syncResult = await syncGitHub(manifest, beastConfig, resolved);
```

to:

```typescript
const syncResult = await syncGitHub(manifest, beastConfig, resolved, {
  logger,
  projectRoot: config.projectRoot,
});
```

- [x] **Step 2: Run tests to verify nothing breaks**

Run: `cd cli && bun --bun vitest run`
Expected: PASS

- [x] **Step 3: Commit**

```bash
git add cli/src/pipeline/runner.ts
git commit -m "fix(enrichment-pipeline-fix): pass projectRoot to syncGitHub on manual CLI path"
```

---

## Task 3: Delete dead enrich() function and verify

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `cli/src/manifest/pure.ts:35-87`

- [x] **Step 1: Verify enrich() is not called anywhere**

Run: `grep -rn 'enrich(' cli/src/ --include='*.ts' | grep -v '__tests__' | grep -v 'pure.ts' | grep -v 'computeEnrichFeatures'`
Expected: No results (only the definition in pure.ts and the computeEnrichFeatures action reference)

- [x] **Step 2: Delete the enrich() function**

In `cli/src/manifest/pure.ts`, delete lines 33-87 (the comment block and the entire `enrich()` function):

Remove the block starting with:
```typescript
// --- Pure state transitions ---

/**
 * Enrich a manifest with phase output data.
 * Merges features (preserving existing github info), accumulates artifacts.
 */
export function enrich(
```
through to the closing `}` at line 87.

- [x] **Step 3: Run tests to verify nothing breaks**

Run: `cd cli && bun --bun vitest run`
Expected: PASS

- [x] **Step 4: Verify no import of enrich exists**

Run: `grep -rn "import.*enrich.*from.*pure" cli/src/ --include='*.ts'`
Expected: No results that import the `enrich` function (only `computeEnrichFeatures` from actions)

- [x] **Step 5: Commit**

```bash
git add cli/src/manifest/pure.ts
git commit -m "refactor(enrichment-pipeline-fix): delete dead enrich() function from pure.ts"
```
