/**
 * State scanner — discovers epic state from pipeline manifests.
 *
 * Composes manifest-store (filesystem) + manifest (pure state machine)
 * to produce structured state for the watch loop and status command.
 *
 * Pure read-only operation — no filesystem writes or process spawns.
 */

import { basename } from "path";
import { existsSync } from "fs";
import type { PipelineManifest } from "./manifest-store";
import * as store from "./manifest-store";
import { checkBlocked, enrich, advancePhase, shouldAdvance } from "./manifest";
import { loadConfig } from "./config";
import type { Phase } from "./types";
import { findWorktreeOutputFile, loadOutput, extractFeatureStatuses, extractArtifactPaths } from "./phase-output";
import type { ManifestFeature } from "./manifest-store";
import { epicMachine } from "./pipeline-machine";
import { createActor } from "xstate";
import type { DispatchType, EpicContext } from "./pipeline-machine";

// Re-export types from their canonical locations
export type { PipelineManifest } from "./manifest-store";

/** A dispatchable action derived from manifest state. */
export interface NextAction {
  phase: string;
  args: string[];
  type: "single" | "fan-out";
  features?: string[];
}

/** Enriched manifest with derived fields for the watch loop. */
export interface EnrichedManifest extends PipelineManifest {
  manifestPath: string;
  nextAction: NextAction | null;
}

/** Result of scanning the pipeline directory. */
export interface ScanResult {
  epics: EnrichedManifest[];
}

/**
 * Extract epic slug from a design artifact filename.
 * Input: "2026-03-28-typescript-pipeline-orchestrator.md"
 * Output: "typescript-pipeline-orchestrator"
 */
export function slugFromDesign(filename: string): string {
  return basename(filename, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

/**
 * Extract epic slug from a pipeline manifest filename.
 * Input: "2026-03-28-typescript-pipeline-orchestrator.manifest.json"
 * Output: "typescript-pipeline-orchestrator"
 */
export function slugFromManifest(filename: string): string {
  return basename(filename, ".manifest.json").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

/**
 * Pre-reconcile a manifest against its worktree output.
 * If the worktree has a completed output.json for the current phase,
 * enrich the manifest and advance it — then persist.
 * Idempotent: no-op if the worktree has no output for the current phase.
 */
function preReconcile(manifest: PipelineManifest, projectRoot: string): PipelineManifest {
  const wtPath = manifest.worktree?.path;
  if (!wtPath || !existsSync(wtPath)) return manifest;

  // Find output file filtered by epic slug (the worktree may contain
  // inherited artifacts from other epics via the branch history).
  const file = findWorktreeOutputFile(wtPath, manifest.phase as Phase, manifest.slug);
  if (!file) return manifest;

  const output = loadOutput(file);
  if (!output || output.status !== "completed") return manifest;

  // Enrich with features and artifact paths (mirrors watch-command reconcileState)
  const featureStatuses = extractFeatureStatuses(output);
  const artifactPaths = extractArtifactPaths(output);

  const features: ManifestFeature[] | undefined =
    featureStatuses.length > 0
      ? featureStatuses.map((f) => {
          const raw = (output.artifacts as unknown as Record<string, unknown>).features;
          const planFile = Array.isArray(raw)
            ? (raw.find(
                (r: unknown) =>
                  typeof r === "object" &&
                  r !== null &&
                  (r as Record<string, unknown>).slug === f.slug,
              ) as Record<string, unknown> | undefined)?.plan
            : undefined;
          return {
            slug: f.slug,
            plan: typeof planFile === "string" ? planFile : "",
            status: (f.status === "unknown" ? "pending" : f.status) as ManifestFeature["status"],
          };
        })
      : undefined;

  let updated = enrich(manifest, {
    phase: manifest.phase as Phase,
    features,
    artifacts: artifactPaths.length > 0 ? artifactPaths : undefined,
  });

  const nextPhase = shouldAdvance(updated, output);
  if (nextPhase) {
    updated = advancePhase(updated, nextPhase);
  }

  store.save(projectRoot, manifest.slug, updated);
  return updated;
}

/**
 * Derive the next dispatchable action from a manifest using the machine's
 * state metadata. Replaces the old deriveNextAction() pure function.
 */
function deriveNextActionFromMachine(manifest: PipelineManifest): NextAction | null {
  // Hydrate a temporary actor at the manifest's current phase
  const snapshot = epicMachine.resolveState({
    value: manifest.phase,
    context: manifest as unknown as EpicContext,
  });
  const actor = createActor(epicMachine, { snapshot, input: manifest as unknown as EpicContext });
  actor.start();

  const currentSnapshot = actor.getSnapshot();
  const stateValue = currentSnapshot.value as string;
  const meta = currentSnapshot.getMeta();
  const stateMeta = meta[`epic.${stateValue}`] as { dispatchType?: DispatchType } | undefined;
  const dispatchType = stateMeta?.dispatchType;

  actor.stop();

  if (!dispatchType || dispatchType === "skip") return null;

  if (dispatchType === "fan-out") {
    const pendingFeatures = manifest.features
      .filter((f) => f.status === "pending" || f.status === "in-progress")
      .map((f) => f.slug);
    if (pendingFeatures.length === 0) return null;
    return {
      phase: stateValue,
      args: [manifest.slug],
      type: "fan-out",
      features: pendingFeatures,
    };
  }

  // single dispatch
  return {
    phase: stateValue,
    args: [manifest.slug],
    type: "single",
  };
}

/**
 * Scan all epics and return enriched manifests.
 * Pre-reconciles each manifest against its worktree output before
 * deriving next actions and checking gates.
 */
export async function scanEpics(projectRoot: string): Promise<ScanResult> {
  const manifests = store.list(projectRoot);
  const config = loadConfig(projectRoot);

  const epics: EnrichedManifest[] = manifests.map((m) => {
    const reconciled = preReconcile(m, projectRoot);
    const nextAction = deriveNextActionFromMachine(reconciled);
    const blocked = checkBlocked(reconciled, config.gates);
    const path = store.manifestPath(projectRoot, reconciled.slug);

    return {
      ...reconciled,
      blocked: blocked,
      manifestPath: path ?? "",
      nextAction: blocked ? null : nextAction,
    };
  });

  return { epics };
}
