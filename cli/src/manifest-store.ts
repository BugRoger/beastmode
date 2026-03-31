/**
 * Manifest Store — sole filesystem interface for pipeline manifests.
 *
 * All reads/writes of .beastmode/state/*.manifest.json go through here.
 * Type definitions for the manifest schema live here too.
 *
 * Schema: pure pipeline state.
 * Location: .beastmode/state/YYYY-MM-DD-<slug>.manifest.json (flat file)
 * Lifecycle: CLI creates, enriches, advances, reconstructs.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from "fs";
import { resolve } from "path";
import type { Phase } from "./types";
import { isValidPhase } from "./types";

// --- Types ---

export interface ManifestFeature {
  slug: string;
  plan: string;
  description?: string;
  status: "pending" | "in-progress" | "completed" | "blocked";
  github?: { issue: number; bodyHash?: string };
}

export interface ManifestGitHub {
  epic: number;
  repo: string;
  bodyHash?: string;
}

export interface PipelineManifest {
  slug: string;
  phase: Phase;
  features: ManifestFeature[];
  artifacts: Record<string, string[]>;
  summary?: { problem: string; solution: string };
  worktree?: { branch: string; path: string };
  github?: ManifestGitHub;
  blocked?: { gate: string; reason: string } | null;
  lastUpdated: string;
}

// --- Valid feature statuses ---

const VALID_FEATURE_STATUSES = [
  "pending",
  "in-progress",
  "completed",
  "blocked",
] as const;

function isValidFeatureStatus(s: string): boolean {
  return (VALID_FEATURE_STATUSES as readonly string[]).includes(s);
}

// --- Internal Helpers ---

/**
 * Resolve the state directory for pipeline manifests.
 * Convention: .beastmode/state/
 */
function pipelineDir(projectRoot: string): string {
  return resolve(projectRoot, ".beastmode", "state");
}

/**
 * Generate a new manifest file path with today's date.
 */
function newManifestPath(projectRoot: string, slug: string): string {
  const dir = pipelineDir(projectRoot);
  const date = new Date().toISOString().slice(0, 10);
  return resolve(dir, `${date}-${slug}.manifest.json`);
}

// --- Public API ---

/**
 * Find the manifest file path for a given slug.
 * Convention: .beastmode/state/YYYY-MM-DD-<slug>.manifest.json
 * Returns the latest match (date prefix sorts chronologically).
 */
export function manifestPath(
  projectRoot: string,
  slug: string,
): string | undefined {
  const dir = pipelineDir(projectRoot);
  if (!existsSync(dir)) return undefined;
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(`-${slug}.manifest.json`))
    .sort();
  if (files.length === 0) return undefined;
  return resolve(dir, files[files.length - 1]);
}

/**
 * Check if a manifest exists for a given slug.
 */
export function manifestExists(projectRoot: string, slug: string): boolean {
  const path = manifestPath(projectRoot, slug);
  return path !== undefined && existsSync(path);
}

/**
 * Read and parse a manifest for a slug. Throws if missing or corrupt.
 */
export function get(projectRoot: string, slug: string): PipelineManifest {
  const path = manifestPath(projectRoot, slug);
  if (!path || !existsSync(path)) {
    throw new Error(`Manifest not found for slug: ${slug}`);
  }
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as PipelineManifest;
}

/**
 * Load a manifest, returning undefined if it doesn't exist.
 */
export function load(
  projectRoot: string,
  slug: string,
): PipelineManifest | undefined {
  try {
    return get(projectRoot, slug);
  } catch {
    return undefined;
  }
}

/**
 * List all valid manifests in the state directory.
 * Scans for *.manifest.json, reads and validates each, skips invalid ones.
 */
export function list(projectRoot: string): PipelineManifest[] {
  const dir = pipelineDir(projectRoot);
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir).filter((f) => f.endsWith(".manifest.json"));
  const manifests: PipelineManifest[] = [];

  for (const file of files) {
    try {
      const raw = readFileSync(resolve(dir, file), "utf-8");
      const parsed = JSON.parse(raw);
      if (validate(parsed)) {
        manifests.push(parsed);
      }
    } catch {
      // Silently skip invalid/corrupt manifests
    }
  }

  return manifests;
}

/**
 * Write a manifest to disk.
 */
export function save(
  projectRoot: string,
  slug: string,
  manifest: PipelineManifest,
): void {
  const dir = pipelineDir(projectRoot);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path =
    manifestPath(projectRoot, slug) ?? newManifestPath(projectRoot, slug);
  writeFileSync(path, JSON.stringify(manifest, null, 2));
}

/**
 * Remove a manifest from disk. Returns true if a file was deleted.
 */
export function remove(projectRoot: string, slug: string): boolean {
  const path = manifestPath(projectRoot, slug);
  if (!path || !existsSync(path)) return false;
  unlinkSync(path);
  return true;
}

/**
 * Seed a new manifest at design dispatch.
 * Creates the state directory and writes initial manifest.
 * Sets blocked: null on new manifests.
 */
export function create(
  projectRoot: string,
  slug: string,
  opts?: {
    worktree?: { branch: string; path: string };
    github?: ManifestGitHub;
  },
): PipelineManifest {
  const dir = pipelineDir(projectRoot);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const manifest: PipelineManifest = {
    slug,
    phase: "design",
    features: [],
    artifacts: {},
    blocked: null,
    worktree: opts?.worktree,
    github: opts?.github,
    lastUpdated: new Date().toISOString(),
  };

  const path =
    manifestPath(projectRoot, slug) ?? newManifestPath(projectRoot, slug);
  writeFileSync(path, JSON.stringify(manifest, null, 2));
  return manifest;
}

/**
 * Type guard for manifest validation.
 * Validates the PipelineManifest shape: phase is valid Phase, slug is string,
 * features is array of objects with slug (string) and status (valid status),
 * lastUpdated is string. Does NOT require design field.
 */
export function validate(data: unknown): data is PipelineManifest {
  if (data === null || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.slug !== "string") return false;
  if (typeof obj.phase !== "string" || !isValidPhase(obj.phase)) return false;
  if (typeof obj.lastUpdated !== "string") return false;
  if (!Array.isArray(obj.features)) return false;

  for (const f of obj.features) {
    if (f === null || typeof f !== "object") return false;
    const feat = f as Record<string, unknown>;
    if (typeof feat.slug !== "string") return false;
    if (typeof feat.status !== "string") return false;
    if (!isValidFeatureStatus(feat.status)) return false;
  }

  return true;
}

// --- Legacy Support ---

/**
 * Find a manifest in the old artifacts/plan/ location.
 * Used during migration to locate seed manifests.
 * Convention: .beastmode/artifacts/plan/*-<slug>.manifest.json
 */
export function findLegacyManifestPath(
  projectRoot: string,
  designSlug: string,
): string | undefined {
  const planDir = resolve(projectRoot, ".beastmode", "artifacts", "plan");
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
