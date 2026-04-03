/**
 * Watch command handler — entry point for `beastmode watch`.
 *
 * Wires the watch loop to the reconcile module, SDK dispatcher,
 * and run logger.
 */

import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import type { Logger } from "./logger.js";
import { WatchLoop, attachLoggerSubscriber } from "./watch.js";
import type { WatchDeps } from "./watch.js";
import type { SessionResult } from "./dispatch/types.js";
import type { SessionFactory, SessionCreateOpts, SessionHandle } from "./dispatch/factory.js";
import { SdkSessionFactory, SessionEmitter } from "./dispatch/factory.js";
import { CmuxSessionFactory, CmuxClient, cmuxAvailable } from "./dispatch/cmux.js";
import { ITermSessionFactory } from "./dispatch/it2.js";
import { It2Client } from "./dispatch/it2.js";
import { iterm2Available, IT2_SETUP_INSTRUCTIONS } from "./iterm2-detect.js";
import * as worktree from "./git/worktree.js";
import { listEnriched } from "./manifest/store.js";
import type { Phase } from "./types.js";
import { run as runPipeline } from "./pipeline/runner.js";
import { discoverGitHub } from "./github/discovery.js";
import type { ResolvedGitHub } from "./github/discovery.js";

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
 * Reconciling factory — wraps any SessionFactory with the unified pipeline
 * runner for post-dispatch processing. Both SDK and cmux paths get identical
 * behavior (reconciliation, GitHub sync, release teardown) without
 * duplicating the logic that lives in pipeline/runner.ts.
 */
export class ReconcilingFactory implements SessionFactory {
  private inner: SessionFactory;
  private projectRoot: string;
  private logger: Logger;
  /** Pre-discovered GitHub metadata — set once per scan cycle. */
  resolved?: ResolvedGitHub;

  constructor(inner: SessionFactory, projectRoot: string, logger: Logger) {
    this.inner = inner;
    this.projectRoot = projectRoot;
    this.logger = logger;
  }

  async create(opts: SessionCreateOpts): Promise<SessionHandle> {
    const handle = await this.inner.create(opts);
    const { projectRoot, logger } = this;

    const wrappedPromise = handle.promise.then(async (sessionResult) => {
      const config = loadConfig(projectRoot);
      const scopedLogger = logger.child({
        phase: opts.phase,
        epic: opts.epicSlug,
        ...(opts.featureSlug ? { feature: opts.featureSlug } : {}),
      });

      // Delegate all post-dispatch work (steps 5-9) to the pipeline runner.
      // skipPreDispatch: true  -> skip worktree/rebase/settings (already done)
      // dispatch returns the pre-computed session result immediately.
      const pipelineResult = await runPipeline({
        phase: opts.phase as Phase,
        epicSlug: opts.epicSlug,
        args: opts.args,
        projectRoot,
        strategy: "sdk",
        featureSlug: opts.featureSlug,
        config,
        logger: scopedLogger,
        resolved: this.resolved,
        skipPreDispatch: true,
        dispatch: async () => ({ success: sessionResult.success }),
      });

      // Release cleanup: close cmux/iterm2 surfaces on success, badge on failure
      if (opts.phase === "release") {
        if (pipelineResult.success) {
          try {
            await this.inner.cleanup?.(opts.epicSlug);
          } catch {
            // Best-effort — surface cleanup should not block the result
          }
        } else {
          try {
            await this.inner.setBadgeOnContainer?.(opts.epicSlug, "ERROR: release failed");
          } catch {
            // Best-effort — badge failure is non-blocking
          }
        }
      }

      return {
        ...sessionResult,
        progress: pipelineResult.reconcileResult?.progress,
      };
    });

    return { ...handle, promise: wrappedPromise };
  }

  async cleanup(epicSlug: string): Promise<void> {
    return this.inner.cleanup?.(epicSlug);
  }
}

/** Dispatch a phase using the Claude Agent SDK. */
export async function dispatchPhase(opts: {
  epicSlug: string;
  phase: string;
  args: string[];
  featureSlug?: string;
  projectRoot: string;
  signal: AbortSignal;
}): Promise<SessionHandle> {
  // Always use the epic-level worktree — no per-feature worktrees
  const worktreeSlug = opts.epicSlug;

  // Create worktree
  const wt = await worktree.create(worktreeSlug, { cwd: opts.projectRoot });

  const id = `${worktreeSlug}-${Date.now()}`;
  const startTime = Date.now();

  const events = new SessionEmitter();

  const promise = (async (): Promise<SessionResult> => {
    let sessionResult: SessionResult;

    try {
      // Try to use the Claude Agent SDK
      const sdk = await import("@anthropic-ai/claude-agent-sdk");
      const AgentClass = (sdk as Record<string, unknown>).ClaudeAgent ?? (sdk as Record<string, unknown>).default;
      if (typeof AgentClass !== "function") throw new Error("SDK not available");
      const prompt = `/beastmode:${opts.phase} ${opts.args.join(" ")}`;

      const agent = new (AgentClass as new (opts: Record<string, unknown>) => { query: (opts?: Record<string, unknown>) => unknown })({
        cwd: wt.path,
        prompt,
        settingSources: ["project"],
        permissionMode: "bypassPermissions",
        abortSignal: opts.signal,
      });

      // Try streaming path: query() with options that return an async generator
      const queryResult = agent.query({ includePartialMessages: true });

      // Check if the result is an async iterable (streaming)
      if (queryResult && typeof queryResult === "object" && Symbol.asyncIterator in (queryResult as object)) {
        let exitCode = 1;
        let costUsd = 0;

        for await (const message of queryResult as AsyncIterable<Record<string, unknown>>) {
          const now = Date.now();
          const type = message.type as string | undefined;

          if (type === "assistant" && Array.isArray(message.content)) {
            for (const block of message.content as Array<Record<string, unknown>>) {
              if (block.type === "text" && typeof block.text === "string") {
                events.pushEntry({ timestamp: now, type: "text", text: block.text });
              } else if (block.type === "tool_use" && typeof block.name === "string") {
                const input = block.input as Record<string, unknown> | undefined;
                const detail = input?.file_path ?? input?.command ?? input?.pattern ?? "";
                events.pushEntry({ timestamp: now, type: "tool-start", text: `[${block.name}] ${detail}` });
              } else if (block.type === "tool_result" && typeof block.content === "string") {
                const preview = (block.content as string).slice(0, 80);
                events.pushEntry({ timestamp: now, type: "tool-result", text: `> ${preview}` });
              }
            }
          } else if (type === "result") {
            exitCode = (message.exitCode as number) ?? 0;
            costUsd = (message.costUsd as number) ?? 0;
            events.pushEntry({ timestamp: now, type: "result", text: `Exit ${exitCode}` });
          } else {
            // Heartbeat or unknown message type
            events.pushEntry({ timestamp: now, type: "heartbeat", text: type ?? "..." });
          }
        }

        sessionResult = {
          success: exitCode === 0,
          exitCode,
          costUsd,
          durationMs: Date.now() - startTime,
        };
      } else {
        // Non-streaming fallback: query() returned a promise
        const result = await (queryResult as Promise<{ exitCode: number; costUsd?: number }>);
        events.pushEntry({ timestamp: Date.now(), type: "result", text: `Exit ${result.exitCode}` });

        sessionResult = {
          success: result.exitCode === 0,
          exitCode: result.exitCode,
          costUsd: result.costUsd ?? 0,
          durationMs: Date.now() - startTime,
        };
      }
    } catch (err: unknown) {
      // SDK not available — fall back to Bun.spawn of claude CLI
      events.pushEntry({ timestamp: Date.now(), type: "heartbeat", text: "Falling back to CLI dispatch" });

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

      events.pushEntry({ timestamp: Date.now(), type: "result", text: `Exit ${exitCode}` });

      sessionResult = {
        success: exitCode === 0,
        exitCode,
        costUsd,
        durationMs: Date.now() - startTime,
      };
    }

    events.complete(sessionResult.success);
    return sessionResult;
  })();

  return { id, worktreeSlug, promise, events };
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
  logger: Logger = createLogger(0, {}),
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
  const logger = createLogger(verbosity, {});

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

  // Pre-discover GitHub metadata once so all epics share the same resolved
  // data. Failure is non-blocking — sync will gracefully skip if undefined.
  if (config.github.enabled) {
    try {
      const resolved = await discoverGitHub(projectRoot, config.github["project-name"], logger);
      sessionFactory.resolved = resolved;
      if (resolved) {
        logger.log(`GitHub discovery: ${resolved.repo} (project #${resolved.projectNumber ?? "none"})`);
      }
    } catch (err) {
      logger.warn(`GitHub discovery failed (non-blocking): ${err}`);
    }
  }

  const deps: WatchDeps = {
    scanEpics: async (root: string) => listEnriched(root),
    sessionFactory,
    logger,
  };

  const loop = new WatchLoop(
    {
      intervalSeconds: config.cli.interval ?? 60,
      projectRoot,
    },
    deps,
  );

  attachLoggerSubscriber(loop, logger);

  await loop.start();
}
