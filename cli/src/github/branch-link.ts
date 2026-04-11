/**
 * Branch Link Orchestrator — links branches to GitHub issues via
 * the createLinkedBranch GraphQL mutation.
 *
 * Feature branches link to epic issues.
 * Uses delete-then-recreate flow since branches are already pushed.
 * Warn-and-continue: never throws, logs failures.
 */

import {
  ghRepoNodeId,
  ghIssueNodeId,
  ghCreateLinkedBranch,
} from "./cli.js";
import { git } from "../git/worktree.js";
import { createLogger, createStdioSink } from "../logger.js";
import type { Logger } from "../logger.js";

export interface LinkBranchesOpts {
  repo: string;
  epicSlug: string;
  epicIssueNumber?: number;
  featureSlug?: string;
  featureIssueNumber?: number;
  phase: string;
  cwd?: string;
  logger?: Logger;
}

/**
 * Link branches to their corresponding GitHub issues.
 *
 * Links the feature branch to the epic issue.
 *
 * Uses delete-then-recreate: delete the remote ref first, then call
 * createLinkedBranch to recreate at the same SHA — this establishes the link.
 */
export async function linkBranches(opts: LinkBranchesOpts): Promise<void> {
  const log = (opts.logger ?? createLogger(createStdioSink(0), {})).child({ phase: opts.phase });
  const { repo, epicSlug, epicIssueNumber, cwd } = opts;

  // Skip if no epic issue number
  if (!epicIssueNumber) return;

  // Resolve repo node ID (needed for createLinkedBranch)
  const repoId = await ghRepoNodeId(repo, { cwd, logger: log });
  if (!repoId) {
    log.warn("branch-link: failed to resolve repo node ID — skipping");
    return;
  }

  // Get HEAD SHA for createLinkedBranch
  const headResult = await git(["rev-parse", "HEAD"], { cwd, allowFailure: true });
  const oid = headResult.stdout.trim();
  if (!oid) {
    log.warn("branch-link: failed to resolve HEAD SHA — skipping");
    return;
  }

  // Link feature branch -> epic issue
  const featureBranch = `feature/${epicSlug}`;
  await linkOneBranch({
    repoId,
    repo,
    issueNumber: epicIssueNumber,
    branchName: featureBranch,
    oid,
    cwd,
    logger: log,
  });
}

/**
 * Link a single branch to an issue.
 * Delete remote ref first, then createLinkedBranch to establish the link.
 */
async function linkOneBranch(opts: {
  repoId: string;
  repo: string;
  issueNumber: number;
  branchName: string;
  oid: string;
  cwd?: string;
  logger?: Logger;
}): Promise<void> {
  const { repoId, repo, issueNumber, branchName, oid, cwd, logger: log } = opts;

  // Resolve issue node ID
  const issueId = await ghIssueNodeId(repo, issueNumber, { cwd, logger: log });
  if (!issueId) {
    log?.warn?.(`branch-link: failed to resolve issue #${issueNumber} node ID — skipping ${branchName}`);
    return;
  }

  // Delete the remote ref first (may fail if not on remote — that's fine)
  await git(
    ["push", "origin", "--delete", branchName],
    { cwd, allowFailure: true },
  );

  // Create linked branch (establishes the issue link)
  const linkedId = await ghCreateLinkedBranch(repoId, issueId, branchName, oid, { cwd, logger: log });
  if (linkedId) {
    log?.debug?.(`branch-link: linked ${branchName} -> #${issueNumber}`);
  } else {
    log?.debug?.(`branch-link: createLinkedBranch returned null for ${branchName} -> #${issueNumber}`);
  }
}
