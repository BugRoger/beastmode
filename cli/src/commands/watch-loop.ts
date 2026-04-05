/**
 * Watch loop — the autonomous pipeline driver.
 *
 * Polls the state scanner, dispatches SDK sessions for ready epics,
 * handles implement fan-out and graceful shutdown.
 */

import type { EnrichedEpic, TaskStore } from "../store/types.js";
import type {
  DispatchedSession,
  WatchConfig,
  WatchLoopEventMap,
} from "../dispatch/types.js";
import type { SessionFactory } from "../dispatch/factory.js";
import type { Logger } from "../logger.js";
import { EventEmitter } from "node:events";
import { DispatchTracker } from "../dispatch/tracker.js";
import { acquireLock, releaseLock } from "../lockfile.js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { createLogger, createStdioSink } from "../logger.js";
import { createTag } from "../git/tags.js";
import { createImplBranch } from "../git/worktree.js";
import { reconcileGitHub } from "../github/reconcile.js";
import { loadSyncRefs, saveSyncRefs } from "../github/sync-refs.js";
import { loadConfig } from "../config.js";
import { discoverGitHub } from "../github/discovery.js";

// --- Version banner ---

function resolveVersion(projectRoot: string): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve(projectRoot, "cli", "package.json"), "utf-8"));
    const version = pkg.version ?? "unknown";
    const hash = execSync("git rev-parse --short HEAD", { cwd: projectRoot, encoding: "utf-8" }).trim();
    return `v${version} (${hash})`;
  } catch {
    return "v?.?.?";
  }
}

/** Injected dependencies — allows testing without real SDK/scanner. */
export interface WatchDeps {
  /** Scan state to determine epic states. */
  scanEpics: (projectRoot: string) => Promise<EnrichedEpic[]>;
  /** Factory for creating phase sessions. */
  sessionFactory: SessionFactory;
  /** Task store for reconciliation pass. */
  store?: TaskStore;
  /** Scoped logger. Falls back to createLogger(0, {}) if omitted. */
  logger?: Logger;
}

export class WatchLoop extends EventEmitter {
  private config: WatchConfig;
  private deps: WatchDeps;
  private tracker = new DispatchTracker();
  private running = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private logger: Logger;
  /** Session IDs currently under liveness check — used to emit session-dead before rescanEpic. */
  private livenessCheckIds = new Set<string>();
  private tickCount = 0;
  constructor(config: WatchConfig, deps: WatchDeps) {
    super();
    this.config = config;
    this.deps = deps;
    this.logger = deps.logger ?? createLogger(createStdioSink(0), {});
  }

  /** Type-safe emit helper. */
  private emitTyped<K extends keyof WatchLoopEventMap>(
    event: K,
    ...args: WatchLoopEventMap[K]
  ): boolean {
    return this.emit(event, ...args);
  }

  /**
   * Start the watch loop. Acquires lockfile, sets up signal handlers,
   * begins polling.
   */
  async start(): Promise<void> {
    if (!acquireLock(this.config.projectRoot)) {
      const msg = "Another watch process is already running. Exiting.";
      this.logger.error(msg);
      throw new Error(msg);
    }

    this.running = true;
    const version = resolveVersion(this.config.projectRoot);
    this.emitTyped('started', { version, pid: process.pid, intervalSeconds: this.config.intervalSeconds });

    if (this.config.installSignalHandlers !== false) {
      this.setupSignalHandlers();
    }

    // Initial scan
    await this.tick();

    // Start poll loop
    this.scheduleTick();
  }

  /** Stop the watch loop gracefully. */
  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    this.logger.info("Shutting down...");

    if (this.tracker.size > 0) {
      this.logger.info(
        `Waiting for ${this.tracker.size} active session(s)...`,
      );
      this.tracker.abortAll();
      await this.tracker.waitAll(30_000);
    }

    releaseLock(this.config.projectRoot);
    this.emitTyped('stopped');
  }

  /** Get the dispatch tracker (for testing/status). */
  getTracker(): DispatchTracker {
    return this.tracker;
  }

  /** Check if the loop is running. */
  isRunning(): boolean {
    return this.running;
  }

  /** Set running state (for testing without lockfile acquisition). */
  setRunning(value: boolean): void {
    this.running = value;
  }

  /** Run a single scan-and-dispatch cycle. */
  async tick(): Promise<void> {
    // Check liveness of active sessions before scanning
    if (this.deps.sessionFactory.checkLiveness && this.tracker.size > 0) {
      const activeSessions = this.tracker.getAll();
      for (const s of activeSessions) {
        this.livenessCheckIds.add(s.id);
      }
      try {
        await this.deps.sessionFactory.checkLiveness(activeSessions);
      } catch (err) {
        this.logger.warn("liveness check failed", { error: String(err) });
      }
      this.livenessCheckIds.clear();
    }

    let epics: EnrichedEpic[];
    try {
      epics = await this.deps.scanEpics(this.config.projectRoot);
    } catch (err) {
      this.logger.warn("state scan failed", { error: String(err) });
      return;
    }

    let dispatched = 0;
    for (const epic of epics) {
      dispatched += await this.processEpic(epic);
    }

    // --- Reconciliation pass ---
    this.tickCount++;
    try {
      const config = loadConfig(this.config.projectRoot);
      if (config.github.enabled && this.deps.store) {
        const resolved = await discoverGitHub(this.config.projectRoot, config.github["project-name"]);
        if (resolved) {
          const syncRefs = loadSyncRefs(this.config.projectRoot);
          const reconcileResult = await reconcileGitHub({
            projectRoot: this.config.projectRoot,
            store: this.deps.store,
            syncRefs,
            config,
            resolved,
            currentTick: this.tickCount,
            logger: this.logger,
          });

          if (reconcileResult.updatedRefs !== syncRefs) {
            saveSyncRefs(this.config.projectRoot, reconcileResult.updatedRefs);
          }

          if (reconcileResult.opsAttempted > 0) {
            this.logger.info("reconcile: processed operations", {
              attempted: String(reconcileResult.opsAttempted),
              succeeded: String(reconcileResult.opsSucceeded),
              failed: String(reconcileResult.opsFailed),
            });
          }
        }
      }
    } catch (err) {
      this.logger.warn("reconciliation pass failed", { error: String(err) });
    }

    this.emitTyped('scan-complete', { epicsScanned: epics.length, dispatched });
  }

  private async processEpic(epic: EnrichedEpic): Promise<number> {
    // Skip epics with no actionable next step
    if (!epic.nextAction) return 0;

    const { nextAction } = epic;

    if (nextAction.type === "fan-out" && nextAction.features) {
      // Implement phase: dispatch one session per pending feature
      return this.dispatchFanOut(epic, nextAction.features);
    } else {
      // Single phase dispatch
      return this.dispatchSingle(epic);
    }
  }

  private async dispatchSingle(epic: EnrichedEpic): Promise<number> {
    const action = epic.nextAction!;

    // Don't dispatch if the epic worktree is already in use by another phase
    if (this.tracker.hasPhaseSession(epic.slug, action.phase)) return 0;
    if (this.tracker.hasEpicWorktreeSession(epic.slug)) return 0;

    // Release serialization — only one epic releases at a time
    if (action.phase === "release" && this.tracker.hasAnyReleaseSession()) {
      const blockingSlug = this.tracker.getActiveReleaseSlug();
      this.emitTyped('release:held', {
        waitingSlug: epic.slug,
        blockingSlug: blockingSlug ?? "unknown",
      });
      return 0;
    }

    // Reserve the slot synchronously before the async create to prevent
    // concurrent rescans from dispatching the same phase.
    this.tracker.reserve(epic.slug, action.phase);

    const abortController = new AbortController();

    try {
      const handle = await this.deps.sessionFactory.create({
        epicSlug: epic.slug,
        phase: action.phase,
        args: action.args,
        projectRoot: this.config.projectRoot,
        signal: abortController.signal,
      });

      const session: DispatchedSession = {
        id: handle.id,
        epicSlug: epic.slug,
        phase: action.phase,
        worktreeSlug: handle.worktreeSlug,
        abortController,
        promise: handle.promise,
        startedAt: Date.now(),
        tty: handle.tty,
      };

      this.tracker.add(session);
      this.emitTyped('session-started', { epicSlug: epic.slug, phase: action.phase, sessionId: session.id });
      this.watchSession(session);
      return 1;
    } catch (err) {
      this.tracker.unreserve(epic.slug, action.phase);
      this.emitTyped('error', { epicSlug: epic.slug, message: `Failed to dispatch ${action.phase}: ${err}` });
      return 0;
    }
  }

  private async dispatchFanOut(
    epic: EnrichedEpic,
    features: string[],
  ): Promise<number> {
    // Validate feature provenance when worktree exists: each feature must
    // have a plan file with matching epic frontmatter. Skip check if worktree
    // hasn't been created yet (session factory will create it).
    const worktreePath = resolve(
      this.config.projectRoot,
      ".claude",
      "worktrees",
      epic.slug,
    );

    let featuresToDispatch = features;

    if (existsSync(worktreePath)) {
      const validFeatures = features.filter((featureSlug) => {
        const feature = epic.features.find((f) => f.slug === featureSlug);
        if (!feature?.plan) {
          this.logger.debug(`${epic.slug}: skipping feature ${featureSlug} — no plan file reference`);
          return false;
        }
        const planPath = resolve(worktreePath, ".beastmode", "artifacts", "plan", feature.plan);
        if (!existsSync(planPath)) {
          this.logger.debug(`${epic.slug}: skipping feature ${featureSlug} — plan file missing: ${feature.plan}`);
          return false;
        }
        try {
          const content = readFileSync(planPath, "utf-8");
          const match = content.match(/^epic:\s*(.+)$/m);
          if (match) {
            const fileEpic = match[1].trim().replace(/^['"]|['"]$/g, "");
            if (fileEpic !== epic.slug) {
              this.logger.debug(`${epic.slug}: skipping feature ${featureSlug} — plan epic mismatch (expected ${epic.slug}, got ${fileEpic})`);
              return false;
            }
          }
        } catch {
          this.logger.debug(`${epic.slug}: skipping feature ${featureSlug} — plan file unreadable`);
          return false;
        }
        return true;
      });

      if (validFeatures.length === 0 && features.length > 0) {
        this.emitTyped('error', { epicSlug: epic.slug, message: `BLOCKED — all ${features.length} features failed provenance check` });
        return 0;
      }

      featuresToDispatch = validFeatures;
    }

    let count = 0;

    for (const featureSlug of featuresToDispatch) {
      // Don't double-dispatch the same feature
      if (this.tracker.hasFeatureSession(epic.slug, featureSlug)) continue;

      // Reserve the slot synchronously before the async create to prevent
      // concurrent rescans from dispatching the same feature.
      this.tracker.reserve(epic.slug, "implement", featureSlug);

      const abortController = new AbortController();

      try {
        // Create impl branch before dispatch — idempotent, skips if exists.
        // Best-effort: failure here should not block session dispatch.
        try {
          await createImplBranch(epic.slug, featureSlug, {
            cwd: resolve(this.config.projectRoot, ".claude", "worktrees", epic.slug),
          });
        } catch (branchErr) {
          this.logger.warn("impl branch creation failed", { feature: featureSlug, error: String(branchErr) });
        }

        const handle = await this.deps.sessionFactory.create({
          epicSlug: epic.slug,
          phase: "implement",
          args: [epic.slug, featureSlug],
          featureSlug,
          projectRoot: this.config.projectRoot,
          signal: abortController.signal,
        });

        const session: DispatchedSession = {
          id: handle.id,
          epicSlug: epic.slug,
          phase: "implement",
          featureSlug,
          worktreeSlug: handle.worktreeSlug,
          abortController,
          promise: handle.promise,
          startedAt: Date.now(),
          tty: handle.tty,
        };

        this.tracker.add(session);
        this.emitTyped('session-started', { epicSlug: epic.slug, featureSlug, phase: 'implement', sessionId: session.id });
        this.watchSession(session);
        count++;
      } catch (err) {
        this.tracker.unreserve(epic.slug, "implement", featureSlug);
        this.emitTyped('error', { epicSlug: epic.slug, message: `Failed to dispatch implement for ${featureSlug}: ${err}` });
      }
    }

    return count;
  }

  /**
   * Watch a dispatched session — when it completes, log the run,
   * remove from tracker, and trigger an immediate re-scan of the epic.
   */
  private watchSession(session: DispatchedSession): void {
    session.promise
      .then(async (result) => {
        this.tracker.remove(session.id);

        // Emit session-dead before session-completed for liveness-killed sessions
        if (this.livenessCheckIds.has(session.id)) {
          this.emitTyped('session-dead', {
            epicSlug: session.epicSlug,
            phase: session.phase,
            featureSlug: session.featureSlug,
            sessionId: session.id,
            tty: session.tty ?? '',
          });
          this.livenessCheckIds.delete(session.id);
        }

        this.emitTyped('session-completed', {
          epicSlug: session.epicSlug,
          featureSlug: session.featureSlug,
          phase: session.phase,
          success: result.success,
          durationMs: result.durationMs,
          costUsd: result.costUsd,
        });

        // Create phase tag for regression support (mirrors post-dispatch in CLI path)
        if (result.success && session.phase !== "release") {
          try {
            const wtPath = resolve(this.config.projectRoot, ".claude", "worktrees", session.worktreeSlug);
            await createTag(session.epicSlug, session.phase, { cwd: wtPath });
          } catch (err) {
            this.logger.warn("phase tag creation failed", { error: String(err) });
          }
        }

        // Event-driven re-scan: immediately process this epic again
        if (this.running) {
          await this.rescanEpic(session.epicSlug);
        }
      })
      .catch((err) => {
        this.tracker.remove(session.id);
        if (err?.name !== "AbortError") {
          this.emitTyped('error', { epicSlug: session.epicSlug, message: `Session error: ${err}` });
        }
      });
  }

  /** Re-scan a single epic and dispatch if it has a new actionable step. */
  private async rescanEpic(epicSlug: string): Promise<void> {
    try {
      const epics = await this.deps.scanEpics(this.config.projectRoot);
      const epic = epics.find((e) => e.slug === epicSlug);
      if (epic) {
        await this.processEpic(epic);
      }
    } catch (err) {
      this.logger.warn("epic re-scan failed", { epic: epicSlug, error: String(err) });
    }
  }

  private scheduleTick(): void {
    if (!this.running) return;

    this.pollTimer = setTimeout(async () => {
      await this.tick();
      this.scheduleTick();
    }, this.config.intervalSeconds * 1000);
  }

  private setupSignalHandlers(): void {
    const handler = async () => {
      this.logger.info("Received SIGINT — initiating graceful shutdown...");
      await this.stop();
      process.exit(0);
    };

    process.on("SIGINT", handler);
    process.on("SIGTERM", handler);
  }
}

/**
 * Attach a logger subscriber that reproduces the original log output
 * from WatchLoop events. Used by `beastmode watch` for headless logging.
 */
export function attachLoggerSubscriber(loop: WatchLoop, logger: Logger): void {
  loop.on('started', ({ version, pid, intervalSeconds }) => {
    logger.info(`Started ${version} (PID ${pid}, poll every ${intervalSeconds}s)`);
  });

  loop.on('stopped', () => {
    logger.info('Stopped.');
  });

  loop.on('session-started', ({ epicSlug, featureSlug, phase }) => {
    const child = logger.child({ phase, epic: epicSlug, ...(featureSlug ? { feature: featureSlug } : {}) });
    child.info("dispatching");
  });

  loop.on('session-completed', ({ epicSlug, featureSlug, phase, success, durationMs, costUsd }) => {
    const child = logger.child({ phase, epic: epicSlug, ...(featureSlug ? { feature: featureSlug } : {}) });
    const status = success ? 'completed' : 'failed';
    const dur = `${(durationMs / 1000).toFixed(0)}s`;
    const detail = costUsd != null ? `$${costUsd.toFixed(2)}, ${dur}` : dur;
    child.info(`${status} (${detail})`);
  });

  loop.on('error', ({ epicSlug, message }) => {
    if (epicSlug) {
      logger.child({ epic: epicSlug }).error(message);
    } else {
      logger.error(message);
    }
  });

  loop.on('release:held', ({ waitingSlug, blockingSlug }) => {
    logger.child({ epic: waitingSlug }).info(`release held: ${waitingSlug} blocked by ${blockingSlug}`);
  });

  loop.on('session-dead', ({ epicSlug, phase, featureSlug, sessionId, tty }) => {
    const child = logger.child({ phase, epic: epicSlug, ...(featureSlug ? { feature: featureSlug } : {}) });
    const ttyInfo = tty ? ` (tty: ${tty})` : '';
    child.warn(`DEAD session ${sessionId}${ttyInfo} — will re-dispatch on next scan`);
  });

}
