/**
 * cancelEpicAction — cancel an epic from the dashboard.
 *
 * 1. Abort all running sessions for this epic (via tracker)
 * 2. Delegate to the shared cancel-logic module for full 6-step cleanup
 */

import { cancelEpic } from "../../commands/cancel-logic.js";
import type { DispatchTracker } from "../../dispatch/tracker.js";
import type { Logger } from "../../logger.js";

export interface CancelEpicOpts {
  /** Epic slug to cancel */
  slug: string;
  /** Project root for manifest operations */
  projectRoot: string;
  /** Dispatch tracker to abort running sessions */
  tracker: DispatchTracker;
  /** Whether to attempt GitHub operations */
  githubEnabled: boolean;
  /** Logger instance for output */
  logger: Logger;
}

/**
 * Cancel an epic: abort running sessions, then run shared 6-step cleanup.
 */
export async function cancelEpicAction(opts: CancelEpicOpts): Promise<void> {
  const { slug, projectRoot, tracker, githubEnabled, logger } = opts;

  // Step 1: Abort all sessions for this epic (before cleanup tears down resources)
  const sessions = tracker.getAll();
  for (const session of sessions) {
    if (session.epicSlug === slug) {
      session.abortController.abort();
    }
  }

  // Step 2: Full 6-step cleanup via shared cancel-logic
  await cancelEpic({
    identifier: slug,
    projectRoot,
    githubEnabled,
    force: true, // dashboard is non-interactive
    logger,
  });
}
