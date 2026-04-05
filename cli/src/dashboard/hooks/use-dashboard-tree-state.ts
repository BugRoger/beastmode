import { useState, useEffect } from "react";
import type { DispatchedSession } from "../../dispatch/types.js";
import type { LogEntry } from "../../dispatch/factory.js";
import type { TreeState, EpicNode, TreeEntry, SystemEntry } from "../tree-types.js";
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
      return "detail";
    case "tool-result":
      return "debug";
    case "heartbeat":
      return "trace";
    case "result":
      return entry.text.toLowerCase().includes("error") ? "error" : "info";
    default:
      return "info";
  }
}

/** Map a LogEntry to a TreeEntry. */
function toTreeEntry(entry: LogEntry): TreeEntry {
  return {
    timestamp: entry.timestamp,
    level: entryTypeToLevel(entry),
    message: entry.text,
    seq: entry.seq,
  };
}

/**
 * Build a TreeState from sessions and their buffered entries.
 * Pure function — no React dependency, testable standalone.
 */
export function buildTreeState(
  sessions: Array<{ epicSlug: string; phase: string; featureSlug?: string }>,
  getEntries: (session: { epicSlug: string; phase: string; featureSlug?: string }) => LogEntry[],
  fallbackEntries?: FallbackEntryStore,
  systemEntries?: SystemEntry[],
): TreeState {
  const epicMap = new Map<string, EpicNode>();

  for (const session of sessions) {
    // Get or create epic
    let epic = epicMap.get(session.epicSlug);
    if (!epic) {
      epic = { slug: session.epicSlug, phases: [] };
      epicMap.set(session.epicSlug, epic);
    }

    // Get or create phase
    let phase = epic.phases.find((p) => p.phase === session.phase);
    if (!phase) {
      phase = { phase: session.phase, features: [], entries: [] };
      epic.phases.push(phase);
    }

    // Get entries for this session — SDK entries if available, fallback if not
    let rawEntries = getEntries(session);
    if (rawEntries.length === 0 && fallbackEntries) {
      rawEntries = fallbackEntries.get(session.epicSlug, session.phase, session.featureSlug);
    }
    const treeEntries = rawEntries.map(toTreeEntry);

    if (session.featureSlug) {
      // Get or create feature
      let feature = phase.features.find((f) => f.slug === session.featureSlug);
      if (!feature) {
        feature = { slug: session.featureSlug!, entries: [] };
        phase.features.push(feature);
      }
      feature.entries.push(...treeEntries);
      // Sort entries by timestamp then seq
      feature.entries.sort((a, b) => a.timestamp - b.timestamp || a.seq - b.seq);
    } else {
      phase.entries.push(...treeEntries);
      // Sort entries by timestamp then seq
      phase.entries.sort((a, b) => a.timestamp - b.timestamp || a.seq - b.seq);
    }
  }

  return {
    epics: Array.from(epicMap.values()),
    system: systemEntries ?? [],
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

  // Build tree state on each render (revision bump triggers rebuild)
  // System entries only shown in aggregate mode (no specific epic selected)
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
  );

  return { state };
}
