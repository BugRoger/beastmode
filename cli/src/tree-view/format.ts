import chalk from "chalk";
import type { LogLevel } from "../logger.js";

/** Level labels — fixed 5-char width (matches logger.ts convention). */
const LEVEL_LABELS: Record<LogLevel, string> = {
  info:  "INFO ",
  debug: "DEBUG",
  warn:  "WARN ",
  error: "ERR  ",
};

/**
 * Format a simplified log line for tree mode.
 *
 * Output: `[HH:MM:SS] LEVEL  message`
 *
 * No phase column, no scope column — the tree structure conveys hierarchy.
 * Warn/error color the entire line yellow/red. Other levels use per-field coloring.
 */
export function formatTreeLogLine(level: LogLevel, message: string): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const timestamp = `${hh}:${mm}:${ss}`;

  const label = LEVEL_LABELS[level];

  if (level === "warn") {
    return chalk.yellow(`[${timestamp}] ${label}  ${message}`);
  }
  if (level === "error") {
    return chalk.red(`[${timestamp}] ${label}  ${message}`);
  }

  const coloredTimestamp = chalk.dim(`[${timestamp}]`);
  const coloredLabel = level === "info"
    ? chalk.green(label)
    : chalk.blue(label);

  return `${coloredTimestamp} ${coloredLabel}  ${message}`;
}
