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
import type { PipelineManifest } from "../manifest-store";
import { createEpicActor } from "../pipeline-machine";
import type { EpicContext } from "../pipeline-machine";
import type { Phase } from "../types";
import type { Logger } from "../logger";
import { createLogger } from "../logger";

export async function cancelCommand(
  args: string[],
  config: BeastmodeConfig,
  verbosity: number = 0,
  force: boolean = false,
): Promise<void> {
  const logger = createLogger(verbosity, "beastmode");
  const slug = args[0];
  if (!slug) {
    logger.error("Usage: beastmode cancel <slug>");
    process.exit(1);
  }

  const projectRoot = process.cwd();

  logger.log(`Cancel: ${slug}`);

  // Confirmation prompt (skipped with --force)
  if (!force) {
    const confirmed = await confirmCancel(slug, config, logger);
    if (!confirmed) {
      logger.log("Cancel aborted.");
      return;
    }
  }

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
 * Read the manifest for the given slug and set phase to "cancelled"
 * by sending a CANCEL event through the pipeline machine.
 */
function updateManifestCancelled(
  projectRoot: string,
  slug: string,
): void {
  const manifest = store.load(projectRoot, slug);
  if (!manifest) throw new Error(`No manifest found for: ${slug}`);

  let actor: ReturnType<typeof createEpicActor>;
  const persistAction = ({ context }: { context: EpicContext }) => {
    const snapshot = actor.getSnapshot();
    const phase = (typeof snapshot.value === 'string' ? snapshot.value : 'cancelled') as Phase;
    store.save(projectRoot, slug, {
      ...context,
      phase,
    } as unknown as PipelineManifest);
  };

  actor = createEpicActor(manifest as unknown as EpicContext, { persist: persistAction });
  actor.send({ type: 'CANCEL' });
  actor.stop();
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
      ["gh", "issue", "close", String(epicNumber), "--reason", "not planned"],
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

/**
 * Print a summary of what cancel will delete and ask for [y/N] confirmation.
 * Returns true if user confirms, false otherwise.
 */
async function confirmCancel(
  slug: string,
  config: BeastmodeConfig,
  logger: Logger,
): Promise<boolean> {
  const items = [
    "worktree and branch",
    "archive and phase tags",
    "artifacts (design, plan, implement, validate, release)",
    "manifest file",
  ];
  if (config.github.enabled) {
    items.push("GitHub epic issue (closed as not_planned)");
  }

  logger.log(`\nThis will remove for "${slug}":`);
  for (const item of items) {
    logger.log(`  - ${item}`);
  }

  process.stdout.write("\nProceed? [y/N] ");

  const response = await readLine();
  return response.trim().toLowerCase() === "y";
}

/**
 * Read a single line from stdin.
 */
function readLine(): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;

    stdin.setRawMode?.(false);
    stdin.resume();

    const onData = (data: Buffer) => {
      stdin.removeListener("data", onData);
      stdin.pause();
      if (wasRaw) stdin.setRawMode?.(true);
      resolve(data.toString());
    };

    stdin.on("data", onData);
  });
}
