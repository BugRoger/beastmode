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
} from "../worktree";
import { runPostDispatch } from "../post-dispatch";

/**
 * Execute a phase command. Called directly from the top-level router.
 * Phase is already validated by the argument parser.
 */
export async function phaseCommand(
  phase: Phase,
  args: string[],
  _config: BeastmodeConfig,
): Promise<void> {
  const projectRoot = process.cwd();
  const worktreeSlug = deriveWorktreeSlug(phase, args);

  await ensureWorktree(worktreeSlug);
  const cwd = enterWorktree(worktreeSlug);

  console.log(`[beastmode] Phase: ${phase}`);
  console.log(`[beastmode] Worktree: ${cwd}`);
  console.log("");

  const result = await runInteractive({ phase, args, cwd });

  await appendRunLog(projectRoot, phase, args, result);

  // Post-dispatch: read phase output, enrich manifest, sync GitHub
  await runPostDispatch({
    worktreePath: cwd,
    projectRoot,
    epicSlug: args[0] || worktreeSlug,
    phase,
    success: result.exit_status === "success",
  });

  console.log("");
  console.log(
    `[beastmode] ${phase} ${result.exit_status} in ${formatDuration(result.duration_ms)}`,
  );

  // Release teardown: remove worktree on success
  if (phase === "release" && result.exit_status === "success") {
    try {
      console.log("[beastmode] Release successful — removing worktree...");

      await removeWorktree(worktreeSlug, { cwd: projectRoot });
      console.log("[beastmode] Worktree removed");

      console.log("[beastmode] Release teardown complete");
    } catch (err) {
      console.error("[beastmode] Release teardown failed:", err);
      console.error("[beastmode] Worktree preserved for manual cleanup");
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
    const topic = args.join(" ");
    return slugify(topic || "untitled");
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

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
