/**
 * Watch command handler — entry point for `beastmode watch`.
 *
 * Wires the watch loop to the real state scanner, SDK dispatcher,
 * and run logger.
 */

import { resolve } from "node:path";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { loadConfig } from "./config.js";
import { WatchLoop } from "./watch.js";
import type { WatchDeps } from "./watch.js";
import type { EpicState, SessionResult, NextAction, FeatureProgress } from "./watch-types.js";
import type { SessionStrategy } from "./session-strategy.js";
import { createSessionStrategy } from "./session-factory.js";
import { cmuxAvailable } from "./cmux-client.js";
import * as worktree from "./worktree.js";
import { scanEpics } from "./state-scanner.js";

/** Discover the project root (walks up to find .beastmode/). */
function findProjectRoot(from: string = process.cwd()): string {
  let dir = from;
  while (dir !== "/") {
    if (existsSync(resolve(dir, ".beastmode"))) return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("Not inside a beastmode project (no .beastmode/ found)");
}

/**
 * Pipeline state directory — gitignored, orchestrator-owned.
 * Contains manifests and phase markers. Never in a worktree.
 */
function pipelineDir(projectRoot: string): string {
  const dir = resolve(projectRoot, ".beastmode/pipeline");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * State reconciliation — the orchestrator is the sole writer of pipeline state.
 *
 * All runtime state lives in .beastmode/pipeline/ (gitignored).
 * Rules:
 *   plan      → scan worktree for feature plan .md files, build manifest
 *   implement → mark the completed feature in the manifest
 *   validate  → write validate marker
 *   release   → write release marker
 */
function reconcileState(opts: {
  worktreePath: string;
  projectRoot: string;
  epicSlug: string;
  phase: string;
  featureSlug?: string;
  success: boolean;
}): { completed: number; total: number } | undefined {
  if (!opts.success) return readProgress(opts.projectRoot, opts.epicSlug);

  switch (opts.phase) {
    case "plan":
      return reconcilePlan(opts.worktreePath, opts.projectRoot, opts.epicSlug);

    case "implement":
      if (opts.featureSlug) {
        return markFeatureCompleted(opts.projectRoot, opts.epicSlug, opts.featureSlug);
      }
      return readProgress(opts.projectRoot, opts.epicSlug);

    case "validate":
    case "release":
      updatePhaseStatus(opts.projectRoot, opts.epicSlug, opts.phase);
      return readProgress(opts.projectRoot, opts.epicSlug);

    default:
      return readProgress(opts.projectRoot, opts.epicSlug);
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * After plan completes, scan the worktree for feature plan .md files and
 * build the manifest in the pipeline dir.
 */
function reconcilePlan(
  worktreePath: string,
  projectRoot: string,
  epicSlug: string,
): { completed: number; total: number } | undefined {
  const planDir = resolve(worktreePath, ".beastmode/state/plan");
  if (!existsSync(planDir)) return;

  const featurePlanPattern = new RegExp(
    `^\\d{4}-\\d{2}-\\d{2}-${escapeRegExp(epicSlug)}-(.+)\\.md$`,
  );
  const planFiles = readdirSync(planDir).filter((f) => featurePlanPattern.test(f));
  if (planFiles.length === 0) return;

  const features = planFiles.map((f) => {
    const match = f.match(featurePlanPattern)!;
    return { slug: match[1], plan: f };
  });

  const dir = pipelineDir(projectRoot);

  // Read existing manifest to preserve statuses and metadata
  const manifestFile = readdirSync(dir).find(
    (f) => f.endsWith(`-${epicSlug}.manifest.json`),
  );
  let manifest: Record<string, unknown> = {};
  if (manifestFile) {
    try {
      manifest = JSON.parse(readFileSync(resolve(dir, manifestFile), "utf-8"));
    } catch { /* start fresh */ }
  }

  // Read worktree manifest for architectural decisions and github metadata
  const wtManifestFile = readdirSync(planDir).find(
    (f) => f.endsWith(`-${epicSlug}.manifest.json`),
  );
  if (wtManifestFile) {
    try {
      const wtManifest = JSON.parse(readFileSync(resolve(planDir, wtManifestFile), "utf-8"));
      if (wtManifest.architecturalDecisions?.length > 0) {
        manifest.architecturalDecisions = wtManifest.architecturalDecisions;
      }
      if (wtManifest.github) manifest.github = wtManifest.github;
      if (wtManifest.design) manifest.design = wtManifest.design;
    } catch { /* ignore */ }
  }

  // Preserve existing feature statuses
  const existingFeatures = (manifest.features ?? []) as Array<{ slug: string; status: string; github?: unknown }>;
  const statusMap = new Map(existingFeatures.map((f) => [f.slug, f]));

  manifest.features = features.map((f) => {
    const existing = statusMap.get(f.slug);
    return {
      slug: f.slug,
      plan: f.plan,
      status: existing?.status ?? "pending",
      ...(existing?.github ? { github: existing.github } : {}),
    };
  });
  manifest.lastUpdated = new Date().toISOString();

  // Plan completing implies design is done too
  if (!manifest.phases) manifest.phases = {};
  (manifest.phases as Record<string, string>).design = "completed";
  (manifest.phases as Record<string, string>).plan = "completed";

  // Write manifest to pipeline dir
  const manifestName = manifestFile ?? `${new Date().toISOString().slice(0, 10)}-${epicSlug}.manifest.json`;
  writeFileSync(resolve(dir, manifestName), JSON.stringify(manifest, null, 2));

  // Copy plan files to git-tracked state/plan/ for agents to read
  const destPlanDir = resolve(projectRoot, ".beastmode/state/plan");
  if (!existsSync(destPlanDir)) mkdirSync(destPlanDir, { recursive: true });
  const allPlanFiles = readdirSync(planDir).filter(
    (f) => f.includes(epicSlug) && !f.endsWith(".manifest.json"),
  );
  for (const file of allPlanFiles) {
    copyFileSync(resolve(planDir, file), resolve(destPlanDir, file));
  }

  const completed = (manifest.features as Array<{ status: string }>).filter(
    (f) => f.status === "completed",
  ).length;
  return { completed, total: features.length };
}

/** Update a phase status in the manifest's `phases` object. */
function updatePhaseStatus(
  projectRoot: string,
  epicSlug: string,
  phase: string,
): void {
  const dir = pipelineDir(projectRoot);
  const match = readdirSync(dir).find(
    (f) => f.endsWith(`-${epicSlug}.manifest.json`),
  );
  if (!match) return;

  const manifestPath = resolve(dir, match);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

  if (!manifest.phases) manifest.phases = {};
  manifest.phases[phase] = "completed";
  manifest.lastUpdated = new Date().toISOString();

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

/** Mark a single feature as completed in the pipeline manifest. */
function markFeatureCompleted(
  projectRoot: string,
  epicSlug: string,
  featureSlug: string,
): { completed: number; total: number } | undefined {
  const dir = pipelineDir(projectRoot);

  const match = readdirSync(dir).find(
    (f) => f.endsWith(`-${epicSlug}.manifest.json`),
  );
  if (!match) return;

  const manifestPath = resolve(dir, match);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

  const features: { slug: string; status: string }[] = manifest.features ?? [];
  const feature = features.find((f) => f.slug === featureSlug);
  if (!feature) return;

  feature.status = "completed";
  manifest.lastUpdated = new Date().toISOString();

  const completed = features.filter((f) => f.status === "completed").length;

  // If all features done, mark implement phase completed
  if (completed === features.length) {
    if (!manifest.phases) manifest.phases = {};
    (manifest.phases as Record<string, string>).implement = "completed";
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return { completed, total: features.length };
}

/** Read feature progress from the pipeline manifest. */
function readProgress(
  projectRoot: string,
  epicSlug: string,
): { completed: number; total: number } | undefined {
  const dir = pipelineDir(projectRoot);

  const match = readdirSync(dir).find(
    (f) => f.endsWith(`-${epicSlug}.manifest.json`),
  );
  if (!match) return;

  try {
    const manifest = JSON.parse(readFileSync(resolve(dir, match), "utf-8"));
    const features: { status: string }[] = manifest.features ?? [];
    if (features.length === 0) return;
    const completed = features.filter((f) => f.status === "completed").length;
    return { completed, total: features.length };
  } catch {
    return;
  }
}

/** Dispatch a phase using the session strategy. */
async function dispatchPhase(
  strategy: SessionStrategy,
  opts: {
    epicSlug: string;
    phase: string;
    args: string[];
    featureSlug?: string;
    projectRoot: string;
    signal: AbortSignal;
  },
): Promise<{
  id: string;
  worktreeSlug: string;
  promise: Promise<SessionResult>;
}> {
  const handle = await strategy.dispatch(opts);

  // After the agent exits, reconcile state on the project root
  const syncedPromise = handle.promise.then(async (result) => {
    const worktreeSlug = handle.worktreeSlug;
    const worktreePath = resolve(
      opts.projectRoot,
      ".claude/worktrees",
      worktreeSlug,
    );
    const progress = reconcileState({
      worktreePath,
      projectRoot: opts.projectRoot,
      epicSlug: opts.epicSlug,
      phase: opts.phase,
      featureSlug: opts.featureSlug,
      success: result.success,
    });

    // Clean up strategy resources (e.g. cmux workspace/surfaces) after successful release
    if (opts.phase === "release" && result.success) {
      try {
        await strategy.cleanup(opts.epicSlug);
      } catch (err) {
        console.warn(`[watch] ${opts.epicSlug}: strategy cleanup failed (continuing):`, err);
      }
    }

    return { ...result, progress };
  });

  return {
    id: handle.id,
    worktreeSlug: handle.worktreeSlug,
    promise: syncedPromise,
  };
}

/** Append a run entry to .beastmode-runs.json. */
async function logRun(opts: {
  epicSlug: string;
  phase: string;
  featureSlug?: string;
  result: SessionResult;
  projectRoot: string;
}): Promise<void> {
  const runsPath = resolve(opts.projectRoot, ".beastmode-runs.json");

  let runs: unknown[] = [];
  if (existsSync(runsPath)) {
    try {
      runs = JSON.parse(readFileSync(runsPath, "utf-8"));
    } catch {
      runs = [];
    }
  }

  runs.push({
    epic: opts.epicSlug,
    phase: opts.phase,
    feature: opts.featureSlug ?? null,
    cost_usd: opts.result.costUsd,
    duration_ms: opts.result.durationMs,
    exit_status: opts.result.exitCode,
    timestamp: new Date().toISOString(),
  });

  // Ensure directory exists
  const dir = resolve(opts.projectRoot);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(runsPath, JSON.stringify(runs, null, 2));
}

/** Main entry point for `beastmode watch`. */
export async function watchCommand(_args: string[]): Promise<void> {
  const projectRoot = findProjectRoot();
  const config = loadConfig(projectRoot);

  // Create session strategy from config (with real cmux availability check)
  const strategy = await createSessionStrategy({
    strategy: config.cli["dispatch-strategy"] ?? "sdk",
    isCmuxAvailable: cmuxAvailable,
  });

  const deps: WatchDeps = {
    scanEpics,
    dispatchPhase: (opts) => dispatchPhase(strategy, opts),
    logRun,
  };

  const loop = new WatchLoop(
    {
      intervalSeconds: config.cli.interval ?? 60,
      projectRoot,
    },
    deps,
  );

  await loop.start();
}
