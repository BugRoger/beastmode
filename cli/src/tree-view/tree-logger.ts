import type { Logger, LogLevel, LogContext } from "../logger.js";
import type { TreeState } from "./types.js";
import { addEntry } from "./tree-state.js";

/**
 * TreeLogger — implements Logger interface, routes messages to tree state.
 *
 * Instead of writing to stdout/stderr, pushes structured entries into a
 * shared TreeState object. The tree structure (epic > phase > feature)
 * is derived from the LogContext.
 */
export class TreeLogger implements Logger {
  private state: TreeState;
  private verbosity: number;
  private context: LogContext;
  private notify: (() => void) | undefined;

  constructor(
    state: TreeState,
    verbosity: number,
    context?: LogContext,
    notify?: () => void,
  ) {
    this.state = state;
    this.verbosity = verbosity;
    this.context = context ?? {};
    this.notify = notify;
  }

  private emit(level: LogLevel, msg: string): void {
    addEntry(this.state, level, this.context, msg);
    this.notify?.();
  }

  info(msg: string): void {
    if (this.verbosity >= 0) this.emit("info", msg);
  }

  debug(msg: string): void {
    if (this.verbosity >= 1) this.emit("debug", msg);
  }

  warn(msg: string): void {
    this.emit("warn", msg);
  }

  error(msg: string): void {
    this.emit("error", msg);
  }

  child(ctx: Partial<LogContext>): Logger {
    return new TreeLogger(
      this.state,
      this.verbosity,
      { ...this.context, ...ctx },
      this.notify,
    );
  }
}
