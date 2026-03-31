/**
 * Rename Epic Slug — renames a hex-slug epic to its real design slug.
 *
 * Performs a 5-step atomic-ish rename: git branch, worktree directory,
 * worktree repair, manifest file, manifest internals. Stops on first
 * failure and reports partial progress.
 */

import { existsSync, renameSync, readFileSync, writeFileSync } from "fs";
import { resolve, basename, dirname } from "path";
import { git, gitCheck } from "./git.js";
import { manifestPath } from "./manifest-store.js";
import type { PipelineManifest } from "./manifest-store.js";

// --- Types ---

export interface RenameOptions {
  /** Current hex slug */
  hexSlug: string;
  /** Real slug from design output */
  realSlug: string;
  /** Project root (where .beastmode/state/ lives) */
  projectRoot: string;
}

export interface RenameResult {
  /** Whether the rename was performed */
  renamed: boolean;
  /** The final slug (may have suffix like -v2) */
  finalSlug: string;
  /** Steps that completed before any failure */
  completedSteps: string[];
  /** Error message if rename failed partway */
  error?: string;
}

// --- Collision Detection ---

/**
 * Check for slug collisions against git branches, worktree dirs, and manifests.
 * If any collision, try <slug>-v2, <slug>-v3, etc. up to -v99.
 * Returns the first available slug.
 */
export async function findAvailableSlug(
  targetSlug: string,
  opts: { projectRoot: string },
): Promise<string> {
  if (!(await slugCollides(targetSlug, opts.projectRoot))) {
    return targetSlug;
  }

  for (let i = 2; i <= 99; i++) {
    const candidate = `${targetSlug}-v${i}`;
    if (!(await slugCollides(candidate, opts.projectRoot))) {
      return candidate;
    }
  }

  throw new Error(
    `Cannot find available slug: ${targetSlug} through ${targetSlug}-v99 are all taken`,
  );
}

/**
 * Returns true if the slug collides with any existing branch, worktree dir,
 * or manifest file.
 */
async function slugCollides(
  slug: string,
  projectRoot: string,
): Promise<boolean> {
  // Check git branch
  const branchExists = await gitCheck(
    ["show-ref", "--verify", `refs/heads/feature/${slug}`],
    { cwd: projectRoot },
  );
  if (branchExists) return true;

  // Check worktree directory
  const worktreeDir = resolve(projectRoot, ".claude", "worktrees", slug);
  if (existsSync(worktreeDir)) return true;

  // Check manifest file
  const mPath = manifestPath(projectRoot, slug);
  if (mPath !== undefined) return true;

  return false;
}

// --- Main Rename ---

/**
 * Rename a hex-slug epic to its real design slug.
 *
 * Performs 5 steps in order. On first failure, aborts and returns
 * partial progress so the caller knows what state things are in.
 */
export async function renameEpicSlug(
  opts: RenameOptions,
): Promise<RenameResult> {
  const { hexSlug, realSlug, projectRoot } = opts;
  const completedSteps: string[] = [];

  // No-op when slugs are already identical
  if (hexSlug === realSlug) {
    return { renamed: false, finalSlug: realSlug, completedSteps };
  }

  // Resolve collision-free target slug
  const finalSlug = await findAvailableSlug(realSlug, { projectRoot });
  if (finalSlug !== realSlug) {
    console.log(
      `[rename] Slug "${realSlug}" collides, using "${finalSlug}" instead`,
    );
  }

  const hexBranch = `feature/${hexSlug}`;
  const realBranch = `feature/${finalSlug}`;
  const hexWorktree = resolve(projectRoot, ".claude", "worktrees", hexSlug);
  const realWorktree = resolve(projectRoot, ".claude", "worktrees", finalSlug);

  try {
    // Step 1: Rename git branch
    console.log(`[rename] Step 1: Branch ${hexBranch} -> ${realBranch}`);
    await git(["branch", "-m", hexBranch, realBranch], {
      cwd: projectRoot,
      allowFailure: false,
    });
    completedSteps.push("branch");

    // Step 2: Move worktree directory
    console.log(`[rename] Step 2: Worktree dir ${hexSlug} -> ${finalSlug}`);
    if (!existsSync(hexWorktree)) {
      throw new Error(`Worktree directory not found: ${hexWorktree}`);
    }
    renameSync(hexWorktree, realWorktree);
    completedSteps.push("worktree-dir");

    // Step 3: Fix worktree git metadata
    //   a) Rename .git/worktrees/<hexSlug> -> .git/worktrees/<finalSlug>
    //   b) Update the worktree's .git file to point to the new metadata dir
    //   c) Update gitdir inside the metadata to point to the new worktree path
    //   d) Run git worktree repair to fix any remaining cross-references
    console.log(`[rename] Step 3: Repairing worktree references`);
    const gitDir = resolve(projectRoot, ".git", "worktrees", hexSlug);
    const newGitDir = resolve(projectRoot, ".git", "worktrees", finalSlug);
    if (existsSync(gitDir)) {
      // 3a: Rename the metadata directory
      renameSync(gitDir, newGitDir);
      // 3b: Update .git file in the worktree to point to renamed metadata dir
      const dotGitFile = resolve(realWorktree, ".git");
      writeFileSync(dotGitFile, `gitdir: ${newGitDir}\n`);
      // 3c: Update gitdir in metadata to point to the new worktree path
      const gitdirPath = resolve(newGitDir, "gitdir");
      if (existsSync(gitdirPath)) {
        writeFileSync(gitdirPath, `${realWorktree}/.git\n`);
      }
    }
    await git(["worktree", "repair"], {
      cwd: projectRoot,
      allowFailure: true,
    });
    completedSteps.push("worktree-repair");

    // Step 4: Rename manifest file
    console.log(`[rename] Step 4: Manifest file rename`);
    const oldManifest = manifestPath(projectRoot, hexSlug);
    if (!oldManifest) {
      throw new Error(`Manifest file not found for slug: ${hexSlug}`);
    }
    const oldFilename = basename(oldManifest);
    const newFilename = oldFilename.replace(
      `-${hexSlug}.manifest.json`,
      `-${finalSlug}.manifest.json`,
    );
    const newManifest = resolve(dirname(oldManifest), newFilename);
    renameSync(oldManifest, newManifest);
    completedSteps.push("manifest-file");

    // Step 5: Update manifest internals
    console.log(`[rename] Step 5: Updating manifest internals`);
    const raw = readFileSync(newManifest, "utf-8");
    const manifest: PipelineManifest = JSON.parse(raw);
    manifest.slug = finalSlug;
    if (manifest.worktree) {
      manifest.worktree.branch = realBranch;
      manifest.worktree.path = realWorktree;
    }
    writeFileSync(newManifest, JSON.stringify(manifest, null, 2));
    completedSteps.push("manifest-internals");

    console.log(
      `[rename] All 5 targets renamed: ${hexSlug} -> ${finalSlug}`,
    );

    return {
      renamed: true,
      finalSlug,
      completedSteps,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stepNum = completedSteps.length + 1;
    console.log(
      `[rename] Aborted at step ${stepNum}: ${message}. Steps completed: [${completedSteps.join(", ")}]`,
    );

    return {
      renamed: false,
      finalSlug,
      completedSteps,
      error: message,
    };
  }
}
