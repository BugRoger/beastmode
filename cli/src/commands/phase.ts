/**
 * `beastmode <phase> <args...>`
 *
 * Orchestrates: worktree creation -> interactive session -> run logging.
 *
 * All five manual phase commands (design, plan, implement, validate, release)
 * dispatch through the interactive runner. No phase-specific branching except
 * release teardown (remove worktree on success).
 *
 * The SDK runner is preserved for the watch loop — it is not used here.
 */

import type { BeastmodeConfig } from "../config";
import type { Phase } from "../types";
import { runInteractive } from "../runners/interactive-runner";
import { appendRunLog } from "../utils/run-log";
import {
  ensureWorktree,
  enter as enterWorktree,
  remove as removeWorktree,
  isInsideWorktree,
  resolveMainCheckoutRoot,
} from "../worktree";
import { runPostDispatch } from "../post-dispatch";
import * as store from "../manifest-store";
import { createLogger } from "../logger";

/**
 * Execute a phase command. Called directly from the top-level router.
 * Phase is already validated by the argument parser.
 *
 * Two invocation contexts:
 *   1. Manual — user runs `beastmode design <topic>` from the project root.
 *      We create/enter the worktree and run post-dispatch + teardown.
 *   2. Cmux — the watch loop already created the worktree and CDed into it.
 *      We skip worktree creation and defer post-dispatch to the watch loop's
 *      ReconcilingFactory (which has the correct projectRoot).
 */
export async function phaseCommand(
  phase: Phase,
  args: string[],
  _config: BeastmodeConfig,
  verbosity: number = 0,
): Promise<void> {
  const logger = createLogger(verbosity, "beastmode");
  const inWorktree = await isInsideWorktree();
  const projectRoot = inWorktree
    ? await resolveMainCheckoutRoot()
    : process.cwd();
  const worktreeSlug = deriveWorktreeSlug(phase, args);

  let cwd: string;
  if (inWorktree) {
    // Already in a worktree (cmux dispatch) — use cwd as-is
    cwd = process.cwd();
  } else {
    // Manual invocation — create/enter worktree
    await ensureWorktree(worktreeSlug);
    cwd = enterWorktree(worktreeSlug);
  }

  // Seed manifest for design phase so runPostDispatch can enrich it
  const epicSlug = phase === "design" ? worktreeSlug : (args[0] || worktreeSlug);
  if (phase === "design" && !store.manifestExists(projectRoot, epicSlug)) {
    store.create(projectRoot, epicSlug, {
      worktree: { branch: `feature/${worktreeSlug}`, path: cwd },
    });
  }

  logger.log(`Phase: ${phase}`);
  logger.log(`Worktree: ${cwd}`);

  const result = await runInteractive({ phase, args, cwd });

  await appendRunLog(projectRoot, phase, args, result);

  // Post-dispatch: only when not in a worktree.
  // Cmux path defers to the watch loop's ReconcilingFactory.
  if (!inWorktree) {
    await runPostDispatch({
      worktreePath: cwd,
      projectRoot,
      epicSlug,
      phase,
      success: result.exit_status === "success",
      logger,
    });
  }

  logger.log(`${phase} ${result.exit_status} in ${formatDuration(result.duration_ms)}`);

  // Release teardown: only from main checkout (watch loop handles its own)
  if (!inWorktree && phase === "release" && result.exit_status === "success") {
    try {
      logger.log("Release successful — removing worktree...");

      await removeWorktree(worktreeSlug, { cwd: projectRoot });
      logger.log("Worktree removed");

      logger.log("Release teardown complete");
    } catch (err) {
      logger.error(`Release teardown failed: ${err instanceof Error ? err.message : String(err)}`);
      logger.error("Worktree preserved for manual cleanup");
    }
  }

  if (result.exit_status === "error") {
    process.exit(1);
  }
  if (result.exit_status === "cancelled") {
    process.exit(130);
  }
}

function deriveWorktreeSlug(phase: Phase, args: string[]): string {
  if (phase === "design") {
    return randomHex(6);
  }
  // All non-design phases use the epic slug directly
  return args[0] || "default";
}

/** Slugification matching worktree-manager.md derivation logic. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Generate a random hex string of the specified length. */
export function randomHex(length: number): string {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, length);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
