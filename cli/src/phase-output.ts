/**
 * Phase output reader — parses structured output files written by skill checkpoints.
 *
 * Convention: .beastmode/state/<phase>/YYYY-MM-DD-<slug>.output.json
 * Schema: { "status": "completed"|"error"|"cancelled", "artifacts": { ... } }
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";
import type { Phase, PhaseOutput } from "./types";

/**
 * Resolve the expected output file path for a phase and slug.
 * Convention: .beastmode/state/<phase>/YYYY-MM-DD-<slug>.output.json
 * Uses today's date prefix — for finding existing files, use findOutputFile.
 */
export function outputPath(projectRoot: string, phase: Phase, slug: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return resolve(projectRoot, ".beastmode", "state", phase, `${date}-${slug}.output.json`);
}

/**
 * Find the most recent output file for a phase and slug.
 * Scans .beastmode/state/<phase>/ for files matching *-<slug>.output.json
 * and returns the latest by date prefix (lexicographic sort).
 *
 * Returns undefined if no matching file exists.
 */
export function findOutputFile(projectRoot: string, phase: Phase, slug: string): string | undefined {
  const dir = resolve(projectRoot, ".beastmode", "state", phase);
  if (!existsSync(dir)) return undefined;

  const suffix = `-${slug}.output.json`;
  const matches = readdirSync(dir)
    .filter((f) => f.endsWith(suffix))
    .sort();

  if (matches.length === 0) return undefined;
  return resolve(dir, matches[matches.length - 1]);
}

/**
 * Read and parse a phase output file.
 * Returns the parsed PhaseOutput, or undefined if the file is missing.
 * Throws on corrupt/malformed JSON.
 */
export function readOutput(filePath: string): PhaseOutput {
  if (!existsSync(filePath)) {
    throw new Error(`Phase output file not found: ${filePath}`);
  }

  const raw = readFileSync(filePath, "utf-8");
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Corrupt phase output (invalid JSON): ${filePath}`);
  }

  if (!isValidPhaseOutput(parsed)) {
    throw new Error(`Malformed phase output (missing status or artifacts): ${filePath}`);
  }

  return parsed;
}

/**
 * Safely read a phase output file. Returns undefined on any error
 * (missing file, corrupt JSON, malformed structure).
 */
export function loadOutput(filePath: string): PhaseOutput | undefined {
  try {
    return readOutput(filePath);
  } catch {
    return undefined;
  }
}

/**
 * Find and read the most recent phase output for a given phase and slug.
 * Convenience function combining findOutputFile + readOutput.
 *
 * Returns undefined if no output file exists.
 * Throws on corrupt/malformed files.
 */
export function readPhaseOutput(projectRoot: string, phase: Phase, slug: string): PhaseOutput | undefined {
  const file = findOutputFile(projectRoot, phase, slug);
  if (!file) return undefined;
  return readOutput(file);
}

/**
 * Find and safely load the most recent phase output for a given phase and slug.
 * Returns undefined on any error.
 */
export function loadPhaseOutput(projectRoot: string, phase: Phase, slug: string): PhaseOutput | undefined {
  const file = findOutputFile(projectRoot, phase, slug);
  if (!file) return undefined;
  return loadOutput(file);
}

/**
 * Extract per-feature status entries from a phase output.
 * Looks for `artifacts.features` (present in plan and implement outputs).
 * Returns an empty array if the output has no feature list or the data is malformed.
 */
export function extractFeatureStatuses(output: PhaseOutput): Array<{ slug: string; status: string }> {
  const artifacts = output.artifacts as unknown as Record<string, unknown>;
  if (!artifacts || !Array.isArray(artifacts.features)) return [];

  const result: Array<{ slug: string; status: string }> = [];
  for (const entry of artifacts.features) {
    if (
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as Record<string, unknown>).slug === "string"
    ) {
      const rec = entry as Record<string, unknown>;
      result.push({
        slug: rec.slug as string,
        status: typeof rec.status === "string" ? rec.status : "unknown",
      });
    }
  }
  return result;
}

/**
 * Extract artifact file paths from a phase output.
 * Collects string-valued entries from `artifacts` that look like file paths
 * (from fields like `design`, `report`, `changelog`, `deviations`),
 * plus any `artifacts.files` or `artifacts.paths` arrays if present.
 * Returns an empty array if no paths are found.
 */
export function extractArtifactPaths(output: PhaseOutput): string[] {
  const artifacts = output.artifacts as unknown as Record<string, unknown>;
  if (!artifacts) return [];

  const paths: string[] = [];

  // Collect known string path fields
  for (const key of ["design", "report", "changelog", "deviations"]) {
    const val = artifacts[key];
    if (typeof val === "string" && val.length > 0) {
      paths.push(val);
    }
  }

  // Collect from `files` or `paths` arrays
  for (const key of ["files", "paths"]) {
    const arr = artifacts[key];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (typeof item === "string" && item.length > 0) {
          paths.push(item);
        }
      }
    }
  }

  return paths;
}

// --- Worktree artifact-based output (where the stop hook actually writes) ---

/**
 * Find the most recent output.json in a worktree's artifacts directory.
 * The stop hook writes to .beastmode/artifacts/<phase>/*.output.json,
 * NOT to .beastmode/state/<phase>/.
 *
 * When epicSlug is provided, only considers output files whose filename
 * contains the epic slug (boundary-aware to avoid substring false positives).
 */
export function findWorktreeOutputFile(worktreePath: string, phase: Phase, epicSlug?: string): string | undefined {
  const dir = resolve(worktreePath, ".beastmode", "artifacts", phase);
  if (!existsSync(dir)) return undefined;

  let matches = readdirSync(dir)
    .filter((f) => f.endsWith(".output.json"));

  if (epicSlug) {
    matches = matches.filter((f) => filenameMatchesEpic(f, epicSlug));
  }

  matches.sort();
  if (matches.length === 0) return undefined;
  return resolve(dir, matches[matches.length - 1]);
}

/**
 * Find and safely load the most recent phase output from a worktree's
 * artifacts directory. Returns undefined on any error.
 *
 * When epicSlug is provided, only considers output files belonging to that epic.
 */
export function loadWorktreePhaseOutput(worktreePath: string, phase: Phase, epicSlug?: string): PhaseOutput | undefined {
  const file = findWorktreeOutputFile(worktreePath, phase, epicSlug);
  if (!file) return undefined;
  return loadOutput(file);
}

/**
 * Check if an output.json filename belongs to a given epic.
 * Handles three naming conventions:
 *   YYYY-MM-DD-<epic>.output.json          (epic-level, no feature)
 *   YYYY-MM-DD-<epic>-<feature>.output.json (feature-level)
 * Uses boundary-aware matching to avoid substring false positives
 * (e.g., "foo" should not match "foobar").
 */
export function filenameMatchesEpic(filename: string, epicSlug: string): boolean {
  // Strip the date prefix (YYYY-MM-DD-) and .output.json suffix
  const stripped = filename.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.output\.json$/, "");
  // The remaining string is either "<epic>" or "<epic>-<feature>"
  return stripped === epicSlug || stripped.startsWith(epicSlug + "-");
}

/**
 * Check if an output.json filename matches a specific epic+feature combo.
 * Matches: YYYY-MM-DD-<epic>-<feature>.output.json
 */
export function filenameMatchesFeature(filename: string, epicSlug: string, featureSlug: string): boolean {
  const stripped = filename.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.output\.json$/, "");
  return stripped === `${epicSlug}-${featureSlug}`;
}

/**
 * Find and safely load the phase output for a specific feature from a worktree.
 * Returns undefined if no matching feature-level output exists.
 */
export function loadWorktreeFeatureOutput(worktreePath: string, phase: Phase, epicSlug: string, featureSlug: string): PhaseOutput | undefined {
  const dir = resolve(worktreePath, ".beastmode", "artifacts", phase);
  if (!existsSync(dir)) return undefined;

  const matches = readdirSync(dir)
    .filter((f) => f.endsWith(".output.json"))
    .filter((f) => filenameMatchesFeature(f, epicSlug, featureSlug))
    .sort();

  if (matches.length === 0) return undefined;
  return loadOutput(resolve(dir, matches[matches.length - 1]));
}

/**
 * Validate that a parsed value conforms to the PhaseOutput shape.
 */
function isValidPhaseOutput(value: unknown): value is PhaseOutput {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!["completed", "error", "cancelled"].includes(obj.status as string)) return false;
  if (typeof obj.artifacts !== "object" || obj.artifacts === null) return false;
  return true;
}
