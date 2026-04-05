/**
 * Unified pipeline runner -- single ordered pipeline that both manual CLI
 * and watch loop call. Each entry point becomes a thin wrapper that
 * selects the dispatch strategy and calls run().
 *
 * Pipeline steps in order:
 *   1. git.worktree.prepare     -- Create/enter worktree
 *   2. git.worktree.rebase      -- Rebase onto local main (skip for design)
 *   3. settings.create          -- Write .claude/settings.local.json with hooks
 *   4. dispatch.run             -- Run session (interactive or iterm2)
 *   5. artifacts.collect        -- Read phase output.json
 *   6. manifest.reconcile       -- Update manifest from phase results
 *   7. manifest.advance         -- Advance phase, enrich metadata
 *   8. github.mirror            -- One-way sync to GitHub
 *   8.5. commit-issue-ref       -- Amend commit with issue number
 *   8.7. git.push               -- Push branches and tags to remote
 *   8.9. branch-link            -- Link branches to GitHub issues
 *   9. git.worktree.cleanup     -- Release only: archive + remove
 */

import { resolve } from "node:path";
import type { Phase, PhaseResult } from "../types.js";
import type { Logger } from "../logger.js";
import { createLogger } from "../logger.js";
import * as worktree from "../git/worktree.js";
import { rebase, createImplBranch } from "../git/worktree.js";
import { loadWorktreePhaseOutput } from "../artifacts/reader.js";
import * as store from "../manifest/store.js";
import { syncGitHub } from "../github/sync.js";
import { syncGitHubForEpic } from "../github/sync.js";
import { discoverGitHub } from "../github/discovery.js";
import type { ResolvedGitHub } from "../github/discovery.js";
import { ensureEarlyIssues } from "../github/early-issues.js";
import { setGitHubEpic, setFeatureGitHubIssue, setEpicBodyHash, setFeatureBodyHash } from "../manifest/pure.js";
import { createTag } from "../git/tags.js";
import { amendCommitsInRange } from "../git/commit-issue-ref.js";
import { linkBranches } from "../github/branch-link.js";
import { hasRemote, pushBranches, pushTags } from "../git/push.js";
import {
  reconcileDesign,
  reconcilePlan,
  reconcileFeature,
  reconcileImplement,
  reconcileValidate,
  reconcileRelease,
} from "../manifest/reconcile.js";
import type { ReconcileResult } from "../manifest/reconcile.js";
import {
  writeHitlSettings,
  cleanHitlSettings,
  buildPreToolUseHook,
  getPhaseHitlProse,
} from "../hooks/hitl-settings.js";
import {
  writeFilePermissionSettings,
  cleanFilePermissionSettings,
  buildFilePermissionPreToolUseHooks,
  buildFilePermissionPostToolUseHooks,
} from "../hooks/file-permission-settings.js";
import type { BeastmodeConfig } from "../config.js";
import { getCategoryProse } from "../config.js";

/** Dispatch strategy type -- determines how the phase session runs. */
export type DispatchStrategy = "interactive" | "iterm2";

/** Configuration for a pipeline run. */
export interface PipelineConfig {
  /** Phase to execute */
  phase: Phase;
  /** Epic slug */
  epicSlug: string;
  /** CLI arguments for the phase */
  args: string[];
  /** Project root (where .beastmode/ lives) */
  projectRoot: string;
  /** Dispatch strategy */
  strategy: DispatchStrategy;
  /** Feature slug (for implement fan-out) */
  featureSlug?: string;
  /** Beastmode configuration */
  config: BeastmodeConfig;
  /** Optional logger */
  logger?: Logger;
  /** Pre-resolved GitHub metadata (watch loop pre-discovers once) */
  resolved?: ResolvedGitHub;
  /**
   * Dispatch function -- called at step 4 with the worktree path.
   * Interactive: runs claude CLI with stdin/stdout.
   * SDK/cmux/iterm2: runs via respective session factories.
   * Returns a result indicating success/failure.
   */
  dispatch: (opts: { phase: Phase; args: string[]; cwd: string }) => Promise<{ success: boolean; result?: PhaseResult }>;
  /**
   * Whether this is an automated (watch loop) run vs manual CLI.
   * Controls whether we skip certain steps (e.g., manual already in worktree).
   */
  skipWorktreeSetup?: boolean;
  /**
   * Skip pre-dispatch steps (worktree prepare, rebase, settings write).
   * Used by watch loop where the session factory handles these before dispatch.
   * When true, steps 1-3 are skipped entirely and only the worktree path is computed.
   */
  skipPreDispatch?: boolean;
}

/** Result of a pipeline run. */
export interface PipelineResult {
  /** Whether the overall pipeline succeeded */
  success: boolean;
  /** The worktree path used */
  worktreePath: string;
  /** Epic slug (may change after design rename) */
  epicSlug: string;
  /** Reconcile result if available */
  reconcileResult?: ReconcileResult;
}

/**
 * Run the unified pipeline -- 9 steps in order.
 *
 * Never throws. All errors are caught and logged so a sync
 * failure never blocks the pipeline.
 */
export async function run(config: PipelineConfig): Promise<PipelineResult> {
  const logger = config.logger ?? createLogger(0, { phase: config.phase, epic: config.epicSlug });
  let epicSlug = config.epicSlug;
  let worktreePath: string;

  if (config.skipPreDispatch) {
    // Watch loop path: dispatchPhase() in watch.ts handles worktree creation,
    // rebase onto main, and HITL settings write before SDK dispatch.
    // The runner only needs the worktree path for post-dispatch steps (5-9).
    worktreePath = resolve(config.projectRoot, ".claude", "worktrees", epicSlug);
  } else {
    // -- Step 1: git.worktree.prepare -----------------------------------------
    if (config.skipWorktreeSetup) {
      // Cmux / manual already created the worktree
      worktreePath = resolve(config.projectRoot, ".claude", "worktrees", epicSlug);
    } else {
      const wt = await worktree.create(epicSlug, { cwd: config.projectRoot });
      worktreePath = wt.path;
    }
    logger.log(`worktree: ${worktreePath}`);

    // -- Step 2: git.worktree.rebase ------------------------------------------
    const rebaseResult = await rebase(config.phase, { cwd: worktreePath, logger });
    logger.detail?.(`rebase: ${rebaseResult.outcome}`);
    if (rebaseResult.outcome === "stale") {
      logger.warn(`worktree is stale — agent may encounter missing dependencies`);
    }

    // -- Step 3: settings.create ----------------------------------------------
    const claudeDir = resolve(worktreePath, ".claude");
    cleanHitlSettings(claudeDir);
    const hitlProse = getPhaseHitlProse(config.config.hitl, config.phase);
    const preToolUseHook = buildPreToolUseHook(hitlProse, config.config.hitl.timeout);
    writeHitlSettings({ claudeDir, preToolUseHook, phase: config.phase });

    // File-permission hooks
    cleanFilePermissionSettings(claudeDir);
    const fpProse = getCategoryProse(config.config["file-permissions"], "claude-settings");
    const fpPreToolUseHooks = buildFilePermissionPreToolUseHooks(fpProse, config.config["file-permissions"].timeout);
    const fpPostToolUseHooks = buildFilePermissionPostToolUseHooks(config.phase);
    writeFilePermissionSettings({ claudeDir, preToolUseHooks: fpPreToolUseHooks, postToolUseHooks: fpPostToolUseHooks });
  }

  // Create impl branch for implement phase (idempotent — skips if exists)
  if (config.phase === "implement" && config.featureSlug) {
    try {
      const implBranch = await createImplBranch(config.epicSlug, config.featureSlug, { cwd: worktreePath });
      logger.log(`impl branch: ${implBranch}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`impl branch creation failed: ${message}`);
    }
  }

  // -- Step 3.5: github.early-issues -----------------------------------------
  // Create stub GitHub issues before dispatch so issue numbers are available
  // for commit references from the first commit.
  if (!config.skipPreDispatch) {
    try {
      await ensureEarlyIssues({
        phase: config.phase,
        epicSlug,
        projectRoot: config.projectRoot,
        config: config.config,
        resolved: config.resolved,
        logger,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`early issue creation failed (non-blocking): ${message}`);
    }
  }

  // -- Step 4: dispatch.run ---------------------------------------------------
  const dispatchResult = await config.dispatch({ phase: config.phase, args: config.args, cwd: worktreePath });

  if (!dispatchResult.success && config.phase !== "validate") {
    // Early exit on failure -- no manifest/sync updates.
    // Exception: validate failures must reach the machine so REGRESS fires.
    logger.log("dispatch failed -- skipping post-dispatch steps");
    return { success: false, worktreePath, epicSlug };
  }

  // -- Step 5: artifacts.collect ----------------------------------------------
  const phaseOutput = loadWorktreePhaseOutput(worktreePath, config.phase, epicSlug);

  // Design abandon guard: if design produced no output, skip everything
  if (config.phase === "design" && !phaseOutput) {
    logger.log("no output -- skipping post-dispatch");
    return { success: dispatchResult.success, worktreePath, epicSlug };
  }

  // -- Step 6 & 7: manifest.reconcile + manifest.advance ----------------------
  let reconcileResult: ReconcileResult | undefined;
  try {
    switch (config.phase) {
      case "design":
        reconcileResult = await reconcileDesign(config.projectRoot, epicSlug, worktreePath);
        break;
      case "plan":
        reconcileResult = await reconcilePlan(config.projectRoot, epicSlug, worktreePath);
        break;
      case "implement":
        if (config.featureSlug) {
          reconcileResult = await reconcileFeature(config.projectRoot, epicSlug, config.featureSlug, worktreePath);
        } else {
          reconcileResult = await reconcileImplement(config.projectRoot, epicSlug);
        }
        break;
      case "validate":
        reconcileResult = await reconcileValidate(config.projectRoot, epicSlug, worktreePath);
        break;
      case "release":
        reconcileResult = await reconcileRelease(config.projectRoot, epicSlug, worktreePath);
        break;
    }

    if (reconcileResult) {
      logger.log(`reconciled -> ${reconcileResult.phase}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`reconciliation failed: ${message}`);
  }

  // Create phase tag at current HEAD for regression support
  try {
    await createTag(epicSlug, config.phase, { cwd: worktreePath });
  } catch (err: unknown) {
    // Non-blocking -- tag creation failure shouldn't halt pipeline
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`tag creation failed: ${message}`);
  }

  // Design phase: rename hex slug to real slug
  if (config.phase === "design" && reconcileResult) {
    const finalManifest = reconcileResult.manifest;
    const epicName = finalManifest.epic ?? finalManifest.slug;
    if (epicName && epicName !== epicSlug) {
      const renameResult = await store.rename(
        config.projectRoot,
        epicSlug,
        epicName,
        worktreePath,
      );
      if (renameResult.renamed) {
        epicSlug = renameResult.finalSlug;
        logger.log(`renamed -> ${renameResult.finalSlug}`);
      } else if (renameResult.error) {
        logger.warn(`Slug rename failed: ${renameResult.error}`);
      }
    }
  }

  // -- Step 8: github.mirror --------------------------------------------------
  try {
    if (config.resolved) {
      // Watch loop path -- uses pre-resolved GitHub data
      await syncGitHubForEpic({
        projectRoot: config.projectRoot,
        epicSlug,
        resolved: config.resolved,
        logger,
      });
      logger.log("GitHub sync complete");
    } else {
      // Manual CLI path -- discover and sync
      const beastConfig = config.config;
      if (beastConfig.github.enabled) {
        const resolved = await discoverGitHub(config.projectRoot, beastConfig.github["project-name"]);
        if (resolved) {
          const manifest = store.load(config.projectRoot, epicSlug);
          if (manifest) {
            const syncResult = await syncGitHub(manifest, beastConfig, resolved, {
              logger,
              projectRoot: config.projectRoot,
            });

            if (syncResult.mutations.length > 0) {
              await store.transact(config.projectRoot, epicSlug, (m) => {
                let updated = m;
                for (const mutation of syncResult.mutations) {
                  switch (mutation.type) {
                    case "setEpic":
                      updated = setGitHubEpic(updated, mutation.epicNumber, mutation.repo);
                      break;
                    case "setFeatureIssue":
                      updated = setFeatureGitHubIssue(updated, mutation.featureSlug, mutation.issueNumber);
                      break;
                    case "setEpicBodyHash":
                      updated = setEpicBodyHash(updated, mutation.bodyHash);
                      break;
                    case "setFeatureBodyHash":
                      updated = setFeatureBodyHash(updated, mutation.featureSlug, mutation.bodyHash);
                      break;
                  }
                }
                return updated;
              });
            }

            logger.log("GitHub sync complete");
          }
        } else {
          logger.detail?.("GitHub discovery failed -- skipping sync");
        }
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`GitHub sync failed (non-blocking): ${message}`);
  }

  // -- Step 8.5: commit-issue-ref --------------------------------------------
  // Amend all commits since the last phase tag to append GitHub issue refs (#N).
  // Runs post-sync so issue numbers from early-issues or sync are available.
  // Runs pre-push so no force-push is needed.
  try {
    const manifest = store.load(config.projectRoot, epicSlug);
    if (manifest) {
      const rangeResult = await amendCommitsInRange(manifest, epicSlug, config.phase, { cwd: worktreePath });
      if (rangeResult.amended > 0) {
        logger.detail?.(`commit refs: ${rangeResult.amended} amended, ${rangeResult.skipped} skipped`);
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`commit issue ref failed (non-blocking): ${message}`);
  }

  // -- Step 8.7: git.push --------------------------------------------------
  // Push branches and tags to remote. Pure git operation — not gated on
  // github.enabled. Warn-and-continue on failure.
  try {
    const remoteExists = await hasRemote({ cwd: worktreePath });
    if (remoteExists) {
      await pushBranches({
        epicSlug,
        phase: config.phase,
        featureSlug: config.featureSlug,
        cwd: worktreePath,
      });
      await pushTags({ cwd: worktreePath });
      logger.detail?.("pushed branches and tags");
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`git push failed (non-blocking): ${message}`);
  }

  // -- Step 8.9: branch-link -------------------------------------------------
  // Link branches to GitHub issues via createLinkedBranch GraphQL mutation.
  // Gated on github.enabled — pure git push (step 8.7) always runs.
  // Warn-and-continue on failure.
  try {
    const beastConfig = config.config;
    if (beastConfig.github.enabled) {
      const manifest = store.load(config.projectRoot, epicSlug);
      if (manifest?.github) {
        const featureIssueNumber = config.featureSlug
          ? manifest.features.find((f) => f.slug === config.featureSlug)?.github?.issue
          : undefined;
        await linkBranches({
          repo: manifest.github.repo,
          epicSlug,
          epicIssueNumber: manifest.github.epic,
          featureSlug: config.featureSlug,
          featureIssueNumber,
          phase: config.phase,
          cwd: worktreePath,
          logger,
        });
        logger.detail?.("branch linking complete");
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`branch linking failed (non-blocking): ${message}`);
  }

  // -- Step 9: git.worktree.cleanup -------------------------------------------
  if (config.phase === "release" && dispatchResult.success) {
    try {
      logger.log("release teardown -- archiving branch...");
      const tagName = await worktree.archive(epicSlug, { cwd: config.projectRoot });
      logger.log(`archived as ${tagName}`);

      await worktree.remove(epicSlug, { cwd: config.projectRoot });
      logger.log("worktree removed");

      // Mark manifest as done so scanner skips it
      const doneManifest = store.load(config.projectRoot, epicSlug);
      if (doneManifest) {
        store.save(config.projectRoot, epicSlug, { ...doneManifest, phase: "done", lastUpdated: new Date().toISOString() });
      }
      logger.log("manifest marked done");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`release teardown failed: ${message}`);
      logger.error("worktree preserved for manual cleanup");
      return { success: false, worktreePath, epicSlug, reconcileResult };
    }
  }

  return { success: dispatchResult.success, worktreePath, epicSlug, reconcileResult };
}
