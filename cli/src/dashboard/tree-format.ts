/**
 * Pure formatting functions for tree-mode log output.
 *
 * Builds tree prefixes (│ · connectors) and formats leaf lines
 * with timestamp + phase badge + level + message.
 *
 * Hierarchy: SYSTEM > Epic > Feature > Entry
 */

import chalk from "chalk";
import type { LogLevel } from "../logger.js";
import { PHASE_COLOR, BADGE_WIDTH } from "./monokai-palette.js";

/** Depth level in the tree hierarchy. */
export type TreeDepth =
  | "cli"            // synthetic root — │ (same as epic)
  | "epic"           // │
  | "feature"        // │ │
  | "leaf-epic"      // │ ·        (entry directly under epic)
  | "leaf-feature"   // │ │ ·      (entry under feature)
  | "system";        // │ · (same as leaf-epic)

/** Level labels — fixed 5-char width (matches logger.ts). */
const LEVEL_LABELS: Record<LogLevel, string> = {
  info:   "INFO ",
  debug:  "DEBUG",
  warn:   "WARN ",
  error:  "ERR  ",
};

/**
 * Build the tree connector prefix for a given depth.
 * ● marks nodes, │ connects them in the same column.
 */
export function buildTreePrefix(depth: TreeDepth): string {
  switch (depth) {
    case "cli":
      return "● ";
    case "system":
      return "│ ";
    case "epic":
      return "● ";
    case "feature":
      return "├─○ ";
    case "leaf-epic":
      return "│ ";
    case "leaf-feature":
      return "│ │ ";
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
 * Colorize tree prefix connectors — always dimmed.
 */
function colorPrefix(prefix: string): string {
  if (!prefix) return prefix;
  return chalk.dim(prefix);
}

/**
 * Format a phase badge: [phase] in the phase's color.
 */
function formatPhaseBadge(phase: string | undefined): string {
  if (!phase) return "";
  const color = PHASE_COLOR[phase];
  const badge = `[${phase}]`;
  return color ? chalk.hex(color)(badge) : badge;
}

/**
 * Format a single tree line.
 *
 * For the SYSTEM root label: renders │ + label (same prefix as epic).
 * For node labels (epic, feature): renders prefix + label.
 * For leaf entries: renders prefix + phase badge + HH:MM:SS + LEVEL + message.
 * For system entries: renders │ · prefix + HH:MM:SS + LEVEL + message (same as leaf-epic, no badge).
 *
 * All leaf levels: dimmed prefix, dimmed timestamp, colored level label, default message.
 * Level label colors: green (info), blue (debug), yellow (warn), red (error).
 */
export function formatTreeLine(
  depth: TreeDepth,
  level: LogLevel,
  phase: string | undefined,
  message: string,
  timestamp: number,
): string {
  const prefix = buildTreePrefix(depth);

  // Node labels — just prefix + message
  if (depth === "cli") {
    return `${prefix}${message}`;
  }
  if (depth === "epic") {
    return `${colorPrefix(prefix)}${message}`;
  }
  if (depth === "feature") {
    return `${colorPrefix(prefix)}${message}`;
  }

  // Leaf and system entries — phase badge + timestamp + level + message
  const time = formatTime(timestamp);
  const label = LEVEL_LABELS[level];
  const badge = depth !== "system" ? `${formatPhaseBadge(phase)} ` : "";

  // Warn/error: segmented coloring (same structure as normal path)
  if (level === "warn") {
    return `${colorPrefix(prefix)}${badge}${chalk.dim(time)} ${chalk.yellow(label)} ${message}`;
  }
  if (level === "error") {
    return `${colorPrefix(prefix)}${badge}${chalk.dim(time)} ${chalk.red(label)} ${message}`;
  }

  // Normal: phase-colored prefix, dim timestamp
  return `${colorPrefix(prefix)}${badge}${chalk.dim(time)} ${chalk.green(label)} ${message}`;
}
