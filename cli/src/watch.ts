/**
 * Watch loop — the autonomous pipeline driver.
 *
 * Polls the state scanner, dispatches SDK sessions for ready epics,
 * handles implement fan-out, human gate pausing, and graceful shutdown.
 */

import type {
  EpicState,
  DispatchedSession,
  SessionResult,
  WatchConfig,
} from "./watch-types.js";
import { DispatchTracker } from "./dispatch-tracker.js";
import { acquireLock, releaseLock } from "./lockfile.js";

/** Injected dependencies — allows testing without real SDK/scanner. */
export interface WatchDeps {
  /** Scan state to determine epic states. */
  scanEpics: (projectRoot: string) => Promise<EpicState[]>;
  /** Dispatch a phase for an epic. Returns a session handle. */
  dispatchPhase: (opts: {
    epicSlug: string;
    phase: string;
    args: string[];
    featureSlug?: string;
    projectRoot: string;
    signal: AbortSignal;
  }) => Promise<{
    id: string;
    worktreeSlug: string;
    promise: Promise<SessionResult>;
  }>;
  /** Log a run entry to .beastmode-runs.json. */
  logRun: (opts: {
    epicSlug: string;
    phase: string;
    featureSlug?: string;
    result: SessionResult;
    projectRoot: string;
  }) => Promise<void>;
}

export class WatchLoop {
  private config: WatchConfig;
  private deps: WatchDeps;
  private tracker = new DispatchTracker();
  private running = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: WatchConfig, deps: WatchDeps) {
    this.config = config;
    this.deps = deps;
  }

  /**
   * Start the watch loop. Acquires lockfile, sets up signal handlers,
   * begins polling.
   */
  async start(): Promise<void> {
    if (!acquireLock(this.config.projectRoot)) {
      const msg = "[watch] Another watch process is already running. Exiting.";
      console.error(msg);
      throw new Error(msg);
    }

    this.running = true;
    console.log(
      `[watch] Started (PID ${process.pid}, poll every ${this.config.intervalSeconds}s)`,
    );

    this.setupSignalHandlers();

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

    console.log("[watch] Shutting down...");

    if (this.tracker.size > 0) {
      console.log(
        `[watch] Waiting for ${this.tracker.size} active session(s)...`,
      );
      this.tracker.abortAll();
      await this.tracker.waitAll(30_000);
    }

    releaseLock(this.config.projectRoot);
    console.log("[watch] Stopped.");
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

    let epics: EpicState[];
    try {
      epics = await this.deps.scanEpics(this.config.projectRoot);
    } catch (err) {
      console.error("[watch] State scan failed:", err);
      return;
    }

    for (const epic of epics) {
      await this.processEpic(epic);
    }
  }

  private async processEpic(epic: EpicState): Promise<void> {
    // Skip epics blocked on human gates
    if (epic.gateBlocked) {
      console.log(
        `[watch] ${epic.slug}: paused — human gate "${epic.gateName}" requires manual intervention`,
      );
      console.log(
        `[watch]   Run: beastmode run <phase> ${epic.slug}`,
      );
      return;
    }

    // Skip epics with no actionable next step
    if (!epic.nextAction) return;

    const { nextAction } = epic;

    if (nextAction.type === "fan-out" && nextAction.features) {
      // Implement phase: dispatch one session per pending feature
      await this.dispatchFanOut(epic, nextAction.features);
    } else {
      // Single phase dispatch
      await this.dispatchSingle(epic);
    }
  }

  private async dispatchSingle(epic: EpicState): Promise<void> {
    const action = epic.nextAction!;

    // Don't double-dispatch the same phase for the same epic
    if (this.tracker.hasPhaseSession(epic.slug, action.phase)) return;

    const abortController = new AbortController();

    console.log(
      `[watch] ${epic.slug}: dispatching ${action.phase} ${action.args.join(" ")}`,
    );

    try {
      const handle = await this.deps.dispatchPhase({
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
      this.watchSession(session);
    } catch (err) {
      console.error(
        `[watch] ${epic.slug}: failed to dispatch ${action.phase}:`,
        err,
      );
    }
  }

  private async dispatchFanOut(
    epic: EpicState,
    features: string[],
  ): Promise<void> {
    for (const featureSlug of features) {
      // Don't double-dispatch the same feature
      if (this.tracker.hasFeatureSession(epic.slug, featureSlug)) continue;

      const abortController = new AbortController();

      console.log(
        `[watch] ${epic.slug}: dispatching implement ${epic.slug} ${featureSlug}`,
      );

      try {
        const handle = await this.deps.dispatchPhase({
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
        this.watchSession(session);
      } catch (err) {
        console.error(
          `[watch] ${epic.slug}: failed to dispatch implement for ${featureSlug}:`,
          err,
        );
      }
    }
  }

  /**
   * Watch a dispatched session — when it completes, log the run,
   * remove from tracker, and trigger an immediate re-scan of the epic.
   */
  private watchSession(session: DispatchedSession): void {
    session.promise
      .then(async (result) => {
        this.tracker.remove(session.id);

        const featureLabel = session.featureSlug
          ? ` (${session.featureSlug})`
          : "";
        const status = result.success ? "completed" : "failed";
        console.log(
          `[watch] ${session.epicSlug}: ${session.phase}${featureLabel} ${status} ($${result.costUsd.toFixed(2)}, ${(result.durationMs / 1000).toFixed(0)}s)`,
        );

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
          console.error("[watch] Failed to log run:", err);
        }

        // Event-driven re-scan: immediately process this epic again
        if (this.running) {
          await this.rescanEpic(session.epicSlug);
        }
      })
      .catch((err) => {
        this.tracker.remove(session.id);
        if (err?.name !== "AbortError") {
          console.error(
            `[watch] ${session.epicSlug}: session error:`,
            err,
          );
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
      console.error(`[watch] Re-scan of ${epicSlug} failed:`, err);
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
      console.log("\n[watch] Received SIGINT — initiating graceful shutdown...");
      await this.stop();
      process.exit(0);
    };

    process.on("SIGINT", handler);
    process.on("SIGTERM", handler);
  }
}
