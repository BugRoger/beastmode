/**
 * Early Issue Creation — pre-dispatch stub issue creation.
 *
 * Creates minimal GitHub stub issues before the phase skill runs,
 * so issue numbers are available from the first commit.
 *
 * Reads pipeline state from the store, writes issue numbers to
 * github-sync.json (not to store entities).
 */

import type { Phase } from "../types.js";
import type { BeastmodeConfig } from "../config.js";
import type { ResolvedGitHub } from "./discovery.js";
import type { Logger } from "../logger.js";
import type { TaskStore } from "../store/types.js";
import { discoverGitHub } from "./discovery.js";
import { ghIssueCreate } from "./cli.js";
import { loadSyncRefs, saveSyncRefs, getSyncRef, setSyncRef } from "./sync-refs.js";
import { featureTitle, epicTitle } from "./sync.js";

/** Options for the pre-dispatch early issue creation step. */
export interface EarlyIssueOpts {
  phase: Phase;
  epicId: string;
  projectRoot: string;
  config: BeastmodeConfig;
  store: TaskStore;
  resolved?: ResolvedGitHub;
  logger?: Logger;
}

/**
 * Ensure GitHub stub issues exist before dispatch.
 *
 * - Design phase: creates epic stub issue.
 * - Implement phase: creates feature stub issues.
 * - Other phases: no-op.
 *
 * Idempotent — skips creation if sync file already has the issue number.
 * Never throws — all errors are caught and logged as warnings.
 */
export async function ensureEarlyIssues(opts: EarlyIssueOpts): Promise<void> {
  const { phase, epicId, projectRoot, config, store, logger } = opts;

  if (!config.github.enabled) return;
  if (phase !== "design" && phase !== "implement") return;

  try {
    const resolved = opts.resolved ?? await discoverGitHub(projectRoot, config.github["project-name"]);
    if (!resolved) {
      logger?.warn("early issues: GitHub discovery failed — skipping");
      return;
    }
    const repo = resolved.repo;

    const epic = store.getEpic(epicId);
    if (!epic) {
      logger?.debug("early issues: no epic in store — skipping");
      return;
    }

    let refs = loadSyncRefs(projectRoot);

    if (phase === "design") {
      const epicRef = getSyncRef(refs, epicId);
      if (epicRef?.issue) {
        logger?.debug("early issues: epic already has issue number — skipping");
        return;
      }

      const stubBody = `_Stub issue — content will be enriched after the design phase completes._`;
      const epicNumber = await ghIssueCreate(
        repo,
        epicTitle(epic.slug, epic.name),
        stubBody,
        ["type/epic", "phase/design"],
        { logger },
      );

      if (!epicNumber) {
        logger?.warn("early issues: epic stub creation failed — sync will retry at post-dispatch");
        return;
      }

      refs = setSyncRef(refs, epicId, { issue: epicNumber });
      saveSyncRefs(projectRoot, refs);
      logger?.debug("early issues: epic stub created", { issue: epicNumber });
    } else if (phase === "implement") {
      const epicRef = getSyncRef(refs, epicId);
      if (!epicRef?.issue) {
        logger?.debug("early issues: no epic issue — skipping feature stubs");
        return;
      }

      const epicNumber = epicRef.issue;
      const features = store.listFeatures(epicId);
      const featuresToCreate = features.filter((f) => !getSyncRef(refs, f.id)?.issue);

      if (featuresToCreate.length === 0) {
        logger?.debug("early issues: all features already have issue numbers");
        return;
      }

      for (const feature of featuresToCreate) {
        const stubBody = `**Epic:** #${epicNumber}\n\n_Stub issue — content will be enriched after the implement phase completes._`;
        const issueNumber = await ghIssueCreate(
          repo,
          featureTitle(epic.name, feature.slug),
          stubBody,
          ["type/feature", "status/ready"],
          { logger },
        );

        if (issueNumber) {
          refs = setSyncRef(refs, feature.id, { issue: issueNumber });
          logger?.debug("early issues: feature stub created", { feature: feature.slug, issue: issueNumber });
        } else {
          logger?.warn(`early issues: feature stub creation failed for ${feature.slug} — sync will retry at post-dispatch`);
        }
      }

      saveSyncRefs(projectRoot, refs);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger?.warn(`early issues failed (non-blocking): ${message}`);
  }
}
