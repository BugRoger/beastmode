/**
 * Cancel-logic — shared module implementing the full 6-step epic cleanup sequence.
 *
 * Self-resolving: accepts a raw identifier string, calls store.find() to resolve
 * to a manifest. Falls back to best-effort matching when the manifest is already
 * gone (idempotent re-run).
 *
 * Each step is warn-and-continue: failures log a warning and accumulate in
 * `warned[]` rather than aborting the sequence.
 */

import { readdirSync, unlinkSync } from "fs";
import { resolve } from "path";
import { remove as removeWorktree } from "../git/worktree.js";
import { git } from "../git/worktree.js";
import { gh } from "../github/cli.js";
import { deleteAllTags } from "../git/tags.js";
import * as store from "../manifest/store.js";
import type { Logger } from "../logger.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CancelConfig {
  /** Raw slug or epic name */
  identifier: string;
  /** Project root path */
  projectRoot: string;
  /** Whether to attempt GitHub operations */
  githubEnabled: boolean;
  /** Whether to skip confirmation prompt */
  force: boolean;
  /** Logger instance for output */
  logger: Logger;
}

export interface CancelResult {
  /** Steps that completed successfully */
  cleaned: string[];
  /** Steps that warned (failed non-fatally) */
  warned: string[];
}

// ---------------------------------------------------------------------------
// Confirmation prompt
// ---------------------------------------------------------------------------

async function confirmCancel(logger: Logger): Promise<boolean> {
  logger.info(
    "This will remove the worktree, branch, tags, artifacts, manifest, and close the GitHub issue. Proceed? [y/N]",
  );
  const reader = Bun.stdin.stream().getReader();
  try {
    const { value } = await reader.read();
    const answer = value ? new TextDecoder().decode(value).trim() : "";
    return answer === "y" || answer === "Y";
  } finally {
    reader.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Artifact phases to scan
// ---------------------------------------------------------------------------

const ARTIFACT_PHASES = ["design", "plan", "implement", "validate", "release"];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute the full 6-step cancel/cleanup sequence for an epic.
 */
export async function cancelEpic(config: CancelConfig): Promise<CancelResult> {
  const { identifier, projectRoot, githubEnabled, force, logger } = config;
  const cleaned: string[] = [];
  const warned: string[] = [];

  // --- Self-resolution ---
  const manifest = store.find(projectRoot, identifier);
  const slug = manifest?.slug ?? identifier;
  const epic = manifest?.epic ?? manifest?.slug ?? identifier;
  const githubEpicNumber = manifest?.github?.epic;

  // --- Confirmation ---
  if (!force) {
    const confirmed = await confirmCancel(logger);
    if (!confirmed) {
      logger.info("Cancelled.");
      return { cleaned, warned };
    }
  }

  // --- Step 1: Remove worktree and branch ---
  try {
    await removeWorktree(slug, { cwd: projectRoot, deleteBranch: true });
    logger.debug(`Removed worktree and branch for ${slug}`);
    cleaned.push("worktree");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`worktree removal: ${msg}`);
    warned.push("worktree");
  }

  // --- Step 2: Delete archive tag ---
  try {
    await git(["tag", "-d", `archive/${slug}`], {
      cwd: projectRoot,
      allowFailure: true,
    });
    logger.debug(`Deleted archive tag archive/${slug}`);
    cleaned.push("archive-tag");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`archive tag deletion: ${msg}`);
    warned.push("archive-tag");
  }

  // --- Step 3: Delete phase tags ---
  try {
    await deleteAllTags(slug, { cwd: projectRoot });
    logger.debug(`Deleted phase tags for ${slug}`);
    cleaned.push("phase-tags");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`phase tag deletion: ${msg}`);
    warned.push("phase-tags");
  }

  // --- Step 4: Delete artifacts ---
  try {
    let count = 0;
    for (const phase of ARTIFACT_PHASES) {
      const dir = resolve(projectRoot, ".beastmode", "artifacts", phase);
      let files: string[];
      try {
        files = readdirSync(dir);
      } catch {
        continue;
      }
      for (const file of files) {
        if (file.includes(`-${epic}-`) || file.includes(`-${epic}.`)) {
          unlinkSync(resolve(dir, file));
          logger.debug(`  deleted ${phase}/${file}`);
          count++;
        }
      }
    }
    logger.debug(`Deleted ${count} artifact file(s)`);
    cleaned.push("artifacts");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`artifact deletion: ${msg}`);
    warned.push("artifacts");
  }

  // --- Step 5: Close GitHub epic ---
  if (githubEnabled && githubEpicNumber !== undefined) {
    try {
      const result = await gh(
        ["issue", "close", String(githubEpicNumber), "--reason", "not planned"],
        { cwd: projectRoot },
      );
      if (!result) {
        throw new Error("gh issue close returned no result");
      }
      logger.debug(`Closed GitHub issue #${githubEpicNumber}`);
      cleaned.push("github-issue");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`GitHub issue close: ${msg}`);
      warned.push("github-issue");
    }
  }

  // --- Step 6: Delete manifest ---
  try {
    const removed = store.remove(projectRoot, slug);
    if (removed) {
      logger.debug(`Deleted manifest for ${slug}`);
    } else {
      logger.debug(`No manifest found for ${slug} (already removed)`);
    }
    cleaned.push("manifest");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`manifest deletion: ${msg}`);
    warned.push("manifest");
  }

  return { cleaned, warned };
}
