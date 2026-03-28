/**
 * Worktree lifecycle manager — TypeScript rewrite of hooks/worktree-create.sh.
 *
 * Provides four operations:
 *   create  — git worktree at .claude/worktrees/<slug> with feature/<slug> branch
 *   enter   — returns absolute path for use as cwd
 *   merge   — squash-merges feature branch back to main
 *   remove  — cleans up worktree directory and optionally deletes branch
 */

import { resolve } from "node:path";
import { git, gitCheck } from "./git.js";

const WORKTREE_DIR = ".claude/worktrees";

export interface WorktreeInfo {
  slug: string;
  path: string;
  branch: string;
}

/**
 * Create a worktree at `.claude/worktrees/<slug>` with a `feature/<slug>` branch.
 *
 * If the branch exists (local or remote), checks it out.
 * Otherwise creates a new branch from origin/HEAD (or HEAD if no remote).
 * Prunes stale worktree references before creation.
 */
export async function create(
  slug: string,
  opts: { cwd?: string } = {},
): Promise<WorktreeInfo> {
  const cwd = opts.cwd;
  const branch = `feature/${slug}`;
  const wtPath = `${WORKTREE_DIR}/${slug}`;

  // Prune stale worktree references
  await git(["worktree", "prune"], { cwd, allowFailure: true });

  // Check if worktree already exists at the path
  const absPath = resolve(cwd ?? process.cwd(), wtPath);
  const existingWorktrees = await git(["worktree", "list", "--porcelain"], {
    cwd,
  });
  if (existingWorktrees.stdout.includes(absPath)) {
    // Worktree already exists — return it
    return { slug, path: absPath, branch };
  }

  // Check if feature branch exists locally
  const localExists = await gitCheck(
    ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
    { cwd },
  );

  // Check if feature branch exists on remote
  const remoteExists = await gitCheck(
    ["show-ref", "--verify", "--quiet", `refs/remotes/origin/${branch}`],
    { cwd },
  );

  if (localExists || remoteExists) {
    // Existing branch — create worktree from it
    await git(["worktree", "add", wtPath, branch], { cwd });
  } else {
    // New feature — create branch from origin/HEAD or HEAD
    const baseResult = await git(
      ["rev-parse", "--verify", "origin/HEAD"],
      { cwd, allowFailure: true },
    );
    const base =
      baseResult.exitCode === 0
        ? baseResult.stdout
        : (await git(["rev-parse", "HEAD"], { cwd })).stdout;

    await git(["worktree", "add", wtPath, "-b", branch, base], { cwd });
  }

  return { slug, path: resolve(cwd ?? process.cwd(), wtPath), branch };
}

/**
 * Return the absolute path of a worktree for use as `cwd` in SDK sessions.
 */
export function enter(
  slug: string,
  opts: { cwd?: string } = {},
): string {
  return resolve(opts.cwd ?? process.cwd(), `${WORKTREE_DIR}/${slug}`);
}

/**
 * Squash-merge the feature branch back to main.
 * Assumes we are NOT in the worktree (caller should remove or switch first).
 */
export async function merge(
  slug: string,
  opts: { cwd?: string; mainBranch?: string } = {},
): Promise<void> {
  const cwd = opts.cwd;
  const branch = `feature/${slug}`;
  const main = opts.mainBranch ?? "main";

  // Ensure we're on the main branch
  const currentBranch = (
    await git(["rev-parse", "--abbrev-ref", "HEAD"], { cwd })
  ).stdout;

  if (currentBranch !== main) {
    await git(["checkout", main], { cwd });
  }

  // Squash merge
  await git(["merge", "--squash", branch], { cwd });
  await git(
    ["commit", "-m", `feat(${slug}): squash merge feature/${slug}`],
    { cwd },
  );
}

/**
 * Remove a worktree and optionally delete its branch.
 */
export async function remove(
  slug: string,
  opts: { cwd?: string; deleteBranch?: boolean } = {},
): Promise<void> {
  const cwd = opts.cwd;
  const branch = `feature/${slug}`;
  const wtPath = `${WORKTREE_DIR}/${slug}`;

  // Remove the worktree (force to handle uncommitted changes)
  await git(["worktree", "remove", wtPath, "--force"], {
    cwd,
    allowFailure: true,
  });

  // Prune to clean up
  await git(["worktree", "prune"], { cwd, allowFailure: true });

  // Optionally delete the branch
  if (opts.deleteBranch !== false) {
    await git(["branch", "-D", branch], { cwd, allowFailure: true });
  }
}
