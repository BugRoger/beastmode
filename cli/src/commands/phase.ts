/**
 * `beastmode <phase> <args...>`
 *
 * Thin CLI wrapper: parses context, selects dispatch strategy, delegates to
 * pipeline/runner.run() for the full 9-step pipeline.
 *
 * Two invocation contexts:
 *   1. Manual -- user runs `beastmode design` from the project root.
 *      Delegates to the pipeline runner for worktree + dispatch + post-dispatch.
 *   2. Cmux -- the watch loop already created the worktree and CDed into it.
 *      Runs interactive dispatch only; post-dispatch is handled by the watch
 *      loop's ReconcilingFactory.
 */

import type { BeastmodeConfig } from "../config.js";
import type { Phase } from "../types.js";
import { resolve, join } from "node:path";
import { runInteractive } from "../dispatch/index.js";
import {
  isInsideWorktree,
  resolveMainCheckoutRoot,
} from "../git/index.js";
import { run as runPipeline } from "../pipeline/index.js";
import { JsonFileStore, resolveIdentifier } from "../store/index.js";
import { createLogger, createStdioSink } from "../logger.js";
import { loadWorktreePhaseOutput } from "../artifacts/index.js";
import { loadConfig, getCategoryProse } from "../config.js";
import { cancelEpic } from "./cancel-logic.js";
import {
  writeHitlSettings,
  cleanHitlSettings,
  buildPreToolUseHook,
  writeSessionStartHook,
  cleanSessionStartHook,
  writeFilePermissionSettings,
  cleanFilePermissionSettings,
  buildFilePermissionPreToolUseHooks,
  buildFilePermissionPostToolUseHooks,
} from "../hooks/index.js";

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
  const logger = createLogger(createStdioSink(verbosity), { phase });
  const inWorktree = await isInsideWorktree();
  const projectRoot = inWorktree
    ? await resolveMainCheckoutRoot()
    : process.cwd();
  const storePath = join(projectRoot, ".beastmode", "state", "store.json");
  const taskStore = new JsonFileStore(storePath);
  taskStore.load();

  let worktreeSlug: string;

  if (phase === "design") {
    if (args.length > 0) {
      logger.error(
        "The topic argument was removed. Run `beastmode design` with no arguments — the design session will ask for your problem description.",
      );
      process.exit(1);
    }
    worktreeSlug = "";
  } else {
    // Non-design phases require the epic to exist.
    // Resolution priority: store ID → store slug
    const rawSlug = args[0] || "default";
    const resolution = resolveIdentifier(taskStore, rawSlug, { resolveToEpic: true, allowPrefix: true });

    if (resolution.kind === "ambiguous") {
      const ids = resolution.matches.map(e => e.id).join(", ");
      logger.error("ambiguous identifier", { identifier: rawSlug, matches: ids });
      process.exit(1);
    }

    if (resolution.kind === "not-found") {
      logger.error("epic not found", { slug: rawSlug });
      process.exit(1);
    }

    worktreeSlug = resolution.kind === "found" && resolution.entity.type === "epic"
      ? resolution.entity.slug
      : rawSlug;
  }

  const epicSlug = worktreeSlug;

  // ── Cmux path ─────────────────────────────────────────────────────────
  // Already in a worktree (cmux dispatch) — run interactive dispatch only.
  // Post-dispatch is handled by the watch loop's ReconcilingFactory.
  if (inWorktree) {
    const cwd = process.cwd();

    // Write HITL settings
    const claudeDir = resolve(cwd, ".claude");
    cleanHitlSettings(claudeDir);
    const featureSlug = phase === "implement" ? args[1] : undefined;
    const envContext = { phase, epicId: epicSlug, epicSlug, featureSlug };
    const preToolUseHook = buildPreToolUseHook(envContext);
    writeHitlSettings({ claudeDir, preToolUseHook, envContext });

    // File-permission hooks
    cleanFilePermissionSettings(claudeDir);
    const fpConfig = _config["file-permissions"];
    const fpProse = getCategoryProse(fpConfig, "claude-settings");
    const fpPreToolUseHooks = buildFilePermissionPreToolUseHooks(fpProse, fpConfig?.timeout);
    const fpPostToolUseHooks = buildFilePermissionPostToolUseHooks(phase);
    writeFilePermissionSettings({ claudeDir, preToolUseHooks: fpPreToolUseHooks, postToolUseHooks: fpPostToolUseHooks });

    // SessionStart hook
    cleanSessionStartHook(claudeDir);
    writeSessionStartHook({ claudeDir, phase, epicId: epicSlug, epicSlug, featureSlug });

    const result = await runInteractive({ phase, args, cwd });
    logger.info("phase complete", { phase, status: result.exit_status, duration: formatDuration(result.duration_ms) });
    if (result.exit_status === "error") process.exit(1);
    if (result.exit_status === "cancelled") process.exit(130);
    return;
  }

  // ── Manual path ───────────────────────────────────────────────────────
  // Full pipeline via runner: worktree + rebase + HITL + dispatch +
  // reconcile + GitHub sync + cleanup.

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
  // Use pipelineResult.epicSlug — the runner may have created a placeholder and
  // adopted a new slug that the local epicSlug variable doesn't reflect.
  if (phase === "design" && !pipelineResult.success) {
    const finalSlug = pipelineResult.epicSlug || epicSlug;
    const designOutput = loadWorktreePhaseOutput(pipelineResult.worktreePath, "design", finalSlug);
    if (!designOutput) {
      logger.info("Design abandoned — cleaning up");
      const config = loadConfig(projectRoot);
      await cancelEpic({
        identifier: finalSlug,
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

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
