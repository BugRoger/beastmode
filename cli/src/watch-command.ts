/**
 * Watch command handler — entry point for `beastmode watch`.
 *
 * Wires the watch loop to the real state scanner, SDK dispatcher,
 * and run logger.
 */

import { resolve } from "node:path";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { loadConfig, type BeastmodeConfig } from "./config.js";
import { WatchLoop, watchLog, watchErr } from "./watch.js";
import type { WatchDeps } from "./watch.js";
import type { SessionResult } from "./watch-types.js";
import type { SessionFactory, SessionCreateOpts, SessionHandle } from "./session.js";
import { SdkSessionFactory } from "./session.js";
import { CmuxSessionFactory } from "./cmux-session.js";
import { CmuxClient, cmuxAvailable } from "./cmux-client.js";
import * as worktree from "./worktree.js";
import { scanEpics } from "./state-scanner.js";
import * as store from "./manifest-store.js";
import { enrich, advancePhase, markFeature, shouldAdvance, regressPhase, setGitHubEpic, setFeatureGitHubIssue } from "./manifest.js";
import type { PipelineManifest, ManifestFeature } from "./manifest-store.js";
import { syncGitHub } from "./github-sync.js";
import { discoverGitHub, type ResolvedGitHub } from "./github-discovery.js";
import type { Phase } from "./types.js";
import { loadWorktreePhaseOutput, loadWorktreeFeatureOutput, extractFeatureStatuses, extractArtifactPaths, filenameMatchesEpic } from "./phase-output.js";

/**
 * Remove stale output.json files from a worktree's artifacts directory
 * that don't belong to the current epic. Prevents the stop hook or
 * reconciliation from picking up outputs from prior epics.
 */
function cleanStaleOutputs(worktreePath: string, phase: string, epicSlug: string): void {
  const dir = resolve(worktreePath, ".beastmode", "artifacts", phase);
  if (!existsSync(dir)) return;

  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".output.json")) continue;
    if (filenameMatchesEpic(f, epicSlug)) continue;
    try {
      unlinkSync(resolve(dir, f));
      watchLog(`[watch] Cleaned stale output: ${phase}/${f}`);
    } catch {
      // Best-effort cleanup
    }
  }
}

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
 * State reconciliation — reads the stop hook's output.json from the worktree
 * and uses it to enrich/advance the manifest. Same logic as post-dispatch,
 * reading from the correct location (.beastmode/artifacts/<phase>/).
 */
/** @internal Exported for testing. */
export function reconcileState(opts: {
  worktreePath: string;
  projectRoot: string;
  epicSlug: string;
  phase: string;
  featureSlug?: string;
  success: boolean;
}): { completed: number; total: number } | undefined {
  if (!opts.success) return readProgress(opts.projectRoot, opts.epicSlug);

  // 1. Load manifest — if it's gone (e.g. release teardown removed it), bail
  let manifest: PipelineManifest | undefined = store.load(opts.projectRoot, opts.epicSlug);
  if (!manifest) return undefined;

  // 2. Load output.json from worktree artifacts dir.
  // For implement fan-out (featureSlug present), load the feature-specific output
  // instead of the epic-level one — prevents one feature's output from marking
  // other features completed via enrich.
  const output = opts.featureSlug
    ? loadWorktreeFeatureOutput(opts.worktreePath, opts.phase as Phase, opts.epicSlug, opts.featureSlug)
    : loadWorktreePhaseOutput(opts.worktreePath, opts.phase as Phase, opts.epicSlug);

  // 3. Enrich from output.json (features, artifact paths)
  if (output) {
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

    manifest = enrich(manifest, {
      phase: opts.phase as Phase,
      features,
      artifacts: artifactPaths.length > 0 ? artifactPaths : undefined,
    });
  }

  // 4. Handle implement fan-out: mark specific feature completed
  // Only mark completed if the feature produced its own output.json with status "completed" —
  // a session that exits 0 without writing an artifact did not actually implement anything.
  if (opts.phase === "implement" && opts.featureSlug) {
    const featureOutput = loadWorktreeFeatureOutput(opts.worktreePath, opts.phase as Phase, opts.epicSlug, opts.featureSlug);
    if (featureOutput?.status === "completed") {
      manifest = markFeature(manifest, opts.featureSlug, "completed");
    }
  }

  // 5. Handle validate regression
  if (opts.phase === "validate" && output?.status !== "completed") {
    manifest = regressPhase(manifest, "implement" as Phase);
  }

  // 6. Determine phase advancement
  const nextPhase = shouldAdvance(manifest, output);
  if (nextPhase) {
    manifest = advancePhase(manifest, nextPhase);
  }

  // 7. Persist
  store.save(opts.projectRoot, opts.epicSlug, manifest);

  return readProgress(opts.projectRoot, opts.epicSlug);
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

/**
 * Reconciling factory — wraps any SessionFactory with state reconciliation
 * and release teardown. Both SDK and cmux paths get identical post-dispatch
 * behavior without duplicating the logic.
 */
class ReconcilingFactory implements SessionFactory {
  private inner: SessionFactory;
  private projectRoot: string;

  constructor(inner: SessionFactory, projectRoot: string) {
    this.inner = inner;
    this.projectRoot = projectRoot;
  }

  async create(opts: SessionCreateOpts): Promise<SessionHandle> {
    const { projectRoot } = this;

    // Worktree path is deterministic from epic slug — compute before dispatch
    const worktreePath = resolve(
      projectRoot,
      ".claude",
      "worktrees",
      opts.epicSlug,
    );

    // Clean stale output.json from prior epics before dispatching
    cleanStaleOutputs(worktreePath, opts.phase, opts.epicSlug);

    const handle = await this.inner.create(opts);

    const wrappedPromise = handle.promise.then(async (result) => {
      let sessionResult = result;

      // Release teardown: archive, remove on success
      if (opts.phase === "release" && sessionResult.success) {
        try {
          watchLog(`[watch] ${opts.epicSlug}: release teardown — archiving branch...`);
          const tagName = await worktree.archive(handle.worktreeSlug, { cwd: projectRoot });
          watchLog(`[watch] ${opts.epicSlug}: archived as ${tagName}`);

          await worktree.remove(handle.worktreeSlug, { cwd: projectRoot });
          watchLog(`[watch] ${opts.epicSlug}: worktree removed`);

          // Mark manifest as done so scanner skips it
          const doneManifest = store.load(projectRoot, opts.epicSlug);
          if (doneManifest) {
            store.save(projectRoot, opts.epicSlug, { ...doneManifest, phase: "done", lastUpdated: new Date().toISOString() });
          }
          watchLog(`[watch] ${opts.epicSlug}: manifest marked done`);
        } catch (err) {
          watchErr(`[watch] ${opts.epicSlug}: release teardown failed:`, err);
          watchErr(`[watch] ${opts.epicSlug}: worktree preserved for manual cleanup`);
          sessionResult = { ...sessionResult, success: false };
        }
      }

      // State reconciliation
      const progress = reconcileState({
        worktreePath,
        projectRoot,
        epicSlug: opts.epicSlug,
        phase: opts.phase,
        featureSlug: opts.featureSlug,
        success: sessionResult.success,
      });

      return { ...sessionResult, progress };
    });

    return { ...handle, promise: wrappedPromise };
  }

  async cleanup(epicSlug: string): Promise<void> {
    return this.inner.cleanup?.(epicSlug);
  }
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
  // Always use the epic-level worktree — no per-feature worktrees
  const worktreeSlug = opts.epicSlug;

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

    return sessionResult;
  })();

  return { id, worktreeSlug, promise };
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

/**
 * Reconcile a single epic's manifest state to GitHub.
 * Called per-epic during each tick — keeps GitHub in sync without blocking startup.
 */
async function reconcileEpic(
  manifest: PipelineManifest,
  projectRoot: string,
  config: BeastmodeConfig,
  resolved: ResolvedGitHub,
): Promise<void> {
  if (!manifest.github) return;

  try {
    watchLog(`[watch] ${manifest.slug}: reconciling GitHub (phase: ${manifest.phase})`);
    const result = await syncGitHub(manifest, config, resolved);

    // Re-read the manifest FRESH from disk before applying mutations.
    // syncGitHub takes a long time (many API calls). During that window,
    // reconcileState may have updated feature statuses on disk.
    // Applying mutations to the stale scan-time manifest would clobber those updates.
    if (result.mutations.length > 0) {
      let current = store.load(projectRoot, manifest.slug);
      if (!current) return; // manifest removed during sync — bail

      for (const mutation of result.mutations) {
        if (mutation.type === "setEpic") {
          current = setGitHubEpic(current, mutation.epicNumber, mutation.repo);
        } else if (mutation.type === "setFeatureIssue") {
          current = setFeatureGitHubIssue(current, mutation.featureSlug, mutation.issueNumber);
        }
      }

      store.save(projectRoot, current.slug, current);
    }

    const actions: string[] = [];
    if (result.featuresReopened > 0) actions.push(`${result.featuresReopened} reopened`);
    if (result.featuresClosed > 0) actions.push(`${result.featuresClosed} closed`);
    if (result.labelsUpdated > 0) actions.push(`${result.labelsUpdated} labels`);
    if (result.featuresCreated > 0) actions.push(`${result.featuresCreated} created`);
    if (result.projectUpdated) actions.push("board updated");

    if (actions.length > 0) {
      watchLog(`[watch] ${manifest.slug}: GitHub reconciled (${actions.join(", ")})`);
    } else {
      watchLog(`[watch] ${manifest.slug}: GitHub in sync`);
    }

    for (const warning of result.warnings) {
      watchLog(`[watch] ${manifest.slug}: sync warning: ${warning}`);
    }
  } catch (err) {
    watchErr(`[watch] ${manifest.slug}: GitHub reconcile failed:`, err);
  }
}

/** Main entry point for `beastmode watch`. */
export async function watchCommand(_args: string[]): Promise<void> {
  const projectRoot = findProjectRoot();
  const config = loadConfig(projectRoot);

  // Select dispatch strategy based on config
  const strategy = config.cli["dispatch-strategy"] ?? "sdk";
  let innerFactory: SessionFactory;

  if (strategy === "cmux" || strategy === "auto") {
    const available = await cmuxAvailable();
    if (available) {
      watchLog("[watch] Using cmux dispatch strategy");
      innerFactory = new CmuxSessionFactory(new CmuxClient());
    } else if (strategy === "cmux") {
      watchErr("[watch] cmux not available but dispatch-strategy is 'cmux'. Falling back to SDK.");
      innerFactory = new SdkSessionFactory(dispatchPhase);
    } else {
      innerFactory = new SdkSessionFactory(dispatchPhase);
    }
  } else {
    innerFactory = new SdkSessionFactory(dispatchPhase);
  }

  // Discover GitHub metadata once (cached internally)
  let resolvedGitHub: ResolvedGitHub | undefined;
  if (config.github.enabled) {
    resolvedGitHub = await discoverGitHub(projectRoot, config.github["project-name"]) ?? undefined;
    if (!resolvedGitHub) {
      watchLog("[watch] GitHub discovery failed — sync disabled for this session");
    }
  }

  const sessionFactory = new ReconcilingFactory(innerFactory, projectRoot);

  const deps: WatchDeps = {
    scanEpics: async (root: string) => {
      const result = await scanEpics(root);
      const epics = Array.isArray(result) ? result : result.epics;

      // Reconcile each epic to GitHub during scan
      if (resolvedGitHub) {
        for (const epic of epics) {
          const manifest = store.load(root, epic.slug);
          if (manifest) {
            await reconcileEpic(manifest, root, config, resolvedGitHub);
          }
        }
      }

      return result;
    },
    sessionFactory,
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
