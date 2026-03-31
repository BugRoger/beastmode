/**
 * Post-dispatch hook — runs after every phase dispatch to update the
 * manifest and sync state to GitHub.
 *
 * Stateless, post-only design: reads the phase output file from the
 * worktree, enriches the manifest, optionally advances the phase,
 * then mirrors state to GitHub via syncGitHub. Never throws — all
 * errors are caught and logged with a [post-dispatch] prefix.
 */

import type { Phase } from "./types";
import type { PipelineManifest } from "./manifest-store";
import type { Logger } from "./logger";
import * as store from "./manifest-store";
import { enrich, advancePhase, markFeature, shouldAdvance, regressPhase } from "./manifest";
import { extractFeatureStatuses, extractArtifactPaths, loadWorktreePhaseOutput, loadWorktreeFeatureOutput } from "./phase-output";
import { syncGitHub } from "./github-sync";
import { discoverGitHub } from "./github-discovery";
import { loadConfig } from "./config";
import { createLogger } from "./logger";
import { renameEpicSlug } from "./rename-slug";

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
  /** Optional logger — defaults to createLogger(0, "post-dispatch") */
  logger?: Logger;
}

/**
 * Run post-dispatch processing: read phase output, enrich the manifest,
 * determine if the phase should advance, and sync state to GitHub.
 *
 * Never throws. All errors are caught and logged as warnings so a sync
 * failure never blocks the pipeline.
 */
export async function runPostDispatch(opts: PostDispatchOptions): Promise<void> {
  const logger = opts.logger ?? createLogger(0, "post-dispatch");
  try {
    // Early exit on failure — no manifest/sync updates
    if (!opts.success) {
      logger.log(`Phase ${opts.phase} failed for ${opts.epicSlug} — skipping updates`);
      return;
    }

    // Load phase output from the worktree artifacts dir (where the stop hook writes)
    const output = loadWorktreePhaseOutput(opts.worktreePath, opts.phase);
    if (output) {
      logger.debug(`Loaded phase output for ${opts.phase}/${opts.epicSlug} (status: ${output.status})`);
    } else {
      logger.debug(`No phase output found for ${opts.phase}/${opts.epicSlug} — continuing without enrichment`);
    }

    // Load the manifest
    let manifest = store.load(opts.projectRoot, opts.epicSlug);
    if (!manifest) {
      logger.debug(`No manifest found for ${opts.epicSlug} — cannot update`);
      return;
    }
    logger.debug(`Loaded manifest for ${opts.epicSlug} (phase: ${manifest.phase})`);

    // Enrich manifest from phase output
    if (output) {
      const artifactPaths = extractArtifactPaths(output);
      const featureStatuses = extractFeatureStatuses(output);

      // Build enrichment payload
      const features = featureStatuses.length > 0
        ? featureStatuses.map((f) => ({
            slug: f.slug,
            plan: "",
            status: f.status as PipelineManifest["features"][number]["status"],
          }))
        : undefined;

      manifest = enrich(manifest, {
        phase: opts.phase,
        features,
        artifacts: artifactPaths.length > 0 ? artifactPaths : undefined,
      });
      store.save(opts.projectRoot, opts.epicSlug, manifest);
      logger.debug(`Enriched manifest (artifacts: ${artifactPaths.length}, features: ${featureStatuses.length})`);
    }

    // Design post-dispatch rename: rename hex slug to real slug from PRD
    let activeSlug = opts.epicSlug;
    if (opts.phase === "design" && output) {
      const designArtifacts = output.artifacts as unknown as Record<string, unknown>;
      const realSlug = typeof designArtifacts.slug === "string" ? designArtifacts.slug : undefined;
      if (realSlug && realSlug !== opts.epicSlug) {
        try {
          const renameResult = await renameEpicSlug({
            hexSlug: opts.epicSlug,
            realSlug,
            projectRoot: opts.projectRoot,
          });
          if (renameResult.renamed) {
            activeSlug = renameResult.finalSlug;
            manifest = store.load(opts.projectRoot, activeSlug) ?? manifest;
            logger.log(`Renamed epic: ${opts.epicSlug} -> ${activeSlug}`);
          } else if (renameResult.error) {
            logger.debug(`Rename failed (non-blocking): ${renameResult.error}`);
            logger.debug(`Continuing under hex name: ${opts.epicSlug}`);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.debug(`Rename error (non-blocking): ${msg}`);
        }
      }
    }

    // Handle implement fan-out: mark individual feature as completed only if output confirms
    if (opts.phase === "implement" && opts.featureSlug) {
      const featureOutput = loadWorktreeFeatureOutput(opts.worktreePath, opts.phase, opts.epicSlug, opts.featureSlug);
      if (featureOutput?.status === "completed") {
        manifest = markFeature(manifest, opts.featureSlug, "completed");
        store.save(opts.projectRoot, activeSlug, manifest);
        logger.debug(`Marked feature ${opts.featureSlug} as completed (output verified)`);
      } else {
        logger.debug(`Feature ${opts.featureSlug} session exited 0 but no output.json — not marking completed`);
      }
    }

    // Handle validate regression: if validate didn't complete, regress to implement
    if (opts.phase === "validate" && output?.status !== "completed") {
      manifest = regressPhase(manifest, "implement");
      store.save(opts.projectRoot, activeSlug, manifest);
      logger.debug(`Regressed phase: validate -> implement (features reset to pending)`);
    }

    // Determine whether to advance the phase
    const nextPhase = shouldAdvance(manifest, output);
    if (nextPhase) {
      manifest = advancePhase(manifest, nextPhase);
      store.save(opts.projectRoot, activeSlug, manifest);
      logger.log(`Advanced phase: ${opts.phase} -> ${nextPhase}`);
    } else {
      logger.debug(`No phase advancement for ${opts.phase}`);
    }

    // Sync to GitHub — warn-and-continue
    try {
      const config = loadConfig(opts.projectRoot);
      if (config.github.enabled) {
        const resolved = await discoverGitHub(opts.projectRoot, config.github["project-name"]);
        if (resolved) {
          await syncGitHub(manifest, config, resolved);
          logger.debug("GitHub sync complete");
        } else {
          logger.debug("GitHub discovery failed — skipping sync");
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
