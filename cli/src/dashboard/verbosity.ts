/**
 * Verbosity cycling utilities for the dashboard.
 *
 * Maps LogLevel to numeric verbosity and provides cycling/filtering helpers.
 */

import type { LogLevel } from "../logger.js";

/** Number of verbosity levels (info, detail, debug, trace). */
const VERBOSITY_COUNT = 4;

/** Map LogLevel to numeric verbosity. warn/error return -1 (always shown). */
const LEVEL_MAP: Record<LogLevel, number> = {
  info: 0,
  detail: 1,
  debug: 2,
  trace: 3,
  warn: -1,
  error: -1,
};

/** Verbosity index labels. */
const LABELS: readonly string[] = ["info", "detail", "debug", "trace"];

/** Get the numeric verbosity for a log level. -1 means always shown. */
export function levelToVerbosity(level: LogLevel): number {
  return LEVEL_MAP[level];
}

/** Cycle to the next verbosity level (wraps 3 -> 0). */
export function cycleVerbosity(current: number): number {
  return (current + 1) % VERBOSITY_COUNT;
}

/** Get the label for a verbosity level. */
export function verbosityLabel(verbosity: number): string {
  return LABELS[verbosity] ?? "info";
}

/** Should an entry with the given level be shown at the given verbosity? */
export function shouldShowEntry(level: LogLevel, verbosity: number): boolean {
  const entryVerbosity = LEVEL_MAP[level];
  // warn/error (-1) always shown; otherwise show if entry level <= current verbosity
  if (entryVerbosity < 0) return true;
  return entryVerbosity <= verbosity;
}
