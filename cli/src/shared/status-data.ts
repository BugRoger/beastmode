/**
 * Shared status data functions — pure data, no rendering.
 *
 * Consumed by both the status command and the dashboard.
 */

import type { EnrichedManifest } from "../manifest-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StatusRow {
  name: string;
  phase: string;
  features: string;
  status: string;
}

export interface WatchMeta {
  /** Human-readable last-updated time */
  timestamp: string;
  /** Whether the watch loop lockfile exists and PID is alive */
  watchRunning: boolean;
}

export interface StatusSnapshot {
  slug: string;
  phase: string;
  featuresCompleted: number;
  featuresTotal: number;
}

// ---------------------------------------------------------------------------
// Phase ordering — canonical lifecycle ordering constant
// ---------------------------------------------------------------------------

export const PHASE_ORDER: Record<string, number> = {
  cancelled: -1,
  design: 0,
  plan: 1,
  implement: 2,
  validate: 3,
  release: 4,
  done: 5,
};

// ---------------------------------------------------------------------------
// Row building — sort by phase lifecycle, then alpha
// ---------------------------------------------------------------------------

/**
 * Build status rows from enriched manifests.
 * Sorts by phase lifecycle (furthest first), then alphabetically.
 * Filters out done/cancelled epics unless opts.all is true.
 *
 * NOTE: This returns rows with raw phase and status strings (no ANSI).
 * The caller is responsible for applying color formatting.
 */
export function buildStatusRows(
  epics: EnrichedManifest[],
  opts: { all?: boolean } = {},
  formatters?: {
    colorPhase?: (phase: string) => string;
    formatFeatures?: (epic: EnrichedManifest) => string;
    formatStatus?: (epic: EnrichedManifest) => string;
  },
): StatusRow[] {
  const filtered = opts.all
    ? epics
    : epics.filter(e => e.phase !== "done" && e.phase !== "cancelled");

  const colorPhaseFn = formatters?.colorPhase ?? ((p: string) => p);
  const formatFeaturesFn = formatters?.formatFeatures ?? defaultFormatFeatures;
  const formatStatusFn = formatters?.formatStatus ?? defaultFormatStatus;

  return filtered
    .sort((a, b) => {
      const aPhase = PHASE_ORDER[a.phase] ?? 99;
      const bPhase = PHASE_ORDER[b.phase] ?? 99;
      if (aPhase !== bPhase) return bPhase - aPhase; // furthest phase first
      return a.slug.localeCompare(b.slug);
    })
    .map(epic => ({
      name: epic.slug,
      phase: colorPhaseFn(epic.phase),
      features: formatFeaturesFn(epic),
      status: formatStatusFn(epic),
    }));
}

/** Default feature formatter — no ANSI. */
function defaultFormatFeatures(epic: EnrichedManifest): string {
  const total = epic.features.length;
  if (total === 0) return "-";
  const completed = epic.features.filter(f => f.status === "completed").length;
  return `${completed}/${total}`;
}

/** Default status formatter — no ANSI. */
function defaultFormatStatus(epic: EnrichedManifest): string {
  return epic.phase;
}

// ---------------------------------------------------------------------------
// Snapshot building — extract comparable fields for change detection
// ---------------------------------------------------------------------------

/** Build a snapshot from enriched manifests for change comparison. */
export function buildSnapshot(epics: EnrichedManifest[]): StatusSnapshot[] {
  return epics.map(epic => ({
    slug: epic.slug,
    phase: epic.phase,
    featuresCompleted: epic.features.filter(f => f.status === "completed").length,
    featuresTotal: epic.features.length,
  }));
}

// ---------------------------------------------------------------------------
// Change detection — compare two tick snapshots, return changed epic slugs
// ---------------------------------------------------------------------------

/** Compare two snapshots and return the set of epic slugs that changed. */
export function detectChanges(prev: StatusSnapshot[], curr: StatusSnapshot[]): Set<string> {
  const changed = new Set<string>();
  const prevMap = new Map(prev.map(s => [s.slug, s]));

  for (const c of curr) {
    const p = prevMap.get(c.slug);
    if (!p) {
      // New epic appeared
      changed.add(c.slug);
      continue;
    }
    if (
      p.phase !== c.phase ||
      p.featuresCompleted !== c.featuresCompleted ||
      p.featuresTotal !== c.featuresTotal
    ) {
      changed.add(c.slug);
    }
  }

  return changed;
}
