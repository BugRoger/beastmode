/**
 * Watch loop — the autonomous pipeline driver.
 *
 * Polls the state scanner, dispatches SDK sessions for ready epics,
 * handles implement fan-out, human gate pausing, and graceful shutdown.
 */

import type { EnrichedManifest, ScanResult } from "./manifest-store.js";
import type {
  DispatchedSession,
  SessionResult,
  WatchConfig,
  WatchLoopEventMap,
} from "./watch-types.js";
import type { SessionFactory } from "./session.js";
import type { Logger } from "./logger.js";
import { EventEmitter } from "node:events";
import { DispatchTracker } from "./dispatch-tracker.js";
import { acquireLock, releaseLock } from "./lockfile.js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { createLogger } from "./logger.js";
import { createTag } from "./phase-tags.js";

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
  scanEpics: (projectRoot: string) => Promise<ScanResult | EnrichedManifest[]>;
  /** Factory for creating phase sessions. */
  sessionFactory: SessionFactory;
  /** Log a run entry to .beastmode-runs.json. */
  logRun: (opts: {
    epicSlug: string;
    phase: string;
    featureSlug?: string;
    result: SessionResult;
    projectRoot: string;
  }) => Promise<void>;
  /** Scoped logger. Falls back to createLogger(0, "watch") if omitted. */
  logger?: Logger;
}

export class WatchLoop extends EventEmitter {
  private config: WatchConfig;
  private deps: WatchDeps;
  private tracker = new DispatchTracker();
  private running = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private logger: Logger;
  constructor(config: WatchConfig, deps: WatchDeps) {
    super();
    this.config = config;
    this.deps = deps;
    this.logger = deps.logger ?? createLogger(0, "watch");
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

    this.logger.log("Shutting down...");

    if (this.tracker.size > 0) {
      this.logger.log(
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

    let epics: EnrichedManifest[];
    try {
      const result = await this.deps.scanEpics(this.config.projectRoot);
      epics = Array.isArray(result) ? result : result.epics;
    } catch (err) {
      this.logger.error(`State scan failed: ${err}`);
      return;
    }

    let dispatched = 0;
    for (const epic of epics) {
      dispatched += await this.processEpic(epic);
    }
    this.emitTyped('scan-complete', { epicsScanned: epics.length, dispatched });
  }

  private async processEpic(epic: EnrichedManifest): Promise<number> {
    // Skip epics blocked on human gates
    if (epic.blocked) {
      this.emitTyped('epic-blocked', { epicSlug: epic.slug, gate: epic.blocked.gate, reason: epic.blocked.reason });
      return 0;
    }

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

  private async dispatchSingle(epic: EnrichedManifest): Promise<number> {
    const action = epic.nextAction!;

    // Don't dispatch if the epic worktree is already in use by another phase
    if (this.tracker.hasPhaseSession(epic.slug, action.phase)) return 0;
    if (this.tracker.hasEpicWorktreeSession(epic.slug)) return 0;

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
    epic: EnrichedManifest,
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

        this.emitTyped('session-completed', {
          epicSlug: session.epicSlug,
          featureSlug: session.featureSlug,
          phase: session.phase,
          success: result.success,
          durationMs: result.durationMs,
          costUsd: result.costUsd,
        });

        // Log the run
        try {
          await this.deps.logRun({
            epicSlug: session.epicSlug,
            phase: session.phase,
            featureSlug: session.featureSlug,
            result,
            projectRoot: this.config.projectRoot,
          });
        } catch (err) {
          this.logger.warn(`Failed to log run: ${err}`);
        }

        // Create phase tag for regression support (mirrors post-dispatch in CLI path)
        if (result.success) {
          try {
            const wtPath = resolve(this.config.projectRoot, ".claude", "worktrees", session.worktreeSlug);
            await createTag(session.epicSlug, session.phase, { cwd: wtPath });
          } catch (err) {
            this.logger.warn(`Failed to create phase tag: ${err}`);
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
      const result = await this.deps.scanEpics(this.config.projectRoot);
      const epics = Array.isArray(result) ? result : result.epics;
      const epic = epics.find((e) => e.slug === epicSlug);
      if (epic) {
        await this.processEpic(epic);
      }
    } catch (err) {
      this.logger.warn(`Re-scan of ${epicSlug} failed: ${err}`);
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
      this.logger.log("Received SIGINT — initiating graceful shutdown...");
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
    logger.log(`Started ${version} (PID ${pid}, poll every ${intervalSeconds}s)`);
  });

  loop.on('stopped', () => {
    logger.log('Stopped.');
  });

  loop.on('session-started', ({ epicSlug, featureSlug, phase }) => {
    if (featureSlug) {
      logger.log(`${epicSlug}: dispatching implement ${epicSlug} ${featureSlug}`);
    } else {
      logger.log(`${epicSlug}: dispatching ${phase}`);
    }
  });

  loop.on('session-completed', ({ epicSlug, featureSlug, phase, success, durationMs, costUsd }) => {
    const featureLabel = featureSlug ? ` (${featureSlug})` : '';
    const status = success ? 'completed' : 'failed';
    logger.log(
      `${epicSlug}: ${phase}${featureLabel} ${status} ($${costUsd.toFixed(2)}, ${(durationMs / 1000).toFixed(0)}s)`,
    );
  });

  loop.on('error', ({ epicSlug, message }) => {
    const prefix = epicSlug ? `${epicSlug}: ` : '';
    logger.error(`${prefix}${message}`);
  });

  loop.on('epic-blocked', ({ epicSlug, gate }) => {
    logger.log(`${epicSlug}: paused — human gate requires manual intervention`);
    logger.detail(`  Run: beastmode ${gate} ${epicSlug}`);
  });
}
