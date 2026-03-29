/**
 * State scanner — discovers epic state from pipeline manifests.
 *
 * Composes manifest-store (filesystem) + manifest (pure state machine)
 * to produce structured state for the watch loop and status command.
 *
 * Pure read-only operation — no filesystem writes or process spawns.
 */

import { readdirSync, readFileSync, existsSync } from "fs";
import { resolve, basename } from "path";
import type { Phase } from "./types";
import { isValidPhase } from "./types";
import type { PipelineManifest } from "./manifest-store";
import { validate } from "./manifest-store";
import { deriveNextAction, checkBlocked, type NextAction } from "./manifest";
import { loadConfig } from "./config";

// Re-export NextAction from its canonical location
export type { NextAction };

/** Feature-level progress within an epic */
export interface FeatureProgress {
  slug: string;
  status: "pending" | "in-progress" | "completed" | "blocked";
  githubIssue?: number;
}

/** Structured state for a single epic */
export interface EpicState {
  slug: string;
  manifestPath: string;
  phase: Phase;
  nextAction: NextAction | null;
  features: FeatureProgress[];
  blocked: boolean;
  githubEpicIssue?: number;
}

/** A manifest that failed validation or parsing */
export interface SkippedManifest {
  path: string;
  reason: string;
}

/** Result of scanning the pipeline directory */
export interface ScanResult {
  epics: EpicState[];
  skipped: SkippedManifest[];
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

/** Valid feature status values */
const VALID_FEATURE_STATUSES = ["pending", "in-progress", "completed", "blocked"] as const;

function isValidFeatureStatus(s: string): boolean {
  return (VALID_FEATURE_STATUSES as readonly string[]).includes(s);
}

/**
 * Validate manifest structural integrity.
 * Accepts both old format (with design field) and new PipelineManifest format.
 */
export function validateManifest(data: unknown): boolean {
  if (data === null || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.phase !== "string" || !isValidPhase(obj.phase)) return false;
  // Must have either design (old format) or slug (new format)
  if (typeof obj.design !== "string" && typeof obj.slug !== "string") return false;
  if (typeof obj.lastUpdated !== "string") return false;
  if (!Array.isArray(obj.features)) return false;

  for (const f of obj.features) {
    if (f === null || typeof f !== "object") return false;
    const feat = f as Record<string, unknown>;
    if (typeof feat.slug !== "string") return false;
    if (typeof feat.status !== "string") return false;
    if (!isValidFeatureStatus(feat.status)) return false;
  }
  return true;
}

/**
 * Scan all epics in the project and return their structured state.
 * Pure read-only operation — no filesystem writes or process spawns.
 * Discovery is pipeline-only: only epics with valid pipeline manifests are returned.
 */
export async function scanEpics(projectRoot: string): Promise<ScanResult> {
  const pipeDir = resolve(projectRoot, ".beastmode", "pipeline");

  if (!existsSync(pipeDir)) return { epics: [], skipped: [] };

  const manifestFiles = readdirSync(pipeDir).filter((f) => f.endsWith(".manifest.json"));
  const epics: EpicState[] = [];
  const skipped: SkippedManifest[] = [];
  const config = loadConfig(projectRoot);

  for (const file of manifestFiles) {
    const filePath = resolve(pipeDir, file);

    // Parse and validate
    let parsed: unknown;
    try {
      const raw = readFileSync(filePath, "utf-8");
      parsed = JSON.parse(raw);
    } catch {
      skipped.push({ path: filePath, reason: "Failed validation or parse error" });
      continue;
    }

    if (!validateManifest(parsed)) {
      skipped.push({ path: filePath, reason: "Failed validation or parse error" });
      continue;
    }

    const manifest = parsed as Record<string, unknown>;
    const slug = slugFromManifest(file);
    const phase = manifest.phase as Phase;

    // Build a PipelineManifest for the pure functions
    const pureManifest: PipelineManifest = {
      slug,
      phase,
      features: (manifest.features as any[] || []).map((f: any) => ({
        slug: f.slug,
        plan: f.plan || "",
        status: f.status,
        github: f.github,
      })),
      artifacts: (manifest.artifacts as Record<string, string[]>) || {},
      lastUpdated: manifest.lastUpdated as string,
      github: manifest.github as PipelineManifest["github"],
      blocked: manifest.blocked as PipelineManifest["blocked"],
    };

    // Use pure functions for derived state
    const nextAction = deriveNextAction(pureManifest);
    const blockedResult = checkBlocked(pureManifest, config.gates);

    const features: FeatureProgress[] = pureManifest.features
      .filter((f) => isValidFeatureStatus(f.status))
      .map((f) => ({
        slug: f.slug,
        status: f.status,
        githubIssue: f.github?.issue,
      }));

    epics.push({
      slug,
      manifestPath: filePath,
      phase,
      nextAction: blockedResult ? null : nextAction,
      features,
      blocked: blockedResult !== null,
      githubEpicIssue: pureManifest.github?.epic,
    });
  }

  return { epics, skipped };
}
