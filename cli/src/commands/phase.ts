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
import { resolve, join } from "node:path";
import { runInteractive } from "../dispatch/factory";
import {
  enter as enterWorktree,
  isInsideWorktree,
  resolveMainCheckoutRoot,
} from "../git/worktree";
import { run as runPipeline } from "../pipeline/runner.js";
import { JsonFileStore, resolveIdentifier } from "../store/index.js";
import { createLogger, createStdioSink } from "../logger";
import { loadWorktreePhaseOutput } from "../artifacts/reader";
import { loadConfig, getCategoryProse } from "../config";
import { cancelEpic } from "./cancel-logic.js";
import { writeHitlSettings, cleanHitlSettings, buildPreToolUseHook, writeSessionStartHook, cleanSessionStartHook } from "../hooks/hitl-settings";
import {
  writeFilePermissionSettings,
  cleanFilePermissionSettings,
  buildFilePermissionPreToolUseHooks,
  buildFilePermissionPostToolUseHooks,
} from "../hooks/file-permission-settings";

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
  let worktreeSlug = deriveWorktreeSlug(phase, args);

  // Fail-fast: non-design phases require the epic to exist.
  // Resolution priority: store ID → store slug
  if (phase !== "design") {
    const storePath = join(projectRoot, ".beastmode", "state", "store.json");
    const taskStore = new JsonFileStore(storePath);
    taskStore.load();

    const resolution = resolveIdentifier(taskStore, worktreeSlug, { resolveToEpic: true, allowPrefix: true });

    if (resolution.kind === "ambiguous") {
      const ids = resolution.matches.map(e => e.id).join(", ");
      logger.error("ambiguous identifier", { identifier: worktreeSlug, matches: ids });
      process.exit(1);
    }

    if (resolution.kind === "not-found") {
      logger.error("epic not found", { slug: worktreeSlug });
      process.exit(1);
    }

    if (resolution.kind === "found" && resolution.entity.type === "epic") {
      worktreeSlug = resolution.entity.slug;
    }
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
    const envContext = { phase, epicId: epicSlug, epicSlug, featureId: phase === "implement" ? args[1] : undefined, featureSlug: phase === "implement" ? args[1] : undefined };
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
    const featureSlug = phase === "implement" ? args[1] : undefined;
    writeSessionStartHook({ claudeDir, phase, epicId: epicSlug, epicSlug, featureId: featureSlug, featureSlug });

    const result = await runInteractive({ phase, args, cwd });
    logger.info("phase complete", { phase, status: result.exit_status, duration: formatDuration(result.duration_ms) });
    if (result.exit_status === "error") process.exit(1);
    if (result.exit_status === "cancelled") process.exit(130);
    return;
  }

  // ── Manual path ───────────────────────────────────────────────────────
  // Full pipeline via runner: worktree + rebase + HITL + dispatch +
  // reconcile + GitHub sync + cleanup.

  // Seed worktree for design phase so the pipeline runner can create the epic during reconciliation
  if (phase === "design") {
    enterWorktree(epicSlug, { cwd: projectRoot });
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
      logger.info("Design abandoned — cleaning up");
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
