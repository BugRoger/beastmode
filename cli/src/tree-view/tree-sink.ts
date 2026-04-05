import type { LogSink, LogEntry } from "../logger.js";
import type { TreeState } from "./types.js";
import { addEntry } from "./tree-state.js";

/**
 * Create a TreeSink that routes log entries into tree state.
 *
 * Verbosity gating:
 * - verbosity 0 (info): debug entries suppressed
 * - verbosity 1 (debug / -v flag): all entries pass through
 * - warn/error always shown
 */
export function createTreeSink(
  state: TreeState,
  verbosity: number,
  notify?: () => void,
): LogSink {
  return {
    write(entry: LogEntry): void {
      if (entry.level === "debug" && verbosity < 1) return;
      addEntry(state, entry.level, entry.context, entry.msg);
      notify?.();
    },
  };
}
