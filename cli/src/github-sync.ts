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
import {
  ghIssueCreate,
  ghIssueEdit,
  ghIssueClose,
  ghIssueReopen,
  ghIssueState,
  ghIssueLabels,
  ghProjectItemAdd,
  ghProjectItemDelete,
  ghProjectSetField,
  ghSubIssueAdd,
} from "./gh";

/** A mutation to apply to the manifest after sync. */
export type SyncMutation =
  | { type: "setEpic"; epicNumber: number; repo: string }
  | { type: "setFeatureIssue"; featureSlug: string; issueNumber: number };

/** Result of a sync operation — informational, never throws. */
export interface SyncResult {
  epicCreated: boolean;
  epicNumber?: number;
  featuresCreated: number;
  featuresClosed: number;
  featuresReopened: number;
  labelsUpdated: number;
  projectUpdated: boolean;
  epicClosed: boolean;
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
];

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
): Promise<SyncResult> {
  const result: SyncResult = {
    epicCreated: false,
    featuresCreated: 0,
    featuresClosed: 0,
    featuresReopened: 0,
    labelsUpdated: 0,
    projectUpdated: false,
    epicClosed: false,
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

  // --- Epic Sync ---

  // Resolve or create the epic number — track locally, never mutate manifest
  let epicNumber = manifest.github?.epic;

  if (!epicNumber) {
    epicNumber = await ghIssueCreate(
      repo,
      manifest.slug,
      `## ${manifest.slug}\n\n**Phase:** ${manifest.phase}`,
      ["type/epic", `phase/${manifest.phase}`],
    );
    if (epicNumber) {
      result.mutations.push({ type: "setEpic", epicNumber, repo });
      result.epicCreated = true;
      result.epicNumber = epicNumber;
    } else {
      result.warnings.push("Failed to create epic issue");
      return result; // Can't proceed without epic
    }
  }

  result.epicNumber = epicNumber;

  // Blast-replace phase label on epic
  const targetPhaseLabel = `phase/${manifest.phase}`;
  const currentLabels = await ghIssueLabels(repo, epicNumber);
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
      });
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
  );

  // --- Feature Sync ---

  for (const feature of manifest.features) {
    await syncFeature(repo, owner, epicNumber, feature, resolved, result);
  }

  // --- Epic Close (if done) ---
  if (manifest.phase === "done") {
    const closed = await ghIssueClose(repo, epicNumber);
    if (closed) {
      result.epicClosed = true;
    } else {
      result.warnings.push("Failed to close epic");
    }

    // Set project board to Done
    await syncProjectStatus(resolved, owner, repo, epicNumber, "Done", result);
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
): Promise<void> {
  // Resolve or create the feature issue number — track locally, never mutate feature
  let featureNumber = feature.github?.issue;

  if (!featureNumber) {
    featureNumber = await ghIssueCreate(
      repo,
      feature.slug,
      `## ${feature.slug}\n\n**Epic:** #${epicNumber}`,
      ["type/feature", STATUS_TO_LABEL[feature.status] ?? "status/ready"],
    );
    if (featureNumber) {
      result.mutations.push({
        type: "setFeatureIssue",
        featureSlug: feature.slug,
        issueNumber: featureNumber,
      });
      result.featuresCreated++;

      // Link as sub-issue of epic
      await ghSubIssueAdd(repo, epicNumber, featureNumber);
    } else {
      result.warnings.push(`Failed to create issue for feature ${feature.slug}`);
      return;
    }
  }

  // Handle completed features — close them
  if (feature.status === "completed") {
    const closed = await ghIssueClose(repo, featureNumber);
    if (closed) {
      result.featuresClosed++;
    } else {
      result.warnings.push(`Failed to close feature ${feature.slug}`);
    }
    return; // No label update needed for closed issues
  }

  // Reopen closed issues that should be open (e.g., after validate regression)
  const issueState = await ghIssueState(repo, featureNumber);
  if (issueState === "closed") {
    const reopened = await ghIssueReopen(repo, featureNumber);
    if (reopened) {
      result.featuresReopened++;
    } else {
      result.warnings.push(`Failed to reopen feature ${feature.slug}`);
    }
  }

  // Blast-replace status label
  const targetStatusLabel = STATUS_TO_LABEL[feature.status];
  if (targetStatusLabel) {
    const currentLabels = await ghIssueLabels(repo, featureNumber);
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
        });
        result.labelsUpdated++;
      }
    }
  }

  // Remove feature from project board — only epics belong there
  await removeFromProject(resolved, owner, repo, featureNumber, result);
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
): Promise<void> {
  const projectNumber = resolved.projectNumber;
  const projectId = resolved.projectId;
  if (!projectNumber || !projectId) return;

  const issueUrl = `https://github.com/${repo}/issues/${issueNumber}`;
  const itemId = await ghProjectItemAdd(projectNumber, owner, issueUrl);
  if (!itemId) return;

  const deleted = await ghProjectItemDelete(projectId, itemId);
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
  const itemId = await ghProjectItemAdd(projectNumber, owner, issueUrl);
  if (!itemId) {
    result.warnings.push(`Failed to add #${issueNumber} to project board`);
    return;
  }

  const updated = await ghProjectSetField(projectId, itemId, fieldId, optionId);
  if (updated) {
    result.projectUpdated = true;
  } else {
    result.warnings.push(`Failed to set project status for #${issueNumber}`);
  }
}
