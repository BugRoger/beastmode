/**
 * Session strategy — abstraction over how phase sessions are dispatched.
 *
 * Implementations: SdkStrategy (existing behavior), CmuxStrategy (future).
 */

import type { SessionResult } from "./watch-types.js";

/** Options passed to a strategy's dispatch method. */
export interface DispatchOptions {
  epicSlug: string;
  phase: string;
  args: string[];
  featureSlug?: string;
  projectRoot: string;
  signal: AbortSignal;
}

/** Handle returned from a successful dispatch. */
export interface DispatchHandle {
  id: string;
  worktreeSlug: string;
  promise: Promise<SessionResult>;
}

/** Strategy interface for session dispatch. */
export interface SessionStrategy {
  /** Launch a phase session. Returns a handle to track completion. */
  dispatch(opts: DispatchOptions): Promise<DispatchHandle>;
  /** Check if a previously dispatched session has completed. */
  isComplete(id: string): boolean;
  /**
   * Clean up resources for an epic.
   * Called after release teardown when the epic's worktree is removed.
   * Best-effort: implementations should catch errors and log warnings,
   * never throw.
   */
  cleanup(epicSlug: string): Promise<void>;
}
