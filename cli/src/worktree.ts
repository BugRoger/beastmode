/**
 * Worktree lifecycle manager — create, enter, exists, archive, merge, remove.
 *
 * Provides lifecycle operations only:
 *   create        — git worktree at .claude/worktrees/<slug> with feature/<slug> branch
 *   enter         — returns absolute path for use as cwd
 *   ensureWorktree — idempotent create-or-reuse
 *   exists        — checks if worktree exists for slug
 *   archive       — tag feature branch HEAD as archive/<slug>
 *   merge         — squash-merge feature branch into main
 *   remove        — cleans up worktree directory and optionally deletes branch
 *   isInsideWorktree      — detect if cwd is inside a git worktree
 *   resolveMainCheckoutRoot — resolve the main checkout path from any worktree
 */

import { resolve } from "node:path";
import { copyFile, mkdir } from "node:fs/promises";
import { git, gitCheck } from "./git.js";

const WORKTREE_DIR = ".claude/worktrees";

/**
 * Detect whether cwd is inside a git worktree (not the main checkout).
 *
 * Uses `git rev-parse --git-common-dir`: in the main checkout this returns
 * `.git` (relative), in a worktree it returns an absolute path to the main
 * repo's .git directory.
 */
export async function isInsideWorktree(
  opts: { cwd?: string } = {},
): Promise<boolean> {
  const result = await git(["rev-parse", "--git-common-dir"], {
    cwd: opts.cwd,
    allowFailure: true,
  });
  if (result.exitCode !== 0) return false;
  return result.stdout !== ".git";
}

/**
 * Resolve the main checkout root (where .beastmode/state/ lives).
 *
 * In a worktree, `git rev-parse --git-common-dir` returns the absolute path
 * to the main repo's .git dir. The parent of that is the project root.
 * In the main checkout, returns `git rev-parse --show-toplevel`.
 */
export async function resolveMainCheckoutRoot(
  opts: { cwd?: string } = {},
): Promise<string> {
  const commonDir = await git(["rev-parse", "--git-common-dir"], {
    cwd: opts.cwd,
    allowFailure: true,
  });

  if (commonDir.exitCode === 0 && commonDir.stdout !== ".git") {
    return resolve(commonDir.stdout, "..");
  }

  const toplevel = await git(["rev-parse", "--show-toplevel"], {
    cwd: opts.cwd,
  });
  return toplevel.stdout;
}

/**
 * Resolve the default branch name from the remote.
 * Runs `git symbolic-ref refs/remotes/origin/HEAD` and strips the prefix.
 * Falls back to "main" if the command fails (e.g., no remote configured).
 */
export async function resolveMainBranch(
  opts: { cwd?: string } = {},
): Promise<string> {
  const result = await git(
    ["symbolic-ref", "refs/remotes/origin/HEAD"],
    { cwd: opts.cwd, allowFailure: true },
  );
  if (result.exitCode === 0) {
    // Strip "refs/remotes/origin/" prefix → branch name
    return result.stdout.replace(/^refs\/remotes\/origin\//, "");
  }
  return "main";
}

export interface WorktreeInfo {
  slug: string;
  path: string;
  branch: string;
  mainBranch: string;
  forkPoint?: string;
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

  // Resolve the main branch name once
  const mainBranch = await resolveMainBranch({ cwd });

  // Prune stale worktree references
  await git(["worktree", "prune"], { cwd, allowFailure: true });

  // Check if worktree already exists at the path
  const absPath = resolve(cwd ?? process.cwd(), wtPath);
  const existingWorktrees = await git(["worktree", "list", "--porcelain"], {
    cwd,
  });
  if (existingWorktrees.stdout.includes(absPath)) {
    // Worktree already exists — derive fork-point and ensure settings
    const mbResult = await git(
      ["merge-base", mainBranch, branch],
      { cwd, allowFailure: true },
    );
    const forkPoint =
      mbResult.exitCode === 0 ? mbResult.stdout : undefined;
    await copySettingsLocal(cwd ?? process.cwd(), absPath);
    return { slug, path: absPath, branch, mainBranch, forkPoint };
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

  let forkPoint: string | undefined;

  if (localExists || remoteExists) {
    // Existing branch — create worktree from it
    await git(["worktree", "add", wtPath, branch], { cwd });
    // Derive fork-point via merge-base
    const mbResult = await git(
      ["merge-base", mainBranch, branch],
      { cwd, allowFailure: true },
    );
    forkPoint = mbResult.exitCode === 0 ? mbResult.stdout : undefined;
  } else {
    // New feature — create branch from local main branch
    const baseResult = await git(
      ["rev-parse", "--verify", mainBranch],
      { cwd, allowFailure: true },
    );
    const base =
      baseResult.exitCode === 0
        ? baseResult.stdout
        : (await git(["rev-parse", "HEAD"], { cwd })).stdout;

    await git(["worktree", "add", wtPath, "-b", branch, base], { cwd });

    // Fork-point is the SHA of main at creation time
    forkPoint = base;
  }

  const absWtPath = resolve(cwd ?? process.cwd(), wtPath);

  // Copy .claude/settings.local.json so plugins are enabled in the worktree
  await copySettingsLocal(cwd ?? process.cwd(), absWtPath);

  return { slug, path: absWtPath, branch, mainBranch, forkPoint };
}

/**
 * Copy `.claude/settings.local.json` into a worktree so the SDK session
 * inherits plugin configuration (beastmode skills, etc.).
 *
 * Only copies if the worktree's `.claude/` dir already exists (git worktree
 * add creates it). Never creates the directory — that would break git
 * worktree add which expects a non-existent or empty target.
 */
async function copySettingsLocal(
  projectRoot: string,
  worktreePath: string,
): Promise<void> {
  const src = resolve(projectRoot, ".claude/settings.local.json");
  const destDir = resolve(worktreePath, ".claude");
  const dest = resolve(destDir, "settings.local.json");
  try {
    await mkdir(destDir, { recursive: true });
    await copyFile(src, dest);
  } catch {
    // Source doesn't exist or worktree not ready — nothing to copy
  }
}

/**
 * Check whether a worktree exists for the given slug.
 */
export async function exists(
  slug: string,
  opts: { cwd?: string } = {},
): Promise<boolean> {
  const cwd = opts.cwd;
  const wtPath = `${WORKTREE_DIR}/${slug}`;
  const absPath = resolve(cwd ?? process.cwd(), wtPath);

  await git(["worktree", "prune"], { cwd, allowFailure: true });

  const result = await git(["worktree", "list", "--porcelain"], { cwd });
  return result.stdout.includes(absPath);
}

/**
 * Ensure a worktree exists for the given slug.
 *
 * If the worktree already exists, returns its info without modification.
 * If it doesn't exist, creates one. This is the canonical entry point
 * for all phase commands — the idempotent create-or-reuse lifecycle.
 */
export async function ensureWorktree(
  slug: string,
  opts: { cwd?: string } = {},
): Promise<WorktreeInfo> {
  return create(slug, opts);
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
 * Archive a feature branch as a tag before cleanup.
 * Creates a tag `archive/<slug>` pointing at the branch HEAD.
 * Returns the tag name.
 */
export async function archive(
  slug: string,
  opts: { cwd?: string } = {},
): Promise<string> {
  const cwd = opts.cwd;
  const branch = `feature/${slug}`;
  const tagName = `archive/${slug}`;

  // Get the branch HEAD
  const headResult = await git(["rev-parse", branch], { cwd });
  const sha = headResult.stdout;

  // Create the archive tag
  await git(["tag", tagName, sha], { cwd, allowFailure: true });

  return tagName;
}

/**
 * Squash-merge a feature branch into main.
 */
export async function merge(
  slug: string,
  opts: { cwd?: string } = {},
): Promise<void> {
  const cwd = opts.cwd;
  const branch = `feature/${slug}`;
  const mainBranch = await resolveMainBranch({ cwd });

  // Squash-merge into main (from project root, not worktree)
  await git(["checkout", mainBranch], { cwd });
  // Reset staged changes and remove untracked artifacts that could conflict
  await git(["reset", "HEAD"], { cwd, allowFailure: true });
  await git(["checkout", "."], { cwd, allowFailure: true });
  await git(["clean", "-fd", ".beastmode/artifacts/"], { cwd, allowFailure: true });
  await git(["merge", "--squash", branch], { cwd });
  await git(["commit", "--no-edit"], { cwd, allowFailure: true });
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
