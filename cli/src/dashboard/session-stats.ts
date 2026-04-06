import type { EventEmitter } from "node:events";
import type {
  SessionStartedEvent,
  SessionCompletedEvent,
  ScanCompleteEvent,
} from "../dispatch/types.js";

/** Snapshot of accumulated session statistics. */
export interface SessionStats {
  total: number;
  active: number;
  successes: number;
  failures: number;
  reDispatches: number;
  successRate: number;
  uptimeMs: number;
  cumulativeMs: number;
  isEmpty: boolean;
  phaseDurations: Record<"plan" | "implement" | "validate" | "release", number | null>;
}

const PIPELINE_PHASES = ["plan", "implement", "validate", "release"] as const;

/**
 * Subscribes to WatchLoop events and accumulates session metrics.
 * Pure logic — no React or rendering imports.
 */
export class SessionStatsAccumulator {
  private total = 0;
  private active = 0;
  private successes = 0;
  private failures = 0;
  private reDispatches = 0;
  private cumulativeMs = 0;
  private isEmpty = true;
  private uptimeMs = 0;
  private startedAt = Date.now();

  /** Per-phase duration arrays for computing averages. */
  private phaseDurationArrays: Record<string, number[]> = {
    plan: [],
    implement: [],
    validate: [],
    release: [],
  };

  /** Tracks completed session keys for re-dispatch detection. */
  private completedKeys = new Set<string>();

  private readonly emitter: EventEmitter;
  private readonly onStarted: (ev: SessionStartedEvent) => void;
  private readonly onCompleted: (ev: SessionCompletedEvent) => void;
  private readonly onScan: (ev: ScanCompleteEvent) => void;

  constructor(emitter: EventEmitter) {
    this.emitter = emitter;

    this.onStarted = (ev) => {
      this.active++;
      const key = `${ev.epicSlug}:${ev.featureSlug ?? ""}:${ev.phase}`;
      if (this.completedKeys.has(key)) {
        this.reDispatches++;
      }
    };

    this.onCompleted = (ev) => {
      this.active = Math.max(0, this.active - 1);
      this.total++;
      this.cumulativeMs += ev.durationMs;
      this.isEmpty = false;

      if (ev.success) {
        this.successes++;
      } else {
        this.failures++;
      }

      const key = `${ev.epicSlug}:${ev.featureSlug ?? ""}:${ev.phase}`;
      this.completedKeys.add(key);

      if (PIPELINE_PHASES.includes(ev.phase as any)) {
        this.phaseDurationArrays[ev.phase].push(ev.durationMs);
      }
    };

    this.onScan = () => {
      this.uptimeMs = Date.now() - this.startedAt;
    };

    emitter.on("session-started", this.onStarted);
    emitter.on("session-completed", this.onCompleted);
    emitter.on("scan-complete", this.onScan);
  }

  getStats(): SessionStats {
    const phaseDurations = {} as Record<"plan" | "implement" | "validate" | "release", number | null>;
    for (const phase of PIPELINE_PHASES) {
      const arr = this.phaseDurationArrays[phase];
      phaseDurations[phase] = arr.length > 0
        ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
        : null;
    }

    return {
      total: this.total,
      active: this.active,
      successes: this.successes,
      failures: this.failures,
      reDispatches: this.reDispatches,
      successRate: this.total > 0 ? Math.round((this.successes / this.total) * 100) : 0,
      uptimeMs: this.uptimeMs,
      cumulativeMs: this.cumulativeMs,
      isEmpty: this.isEmpty,
      phaseDurations,
    };
  }

  dispose(): void {
    this.emitter.off("session-started", this.onStarted);
    this.emitter.off("session-completed", this.onCompleted);
    this.emitter.off("scan-complete", this.onScan);
  }
}
