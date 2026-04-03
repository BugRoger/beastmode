/**
 * Phase tag management — create, delete, list, rename tags for phase checkpoints.
 *
 * Tag convention: beastmode/<slug>/<phase>
 * All operations use allowFailure — missing tags warn but never crash.
 */

import { git } from "./worktree.js";

/** Workflow phases in order (excludes terminal states) */
const WORKFLOW_PHASES = [
  "design",
  "plan",
  "implement",
  "validate",
  "release",
] as const;

/** Build the tag name for a slug/phase pair */
export function tagName(slug: string, phase: string): string {
  return `beastmode/${slug}/${phase}`;
}

/**
 * Create (or overwrite) a phase tag at HEAD.
 * Uses -f to handle same-phase reruns where the tag already exists.
 */
export async function createTag(
  slug: string,
  phase: string,
  opts: { cwd?: string } = {},
): Promise<void> {
  const tag = tagName(slug, phase);
  await git(["tag", "-f", tag], { cwd: opts.cwd, allowFailure: true });
}

/**
 * Delete tags for all phases after the given phase.
 * Used during regression to clean up downstream tags.
 */
export async function deleteTags(
  slug: string,
  afterPhase: string,
  opts: { cwd?: string } = {},
): Promise<void> {
  const idx = WORKFLOW_PHASES.indexOf(
    afterPhase as (typeof WORKFLOW_PHASES)[number],
  );
  if (idx < 0) return; // Unknown phase — nothing to delete

  const phasesToDelete = WORKFLOW_PHASES.slice(idx + 1);
  for (const phase of phasesToDelete) {
    const tag = tagName(slug, phase);
    await git(["tag", "-d", tag], { cwd: opts.cwd, allowFailure: true });
  }
}

/**
 * Delete all beastmode tags for a slug.
 */
export async function deleteAllTags(
  slug: string,
  opts: { cwd?: string } = {},
): Promise<void> {
  const tags = await listTags(slug, opts);
  for (const tag of tags) {
    await git(["tag", "-d", tag], { cwd: opts.cwd, allowFailure: true });
  }
}

/**
 * Rename all tags from one slug to another.
 * For each existing tag: create new tag at same SHA, delete old tag.
 */
export async function renameTags(
  oldSlug: string,
  newSlug: string,
  opts: { cwd?: string } = {},
): Promise<void> {
  const existingTags = await listTags(oldSlug, opts);

  for (const oldTag of existingTags) {
    // Extract phase from tag name: beastmode/<slug>/<phase>
    const phase = oldTag.split("/").pop();
    if (!phase) continue;

    // Get SHA of old tag
    const shaResult = await git(["rev-parse", oldTag], {
      cwd: opts.cwd,
      allowFailure: true,
    });
    if (shaResult.exitCode !== 0) continue;

    const newTag = tagName(newSlug, phase);
    // Create new tag at same SHA
    await git(["tag", newTag, shaResult.stdout], {
      cwd: opts.cwd,
      allowFailure: true,
    });
    // Delete old tag
    await git(["tag", "-d", oldTag], { cwd: opts.cwd, allowFailure: true });
  }
}

/**
 * List all beastmode tags for a slug.
 */
export async function listTags(
  slug: string,
  opts: { cwd?: string } = {},
): Promise<string[]> {
  const pattern = `beastmode/${slug}/*`;
  const result = await git(["tag", "-l", pattern], {
    cwd: opts.cwd,
    allowFailure: true,
  });
  if (result.exitCode !== 0 || !result.stdout) return [];
  return result.stdout.split("\n").filter(Boolean);
}
