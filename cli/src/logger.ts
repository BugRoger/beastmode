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
// LogEntry — structured record passed to sinks
// ---------------------------------------------------------------------------

export interface LogEntry {
  level: LogLevel;
  timestamp: number;
  msg: string;
  data?: Record<string, unknown>;
  context: LogContext;
}

// ---------------------------------------------------------------------------
// LogSink — single contract for all transports
// ---------------------------------------------------------------------------

export interface LogSink {
  write(entry: LogEntry): void;
}

// ---------------------------------------------------------------------------
// Logger interface and factory
// ---------------------------------------------------------------------------

/** Logger instance — 4 levels, delegates to injected sink. */
export interface Logger {
  info(msg: string, data?: Record<string, unknown>): void;
  debug(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  child(ctx: Partial<LogContext>): Logger;
}

/**
 * Create a logger that delegates all calls to the given sink.
 * No verbosity gating — sinks decide what to show.
 */
export function createLogger(sink: LogSink, context?: LogContext): Logger {
  const ctx = context ?? {};

  function emit(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
    sink.write({ level, timestamp: Date.now(), msg, data, context: ctx });
  }

  return {
    info(msg: string, data?: Record<string, unknown>) { emit("info", msg, data); },
    debug(msg: string, data?: Record<string, unknown>) { emit("debug", msg, data); },
    warn(msg: string, data?: Record<string, unknown>) { emit("warn", msg, data); },
    error(msg: string, data?: Record<string, unknown>) { emit("error", msg, data); },
    child(childCtx: Partial<LogContext>): Logger {
      return createLogger(sink, { ...ctx, ...childCtx });
    },
  };
}

// ---------------------------------------------------------------------------
// StdioSink — default CLI transport
// ---------------------------------------------------------------------------

/**
 * Create a StdioSink that writes formatted log lines to stdout/stderr.
 *
 * Verbosity gating:
 * - verbosity 0 (info): debug entries suppressed
 * - verbosity 1 (debug / -v flag): all entries pass through
 * - warn/error always shown
 */
export function createStdioSink(verbosity: number): LogSink {
  return {
    write(entry: LogEntry): void {
      // Verbosity gating: debug suppressed at info level
      if (entry.level === "debug" && verbosity < 1) return;

      const line = formatLogLine(entry.level, entry.context, entry.msg) + "\n";
      if (entry.level === "warn" || entry.level === "error") {
        process.stderr.write(line);
      } else {
        process.stdout.write(line);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Null logger — suppresses all output
// ---------------------------------------------------------------------------

/** Create a no-op logger that suppresses all output. Useful for tests. */
export function createNullLogger(): Logger {
  const noop = (() => {}) as (msg: string, data?: Record<string, unknown>) => void;
  const nl: Logger = {
    info: noop,
    debug: noop,
    warn: noop,
    error: noop,
    child: () => nl,
  };
  return nl;
}
