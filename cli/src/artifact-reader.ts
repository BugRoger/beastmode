/**
 * Artifact Reader — resolves and reads artifact files from disk.
 *
 * Single point of filesystem access for artifact content.
 * Body-format and section-splitter never touch the filesystem.
 *
 * Resolution order:
 * 1. manifest.artifacts[phase] — direct path lookup
 * 2. Glob scan artifacts/{phase}/ by slug pattern — fallback
 * 3. undefined — graceful degradation when nothing found
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, join } from "path";

/**
 * Read an artifact file for a given phase and slug.
 *
 * Tries manifest.artifacts first, falls back to glob scanning.
 * Returns the raw markdown content, or undefined if not found.
 *
 * @param projectRoot - Absolute path to the project root (.beastmode parent)
 * @param phase - Phase name (e.g., "design", "plan")
 * @param slug - Epic slug to match against
 * @param artifacts - The manifest.artifacts record (phase → paths[])
 * @returns Raw markdown content, or undefined
 */
export function readArtifact(
  projectRoot: string,
  phase: string,
  slug: string,
  artifacts: Record<string, string[]>,
): string | undefined {
  // Strategy 1: manifest.artifacts lookup
  const paths = artifacts[phase];
  if (paths && paths.length > 0) {
    for (const p of paths) {
      const abs = resolve(projectRoot, p);
      if (existsSync(abs)) {
        try {
          return readFileSync(abs, "utf-8");
        } catch {
          // Fall through to glob
        }
      }
    }
  }

  // Strategy 2: glob scan artifacts/{phase}/ by slug pattern
  const artifactDir = resolve(projectRoot, ".beastmode", "artifacts", phase);
  if (!existsSync(artifactDir)) return undefined;

  try {
    const files = readdirSync(artifactDir);
    // Match files containing the slug, ending in .md (not .json)
    const match = files
      .filter((f) => f.includes(slug) && f.endsWith(".md"))
      .sort()
      .pop(); // Latest by date prefix sort

    if (match) {
      return readFileSync(join(artifactDir, match), "utf-8");
    }
  } catch {
    // Graceful degradation
  }

  return undefined;
}
