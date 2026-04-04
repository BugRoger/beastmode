import { useState, useEffect } from "react";
import type { DispatchedSession } from "../../dispatch/types.js";
import type { LogEntry, SessionEmitter } from "../../dispatch/factory.js";
import type { TreeState, EpicNode, TreeEntry } from "../tree-types.js";
import type { LogLevel } from "../../logger.js";
import type { FallbackEntryStore } from "../lifecycle-entries.js";

export interface UseDashboardTreeStateOptions {
  /** Active dispatched sessions from the tracker. */
  sessions: DispatchedSession[];
  /** Selected epic slug — undefined means aggregate mode. */
  selectedEpicSlug?: string;
  /** Fallback entries from non-SDK dispatch strategies. */
  fallbackEntries?: FallbackEntryStore;
}

export interface UseDashboardTreeStateResult {
  /** Tree state ready for TreeView rendering. */
  state: TreeState;
}

/** Map a LogEntry to a TreeEntry. */
function toTreeEntry(entry: LogEntry): TreeEntry {
  const isError =
    entry.type === "result" &&
    entry.text.toLowerCase().includes("error");
  const level: LogLevel = isError ? "error" : "info";

  return {
    timestamp: entry.timestamp,
    level,
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
    system: [],
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
}: UseDashboardTreeStateOptions): UseDashboardTreeStateResult {
  const [, setRevision] = useState(0);

  // Filter sessions by selected epic
  const filteredSessions =
    selectedEpicSlug === undefined
      ? sessions
      : sessions.filter((s) => s.epicSlug === selectedEpicSlug);

  // Subscribe to 'entry' events on each session's emitter for live updates
  useEffect(() => {
    const emitters: SessionEmitter[] = [];
    const handler = () => setRevision((r) => r + 1);

    for (const session of filteredSessions) {
      if (session.events) {
        session.events.on("entry", handler);
        emitters.push(session.events);
      }
    }

    return () => {
      for (const emitter of emitters) {
        emitter.off("entry", handler);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSessions.map((s) => s.id).join(",")]);

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
  const state = buildTreeState(
    filteredSessions,
    (session) => {
      const ds = filteredSessions.find(
        (s) =>
          s.epicSlug === session.epicSlug &&
          s.phase === session.phase &&
          s.featureSlug === session.featureSlug,
      );
      return ds?.events?.getBuffer() ?? [];
    },
    fallbackEntries,
  );

  return { state };
}
