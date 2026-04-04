/**
 * Pure formatting functions for tree-mode log output.
 *
 * Builds tree prefixes (│ · connectors) and formats leaf lines
 * with timestamp + level + message (no scope, no phase column).
 */

import chalk from "chalk";
import type { LogLevel } from "../logger.js";
import { PHASE_COLOR } from "./monokai-palette.js";

/** Depth level in the tree hierarchy. */
export type TreeDepth =
  | "epic"          // top-level — no prefix
  | "phase"         // │
  | "feature"       // │ │
  | "leaf-phase"    // │ ·
  | "leaf-feature"  // │ │ ·
  | "system";       // flat — no prefix

/** Level labels — fixed 5-char width (matches logger.ts). */
const LEVEL_LABELS: Record<LogLevel, string> = {
  info:   "INFO ",
  detail: "DETL ",
  debug:  "DEBUG",
  trace:  "TRACE",
  warn:   "WARN ",
  error:  "ERR  ",
};

/**
 * Build the tree connector prefix for a given depth.
 */
export function buildTreePrefix(depth: TreeDepth): string {
  switch (depth) {
    case "epic":
    case "system":
      return "";
    case "phase":
      return "│ ";
    case "feature":
      return "│ │ ";
    case "leaf-phase":
      return "│ · ";
    case "leaf-feature":
      return "│ │ · ";
  }
}

/**
 * Format a timestamp (ms since epoch) to HH:MM:SS.
 */
function formatTime(ts: number): string {
  const d = new Date(ts);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

/**
 * Colorize tree prefix connectors with the phase color.
 */
function colorPrefix(prefix: string, phase: string | undefined): string {
  if (!prefix || !phase) return prefix;
  const color = PHASE_COLOR[phase];
  if (!color) return prefix;
  return chalk.hex(color)(prefix);
}

/**
 * Format a single tree line.
 *
 * For node labels (epic, phase, feature): renders prefix + label.
 * For leaf entries: renders prefix + HH:MM:SS + LEVEL + message.
 * For system entries: renders HH:MM:SS + LEVEL + message (no prefix).
 *
 * Warn/error: full-line yellow/red coloring.
 * Normal: phase-colored prefix, dimmed timestamp.
 */
export function formatTreeLine(
  depth: TreeDepth,
  level: LogLevel,
  phase: string | undefined,
  message: string,
  timestamp: number,
): string {
  const prefix = buildTreePrefix(depth);

  // Node labels (epic, phase, feature) — just prefix + message
  if (depth === "epic") {
    return message;
  }
  if (depth === "phase") {
    const color = phase ? PHASE_COLOR[phase] : undefined;
    const label = color ? chalk.hex(color)(message) : message;
    return `${colorPrefix(prefix, phase)}${label}`;
  }
  if (depth === "feature") {
    return `${colorPrefix(prefix, phase)}${message}`;
  }

  // Leaf and system entries — timestamp + level + message
  const time = formatTime(timestamp);
  const label = LEVEL_LABELS[level];

  // Warn/error: full-line coloring
  if (level === "warn") {
    return chalk.yellow(`${prefix}${time} ${label} ${message}`);
  }
  if (level === "error") {
    return chalk.red(`${prefix}${time} ${label} ${message}`);
  }

  // Normal: phase-colored prefix, dim timestamp
  if (depth === "system") {
    return `${chalk.dim(time)} ${chalk.green(label)} ${message}`;
  }

  return `${colorPrefix(prefix, phase)}${chalk.dim(time)} ${chalk.green(label)} ${message}`;
}
