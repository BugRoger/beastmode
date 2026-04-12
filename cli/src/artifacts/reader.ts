/**
 * Artifact reader — phase output parsing, artifact resolution,
 * section extraction, and section splitting.
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, join, relative } from "path";
import type { Phase, PhaseOutput } from "../types.js";
import type { Logger } from "../logger.js";

/**
 * Split markdown content into sections by `## ` headings.
 *
 * - Strips YAML frontmatter (between `---` markers at start) before splitting.
 * - Content before the first heading is stored under key `""` (empty string).
 * - Heading names are case-sensitive, trimmed of leading/trailing whitespace.
 * - Empty sections (heading immediately followed by another heading) map to `""`.
 * - Only splits on `## ` (two hashes + space), not `# ` or `### `.
 *
 * @param markdown - Raw markdown string
 * @returns Map of heading name -> section body (both trimmed)
 */
export function splitSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();

  // Strip YAML frontmatter if present
  let content = markdown;
  if (content.startsWith("---")) {
    const endIdx = content.indexOf("---", 3);
    if (endIdx !== -1) {
      content = content.slice(endIdx + 3);
    }
  }

  const lines = content.split("\n");
  let currentHeading = "";
  let currentBody: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      // Flush previous section
      if (currentHeading !== "" || currentBody.length > 0) {
        sections.set(currentHeading, currentBody.join("\n").trim());
      }
      currentHeading = line.slice(3).trim();
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }

  // Flush last section
  if (currentHeading !== "" || currentBody.length > 0) {
    sections.set(currentHeading, currentBody.join("\n").trim());
  }

  return sections;
}

/**
 * Resolve the path to an artifact file for a given phase and slug.
 *
 * Resolution order:
 * 1. manifest.artifacts[phase] — first entry that exists on disk
 * 2. Glob scan `.beastmode/artifacts/{phase}/` for `*-{slug}.md` — latest by date prefix
 * 3. undefined — never throws
 *
 * @param projectRoot - Absolute path to project root
 * @param phase - Phase name (e.g., "design", "plan")
 * @param slug - Epic slug to match against
 * @param manifest - Optional manifest with artifacts record
 * @returns Relative path to artifact file, or undefined
 */
export function resolveArtifactPath(
  projectRoot: string,
  phase: string,
  slug: string,
  manifest?: { artifacts: Record<string, string[]> },
): string | undefined {
  // Strategy 1: manifest.artifacts lookup
  if (manifest) {
    const paths = manifest.artifacts[phase];
    if (paths && paths.length > 0) {
      const first = paths[0];
      const abs = resolve(projectRoot, first);
      if (existsSync(abs)) {
        return first;
      }
    }
  }

  // Strategy 2: scan artifacts/{phase}/ by slug pattern
  const artifactDir = resolve(projectRoot, ".beastmode", "artifacts", phase);
  if (!existsSync(artifactDir)) return undefined;

  try {
    const files = readdirSync(artifactDir);
    const match = files
      .filter((f) => f.endsWith(`-${slug}.md`))
      .sort()
      .pop(); // Latest by lexicographic (date prefix) sort

    if (match) {
      return relative(projectRoot, join(artifactDir, match));
    }
  } catch {
    // Graceful degradation
  }

  return undefined;
}

/**
 * Resolve, read, and split an artifact file into sections.
 *
 * Orchestrates resolveArtifactPath + readFileSync + splitSections.
 * Returns undefined (with a warning log) when anything fails.
 *
 * @param projectRoot - Absolute path to project root
 * @param phase - Phase name
 * @param slug - Epic slug
 * @param manifest - Optional manifest with artifacts record
 * @param logger - Optional logger for warnings
 * @returns Map of heading -> section body, or undefined
 */
export function readArtifactSections(
  projectRoot: string,
  phase: string,
  slug: string,
  manifest?: { artifacts: Record<string, string[]> },
  logger?: Logger,
): Map<string, string> | undefined {
  const path = resolveArtifactPath(projectRoot, phase, slug, manifest);
  if (!path) {
    logger?.warn(`No ${phase} artifact found for slug "${slug}"`);
    return undefined;
  }

  let content: string;
  try {
    content = readFileSync(resolve(projectRoot, path), "utf-8");
  } catch {
    logger?.warn(`Failed to read ${phase} artifact: ${path}`);
    return undefined;
  }

  const sections = splitSections(content);
  if (sections.size === 0) {
    logger?.warn(`Empty sections in ${phase} artifact: ${path}`);
    return undefined;
  }

  return sections;
}

/** Strip YAML frontmatter (--- delimited block at start of content). */
function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return content;
  return content.slice(end + 4);
}

/** Escape special regex characters in a string. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extract a named `## ` section from markdown content.
 *
 * Returns the body text between the heading and the next `## ` heading or EOF.
 * Returns undefined if the section is not found or content is empty.
 */
export function extractSection(
  content: string,
  sectionName: string,
): string | undefined {
  if (!content) return undefined;

  const body = stripFrontmatter(content);
  const heading = `## ${sectionName}`;

  // Find the target heading at start of a line
  const pattern = new RegExp(`^${escapeRegex(heading)}\\s*$`, "m");
  const match = pattern.exec(body);
  if (!match) return undefined;

  // Everything after the heading line
  const start = match.index + match[0].length;
  const rest = body.slice(start);

  // Find next ## heading or EOF
  const nextHeading = rest.search(/^## /m);
  const sectionBody =
    nextHeading === -1 ? rest : rest.slice(0, nextHeading);

  const trimmed = sectionBody.trim();
  return trimmed || undefined;
}

/**
 * Extract a named section from a markdown file.
 *
 * Returns undefined if the file doesn't exist, can't be read, or the section isn't found.
 */
export async function extractSectionFromFile(
  filePath: string,
  sectionName: string,
): Promise<string | undefined> {
  try {
    const content = readFileSync(filePath, "utf-8");
    return extractSection(content, sectionName);
  } catch {
    return undefined;
  }
}

/**
 * Extract multiple named sections from markdown content.
 *
 * Returns a partial record — only includes sections that were found.
 */
export function extractSections(
  content: string,
  sectionNames: string[],
): Partial<Record<string, string>> {
  const result: Partial<Record<string, string>> = {};
  for (const name of sectionNames) {
    const value = extractSection(content, name);
    if (value !== undefined) {
      result[name] = value;
    }
  }
  return result;
}

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
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch {
    throw new Error(`Phase output file not found: ${filePath}`);
  }

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
 *
 * When hexSlug is provided, also matches hex-named files (pre-rename)
 * during the design phase transition window.
 */
export function filenameMatchesEpic(filename: string, epicSlug: string, hexSlug?: string): boolean {
  // Strip the date prefix (YYYY-MM-DD-) and .output.json suffix
  const stripped = filename.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.output\.json$/, "");
  // The remaining string is either "<epic>" or "<epic>-<feature>"
  if (stripped === epicSlug || stripped.startsWith(epicSlug + "-")) return true;
  // During design transition, files may still use the hex slug
  if (hexSlug && (stripped === hexSlug || stripped.startsWith(hexSlug + "-"))) return true;
  return false;
}

/**
 * Check if an output.json filename matches a specific epic+feature combo.
 * Matches: YYYY-MM-DD-<epic>--<feature>.output.json
 */
function filenameMatchesFeature(filename: string, epicSlug: string, featureSlug: string): boolean {
  const stripped = filename.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.output\.json$/, "");
  return stripped === `${epicSlug}--${featureSlug}`;
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
