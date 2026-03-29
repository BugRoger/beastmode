/**
 * State scanner — discovers epic state from pipeline manifests.
 *
 * Composes manifest-store (filesystem) + manifest (pure state machine)
 * to produce structured state for the watch loop and status command.
 *
 * Pure read-only operation — no filesystem writes or process spawns.
 */

import { basename } from "path";
import type { PipelineManifest } from "./manifest-store";
import * as store from "./manifest-store";
import { deriveNextAction, checkBlocked, type NextAction } from "./manifest";
import { loadConfig } from "./config";

// Re-export types from their canonical locations
export type { PipelineManifest } from "./manifest-store";
export type { NextAction } from "./manifest";

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
 * Scan all epics and return enriched manifests.
 * Pure read-only — no filesystem writes.
 */
export async function scanEpics(projectRoot: string): Promise<ScanResult> {
  const manifests = store.list(projectRoot);
  const config = loadConfig(projectRoot);

  const epics: EnrichedManifest[] = manifests.map((m) => {
    const nextAction = deriveNextAction(m);
    const blocked = checkBlocked(m, config.gates);
    const path = store.manifestPath(projectRoot, m.slug);

    return {
      ...m,
      blocked: blocked,
      manifestPath: path ?? "",
      nextAction: blocked ? null : nextAction,
    };
  });

  return { epics };
}
