/**
 * `beastmode run <phase> <args...>`
 *
 * Orchestrates: worktree creation -> phase execution -> run logging.
 *
 * - Design phase: spawns interactive claude CLI (Bun.spawn, inherited stdio)
 * - All other phases: uses Claude Agent SDK with streaming output
 * - All phases: logs run metadata to .beastmode-runs.json on completion
 */

import type { BeastmodeConfig } from "../config";
import type { Phase, PhaseResult } from "../types";
import { isValidPhase, VALID_PHASES } from "../types";
import { runPhaseWithSdk } from "../runners/sdk-runner";
import { runDesignInteractive } from "../runners/design-runner";
import { appendRunLog } from "../utils/run-log";
import { create as createWorktree, enter as enterWorktree } from "../worktree";

export async function runCommand(
  args: string[],
  _config: BeastmodeConfig,
): Promise<void> {
  if (args.length < 1) {
    console.error("Usage: beastmode run <phase> [args...]");
    console.error(`Phases: ${VALID_PHASES.join(", ")}`);
    process.exit(1);
  }

  const [phaseStr, ...rest] = args;

  if (!isValidPhase(phaseStr)) {
    console.error(`Unknown phase: ${phaseStr}`);
    console.error(`Available phases: ${VALID_PHASES.join(", ")}`);
    process.exit(1);
  }

  const phase: Phase = phaseStr;
  const projectRoot = process.cwd();

  // Derive worktree slug from args:
  //   design:    slugify the topic
  //   implement: first arg is design slug (worktree name), second is feature
  //   plan/validate/release: first arg is the slug
  const worktreeSlug = deriveWorktreeSlug(phase, rest);

  // Create worktree (reuses existing feature branch if present)
  await createWorktree(worktreeSlug);
  const cwd = enterWorktree(worktreeSlug);

  console.log(`[beastmode] Phase: ${phase}`);
  console.log(`[beastmode] Worktree: ${cwd}`);
  console.log("");

  let result: PhaseResult;

  if (phase === "design") {
    // Design is interactive — spawn claude CLI directly
    const topic = rest.join(" ");
    if (!topic) {
      console.error("Usage: beastmode run design <topic>");
      process.exit(1);
    }
    result = await runDesignInteractive({ topic, cwd });
  } else {
    // All other phases use the SDK with streaming
    result = await runPhaseWithSdk({ phase, args: rest, cwd });
  }

  // Log run metadata
  await appendRunLog(projectRoot, phase, rest, result);

  // Report
  console.log("");
  console.log(
    `[beastmode] ${phase} ${result.exit_status} in ${formatDuration(result.duration_ms)}`,
  );

  // Exit with appropriate code
  if (result.exit_status === "error") {
    process.exit(1);
  }
  if (result.exit_status === "cancelled") {
    process.exit(130); // Standard SIGINT exit code
  }
}

function deriveWorktreeSlug(phase: Phase, args: string[]): string {
  if (phase === "design") {
    // Slugify the topic: lowercase, spaces to hyphens, strip non-alphanumeric
    const topic = args.join(" ");
    return slugify(topic || "untitled");
  }
  // For implement: first arg is the design slug (which is the worktree name)
  // For plan/validate/release: first arg is the slug
  return args[0] || "default";
}

function slugify(input: string): string {
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
