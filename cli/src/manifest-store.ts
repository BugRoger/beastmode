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
  renameSync,
} from "fs";
import { resolve } from "path";
import { git, gitCheck } from "./git.js";
import type { Phase } from "./types";
import { isValidPhase } from "./types";
import { renameTags } from "./phase-tags.js";

import { basename } from "path";
import { checkBlocked, deriveNextAction } from "./manifest.js";
import type { NextAction } from "./manifest.js";
import { loadConfig } from "./config.js";

// Re-export for consumers that previously imported from state-scanner
export type { NextAction } from "./manifest.js";

// --- Types ---

export interface ManifestFeature {
  slug: string;
  plan: string;
  description?: string;
  wave?: number;
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
  epic?: string;
  phase: Phase;
  features: ManifestFeature[];
  artifacts: Record<string, string[]>;
  summary?: { problem: string; solution: string };
  worktree?: { branch: string; path: string };
  github?: ManifestGitHub;
  blocked?: { gate: string; reason: string } | null;
  originId?: string;
  lastUpdated: string;
}

export interface RenameResult {
  renamed: boolean;
  finalSlug: string;
  completedSteps: string[];
  error?: string;
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

// --- Slug utilities ---

/** Slug format: lowercase alphanumeric with optional hyphens, no leading/trailing hyphens */
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * Validate a string against the slug format.
 */
export function isValidSlug(input: string): boolean {
  return SLUG_PATTERN.test(input);
}

/**
 * Normalize a string to a valid slug.
 * Lowercases, replaces non-alphanumeric with hyphens, collapses multiple hyphens,
 * strips leading/trailing hyphens.
 */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (slug.length === 0) {
    throw new Error(`Cannot slugify empty or all-special-character input: "${input}"`);
  }
  return slug;
}

// --- Rename internals ---

/**
 * Check if a slug collides with any existing branch, worktree dir, or manifest.
 */
async function slugCollides(
  slug: string,
  projectRoot: string,
): Promise<boolean> {
  const branchExists = await gitCheck(
    ["show-ref", "--verify", `refs/heads/feature/${slug}`],
    { cwd: projectRoot },
  );
  if (branchExists) return true;

  const worktreeDir = resolve(projectRoot, ".claude", "worktrees", slug);
  if (existsSync(worktreeDir)) return true;

  if (manifestPath(projectRoot, slug) !== undefined) return true;

  return false;
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
 * Find a manifest by either hex slug or epic name.
 * Prefers slug matches over epic matches — checks all slugs first,
 * then falls back to scanning epic names.
 * Returns the matching manifest or undefined.
 */
export function find(
  projectRoot: string,
  identifier: string,
): PipelineManifest | undefined {
  const all = list(projectRoot);
  return (
    all.find((m) => m.slug === identifier) ??
    all.find((m) => m.epic === identifier)
  );
}

/**
 * Rename a hex-slug epic to a human-readable name.
 *
 * Prepare-then-execute: validates all preconditions before any mutation.
 * On mid-execution failure, reports completed steps so the caller knows
 * what state things are in.
 *
 * Rename sequence:
 * 1. Slugify + validate format
 * 2. Collision detection (uses <epic>-<hex> suffix if needed)
 * 3. Rename design artifacts in worktree
 * 4. Commit renamed artifacts in worktree
 * 5. Rename git branch
 * 6. Move worktree directory + repair git metadata
 * 7. Rename manifest file
 * 8. Update manifest content (set epic, set originId)
 */
export async function rename(
  projectRoot: string,
  hexSlug: string,
  epicName: string,
  worktreePath?: string,
): Promise<RenameResult> {
  const completedSteps: string[] = [];

  // --- Precondition: slugify and validate ---
  let targetSlug: string;
  try {
    targetSlug = slugify(epicName);
  } catch (err: unknown) {
    return {
      renamed: false,
      finalSlug: hexSlug,
      completedSteps,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (!isValidSlug(targetSlug)) {
    return {
      renamed: false,
      finalSlug: hexSlug,
      completedSteps,
      error: `Invalid slug format: "${targetSlug}"`,
    };
  }

  // No-op if already the same
  if (hexSlug === targetSlug) {
    return { renamed: false, finalSlug: targetSlug, completedSteps };
  }

  // --- Precondition: branch must exist ---
  const hexBranch = `feature/${hexSlug}`;
  const branchOk = await gitCheck(
    ["show-ref", "--verify", `refs/heads/${hexBranch}`],
    { cwd: projectRoot },
  );
  if (!branchOk) {
    return {
      renamed: false,
      finalSlug: hexSlug,
      completedSteps,
      error: `Branch not found: ${hexBranch}`,
    };
  }

  // --- Precondition: worktree dir must exist ---
  const hexWorktree = resolve(projectRoot, ".claude", "worktrees", hexSlug);
  if (!existsSync(hexWorktree)) {
    return {
      renamed: false,
      finalSlug: hexSlug,
      completedSteps,
      error: `Worktree directory not found: ${hexWorktree}`,
    };
  }

  // --- Precondition: manifest must exist ---
  const oldManifestPath = manifestPath(projectRoot, hexSlug);
  if (!oldManifestPath) {
    return {
      renamed: false,
      finalSlug: hexSlug,
      completedSteps,
      error: `Manifest not found for slug: ${hexSlug}`,
    };
  }

  // --- Collision detection ---
  let finalSlug = targetSlug;
  if (await slugCollides(targetSlug, projectRoot)) {
    finalSlug = `${targetSlug}-${hexSlug}`;
    if (await slugCollides(finalSlug, projectRoot)) {
      return {
        renamed: false,
        finalSlug: hexSlug,
        completedSteps,
        error: `Both "${targetSlug}" and "${finalSlug}" collide with existing resources`,
      };
    }
    process.stdout.write(
      `[rename] Slug "${targetSlug}" collides, using "${finalSlug}" instead\n`,
    );
  }

  const realBranch = `feature/${finalSlug}`;
  const realWorktree = resolve(projectRoot, ".claude", "worktrees", finalSlug);

  try {
    // Step 1: Rename design artifacts in worktree
    const wtPath = worktreePath ?? hexWorktree;
    if (existsSync(wtPath)) {
      const artifactsDir = resolve(wtPath, ".beastmode", "artifacts", "design");
      if (existsSync(artifactsDir)) {
        const files = readdirSync(artifactsDir);
        for (const filename of files) {
          if (!filename.endsWith(`-${hexSlug}.md`)) continue;
          const oldPath = resolve(artifactsDir, filename);
          const newFilename = filename.replace(`-${hexSlug}.md`, `-${finalSlug}.md`);
          const newPath = resolve(artifactsDir, newFilename);
          renameSync(oldPath, newPath);
          // Update frontmatter slug
          const content = readFileSync(newPath, "utf-8");
          const updated = content.replace(/^(slug:\s*).+$/m, `$1${finalSlug}`);
          writeFileSync(newPath, updated);
          // Remove stale output.json
          const oldOutput = resolve(artifactsDir, filename.replace(".md", ".output.json"));
          if (existsSync(oldOutput)) unlinkSync(oldOutput);
          break;
        }
      }
      completedSteps.push("artifacts");

      // Step 2: Commit renamed artifacts in worktree
      try {
        await git(["add", "-A"], { cwd: wtPath });
        await git(
          ["commit", "-m", `design(${finalSlug}): checkpoint`],
          { cwd: wtPath, allowFailure: true },
        );
        completedSteps.push("artifact-commit");
      } catch {
        // Non-fatal — manifest is source of truth
        completedSteps.push("artifact-commit-skipped");
      }
    }

    // Step 3: Rename git branch
    await git(["branch", "-m", hexBranch, realBranch], {
      cwd: projectRoot,
      allowFailure: false,
    });
    completedSteps.push("branch");

    // Step 3b: Rename phase tags (beastmode/<hex>/* → beastmode/<slug>/*)
    await renameTags(hexSlug, finalSlug, { cwd: projectRoot });
    completedSteps.push("tags");

    // Step 4: Move worktree directory + repair git metadata
    renameSync(hexWorktree, realWorktree);
    completedSteps.push("worktree-dir");

    const gitDir = resolve(projectRoot, ".git", "worktrees", hexSlug);
    const newGitDir = resolve(projectRoot, ".git", "worktrees", finalSlug);
    if (existsSync(gitDir)) {
      renameSync(gitDir, newGitDir);
      const dotGitFile = resolve(realWorktree, ".git");
      writeFileSync(dotGitFile, `gitdir: ${newGitDir}\n`);
      const gitdirPath = resolve(newGitDir, "gitdir");
      if (existsSync(gitdirPath)) {
        writeFileSync(gitdirPath, `${realWorktree}/.git\n`);
      }
    }
    await git(["worktree", "repair"], { cwd: projectRoot, allowFailure: true });
    completedSteps.push("worktree-repair");

    // Step 5: Rename manifest file
    const oldFilename = oldManifestPath.split("/").pop()!;
    const newFilename = oldFilename.replace(
      `-${hexSlug}.manifest.json`,
      `-${finalSlug}.manifest.json`,
    );
    const newManifestFilePath = resolve(
      oldManifestPath.substring(0, oldManifestPath.lastIndexOf("/")),
      newFilename,
    );
    renameSync(oldManifestPath, newManifestFilePath);
    completedSteps.push("manifest-file");

    // Step 6: Update manifest content
    const raw = readFileSync(newManifestFilePath, "utf-8");
    const manifest: PipelineManifest = JSON.parse(raw);
    manifest.slug = finalSlug;
    manifest.epic = finalSlug;
    manifest.originId = hexSlug;
    if (manifest.worktree) {
      manifest.worktree.branch = realBranch;
      manifest.worktree.path = realWorktree;
    }
    writeFileSync(newManifestFilePath, JSON.stringify(manifest, null, 2));
    completedSteps.push("manifest-internals");

    return { renamed: true, finalSlug, completedSteps };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { renamed: false, finalSlug, completedSteps, error: message };
  }
}

/**
 * Write a manifest to disk.
 * Pure write operation — looks up existing path or creates new, writes JSON.
 * All rename logic lives in store.rename().
 */
export function save(
  projectRoot: string,
  slug: string,
  manifest: PipelineManifest,
): void {
  const dir = pipelineDir(projectRoot);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const existingPath = manifestPath(projectRoot, slug);
  const targetPath = existingPath ?? newManifestPath(projectRoot, slug);

  writeFileSync(targetPath, JSON.stringify(manifest, null, 2));
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

// --- Enriched listing (replaces state-scanner.ts scanEpics) ---

/** Enriched manifest with derived fields for the watch loop. */
export interface EnrichedManifest extends PipelineManifest {
  manifestPath: string;
  nextAction: NextAction | null;
}

/** Result of listing enriched manifests. */
export interface ScanResult {
  epics: EnrichedManifest[];
}

/**
 * List all manifests enriched with nextAction and blocked status.
 * Pure read-only — no filesystem writes.
 * Replaces the old scanEpics() from state-scanner.ts.
 */
export function listEnriched(projectRoot: string): ScanResult {
  const manifests = list(projectRoot);
  const config = loadConfig(projectRoot);

  const epics: EnrichedManifest[] = manifests.map((m) => {
    const nextAction = deriveNextAction(m);
    const blocked = checkBlocked(m, config.gates);
    const path = manifestPath(projectRoot, m.slug);

    return {
      ...m,
      blocked: blocked,
      manifestPath: path ?? "",
      nextAction: blocked ? null : nextAction,
    };
  });

  return { epics };
}

// --- Slug utilities (from filename) ---

/**
 * Extract epic slug from a design artifact filename.
 * Input: "2026-03-28-typescript-pipeline-orchestrator.md"
 * Output: "typescript-pipeline-orchestrator"
 */
export function slugFromDesign(filename: string): string {
  return basename(filename, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

/**
 * Extract epic slug from a pipeline manifest filename.
 * Input: "2026-03-28-typescript-pipeline-orchestrator.manifest.json"
 * Output: "typescript-pipeline-orchestrator"
 */
export function slugFromManifest(filename: string): string {
  return basename(filename, ".manifest.json").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

// --- Transactional write ---

/** Per-slug async mutex for serializing manifest mutations. */
const locks = new Map<string, Promise<void>>();

/**
 * Atomically load → transform → save a manifest under a per-slug mutex.
 * Prevents concurrent save races between reconciliation paths.
 * Throws if no manifest exists for the slug.
 */
export async function transact(
  projectRoot: string,
  slug: string,
  fn: (manifest: PipelineManifest) => PipelineManifest,
): Promise<PipelineManifest> {
  const prev = locks.get(slug) ?? Promise.resolve();
  let release!: () => void;
  locks.set(slug, new Promise<void>((r) => { release = r; }));
  await prev;
  try {
    const manifest = load(projectRoot, slug);
    if (!manifest) throw new Error(`No manifest for ${slug}`);
    const updated = fn(manifest);
    save(projectRoot, slug, updated);
    return updated;
  } finally {
    release();
  }
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
