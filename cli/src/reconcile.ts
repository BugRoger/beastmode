/**
 * Reconcile — single entry point for all manifest state transitions.
 *
 * Explicit function per phase. Each loads the right output, sends the
 * right events, and persists via store.transact().
 *
 * Replaces the duplicated reconciliation logic that was spread across
 * preReconcile (state-scanner.ts), reconcileState (watch-command.ts),
 * and runPostDispatch (post-dispatch.ts).
 */

import { createActor } from "xstate";
import { epicMachine } from "./pipeline-machine/index.js";
import type { EpicContext } from "./pipeline-machine/index.js";
import type { PipelineManifest } from "./manifest-store.js";
import * as store from "./manifest-store.js";
import type { Phase } from "./types.js";
import type { PhaseOutput } from "./types.js";
import {
  loadWorktreePhaseOutput,
  loadWorktreeFeatureOutput,
} from "./phase-output.js";

// --- Result type ---

export interface ReconcileResult {
  manifest: PipelineManifest;
  phase: Phase;
  progress?: { completed: number; total: number };
}

// --- Shared helpers ---

/** Hydrate an ephemeral XState actor at the manifest's current phase. */
function hydrateActor(manifest: PipelineManifest) {
  const epicContext = manifest as unknown as EpicContext;
  const resolvedSnapshot = epicMachine.resolveState({
    value: manifest.phase,
    context: epicContext,
  });
  const actor = createActor(epicMachine, {
    snapshot: resolvedSnapshot,
    input: epicContext,
  });
  actor.start();
  return actor;
}

/** Extract the manifest from an actor snapshot. */
function extractManifest(actor: ReturnType<typeof hydrateActor>): PipelineManifest {
  const snapshot = actor.getSnapshot();
  const phase = (typeof snapshot.value === "string"
    ? snapshot.value
    : "design") as Phase;
  const manifest = {
    ...(snapshot.context as unknown as PipelineManifest),
    phase,
  };
  actor.stop();
  return manifest;
}

/** Compute feature progress from a manifest. */
function readProgress(manifest: PipelineManifest): { completed: number; total: number } | undefined {
  if (manifest.features.length === 0) return undefined;
  const completed = manifest.features.filter((f) => f.status === "completed").length;
  return { completed, total: manifest.features.length };
}

/**
 * Extract feature definitions from plan phase output.
 * Returns array suitable for PLAN_COMPLETED event payload.
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

// --- Phase-specific reconcile functions ---

/**
 * Reconcile a design phase completion.
 * Sends DESIGN_COMPLETED with the real slug and summary.
 */
export async function reconcileDesign(
  projectRoot: string,
  slug: string,
  wtPath: string,
): Promise<ReconcileResult | undefined> {
  const output = loadWorktreePhaseOutput(wtPath, "design", slug);
  if (!output || output.status !== "completed") return undefined;

  const artifacts = output.artifacts as Record<string, unknown> | undefined;
  const realSlug = artifacts?.slug as string | undefined;
  const summary = artifacts?.summary as { problem: string; solution: string } | undefined;

  const updated = await store.transact(projectRoot, slug, (m) => {
    const actor = hydrateActor(m);
    actor.send({ type: "DESIGN_COMPLETED", realSlug, summary });
    return extractManifest(actor);
  });

  return { manifest: updated, phase: updated.phase as Phase, progress: readProgress(updated) };
}

/**
 * Reconcile a plan phase completion.
 * Sends PLAN_COMPLETED with extracted feature definitions.
 */
export async function reconcilePlan(
  projectRoot: string,
  slug: string,
  wtPath: string,
): Promise<ReconcileResult | undefined> {
  const output = loadWorktreePhaseOutput(wtPath, "plan", slug);
  if (!output || output.status !== "completed") return undefined;

  const features = extractFeaturesFromOutput(output);

  const updated = await store.transact(projectRoot, slug, (m) => {
    const actor = hydrateActor(m);
    actor.send({ type: "PLAN_COMPLETED", features });
    return extractManifest(actor);
  });

  return { manifest: updated, phase: updated.phase as Phase, progress: readProgress(updated) };
}

/**
 * Reconcile a single feature completion within the implement phase.
 * Sends FEATURE_COMPLETED + IMPLEMENT_COMPLETED (guard checks allFeaturesCompleted).
 * Returns undefined if no completed output.json exists for the feature.
 */
export async function reconcileFeature(
  projectRoot: string,
  slug: string,
  featureSlug: string,
  wtPath: string,
): Promise<ReconcileResult | undefined> {
  const output = loadWorktreeFeatureOutput(wtPath, "implement", slug, featureSlug);
  if (!output || output.status !== "completed") return undefined;

  const updated = await store.transact(projectRoot, slug, (m) => {
    const actor = hydrateActor(m);
    actor.send({ type: "FEATURE_COMPLETED", featureSlug });
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    return extractManifest(actor);
  });

  return { manifest: updated, phase: updated.phase as Phase, progress: readProgress(updated) };
}

/**
 * Reconcile the implement phase without a specific feature (phase-level).
 * Sends IMPLEMENT_COMPLETED — the guard checks allFeaturesCompleted.
 * Used by the CLI path when all features are already completed.
 */
export async function reconcileImplement(
  projectRoot: string,
  slug: string,
): Promise<ReconcileResult | undefined> {
  const updated = await store.transact(projectRoot, slug, (m) => {
    const actor = hydrateActor(m);
    actor.send({ type: "IMPLEMENT_COMPLETED" });
    return extractManifest(actor);
  });

  return { manifest: updated, phase: updated.phase as Phase, progress: readProgress(updated) };
}

/**
 * Reconcile a validate phase completion.
 * Sends VALIDATE_COMPLETED on success, REGRESS on failure.
 */
export async function reconcileValidate(
  projectRoot: string,
  slug: string,
  wtPath: string,
): Promise<ReconcileResult | undefined> {
  const output = loadWorktreePhaseOutput(wtPath, "validate", slug);
  // Validate must reconcile even without completed output (REGRESS path)

  const updated = await store.transact(projectRoot, slug, (m) => {
    const actor = hydrateActor(m);
    if (output?.status === "completed") {
      actor.send({ type: "VALIDATE_COMPLETED" });
    } else {
      actor.send({ type: "REGRESS", targetPhase: "implement" as Phase });
    }
    return extractManifest(actor);
  });

  return { manifest: updated, phase: updated.phase as Phase, progress: readProgress(updated) };
}

/**
 * Reconcile a release phase completion.
 * Sends RELEASE_COMPLETED.
 */
export async function reconcileRelease(
  projectRoot: string,
  slug: string,
  wtPath: string,
): Promise<ReconcileResult | undefined> {
  const output = loadWorktreePhaseOutput(wtPath, "release", slug);
  if (!output || output.status !== "completed") return undefined;

  const updated = await store.transact(projectRoot, slug, (m) => {
    const actor = hydrateActor(m);
    actor.send({ type: "RELEASE_COMPLETED" });
    return extractManifest(actor);
  });

  return { manifest: updated, phase: updated.phase as Phase, progress: readProgress(updated) };
}

// --- Catch-up reconciliation ---

/**
 * Reconcile all epics that have unprocessed output.json files.
 * Called once at watch loop startup to catch up on sessions that
 * completed while the loop was not running.
 */
export async function reconcileAll(projectRoot: string): Promise<void> {
  const manifests = store.list(projectRoot);

  for (const manifest of manifests) {
    if (manifest.phase === "done" || manifest.phase === "cancelled") continue;
    const wtPath = manifest.worktree?.path;
    if (!wtPath) continue;

    const phase = manifest.phase as Phase;

    switch (phase) {
      case "design":
        await reconcileDesign(projectRoot, manifest.slug, wtPath);
        break;
      case "plan":
        await reconcilePlan(projectRoot, manifest.slug, wtPath);
        break;
      case "implement":
        // Reconcile each incomplete feature individually
        for (const feature of manifest.features) {
          if (feature.status !== "completed") {
            await reconcileFeature(projectRoot, manifest.slug, feature.slug, wtPath);
          }
        }
        break;
      case "validate":
        await reconcileValidate(projectRoot, manifest.slug, wtPath);
        break;
      case "release":
        await reconcileRelease(projectRoot, manifest.slug, wtPath);
        break;
    }
  }
}
