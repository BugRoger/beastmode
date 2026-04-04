/**
 * Cucumber World for watch-loop integration tests.
 *
 * Operates at the WatchLoop level with fully mocked scanEpics and
 * SessionFactory. No git repo, no filesystem artifacts -- pure
 * in-memory manifest state driven by controllable session promises.
 */

import { World, setWorldConstructor } from "@cucumber/cucumber";
import { WatchLoop } from "../../src/commands/watch-loop.js";
import { SdkSessionFactory } from "../../src/dispatch/factory.js";
import { createNullLogger } from "../../src/logger.js";
import type { WatchDeps } from "../../src/commands/watch-loop.js";
import type { EnrichedManifest, ManifestFeature } from "../../src/manifest/store.js";
import type { SessionResult, SessionCompletedEvent, ReleaseHeldEvent } from "../../src/dispatch/types.js";
import type { SessionCreateOpts } from "../../src/dispatch/factory.js";

interface EpicDef {
  slug: string;
  features: Array<{ slug: string; wave: number }>;
}

interface SessionResolver {
  resolve: (result: SessionResult) => void;
  epicSlug: string;
  phase: string;
  featureSlug?: string;
}

export interface DispatchEntry {
  epicSlug: string;
  phase: string;
  featureSlug?: string;
}

export interface SessionDeadEvent {
  epicSlug: string;
  phase: string;
  featureSlug?: string;
  sessionId: string;
  tty: string;
}

const NEXT_PHASE: Record<string, string> = {
  plan: "implement",
  implement: "validate",
  validate: "release",
  release: "done",
};

export class WatchLoopWorld extends World {
  epicDefs = new Map<string, EpicDef>();
  manifests = new Map<string, EnrichedManifest>();
  sessionResolvers = new Map<string, SessionResolver>();
  dispatchLog: DispatchEntry[] = [];
  heldReleases: ReleaseHeldEvent[] = [];
  completedSessions: SessionCompletedEvent[] = [];
  sessionDeadEvents: SessionDeadEvent[] = [];
  loop!: WatchLoop;
  private nextId = 0;
  private testRoot = "/tmp/beastmode-watch-cucumber-noop";

  setup(): void {
    this.epicDefs.clear();
    this.manifests.clear();
    this.sessionResolvers.clear();
    this.dispatchLog = [];
    this.heldReleases = [];
    this.completedSessions = [];
    this.sessionDeadEvents = [];
    this.nextId = 0;
  }

  teardown(): void {
    if (this.loop) {
      this.loop.setRunning(false);
    }
  }

  /** Initialize the WatchLoop with mock deps. */
  initLoop(): void {
    const self = this;

    const deps: WatchDeps = {
      scanEpics: async () => Array.from(self.manifests.values()),
      sessionFactory: new SdkSessionFactory(async (opts: SessionCreateOpts) => {
        const id = `session-${self.nextId++}`;
        const featureSlug = opts.featureSlug;

        self.dispatchLog.push({
          epicSlug: opts.epicSlug,
          phase: opts.phase,
          featureSlug,
        });

        const promise = new Promise<SessionResult>((resolve) => {
          self.sessionResolvers.set(id, {
            resolve,
            epicSlug: opts.epicSlug,
            phase: opts.phase,
            featureSlug,
          });
        });

        return {
          id,
          worktreeSlug: opts.epicSlug,
          promise,
        };
      }),
      logger: createNullLogger(),
    };

    this.loop = new WatchLoop(
      { intervalSeconds: 999, projectRoot: this.testRoot, installSignalHandlers: false },
      deps,
    );
    this.loop.setRunning(true);

    // Capture events
    this.loop.on("release:held", (evt: ReleaseHeldEvent) => {
      this.heldReleases.push(evt);
    });
    this.loop.on("session-completed", (evt: SessionCompletedEvent) => {
      this.completedSessions.push(evt);
    });
    this.loop.on("session-dead" as any, (evt: SessionDeadEvent) => {
      this.sessionDeadEvents.push(evt);
    });
  }

  /** Seed both epics at a given phase with a specific nextAction phase. */
  seedEpics(currentPhase: string, nextActionPhase: string): void {
    for (const [slug, def] of this.epicDefs) {
      const manifest: EnrichedManifest = {
        slug,
        phase: currentPhase as any,
        features: [],
        artifacts: {},
        lastUpdated: new Date().toISOString(),
        manifestPath: `state/${slug}.manifest.json`,
        nextAction: {
          phase: nextActionPhase,
          args: [slug],
          type: "single",
        },
      };
      this.manifests.set(slug, manifest);
    }
  }

  /**
   * Seed a single epic at a given phase with a specific nextAction.
   * Unlike seedEpics() which seeds all epicDefs, this targets one epic.
   */
  seedEpic(epicSlug: string, currentPhase: string, nextActionPhase: string, nextActionType: "single" | "fan-out" = "single"): void {
    const def = this.epicDefs.get(epicSlug);
    const features = def
      ? def.features.map((f) => ({
          slug: f.slug,
          plan: `${f.slug}.md`,
          wave: f.wave,
          status: "pending" as const,
        }))
      : [];

    const manifest: EnrichedManifest = {
      slug: epicSlug,
      phase: currentPhase as any,
      features: nextActionType === "fan-out" ? features : [],
      artifacts: {},
      lastUpdated: new Date().toISOString(),
      manifestPath: `state/${epicSlug}.manifest.json`,
      nextAction: nextActionType === "fan-out"
        ? {
            phase: nextActionPhase,
            args: [epicSlug],
            type: "fan-out",
            features: def ? def.features.filter((f) => f.wave === 1).map((f) => f.slug) : [],
          }
        : {
            phase: nextActionPhase,
            args: [epicSlug],
            type: "single",
          },
    };
    this.manifests.set(epicSlug, manifest);
  }

  /**
   * Advance a manifest after a session completes.
   * Mirrors the real reconciler's state transitions.
   */
  advanceManifest(epicSlug: string, phase: string, featureSlug?: string): void {
    const manifest = this.manifests.get(epicSlug);
    if (!manifest) return;

    const epicDef = this.epicDefs.get(epicSlug);
    if (!epicDef) return;

    if (phase === "plan") {
      // Transition to implement, populate features, fan-out wave 1
      const features: ManifestFeature[] = epicDef.features.map((f) => ({
        slug: f.slug,
        plan: `${f.slug}.md`,
        wave: f.wave,
        status: "pending" as const,
      }));

      const wave1 = features.filter((f) => (f.wave ?? 1) === 1).map((f) => f.slug);

      this.manifests.set(epicSlug, {
        ...manifest,
        phase: "implement",
        features,
        nextAction: {
          phase: "implement",
          args: [epicSlug],
          type: "fan-out",
          features: wave1,
        },
      });
    } else if (phase === "implement" && featureSlug) {
      // Mark feature completed
      const features = manifest.features.map((f) =>
        f.slug === featureSlug ? { ...f, status: "completed" as const } : f,
      );

      // Check if all features are done
      const incomplete = features.filter(
        (f) => f.status === "pending" || f.status === "in-progress",
      );

      if (incomplete.length === 0) {
        // All features done → validate
        this.manifests.set(epicSlug, {
          ...manifest,
          phase: "validate",
          features,
          nextAction: {
            phase: "validate",
            args: [epicSlug],
            type: "single",
          },
        });
      } else {
        // Find lowest incomplete wave
        const lowestWave = Math.min(...incomplete.map((f) => f.wave ?? 1));
        const dispatchable = incomplete
          .filter((f) => (f.wave ?? 1) === lowestWave && f.status === "pending")
          .map((f) => f.slug);

        this.manifests.set(epicSlug, {
          ...manifest,
          features,
          nextAction:
            dispatchable.length > 0
              ? {
                  phase: "implement",
                  args: [epicSlug],
                  type: "fan-out",
                  features: dispatchable,
                }
              : null,
        });
      }
    } else if (phase === "validate") {
      this.manifests.set(epicSlug, {
        ...manifest,
        phase: "release",
        nextAction: {
          phase: "release",
          args: [epicSlug],
          type: "single",
        },
      });
    } else if (phase === "release") {
      this.manifests.set(epicSlug, {
        ...manifest,
        phase: "done",
        nextAction: null,
      });
    }
  }

  /**
   * Complete all active sessions, advance their manifests,
   * and wait for WatchLoop's rescan chain to settle.
   */
  async completeAllSessions(): Promise<void> {
    const entries = Array.from(this.sessionResolvers.entries());
    this.sessionResolvers.clear();

    for (const [_id, resolver] of entries) {
      this.advanceManifest(resolver.epicSlug, resolver.phase, resolver.featureSlug);
    }

    for (const [_id, resolver] of entries) {
      resolver.resolve({ success: true, exitCode: 0, durationMs: 100 });
    }

    // Wait for WatchLoop's internal watchSession → rescanEpic chain to settle
    await new Promise((r) => setTimeout(r, 150));
  }

  /**
   * Complete only the active release session(s).
   */
  async completeReleaseSession(): Promise<void> {
    const releaseEntries: Array<[string, SessionResolver]> = [];
    for (const [id, resolver] of this.sessionResolvers) {
      if (resolver.phase === "release") {
        releaseEntries.push([id, resolver]);
      }
    }

    // Clear held releases for the next assertion window
    this.heldReleases = [];

    for (const [id, resolver] of releaseEntries) {
      this.sessionResolvers.delete(id);
      this.advanceManifest(resolver.epicSlug, resolver.phase);
      resolver.resolve({ success: true, exitCode: 0, durationMs: 100 });
    }

    await new Promise((r) => setTimeout(r, 150));
  }

  /** Get active feature sessions from the dispatch tracker. */
  getActiveFeatureSessions(epicSlug: string): string[] {
    const tracker = this.loop.getTracker();
    return tracker
      .getAll()
      .filter((s) => s.epicSlug === epicSlug && s.phase === "implement" && s.featureSlug)
      .map((s) => s.featureSlug!);
  }

  /** Get active sessions by phase. */
  getActiveSessions(): Array<{ epicSlug: string; phase: string }> {
    return this.loop
      .getTracker()
      .getAll()
      .map((s) => ({ epicSlug: s.epicSlug, phase: s.phase }));
  }

  /**
   * Check if a specific epic (or feature within an epic) has an active session.
   */
  hasActiveSession(epicSlug: string, featureSlug?: string): boolean {
    const tracker = this.loop.getTracker();
    return tracker.getAll().some((s) =>
      s.epicSlug === epicSlug &&
      (featureSlug ? s.featureSlug === featureSlug : true),
    );
  }

  /**
   * Fail a specific session (feature within an epic) without advancing manifest.
   * Does NOT call advanceManifest, so the feature stays pending for re-dispatch.
   */
  failSession(epicSlug: string, featureSlug: string): void {
    for (const [id, resolver] of this.sessionResolvers) {
      if (resolver.epicSlug === epicSlug && resolver.featureSlug === featureSlug) {
        // Do NOT advance manifest — feature stays pending
        this.sessionResolvers.delete(id);
        resolver.resolve({ success: false, exitCode: 1, durationMs: 100 });
        return;
      }
    }
    throw new Error(`No session found for ${epicSlug}/${featureSlug}`);
  }

  /**
   * Kill a session to simulate terminal process death.
   * Resolves the promise as failed WITHOUT advancing manifest,
   * so the epic remains at the same phase for re-dispatch.
   */
  killSession(epicSlug: string, featureSlug?: string): void {
    for (const [id, resolver] of this.sessionResolvers) {
      const matches = featureSlug
        ? resolver.epicSlug === epicSlug && resolver.featureSlug === featureSlug
        : resolver.epicSlug === epicSlug && !resolver.featureSlug;
      if (matches) {
        this.sessionResolvers.delete(id);
        resolver.resolve({ success: false, exitCode: 1, durationMs: 100 });
        return;
      }
    }
    throw new Error(
      `No session found for ${epicSlug}${featureSlug ? `/${featureSlug}` : ""}`,
    );
  }

  /**
   * Kill all sessions for an epic (simulates all terminal processes dying).
   */
  killAllSessionsForEpic(epicSlug: string): void {
    const toKill: Array<[string, SessionResolver]> = [];
    for (const [id, resolver] of this.sessionResolvers) {
      if (resolver.epicSlug === epicSlug) {
        toKill.push([id, resolver]);
      }
    }
    for (const [id, resolver] of toKill) {
      this.sessionResolvers.delete(id);
      resolver.resolve({ success: false, exitCode: 1, durationMs: 100 });
    }
  }

  /**
   * Succeed a specific feature session and advance manifest.
   * Used for fine-grained control in failure scenarios.
   */
  async succeedSession(epicSlug: string, featureSlug: string): Promise<void> {
    for (const [id, resolver] of this.sessionResolvers) {
      if (resolver.epicSlug === epicSlug && resolver.featureSlug === featureSlug) {
        this.sessionResolvers.delete(id);
        this.advanceManifest(resolver.epicSlug, resolver.phase, resolver.featureSlug);
        resolver.resolve({ success: true, exitCode: 0, durationMs: 100 });
        await new Promise((r) => setTimeout(r, 150));
        return;
      }
    }
    throw new Error(`No session found for ${epicSlug}/${featureSlug}`);
  }

  /**
   * Complete all remaining active sessions excluding a specific feature.
   */
  async completeAllSessionsExcept(epicSlug: string, featureSlug: string): Promise<void> {
    const entries: Array<[string, SessionResolver]> = [];
    for (const [id, resolver] of this.sessionResolvers) {
      // Skip the specified feature
      if (resolver.epicSlug === epicSlug && resolver.featureSlug === featureSlug) {
        continue;
      }
      entries.push([id, resolver]);
    }

    for (const [_id, resolver] of entries) {
      this.advanceManifest(resolver.epicSlug, resolver.phase, resolver.featureSlug);
    }

    for (const [id, resolver] of entries) {
      this.sessionResolvers.delete(id);
      resolver.resolve({ success: true, exitCode: 0, durationMs: 100 });
    }

    await new Promise((r) => setTimeout(r, 150));
  }
}

setWorldConstructor(WatchLoopWorld);
