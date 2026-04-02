/**
 * Session factory — abstract dispatch strategy for the watch loop.
 *
 * Two implementations:
 * - SdkSessionFactory: wraps the existing SDK/CLI dispatch (default)
 * - CmuxSessionFactory: creates cmux surfaces for visual dispatch
 */

import type { SessionResult } from "./watch-types.js";
import type { SessionEmitter } from "./sdk-streaming.js";

/** Options for creating a new session. */
export interface SessionCreateOpts {
  epicSlug: string;
  phase: string;
  args: string[];
  featureSlug?: string;
  projectRoot: string;
  signal: AbortSignal;
}

/** Handle to a dispatched session. */
export interface SessionHandle {
  id: string;
  worktreeSlug: string;
  promise: Promise<SessionResult>;
  /** EventEmitter for live SDK message streaming (SDK dispatch only). */
  events?: SessionEmitter;
}

/**
 * Factory that creates dispatch sessions. The watch loop uses this
 * to dispatch phases without knowing whether they run as SDK sessions
 * or cmux terminal surfaces.
 */
export interface SessionFactory {
  create(opts: SessionCreateOpts): Promise<SessionHandle>;

  /** Optional cleanup when an epic is released (e.g., close cmux workspace). */
  cleanup?(epicSlug: string): Promise<void>;
}

/**
 * SDK-based session factory — wraps the existing dispatchPhase function.
 * This is the default strategy when cmux is not available or not configured.
 */
export class SdkSessionFactory implements SessionFactory {
  private dispatchFn: (opts: SessionCreateOpts) => Promise<SessionHandle>;

  constructor(dispatchFn: (opts: SessionCreateOpts) => Promise<SessionHandle>) {
    this.dispatchFn = dispatchFn;
  }

  async create(opts: SessionCreateOpts): Promise<SessionHandle> {
    return this.dispatchFn(opts);
  }
}
