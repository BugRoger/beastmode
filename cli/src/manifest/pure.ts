/**
 * Pure manifest state machine — zero filesystem imports.
 *
 * Every function takes a PipelineManifest and returns a NEW PipelineManifest.
 * No mutation. No side effects. No fs. No path.
 *
 * Also includes actor hydration — restores an ephemeral xstate actor
 * from a manifest snapshot.
 */

import type {
  PipelineManifest,
  ManifestFeature,
} from "./store";
import type { Phase } from "../types";

import { createActor } from "xstate";
import { epicMachine } from "../pipeline-machine/index.js";
import type { EpicContext, EpicEvent } from "../pipeline-machine/index.js";

// Phase ordering for regression logic
const PHASE_ORDER: readonly Phase[] = ["design", "plan", "implement", "validate", "release"];

// Re-export types so consumers can import from either module
export type { PipelineManifest, ManifestFeature, ManifestGitHub } from "./store";

// --- Timestamp helper ---

function now(): string {
  return new Date().toISOString();
}

// --- Pure state transitions ---

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

/**
 * Regress a manifest to an earlier (or same) phase.
 * Resets features to "pending" if regressing to or past "implement".
 * Clears blocked field. Clears downstream artifact entries.
 */
export function regress(
  manifest: PipelineManifest,
  targetPhase: Phase,
): PipelineManifest {
  const targetIdx = PHASE_ORDER.indexOf(targetPhase);
  const implementIdx = PHASE_ORDER.indexOf("implement");

  // Reset features if regressing to or past implement
  const features = targetIdx <= implementIdx
    ? manifest.features.map((f) => ({ ...f, status: "pending" as const }))
    : manifest.features;

  // Clear artifacts for phases after targetPhase
  const artifacts: Record<string, string[]> = {};
  for (const [phase, files] of Object.entries(manifest.artifacts)) {
    const phaseIdx = PHASE_ORDER.indexOf(phase as Phase);
    if (phaseIdx !== -1 && phaseIdx > targetIdx) continue; // downstream — drop
    artifacts[phase] = files;
  }

  return {
    ...manifest,
    phase: targetPhase,
    features,
    artifacts,
    lastUpdated: now(),
  };
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

// --- Dispatch derivation ---

/** A dispatchable action derived from manifest state. */
export interface NextAction {
  phase: string;
  args: string[];
  type: "single" | "fan-out";
  features?: string[];
}

/** Static dispatch type per phase — no XState needed. */
const DISPATCH_TYPE: Record<string, "single" | "fan-out" | "skip"> = {
  design: "skip",
  plan: "single",
  implement: "fan-out",
  validate: "single",
  release: "single",
  done: "skip",
  cancelled: "skip",
};

/**
 * Derive the next dispatchable action from a manifest.
 * Pure function — lookup table + wave-aware feature filtering.
 * No XState, no filesystem, no side effects.
 */
export function deriveNextAction(manifest: PipelineManifest): NextAction | null {
  const dt = DISPATCH_TYPE[manifest.phase];
  if (!dt || dt === "skip") return null;

  if (dt === "fan-out") {
    const incompleteFeatures = manifest.features
      .filter((f) => f.status === "pending" || f.status === "in-progress" || f.status === "blocked");
    if (incompleteFeatures.length === 0) return null;

    // Wave-aware filtering: find the lowest wave with any incomplete feature.
    // Features without a wave field default to wave 1.
    const lowestWave = Math.min(...incompleteFeatures.map((f) => f.wave ?? 1));
    const lowestWaveFeatures = incompleteFeatures.filter((f) => (f.wave ?? 1) === lowestWave);

    // Only dispatch pending/in-progress features from the lowest wave.
    // Blocked features are excluded — if ALL are blocked, dispatchable is empty → return null.
    const dispatchable = lowestWaveFeatures
      .filter((f) => f.status === "pending" || f.status === "in-progress")
      .map((f) => f.slug);

    if (dispatchable.length === 0) return null;

    return {
      phase: manifest.phase,
      args: [manifest.slug],
      type: "fan-out",
      features: dispatchable,
    };
  }

  return {
    phase: manifest.phase,
    args: [manifest.slug],
    type: "single",
  };
}

// --- Actor hydration ---

export interface HydratedActor {
  start(): void;
  stop(): void;
  send(event: EpicEvent): void;
  getSnapshot(): { value: string | object; context: EpicContext };
}

/**
 * Hydrate an ephemeral epic actor at the given phase/context.
 * The actor is started and ready to receive events.
 */
export function hydrateEpicActor(phase: string, context: EpicContext): HydratedActor {
  const resolvedSnapshot = epicMachine.resolveState({
    value: phase,
    context,
  });
  const actor = createActor(epicMachine, { snapshot: resolvedSnapshot, input: context });
  actor.start();
  return actor as unknown as HydratedActor;
}
