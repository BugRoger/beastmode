/**
 * Shared log-line format function — structured, colored, pino-pretty inspired.
 *
 * Consumed by both the CLI logger and the dashboard activity log.
 * chalk handles NO_COLOR, FORCE_COLOR, and isatty() automatically.
 */

import chalk from "chalk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogLevel = "info" | "detail" | "debug" | "trace" | "warn" | "error";

export interface LogContext {
  phase?: string;
  epic?: string;
  feature?: string;
}

// ---------------------------------------------------------------------------
// Level labels — fixed 5-char width
// ---------------------------------------------------------------------------

const LEVEL_LABELS: Record<LogLevel, string> = {
  info:   "INFO ",
  detail: "DETL ",
  debug:  "DEBUG",
  trace:  "TRACE",
  warn:   "WARN ",
  error:  "ERR  ",
};

// ---------------------------------------------------------------------------
// Level colorizers
// ---------------------------------------------------------------------------

function colorLevel(level: LogLevel, label: string): string {
  switch (level) {
    case "info":
    case "detail":
      return chalk.green(label);
    case "debug":
    case "trace":
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

function buildScope(ctx: LogContext): string {
  if (ctx.phase && ctx.epic && ctx.feature) return `${ctx.phase}/${ctx.epic}/${ctx.feature}`;
  if (ctx.phase && ctx.epic) return `${ctx.phase}/${ctx.epic}`;
  if (ctx.phase) return ctx.phase;
  return "cli";
}

// ---------------------------------------------------------------------------
// Column alignment
// ---------------------------------------------------------------------------

/** Target column for message start (after scope+colon). */
const SCOPE_PAD_TARGET = 40;

/** Minimum gap between scope colon and message. */
const MIN_GAP = 2;

// ---------------------------------------------------------------------------
// Format function
// ---------------------------------------------------------------------------

/**
 * Format a structured log line.
 *
 * Output: `[HH:MM:SS] LEVEL  (scope):  message`
 *
 * WARN and ERR color the entire line yellow/red respectively.
 * All other levels use per-field coloring.
 */
export function formatLogLine(level: LogLevel, ctx: LogContext, message: string): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const timestamp = `${hh}:${mm}:${ss}`;

  const label = LEVEL_LABELS[level];
  const scope = buildScope(ctx);

  // Build the raw (uncolored) prefix to measure alignment
  // Format: [HH:MM:SS] LEVEL  (scope):
  const rawPrefix = `[${timestamp}] ${label}  (${scope}):`;
  const padNeeded = Math.max(MIN_GAP, SCOPE_PAD_TARGET - rawPrefix.length);
  const padding = " ".repeat(padNeeded);

  // WARN and ERR: color the entire line
  if (level === "warn") {
    return chalk.yellow(`[${timestamp}] ${label}  (${scope}):${padding}${message}`);
  }
  if (level === "error") {
    return chalk.red(`[${timestamp}] ${label}  (${scope}):${padding}${message}`);
  }

  // Normal levels: per-field coloring
  const coloredTimestamp = chalk.dim(`[${timestamp}]`);
  const coloredLabel = colorLevel(level, label);
  const coloredScope = `${chalk.dim("(")}${chalk.cyan(scope)}${chalk.dim(")")}`;
  const coloredColon = chalk.dim(":");

  return `${coloredTimestamp} ${coloredLabel}  ${coloredScope}${coloredColon}${padding}${message}`;
}
