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
import type { SessionResult } from "./watch-types.js";
import { SdkSessionFactory } from "./session.js";
import * as worktree from "./worktree.js";
import { scanEpics } from "./state-scanner.js";
import * as store from "./manifest-store.js";
import { enrich, advancePhase, markFeature } from "./manifest.js";
import type { PipelineManifest, ManifestFeature } from "./manifest-store.js";
import type { Phase } from "./types.js";

/** Discover the project root (walks up to find .beastmode/). */
function findProjectRoot(from: string = process.cwd()): string {
  let dir = from;
  while (dir !== "/") {
    if (existsSync(resolve(dir, ".beastmode"))) return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("Not inside a beastmode project (no .beastmode/ found)");
}

/** Phase advancement map — which phase follows which. */
const NEXT_PHASE: Partial<Record<Phase, Phase>> = {
  design: "plan",
  plan: "implement",
  implement: "validate",
  validate: "release",
};

/**
 * State reconciliation — the orchestrator is the sole writer of pipeline state.
 *
 * All runtime state lives in .beastmode/state/ (gitignored).
 * Rules:
 *   plan      → scan worktree for feature plan .md files, enrich manifest
 *   implement → mark the completed feature in the manifest
 *   validate  → advance phase
 *   release   → advance phase
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

/**
 * After plan completes, scan the worktree for feature plan .md files and
 * enrich the manifest via the store + manifest modules.
 */
function reconcilePlan(
  worktreePath: string,
  projectRoot: string,
  epicSlug: string,
): { completed: number; total: number } | undefined {
  const planDir = resolve(worktreePath, ".beastmode/artifacts/plan");
  if (!existsSync(planDir)) return;

  // Scan worktree for feature plan files
  const featurePlanPattern = new RegExp(
    `^\\d{4}-\\d{2}-\\d{2}-${epicSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(.+)\\.md$`,
  );
  const planFiles = readdirSync(planDir).filter((f) => featurePlanPattern.test(f));
  if (planFiles.length === 0) return;

  const scannedFeatures: ManifestFeature[] = planFiles.map((f) => {
    const match = f.match(featurePlanPattern)!;
    return { slug: match[1], plan: f, status: "pending" as const };
  });

  // Load or create manifest via store
  let manifest: PipelineManifest =
    store.load(projectRoot, epicSlug) ??
    store.create(projectRoot, epicSlug);

  // Read worktree manifest for github metadata
  const wtManifestFile = readdirSync(planDir).find(
    (f) => f.endsWith(`-${epicSlug}.manifest.json`),
  );
  if (wtManifestFile) {
    try {
      const wtManifest = JSON.parse(readFileSync(resolve(planDir, wtManifestFile), "utf-8"));
      if (wtManifest.github && !manifest.github) {
        manifest = { ...manifest, github: wtManifest.github };
      }
    } catch { /* ignore */ }
  }

  // Enrich manifest with scanned features
  manifest = enrich(manifest, {
    phase: "plan",
    features: scannedFeatures,
  });

  // Plan completing means we advance to implement
  manifest = advancePhase(manifest, "implement");

  // Persist
  store.save(projectRoot, epicSlug, manifest);

  // Copy plan files to git-tracked artifacts/plan/ for agents to read
  const destPlanDir = resolve(projectRoot, ".beastmode/artifacts/plan");
  if (!existsSync(destPlanDir)) mkdirSync(destPlanDir, { recursive: true });
  const allPlanFiles = readdirSync(planDir).filter(
    (f) => f.includes(epicSlug) && !f.endsWith(".manifest.json"),
  );
  for (const file of allPlanFiles) {
    copyFileSync(resolve(planDir, file), resolve(destPlanDir, file));
  }

  const completed = manifest.features.filter(
    (f) => f.status === "completed",
  ).length;
  return { completed, total: manifest.features.length };
}

/** Advance the manifest phase after a phase completes successfully. */
function updatePhaseStatus(
  projectRoot: string,
  epicSlug: string,
  phase: string,
): void {
  let manifest = store.load(projectRoot, epicSlug);
  if (!manifest) return;

  const next = NEXT_PHASE[phase as Phase];
  if (next) {
    manifest = advancePhase(manifest, next);
  }

  store.save(projectRoot, epicSlug, manifest);
}

/** Mark a single feature as completed in the pipeline manifest. */
function markFeatureCompleted(
  projectRoot: string,
  epicSlug: string,
  featureSlug: string,
): { completed: number; total: number } | undefined {
  let manifest = store.load(projectRoot, epicSlug);
  if (!manifest) return;

  manifest = markFeature(manifest, featureSlug, "completed");

  const completed = manifest.features.filter(
    (f) => f.status === "completed",
  ).length;
  const total = manifest.features.length;

  // If all features done, advance to validate
  if (total > 0 && completed === total) {
    manifest = advancePhase(manifest, "validate");
  }

  store.save(projectRoot, epicSlug, manifest);

  return { completed, total };
}

/** Read feature progress from the pipeline manifest. */
function readProgress(
  projectRoot: string,
  epicSlug: string,
): { completed: number; total: number } | undefined {
  const manifest = store.load(projectRoot, epicSlug);
  if (!manifest || manifest.features.length === 0) return;

  const completed = manifest.features.filter(
    (f) => f.status === "completed",
  ).length;
  return { completed, total: manifest.features.length };
}

/** Dispatch a phase using the Claude Agent SDK. */
async function dispatchPhase(opts: {
  epicSlug: string;
  phase: string;
  args: string[];
  featureSlug?: string;
  projectRoot: string;
  signal: AbortSignal;
}): Promise<{
  id: string;
  worktreeSlug: string;
  promise: Promise<SessionResult>;
}> {
  const worktreeSlug = opts.featureSlug
    ? `${opts.epicSlug}-${opts.featureSlug}`
    : opts.epicSlug;

  // Create worktree
  const wt = await worktree.create(worktreeSlug, { cwd: opts.projectRoot });

  const id = `${worktreeSlug}-${Date.now()}`;
  const startTime = Date.now();

  const promise = (async (): Promise<SessionResult> => {
    let sessionResult: SessionResult;

    try {
      // Try to use the Claude Agent SDK
      const sdk = await import("@anthropic-ai/claude-agent-sdk");
      const AgentClass = (sdk as Record<string, unknown>).ClaudeAgent ?? (sdk as Record<string, unknown>).default;
      if (typeof AgentClass !== "function") throw new Error("SDK not available");
      const prompt = `/beastmode:${opts.phase} ${opts.args.join(" ")}`;

      const agent = new (AgentClass as new (opts: Record<string, unknown>) => { query: () => Promise<{ exitCode: number; costUsd?: number }> })({
        cwd: wt.path,
        prompt,
        settingSources: ["project"],
        permissionMode: "bypassPermissions",
        abortSignal: opts.signal,
      });

      const result = await agent.query();

      sessionResult = {
        success: result.exitCode === 0,
        exitCode: result.exitCode,
        costUsd: result.costUsd ?? 0,
        durationMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      // SDK not available — fall back to Bun.spawn of claude CLI
      const args = [
        "claude",
        "--print",
        `/beastmode:${opts.phase} ${opts.args.join(" ")}`,
        "--output-format",
        "json",
        "--dangerously-skip-permissions",
      ];

      const proc = Bun.spawn(args, {
        cwd: wt.path,
        stdout: "pipe",
        stderr: "pipe",
        signal: opts.signal,
      });

      const [stdout] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);

      const exitCode = await proc.exited;

      // Try to parse cost from JSON output
      let costUsd = 0;
      try {
        const output = JSON.parse(stdout);
        costUsd = output.cost_usd ?? 0;
      } catch {
        // Non-JSON output — no cost info
      }

      sessionResult = {
        success: exitCode === 0,
        exitCode,
        costUsd,
        durationMs: Date.now() - startTime,
      };
    }

    // Release teardown: archive, merge, remove on success
    if (opts.phase === "release" && sessionResult.success) {
      try {
        console.log(`[watch] ${opts.epicSlug}: release teardown — archiving branch...`);
        const tagName = await worktree.archive(worktreeSlug, { cwd: opts.projectRoot });
        console.log(`[watch] ${opts.epicSlug}: archived as ${tagName}`);

        await worktree.merge(worktreeSlug, { cwd: opts.projectRoot });
        console.log(`[watch] ${opts.epicSlug}: squash-merged to main`);

        await worktree.remove(worktreeSlug, { cwd: opts.projectRoot });
        console.log(`[watch] ${opts.epicSlug}: worktree removed`);
      } catch (err) {
        console.error(`[watch] ${opts.epicSlug}: release teardown failed:`, err);
        console.error(`[watch] ${opts.epicSlug}: worktree preserved for manual cleanup`);
        // Don't fail the session — the release phase itself succeeded
      }
    }

    return sessionResult;
  })();

  // After the agent exits, reconcile state on the project root
  const syncedPromise = promise.then((result) => {
    const progress = reconcileState({
      worktreePath: wt.path,
      projectRoot: opts.projectRoot,
      epicSlug: opts.epicSlug,
      phase: opts.phase,
      featureSlug: opts.featureSlug,
      success: result.success,
    });
    return { ...result, progress };
  });

  return { id, worktreeSlug, promise: syncedPromise };
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

  const deps: WatchDeps = {
    scanEpics,
    sessionFactory: new SdkSessionFactory(dispatchPhase),
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
