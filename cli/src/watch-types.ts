/**
 * Watch loop types — shared interfaces for the autonomous pipeline driver.
 */

/** Represents the state of a single epic as determined by the state scanner. */
export interface EpicState {
  /** Epic slug (design name) */
  slug: string;
  /** Current phase: design, plan, implement, validate, release */
  phase: string;
  /** Next action to dispatch, or null if blocked/complete */
  nextAction: NextAction | null;
  /** Feature-level progress for epics in implement phase */
  features: FeatureProgress[];
  /** Whether the epic is blocked on a human gate */
  gateBlocked: boolean;
  /** Gate name if blocked */
  gateName?: string;
  /** Cost-to-date in USD */
  costUsd: number;
}

/** A dispatchable action derived from epic state. */
export interface NextAction {
  /** Phase to run */
  phase: string;
  /** Arguments to pass (e.g., design slug, feature slug) */
  args: string[];
  /** Type of dispatch: single phase or fan-out across features */
  type: "single" | "fan-out";
  /** For fan-out: individual feature slugs to dispatch */
  features?: string[];
}

/** Progress of a single feature within an epic. */
export interface FeatureProgress {
  slug: string;
  status: "pending" | "in-progress" | "completed" | "blocked";
}

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
