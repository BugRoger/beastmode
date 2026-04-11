/**
 * Git push operations — push branches and tags to remote after phase checkpoints.
 *
 * Pure git operations — not gated on github.enabled.
 * Warn-and-continue: never throw, log failures.
 */

import { git } from "./worktree.js";

/**
 * Check whether a remote named "origin" is configured.
 * Returns false when no remote exists (pure local workflow).
 */
export async function hasRemote(
  opts: { cwd?: string } = {},
): Promise<boolean> {
  const result = await git(
    ["remote", "get-url", "origin"],
    { cwd: opts.cwd, allowFailure: true },
  );
  return result.exitCode === 0;
}

export interface PushBranchesOpts {
  epicSlug: string;
  phase: string;
  featureSlug?: string;
  cwd?: string;
}

/**
 * Pushes the feature branch (`feature/<slug>`) to origin.
 */
export async function pushBranches(opts: PushBranchesOpts): Promise<void> {
  const { epicSlug, cwd } = opts;
  await git(["push", "origin", `feature/${epicSlug}`], { cwd, allowFailure: true });
}

/**
 * Push all tags to origin.
 * Covers phase tags (beastmode/<slug>/<phase>) and archive tags (archive/<slug>).
 */
export async function pushTags(
  opts: { cwd?: string } = {},
): Promise<void> {
  await git(["push", "origin", "--tags"], { cwd: opts.cwd, allowFailure: true });
}
