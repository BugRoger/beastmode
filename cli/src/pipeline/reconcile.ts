/**
 * Reconcile — single entry point for all store state transitions.
 *
 * Explicit function per phase. Each loads the right output, sends the
 * right XState events, and persists via store.save().
 */

import type { Epic } from "../store/index.js";
import { JsonFileStore } from "../store/index.js";
import type { Phase } from "../types.js";
import type { PhaseOutput } from "../types.js";
import {
  loadWorktreePhaseOutput,
  loadWorktreeFeatureOutput,
} from "../artifacts/reader.js";
import { epicMachine, loadEpic } from "../pipeline-machine/index.js";
import type { EpicContext } from "../pipeline-machine/index.js";
import { resolve } from "node:path";

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
    plan: f.plan ?? "",
    description: f.description,
    wave: store.computeWave(f.id),
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
): Array<{ slug: string; plan: string; description?: string; wave?: number }> {
  if (!output) return [];
  const artifacts = output.artifacts as unknown as Record<string, unknown>;
  if (!artifacts || !Array.isArray(artifacts.features)) return [];

  const features: Array<{ slug: string; plan: string; description?: string; wave?: number }> = [];
  for (const entry of artifacts.features) {
    if (
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as Record<string, unknown>).slug === "string"
    ) {
      const rec = entry as Record<string, unknown>;
      features.push({
        slug: rec.slug as string,
        plan: typeof rec.plan === "string" ? rec.plan : "",
        description: typeof rec.description === "string" ? rec.description : undefined,
        wave: typeof rec.wave === "number" ? rec.wave : undefined,
      });
    }
  }
  return features;
}

// --- Per-slug mutex for concurrent reconciliation ---
const locks = new Map<string, Promise<void>>();

async function withLock<T>(slug: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(slug) ?? Promise.resolve();
  let release!: () => void;
  locks.set(slug, new Promise<void>((r) => { release = r; }));
  await prev;
  try {
    return await fn();
  } finally {
    release();
    locks.delete(slug);
  }
}

// --- Phase-specific reconcile functions ---

/**
 * Reconcile a design phase completion.
 */
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
  const designPath = artifacts?.design as string | undefined;

  return withLock(slug, async () => {
    const storePath = resolve(projectRoot, ".beastmode", "state", "store.json");
    const store = new JsonFileStore(storePath);
    store.load();

    let epic = store.find(slug);
    if (!epic || epic.type !== "epic") {
      // Create the epic entity during design reconciliation
      const newEpic = store.addEpic({
        name: realSlug ?? slug,
        slug: realSlug ?? slug,
      });
      epic = newEpic;
    }

    const actor = hydrateActor(epic, store);
    const eventArtifacts: Record<string, string[]> | undefined = designPath
      ? { design: [designPath] }
      : undefined;
    actor.send({ type: "DESIGN_COMPLETED", realSlug, summary, artifacts: eventArtifacts });
    const updated = extractEpic(actor, epic);

    // Design phase may rename the slug (hex -> human-readable).
    // Since slug is immutable on epic entities, delete and recreate.
    const newSlug = realSlug ?? epic.slug;
    if (newSlug !== epic.slug) {
      store.deleteEpic(epic.id);
      const renamed = store.addEpic({ name: newSlug, slug: newSlug });
      store.updateEpic(renamed.id, {
        status: updated.status,
        summary: typeof summary === "object" ? `${summary.problem} — ${summary.solution}` : epic.summary,
        design: designPath,
        worktree: epic.worktree,
        updated_at: updated.updated_at,
      });
      store.save();
      const savedEpic = store.getEpic(renamed.id)!;
      return {
        epic: savedEpic,
        manifest: savedEpic,
        phase: savedEpic.status as Phase,
        progress: readProgress(renamed.id, store),
      };
    }

    store.updateEpic(epic.id, {
      status: updated.status,
      name: realSlug ?? epic.name,
      summary: typeof summary === "object" ? `${summary.problem} — ${summary.solution}` : epic.summary,
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
  slug: string,
  wtPath: string,
): Promise<ReconcileResult | undefined> {
  const output = loadWorktreePhaseOutput(wtPath, "plan", slug);
  if (!output || output.status !== "completed") return undefined;

  const features = extractFeaturesFromOutput(output);

  return withLock(slug, async () => {
    const storePath = resolve(projectRoot, ".beastmode", "state", "store.json");
    const store = new JsonFileStore(storePath);
    store.load();

    const epic = store.find(slug);
    if (!epic || epic.type !== "epic") return undefined;

    const actor = hydrateActor(epic, store);
    const planPaths = features.map((f) => f.plan).filter(Boolean);
    const eventArtifacts: Record<string, string[]> | undefined = planPaths.length > 0
      ? { plan: planPaths }
      : undefined;
    actor.send({ type: "PLAN_COMPLETED", features, artifacts: eventArtifacts });
    const updated = extractEpic(actor, epic);

    store.updateEpic(epic.id, {
      status: updated.status,
      updated_at: updated.updated_at,
    });

    // Create feature entities
    for (const f of features) {
      const existing = store.listFeatures(epic.id).find((ef) => ef.slug === f.slug);
      if (!existing) {
        const newFeature = store.addFeature({
          parent: epic.id,
          name: f.slug,
          slug: f.slug,
          description: f.description,
        });
        // Update plan path if provided
        if (f.plan) {
          store.updateFeature(newFeature.id, { plan: f.plan });
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
  slug: string,
  featureSlug: string,
  wtPath: string,
): Promise<ReconcileResult | undefined> {
  const output = loadWorktreeFeatureOutput(wtPath, "implement", slug, featureSlug);
  if (!output || output.status !== "completed") return undefined;

  return withLock(slug, async () => {
    const storePath = resolve(projectRoot, ".beastmode", "state", "store.json");
    const store = new JsonFileStore(storePath);
    store.load();

    const epic = store.find(slug);
    if (!epic || epic.type !== "epic") return undefined;

    // Mark the feature as completed
    const features = store.listFeatures(epic.id);
    const feature = features.find((f) => f.slug === featureSlug);
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
  slug: string,
): Promise<ReconcileResult | undefined> {
  return withLock(slug, async () => {
    const storePath = resolve(projectRoot, ".beastmode", "state", "store.json");
    const store = new JsonFileStore(storePath);
    store.load();

    const epic = store.find(slug);
    if (!epic || epic.type !== "epic") return undefined;

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
  slug: string,
  wtPath: string,
): Promise<ReconcileResult | undefined> {
  const output = loadWorktreePhaseOutput(wtPath, "validate", slug);

  return withLock(slug, async () => {
    const storePath = resolve(projectRoot, ".beastmode", "state", "store.json");
    const store = new JsonFileStore(storePath);
    store.load();

    const epic = store.find(slug);
    if (!epic || epic.type !== "epic") return undefined;

    const actor = hydrateActor(epic, store);
    if (output?.status === "completed") {
      actor.send({ type: "VALIDATE_COMPLETED" });
    } else {
      const artifacts = output?.artifacts as unknown as Record<string, unknown> | undefined;
      const failedFeatures = artifacts?.failedFeatures as string[] | undefined;
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
  slug: string,
  wtPath: string,
): Promise<ReconcileResult | undefined> {
  const output = loadWorktreePhaseOutput(wtPath, "release", slug);
  if (!output || output.status !== "completed") return undefined;

  return withLock(slug, async () => {
    const storePath = resolve(projectRoot, ".beastmode", "state", "store.json");
    const store = new JsonFileStore(storePath);
    store.load();

    const epic = store.find(slug);
    if (!epic || epic.type !== "epic") return undefined;

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
        await reconcileDesign(projectRoot, epic.slug, wtPath);
        break;
      case "plan":
        await reconcilePlan(projectRoot, epic.slug, wtPath);
        break;
      case "implement":
        for (const feature of store.listFeatures(epic.id)) {
          if (feature.status !== "completed") {
            await reconcileFeature(projectRoot, epic.slug, feature.slug, wtPath);
          }
        }
        break;
      case "validate":
        await reconcileValidate(projectRoot, epic.slug, wtPath);
        break;
      case "release":
        await reconcileRelease(projectRoot, epic.slug, wtPath);
        break;
    }
  }
}
