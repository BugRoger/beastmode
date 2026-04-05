import { useState, useEffect } from "react";
import type { DispatchedSession } from "../../dispatch/types.js";
import type { LogEntry } from "../../dispatch/factory.js";
import type { EnrichedEpic } from "../../store/types.js";
import type { TreeState, EpicNode, FeatureNode, TreeEntry, SystemEntry } from "../tree-types.js";
import type { LogLevel } from "../../logger.js";
import type { FallbackEntryStore } from "../lifecycle-entries.js";

export interface UseDashboardTreeStateOptions {
  /** Active dispatched sessions from the tracker. */
  sessions: DispatchedSession[];
  /** Selected epic slug — undefined means aggregate mode. */
  selectedEpicSlug?: string;
  /** Fallback entries from non-SDK dispatch strategies. */
  fallbackEntries?: FallbackEntryStore;
  /** System-level log entries (watch lifecycle events). */
  systemEntries?: SystemEntry[];
  /** Enriched epics from the store for skeleton seeding. */
  enrichedEpics?: EnrichedEpic[];
}

export interface UseDashboardTreeStateResult {
  /** Tree state ready for TreeView rendering. */
  state: TreeState;
}

/** Map a LogEntry.type to a LogLevel for the tree view. */
function entryTypeToLevel(entry: LogEntry): LogLevel {
  switch (entry.type) {
    case "text":
      return "info";
    case "tool-start":
      return "debug";
    case "tool-result":
      return "debug";
    case "heartbeat":
      return "debug";
    case "result":
      return entry.text.toLowerCase().includes("error") ? "error" : "info";
    default:
      return "info";
  }
}

/** Map a LogEntry to a TreeEntry with phase. */
function toTreeEntry(entry: LogEntry, phase: string): TreeEntry {
  return {
    timestamp: entry.timestamp,
    level: entryTypeToLevel(entry),
    message: entry.text,
    seq: entry.seq,
    phase,
  };
}

/**
 * Build a TreeState from enriched epics (skeleton) + sessions (log entries).
 * Pure function — no React dependency, testable standalone.
 *
 * 1. Seed skeleton from EnrichedEpic[] — every epic and feature gets a node.
 * 2. Attach session log entries to existing nodes by slug matching.
 * 3. System entries go to the CLI root node.
 */
export function buildTreeState(
  sessions: Array<{ epicSlug: string; phase: string; featureSlug?: string }>,
  getEntries: (session: { epicSlug: string; phase: string; featureSlug?: string }) => LogEntry[],
  fallbackEntries?: FallbackEntryStore,
  systemEntries?: SystemEntry[],
  enrichedEpics?: EnrichedEpic[],
): TreeState {
  // Seed skeleton from enriched epics
  const epicMap = new Map<string, EpicNode>();

  if (enrichedEpics) {
    for (const ee of enrichedEpics) {
      const featureNodes: FeatureNode[] = ee.features.map((f) => ({
        slug: f.slug,
        status: f.status,
        entries: [],
      }));
      epicMap.set(ee.slug, {
        slug: ee.slug,
        status: ee.status,
        features: featureNodes,
        entries: [],
      });
    }
  }

  // Attach session entries to skeleton nodes
  for (const session of sessions) {
    // Get or create epic node (for sessions that reference epics not in store)
    let epic = epicMap.get(session.epicSlug);
    if (!epic) {
      epic = { slug: session.epicSlug, status: "unknown", features: [], entries: [] };
      epicMap.set(session.epicSlug, epic);
    }

    // Get entries for this session
    let rawEntries = getEntries(session);
    if (rawEntries.length === 0 && fallbackEntries) {
      rawEntries = fallbackEntries.get(session.epicSlug, session.phase, session.featureSlug);
    }
    const treeEntries = rawEntries.map((e) => toTreeEntry(e, session.phase));

    if (session.featureSlug) {
      // Find or create feature node
      let feature = epic.features.find((f) => f.slug === session.featureSlug);
      if (!feature) {
        feature = { slug: session.featureSlug, status: "unknown", entries: [] };
        epic.features.push(feature);
      }
      feature.entries.push(...treeEntries);
      feature.entries.sort((a, b) => a.timestamp - b.timestamp || a.seq - b.seq);
    } else {
      epic.entries.push(...treeEntries);
      epic.entries.sort((a, b) => a.timestamp - b.timestamp || a.seq - b.seq);
    }
  }

  return {
    cli: { entries: systemEntries ?? [] },
    epics: Array.from(epicMap.values()),
  };
}

/**
 * React hook that transforms dispatched sessions into TreeState
 * for the dashboard's TreeView component.
 */
export function useDashboardTreeState({
  sessions,
  selectedEpicSlug,
  fallbackEntries,
  systemEntries,
  enrichedEpics,
}: UseDashboardTreeStateOptions): UseDashboardTreeStateResult {
  // Filter sessions by selected epic
  const filteredSessions =
    selectedEpicSlug === undefined
      ? sessions
      : sessions.filter((s) => s.epicSlug === selectedEpicSlug);

  // Subscribe to fallback entry changes for non-SDK sessions
  const [, setFallbackRevision] = useState(0);
  useEffect(() => {
    if (!fallbackEntries) return;
    const interval = setInterval(() => {
      setFallbackRevision(fallbackEntries.revision);
    }, 200);
    return () => clearInterval(interval);
  }, [fallbackEntries]);

  // Filter enriched epics when a specific epic is selected
  const filteredEnrichedEpics = selectedEpicSlug === undefined
    ? enrichedEpics
    : enrichedEpics?.filter((e) => e.slug === selectedEpicSlug);

  // Build tree state on each render
  const visibleSystemEntries = selectedEpicSlug === undefined ? systemEntries : undefined;
  const state = buildTreeState(
    filteredSessions,
    (session) => {
      if (fallbackEntries) {
        return fallbackEntries.get(session.epicSlug, session.phase, session.featureSlug);
      }
      return [];
    },
    fallbackEntries,
    visibleSystemEntries,
    filteredEnrichedEpics,
  );

  return { state };
}
