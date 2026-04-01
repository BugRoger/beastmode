/**
 * `beastmode <phase> <args...>`
 *
 * Orchestrates: phase detection -> worktree creation -> interactive session -> run logging.
 *
 * All five manual phase commands (design, plan, implement, validate, release)
 * dispatch through the interactive runner. Phase detection gates entry:
 * forward jumps are blocked, regressions require confirmation and git reset.
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
import type { PipelineManifest } from "../manifest-store";
import { createLogger } from "../logger";
import {
  classifyPhaseRequest,
  findPredecessorTag,
  hasPhaseTag,
  executeRegression,
  formatRegressionWarning,
} from "../phase-detection";
import { epicMachine } from "../pipeline-machine";
import { createActor } from "xstate";
import type { EpicContext } from "../pipeline-machine";

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

  // Fail-fast: non-design phases require the slug to exist in the store.
  // Check before creating the worktree to avoid orphaned worktrees.
  let manifest: PipelineManifest | undefined;
  if (phase !== "design") {
    manifest = store.find(projectRoot, worktreeSlug);
    if (!manifest) {
      logger.error(`Epic "${worktreeSlug}" not found — run "beastmode design" first`);
      process.exit(1);
    }

    // Phase detection: classify request against manifest state
    const classification = classifyPhaseRequest(phase, manifest.phase);

    if (classification.type === "forward-jump") {
      logger.error(
        `Cannot jump from ${manifest.phase} to ${phase} — phases must be completed in order`,
      );
      process.exit(1);
    }

    if (
      (classification.type === "regression" || classification.type === "same-rerun") &&
      classification.predecessorPhase
    ) {
      // Find the predecessor tag to reset to
      const resetTag = await findPredecessorTag(
        worktreeSlug,
        classification.predecessorPhase,
        { cwd: projectRoot },
      );

      if (!resetTag) {
        logger.error(
          `Cannot regress: no tag found for ${classification.predecessorPhase}. ` +
          `This epic predates phase tagging — manually reset if needed.`,
        );
        process.exit(1);
      }

      // Distinguish normal forward from same-phase rerun:
      // If classification is "same-rerun" but no phase tag exists, it's a normal forward
      if (classification.type === "same-rerun") {
        const tagExists = await hasPhaseTag(worktreeSlug, phase, { cwd: projectRoot });
        if (!tagExists) {
          // Normal forward — no regression needed, fall through
          logger.detail(`Normal forward: ${phase} (no prior tag)`);
        } else {
          // Same-phase rerun — needs confirmation and reset
          await confirmAndReset({
            slug: worktreeSlug,
            manifest,
            phase,
            predecessorPhase: classification.predecessorPhase,
            resetTag,
            skipPrompt: hasYesFlag(args) || inWorktree,
            projectRoot,
            logger,
          });
        }
      } else {
        // Regression — always needs confirmation and reset
        await confirmAndReset({
          slug: worktreeSlug,
          manifest,
          phase,
          predecessorPhase: classification.predecessorPhase,
          resetTag,
          skipPrompt: hasYesFlag(args) || inWorktree,
          projectRoot,
          logger,
        });
      }
    }
  }

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

  const result = await runInteractive({ phase, args: stripFlags(args), cwd });

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

/** Check if --yes or -y flag is present in args. */
function hasYesFlag(args: string[]): boolean {
  return args.includes("--yes") || args.includes("-y");
}

/** Strip --yes, -y flags from args before passing to interactive runner. */
function stripFlags(args: string[]): string[] {
  return args.filter((a) => a !== "--yes" && a !== "-y");
}

/**
 * Confirm regression with the user (unless skipped), then reset git and machine state.
 *
 * Steps:
 * 1. Show warning about what will be lost
 * 2. Prompt for confirmation (unless --yes or watch-loop)
 * 3. Execute git reset to predecessor tag
 * 4. Send REGRESS event to machine
 * 5. Persist updated manifest
 */
async function confirmAndReset(opts: {
  slug: string;
  manifest: PipelineManifest;
  phase: Phase;
  predecessorPhase: Phase;
  resetTag: string;
  skipPrompt: boolean;
  projectRoot: string;
  logger: ReturnType<typeof createLogger>;
}): Promise<void> {
  const warning = formatRegressionWarning(
    opts.slug,
    opts.manifest.phase,
    opts.phase,
    opts.resetTag,
  );

  if (!opts.skipPrompt) {
    process.stdout.write(`\n${warning}\n\n`);

    const answer = await promptYesNo("Proceed with regression?");
    if (!answer) {
      opts.logger.log("Regression cancelled");
      process.exit(0);
    }
  } else {
    opts.logger.log(warning);
  }

  // Execute git reset
  const { resetSha } = await executeRegression({
    slug: opts.slug,
    predecessorPhase: opts.predecessorPhase,
    resetTag: opts.resetTag,
    cwd: opts.projectRoot,
  });
  opts.logger.log(`Reset to ${opts.resetTag} (${resetSha.slice(0, 8)})`);

  // Send REGRESS to machine and persist
  const epicContext = opts.manifest as unknown as EpicContext;
  const resolvedSnapshot = epicMachine.resolveState({
    value: opts.manifest.phase,
    context: epicContext,
  });
  const actor = createActor(epicMachine, {
    snapshot: resolvedSnapshot,
    input: epicContext,
  });
  actor.start();
  actor.send({ type: "REGRESS", targetPhase: opts.phase });

  const finalSnapshot = actor.getSnapshot();
  const finalPhase = (typeof finalSnapshot.value === "string"
    ? finalSnapshot.value
    : opts.manifest.phase) as Phase;

  store.save(opts.projectRoot, opts.slug, {
    ...(finalSnapshot.context as unknown as PipelineManifest),
    phase: finalPhase,
  } as PipelineManifest);

  actor.stop();
  opts.logger.log(`Manifest regressed to ${finalPhase}`);
}

/** Simple yes/no prompt on stdin. Returns true for yes. */
async function promptYesNo(question: string): Promise<boolean> {
  process.stdout.write(`${question} [y/N] `);

  return new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.setEncoding("utf-8");
    stdin.resume();
    stdin.once("data", (data: string) => {
      stdin.pause();
      const answer = data.trim().toLowerCase();
      resolve(answer === "y" || answer === "yes");
    });
  });
}

