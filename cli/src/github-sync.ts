/**
 * GitHub Sync Engine — stateless reconciliation from manifest to GitHub.
 *
 * Reads the manifest and makes GitHub match. One-way sync:
 * manifest is the source of truth, GitHub is a mirror.
 *
 * Returns mutations instead of mutating the manifest in-place.
 * The caller applies mutations via manifest.ts functions and calls store.save().
 */

import type { PipelineManifest, ManifestFeature } from "./manifest";
import type { BeastmodeConfig } from "./config";
import type { ResolvedGitHub } from "./github-discovery";
import { discoverGitHub } from "./github-discovery";
import type { Logger } from "./logger";
import { loadConfig } from "./config";
import * as store from "./manifest-store";
import { formatEpicBody, formatFeatureBody, formatClosingComment, type EpicBodyInput } from "./body-format";
import { extractSection, extractSections } from "./section-extractor.js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import {
  ghIssueCreate,
  ghIssueEdit,
  ghIssueClose,
  ghIssueReopen,
  ghIssueComment,
  ghIssueComments,
  ghIssueState,
  ghIssueLabels,
  ghProjectItemAdd,
  ghProjectItemDelete,
  ghProjectSetField,
  ghSubIssueAdd,
} from "./gh";

/** Simple hash for body content comparison. Uses Bun's built-in crypto. */
function hashBody(body: string): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(body);
  return hasher.digest("hex");
}

/** A mutation to apply to the manifest after sync. */
export type SyncMutation =
  | { type: "setEpic"; epicNumber: number; repo: string }
  | { type: "setFeatureIssue"; featureSlug: string; issueNumber: number }
  | { type: "setEpicBodyHash"; bodyHash: string }
  | { type: "setFeatureBodyHash"; featureSlug: string; bodyHash: string };

/** Result of a sync operation — informational, never throws. */
export interface SyncResult {
  epicCreated: boolean;
  epicNumber?: number;
  featuresCreated: number;
  featuresClosed: number;
  featuresReopened: number;
  labelsUpdated: number;
  bodiesUpdated: number;
  projectUpdated: boolean;
  epicClosed: boolean;
  releaseCommentPosted: boolean;
  commentsPosted: number;
  warnings: string[];
  /** Mutations to apply to the manifest after sync. */
  mutations: SyncMutation[];
}

/** Map manifest phase to the project board status name. */
const PHASE_TO_BOARD_STATUS: Record<string, string> = {
  design: "Design",
  plan: "Plan",
  implement: "Implement",
  validate: "Validate",
  release: "Release",
  done: "Done",
  cancelled: "Done",
};

/** Map manifest feature status to GitHub label. */
const STATUS_TO_LABEL: Record<string, string> = {
  pending: "status/ready",
  "in-progress": "status/in-progress",
  blocked: "status/blocked",
};

/** All possible status/* labels for blast-replace. */
const ALL_STATUS_LABELS = ["status/ready", "status/in-progress", "status/blocked"];

/** All possible phase/* labels for blast-replace. */
const ALL_PHASE_LABELS = [
  "phase/backlog",
  "phase/design",
  "phase/plan",
  "phase/implement",
  "phase/validate",
  "phase/release",
  "phase/done",
  "phase/cancelled",
];

/**
 * Read PRD sections from the design artifact.
 * Returns prdSections object for EpicBodyInput, or undefined if unavailable.
 */
function readPrdSections(
  manifest: PipelineManifest,
  projectRoot: string,
): EpicBodyInput["prdSections"] | undefined {
  const designPaths = manifest.artifacts?.["design"];
  if (!designPaths || designPaths.length === 0) return undefined;

  const designPath = resolve(projectRoot, designPaths[0]);
  if (!existsSync(designPath)) return undefined;

  try {
    const content = readFileSync(designPath, "utf-8");
    const sections = extractSections(content, [
      "Problem Statement",
      "Solution",
      "User Stories",
      "Implementation Decisions",
    ]);

    const result: EpicBodyInput["prdSections"] = {};
    if (sections["Problem Statement"]) result.problem = sections["Problem Statement"];
    if (sections["Solution"]) result.solution = sections["Solution"];
    if (sections["User Stories"]) result.userStories = sections["User Stories"];
    if (sections["Implementation Decisions"]) result.decisions = sections["Implementation Decisions"];

    return Object.keys(result).length > 0 ? result : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve artifact links from the manifest — repo-relative paths + optional permalinks.
 * Permalink uses phase tag SHA as commit anchor.
 */
function resolveArtifactLinks(
  manifest: PipelineManifest,
  repo: string,
): EpicBodyInput["artifactLinks"] | undefined {
  if (!manifest.artifacts || Object.keys(manifest.artifacts).length === 0) return undefined;

  const links: Record<string, { repoPath: string; permalink?: string }> = {};

  for (const [phase, paths] of Object.entries(manifest.artifacts)) {
    if (!paths || paths.length === 0) continue;
    const repoPath = paths[0];

    let permalink: string | undefined;
    const tagName = `beastmode/${manifest.slug}/${phase}`;
    try {
      const tagResult = Bun.spawnSync(["git", "rev-parse", "--verify", `refs/tags/${tagName}`]);
      if (tagResult.exitCode === 0) {
        const sha = tagResult.stdout.toString().trim();
        if (sha) {
          permalink = `https://github.com/${repo}/blob/${sha}/${repoPath}`;
        }
      }
    } catch {
      // No tag — permalink stays undefined
    }

    links[phase] = { repoPath, ...(permalink ? { permalink } : {}) };
  }

  return Object.keys(links).length > 0 ? links : undefined;
}

/**
 * Resolve git metadata for traceability.
 * Branch from manifest, phase tags from git, version from manifest/plugin.
 * Only resolves tags when a worktree branch is present — tags without branch
 * context are not meaningful traceability metadata.
 */
function resolveGitMetadata(
  manifest: PipelineManifest,
): EpicBodyInput["gitMetadata"] | undefined {
  const meta: NonNullable<EpicBodyInput["gitMetadata"]> = {};

  // Branch from worktree — gate all git lookups on worktree presence
  if (manifest.worktree?.branch) {
    meta.branch = manifest.worktree.branch;

    // Phase tags from git
    const tagPrefix = `beastmode/${manifest.slug}/`;
    try {
      const tagResult = Bun.spawnSync(["git", "tag", "-l", `${tagPrefix}*`]);
      if (tagResult.exitCode === 0) {
        const tags = tagResult.stdout.toString().trim().split("\n").filter(Boolean);
        if (tags.length > 0) {
          const phaseTags: Record<string, string> = {};
          for (const tag of tags) {
            const phase = tag.replace(tagPrefix, "");
            if (phase) phaseTags[phase] = tag;
          }
          if (Object.keys(phaseTags).length > 0) {
            meta.phaseTags = phaseTags;
          }
        }
      }
    } catch {
      // Git not available — skip tags
    }
  }

  return Object.keys(meta).length > 0 ? meta : undefined;
}

/** Read version from plugin.json — returns undefined if unavailable. */
function readVersionFromPlugin(projectRoot?: string): string | undefined {
  if (!projectRoot) return undefined;
  try {
    const pluginPath = resolve(projectRoot, ".claude-plugin", "plugin.json");
    if (!existsSync(pluginPath)) return undefined;
    const plugin = JSON.parse(readFileSync(pluginPath, "utf-8"));
    return plugin.version || undefined;
  } catch {
    return undefined;
  }
}

/** Read the release tag for this epic — returns undefined if no tag exists. */
function readReleaseTag(slug: string): string | undefined {
  try {
    const tagName = `beastmode/${slug}/release`;
    const result = Bun.spawnSync(["git", "rev-parse", "--verify", `refs/tags/${tagName}`]);
    return result.exitCode === 0 ? tagName : undefined;
  } catch {
    return undefined;
  }
}

/** Read the HEAD merge commit SHA — returns undefined if unavailable. */
function readMergeCommit(): string | undefined {
  try {
    const result = Bun.spawnSync(["git", "rev-parse", "HEAD"]);
    return result.exitCode === 0 ? result.stdout.toString().trim() || undefined : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Sync GitHub state to match the manifest. Stateless — reads manifest,
 * makes GitHub match. Returns SyncResult with mutations for the caller to apply.
 *
 * `resolved` provides the runtime-discovered repo and project metadata.
 */
export async function syncGitHub(
  manifest: PipelineManifest,
  config: BeastmodeConfig,
  resolved: ResolvedGitHub,
  opts: { logger?: Logger; projectRoot?: string } = {},
): Promise<SyncResult> {
  const result: SyncResult = {
    epicCreated: false,
    featuresCreated: 0,
    featuresClosed: 0,
    featuresReopened: 0,
    labelsUpdated: 0,
    bodiesUpdated: 0,
    projectUpdated: false,
    epicClosed: false,
    releaseCommentPosted: false,
    warnings: [],
    mutations: [],
  };

  // Guard: GitHub must be enabled
  if (!config.github.enabled) {
    result.warnings.push("GitHub sync disabled in config");
    return result;
  }

  const repo = resolved.repo;
  const [owner] = repo.split("/");

  // Compute enrichment data if projectRoot available
  const prdSections = opts.projectRoot
    ? readPrdSections(manifest, opts.projectRoot)
    : undefined;
  const artifactLinks = resolveArtifactLinks(manifest, repo);
  const gitMetadata = resolveGitMetadata(manifest);

  // --- Epic Sync ---

  // Resolve or create the epic number — track locally, never mutate manifest
  let epicNumber = manifest.github?.epic;
  let epicJustCreated = false;

  if (!epicNumber) {
    const initialEpicBody = formatEpicBody({
      slug: manifest.slug,
      phase: manifest.phase,
      summary: manifest.summary,
      features: manifest.features,
      prdSections,
      artifactLinks,
      gitMetadata,
      repo,
    });
    epicNumber = await ghIssueCreate(
      repo,
      manifest.slug,
      initialEpicBody,
      ["type/epic", `phase/${manifest.phase}`],
      { logger: opts.logger },
    );
    if (epicNumber) {
      result.mutations.push({ type: "setEpic", epicNumber, repo });
      const createHash = hashBody(initialEpicBody);
      result.mutations.push({ type: "setEpicBodyHash", bodyHash: createHash });
      result.epicCreated = true;
      result.epicNumber = epicNumber;
      result.bodiesUpdated++;
      epicJustCreated = true;
    } else {
      result.warnings.push("Failed to create epic issue");
      return result; // Can't proceed without epic
    }
  }

  result.epicNumber = epicNumber;

  // --- Epic Body Update ---
  if (!epicJustCreated) {
    const epicBody = formatEpicBody({
      slug: manifest.slug,
      phase: manifest.phase,
      summary: manifest.summary,
      features: manifest.features,
      prdSections,
      artifactLinks,
      gitMetadata,
      repo,
    });
    const epicBodyHash = hashBody(epicBody);
    const storedEpicHash = manifest.github?.bodyHash;

    if (epicBodyHash !== storedEpicHash) {
      const bodyUpdated = await ghIssueEdit(repo, epicNumber, { body: epicBody }, { logger: opts.logger });
      if (bodyUpdated) {
        result.mutations.push({ type: "setEpicBodyHash", bodyHash: epicBodyHash });
        result.bodiesUpdated++;
      } else {
        result.warnings.push("Failed to update epic body");
      }
    }
  }

  // Blast-replace phase label on epic
  const targetPhaseLabel = `phase/${manifest.phase}`;
  const currentLabels = await ghIssueLabels(repo, epicNumber, { logger: opts.logger });
  if (currentLabels) {
    const currentPhaseLabels = currentLabels.filter((l) =>
      l.startsWith("phase/"),
    );
    const needsUpdate =
      currentPhaseLabels.length !== 1 ||
      currentPhaseLabels[0] !== targetPhaseLabel;
    if (needsUpdate) {
      await ghIssueEdit(repo, epicNumber, {
        removeLabels: ALL_PHASE_LABELS.filter((l) => currentLabels.includes(l)),
        addLabels: [targetPhaseLabel],
      }, { logger: opts.logger });
      result.labelsUpdated++;
    }
  }

  // Update project board status for epic
  await syncProjectStatus(
    resolved,
    owner,
    repo,
    epicNumber,
    PHASE_TO_BOARD_STATUS[manifest.phase] ?? "Backlog",
    result,
    opts,
  );

  // --- Feature Sync ---

  for (const feature of manifest.features) {
    await syncFeature(repo, owner, epicNumber, feature, resolved, result, opts);
  }

  // --- Epic Close (if done or cancelled) ---
  if (manifest.phase === "done" || manifest.phase === "cancelled") {
    // Post release closing comment on done epics (not cancelled)
    if (manifest.phase === "done") {
      const version = readVersionFromPlugin(opts.projectRoot);
      const releaseTag = readReleaseTag(manifest.slug);
      const mergeCommitSha = readMergeCommit();

      if (releaseTag && mergeCommitSha) {
        const commentBody = formatClosingComment({
          version: version ?? "unreleased",
          releaseTag,
          mergeCommit: mergeCommitSha,
          repo,
        });
        const commented = await ghIssueComment(repo, epicNumber, commentBody, { logger: opts.logger });
        if (commented) {
          result.releaseCommentPosted = true;
        } else {
          result.warnings.push("Failed to post release comment on epic");
        }
      }
    }

    const closed = await ghIssueClose(repo, epicNumber, { logger: opts.logger });
    if (closed) {
      result.epicClosed = true;
    } else {
      result.warnings.push("Failed to close epic");
    }

    // Set project board to Done
    await syncProjectStatus(resolved, owner, repo, epicNumber, "Done", result, opts);
  }

  return result;
}

/**
 * Sync a single feature to GitHub. Pushes mutations instead of mutating in-place.
 */
async function syncFeature(
  repo: string,
  owner: string,
  epicNumber: number,
  feature: ManifestFeature,
  resolved: ResolvedGitHub,
  result: SyncResult,
  opts: { logger?: Logger; projectRoot?: string } = {},
): Promise<void> {
  // Read user story from feature plan (if projectRoot available)
  let userStory: string | undefined;
  if (opts.projectRoot && feature.plan) {
    const planPath = resolve(opts.projectRoot, feature.plan);
    try {
      if (existsSync(planPath)) {
        const planContent = readFileSync(planPath, "utf-8");
        const section = extractSection(planContent, "User Stories");
        if (section) userStory = section;
      }
    } catch {
      // Graceful degradation
    }
  }

  // Resolve or create the feature issue number — track locally, never mutate feature
  let featureNumber = feature.github?.issue;
  let featureJustCreated = false;

  if (!featureNumber) {
    const featureBody = formatFeatureBody(
      { slug: feature.slug, description: feature.description, userStory },
      epicNumber,
    );
    featureNumber = await ghIssueCreate(
      repo,
      feature.slug,
      featureBody,
      ["type/feature", STATUS_TO_LABEL[feature.status] ?? "status/ready"],
      { logger: opts.logger },
    );
    if (featureNumber) {
      result.mutations.push({
        type: "setFeatureIssue",
        featureSlug: feature.slug,
        issueNumber: featureNumber,
      });
      const createHash = hashBody(featureBody);
      result.mutations.push({
        type: "setFeatureBodyHash",
        featureSlug: feature.slug,
        bodyHash: createHash,
      });
      result.featuresCreated++;
      result.bodiesUpdated++;
      featureJustCreated = true;

      // Link as sub-issue of epic
      await ghSubIssueAdd(repo, epicNumber, featureNumber, { logger: opts.logger });
    } else {
      result.warnings.push(`Failed to create issue for feature ${feature.slug}`);
      return;
    }
  }

  // Handle completed features — close them
  if (feature.status === "completed") {
    const closed = await ghIssueClose(repo, featureNumber, { logger: opts.logger });
    if (closed) {
      result.featuresClosed++;
    } else {
      result.warnings.push(`Failed to close feature ${feature.slug}`);
    }
    return; // No label update needed for closed issues
  }

  // Reopen closed issues that should be open (e.g., after validate regression)
  const issueState = await ghIssueState(repo, featureNumber, { logger: opts.logger });
  if (issueState === "closed") {
    const reopened = await ghIssueReopen(repo, featureNumber, { logger: opts.logger });
    if (reopened) {
      result.featuresReopened++;
    } else {
      result.warnings.push(`Failed to reopen feature ${feature.slug}`);
    }
  }

  // --- Feature Body Update ---
  if (!featureJustCreated) {
    const featureBody = formatFeatureBody(
      { slug: feature.slug, description: feature.description, userStory },
      epicNumber,
    );
    const featureBodyHash = hashBody(featureBody);
    const storedFeatureHash = feature.github?.bodyHash;

    if (featureBodyHash !== storedFeatureHash) {
      const bodyUpdated = await ghIssueEdit(repo, featureNumber, { body: featureBody }, { logger: opts.logger });
      if (bodyUpdated) {
        result.mutations.push({
          type: "setFeatureBodyHash",
          featureSlug: feature.slug,
          bodyHash: featureBodyHash,
        });
        result.bodiesUpdated++;
      } else {
        result.warnings.push(`Failed to update body for feature ${feature.slug}`);
      }
    }
  }

  // Blast-replace status label
  const targetStatusLabel = STATUS_TO_LABEL[feature.status];
  if (targetStatusLabel) {
    const currentLabels = await ghIssueLabels(repo, featureNumber, { logger: opts.logger });
    if (currentLabels) {
      const currentStatusLabels = currentLabels.filter((l) =>
        l.startsWith("status/"),
      );
      const needsUpdate =
        currentStatusLabels.length !== 1 ||
        currentStatusLabels[0] !== targetStatusLabel;
      if (needsUpdate) {
        await ghIssueEdit(repo, featureNumber, {
          removeLabels: ALL_STATUS_LABELS.filter((l) =>
            currentLabels.includes(l),
          ),
          addLabels: [targetStatusLabel],
        }, { logger: opts.logger });
        result.labelsUpdated++;
      }
    }
  }

  // Remove feature from project board — only epics belong there
  await removeFromProject(resolved, owner, repo, featureNumber, result, opts);
}

/**
 * Remove an issue from the project board (if present).
 * Uses ghProjectItemAdd to get the item ID (idempotent), then deletes it.
 */
async function removeFromProject(
  resolved: ResolvedGitHub,
  owner: string,
  repo: string,
  issueNumber: number,
  result: SyncResult,
  opts: { logger?: Logger } = {},
): Promise<void> {
  const projectNumber = resolved.projectNumber;
  const projectId = resolved.projectId;
  if (!projectNumber || !projectId) return;

  const issueUrl = `https://github.com/${repo}/issues/${issueNumber}`;
  const itemId = await ghProjectItemAdd(projectNumber, owner, issueUrl, { logger: opts.logger });
  if (!itemId) return;

  const deleted = await ghProjectItemDelete(projectId, itemId, { logger: opts.logger });
  if (!deleted) {
    result.warnings.push(`Failed to remove #${issueNumber} from project board`);
  }
}

/**
 * Sync an issue's project board status.
 * Requires Projects V2 metadata in resolved config.
 */
async function syncProjectStatus(
  resolved: ResolvedGitHub,
  owner: string,
  repo: string,
  issueNumber: number,
  targetStatus: string,
  result: SyncResult,
  opts: { logger?: Logger } = {},
): Promise<void> {
  const projectNumber = resolved.projectNumber;
  const projectId = resolved.projectId;
  const fieldId = resolved.fieldId;
  const fieldOptions = resolved.fieldOptions;

  if (!projectNumber || !projectId || !fieldId || !fieldOptions) {
    // Projects V2 not configured — skip silently
    return;
  }

  const optionId = fieldOptions[targetStatus];
  if (!optionId) {
    result.warnings.push(
      `No project option for status "${targetStatus}" — run setup-github to refresh`,
    );
    return;
  }

  const issueUrl = `https://github.com/${repo}/issues/${issueNumber}`;
  const itemId = await ghProjectItemAdd(projectNumber, owner, issueUrl, { logger: opts.logger });
  if (!itemId) {
    result.warnings.push(`Failed to add #${issueNumber} to project board`);
    return;
  }

  const updated = await ghProjectSetField(projectId, itemId, fieldId, optionId, { logger: opts.logger });
  if (updated) {
    result.projectUpdated = true;
  } else {
    result.warnings.push(`Failed to set project status for #${issueNumber}`);
  }
}

/**
 * Convenience wrapper: load manifest + config, run syncGitHub, apply mutations.
 * Used by watch-command for post-reconciliation sync. Warn-and-continue.
 */
export async function syncGitHubForEpic(opts: {
  projectRoot: string;
  epicSlug: string;
  resolved?: ResolvedGitHub;
  logger?: Logger;
}): Promise<void> {
  try {
    const config = loadConfig(opts.projectRoot);
    if (!config.github.enabled) return;

    const resolved = opts.resolved ?? await discoverGitHub(opts.projectRoot);
    if (!resolved) return;

    const manifest = store.load(opts.projectRoot, opts.epicSlug);
    if (!manifest) {
      opts.logger?.debug(`No manifest for ${opts.epicSlug} — skipping GitHub sync`);
      return;
    }

    const result = await syncGitHub(manifest, config, resolved, {
      logger: opts.logger,
      projectRoot: opts.projectRoot,
    });
    for (const w of result.warnings) {
      opts.logger?.warn(`GitHub sync: ${w}`);
    }

    if (result.mutations.length > 0) {
      await store.transact(opts.projectRoot, opts.epicSlug, (m) => {
        const updated = { ...m };
        for (const mut of result.mutations) {
          if (mut.type === "setEpic") {
            updated.github = { ...updated.github, epic: mut.epicNumber, repo: mut.repo };
          } else if (mut.type === "setFeatureIssue") {
            const feat = updated.features.find((f) => f.slug === mut.featureSlug);
            if (feat) feat.github = { ...feat.github, issue: mut.issueNumber };
          } else if (mut.type === "setEpicBodyHash" && updated.github) {
            updated.github.bodyHash = mut.bodyHash;
          } else if (mut.type === "setFeatureBodyHash") {
            const feat = updated.features.find((f) => f.slug === mut.featureSlug);
            if (feat?.github) feat.github.bodyHash = mut.bodyHash;
          }
        }
        updated.lastUpdated = new Date().toISOString();
        return updated;
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    opts.logger?.warn(`GitHub sync failed (non-blocking): ${message}`);
  }
}
