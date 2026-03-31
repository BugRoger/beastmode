/**
 * Pure manifest state machine — zero filesystem imports.
 *
 * Every function takes a PipelineManifest and returns a NEW PipelineManifest.
 * No mutation. No side effects. No fs. No path.
 */

import type {
  PipelineManifest,
  ManifestFeature,
} from "./manifest-store";
import type { Phase } from "./types";
import type { GatesConfig } from "./config";

// Re-export types so consumers can import from either module
export type { PipelineManifest, ManifestFeature, ManifestGitHub } from "./manifest-store";

// --- Timestamp helper ---

function now(): string {
  return new Date().toISOString();
}

// --- Pure state transitions ---

/**
 * Enrich a manifest with phase output data.
 * Merges features (preserving existing github info), accumulates artifacts.
 */
export function enrich(
  manifest: PipelineManifest,
  phaseOutput: {
    phase: Phase;
    features?: ManifestFeature[];
    artifacts?: string[];
    summary?: { problem: string; solution: string };
  },
): PipelineManifest {
  let features = [...manifest.features];

  if (phaseOutput.features) {
    const existingBySlug = new Map(features.map((f) => [f.slug, f]));
    for (const incoming of phaseOutput.features) {
      const existing = existingBySlug.get(incoming.slug);
      if (existing) {
        // Preserve github info from existing, update plan and status
        const merged: ManifestFeature = {
          ...existing,
          plan: incoming.plan,
          status: incoming.status,
          ...(incoming.description !== undefined && { description: incoming.description }),
        };
        if (incoming.github) {
          merged.github = incoming.github;
        }
        features = features.map((f) =>
          f.slug === incoming.slug ? merged : f,
        );
      } else {
        features = [...features, incoming];
      }
    }
  }

  const artifacts = { ...manifest.artifacts };
  if (phaseOutput.artifacts && phaseOutput.artifacts.length > 0) {
    const existing = artifacts[phaseOutput.phase] ?? [];
    artifacts[phaseOutput.phase] = [...existing, ...phaseOutput.artifacts];
  }

  return {
    ...manifest,
    features,
    artifacts,
    summary: phaseOutput.summary ?? manifest.summary,
    lastUpdated: now(),
  };
}

/**
 * Mark a single feature's status by slug.
 * Returns the manifest unchanged if the feature is not found.
 */
export function markFeature(
  manifest: PipelineManifest,
  slug: string,
  status: ManifestFeature["status"],
): PipelineManifest {
  const idx = manifest.features.findIndex((f) => f.slug === slug);
  if (idx === -1) return manifest;

  const features = manifest.features.map((f, i) =>
    i === idx ? { ...f, status } : f,
  );

  return {
    ...manifest,
    features,
    lastUpdated: now(),
  };
}

/**
 * Set the GitHub epic reference on the manifest.
 */
export function setGitHubEpic(
  manifest: PipelineManifest,
  epicNumber: number,
  repo: string,
): PipelineManifest {
  return {
    ...manifest,
    github: { epic: epicNumber, repo },
    lastUpdated: now(),
  };
}

/**
 * Set a GitHub issue number on a specific feature.
 * Returns manifest unchanged if the feature is not found.
 */
export function setFeatureGitHubIssue(
  manifest: PipelineManifest,
  featureSlug: string,
  issueNumber: number,
): PipelineManifest {
  const idx = manifest.features.findIndex((f) => f.slug === featureSlug);
  if (idx === -1) return manifest;

  const features = manifest.features.map((f, i) =>
    i === idx ? { ...f, github: { issue: issueNumber } } : f,
  );

  return {
    ...manifest,
    features,
    lastUpdated: now(),
  };
}

/**
 * Set the body hash on the epic's GitHub block.
 */
export function setEpicBodyHash(
  manifest: PipelineManifest,
  bodyHash: string,
): PipelineManifest {
  if (!manifest.github) return manifest;
  return {
    ...manifest,
    github: { ...manifest.github, bodyHash },
    lastUpdated: now(),
  };
}

/**
 * Set the body hash on a feature's GitHub block.
 * Returns manifest unchanged if the feature is not found or has no github block.
 */
export function setFeatureBodyHash(
  manifest: PipelineManifest,
  featureSlug: string,
  bodyHash: string,
): PipelineManifest {
  const idx = manifest.features.findIndex((f) => f.slug === featureSlug);
  if (idx === -1 || !manifest.features[idx].github) return manifest;

  const features = manifest.features.map((f, i) =>
    i === idx ? { ...f, github: { ...f.github!, bodyHash } } : f,
  );

  return {
    ...manifest,
    features,
    lastUpdated: now(),
  };
}

// --- Gate checking ---

/**
 * Check if the manifest is blocked by a feature or a human gate.
 */
export function checkBlocked(
  manifest: PipelineManifest,
  gates: GatesConfig,
): { gate: string; reason: string } | null {
  // Check for blocked features
  const blockedFeature = manifest.features.find(
    (f) => f.status === "blocked",
  );
  if (blockedFeature) {
    return {
      gate: "feature",
      reason: `Feature ${blockedFeature.slug} is blocked`,
    };
  }

  // Check config gates for human gates on the current phase
  const phaseGates = gates[manifest.phase as keyof GatesConfig];
  if (phaseGates) {
    for (const [gateName, mode] of Object.entries(phaseGates)) {
      if (mode === "human") {
        return { gate: gateName, reason: "Human gate" };
      }
    }
  }

  return null;
}

/**
 * Get features that are pending or in-progress.
 */
export function getPendingFeatures(
  manifest: PipelineManifest,
): ManifestFeature[] {
  return manifest.features.filter(
    (f) => f.status === "pending" || f.status === "in-progress",
  );
}
