/**
 * Logger — scoped, verbosity-gated logging with structured, colored output.
 *
 * Output format: `[HH:MM:SS] LEVEL  PHASE  (scope):  message`
 * chalk handles NO_COLOR, FORCE_COLOR, and isatty() automatically.
 */

import chalk from "chalk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogLevel = "info" | "debug" | "warn" | "error";

export interface LogContext {
  phase?: string;
  epic?: string;
  feature?: string;
}

// ---------------------------------------------------------------------------
// Level labels — fixed 5-char width
// ---------------------------------------------------------------------------

const LEVEL_LABELS: Record<LogLevel, string> = {
  info:  "INFO ",
  debug: "DEBUG",
  warn:  "WARN ",
  error: "ERR  ",
};

// ---------------------------------------------------------------------------
// Level colorizers
// ---------------------------------------------------------------------------

function colorLevel(level: LogLevel, label: string): string {
  switch (level) {
    case "info":
      return chalk.green(label);
    case "debug":
      return chalk.blue(label);
    case "warn":
      return chalk.yellow(label);
    case "error":
      return chalk.red(label);
  }
}

// ---------------------------------------------------------------------------
// Scope construction
// ---------------------------------------------------------------------------

/** Max characters for scope content (inside parens). */
const SCOPE_BUDGET = 32;

/** Truncate a string to maxLen, adding ellipsis if truncated. */
function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + "\u2026";
}

function buildScope(ctx: LogContext): string {
  if (ctx.epic && ctx.feature) {
    const half = SCOPE_BUDGET / 2; // 16
    return `${truncate(ctx.epic, half)}/${truncate(ctx.feature, half)}`;
  }
  if (ctx.epic) return truncate(ctx.epic, SCOPE_BUDGET);
  return "cli";
}

// ---------------------------------------------------------------------------
// Phase column
// ---------------------------------------------------------------------------

/** Phase column — fixed 9-char width (matches "implement"). */
const PHASE_WIDTH = 9;

function buildPhase(ctx: LogContext): string {
  if (ctx.phase) return ctx.phase.padEnd(PHASE_WIDTH);
  return " ".repeat(PHASE_WIDTH);
}

// ---------------------------------------------------------------------------
// Column alignment
// ---------------------------------------------------------------------------

/** Target column for message start (after phase+scope+colon). */
const SCOPE_PAD_TARGET = 50;

/** Minimum gap between scope colon and message. */
const MIN_GAP = 2;

// ---------------------------------------------------------------------------
// Format function
// ---------------------------------------------------------------------------

/**
 * Format a structured log line.
 *
 * Output: `[HH:MM:SS] LEVEL  PHASE      (scope):  message`
 *
 * WARN and ERR color the entire line yellow/red respectively.
 * All other levels use per-field coloring; phase gets magenta.
 */
export function formatLogLine(level: LogLevel, ctx: LogContext, message: string): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const timestamp = `${hh}:${mm}:${ss}`;

  const label = LEVEL_LABELS[level];
  const phase = buildPhase(ctx);
  const scope = buildScope(ctx);

  // Build the raw (uncolored) prefix to measure alignment
  // Format: [HH:MM:SS] LEVEL  PHASE  (scope):
  const rawPrefix = `[${timestamp}] ${label}  ${phase}  (${scope}):`;
  const padNeeded = Math.max(MIN_GAP, SCOPE_PAD_TARGET - rawPrefix.length);
  const padding = " ".repeat(padNeeded);

  // WARN and ERR: color the entire line
  if (level === "warn") {
    return chalk.yellow(`[${timestamp}] ${label}  ${phase}  (${scope}):${padding}${message}`);
  }
  if (level === "error") {
    return chalk.red(`[${timestamp}] ${label}  ${phase}  (${scope}):${padding}${message}`);
  }

  // Normal levels: per-field coloring
  const coloredTimestamp = chalk.dim(`[${timestamp}]`);
  const coloredLabel = colorLevel(level, label);
  const coloredPhase = chalk.magenta(phase);
  const coloredScope = `${chalk.dim("(")}${chalk.cyan(scope)}${chalk.dim(")")}`;
  const coloredColon = chalk.dim(":");

  return `${coloredTimestamp} ${coloredLabel}  ${coloredPhase}  ${coloredScope}${coloredColon}${padding}${message}`;
}

// ---------------------------------------------------------------------------
// Logger interface and factory
// ---------------------------------------------------------------------------

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

/**
 * Create a scoped logger with verbosity gating.
 *
 * Messages at or below the verbosity level are shown.
 * warn() and error() always show regardless of verbosity.
 */
export function createLogger(verbosity: number, context?: LogContext): Logger {
  const ctx = context ?? {};

  function emit(stream: NodeJS.WriteStream, level: LogLevel, msg: string): void {
    stream.write(formatLogLine(level, ctx, msg) + "\n");
  }

  return {
    log(msg: string) {
      if (verbosity >= 0) emit(process.stdout, "info", msg);
    },
    detail(msg: string) {
      if (verbosity >= 1) emit(process.stdout, "detail", msg);
    },
    debug(msg: string) {
      if (verbosity >= 2) emit(process.stdout, "debug", msg);
    },
    trace(msg: string) {
      if (verbosity >= 3) emit(process.stdout, "trace", msg);
    },
    warn(msg: string) {
      emit(process.stderr, "warn", msg);
    },
    error(msg: string) {
      emit(process.stderr, "error", msg);
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
