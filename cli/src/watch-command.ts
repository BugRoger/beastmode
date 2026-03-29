/**
 * Watch command handler — entry point for `beastmode watch`.
 *
 * Wires the watch loop to the real state scanner, SDK dispatcher,
 * and run logger.
 */

import { resolve } from "node:path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { loadConfig } from "./config.js";
import { WatchLoop } from "./watch.js";
import type { WatchDeps } from "./watch.js";
import type { SessionResult } from "./watch-types.js";
import { SdkSessionFactory } from "./session.js";
import * as worktree from "./worktree.js";
import { scanEpics } from "./state-scanner.js";
import * as store from "./manifest-store.js";
import { enrich, advancePhase, markFeature, shouldAdvance, regressPhase } from "./manifest.js";
import type { PipelineManifest, ManifestFeature } from "./manifest-store.js";
import type { Phase } from "./types.js";
import { loadWorktreePhaseOutput, extractFeatureStatuses, extractArtifactPaths } from "./phase-output.js";

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
function reconcileState(opts: {
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

  // 2. Load output.json from worktree artifacts dir
  const output = loadWorktreePhaseOutput(opts.worktreePath, opts.phase as Phase);

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
  if (opts.phase === "implement" && opts.featureSlug) {
    manifest = markFeature(manifest, opts.featureSlug, "completed");
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

    // Release teardown: archive, remove on success
    // Note: the release skill (checkpoint phase) owns the squash-merge to main,
    // including conflict resolution, version bumps, and changelog updates.
    // The CLI only handles archive + worktree cleanup.
    if (opts.phase === "release" && sessionResult.success) {
      try {
        console.log(`[watch] ${opts.epicSlug}: release teardown — archiving branch...`);
        const tagName = await worktree.archive(worktreeSlug, { cwd: opts.projectRoot });
        console.log(`[watch] ${opts.epicSlug}: archived as ${tagName}`);

        await worktree.remove(worktreeSlug, { cwd: opts.projectRoot });
        console.log(`[watch] ${opts.epicSlug}: worktree removed`);

        // Mark manifest as done so scanner skips it (deriveNextAction returns null for "done")
        const doneManifest = store.load(opts.projectRoot, opts.epicSlug);
        if (doneManifest) {
          store.save(opts.projectRoot, opts.epicSlug, { ...doneManifest, phase: "done", lastUpdated: new Date().toISOString() });
        }
        console.log(`[watch] ${opts.epicSlug}: manifest marked done`);
      } catch (err) {
        console.error(`[watch] ${opts.epicSlug}: release teardown failed:`, err);
        console.error(`[watch] ${opts.epicSlug}: worktree preserved for manual cleanup`);
        // Propagate teardown failure so the watch loop doesn't re-dispatch
        sessionResult = { ...sessionResult, success: false };
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
