/**
 * Change detection — compares two snapshots of epic status data
 * to identify which epic slugs changed between watch ticks.
 *
 * Pure functions, no side effects.
 */

import type { EnrichedManifest } from "./manifest-store";

/** Snapshot of the fields we compare between ticks. */
export interface EpicSnapshot {
  slug: string;
  phase: string;
  completedFeatures: number;
  totalFeatures: number;
}

/** Extract a comparable snapshot from enriched manifests. */
export function toSnapshots(epics: EnrichedManifest[]): Map<string, EpicSnapshot> {
  const map = new Map<string, EpicSnapshot>();
  for (const epic of epics) {
    const completed = epic.features.filter(f => f.status === "completed").length;
    map.set(epic.slug, {
      slug: epic.slug,
      phase: epic.phase,
      completedFeatures: completed,
      totalFeatures: epic.features.length,
    });
  }
  return map;
}

/** Compare previous and current snapshots. Return slugs that changed. */
export function detectChanges(
  prev: Map<string, EpicSnapshot>,
  curr: Map<string, EpicSnapshot>,
): Set<string> {
  const changed = new Set<string>();

  for (const [slug, snap] of curr) {
    const old = prev.get(slug);
    if (!old) {
      // New epic appeared
      changed.add(slug);
      continue;
    }
    if (
      old.phase !== snap.phase ||
      old.completedFeatures !== snap.completedFeatures ||
      old.totalFeatures !== snap.totalFeatures
    ) {
      changed.add(slug);
    }
  }

  // Epics that disappeared
  for (const slug of prev.keys()) {
    if (!curr.has(slug)) {
      changed.add(slug);
    }
  }

  return changed;
}
