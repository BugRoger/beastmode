/**
 * cancelEpicAction — cancel an epic via the pipeline state machine
 * and abort any running sessions for that epic.
 *
 * Used by the dashboard's cancel flow. Unlike the CLI cancel command,
 * this does NOT remove the worktree (the dashboard is still running in it).
 */

import { createEpicActor } from "../../pipeline-machine/index.js";
import type { EpicContext } from "../../pipeline-machine/index.js";
import * as store from "../../manifest-store.js";
import type { PipelineManifest } from "../../manifest-store.js";
import type { DispatchTracker } from "../../dispatch-tracker.js";
import type { Phase } from "../../types.js";

export interface CancelEpicOpts {
  /** Epic slug to cancel */
  slug: string;
  /** Project root for manifest operations */
  projectRoot: string;
  /** Dispatch tracker to abort running sessions */
  tracker: DispatchTracker;
}

/**
 * Cancel an epic: update manifest via state machine + abort running sessions.
 *
 * Steps:
 * 1. Load manifest for the slug
 * 2. Create epic actor, send CANCEL event, persist
 * 3. Abort all sessions for this epic via the tracker
 */
export async function cancelEpicAction(opts: CancelEpicOpts): Promise<void> {
  const { slug, projectRoot, tracker } = opts;

  // Step 1: Load manifest
  const manifest = store.load(projectRoot, slug);
  if (!manifest) {
    throw new Error(`No manifest found for: ${slug}`);
  }

  // Step 2: Cancel via state machine
  let actor: ReturnType<typeof createEpicActor>;
  const persistAction = ({ context }: { context: EpicContext }) => {
    const snapshot = actor.getSnapshot();
    const phase = (
      typeof snapshot.value === "string" ? snapshot.value : "cancelled"
    ) as Phase;
    store.save(projectRoot, slug, {
      ...context,
      phase,
    } as unknown as PipelineManifest);
  };

  actor = createEpicActor(manifest as unknown as EpicContext, {
    persist: persistAction,
  });
  actor.send({ type: "CANCEL" });
  actor.stop();

  // Step 3: Abort sessions for this epic only
  const sessions = tracker.getAll();
  for (const session of sessions) {
    if (session.epicSlug === slug) {
      session.abortController.abort();
    }
  }
}
