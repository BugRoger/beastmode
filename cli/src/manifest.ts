/**
 * Manifest module — typed access to pipeline manifests.
 *
 * New schema: pure pipeline state. No architectural decisions.
 * Location: .beastmode/pipeline/<slug>/manifest.json
 * Lifecycle: CLI creates, enriches, advances, reconstructs.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { resolve } from "path";
import type { Phase } from "./types";

// --- Types ---

export interface ManifestFeature {
  slug: string;
  plan: string;
  status: "pending" | "in-progress" | "completed" | "blocked";
  github?: { issue: number };
}

export interface ManifestGitHub {
  epic: number;
  repo: string;
}

export interface PipelineManifest {
  slug: string;
  phase: Phase;
  features: ManifestFeature[];
  artifacts: Record<string, string[]>;
  worktree?: { branch: string; path: string };
  github?: ManifestGitHub;
  lastUpdated: string;
}

// --- Paths ---

/**
 * Resolve the manifest directory for a given slug.
 * Convention: .beastmode/pipeline/<slug>/
 */
export function manifestDir(projectRoot: string, slug: string): string {
  return resolve(projectRoot, ".beastmode", "pipeline", slug);
}

/**
 * Resolve the manifest file path for a given slug.
 * Convention: .beastmode/pipeline/<slug>/manifest.json
 */
export function manifestPath(projectRoot: string, slug: string): string {
  return resolve(manifestDir(projectRoot, slug), "manifest.json");
}

// --- Core Operations ---

/**
 * Seed a new manifest at design dispatch.
 * Creates the pipeline directory and writes initial manifest.
 */
export function seed(
  projectRoot: string,
  slug: string,
  opts?: {
    worktree?: { branch: string; path: string };
    github?: ManifestGitHub;
  },
): PipelineManifest {
  const dir = manifestDir(projectRoot, slug);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const manifest: PipelineManifest = {
    slug,
    phase: "design",
    features: [],
    artifacts: {},
    worktree: opts?.worktree,
    github: opts?.github,
    lastUpdated: new Date().toISOString(),
  };

  writeFileSync(manifestPath(projectRoot, slug), JSON.stringify(manifest, null, 2));
  return manifest;
}

/**
 * Enrich a manifest from a phase output.
 * Merges features, artifacts, and advances phase if output indicates completion.
 */
export function enrich(
  projectRoot: string,
  slug: string,
  phaseOutput: {
    phase: Phase;
    features?: ManifestFeature[];
    artifacts?: string[];
  },
): PipelineManifest {
  const manifest = readManifest(projectRoot, slug);

  // Merge features if provided
  if (phaseOutput.features) {
    const existingBySlug = new Map(manifest.features.map((f) => [f.slug, f]));
    for (const feature of phaseOutput.features) {
      const existing = existingBySlug.get(feature.slug);
      if (existing) {
        // Preserve github info from existing, update rest
        existing.plan = feature.plan;
        existing.status = feature.status;
        if (feature.github) existing.github = feature.github;
      } else {
        manifest.features.push(feature);
      }
    }
  }

  // Accumulate artifacts under the phase key
  if (phaseOutput.artifacts && phaseOutput.artifacts.length > 0) {
    if (!manifest.artifacts[phaseOutput.phase]) {
      manifest.artifacts[phaseOutput.phase] = [];
    }
    manifest.artifacts[phaseOutput.phase].push(...phaseOutput.artifacts);
  }

  manifest.lastUpdated = new Date().toISOString();
  writeManifest(projectRoot, slug, manifest);
  return manifest;
}

/**
 * Advance the manifest to the next phase.
 */
export function advancePhase(
  projectRoot: string,
  slug: string,
  newPhase: Phase,
): PipelineManifest {
  const manifest = readManifest(projectRoot, slug);
  manifest.phase = newPhase;
  manifest.lastUpdated = new Date().toISOString();
  writeManifest(projectRoot, slug, manifest);
  return manifest;
}

/**
 * Reconstruct a manifest from worktree branch scanning.
 * Used for cold-start when the manifest file is missing.
 */
export function reconstruct(
  projectRoot: string,
  slug: string,
): PipelineManifest | undefined {
  // Scan for design artifact
  const designDir = resolve(projectRoot, ".beastmode", "state", "design");
  if (!existsSync(designDir)) return undefined;

  const designFiles = readdirSync(designDir).filter((f) =>
    f.endsWith(`-${slug}.md`),
  );
  if (designFiles.length === 0) return undefined;

  // Scan for feature plans
  const planDir = resolve(projectRoot, ".beastmode", "state", "plan");
  const features: ManifestFeature[] = [];
  if (existsSync(planDir)) {
    const featurePlanPattern = new RegExp(
      `^\\d{4}-\\d{2}-\\d{2}-${escapeRegExp(slug)}-(.+)\\.md$`,
    );
    const planFiles = readdirSync(planDir).filter((f) =>
      featurePlanPattern.test(f),
    );
    for (const f of planFiles) {
      const match = f.match(featurePlanPattern)!;
      features.push({
        slug: match[1],
        plan: f,
        status: "pending",
      });
    }
  }

  // Determine phase from available state
  let phase: Phase = "design";
  if (features.length > 0) phase = "plan";

  // Check for implement/validate/release state markers
  for (const p of ["implement", "validate", "release"] as Phase[]) {
    const phaseDir = resolve(projectRoot, ".beastmode", "state", p);
    if (existsSync(phaseDir)) {
      const hasMarker = readdirSync(phaseDir).some((f) => f.includes(slug));
      if (hasMarker) phase = p;
    }
  }

  const manifest: PipelineManifest = {
    slug,
    phase,
    features,
    artifacts: {},
    lastUpdated: new Date().toISOString(),
  };

  // Write the reconstructed manifest
  const dir = manifestDir(projectRoot, slug);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeManifest(projectRoot, slug, manifest);

  return manifest;
}

// --- Read/Write ---

/**
 * Read and parse a manifest for a slug. Throws if missing or corrupt.
 */
export function readManifest(
  projectRoot: string,
  slug: string,
): PipelineManifest {
  const path = manifestPath(projectRoot, slug);
  if (!existsSync(path)) {
    throw new Error(`Manifest not found: ${path}`);
  }
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as PipelineManifest;
}

/**
 * Write a manifest back to disk.
 */
export function writeManifest(
  projectRoot: string,
  slug: string,
  manifest: PipelineManifest,
): void {
  const dir = manifestDir(projectRoot, slug);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(
    manifestPath(projectRoot, slug),
    JSON.stringify(manifest, null, 2),
  );
}

/**
 * Load a manifest, returning undefined if it doesn't exist.
 */
export function loadManifest(
  projectRoot: string,
  slug: string,
): PipelineManifest | undefined {
  try {
    return readManifest(projectRoot, slug);
  } catch {
    return undefined;
  }
}

/**
 * Check if a manifest exists for a given slug.
 */
export function manifestExists(
  projectRoot: string,
  slug: string,
): boolean {
  return existsSync(manifestPath(projectRoot, slug));
}

/**
 * Get pending/in-progress features from a manifest.
 */
export function getPendingFeatures(manifest: PipelineManifest): ManifestFeature[] {
  return manifest.features.filter(
    (f) => f.status === "pending" || f.status === "in-progress",
  );
}

// --- Legacy Support ---

/**
 * Find a manifest in the old state/plan/ location.
 * Used during migration to locate seed manifests.
 * Convention: .beastmode/state/plan/*-<slug>.manifest.json
 */
export function findLegacyManifestPath(
  projectRoot: string,
  designSlug: string,
): string | undefined {
  const planDir = resolve(projectRoot, ".beastmode", "state", "plan");
  if (!existsSync(planDir)) return undefined;

  const files = readdirSync(planDir);
  const matches = files
    .filter((f) => f.endsWith(`-${designSlug}.manifest.json`))
    .sort();

  if (matches.length === 0) return undefined;
  return resolve(planDir, matches[matches.length - 1]);
}

/**
 * Read and parse a legacy manifest file from an absolute path.
 */
export function readLegacyManifest(path: string): Record<string, unknown> {
  if (!existsSync(path)) {
    throw new Error(`Manifest not found: ${path}`);
  }
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

// --- Utilities ---

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
