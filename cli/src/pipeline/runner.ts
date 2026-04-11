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
import { renameSync, existsSync, writeFileSync as fsWriteFileSync } from "node:fs";
import type { Phase, PhaseResult } from "../types.js";
import type { Logger } from "../logger.js";
import { createLogger, createStdioSink } from "../logger.js";
import * as worktree from "../git/worktree.js";
import { rebase } from "../git/worktree.js";
import { loadWorktreePhaseOutput } from "../artifacts/reader.js";
import { syncGitHubForEpic } from "../github/sync.js";
import { discoverGitHub } from "../github/discovery.js";
import type { ResolvedGitHub } from "../github/discovery.js";
import { ensureEarlyIssues } from "../github/early-issues.js";
import { createTag } from "../git/tags.js";
import { amendCommitsInRange } from "../git/commit-issue-ref.js";
import { loadSyncRefs, getSyncRef } from "../github/sync-refs.js";
import { JsonFileStore } from "../store/json-file-store.js";
import { linkBranches } from "../github/branch-link.js";
import { hasRemote, pushBranches, pushTags } from "../git/push.js";
import {
  reconcileDesign,
  reconcilePlan,
  reconcileFeature,
  reconcileImplement,
  reconcileValidate,
  reconcileRelease,
} from "./reconcile.js";
import type { ReconcileResult } from "./reconcile.js";
import {
  writeHitlSettings,
  cleanHitlSettings,
  buildPreToolUseHook,
  writeSessionStartHook,
  cleanSessionStartHook,
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
  /** Epic entity ID (for store lookups) */
  epicId?: string;
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
  const logger = config.logger ?? createLogger(createStdioSink(0), { phase: config.phase, epic: config.epicSlug });
  let epicSlug = config.epicSlug;
  let worktreePath: string;

  if (config.skipPreDispatch) {
    // Watch loop path: dispatchPhase() in watch.ts handles worktree creation,
    // rebase onto main, and HITL settings write before SDK dispatch.
    // The runner only needs the worktree path for post-dispatch steps (5-9).
    worktreePath = resolve(config.projectRoot, ".claude", "worktrees", epicSlug);
  } else {
    // -- Step 0: pre-dispatch entity creation ---------------------------------
    // Load or create the store entity before dispatch so the entity ID is
    // available from the first hook invocation.
    try {
      const storeFile = resolve(config.projectRoot, ".beastmode", "state", "store.json");
      const store = new JsonFileStore(storeFile);
      store.load();

      // For design phase: check if entity exists. If not, create it.
      // For other phases: look up existing entity.
      if (config.phase === "design") {
        const existingEntity = store.find(epicSlug);
        if (!existingEntity) {
          const newEpic = store.addEpic({ name: epicSlug });
          config.epicId = newEpic.id;
          logger.debug?.(`created store entity: ${newEpic.id}`);
        } else {
          config.epicId = existingEntity.id;
          logger.debug?.(`found existing entity: ${existingEntity.id}`);
        }
      } else {
        // Non-design phases: look up existing entity
        const entity = store.find(epicSlug);
        if (entity) {
          config.epicId = entity.id;
        }
      }

      store.save();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`store entity creation failed: ${message}`);
    }

    // -- Step 1: git.worktree.prepare -----------------------------------------
    if (config.skipWorktreeSetup) {
      // Cmux / manual already created the worktree
      worktreePath = resolve(config.projectRoot, ".claude", "worktrees", epicSlug);
    } else {
      const wt = await worktree.create(epicSlug, { cwd: config.projectRoot });
      worktreePath = wt.path;
    }
    logger.info(`worktree: ${worktreePath}`);

    // -- Step 0b: update store entity with worktree metadata -------------------
    // After worktree is created, update the store entity with the worktree path
    // and branch info so the entity has complete metadata from the start.
    if (config.epicId && config.phase === "design") {
      try {
        const storeFile = resolve(config.projectRoot, ".beastmode", "state", "store.json");
        const store = new JsonFileStore(storeFile);
        store.load();
        store.updateEpic(config.epicId, {
          worktree: {
            branch: `feature/${epicSlug}`,
            path: worktreePath,
          },
        });
        store.save();
        logger.debug?.(`updated store entity with worktree metadata`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn(`store worktree metadata update failed: ${message}`);
      }
    }

    // -- Step 2: git.worktree.rebase ------------------------------------------
    const rebaseResult = await rebase(config.phase, { cwd: worktreePath, logger });
    logger.debug?.(`rebase: ${rebaseResult.outcome}`);
    if (rebaseResult.outcome === "stale") {
      logger.warn(`worktree is stale — agent may encounter missing dependencies`);
    }

    // -- Step 3: settings.create ----------------------------------------------
    const claudeDir = resolve(worktreePath, ".claude");
    cleanHitlSettings(claudeDir);
    const envContext = { phase: config.phase, epicId: config.epicId ?? config.epicSlug, epicSlug: config.epicSlug, featureSlug: config.featureSlug };
    const preToolUseHook = buildPreToolUseHook(envContext);
    writeHitlSettings({ claudeDir, preToolUseHook, envContext });

    // File-permission hooks
    cleanFilePermissionSettings(claudeDir);
    const fpConfig = config.config["file-permissions"];
    const fpProse = getCategoryProse(fpConfig, "claude-settings");
    const fpPreToolUseHooks = buildFilePermissionPreToolUseHooks(fpProse, fpConfig?.timeout);
    const fpPostToolUseHooks = buildFilePermissionPostToolUseHooks(config.phase);
    writeFilePermissionSettings({ claudeDir, preToolUseHooks: fpPreToolUseHooks, postToolUseHooks: fpPostToolUseHooks });

    // Session-start hook
    cleanSessionStartHook(claudeDir);
    writeSessionStartHook({
      claudeDir,
      phase: config.phase,
      epicId: config.epicId ?? config.epicSlug,
      epicSlug: config.epicSlug,
      featureSlug: config.featureSlug,
    });
  }

  // -- Step 3.5: github.early-issues -----------------------------------------
  // Create stub GitHub issues before dispatch so issue numbers are available
  // for commit references from the first commit.
  if (!config.skipPreDispatch) {
    try {
      const taskStore = new JsonFileStore(resolve(config.projectRoot, ".beastmode", "state", "store.json"));
      taskStore.load();
      // Find epic by ID if available, otherwise resolve via slug
      let epicEntity = config.epicId ? taskStore.getEpic(config.epicId) : undefined;
      if (!epicEntity) {
        // Fallback for design phase: resolve by slug first
        const allEpics = taskStore.listEpics().filter((e) => e.slug === epicSlug);
        if (allEpics.length > 0) {
          epicEntity = allEpics[0];
        }
      }
      if (epicEntity) {
        await ensureEarlyIssues({
          phase: config.phase,
          epicId: epicEntity.id,
          projectRoot: config.projectRoot,
          config: config.config,
          store: taskStore,
          resolved: config.resolved,
          logger,
        });
      }
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
    logger.info("dispatch failed -- skipping post-dispatch steps");
    return { success: false, worktreePath, epicSlug };
  }

  // -- Step 5: artifacts.collect ----------------------------------------------
  const phaseOutput = loadWorktreePhaseOutput(worktreePath, config.phase, epicSlug);

  // Design abandon guard: if design produced no output, skip everything
  if (config.phase === "design" && !phaseOutput) {
    logger.info("no output -- skipping post-dispatch");
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
        reconcileResult = await reconcilePlan(config.projectRoot, config.epicId ?? epicSlug, worktreePath);
        break;
      case "implement":
        if (config.featureSlug) {
          reconcileResult = await reconcileFeature(config.projectRoot, config.epicId ?? epicSlug, config.featureSlug, worktreePath);
        } else {
          reconcileResult = await reconcileImplement(config.projectRoot, config.epicId ?? epicSlug);
        }
        break;
      case "validate":
        reconcileResult = await reconcileValidate(config.projectRoot, config.epicId ?? epicSlug, worktreePath);
        break;
      case "release":
        reconcileResult = await reconcileRelease(config.projectRoot, config.epicId ?? epicSlug, worktreePath);
        break;
    }

    if (reconcileResult) {
      logger.info(`reconciled -> ${reconcileResult.phase}`);
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

  // Design phase: update slug to real slug and rename worktree directory
  if (config.phase === "design" && reconcileResult) {
    const finalEpic = reconcileResult.epic;
    if (finalEpic.slug && finalEpic.slug !== epicSlug) {
      // Rename the worktree directory, git branch, and git metadata
      const oldWtPath = resolve(config.projectRoot, ".claude", "worktrees", epicSlug);
      const newWtPath = resolve(config.projectRoot, ".claude", "worktrees", finalEpic.slug);
      const oldBranch = `feature/${epicSlug}`;
      const newBranch = `feature/${finalEpic.slug}`;
      if (existsSync(oldWtPath)) {
        try {
          // Rename git branch
          await worktree.git(["branch", "-m", oldBranch, newBranch], { cwd: config.projectRoot });

          // Move worktree directory
          renameSync(oldWtPath, newWtPath);

          // Repair git worktree metadata
          const gitDir = resolve(config.projectRoot, ".git", "worktrees", epicSlug);
          const newGitDir = resolve(config.projectRoot, ".git", "worktrees", finalEpic.slug);
          if (existsSync(gitDir)) {
            renameSync(gitDir, newGitDir);
            fsWriteFileSync(resolve(newWtPath, ".git"), `gitdir: ${newGitDir}\n`);
            const gitdirPath = resolve(newGitDir, "gitdir");
            if (existsSync(gitdirPath)) {
              fsWriteFileSync(gitdirPath, `${newWtPath}/.git\n`);
            }
          }
          await worktree.git(["worktree", "repair"], { cwd: config.projectRoot, allowFailure: true });

          worktreePath = newWtPath;
          logger.info(`worktree renamed -> ${finalEpic.slug}`);

          // Update the store's worktree path
          const renameStore = new JsonFileStore(resolve(config.projectRoot, ".beastmode", "state", "store.json"));
          renameStore.load();
          const renamedEntity = renameStore.getEpic(finalEpic.id);
          if (renamedEntity) {
            renameStore.updateEpic(renamedEntity.id, {
              worktree: { branch: newBranch, path: newWtPath },
            });
            renameStore.save();
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          logger.warn(`worktree rename failed: ${message}`);
        }
      }

      epicSlug = finalEpic.slug;
      logger.info(`slug updated -> ${finalEpic.slug}`);
    }
  }

  // -- Step 8: github.mirror --------------------------------------------------
  try {
    const taskStore = new JsonFileStore(resolve(config.projectRoot, ".beastmode", "state", "store.json"));
    taskStore.load();
    // Find epic by ID if available, otherwise resolve via slug
    let epicEntity = config.epicId ? taskStore.getEpic(config.epicId) : undefined;
    if (!epicEntity) {
      // Fallback: resolve by slug
      const allEpics = taskStore.listEpics().filter((e) => e.slug === epicSlug);
      if (allEpics.length > 0) {
        epicEntity = allEpics[0];
      }
    }
    if (epicEntity) {
      const resolved = config.resolved ?? (config.config.github.enabled
        ? await discoverGitHub(config.projectRoot, config.config.github["project-name"])
        : undefined);
      if (resolved) {
        await syncGitHubForEpic({
          projectRoot: config.projectRoot,
          epicId: epicEntity.id,
          epicSlug,
          store: taskStore,
          resolved,
          logger,
        });
        logger.info("GitHub sync complete");
      } else {
        logger.debug?.("GitHub discovery failed -- skipping sync");
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
    const syncRefs = loadSyncRefs(config.projectRoot);
    const taskStore = new JsonFileStore(resolve(config.projectRoot, ".beastmode", "state", "store.json"));
    taskStore.load();
    // Find epic by ID if available, otherwise resolve via slug
    let epicEntity = config.epicId ? taskStore.getEpic(config.epicId) : undefined;
    if (!epicEntity) {
      // Fallback: resolve by slug
      const allEpics = taskStore.listEpics().filter((e) => e.slug === epicSlug);
      if (allEpics.length > 0) {
        epicEntity = allEpics[0];
      }
    }
    if (epicEntity) {
      const features = taskStore.listFeatures(epicEntity.id).map((f) => ({ id: f.id, slug: f.slug }));
      const rangeResult = await amendCommitsInRange(syncRefs, epicEntity.id, features, epicSlug, config.phase, { cwd: worktreePath });
      if (rangeResult.amended > 0) {
        logger.debug?.(`commit refs: ${rangeResult.amended} amended, ${rangeResult.skipped} skipped`);
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
      logger.debug?.("pushed branches and tags");
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
      const syncRefs = loadSyncRefs(config.projectRoot);
      const taskStore = new JsonFileStore(resolve(config.projectRoot, ".beastmode", "state", "store.json"));
      taskStore.load();
      // Find epic by ID if available, otherwise resolve via slug
      let epicEntity = config.epicId ? taskStore.getEpic(config.epicId) : undefined;
      if (!epicEntity) {
        // Fallback: resolve by slug
        const allEpics = taskStore.listEpics().filter((e) => e.slug === epicSlug);
        if (allEpics.length > 0) {
          epicEntity = allEpics[0];
        }
      }
      if (epicEntity) {
        const epicRef = getSyncRef(syncRefs, epicEntity.id);
        if (epicRef) {
          let featureIssueNumber: number | undefined;
          if (config.featureSlug) {
            const features = taskStore.listFeatures(epicEntity.id);
            const feat = features.find((f) => f.slug === config.featureSlug);
            if (feat) featureIssueNumber = getSyncRef(syncRefs, feat.id)?.issue;
          }
          // Discover repo from sync ref or discovery
          const resolved = config.resolved ?? await discoverGitHub(config.projectRoot, beastConfig.github["project-name"]);
          if (resolved) {
            await linkBranches({
              repo: resolved.repo,
              epicSlug,
              epicIssueNumber: epicRef.issue,
              featureSlug: config.featureSlug,
              featureIssueNumber,
              phase: config.phase,
              cwd: worktreePath,
              logger,
            });
            logger.debug?.("branch linking complete");
          }
        }
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`branch linking failed (non-blocking): ${message}`);
  }

  // -- Step 9: git.worktree.cleanup -------------------------------------------
  if (config.phase === "release" && dispatchResult.success) {
    try {
      logger.info("release teardown -- archiving branch...");
      const tagName = await worktree.archive(epicSlug, { cwd: config.projectRoot });
      logger.info(`archived as ${tagName}`);

      await worktree.remove(epicSlug, { cwd: config.projectRoot });
      logger.info("worktree removed");

      // Mark store entity as done so scanner skips it
      const doneStore = new JsonFileStore(resolve(config.projectRoot, ".beastmode", "state", "store.json"));
      doneStore.load();
      // Find epic by ID if available, otherwise resolve via slug
      let doneEntity = config.epicId ? doneStore.getEpic(config.epicId) : undefined;
      if (!doneEntity) {
        // Fallback: resolve by slug
        const allEpics = doneStore.listEpics().filter((e) => e.slug === epicSlug);
        if (allEpics.length > 0) {
          doneEntity = allEpics[0];
        }
      }
      if (doneEntity) {
        doneStore.updateEpic(doneEntity.id, { status: "done", updated_at: new Date().toISOString() });
        doneStore.save();
      }
      logger.info("store entity marked done");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`release teardown failed: ${message}`);
      logger.error("worktree preserved for manual cleanup");
      return { success: false, worktreePath, epicSlug, reconcileResult };
    }
  }

  return { success: dispatchResult.success, worktreePath, epicSlug, reconcileResult };
}
