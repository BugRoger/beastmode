/** Structured context for scoped logging. */
export interface LogContext {
  phase?: string;
  epic?: string;
  feature?: string;
}

/** Logger instance returned by createLogger. */
export interface Logger {
  /** Level 0 — always shown. Writes to stdout. */
  log(msg: string): void;
  /** Level 1 — shown at -v. Writes to stdout. */
  detail(msg: string): void;
  /** Level 2 — shown at -vv. Writes to stdout. */
  debug(msg: string): void;
  /** Level 3 — shown at -vvv. Writes to stdout. */
  trace(msg: string): void;
  /** Always shown — writes to stderr. */
  warn(msg: string): void;
  /** Always shown — writes to stderr. */
  error(msg: string): void;
  /** Create a child logger with merged context. */
  child(ctx: Partial<LogContext>): Logger;
}

function ts(): string {
  return new Date().toISOString().slice(11, 19);
}

/**
 * Build a scope string from context fields.
 *
 * All three: `phase/epic/feature`
 * phase + epic: `phase/epic`
 * phase only: `phase`
 * No fields: empty string
 */
function buildScope(ctx: LogContext): string {
  const parts: string[] = [];
  if (ctx.phase) parts.push(ctx.phase);
  if (ctx.epic) parts.push(ctx.epic);
  if (ctx.feature) parts.push(ctx.feature);
  return parts.join("/");
}

/**
 * Create a scoped logger with verbosity gating.
 *
 * Messages at or below the verbosity level are shown.
 * warn() and error() always show regardless of verbosity.
 *
 * Output format: `HH:MM:SS scope: message` (when scope is non-empty)
 * or `HH:MM:SS message` (when scope is empty)
 */
export function createLogger(verbosity: number, context?: LogContext): Logger {
  const ctx = context ?? {};
  const scope = buildScope(ctx);
  const fmt = scope
    ? (msg: string) => `${ts()} ${scope}: ${msg}`
    : (msg: string) => `${ts()} ${msg}`;

  return {
    log(msg: string) {
      if (verbosity >= 0) process.stdout.write(fmt(msg) + "\n");
    },
    detail(msg: string) {
      if (verbosity >= 1) process.stdout.write(fmt(msg) + "\n");
    },
    debug(msg: string) {
      if (verbosity >= 2) process.stdout.write(fmt(msg) + "\n");
    },
    trace(msg: string) {
      if (verbosity >= 3) process.stdout.write(fmt(msg) + "\n");
    },
    warn(msg: string) {
      process.stderr.write(fmt(msg) + "\n");
    },
    error(msg: string) {
      process.stderr.write(fmt(msg) + "\n");
    },
    child(childCtx: Partial<LogContext>): Logger {
      return createLogger(verbosity, { ...ctx, ...childCtx });
    },
  };
}

/** Create a no-op logger that suppresses all output. Useful for tests. */
export function createNullLogger(): Logger {
  const noop = () => {};
  const nl: Logger = { log: noop, detail: noop, debug: noop, trace: noop, warn: noop, error: noop, child: () => nl };
  return nl;
}
