/**
 * Early Issue Creation — pre-dispatch stub issue creation.
 *
 * Creates minimal GitHub stub issues before the phase skill runs,
 * so issue numbers are available from the first commit.
 *
 * Epic stubs: created before design phase.
 * Feature stubs: created before implement phase.
 *
 * Follows warn-and-continue — never blocks dispatch on failure.
 */

import type { Phase } from "../types.js";
import type { BeastmodeConfig } from "../config.js";
import type { ResolvedGitHub } from "./discovery.js";
import type { Logger } from "../logger.js";
import { discoverGitHub } from "./discovery.js";
import { ghIssueCreate } from "./cli.js";
import * as store from "../manifest/store.js";
import { setGitHubEpic, setFeatureGitHubIssue } from "../manifest/pure.js";

/** Options for the pre-dispatch early issue creation step. */
export interface EarlyIssueOpts {
  phase: Phase;
  epicSlug: string;
  projectRoot: string;
  config: BeastmodeConfig;
  resolved?: ResolvedGitHub;
  logger?: Logger;
}

/**
 * Ensure GitHub stub issues exist before dispatch.
 *
 * - Design phase: creates epic stub issue (slug as title, type/epic + phase/design labels).
 * - Implement phase: creates feature stub issues (slug as title, type/feature + status/ready labels).
 * - Other phases: no-op.
 *
 * Idempotent — skips creation if manifest already has the issue number.
 * Never throws — all errors are caught and logged as warnings.
 */
export async function ensureEarlyIssues(opts: EarlyIssueOpts): Promise<void> {
  const { phase, epicSlug, projectRoot, config, logger } = opts;

  // Guard: GitHub must be enabled
  if (!config.github.enabled) return;

  // Guard: only design and implement phases need early issues
  if (phase !== "design" && phase !== "implement") return;

  try {
    // Resolve GitHub repo
    const resolved = opts.resolved ?? await discoverGitHub(projectRoot, config.github["project-name"]);
    if (!resolved) {
      logger?.warn("early issues: GitHub discovery failed — skipping");
      return;
    }
    const repo = resolved.repo;

    // Load manifest
    const manifest = store.load(projectRoot, epicSlug);
    if (!manifest) {
      logger?.debug("early issues: no manifest — skipping");
      return;
    }

    if (phase === "design") {
      await ensureEpicStub(manifest, repo, epicSlug, projectRoot, logger);
    } else if (phase === "implement") {
      await ensureFeatureStubs(manifest, repo, epicSlug, projectRoot, logger);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger?.warn(`early issues failed (non-blocking): ${message}`);
  }
}

/** Create a minimal epic stub issue if one doesn't exist yet. */
async function ensureEpicStub(
  manifest: store.PipelineManifest,
  repo: string,
  epicSlug: string,
  projectRoot: string,
  logger?: Logger,
): Promise<void> {
  if (manifest.github?.epic) {
    logger?.debug("early issues: epic already has issue number — skipping");
    return;
  }

  const stubBody = `**Phase:** design\n\n_Stub issue — content will be enriched after the design phase completes._`;

  const epicNumber = await ghIssueCreate(
    repo,
    manifest.slug,
    stubBody,
    ["type/epic", "phase/design"],
    { logger },
  );

  if (!epicNumber) {
    logger?.warn("early issues: epic stub creation failed — sync will retry at post-dispatch");
    return;
  }

  await store.transact(projectRoot, epicSlug, (m) => {
    return setGitHubEpic(m, epicNumber, repo);
  });

  logger?.info("early issues: epic stub created", { issue: epicNumber });
}

/** Create minimal feature stub issues for features missing issue numbers. */
async function ensureFeatureStubs(
  manifest: store.PipelineManifest,
  repo: string,
  epicSlug: string,
  projectRoot: string,
  logger?: Logger,
): Promise<void> {
  // Guard: need an epic issue number for feature back-reference
  if (!manifest.github?.epic) {
    logger?.debug("early issues: no epic issue — skipping feature stubs");
    return;
  }

  const epicNumber = manifest.github.epic;
  const featuresToCreate = manifest.features.filter((f) => !f.github?.issue);

  if (featuresToCreate.length === 0) {
    logger?.debug("early issues: all features already have issue numbers");
    return;
  }

  // Create stubs and collect mutations
  const mutations: Array<{ featureSlug: string; issueNumber: number }> = [];

  for (const feature of featuresToCreate) {
    const stubBody = `**Epic:** #${epicNumber}\n\n_Stub issue — content will be enriched after the implement phase completes._`;

    const issueNumber = await ghIssueCreate(
      repo,
      feature.slug,
      stubBody,
      ["type/feature", "status/ready"],
      { logger },
    );

    if (issueNumber) {
      mutations.push({ featureSlug: feature.slug, issueNumber });
      logger?.info("early issues: feature stub created", { feature: feature.slug, issue: issueNumber });
    } else {
      logger?.warn(`early issues: feature stub creation failed for ${feature.slug} — sync will retry at post-dispatch`);
    }
  }

  // Apply all mutations in a single transaction
  if (mutations.length > 0) {
    await store.transact(projectRoot, epicSlug, (m) => {
      let updated = m;
      for (const mut of mutations) {
        updated = setFeatureGitHubIssue(updated, mut.featureSlug, mut.issueNumber);
      }
      return updated;
    });
  }
}
