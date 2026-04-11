/**
 * DashboardSink — LogSink implementation that routes entries to dashboard stores.
 *
 * Receives LogEntry records from the Logger (no gating) and:
 * 1. Routes epic-scoped entries to FallbackEntryStore (keyed by epic/phase/feature)
 * 2. Pushes non-epic entries to SystemEntryRef for aggregate mode display
 *
 * Bridges the core LogEntry (level/msg/data/context) to the dispatch LogEntry
 * shape (type/text/seq) expected by FallbackEntryStore.
 */

import type { LogEntry, LogSink } from "../logger.js";
import type { LogEntry as DispatchLogEntry } from "../dispatch/factory.js";
import type { FallbackEntryStore } from "./lifecycle-entries.js";
import type { SystemEntryRef } from "./dashboard-logger.js";

export interface DashboardSinkOptions {
  fallbackStore: FallbackEntryStore;
  systemRef: SystemEntryRef;
}

export class DashboardSink implements LogSink {
  private fallbackStore: FallbackEntryStore;
  private systemRef: SystemEntryRef;

  constructor(opts: DashboardSinkOptions) {
    this.fallbackStore = opts.fallbackStore;
    this.systemRef = opts.systemRef;
  }

  write(entry: LogEntry): void {
    const { level, timestamp, msg, context } = entry;

    // Route to fallbackStore if epic context is present
    if (context.epic) {
      const dispatchEntry: Omit<DispatchLogEntry, "seq"> = {
        type: level === "error" || level === "warn" ? "result" : "text",
        timestamp,
        text: msg,
      };
      this.fallbackStore.push(
        context.epic,
        context.phase ?? "unknown",
        context.feature,
        dispatchEntry,
      );
    }

    // Push to system entries only for non-epic-scoped entries
    if (!context.epic) {
      this.systemRef.entries.push({
        timestamp,
        level,
        message: msg,
        seq: this.systemRef.nextSeq(),
      });
    }
  }
}
