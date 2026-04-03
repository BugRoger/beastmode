/**
 * Body formatting for GitHub issue bodies — pure functions, no I/O.
 *
 * Renders markdown issue bodies from manifest state.
 * Epic body: phase badge, problem/solution, feature checklist.
 * Feature body: description, epic back-reference.
 */

import type { Phase } from "./types.js";

/** Minimal epic input — decoupled from full PipelineManifest to stay pure. */
export interface EpicBodyInput {
  slug: string;
  phase: Phase;
  summary?: { problem: string; solution: string };
  features: Array<{
    slug: string;
    status: "pending" | "in-progress" | "completed" | "blocked" | "cancelled";
    github?: { issue: number };
  }>;
  /** PRD sections extracted from design artifact. */
  prdSections?: {
    problem?: string;
    solution?: string;
    userStories?: string;
    decisions?: string;
  };
  /** Artifact links per phase — repo path + optional permalink. */
  artifactLinks?: Record<string, { repoPath: string; permalink?: string }>;
  /** Git metadata for traceability — branch, tags, version, merge commit. */
  gitMetadata?: {
    branch?: string;
    phaseTags?: Record<string, string>;  // phase -> tag name
    version?: string;
    mergeCommit?: { sha: string; url: string };
  };
  /** GitHub repo in "owner/repo" format — needed for permalink construction. */
  repo?: string;
}

/** Minimal feature input — decoupled from full ManifestFeature. */
export interface FeatureBodyInput {
  slug: string;
  description?: string;
  /** User story text extracted from the feature plan. */
  userStory?: string;
}

/**
 * Format an epic issue body from manifest state.
 *
 * Includes: phase badge, problem statement, solution summary, feature checklist.
 * Cancelled features are excluded. Unlinked features show plain text.
 * Missing summary fields produce a graceful fallback.
 */
export function formatEpicBody(input: EpicBodyInput): string {
  const sections: string[] = [];

  // Phase badge
  sections.push(`**Phase:** ${input.phase}`);

  // Problem/solution — prdSections override summary when present
  const problem = input.prdSections?.problem ?? input.summary?.problem;
  if (problem) {
    sections.push(`## Problem\n\n${problem}`);
  }
  const solution = input.prdSections?.solution ?? input.summary?.solution;
  if (solution) {
    sections.push(`## Solution\n\n${solution}`);
  }

  // PRD user stories and decisions (only from prdSections)
  if (input.prdSections?.userStories) {
    sections.push(`## User Stories\n\n${input.prdSections.userStories}`);
  }
  if (input.prdSections?.decisions) {
    sections.push(`## Decisions\n\n${input.prdSections.decisions}`);
  }

  // Artifact links table
  if (input.artifactLinks) {
    const entries = Object.entries(input.artifactLinks);
    if (entries.length > 0) {
      const rows = entries.map(([phase, { repoPath, permalink }]) => {
        const link = permalink ? `[${repoPath}](${permalink})` : repoPath;
        return `| ${phase} | ${link} |`;
      });
      sections.push(
        `## Artifacts\n\n| Phase | Link |\n|-------|------|\n${rows.join("\n")}`,
      );
    }
  }

  // Git metadata
  if (input.gitMetadata) {
    const meta = input.gitMetadata;
    const lines: string[] = [];
    if (meta.branch) lines.push(`**Branch:** \`${meta.branch}\``);
    if (meta.phaseTags && Object.keys(meta.phaseTags).length > 0) {
      const tagList = Object.entries(meta.phaseTags)
        .map(([_phase, tag]) => `\`${tag}\``)
        .join(", ");
      lines.push(`**Tags:** ${tagList}`);
    }
    if (meta.version) lines.push(`**Version:** ${meta.version}`);
    if (meta.mergeCommit) {
      lines.push(`**Merge Commit:** [${meta.mergeCommit.sha.slice(0, 7)}](${meta.mergeCommit.url})`);
    }
    if (lines.length > 0) {
      sections.push(`## Git\n\n${lines.join("\n")}`);
    }
  }

  // Feature checklist — exclude cancelled
  const activeFeatures = input.features.filter(
    (f) => f.status !== "cancelled",
  );
  if (activeFeatures.length > 0) {
    const lines = activeFeatures.map((f) => {
      const checked = f.status === "completed" ? "x" : " ";
      const ref = f.github?.issue ? `#${f.github.issue}` : f.slug;
      return `- [${checked}] ${ref} ${f.slug}`;
    });
    sections.push(`## Features\n\n${lines.join("\n")}`);
  }

  return sections.join("\n\n");
}

/**
 * Format a feature issue body from manifest state.
 *
 * Includes: description text, epic back-reference.
 * Missing description falls back to slug + epic reference.
 */
export function formatFeatureBody(
  input: FeatureBodyInput,
  epicNumber: number,
): string {
  const sections: string[] = [];

  if (input.description) {
    sections.push(input.description);
  } else {
    sections.push(`## ${input.slug}`);
  }

  // User story (optional, from feature plan)
  if (input.userStory) {
    sections.push(`## User Story\n\n${input.userStory}`);
  }

  sections.push(`**Epic:** #${epicNumber}`);

  return sections.join("\n\n");
}

/**
 * Generate a release closing comment for an epic issue.
 * Posted once when an epic transitions to done phase.
 */
export function formatClosingComment(opts: {
  version: string;
  releaseTag: string;
  mergeCommit: string;
  repo: string;
}): string {
  const shortSha = opts.mergeCommit.slice(0, 7);
  return [
    `## Released: ${opts.version}`,
    "",
    `- **Tag:** [\`${opts.releaseTag}\`](https://github.com/${opts.repo}/tree/${opts.releaseTag})`,
    `- **Merge Commit:** [\`${shortSha}\`](https://github.com/${opts.repo}/commit/${opts.mergeCommit})`,
  ].join("\n");
}

/**
 * Generate a release comment from optional metadata.
 * Returns "" when no meaningful data is available.
 * Used by github-sync to post a closing comment on done epics.
 */
export function formatReleaseComment(opts: {
  version?: string;
  tag?: string;
  mergeCommit?: string;
  repo?: string;
}): string {
  const lines: string[] = [];

  if (opts.version) {
    lines.push(`## Released: ${opts.version}`);
  }

  const details: string[] = [];
  if (opts.tag && opts.repo) {
    details.push(
      `- **Tag:** [\`${opts.tag}\`](https://github.com/${opts.repo}/tree/${opts.tag})`,
    );
  } else if (opts.tag) {
    details.push(`- **Tag:** \`${opts.tag}\``);
  }
  if (opts.mergeCommit && opts.repo) {
    const shortSha = opts.mergeCommit.slice(0, 7);
    details.push(
      `- **Merge Commit:** [\`${shortSha}\`](https://github.com/${opts.repo}/commit/${opts.mergeCommit})`,
    );
  } else if (opts.mergeCommit) {
    const shortSha = opts.mergeCommit.slice(0, 7);
    details.push(`- **Merge Commit:** \`${shortSha}\``);
  }

  if (details.length > 0) {
    lines.push("", ...details);
  }

  return lines.length > 0 ? lines.join("\n") : "";
}
