/**
 * Watch loop — the autonomous pipeline driver.
 *
 * Polls the state scanner, dispatches SDK sessions for ready epics,
 * handles implement fan-out, human gate pausing, and graceful shutdown.
 */

import type { EnrichedManifest, ScanResult } from "./state-scanner.js";
import type {
  DispatchedSession,
  SessionResult,
  WatchConfig,
} from "./watch-types.js";
import type { SessionFactory } from "./session.js";
import { DispatchTracker } from "./dispatch-tracker.js";
import { acquireLock, releaseLock } from "./lockfile.js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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

    let epics: EnrichedManifest[];
    try {
      const result = await this.deps.scanEpics(this.config.projectRoot);
      epics = Array.isArray(result) ? result : result.epics;
    } catch (err) {
      console.error("[watch] State scan failed:", err);
      return;
    }

    for (const epic of epics) {
      await this.processEpic(epic);
    }
  }

  private async processEpic(epic: EnrichedManifest): Promise<void> {
    // Skip epics blocked on human gates
    if (epic.blocked) {
      console.log(
        `[watch] ${epic.slug}: paused — human gate requires manual intervention`,
      );
      console.log(
        `[watch]   Run: beastmode ${epic.phase} ${epic.slug}`,
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

  private async dispatchSingle(epic: EnrichedManifest): Promise<void> {
    const action = epic.nextAction!;

    // Don't dispatch if the epic worktree is already in use by another phase
    if (this.tracker.hasPhaseSession(epic.slug, action.phase)) return;
    if (this.tracker.hasEpicWorktreeSession(epic.slug)) return;

    const abortController = new AbortController();

    console.log(
      `[watch] ${epic.slug}: dispatching ${action.phase} ${action.args.join(" ")}`,
    );

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
      this.watchSession(session);
    } catch (err) {
      console.error(
        `[watch] ${epic.slug}: failed to dispatch ${action.phase}:`,
        err,
      );
    }
  }

  private async dispatchFanOut(
    epic: EnrichedManifest,
    features: string[],
  ): Promise<void> {
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
          console.error(`[watch] ${epic.slug}: skipping feature ${featureSlug} — no plan file reference`);
          return false;
        }
        const planPath = resolve(worktreePath, ".beastmode", "artifacts", "plan", feature.plan);
        if (!existsSync(planPath)) {
          console.error(`[watch] ${epic.slug}: skipping feature ${featureSlug} — plan file missing: ${feature.plan}`);
          return false;
        }
        try {
          const content = readFileSync(planPath, "utf-8");
          const match = content.match(/^epic:\s*(.+)$/m);
          if (match) {
            const fileEpic = match[1].trim().replace(/^['"]|['"]$/g, "");
            if (fileEpic !== epic.slug) {
              console.error(`[watch] ${epic.slug}: skipping feature ${featureSlug} — plan epic mismatch (expected ${epic.slug}, got ${fileEpic})`);
              return false;
            }
          }
        } catch {
          console.error(`[watch] ${epic.slug}: skipping feature ${featureSlug} — plan file unreadable`);
          return false;
        }
        return true;
      });

      if (validFeatures.length === 0 && features.length > 0) {
        console.error(`[watch] ${epic.slug}: BLOCKED — all ${features.length} features failed provenance check`);
        return;
      }

      featuresToDispatch = validFeatures;
    }

    for (const featureSlug of featuresToDispatch) {
      // Don't double-dispatch the same feature
      if (this.tracker.hasFeatureSession(epic.slug, featureSlug)) continue;

      const abortController = new AbortController();

      console.log(
        `[watch] ${epic.slug}: dispatching implement ${epic.slug} ${featureSlug}`,
      );

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
        const progressLabel = result.progress
          ? ` [${result.progress.completed}/${result.progress.total}]`
          : "";
        console.log(
          `[watch] ${session.epicSlug}: ${session.phase}${featureLabel} ${status}${progressLabel} ($${result.costUsd.toFixed(2)}, ${(result.durationMs / 1000).toFixed(0)}s)`,
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
      const result = await this.deps.scanEpics(this.config.projectRoot);
      const epics = Array.isArray(result) ? result : result.epics;
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
