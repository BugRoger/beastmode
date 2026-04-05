/**
 * Commit issue reference — amends the most recent commit message to append
 * a GitHub issue reference (#N).
 *
 * Three commit types:
 * 1. Phase checkpoint (feature/<slug> branch) → epic issue number
 * 2. Impl task (impl/<slug>--<feature> branch) → feature issue number
 * 3. Release squash-merge (main branch) → epic issue number
 *
 * No-op when issue number is unavailable.
 */

import { git } from "./worktree.js";
import type { PipelineManifest } from "../manifest/store.js";

/** Result of parsing an impl branch name. */
export interface ImplBranchParts {
  slug: string;
  feature: string;
}

/**
 * Parse an impl branch name into slug and feature parts.
 * Returns undefined if the branch doesn't match `impl/<slug>--<feature>`.
 */
export function parseImplBranch(branchName: string): ImplBranchParts | undefined {
  const match = branchName.match(/^impl\/(.+?)--(.+)$/);
  if (!match) return undefined;
  return { slug: match[1], feature: match[2] };
}

/**
 * Resolve the issue number for the current branch from the manifest.
 *
 * - impl/<slug>--<feature> → feature issue number from manifest.features
 * - feature/<slug> → epic issue number from manifest.github.epic
 * - main/master → epic issue number from manifest.github.epic
 * - anything else → undefined (no-op)
 */
export function resolveIssueNumber(
  branchName: string,
  manifest: PipelineManifest,
): number | undefined {
  // Impl branch → feature issue
  const implParts = parseImplBranch(branchName);
  if (implParts) {
    const feature = manifest.features.find((f) => f.slug === implParts.feature);
    return feature?.github?.issue;
  }

  // Feature branch → epic issue
  if (branchName.startsWith("feature/")) {
    return manifest.github?.epic;
  }

  // Main/master → epic issue (release squash-merge)
  if (branchName === "main" || branchName === "master") {
    return manifest.github?.epic;
  }

  return undefined;
}

/**
 * Append an issue reference to a commit message subject line.
 * Only modifies the first line. Preserves body if present.
 * No-op if the subject already ends with a parenthetical issue ref.
 */
export function appendIssueRef(message: string, issueNumber: number): string {
  const lines = message.split("\n");
  const subject = lines[0];

  // Already has an issue ref — don't double-append
  if (/\(#\d+\)$/.test(subject.trim())) {
    return message;
  }

  lines[0] = `${subject} (#${issueNumber})`;
  return lines.join("\n");
}

/**
 * Phase ordering for range-start resolution.
 */
const PHASE_ORDER = ["design", "plan", "implement", "validate", "release"] as const;

/**
 * Resolve the issue number for a specific commit based on its message.
 *
 * Routing:
 * - `feat(<feature>): ...` → feature issue (impl task commit)
 * - `implement(<slug>--<feature>): ...` → feature issue (impl checkpoint)
 * - Everything else → epic issue (phase checkpoints, misc)
 *
 * Falls back to epic issue if feature not found in manifest.
 * Returns undefined if manifest has no github config.
 */
export function resolveCommitIssueNumber(
  commitMessage: string,
  manifest: PipelineManifest,
): number | undefined {
  if (!manifest.github?.epic) return undefined;

  // feat(<feature>): pattern — impl task commits
  const featMatch = commitMessage.match(/^feat\(([^)]+)\):/);
  if (featMatch) {
    const featureSlug = featMatch[1];
    const feature = manifest.features.find((f) => f.slug === featureSlug);
    if (feature?.github?.issue) return feature.github.issue;
    return manifest.github.epic;
  }

  // implement(<slug>--<feature>): pattern — impl branch checkpoint
  const implMatch = commitMessage.match(/^implement\([^)]*--([^)]+)\):/);
  if (implMatch) {
    const featureSlug = implMatch[1];
    const feature = manifest.features.find((f) => f.slug === featureSlug);
    if (feature?.github?.issue) return feature.github.issue;
    return manifest.github.epic;
  }

  // Default: epic issue (phase checkpoints, misc commits)
  return manifest.github.epic;
}

/**
 * Amend the most recent commit to append an issue reference.
 *
 * Reads the current branch name and manifest, resolves the issue number,
 * and amends the commit message. No-op if:
 * - Branch can't be determined
 * - Issue number can't be resolved
 * - Commit message already has an issue ref
 */
export async function amendCommitWithIssueRef(
  manifest: PipelineManifest,
  opts: { cwd?: string } = {},
): Promise<{ amended: boolean; issueNumber?: number }> {
  // Get current branch name
  const branchResult = await git(
    ["rev-parse", "--abbrev-ref", "HEAD"],
    { cwd: opts.cwd, allowFailure: true },
  );
  if (branchResult.exitCode !== 0) {
    return { amended: false };
  }
  const branchName = branchResult.stdout;

  // Resolve issue number
  const issueNumber = resolveIssueNumber(branchName, manifest);
  if (!issueNumber) {
    return { amended: false };
  }

  // Get current commit message
  const msgResult = await git(
    ["log", "-1", "--format=%B"],
    { cwd: opts.cwd, allowFailure: true },
  );
  if (msgResult.exitCode !== 0) {
    return { amended: false };
  }
  const currentMessage = msgResult.stdout;

  // Append issue ref
  const newMessage = appendIssueRef(currentMessage, issueNumber);
  if (newMessage === currentMessage) {
    return { amended: false };
  }

  // Amend the commit
  await git(
    ["commit", "--amend", "-m", newMessage],
    { cwd: opts.cwd },
  );

  return { amended: true, issueNumber };
}
