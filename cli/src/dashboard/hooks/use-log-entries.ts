import { useState, useEffect } from "react";
import type { DispatchedSession } from "../../dispatch/types.js";
import type { LogEntry, SessionEmitter } from "../../dispatch/factory.js";

/** Merged log entry with session context for display. */
export interface MergedLogEntry extends LogEntry {
  /** Feature slug (or epic slug if no feature) for the log line label. */
  label: string;
  /** Whether this entry is an error (type === "result" with error text, or contains error indicators). */
  isError: boolean;
}

export interface UseLogEntriesOptions {
  /** Active dispatched sessions from the tracker. */
  sessions: DispatchedSession[];
  /** Selected epic slug — undefined means "(all)" aggregate mode. */
  selectedEpicSlug?: string;
  /** Maximum entries to return (for visible-line limiting). Default: 200 */
  maxEntries?: number;
}

export interface UseLogEntriesResult {
  /** Merged, sorted entries ready for rendering. */
  entries: MergedLogEntry[];
}

/**
 * React hook that subscribes to active session ring buffers and returns
 * merged, timestamp-sorted log entries for the log panel.
 */
export function useLogEntries({
  sessions,
  selectedEpicSlug,
  maxEntries = 200,
}: UseLogEntriesOptions): UseLogEntriesResult {
  const [, setRevision] = useState(0);

  // Filter sessions by selected epic
  const filteredSessions =
    selectedEpicSlug === undefined
      ? sessions
      : sessions.filter((s) => s.epicSlug === selectedEpicSlug);

  // Subscribe to 'entry' events on each session's emitter
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
    // Re-subscribe when session list changes (stable string key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSessions.map((s) => s.id).join(",")]);

  // Merge on render: collect all entries from ring buffers, sort by timestamp.
  // Intentionally inline (not useMemo) — must re-run when revision bumps.
  const entries: MergedLogEntry[] = [];
  for (const session of filteredSessions) {
    if (!session.events) continue;
    const label = session.featureSlug ?? session.epicSlug;
    const buffer = session.events.getBuffer();
    for (const entry of buffer) {
      entries.push({
        ...entry,
        label,
        isError:
          entry.type === "result" &&
          entry.text.toLowerCase().includes("error"),
      });
    }
  }

  // Sort by timestamp, then by seq for stability
  entries.sort((a, b) => a.timestamp - b.timestamp || a.seq - b.seq);

  // Limit to maxEntries (take the LATEST entries for auto-follow)
  const limited =
    entries.length > maxEntries
      ? entries.slice(entries.length - maxEntries)
      : entries;

  return { entries: limited };
}
