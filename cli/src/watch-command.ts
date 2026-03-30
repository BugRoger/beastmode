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
import type { SessionFactory, SessionCreateOpts, SessionHandle } from "./session.js";
import { SdkSessionFactory } from "./session.js";
import { CmuxSessionFactory } from "./cmux-session.js";
import { CmuxClient, cmuxAvailable } from "./cmux-client.js";
import { ITermSessionFactory } from "./it2-session.js";
import { It2Client } from "./it2-client.js";
import { iterm2Available, IT2_SETUP_INSTRUCTIONS } from "./iterm2-detect.js";
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
    const handle = await this.inner.create(opts);
    const { projectRoot } = this;

    const worktreePath = resolve(
      projectRoot,
      ".claude",
      "worktrees",
      handle.worktreeSlug,
    );

    const wrappedPromise = handle.promise.then(async (result) => {
      let sessionResult = result;

      // Release teardown: archive, remove on success
      if (opts.phase === "release" && sessionResult.success) {
        try {
          console.log(`[watch] ${opts.epicSlug}: release teardown — archiving branch...`);
          const tagName = await worktree.archive(handle.worktreeSlug, { cwd: projectRoot });
          console.log(`[watch] ${opts.epicSlug}: archived as ${tagName}`);

          await worktree.remove(handle.worktreeSlug, { cwd: projectRoot });
          console.log(`[watch] ${opts.epicSlug}: worktree removed`);

          // Mark manifest as done so scanner skips it
          const doneManifest = store.load(projectRoot, opts.epicSlug);
          if (doneManifest) {
            store.save(projectRoot, opts.epicSlug, { ...doneManifest, phase: "done", lastUpdated: new Date().toISOString() });
          }
          console.log(`[watch] ${opts.epicSlug}: manifest marked done`);
        } catch (err) {
          console.error(`[watch] ${opts.epicSlug}: release teardown failed:`, err);
          console.error(`[watch] ${opts.epicSlug}: worktree preserved for manual cleanup`);
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

/** Result of strategy selection — which strategy was chosen and why. */
export interface StrategySelection {
  strategy: "iterm2" | "cmux" | "sdk";
  sessionId?: string;
}

/**
 * Select the dispatch strategy based on config, checking availability
 * of iTerm2 and cmux in priority order.
 *
 * Exported for testability — watchCommand wires the result to a factory.
 */
export async function selectStrategy(
  configured: string,
  deps: {
    checkIterm2: typeof iterm2Available;
    checkCmux: typeof cmuxAvailable;
  } = { checkIterm2: iterm2Available, checkCmux: cmuxAvailable },
): Promise<StrategySelection> {
  if (configured === "iterm2") {
    const result = await deps.checkIterm2();
    if (!result.available) {
      console.error(`[watch] iTerm2 dispatch strategy requested but not available: ${result.reason}`);
      console.error(IT2_SETUP_INSTRUCTIONS);
      throw new Error("iTerm2 dispatch strategy unavailable");
    }
    console.log(`[watch] Using iTerm2 dispatch strategy (session: ${result.sessionId})`);
    return { strategy: "iterm2", sessionId: result.sessionId };
  }

  if (configured === "auto") {
    const iterm2Result = await deps.checkIterm2();
    if (iterm2Result.available) {
      console.log(`[watch] Auto-detected iTerm2 (session: ${iterm2Result.sessionId})`);
      return { strategy: "iterm2", sessionId: iterm2Result.sessionId };
    }
    const cmuxOk = await deps.checkCmux();
    if (cmuxOk) {
      console.log("[watch] Using cmux dispatch strategy");
      return { strategy: "cmux" };
    }
    console.log("[watch] Using SDK dispatch strategy");
    return { strategy: "sdk" };
  }

  if (configured === "cmux") {
    const available = await deps.checkCmux();
    if (available) {
      console.log("[watch] Using cmux dispatch strategy");
      return { strategy: "cmux" };
    }
    console.error("[watch] cmux not available but dispatch-strategy is 'cmux'. Falling back to SDK.");
    return { strategy: "sdk" };
  }

  return { strategy: "sdk" };
}

/** Main entry point for `beastmode watch`. */
export async function watchCommand(_args: string[]): Promise<void> {
  const projectRoot = findProjectRoot();
  const config = loadConfig(projectRoot);

  const selected = await selectStrategy(config.cli["dispatch-strategy"] ?? "sdk");
  let innerFactory: SessionFactory;

  if (selected.strategy === "cmux") {
    innerFactory = new CmuxSessionFactory(new CmuxClient());
  } else if (selected.strategy === "iterm2") {
    innerFactory = new ITermSessionFactory(new It2Client());
  } else {
    innerFactory = new SdkSessionFactory(dispatchPhase);
  }

  const sessionFactory = new ReconcilingFactory(innerFactory, projectRoot);

  const deps: WatchDeps = {
    scanEpics,
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
