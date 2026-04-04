/**
 * Watch loop types — shared interfaces for the autonomous pipeline driver.
 * EnrichedManifest, ScanResult, and NextAction are canonical in manifest/store.
 *
 * Moved from: watch-types.ts
 */

import type { EnrichedManifest, ScanResult, NextAction } from "../manifest/store.js";
import type { SessionEmitter } from "./factory.js";
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
  /** EventEmitter for live SDK message streaming (undefined for non-SDK sessions). */
  events?: SessionEmitter;
}

/** Result of a completed SDK session. */
export interface SessionResult {
  /** Whether the session completed successfully */
  success: boolean;
  /** Exit code or status */
  exitCode: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Cost in USD (undefined when cost data is unavailable) */
  costUsd?: number;
  /** Feature progress after reconciliation */
  progress?: { completed: number; total: number };
}

/** Watch loop configuration derived from BeastmodeConfig. */
export interface WatchConfig {
  /** Poll interval in seconds */
  intervalSeconds: number;
  /** Project root path */
  projectRoot: string;
  /** Install SIGINT/SIGTERM handlers (default: true for headless, false for embedded) */
  installSignalHandlers?: boolean;
}

/** Lockfile state. */
export interface LockfileInfo {
  pid: number;
  startedAt: string;
}

// --- WatchLoop event types ---

/** Payload for 'session-started' event. */
export interface SessionStartedEvent {
  epicSlug: string;
  featureSlug?: string;
  phase: string;
  sessionId: string;
}

/** Payload for 'session-completed' event. */
export interface SessionCompletedEvent {
  epicSlug: string;
  featureSlug?: string;
  phase: string;
  success: boolean;
  durationMs: number;
  costUsd?: number;
}

/** Payload for 'scan-complete' event. */
export interface ScanCompleteEvent {
  epicsScanned: number;
  dispatched: number;
}

/** Payload for 'error' event. */
export interface WatchErrorEvent {
  epicSlug?: string;
  message: string;
}

/** Payload for 'epic-cancelled' event. */
export interface EpicCancelledEvent {
  epicSlug: string;
}

/** Payload for 'release:held' event — emitted when release serialization blocks dispatch. */
export interface ReleaseHeldEvent {
  waitingSlug: string;
  blockingSlug: string;
}

/** Payload for 'session-dead' event — emitted when a session's process is no longer alive. */
export interface SessionDeadEvent {
  epicSlug: string;
  phase: string;
  featureSlug?: string;
  sessionId: string;
  tty: string;
}

/** Typed event map for WatchLoop. */
export interface WatchLoopEventMap {
  'session-started': [SessionStartedEvent];
  'session-completed': [SessionCompletedEvent];
  'scan-complete': [ScanCompleteEvent];
  'error': [WatchErrorEvent];
  'epic-blocked': [{ epicSlug: string; gate: string; reason: string }];
  'epic-cancelled': [EpicCancelledEvent];
  'release:held': [ReleaseHeldEvent];
  /** Emitted when the loop starts. */
  'started': [{ version: string; pid: number; intervalSeconds: number }];
  /** Emitted when the loop stops. */
  'stopped': [];
  /** Emitted when a dispatched session's process is detected as dead. */
  'session-dead': [SessionDeadEvent];
}
