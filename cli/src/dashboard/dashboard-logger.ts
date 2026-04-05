/**
 * Logger implementation that routes to dashboard entries instead of stdout/stderr.
 *
 * When the dashboard runs in Ink's alternate screen, stdout/stderr writes
 * bleed through and corrupt the TUI. This logger captures all output as
 * LogEntry objects routed to the FallbackEntryStore (epic-scoped) and
 * system entries array (global), making them visible in the LOG panel.
 */

import type { Logger, LogContext, LogLevel } from "../logger.js";
import type { LogEntry } from "../dispatch/factory.js";
import type { FallbackEntryStore } from "./lifecycle-entries.js";

export interface SystemEntryRef {
  entries: { timestamp: number; level: LogLevel; message: string; seq: number }[];
  nextSeq: () => number;
}

export interface DashboardLoggerOptions {
  fallbackStore: FallbackEntryStore;
  systemRef: SystemEntryRef;
  verbosity: number;
  context?: LogContext;
}

/**
 * Create a Logger that routes to the dashboard's entry stores.
 *
 * Epic-scoped messages (context has epic) go into the fallback store
 * and appear in the epic's tree node. Messages without epic context
 * go into the system entries array.
 */
export function createDashboardLogger(opts: DashboardLoggerOptions): Logger {
  const { fallbackStore, systemRef, verbosity, context = {} } = opts;

  function route(level: LogLevel, msg: string): void {
    const timestamp = Date.now();

    if (context.epic) {
      const entry: Omit<LogEntry, "seq"> = {
        type: level === "error" || level === "warn" ? "result" : "text",
        timestamp,
        text: msg,
      };
      fallbackStore.push(
        context.epic,
        context.phase ?? "unknown",
        context.feature,
        entry,
      );
    }

    // Always push to system entries too (visible in aggregate mode)
    const prefix = context.epic
      ? `[${context.epic}${context.phase ? `/${context.phase}` : ""}] `
      : "";
    systemRef.entries.push({
      timestamp,
      level,
      message: `${prefix}${msg}`,
      seq: systemRef.nextSeq(),
    });
  }

  return {
    info(msg: string) {
      route("info", msg);
    },
    debug(msg: string) {
      if (verbosity >= 1) route("debug", msg);
    },
    warn(msg: string) {
      route("warn", msg);
    },
    error(msg: string) {
      route("error", msg);
    },
    child(childCtx: Partial<LogContext>): Logger {
      return createDashboardLogger({
        fallbackStore,
        systemRef,
        verbosity,
        context: { ...context, ...childCtx },
      });
    },
  };
}
