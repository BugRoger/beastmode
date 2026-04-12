/**
 * Reconcile — single entry point for all store state transitions.
 *
 * Explicit function per phase. Each loads the right output, sends the
 * right XState events, and persists via store.save().
 */

import type { Epic, Feature } from "../store/index.js";
import { JsonFileStore, resolveIdentifier } from "../store/index.js";
import { slugify } from "../store/slug.js";
import type { Phase } from "../types.js";
import type { PhaseOutput } from "../types.js";
import {
  loadWorktreePhaseOutput,
  loadWorktreeFeatureOutput,
  extractSectionFromFile,
} from "../artifacts/index.js";
import { epicMachine, loadEpic } from "../pipeline-machine/index.js";
import type { EpicContext } from "../pipeline-machine/index.js";
import { resolve, join } from "node:path";

// --- Result type ---

export interface ReconcileResult {
  epic: Epic;
  phase: Phase;
  progress?: { completed: number; total: number };
  /** @deprecated Alias for `epic` — kept during migration */
  manifest: Epic;
}

// --- Shared helpers ---

/** Build an EpicContext from a store Epic entity. */
function buildContext(epic: Epic, store: JsonFileStore): EpicContext {
  const features = store.listFeatures(epic.id).map((f) => ({
    slug: f.slug,
    name: f.name,
    plan: f.plan ?? "",
    description: f.description,
    wave: f.wave,
    status: f.status,
    reDispatchCount: f.reDispatchCount ?? 0,
  }));

  return {
    id: epic.id,
    slug: epic.slug,
    name: epic.name,
    status: epic.status,
    features,
    artifacts: {},
    summary: epic.summary,
    worktree: epic.worktree,
    depends_on: epic.depends_on ?? [],
    created_at: epic.created_at,
    updated_at: epic.updated_at,
    design: epic.design,
    plan: epic.plan,
    implement: epic.implement,
    validate: epic.validate,
    release: epic.release,
  } as unknown as EpicContext;
}

/** Hydrate an XState actor from store epic state. */
function hydrateActor(epic: Epic, store: JsonFileStore) {
  const context = buildContext(epic, store);
  const snapshot = epicMachine.resolveState({
    value: epic.status,
    context,
  });
  return loadEpic(snapshot, context);
}

/** Extract the updated epic state from an actor snapshot. */
function extractEpic(actor: ReturnType<typeof loadEpic>, originalEpic: Epic): Epic {
  const snapshot = actor.getSnapshot();
  const phase = (typeof snapshot.value === "string"
    ? snapshot.value
    : "design") as Phase;
  const ctx = snapshot.context as unknown as Record<string, unknown>;
  actor.stop();
  return {
    ...originalEpic,
    status: phase as Epic["status"],
    summary: (ctx.summary as string) ?? originalEpic.summary,
    updated_at: new Date().toISOString(),
  };
}

/** Compute feature progress from a store. */
function readProgress(epicId: string, store: JsonFileStore): { completed: number; total: number } | undefined {
  const features = store.listFeatures(epicId);
  if (features.length === 0) return undefined;
  const completed = features.filter((f) => f.status === "completed").length;
  return { completed, total: features.length };
}

/**
 * Extract feature definitions from plan phase output.
 */
function extractFeaturesFromOutput(
  output: PhaseOutput | undefined,
): Array<{ name: string; plan: string; wave?: number }> {
  if (!output) return [];
  const artifacts = output.artifacts as unknown as Record<string, unknown>;
  if (!artifacts || !Array.isArray(artifacts.features)) return [];

  const features: Array<{ name: string; plan: string; wave?: number }> = [];
  for (const entry of artifacts.features) {
    if (
      typeof entry === "object" &&
      entry !== null
    ) {
      const rec = entry as Record<string, unknown>;
      // Plan output uses "feature-name", implement output uses "feature-slug"
      const featureName = (rec["feature-name"] ?? rec["feature-slug"]) as string | undefined;
      if (typeof featureName !== "string") continue;
      features.push({
        name: featureName,
        plan: typeof rec.plan === "string" ? rec.plan : "",
        wave: typeof rec.wave === "number" ? rec.wave : undefined,
      });
    }
  }
  return features;
}

// --- Per-entity mutex for concurrent reconciliation ---
const locks = new Map<string, Promise<void>>();

async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  locks.set(key, new Promise<void>((r) => { release = r; }));
  await prev;
  try {
    return await fn();
  } finally {
    release();
    locks.delete(key);
  }
}

/**
 * Resolve an epicId (which may be an ID like "bm-xxxx" or a slug) to the
 * actual Epic entity. Returns undefined if not found.
 */
function resolveEpic(store: JsonFileStore, epicId: string): Epic | undefined {
  // Fast path: direct ID lookup
  const byId = store.getEpic(epicId);
  if (byId) return byId;
  // Slow path: resolve by slug
  const resolution = resolveIdentifier(store, epicId, { resolveToEpic: true });
  return resolution.kind === "found" && resolution.entity.type === "epic"
    ? resolution.entity as Epic
    : undefined;
}

// --- Phase-specific reconcile functions ---

/**
 * Reconcile a design phase completion.
 */
export async function reconcileDesign(
  projectRoot: string,
  epicId: string,
  wtPath: string,
): Promise<ReconcileResult | undefined> {
  return withLock(epicId, async () => {
    const storePath = resolve(projectRoot, ".beastmode", "state", "store.json");
    const store = new JsonFileStore(storePath);
    store.load();

    let epic = resolveEpic(store, epicId);
    if (!epic) {
      // Entity must exist — pre-created by pipeline runner at Step 0
      return undefined;
    }

    // Try file lookup with both the passed identifier and the resolved slug
    const output =
      loadWorktreePhaseOutput(wtPath, "design", epicId) ??
      (epic.slug !== epicId ? loadWorktreePhaseOutput(wtPath, "design", epic.slug) : undefined);
    if (!output || output.status !== "completed") return undefined;

    const artifacts = output.artifacts as unknown as Record<string, unknown> | undefined;
    const epicName = artifacts?.["epic-name"] as string | undefined;
    const designPath = artifacts?.design as string | undefined;

    let summary: { problem: string; solution: string } | undefined;
    if (designPath) {
      const designFullPath = join(wtPath, ".beastmode", "artifacts", "design", designPath);
      const problem = await extractSectionFromFile(designFullPath, "Problem Statement");
      const solution = await extractSectionFromFile(designFullPath, "Solution");
      if (problem && solution) {
        summary = { problem, solution };
      }
    }

    const actor = hydrateActor(epic, store);
    const eventArtifacts: Record<string, string[]> | undefined = designPath
      ? { design: [designPath] }
      : undefined;
    actor.send({ type: "DESIGN_COMPLETED", realSlug: epicName, summary, artifacts: eventArtifacts });
    const updated = extractEpic(actor, epic);

    // Update the store — store.updateEpic auto-derives slug when name changes.
    // External side effects (tag rename, artifact rename, worktree rename) are
    // handled by the runner after reconciliation returns.
    store.updateEpic(epic.id, {
      name: epicName ?? epic.name,
      status: updated.status,
      summary: summary ?? epic.summary,
      design: designPath,
      updated_at: updated.updated_at,
    });
    store.save();

    const savedEpic = store.getEpic(epic.id)!;
    return {
      epic: savedEpic,
      manifest: savedEpic,
      phase: savedEpic.status as Phase,
      progress: readProgress(epic.id, store),
    };
  });
}

/**
 * Reconcile a plan phase completion.
 */
export async function reconcilePlan(
  projectRoot: string,
  epicId: string,
  wtPath: string,
): Promise<ReconcileResult | undefined> {
  return withLock(epicId, async () => {
    const storePath = resolve(projectRoot, ".beastmode", "state", "store.json");
    const store = new JsonFileStore(storePath);
    store.load();

    // Resolve epicId which may be an ID (bm-xxxx) or a slug
    const epic = resolveEpic(store, epicId);
    if (!epic) return undefined;

    // Try file lookup with both the passed identifier and the resolved slug
    const output =
      loadWorktreePhaseOutput(wtPath, "plan", epicId) ??
      (epic.slug !== epicId ? loadWorktreePhaseOutput(wtPath, "plan", epic.slug) : undefined);
    if (!output || output.status !== "completed") return undefined;

    const features = extractFeaturesFromOutput(output);

    const actor = hydrateActor(epic, store);
    const planPaths = features.map((f) => f.plan).filter(Boolean);
    const eventArtifacts: Record<string, string[]> | undefined = planPaths.length > 0
      ? { plan: planPaths }
      : undefined;
    actor.send({ type: "PLAN_COMPLETED", features: features.map((f) => ({ slug: slugify(f.name), plan: f.plan, wave: f.wave })), artifacts: eventArtifacts });
    const updated = extractEpic(actor, epic);

    store.updateEpic(epic.id, {
      status: updated.status,
      updated_at: updated.updated_at,
    });

    // Create or update feature entities
    const waveGroups = new Map<number, Feature[]>();

    for (const f of features) {
      const existing = store.listFeatures(epic.id).find(
        (ef) => ef.slug === f.name || ef.name === f.name,
      );
      let description: string | undefined;
      if (f.plan) {
        const planFullPath = join(wtPath, ".beastmode", "artifacts", "plan", f.plan);
        description = await extractSectionFromFile(planFullPath, "What to Build")
          ?? await extractSectionFromFile(planFullPath, "Description");
      }
      let featureEntity: Feature;
      if (!existing) {
        featureEntity = store.addFeature({
          parent: epic.id,
          name: f.name,
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

      // Track wave grouping for dependency injection
      const wave = f.wave ?? 1;
      if (!waveGroups.has(wave)) waveGroups.set(wave, []);
      waveGroups.get(wave)!.push(featureEntity);
    }

    // Wave-to-dependency conversion: wave N depends on all features in wave N-1
    const waves = Array.from(waveGroups.keys()).sort((a, b) => a - b);
    for (let i = 1; i < waves.length; i++) {
      const prevIds = waveGroups.get(waves[i - 1])!.map((f) => f.id);
      for (const feature of waveGroups.get(waves[i])!) {
        const existingDeps = feature.depends_on ?? [];
        const newDeps = prevIds.filter((id) => !existingDeps.includes(id));
        if (newDeps.length > 0) {
          store.updateFeature(feature.id, {
            depends_on: [...existingDeps, ...newDeps],
          });
        }
      }
    }

    store.save();
    const savedEpic = store.getEpic(epic.id)!;
    return {
      epic: savedEpic,
      manifest: savedEpic,
      phase: savedEpic.status as Phase,
      progress: readProgress(epic.id, store),
    };
  });
}

/**
 * Reconcile a single feature completion within the implement phase.
 */
export async function reconcileFeature(
  projectRoot: string,
  epicId: string,
  featureSlug: string,
  wtPath: string,
): Promise<ReconcileResult | undefined> {
  return withLock(epicId, async () => {
    const storePath = resolve(projectRoot, ".beastmode", "state", "store.json");
    const store = new JsonFileStore(storePath);
    store.load();

    const epic = resolveEpic(store, epicId);
    if (!epic) return undefined;

    const output =
      loadWorktreeFeatureOutput(wtPath, "implement", epicId, featureSlug) ??
      (epic.slug !== epicId ? loadWorktreeFeatureOutput(wtPath, "implement", epic.slug, featureSlug) : undefined);
    if (!output || output.status !== "completed") return undefined;

    // Mark the feature as completed
    // featureSlug may be the full derived slug (from reconcileAll) or the short
    // name (from the runner/dispatcher). Match on both slug and name.
    const features = store.listFeatures(epic.id);
    const feature = features.find((f) => f.slug === featureSlug || f.name === featureSlug);
    if (feature) {
      store.updateFeature(feature.id, { status: "completed" });
    }

    const actor = hydrateActor(epic, store);
    actor.send({ type: "FEATURE_COMPLETED", featureSlug });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    const updated = extractEpic(actor, epic);

    store.updateEpic(epic.id, {
      status: updated.status,
      updated_at: updated.updated_at,
    });
    store.save();

    const savedEpic = store.getEpic(epic.id)!;
    return {
      epic: savedEpic,
      manifest: savedEpic,
      phase: savedEpic.status as Phase,
      progress: readProgress(epic.id, store),
    };
  });
}

/**
 * Reconcile the implement phase without a specific feature.
 */
export async function reconcileImplement(
  projectRoot: string,
  epicId: string,
): Promise<ReconcileResult | undefined> {
  return withLock(epicId, async () => {
    const storePath = resolve(projectRoot, ".beastmode", "state", "store.json");
    const store = new JsonFileStore(storePath);
    store.load();

    const epic = resolveEpic(store, epicId);
    if (!epic) return undefined;

    const actor = hydrateActor(epic, store);
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    const updated = extractEpic(actor, epic);

    store.updateEpic(epic.id, {
      status: updated.status,
      updated_at: updated.updated_at,
    });
    store.save();

    const savedEpic = store.getEpic(epic.id)!;
    return {
      epic: savedEpic,
      manifest: savedEpic,
      phase: savedEpic.status as Phase,
      progress: readProgress(epic.id, store),
    };
  });
}

/**
 * Reconcile a validate phase completion.
 */
export async function reconcileValidate(
  projectRoot: string,
  epicId: string,
  wtPath: string,
): Promise<ReconcileResult | undefined> {
  return withLock(epicId, async () => {
    const storePath = resolve(projectRoot, ".beastmode", "state", "store.json");
    const store = new JsonFileStore(storePath);
    store.load();

    const epic = resolveEpic(store, epicId);
    if (!epic) return undefined;

    const output =
      loadWorktreePhaseOutput(wtPath, "validate", epicId) ??
      (epic.slug !== epicId ? loadWorktreePhaseOutput(wtPath, "validate", epic.slug) : undefined);

    const actor = hydrateActor(epic, store);
    if (output?.status === "completed") {
      actor.send({ type: "VALIDATE_COMPLETED" });
    } else {
      const artifacts = output?.artifacts as unknown as Record<string, unknown> | undefined;
      const failedFeatures = artifacts?.["failed-features"] as string[] | undefined;
      if (failedFeatures && failedFeatures.length > 0) {
        actor.send({ type: "REGRESS_FEATURES", failingFeatures: failedFeatures });
      } else {
        actor.send({ type: "REGRESS", targetPhase: "implement" as Phase });
      }
    }

    // Read feature state from XState before extractEpic stops the actor
    const machineCtx = actor.getSnapshot().context as unknown as {
      features: Array<{ slug: string; status: string; reDispatchCount?: number }>;
    };
    const machineFeatures = machineCtx.features;

    const updated = extractEpic(actor, epic);

    // Sync feature status changes and reDispatchCount from XState back to store
    const storeFeatures = store.listFeatures(epic.id);
    for (const mf of machineFeatures) {
      const sf = storeFeatures.find((f) => f.slug === mf.slug);
      if (sf && (sf.status !== mf.status || (sf.reDispatchCount ?? 0) !== (mf.reDispatchCount ?? 0))) {
        store.updateFeature(sf.id, {
          status: mf.status as import("../store/types.js").FeatureStatus,
          ...(mf.reDispatchCount !== undefined ? { reDispatchCount: mf.reDispatchCount } : {}),
        });
      }
    }

    store.updateEpic(epic.id, {
      status: updated.status,
      updated_at: updated.updated_at,
    });
    store.save();

    const savedEpic = store.getEpic(epic.id)!;
    return {
      epic: savedEpic,
      manifest: savedEpic,
      phase: savedEpic.status as Phase,
      progress: readProgress(epic.id, store),
    };
  });
}

/**
 * Reconcile a release phase completion.
 */
export async function reconcileRelease(
  projectRoot: string,
  epicId: string,
  wtPath: string,
): Promise<ReconcileResult | undefined> {
  return withLock(epicId, async () => {
    const storePath = resolve(projectRoot, ".beastmode", "state", "store.json");
    const store = new JsonFileStore(storePath);
    store.load();

    const epic = resolveEpic(store, epicId);
    if (!epic) return undefined;

    const output =
      loadWorktreePhaseOutput(wtPath, "release", epicId) ??
      (epic.slug !== epicId ? loadWorktreePhaseOutput(wtPath, "release", epic.slug) : undefined);
    if (!output || output.status !== "completed") return undefined;

    const actor = hydrateActor(epic, store);
    actor.send({ type: "RELEASE_COMPLETED" });
    const updated = extractEpic(actor, epic);

    store.updateEpic(epic.id, {
      status: updated.status,
      updated_at: updated.updated_at,
    });
    store.save();

    const savedEpic = store.getEpic(epic.id)!;
    return {
      epic: savedEpic,
      manifest: savedEpic,
      phase: savedEpic.status as Phase,
      progress: readProgress(epic.id, store),
    };
  });
}

/**
 * Reconcile all epics that have unprocessed output.json files.
 */
export async function reconcileAll(projectRoot: string): Promise<void> {
  const storePath = resolve(projectRoot, ".beastmode", "state", "store.json");
  const store = new JsonFileStore(storePath);
  store.load();

  for (const epic of store.listEpics()) {
    if (epic.status === "done" || epic.status === "cancelled") continue;
    const wtPath = epic.worktree?.path;
    if (!wtPath) continue;

    switch (epic.status) {
      case "design":
        await reconcileDesign(projectRoot, epic.id, wtPath);
        break;
      case "plan":
        await reconcilePlan(projectRoot, epic.id, wtPath);
        break;
      case "implement":
        for (const feature of store.listFeatures(epic.id)) {
          if (feature.status !== "completed") {
            await reconcileFeature(projectRoot, epic.id, feature.slug, wtPath);
          }
        }
        break;
      case "validate":
        await reconcileValidate(projectRoot, epic.id, wtPath);
        break;
      case "release":
        await reconcileRelease(projectRoot, epic.id, wtPath);
        break;
    }
  }
}
