/**
 * Stats persistence — reads/writes cumulative session stats to a JSON file.
 *
 * Pure functions, no React or EventEmitter dependency.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { SessionStats } from "./session-stats.js";

export const CURRENT_SCHEMA_VERSION = 1;

const TRACKED_PHASES = ["plan", "implement", "validate", "release"] as const;
type TrackedPhase = (typeof TRACKED_PHASES)[number];

/** Incremental average entry for a single phase. */
export interface PhaseAverage {
  avgMs: number;
  count: number;
}

/** On-disk schema for persisted stats. */
export interface PersistedStats {
  schemaVersion: number;
  total: number;
  successes: number;
  failures: number;
  reDispatches: number;
  cumulativeMs: number;
  phaseDurations: Record<string, PhaseAverage>;
  completedKeys: string[];
}

/** Minimal event shape needed for merge — subset of SessionCompletedEvent. */
export interface MergeEvent {
  epicSlug: string;
  phase: string;
  success: boolean;
  durationMs: number;
  featureSlug?: string;
}

/** Create a fresh empty stats object. */
export function emptyPersistedStats(): PersistedStats {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    total: 0,
    successes: 0,
    failures: 0,
    reDispatches: 0,
    cumulativeMs: 0,
    phaseDurations: {},
    completedKeys: [],
  };
}

/**
 * Merge a session-completed event into persisted stats.
 * Returns a new stats object (does not mutate the input).
 */
export function mergeSessionCompleted(stats: PersistedStats, event: MergeEvent): PersistedStats {
  const next: PersistedStats = {
    ...stats,
    total: stats.total + 1,
    successes: stats.successes + (event.success ? 1 : 0),
    failures: stats.failures + (event.success ? 0 : 1),
    cumulativeMs: stats.cumulativeMs + event.durationMs,
    phaseDurations: { ...stats.phaseDurations },
    completedKeys: [...stats.completedKeys],
    reDispatches: stats.reDispatches,
  };

  // Incremental phase average: (oldAvg * oldCount + newVal) / (oldCount + 1)
  const existing = stats.phaseDurations[event.phase];
  if (existing) {
    const newCount = existing.count + 1;
    const newAvg = (existing.avgMs * existing.count + event.durationMs) / newCount;
    next.phaseDurations[event.phase] = { avgMs: newAvg, count: newCount };
  } else {
    next.phaseDurations[event.phase] = { avgMs: event.durationMs, count: 1 };
  }

  // Re-dispatch detection
  const key = `${event.epicSlug}:${event.phase}:${event.featureSlug ?? ""}`;
  if (next.completedKeys.includes(key)) {
    next.reDispatches++;
  } else {
    next.completedKeys.push(key);
  }

  return next;
}

/**
 * Load stats from a JSON file. Returns empty stats on any error
 * (missing file, corrupt JSON, schema mismatch).
 */
export function loadStats(filePath: string): PersistedStats {
  try {
    if (!existsSync(filePath)) {
      return emptyPersistedStats();
    }
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);

    // Validate shape
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.schemaVersion !== "number" ||
      typeof parsed.total !== "number"
    ) {
      return emptyPersistedStats();
    }

    // Schema version guard
    if (parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
      return emptyPersistedStats();
    }

    return parsed as PersistedStats;
  } catch {
    return emptyPersistedStats();
  }
}

/**
 * Save stats to a JSON file. Creates parent directories if needed.
 */
export function saveStats(filePath: string, stats: PersistedStats): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(stats, null, 2), "utf-8");
}

/**
 * Convert persisted all-time stats into the SessionStats shape for rendering.
 * Sets active=0, uptimeMs=0 (not applicable for historical data).
 */
export function toSessionStats(p: PersistedStats): SessionStats {
  const phaseDurations = {} as Record<TrackedPhase, number | null>;
  for (const phase of TRACKED_PHASES) {
    const entry = p.phaseDurations[phase];
    phaseDurations[phase] = entry ? entry.avgMs : null;
  }

  return {
    total: p.total,
    active: 0,
    successes: p.successes,
    failures: p.failures,
    reDispatches: p.reDispatches,
    successRate: p.total > 0 ? Math.round((p.successes / p.total) * 100) : 0,
    uptimeMs: 0,
    cumulativeMs: p.cumulativeMs,
    isEmpty: p.total === 0,
    phaseDurations,
  };
}
