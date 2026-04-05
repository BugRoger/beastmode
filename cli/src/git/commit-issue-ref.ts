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
import { tagName } from "./tags.js";
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
 * Resolve the range start SHA for commit amending.
 *
 * Strategy:
 * 1. If current phase has a predecessor, try its tag (`beastmode/<slug>/<prev-phase>`)
 * 2. Fall back to merge-base with main (handles design phase and missing tags)
 */
export async function resolveRangeStart(
  slug: string,
  currentPhase: string,
  opts: { cwd?: string } = {},
): Promise<string | undefined> {
  const phaseIdx = PHASE_ORDER.indexOf(currentPhase as (typeof PHASE_ORDER)[number]);

  // Try previous phase tag
  if (phaseIdx > 0) {
    const prevPhase = PHASE_ORDER[phaseIdx - 1];
    const prevTag = tagName(slug, prevPhase);
    const result = await git(["rev-parse", prevTag], { cwd: opts.cwd, allowFailure: true });
    if (result.exitCode === 0 && result.stdout) {
      return result.stdout;
    }
  }

  // Fallback: merge-base with main
  const mbResult = await git(["merge-base", "main", "HEAD"], { cwd: opts.cwd, allowFailure: true });
  if (mbResult.exitCode === 0 && mbResult.stdout) {
    return mbResult.stdout;
  }

  return undefined;
}

/** Result of range-based commit amending. */
export interface AmendRangeResult {
  amended: number;
  skipped: number;
}

/**
 * Amend all commits in a range to append issue references.
 *
 * Enumerates commits from range start to HEAD, pre-computes which need
 * amending and their new messages, then uses `git rebase --exec` with
 * a shell script that checks each replayed commit and amends if needed.
 *
 * The shell script uses only git + sh — no Bun dependency during rebase.
 */
export async function amendCommitsInRange(
  manifest: PipelineManifest,
  slug: string,
  currentPhase: string,
  opts: { cwd?: string; rangeStartOverride?: string } = {},
): Promise<AmendRangeResult> {
  if (!manifest.github?.epic) {
    return { amended: 0, skipped: 0 };
  }

  // Resolve range start
  let rangeStart: string | undefined;
  if (opts.rangeStartOverride) {
    const r = await git(["rev-parse", opts.rangeStartOverride], { cwd: opts.cwd, allowFailure: true });
    rangeStart = r.exitCode === 0 ? r.stdout : undefined;
  } else {
    rangeStart = await resolveRangeStart(slug, currentPhase, opts);
  }

  if (!rangeStart) {
    return { amended: 0, skipped: 0 };
  }

  // Get commits in range (oldest first)
  const logResult = await git(
    ["log", "--reverse", "--format=%H|%s", `${rangeStart}..HEAD`],
    { cwd: opts.cwd, allowFailure: true },
  );

  if (logResult.exitCode !== 0 || !logResult.stdout) {
    return { amended: 0, skipped: 0 };
  }

  const commits = logResult.stdout.split("\n").filter(Boolean).map((line) => {
    const idx = line.indexOf("|");
    return { sha: line.slice(0, idx), subject: line.slice(idx + 1) };
  });

  if (commits.length === 0) {
    return { amended: 0, skipped: 0 };
  }

  // Pre-compute which commits need amending and their new messages
  const amendments = new Map<string, string>();
  let skipped = 0;

  for (const commit of commits) {
    if (/\(#\d+\)$/.test(commit.subject.trim())) {
      skipped++;
      continue;
    }
    const issueNumber = resolveCommitIssueNumber(commit.subject, manifest);
    if (issueNumber) {
      amendments.set(commit.subject, `${commit.subject} (#${issueNumber})`);
    } else {
      skipped++;
    }
  }

  if (amendments.size === 0) {
    return { amended: 0, skipped };
  }

  // Write temp map file: each line is "old_subject\tnew_message"
  const { writeFile, unlink } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const cwd = opts.cwd ?? process.cwd();
  const mapPath = join(cwd, ".git", "beastmode-amend-map.txt");

  const mapLines: string[] = [];
  for (const [oldSubject, newMessage] of amendments) {
    mapLines.push(`${oldSubject}\t${newMessage}`);
  }
  await writeFile(mapPath, mapLines.join("\n") + "\n");

  // Shell script that reads current HEAD subject, looks up in map, amends.
  // Uses only git + sh — no Bun dependency during rebase.
  const scriptPath = join(cwd, ".git", "beastmode-amend.sh");
  const escapedMapPath = mapPath.replace(/'/g, "'\\''");
  const script = `#!/bin/sh
SUBJECT=$(git log -1 --format=%s)
MAP_FILE='${escapedMapPath}'
NEW_MSG=""
while IFS=$(printf '\\t') read -r old new; do
  if [ "$old" = "$SUBJECT" ]; then
    NEW_MSG="$new"
    break
  fi
done < "$MAP_FILE"
if [ -n "$NEW_MSG" ]; then
  git commit --amend -m "$NEW_MSG"
fi
`;
  await writeFile(scriptPath, script, { mode: 0o755 });

  // Run rebase with exec
  const rebaseResult = await git(
    ["rebase", "--exec", `sh '${scriptPath.replace(/'/g, "'\\''")}'`, rangeStart],
    { cwd: opts.cwd, allowFailure: true },
  );

  // Clean up temp files
  await unlink(mapPath).catch(() => {});
  await unlink(scriptPath).catch(() => {});

  if (rebaseResult.exitCode !== 0) {
    await git(["rebase", "--abort"], { cwd: opts.cwd, allowFailure: true });
    return { amended: 0, skipped };
  }

  return { amended: amendments.size, skipped };
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
