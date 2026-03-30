/**
 * `beastmode cancel <slug>`
 *
 * Full teardown of an abandoned epic's worktree and associated state.
 *
 * Steps (warn-and-continue for each):
 *   1. Remove worktree (force, even with uncommitted changes)
 *   2. Delete local branch (handled by remove)
 *   3. Update manifest phase to "cancelled"
 *   4. Close GitHub epic as not_planned (when enabled)
 *
 * Idempotent — safe to run multiple times.
 */

import type { BeastmodeConfig } from "../config";
import {
  remove as removeWorktree,
} from "../worktree";
import * as store from "../manifest-store";
import { cancel } from "../manifest";
import type { Logger } from "../logger";
import { createLogger } from "../logger";

export async function cancelCommand(
  args: string[],
  config: BeastmodeConfig,
  verbosity: number = 0,
): Promise<void> {
  const logger = createLogger(verbosity, "beastmode");
  const slug = args[0];
  if (!slug) {
    logger.error("Usage: beastmode cancel <slug>");
    process.exit(1);
  }

  const projectRoot = process.cwd();

  logger.log(`Cancel: ${slug}`);

  // Step 1+2: Remove worktree and delete branch
  try {
    await removeWorktree(slug, { cwd: projectRoot, deleteBranch: true });
    logger.log("Worktree removed, branch deleted");
  } catch (err) {
    logger.warn(
      `Worktree removal failed (may already be cleaned up): ${err instanceof Error ? err.message : err}`,
    );
  }

  // Step 3: Update manifest phase to cancelled
  try {
    updateManifestCancelled(projectRoot, slug);
    logger.log("Manifest updated: phase = cancelled");
  } catch (err) {
    logger.warn(
      `Manifest update failed: ${err instanceof Error ? err.message : err}`,
    );
  }

  // Step 4: Close GitHub epic as not_planned
  if (config.github.enabled) {
    await closeGitHubEpic(projectRoot, slug, logger);
  }

  logger.log(`Cancel complete: ${slug}`);
}

/**
 * Read the manifest for the given slug and set phase to "cancelled".
 */
function updateManifestCancelled(
  projectRoot: string,
  slug: string,
): void {
  const manifest = store.load(projectRoot, slug);
  if (!manifest) throw new Error(`No manifest found for: ${slug}`);
  const cancelled = cancel(manifest);
  store.save(projectRoot, slug, cancelled);
}

/**
 * Close the GitHub epic issue as not_planned using gh CLI.
 * Uses warn-and-continue — never blocks on failure.
 */
async function closeGitHubEpic(
  projectRoot: string,
  slug: string,
  logger: Logger,
): Promise<void> {
  const manifest = store.load(projectRoot, slug);
  if (!manifest) return;

  const epicNumber = manifest.github?.epic;

  if (!epicNumber) return;

  try {
    const proc = Bun.spawn(
      ["gh", "issue", "close", String(epicNumber), "--reason", "not_planned"],
      {
        cwd: projectRoot,
        stdout: "pipe",
        stderr: "pipe",
      },
    );

    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode === 0) {
      logger.log(`GitHub epic #${epicNumber} closed as not_planned`);
    } else {
      logger.warn(
        `GitHub close failed: ${stderr.trim()}`,
      );
    }
  } catch (err) {
    logger.warn(
      `GitHub close failed: ${err instanceof Error ? err.message : err}`,
    );
  }
}
