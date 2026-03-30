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
import * as store from "./manifest-store";
import { enrich, advancePhase, markFeature, shouldAdvance, regressPhase, setGitHubEpic, setFeatureGitHubIssue } from "./manifest";
import { extractFeatureStatuses, extractArtifactPaths, loadWorktreePhaseOutput, loadWorktreeFeatureOutput } from "./phase-output";
import { syncGitHub } from "./github-sync";
import { discoverGitHub } from "./github-discovery";
import { loadConfig } from "./config";

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
}

/**
 * Run post-dispatch processing: read phase output, enrich the manifest,
 * determine if the phase should advance, and sync state to GitHub.
 *
 * Never throws. All errors are caught and logged as warnings so a sync
 * failure never blocks the pipeline.
 */
export async function runPostDispatch(opts: PostDispatchOptions): Promise<void> {
  try {
    // Early exit on failure — no manifest/sync updates
    if (!opts.success) {
      console.log(`[post-dispatch] Phase ${opts.phase} failed for ${opts.epicSlug} — skipping updates`);
      return;
    }

    // Load phase output from the worktree artifacts dir.
    // For implement fan-out (featureSlug present), load the feature-specific output
    // instead of the epic-level one — prevents one feature's output from marking
    // other features completed via enrich.
    const output = opts.featureSlug
      ? loadWorktreeFeatureOutput(opts.worktreePath, opts.phase, opts.epicSlug, opts.featureSlug)
      : loadWorktreePhaseOutput(opts.worktreePath, opts.phase, opts.epicSlug);
    if (output) {
      console.log(`[post-dispatch] Loaded phase output for ${opts.phase}/${opts.epicSlug} (status: ${output.status})`);
    } else {
      console.log(`[post-dispatch] No phase output found for ${opts.phase}/${opts.epicSlug} — continuing without enrichment`);
    }

    // Load the manifest
    let manifest = store.load(opts.projectRoot, opts.epicSlug);
    if (!manifest) {
      console.log(`[post-dispatch] No manifest found for ${opts.epicSlug} — cannot update`);
      return;
    }
    console.log(`[post-dispatch] Loaded manifest for ${opts.epicSlug} (phase: ${manifest.phase})`);

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
      console.log(`[post-dispatch] Enriched manifest (artifacts: ${artifactPaths.length}, features: ${featureStatuses.length})`);
    }

    // Handle implement fan-out: mark individual feature as completed
    // Only mark completed if the feature produced its own output.json — a session
    // that exits 0 without writing an artifact did not actually implement anything.
    if (opts.phase === "implement" && opts.featureSlug) {
      const featureOutput = loadWorktreeFeatureOutput(opts.worktreePath, opts.phase, opts.epicSlug, opts.featureSlug);
      if (featureOutput?.status === "completed") {
        manifest = markFeature(manifest, opts.featureSlug, "completed");
        store.save(opts.projectRoot, opts.epicSlug, manifest);
        console.log(`[post-dispatch] Marked feature ${opts.featureSlug} as completed (output verified)`);
      } else {
        console.log(`[post-dispatch] Feature ${opts.featureSlug} session exited 0 but no output.json — not marking completed`);
      }
    }

    // Handle validate regression: only regress when output explicitly reports failure.
    // Missing output with a successful session is not a failure — the skill just didn't write one.
    if (opts.phase === "validate" && output && output.status !== "completed") {
      manifest = regressPhase(manifest, "implement");
      store.save(opts.projectRoot, opts.epicSlug, manifest);
      console.log(`[post-dispatch] Regressed phase: validate -> implement (features reset to pending)`);
    }

    // For validate advancement: if session succeeded but no output, synthesize completed
    const effectiveOutput = (!output && opts.phase === "validate")
      ? { status: "completed" as const, artifacts: { report: "", passed: true } as const }
      : output;

    // Determine whether to advance the phase
    const nextPhase = shouldAdvance(manifest, effectiveOutput);
    if (nextPhase) {
      manifest = advancePhase(manifest, nextPhase);
      store.save(opts.projectRoot, opts.epicSlug, manifest);
      console.log(`[post-dispatch] Advanced phase: ${opts.phase} -> ${nextPhase}`);
    } else {
      console.log(`[post-dispatch] No phase advancement for ${opts.phase}`);
    }

    // Sync to GitHub — warn-and-continue
    try {
      const config = loadConfig(opts.projectRoot);
      if (config.github.enabled) {
        const resolved = await discoverGitHub(opts.projectRoot, config.github["project-name"]);
        if (resolved) {
          const syncResult = await syncGitHub(manifest, config, resolved);

          // Apply mutations back to manifest
          for (const mutation of syncResult.mutations) {
            if (mutation.type === "setEpic") {
              manifest = setGitHubEpic(manifest, mutation.epicNumber, mutation.repo);
            } else if (mutation.type === "setFeatureIssue") {
              manifest = setFeatureGitHubIssue(manifest, mutation.featureSlug, mutation.issueNumber);
            }
          }

          if (syncResult.mutations.length > 0) {
            store.save(opts.projectRoot, opts.epicSlug, manifest);
            console.log(`[post-dispatch] Applied ${syncResult.mutations.length} GitHub mutation(s)`);
          }

          for (const warning of syncResult.warnings) {
            console.log(`[post-dispatch] GitHub sync warning: ${warning}`);
          }

          console.log("[post-dispatch] GitHub sync complete");
        } else {
          console.log("[post-dispatch] GitHub discovery failed — skipping sync");
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[post-dispatch] GitHub sync failed (non-blocking): ${message}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`[post-dispatch] Unexpected error (non-blocking): ${message}`);
  }
}
