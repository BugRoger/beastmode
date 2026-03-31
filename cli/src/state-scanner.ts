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
import { checkBlocked } from "./manifest";
import { loadConfig } from "./config";
import type { Phase } from "./types";
import { findWorktreeOutputFile, loadOutput } from "./phase-output";
import { epicMachine } from "./pipeline-machine";
import { createActor } from "xstate";
import type { DispatchType, EpicContext, EpicEvent } from "./pipeline-machine";

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

  // Hydrate ephemeral actor at the manifest's current phase
  const epicContext = manifest as unknown as EpicContext;
  const resolvedSnapshot = epicMachine.resolveState({
    value: manifest.phase,
    context: epicContext,
  });
  const actor = createActor(epicMachine, { snapshot: resolvedSnapshot });
  actor.start();

  // Map output to machine events based on current phase
  const events = mapOutputToEvents(manifest.phase as Phase, output, manifest.slug);
  for (const event of events) {
    actor.send(event);
  }

  // Extract resulting state
  const finalSnapshot = actor.getSnapshot();
  const finalPhase = (typeof finalSnapshot.value === "string"
    ? finalSnapshot.value
    : manifest.phase) as Phase;
  const updated: PipelineManifest = {
    ...(finalSnapshot.context as unknown as PipelineManifest),
    phase: finalPhase,
  };

  actor.stop();

  store.save(projectRoot, manifest.slug, updated);
  return updated;
}

/**
 * Map phase output to machine events for preReconcile.
 * Mirrors the event-mapping logic from post-dispatch.ts.
 */
function mapOutputToEvents(
  phase: Phase,
  output: ReturnType<typeof loadOutput>,
  _epicSlug: string,
): EpicEvent[] {
  if (!output) return [];
  const events: EpicEvent[] = [];

  switch (phase) {
    case "design": {
      const artifacts = output.artifacts as Record<string, unknown> | undefined;
      const realSlug = artifacts?.slug as string | undefined;
      events.push({ type: "DESIGN_COMPLETED", realSlug });
      break;
    }
    case "plan": {
      const artifacts = output.artifacts as Record<string, unknown> | undefined;
      const rawFeatures = artifacts?.features;
      const features: Array<{ slug: string; plan: string }> = [];
      if (Array.isArray(rawFeatures)) {
        for (const entry of rawFeatures) {
          if (typeof entry === "object" && entry !== null && typeof (entry as Record<string, unknown>).slug === "string") {
            const rec = entry as Record<string, unknown>;
            features.push({
              slug: rec.slug as string,
              plan: typeof rec.plan === "string" ? rec.plan : "",
            });
          }
        }
      }
      events.push({ type: "PLAN_COMPLETED", features });
      break;
    }
    case "implement": {
      // preReconcile is epic-level — if all features show completed, send IMPLEMENT_COMPLETED
      // Individual feature completion is handled by per-feature reconciliation
      events.push({ type: "IMPLEMENT_COMPLETED" });
      break;
    }
    case "validate": {
      if (output.status === "completed") {
        events.push({ type: "VALIDATE_COMPLETED" });
      } else {
        events.push({ type: "VALIDATE_FAILED" });
      }
      break;
    }
    case "release": {
      if (output.status === "completed") {
        events.push({ type: "RELEASE_COMPLETED" });
      }
      break;
    }
  }

  return events;
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
