/**
 * Session abstraction — factory pattern for dispatching phase sessions.
 *
 * SessionFactory decouples the watch loop from concrete dispatch mechanisms.
 * SdkSessionFactory wraps the existing dispatchPhase function.
 * Future: CmuxSessionFactory will provide an alternative implementation.
 */

import type { SessionResult } from "./watch-types.js";

/** Options passed to SessionFactory.create(). */
export interface SessionCreateOpts {
  epicSlug: string;
  phase: string;
  args: string[];
  featureSlug?: string;
  projectRoot: string;
  signal: AbortSignal;
}

/** Handle returned after a session is created — tracks the running session. */
export interface SessionHandle {
  id: string;
  worktreeSlug: string;
  promise: Promise<SessionResult>;
}

/** Abstract factory for creating phase sessions. */
export interface SessionFactory {
  create(opts: SessionCreateOpts): Promise<SessionHandle>;
}

/** Concrete factory that delegates to a dispatchPhase-compatible function. */
export class SdkSessionFactory implements SessionFactory {
  private dispatch: (opts: SessionCreateOpts) => Promise<SessionHandle>;

  constructor(
    dispatch: (opts: SessionCreateOpts) => Promise<SessionHandle>,
  ) {
    this.dispatch = dispatch;
  }

  async create(opts: SessionCreateOpts): Promise<SessionHandle> {
    return this.dispatch(opts);
  }
}
