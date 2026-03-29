import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve, basename } from "path";
import type { Phase } from "./types";
import { isValidPhase } from "./types";
import { loadConfig } from "./config";

/** Feature-level progress within an epic */
export interface FeatureProgress {
  slug: string;
  status: "pending" | "in-progress" | "completed" | "blocked";
  githubIssue?: number;
}

/** A dispatchable action derived from epic state */
export interface NextAction {
  phase: string;
  args: string[];
  type: "single" | "fan-out";
  features?: string[];
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

/** Valid feature status values */
const VALID_FEATURE_STATUSES = ["pending", "in-progress", "completed", "blocked"] as const;

function isValidFeatureStatus(s: string): s is FeatureProgress["status"] {
  return (VALID_FEATURE_STATUSES as readonly string[]).includes(s);
}

/** Manifest JSON structure as written by /plan */
interface Manifest {
  phase: string;
  design: string;
  features: Array<{
    slug: string;
    plan?: string;
    status: string;
    github?: { issue: number };
  }>;
  github?: {
    epic: number;
    repo: string;
  };
  lastUpdated: string;
}

/**
 * Validate manifest structural integrity.
 * Required: phase (valid Phase literal), design (string), features (array of objects with slug+status strings), lastUpdated (string).
 * Feature status must be one of: pending, in-progress, completed, blocked.
 */
export function validateManifest(data: unknown): data is Manifest {
  if (data === null || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.phase !== "string" || !isValidPhase(obj.phase)) return false;
  if (typeof obj.design !== "string") return false;
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
 * Extract epic slug from a design artifact filename.
 * Input: "2026-03-28-typescript-pipeline-orchestrator.md"
 * Output: "typescript-pipeline-orchestrator"
 *
 * Kept for backward compatibility; no longer used internally.
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
 * Read and parse a manifest file. Returns undefined on any error.
 */
function readManifest(path: string): Manifest | undefined {
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    if (!validateManifest(parsed)) {
      console.warn(`[beastmode] Skipping malformed manifest: ${path}`);
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

/**
 * Derive the next action for an epic given its phase and manifest state.
 */
function deriveNextAction(
  slug: string,
  phase: Phase,
  manifest: Manifest | undefined,
): NextAction | null {
  switch (phase) {
    case "design":
      // Design exists but no manifest — needs plan
      return { phase: "plan", args: [slug], type: "single" };

    case "plan":
      // Manifest exists but no features — needs plan (re-run or first run)
      return { phase: "plan", args: [slug], type: "single" };

    case "implement": {
      if (!manifest) return null;
      const pendingFeatures = manifest.features
        .filter((f) => f.status === "pending" || f.status === "in-progress")
        .map((f) => f.slug);
      if (pendingFeatures.length === 0) return null;
      return {
        phase: "implement",
        args: [slug],
        type: "fan-out",
        features: pendingFeatures,
      };
    }

    case "validate":
      return { phase: "validate", args: [slug], type: "single" };

    case "release":
      return { phase: "release", args: [slug], type: "single" };

    default:
      return null;
  }
}

/**
 * Check if an epic is blocked on a human gate.
 * Looks for features with status "blocked" or checks config for human gates
 * on the current phase.
 */
function checkGateBlocked(
  phase: Phase,
  manifest: Manifest | undefined,
  projectRoot: string,
): { blocked: boolean } {
  if (manifest?.features.some((f) => f.status === "blocked")) {
    return { blocked: true };
  }

  const config = loadConfig(projectRoot);
  const phaseGates = config.gates[phase as keyof typeof config.gates];
  if (phaseGates) {
    for (const [_gate, mode] of Object.entries(phaseGates)) {
      if (mode === "human") {
        return { blocked: true };
      }
    }
  }

  return { blocked: false };
}

/**
 * Extract feature progress from a manifest.
 * Only includes features with valid status values.
 */
function extractFeatures(manifest: Manifest | undefined): FeatureProgress[] {
  if (!manifest?.features) return [];
  return manifest.features
    .filter((f) => isValidFeatureStatus(f.status))
    .map((f) => ({
      slug: f.slug,
      status: f.status as FeatureProgress["status"],
      githubIssue: f.github?.issue,
    }));
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

  for (const file of manifestFiles) {
    const manifestPath = resolve(pipeDir, file);
    const manifest = readManifest(manifestPath);

    if (!manifest) {
      skipped.push({ path: manifestPath, reason: "Failed validation or parse error" });
      continue;
    }

    const slug = slugFromManifest(file);
    const phase = manifest.phase as Phase;
    const nextAction = deriveNextAction(slug, phase, manifest);
    const { blocked } = checkGateBlocked(phase, manifest, projectRoot);
    const features = extractFeatures(manifest);
    const githubEpicIssue = manifest?.github?.epic;

    epics.push({
      slug,
      manifestPath,
      phase,
      nextAction,
      features,
      blocked,
      githubEpicIssue,
    });
  }

  return { epics, skipped };
}
