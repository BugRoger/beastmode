/**
 * Post-dispatch hook — routes phase outcomes through the reconcile module
 * and handles post-reconciliation tasks (design rename, phase tags, GitHub sync).
 *
 * The reconcile module owns all manifest mutations via store.transact().
 * This module is responsible only for:
 *   1. Calling the correct reconcileX function
 *   2. Creating phase tags for regression support
 *   3. Renaming design hex-slugs to real slugs
 *   4. Syncing to GitHub (warn-and-continue)
 *
 * Never throws — all errors are caught and logged with a [post-dispatch] prefix.
 */

import type { Phase } from "./types";
import type { Logger } from "./logger";
import * as store from "./manifest/store";
import { loadWorktreePhaseOutput } from "./artifacts/reader";
import { syncGitHub } from "./github/sync";
import { setGitHubEpic, setFeatureGitHubIssue, setEpicBodyHash, setFeatureBodyHash } from "./manifest/pure";
import { discoverGitHub } from "./github/discovery";
import { loadConfig } from "./config";
import { createLogger } from "./logger";
import { createTag } from "./git/tags.js";
import {
  reconcileDesign,
  reconcilePlan,
  reconcileFeature,
  reconcileImplement,
  reconcileValidate,
  reconcileRelease,
} from "./manifest/reconcile";
import type { ReconcileResult } from "./manifest/reconcile";

/** Options for the post-dispatch hook. */
export interface PostDispatchOptions {
  /** Path to the worktree where the phase ran */
  worktreePath: string;
  /** Project root (where pipeline/ lives) */
  projectRoot: string;
  /** Epic slug */
  epicSlug: string;
  /** Phase that was dispatched */
  phase: Phase;
  /** Feature slug (for implement fan-out) */
  featureSlug?: string;
  /** Whether the phase succeeded */
  success: boolean;
  /** Optional logger — defaults to createLogger(0, { phase, epic }) */
  logger?: Logger;
}

/**
 * Run post-dispatch processing: reconcile phase outcome, create phase tag,
 * handle design rename, and sync to GitHub.
 *
 * Never throws. All errors are caught and logged as warnings so a sync
 * failure never blocks the pipeline.
 */
export async function runPostDispatch(opts: PostDispatchOptions): Promise<void> {
  const logger = opts.logger ?? createLogger(0, { phase: opts.phase, epic: opts.epicSlug, ...(opts.featureSlug ? { feature: opts.featureSlug } : {}) });
  try {
    // Early exit on failure — no manifest/sync updates.
    // Exception: validate failures must reach the machine so REGRESS
    // fires and regresses the epic back to implement.
    if (!opts.success && opts.phase !== "validate") {
      logger.log("failed — skipping updates");
      return;
    }

    // Design abandon guard: if design produced no output, skip advancement.
    if (opts.phase === "design") {
      const designOutput = loadWorktreePhaseOutput(opts.worktreePath, "design", opts.epicSlug);
      if (!designOutput) {
        logger.log("no output — skipping post-dispatch");
        return;
      }
    }

    // Reconcile via the single reconcile module
    let result: ReconcileResult | undefined;

    switch (opts.phase) {
      case "design":
        result = await reconcileDesign(opts.projectRoot, opts.epicSlug, opts.worktreePath);
        break;
      case "plan":
        result = await reconcilePlan(opts.projectRoot, opts.epicSlug, opts.worktreePath);
        break;
      case "implement":
        if (opts.featureSlug) {
          result = await reconcileFeature(opts.projectRoot, opts.epicSlug, opts.featureSlug, opts.worktreePath);
        } else {
          result = await reconcileImplement(opts.projectRoot, opts.epicSlug);
        }
        break;
      case "validate":
        result = await reconcileValidate(opts.projectRoot, opts.epicSlug, opts.worktreePath);
        break;
      case "release":
        result = await reconcileRelease(opts.projectRoot, opts.epicSlug, opts.worktreePath);
        break;
    }

    if (result) {
      logger.log(`reconciled → ${result.phase}`);
    }

    // Create phase tag at current HEAD for regression support
    await createTag(opts.epicSlug, opts.phase, { cwd: opts.worktreePath });

    // Design phase: rename hex slug to real slug with collision detection
    if (opts.phase === "design" && result) {
      const finalManifest = result.manifest;
      const epicName = finalManifest.epic ?? finalManifest.slug;
      if (epicName && epicName !== opts.epicSlug) {
        const renameResult = await store.rename(
          opts.projectRoot,
          opts.epicSlug,
          epicName,
          opts.worktreePath,
        );
        if (renameResult.renamed) {
          opts.epicSlug = renameResult.finalSlug;
          logger.log(`renamed → ${renameResult.finalSlug}`);
        } else if (renameResult.error) {
          logger.warn(`Slug rename failed: ${renameResult.error}`);
        }
      }
    }

    // Sync to GitHub — warn-and-continue
    try {
      const config = loadConfig(opts.projectRoot);
      if (config.github.enabled) {
        const resolved = await discoverGitHub(opts.projectRoot, config.github["project-name"]);
        if (resolved) {
          const manifest = store.load(opts.projectRoot, opts.epicSlug);
          if (manifest) {
            const syncResult = await syncGitHub(manifest, config, resolved);

            // Apply sync mutations via transact for serialized writes
            if (syncResult.mutations.length > 0) {
              await store.transact(opts.projectRoot, opts.epicSlug, (m) => {
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
          logger.detail("GitHub discovery failed — skipping sync");
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`GitHub sync failed (non-blocking): ${message}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`Unexpected error (non-blocking): ${message}`);
  }
}
