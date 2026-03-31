/**
 * Watch command handler — entry point for `beastmode watch`.
 *
 * Wires the watch loop to the real state scanner, SDK dispatcher,
 * and run logger.
 */

import { resolve } from "node:path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import type { Logger } from "./logger.js";
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
import type { PipelineManifest } from "./manifest-store.js";
import type { Phase } from "./types.js";
import { loadWorktreePhaseOutput, loadWorktreeFeatureOutput } from "./phase-output.js";
import { epicMachine } from "./pipeline-machine/index.js";
import { createActor } from "xstate";
import type { EpicContext, EpicEvent } from "./pipeline-machine/index.js";

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
  const manifest: PipelineManifest | undefined = store.load(opts.projectRoot, opts.epicSlug);
  if (!manifest) return undefined;

  // 2. Load output.json — feature-specific when fan-out, epic-level otherwise
  const output = opts.featureSlug
    ? loadWorktreeFeatureOutput(opts.worktreePath, opts.phase as Phase, opts.epicSlug, opts.featureSlug)
    : loadWorktreePhaseOutput(opts.worktreePath, opts.phase as Phase);

  // 3. Hydrate ephemeral actor at the manifest's current phase
  const epicContext = manifest as unknown as EpicContext;
  const resolvedSnapshot = epicMachine.resolveState({
    value: manifest.phase,
    context: epicContext,
  });
  const actor = createActor(epicMachine, { snapshot: resolvedSnapshot, input: epicContext });
  actor.start();

  // 4. Map output to machine events and send them
  const events = mapOutputToEvents(opts.phase as Phase, output, opts.featureSlug);
  for (const event of events) {
    actor.send(event);
  }

  // 5. Extract resulting state and persist
  const finalSnapshot = actor.getSnapshot();
  const finalPhase = (typeof finalSnapshot.value === "string"
    ? finalSnapshot.value
    : manifest.phase) as Phase;
  store.save(opts.projectRoot, opts.epicSlug, {
    ...(finalSnapshot.context as unknown as PipelineManifest),
    phase: finalPhase,
  } as PipelineManifest);

  actor.stop();

  return readProgress(opts.projectRoot, opts.epicSlug);
}

/**
 * Map phase output to machine events for reconcileState.
 * Mirrors the event-mapping logic from post-dispatch.ts.
 */
function mapOutputToEvents(
  phase: Phase,
  output: ReturnType<typeof loadWorktreePhaseOutput>,
  featureSlug?: string,
): EpicEvent[] {
  const events: EpicEvent[] = [];

  switch (phase) {
    case "design": {
      const artifacts = output?.artifacts as unknown as Record<string, unknown> | undefined;
      const realSlug = artifacts?.slug as string | undefined;
      events.push({ type: "DESIGN_COMPLETED", realSlug });
      break;
    }
    case "plan": {
      const artifacts = output?.artifacts as unknown as Record<string, unknown> | undefined;
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
      if (featureSlug && output?.status === "completed") {
        events.push({ type: "FEATURE_COMPLETED", featureSlug });
      }
      // Always attempt IMPLEMENT_COMPLETED — guard checks allFeaturesCompleted
      events.push({ type: "IMPLEMENT_COMPLETED" });
      break;
    }
    case "validate": {
      if (output?.status === "completed") {
        events.push({ type: "VALIDATE_COMPLETED" });
      } else {
        events.push({ type: "VALIDATE_FAILED" });
      }
      break;
    }
    case "release": {
      if (output?.status === "completed") {
        events.push({ type: "RELEASE_COMPLETED" });
      }
      break;
    }
  }

  return events;
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
  private logger: Logger;

  constructor(inner: SessionFactory, projectRoot: string, logger: Logger) {
    this.inner = inner;
    this.projectRoot = projectRoot;
    this.logger = logger;
  }

  async create(opts: SessionCreateOpts): Promise<SessionHandle> {
    const handle = await this.inner.create(opts);
    const { projectRoot, logger } = this;

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
          logger.log(`${opts.epicSlug}: release teardown — archiving branch...`);
          const tagName = await worktree.archive(handle.worktreeSlug, { cwd: projectRoot });
          logger.log(`${opts.epicSlug}: archived as ${tagName}`);

          await worktree.remove(handle.worktreeSlug, { cwd: projectRoot });
          logger.log(`${opts.epicSlug}: worktree removed`);

          // Mark manifest as done so scanner skips it
          const doneManifest = store.load(projectRoot, opts.epicSlug);
          if (doneManifest) {
            store.save(projectRoot, opts.epicSlug, { ...doneManifest, phase: "done", lastUpdated: new Date().toISOString() });
          }
          logger.log(`${opts.epicSlug}: manifest marked done`);
        } catch (err) {
          logger.error(`${opts.epicSlug}: release teardown failed: ${err}`);
          logger.error(`${opts.epicSlug}: worktree preserved for manual cleanup`);
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
  logger: Logger = createLogger(0, "watch"),
): Promise<StrategySelection> {
  if (configured === "iterm2") {
    const result = await deps.checkIterm2();
    if (!result.available) {
      logger.error(`iTerm2 dispatch strategy requested but not available: ${result.reason}`);
      logger.error(IT2_SETUP_INSTRUCTIONS);
      throw new Error("iTerm2 dispatch strategy unavailable");
    }
    logger.log(`Using iTerm2 dispatch strategy (session: ${result.sessionId})`);
    return { strategy: "iterm2", sessionId: result.sessionId };
  }

  if (configured === "auto") {
    const iterm2Result = await deps.checkIterm2();
    if (iterm2Result.available) {
      logger.log(`Auto-detected iTerm2 (session: ${iterm2Result.sessionId})`);
      return { strategy: "iterm2", sessionId: iterm2Result.sessionId };
    }
    const cmuxOk = await deps.checkCmux();
    if (cmuxOk) {
      logger.log("Using cmux dispatch strategy");
      return { strategy: "cmux" };
    }
    logger.log("Using SDK dispatch strategy");
    return { strategy: "sdk" };
  }

  if (configured === "cmux") {
    const available = await deps.checkCmux();
    if (available) {
      logger.log("Using cmux dispatch strategy");
      return { strategy: "cmux" };
    }
    logger.warn("cmux not available but dispatch-strategy is 'cmux'. Falling back to SDK.");
    return { strategy: "sdk" };
  }

  return { strategy: "sdk" };
}

/** Main entry point for `beastmode watch`. */
export async function watchCommand(_args: string[], verbosity: number = 0): Promise<void> {
  const projectRoot = findProjectRoot();
  const config = loadConfig(projectRoot);
  const logger = createLogger(verbosity, "watch");

  const selected = await selectStrategy(config.cli["dispatch-strategy"] ?? "sdk", undefined, logger);
  let innerFactory: SessionFactory;

  if (selected.strategy === "cmux") {
    innerFactory = new CmuxSessionFactory(new CmuxClient());
  } else if (selected.strategy === "iterm2") {
    innerFactory = new ITermSessionFactory(new It2Client());
  } else {
    innerFactory = new SdkSessionFactory(dispatchPhase);
  }

  const sessionFactory = new ReconcilingFactory(innerFactory, projectRoot, logger);

  const deps: WatchDeps = {
    scanEpics,
    sessionFactory,
    logRun,
    logger,
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
