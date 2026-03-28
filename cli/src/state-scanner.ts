import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve, basename } from "path";
import type { Phase, RunLogEntry } from "./types";
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
  designPath: string;
  manifestPath?: string;
  phase: Phase;
  nextAction: NextAction | null;
  features: FeatureProgress[];
  blocked: boolean;
  blockedGate?: string;
  gateBlocked: boolean;
  gateName?: string;
  costUsd: number;
  githubEpicIssue?: number;
}

/** Manifest JSON structure as written by /plan */
interface Manifest {
  design: string;
  architecturalDecisions: Array<{ decision: string; choice: string }>;
  features: Array<{
    slug: string;
    plan: string;
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
 * Extract epic slug from a design artifact filename.
 * Input: "2026-03-28-typescript-pipeline-orchestrator.md"
 * Output: "typescript-pipeline-orchestrator"
 */
export function slugFromDesign(filename: string): string {
  return basename(filename, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

/**
 * Find the manifest for a given design slug.
 * Convention: .beastmode/state/plan/*-<slug>.manifest.json
 */
function findManifest(planDir: string, slug: string): string | undefined {
  if (!existsSync(planDir)) return undefined;
  const files = readdirSync(planDir);
  const matches = files
    .filter((f) => f.endsWith(`-${slug}.manifest.json`))
    .sort();
  return matches.length > 0 ? matches[matches.length - 1] : undefined;
}

/**
 * Read and parse a manifest file. Returns undefined on any error.
 */
function readManifest(path: string): Manifest | undefined {
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as Manifest;
  } catch {
    return undefined;
  }
}

/**
 * Read and parse the run log. Returns empty array on any error.
 */
function readRunLog(projectRoot: string): RunLogEntry[] {
  const logPath = resolve(projectRoot, ".beastmode-runs.json");
  if (!existsSync(logPath)) return [];
  try {
    const raw = readFileSync(logPath, "utf-8").trim();
    if (!raw) return [];
    return JSON.parse(raw) as RunLogEntry[];
  } catch {
    return [];
  }
}

/**
 * Aggregate cost for a given epic slug from the run log.
 */
function aggregateCost(entries: RunLogEntry[], epicSlug: string): number {
  return entries
    .filter((e) => e.epic === epicSlug)
    .reduce((sum, e) => sum + (e.cost_usd ?? 0), 0);
}

/**
 * Derive the current phase from manifest state.
 * - No manifest → design (just a design doc, needs plan)
 * - Manifest with no features → plan (empty manifest, needs feature decomposition)
 * - All features completed → validate
 * - Has validate artifact → release
 * - Has release artifact → completed (release)
 * - Otherwise → implement (features need work)
 */
function derivePhase(
  slug: string,
  manifest: Manifest | undefined,
  stateDir: string,
): Phase {
  if (!manifest) return "design";
  if (!manifest.features || manifest.features.length === 0) return "plan";

  const allCompleted = manifest.features.every(
    (f) => f.status === "completed",
  );

  if (allCompleted) {
    // Check for validate/release artifacts
    const validateDir = resolve(stateDir, "validate");
    const releaseDir = resolve(stateDir, "release");

    const hasValidate =
      existsSync(validateDir) &&
      readdirSync(validateDir).some((f) => f.includes(slug));
    const hasRelease =
      existsSync(releaseDir) &&
      readdirSync(releaseDir).some((f) => f.includes(slug));

    if (hasRelease) return "release";
    if (hasValidate) return "release";
    return "validate";
  }

  return "implement";
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
      // Check if this is "needs release" or "already released"
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
): { blocked: boolean; gateName?: string } {
  // Check for blocked features in manifest
  if (manifest?.features.some((f) => f.status === "blocked")) {
    return { blocked: true, gateName: "feature-blocked" };
  }

  // Check if the current phase has human gates that would block auto-dispatch
  const config = loadConfig(projectRoot);
  const phaseGates = config.gates[phase as keyof typeof config.gates];
  if (phaseGates) {
    for (const [gate, mode] of Object.entries(phaseGates)) {
      if (mode === "human") {
        return { blocked: true, gateName: `${phase}.${gate}` };
      }
    }
  }

  return { blocked: false };
}

/**
 * Extract feature progress from a manifest.
 */
function extractFeatures(manifest: Manifest | undefined): FeatureProgress[] {
  if (!manifest?.features) return [];
  return manifest.features.map((f) => ({
    slug: f.slug,
    status: f.status as FeatureProgress["status"],
    githubIssue: f.github?.issue,
  }));
}

/**
 * Scan all epics in the project and return their structured state.
 * Pure read-only operation — no filesystem writes or process spawns.
 */
export async function scanEpics(projectRoot: string): Promise<EpicState[]> {
  const stateDir = resolve(projectRoot, ".beastmode", "state");
  const designDir = resolve(stateDir, "design");
  const planDir = resolve(stateDir, "plan");

  if (!existsSync(designDir)) return [];

  const designFiles = readdirSync(designDir).filter((f) => f.endsWith(".md"));
  const runLog = readRunLog(projectRoot);
  const epics: EpicState[] = [];

  for (const designFile of designFiles) {
    const slug = slugFromDesign(designFile);
    const designPath = resolve(designDir, designFile);

    const manifestFile = findManifest(planDir, slug);
    const manifestPath = manifestFile
      ? resolve(planDir, manifestFile)
      : undefined;
    const manifest = manifestPath ? readManifest(manifestPath) : undefined;

    const phase = derivePhase(slug, manifest, stateDir);
    const nextAction = deriveNextAction(slug, phase, manifest);
    const { blocked, gateName } = checkGateBlocked(phase, manifest, projectRoot);
    const features = extractFeatures(manifest);
    const costUsd = aggregateCost(runLog, slug);
    const githubEpicIssue = manifest?.github?.epic;

    epics.push({
      slug,
      designPath,
      manifestPath,
      phase,
      nextAction,
      features,
      blocked,
      blockedGate: gateName,
      gateBlocked: blocked,
      gateName,
      costUsd,
      githubEpicIssue,
    });
  }

  return epics;
}
