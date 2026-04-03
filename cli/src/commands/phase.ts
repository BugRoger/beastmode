/**
 * `beastmode <phase> <args...>`
 *
 * Thin CLI wrapper: parses context, selects dispatch strategy, delegates to
 * pipeline/runner.run() for the full 9-step pipeline.
 *
 * Two invocation contexts:
 *   1. Manual -- user runs `beastmode design <topic>` from the project root.
 *      Delegates to the pipeline runner for worktree + dispatch + post-dispatch.
 *   2. Cmux -- the watch loop already created the worktree and CDed into it.
 *      Runs interactive dispatch only; post-dispatch is handled by the watch
 *      loop's ReconcilingFactory.
 */

import type { BeastmodeConfig } from "../config";
import type { Phase } from "../types";
import { resolve } from "node:path";
import { runInteractive } from "../dispatch/factory";
import {
  enter as enterWorktree,
  isInsideWorktree,
  resolveMainCheckoutRoot,
} from "../git/worktree";
import { run as runPipeline } from "../pipeline/runner.js";
import * as store from "../manifest/store";
import { createLogger } from "../logger";
import { loadWorktreePhaseOutput } from "../artifacts/reader";
import { loadConfig } from "../config";
import { cancelEpic } from "./cancel-logic.js";
import { writeHitlSettings, cleanHitlSettings, buildPreToolUseHook, getPhaseHitlProse } from "../hooks/hitl-settings";

/**
 * Execute a phase command. Called directly from the top-level router.
 * Phase is already validated by the argument parser.
 */
export async function phaseCommand(
  phase: Phase,
  args: string[],
  _config: BeastmodeConfig,
  verbosity: number = 0,
): Promise<void> {
  const logger = createLogger(verbosity, { phase });
  const inWorktree = await isInsideWorktree();
  const projectRoot = inWorktree
    ? await resolveMainCheckoutRoot()
    : process.cwd();
  const worktreeSlug = deriveWorktreeSlug(phase, args);

  // Fail-fast: non-design phases require the slug to exist in the store.
  if (phase !== "design") {
    const existing = store.find(projectRoot, worktreeSlug);
    if (!existing) {
      logger.error(`Epic "${worktreeSlug}" not found — run "beastmode design" first`);
      process.exit(1);
    }
  }

  const epicSlug = phase === "design" ? worktreeSlug : (args[0] || worktreeSlug);

  // ── Cmux path ─────────────────────────────────────────────────────────
  // Already in a worktree (cmux dispatch) — run interactive dispatch only.
  // Post-dispatch is handled by the watch loop's ReconcilingFactory.
  if (inWorktree) {
    const cwd = process.cwd();

    // Write HITL settings
    const claudeDir = resolve(cwd, ".claude");
    cleanHitlSettings(claudeDir);
    const hitlProse = getPhaseHitlProse(_config.hitl, phase);
    const preToolUseHook = buildPreToolUseHook(hitlProse, _config.hitl.model, _config.hitl.timeout);
    writeHitlSettings({ claudeDir, preToolUseHook, phase });

    const result = await runInteractive({ phase, args, cwd });
    logger.log(`${phase} ${result.exit_status} in ${formatDuration(result.duration_ms)}`);
    if (result.exit_status === "error") process.exit(1);
    if (result.exit_status === "cancelled") process.exit(130);
    return;
  }

  // ── Manual path ───────────────────────────────────────────────────────
  // Full pipeline via runner: worktree + rebase + HITL + dispatch +
  // reconcile + GitHub sync + cleanup.

  // Seed manifest for design phase so the runner can enrich it
  if (phase === "design" && !store.manifestExists(projectRoot, epicSlug)) {
    const predictedPath = enterWorktree(epicSlug, { cwd: projectRoot });
    store.create(projectRoot, epicSlug, {
      worktree: { branch: `feature/${worktreeSlug}`, path: predictedPath },
    });
  }

  // Interactive dispatch wrapper matching the runner's dispatch signature
  const dispatch = async (opts: { phase: Phase; args: string[]; cwd: string }) => {
    const result = await runInteractive({ phase: opts.phase, args: opts.args, cwd: opts.cwd });
    return { success: result.exit_status === "success", result };
  };

  const pipelineResult = await runPipeline({
    phase,
    epicSlug,
    args,
    projectRoot,
    strategy: "interactive",
    config: _config,
    logger,
    dispatch,
  });

  // Design abandon guard: if design phase produced no output, clean up everything
  if (phase === "design" && !pipelineResult.success) {
    const designOutput = loadWorktreePhaseOutput(pipelineResult.worktreePath, "design", epicSlug);
    if (!designOutput) {
      logger.log("Design abandoned — cleaning up");
      const config = loadConfig(projectRoot);
      await cancelEpic({
        identifier: epicSlug,
        projectRoot,
        githubEnabled: config.github.enabled,
        force: true,
        logger,
      });
      return;
    }
  }

  // Exit code handling
  if (!pipelineResult.success) {
    process.exit(1);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function deriveWorktreeSlug(phase: Phase, args: string[]): string {
  if (phase === "design") {
    // If an existing slug was passed (watch loop re-dispatch), reuse it
    return args[0] || randomHex(6);
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
