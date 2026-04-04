/**
 * Fallback log entries from WatchLoop lifecycle events.
 *
 * When the dispatch strategy is not SDK, SessionHandle.events is undefined.
 * This module converts WatchLoop lifecycle events into LogEntry objects
 * that the dashboard tree state hook can render in the same tree structure.
 */

import type { LogEntry } from "../dispatch/factory.js";
import type {
  SessionStartedEvent,
  SessionCompletedEvent,
  WatchErrorEvent,
} from "../dispatch/types.js";

/**
 * Convert a WatchLoop lifecycle event into a LogEntry (without seq — caller assigns).
 */
export function lifecycleToLogEntry(
  kind: "session-started",
  payload: SessionStartedEvent,
): Omit<LogEntry, "seq">;
export function lifecycleToLogEntry(
  kind: "session-completed",
  payload: SessionCompletedEvent,
): Omit<LogEntry, "seq">;
export function lifecycleToLogEntry(
  kind: "error",
  payload: WatchErrorEvent,
): Omit<LogEntry, "seq">;
export function lifecycleToLogEntry(
  kind: string,
  payload: SessionStartedEvent | SessionCompletedEvent | WatchErrorEvent,
): Omit<LogEntry, "seq"> {
  const timestamp = Date.now();

  switch (kind) {
    case "session-started":
      return { type: "text", timestamp, text: "dispatching" };

    case "session-completed": {
      const p = payload as SessionCompletedEvent;
      const status = p.success ? "completed" : "failed";
      const dur = `${(p.durationMs / 1000).toFixed(0)}s`;
      const detail = p.costUsd != null ? `$${p.costUsd.toFixed(2)}, ${dur}` : dur;
      return {
        type: p.success ? "text" : "result",
        timestamp,
        text: `${status} (${detail})`,
      };
    }

    case "error": {
      const p = payload as WatchErrorEvent;
      return { type: "result", timestamp, text: `error: ${p.message}` };
    }

    default:
      return { type: "text", timestamp, text: `unknown event: ${kind}` };
  }
}

/**
 * In-memory store for fallback log entries, keyed by epic+phase+feature.
 * Assigns monotonic seq numbers per key. Exposes a revision counter
 * for React change detection.
 */
export class FallbackEntryStore {
  private entries = new Map<string, LogEntry[]>();
  private seqCounters = new Map<string, number>();
  private _revision = 0;

  private makeKey(epic: string, phase: string, feature: string | undefined): string {
    return `${epic}:${phase}:${feature ?? ""}`;
  }

  get revision(): number {
    return this._revision;
  }

  push(
    epic: string,
    phase: string,
    feature: string | undefined,
    entry: Omit<LogEntry, "seq">,
  ): void {
    const key = this.makeKey(epic, phase, feature);
    const seq = this.seqCounters.get(key) ?? 0;
    this.seqCounters.set(key, seq + 1);

    const full: LogEntry = { ...entry, seq };
    const list = this.entries.get(key);
    if (list) {
      list.push(full);
    } else {
      this.entries.set(key, [full]);
    }
    this._revision++;
  }

  get(epic: string, phase: string, feature: string | undefined): LogEntry[] {
    const key = this.makeKey(epic, phase, feature);
    return this.entries.get(key) ?? [];
  }
}
