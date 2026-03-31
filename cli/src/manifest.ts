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
import type { Phase, PhaseOutput } from "./types";
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
    lastUpdated: now(),
  };
}

/**
 * Advance the manifest to a new phase.
 */
export function advancePhase(
  manifest: PipelineManifest,
  newPhase: Phase,
): PipelineManifest {
  return {
    ...manifest,
    phase: newPhase,
    lastUpdated: now(),
  };
}

/**
 * Regress the manifest to a prior phase. Resets ALL features to "pending".
 */
export function regressPhase(
  manifest: PipelineManifest,
  phase: Phase,
): PipelineManifest {
  return {
    ...manifest,
    phase,
    features: manifest.features.map((f) => ({ ...f, status: "pending" as const })),
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

// --- Phase sequence ---

const PHASE_SEQUENCE: Partial<Record<Phase, Phase>> = {
  design: "plan",
  plan: "implement",
  implement: "validate",
  validate: "release",
  release: "done",
};

/**
 * Check if the phase output artifacts contain features.
 */
function outputHasFeatures(output: PhaseOutput): boolean {
  const artifacts = output.artifacts as unknown as Record<string, unknown>;
  const features = artifacts?.features;
  return Array.isArray(features) && features.length > 0;
}

/**
 * Determine if the pipeline should advance to the next phase.
 * Returns the next phase, or null if no advancement should occur.
 */
export function shouldAdvance(
  manifest: PipelineManifest,
  output: PhaseOutput | undefined,
): Phase | null {
  const nextPhase = PHASE_SEQUENCE[manifest.phase];
  if (!nextPhase) return null;

  switch (manifest.phase) {
    case "design":
      return nextPhase;

    case "plan": {
      if (!output) return null;
      return outputHasFeatures(output) ? nextPhase : null;
    }

    case "implement": {
      if (manifest.features.length === 0) return null;
      const allCompleted = manifest.features.every(
        (f) => f.status === "completed",
      );
      return allCompleted ? nextPhase : null;
    }

    case "validate":
      return output?.status === "completed" ? nextPhase : null;

    case "release":
      return output?.status === "completed" ? nextPhase : null;

    default:
      return null;
  }
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
