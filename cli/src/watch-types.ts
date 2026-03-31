/**
 * Watch loop types — shared interfaces for the autonomous pipeline driver.
 * EnrichedManifest, ScanResult, and NextAction are canonical in state-scanner.ts.
 */

import type { EnrichedManifest, ScanResult, NextAction } from "./state-scanner.js";
export type { EnrichedManifest, ScanResult, NextAction };

/** Tracks an active SDK session dispatched by the watch loop. */
export interface DispatchedSession {
  /** Unique ID for this dispatch */
  id: string;
  /** Epic this session belongs to */
  epicSlug: string;
  /** Phase being executed */
  phase: string;
  /** Feature slug (for implement fan-out) */
  featureSlug?: string;
  /** Worktree slug used for this session */
  worktreeSlug: string;
  /** AbortController for cancellation */
  abortController: AbortController;
  /** Promise that resolves when the session completes */
  promise: Promise<SessionResult>;
  /** Timestamp when dispatched */
  startedAt: number;
}

/** Result of a completed SDK session. */
export interface SessionResult {
  /** Whether the session completed successfully */
  success: boolean;
  /** Exit code or status */
  exitCode: number;
  /** Cost in USD */
  costUsd: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Feature progress after reconciliation */
  progress?: { completed: number; total: number };
}

/** Watch loop configuration derived from BeastmodeConfig. */
export interface WatchConfig {
  /** Poll interval in seconds */
  intervalSeconds: number;
  /** Project root path */
  projectRoot: string;
}

/** Lockfile state. */
export interface LockfileInfo {
  pid: number;
  startedAt: string;
}
