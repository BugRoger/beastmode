/**
 * session-stop.ts — Stop hook that reads artifact frontmatter and
 * generates output.json completion contracts.
 *
 * Renamed from generate-output.ts for symmetry with session-start.
 *
 * Runs after Claude finishes responding. Scans .beastmode/artifacts/<phase>/
 * for all .md files with YAML frontmatter, parses each, and writes the
 * corresponding output.json file if the artifact is newer than its output.
 *
 * Idempotent: safe to run multiple times; same input produces same output.
 * Exits 0 always — hook failure must never block Claude.
 */

import { readdirSync, readFileSync, writeFileSync, renameSync, statSync, existsSync } from "node:fs";
import { resolve, basename, join } from "node:path";
import { execSync } from "node:child_process";
import type { PhaseOutput } from "../types.js";

const WORKFLOW_PHASES: readonly string[] = ["design", "plan", "implement", "validate", "release"];

/** Frontmatter extracted from a markdown artifact. */
export interface ArtifactFrontmatter {
  phase?: string;
  id?: string;
  epic?: string;
  feature?: string;
  status?: string;
  bump?: string;
  description?: string;
  problem?: string;
  solution?: string;
  wave?: string;
  failedFeatures?: string;
}

/**
 * Parse YAML frontmatter from a markdown file's content.
 * Returns an empty object if no frontmatter is found.
 */
export function parseFrontmatter(content: string): ArtifactFrontmatter {
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) return {};

  const endIdx = content.indexOf("\n---", 3);
  if (endIdx === -1) return {};

  const block = content.slice(4, endIdx);
  const result: Record<string, string> = {};

  for (const line of block.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result as ArtifactFrontmatter;
}

/**
 * Build a PhaseOutput object for a given artifact.
 * Returns undefined if the artifact's phase is unrecognized.
 */
export function buildOutput(
  artifactPath: string,
  fm: ArtifactFrontmatter,
  artifactsDir: string,
  featureOverride?: string,
): PhaseOutput | undefined {
  switch (fm.phase) {
    case "design": {
      const summary = fm.problem && fm.solution
        ? { problem: fm.problem, solution: fm.solution }
        : undefined;
      return {
        status: (fm.status as PhaseOutput["status"]) ?? "completed",
        artifacts: { design: basename(artifactPath), slug: fm.epic ?? fm.id, epic: fm.epic, summary },
      };
    }

    case "plan": {
      const epic = fm.epic ?? fm.id;
      const features = scanPlanFeatures(artifactsDir, epic);
      return {
        status: (fm.status as PhaseOutput["status"]) ?? "completed",
        artifacts: { features },
      };
    }

    case "implement":
      return {
        status: (fm.status as PhaseOutput["status"]) ?? "completed",
        artifacts: {
          features: [{
            slug: featureOverride ?? fm.feature ?? "unknown",
            status: (fm.status ?? "completed") as "completed" | "blocked",
          }],
        },
      };

    case "validate": {
      const passed = fm.status !== "failed";
      const failedFeatures = fm.failedFeatures
        ? fm.failedFeatures.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;
      return {
        status: passed ? "completed" : "error",
        artifacts: {
          report: basename(artifactPath),
          passed,
          ...(failedFeatures && failedFeatures.length > 0 ? { failedFeatures } : {}),
        },
      };
    }

    case "release":
      return {
        status: (fm.status as PhaseOutput["status"]) ?? "completed",
        artifacts: {
          version: fm.bump ?? "patch",
          changelog: basename(artifactPath),
        },
      };

    default:
      return undefined;
  }
}

/**
 * Scan plan artifacts for features belonging to an epic.
 * Only includes files whose frontmatter `epic` field exactly matches.
 */
export function scanPlanFeatures(
  artifactsDir: string,
  epic: string | undefined,
): Array<{ slug: string; plan: string; description?: string; wave?: number }> {
  if (!epic) return [];

  const planDir = join(artifactsDir, "plan");
  if (!existsSync(planDir)) return [];

  const features: Array<{ slug: string; plan: string; description?: string; wave?: number }> = [];

  for (const filename of readdirSync(planDir)) {
    if (!filename.endsWith(".md")) continue;

    const filePath = join(planDir, filename);
    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    const fm = parseFrontmatter(content);
    if (!fm.feature) continue;
    // Match on epic field only — slug fallback removed per env-frontmatter-contract
    if (fm.epic !== epic) continue;

    const entry: { slug: string; plan: string; description?: string; wave?: number } = {
      slug: fm.feature,
      plan: basename(filePath, ".md") + ".md",
      description: fm.description,
    };
    if (fm.wave !== undefined) {
      const parsed = parseInt(fm.wave, 10);
      if (!isNaN(parsed) && parsed >= 1) {
        entry.wave = parsed;
      }
    }
    features.push(entry);
  }

  return features;
}

/**
 * Process a single artifact file: parse frontmatter, build output,
 * write output.json if the artifact is newer.
 */
export function processArtifact(artifactPath: string, artifactsDir: string, worktreeSlug?: string, featureOverride?: string): boolean {
  let content: string;
  try {
    content = readFileSync(artifactPath, "utf-8");
  } catch {
    return false;
  }

  const fm = parseFrontmatter(content);
  if (!fm.phase || !WORKFLOW_PHASES.includes(fm.phase)) return false;

  const artBasename = basename(artifactPath, ".md");

  let outputBasename: string;
  if (worktreeSlug) {
    // Derive output filename from worktree name (CLI-controlled, not skill-controlled).
    // During design the worktree is still the hex slug; after rename it's the epic name.
    const dateMatch = artBasename.match(/^(\d{4}-\d{2}-\d{2})-/);
    const date = dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10);
    const effectiveFeature = featureOverride ?? fm.feature;
    const featureSuffix = effectiveFeature ? `-${effectiveFeature}` : "";
    outputBasename = `${date}-${worktreeSlug}${featureSuffix}`;
  } else {
    outputBasename = artBasename;
  }

  const outputPath = join(artifactsDir, fm.phase, `${outputBasename}.output.json`);

  // Skip if output.json exists and is newer than the artifact
  if (existsSync(outputPath)) {
    try {
      const artMtime = statSync(artifactPath).mtimeMs;
      const outMtime = statSync(outputPath).mtimeMs;
      if (outMtime >= artMtime) return false;
    } catch {
      // Can't stat — regenerate
    }
  }

  const output = buildOutput(artifactPath, fm, artifactsDir, featureOverride);
  if (!output) return false;

  // Atomic write: tmp -> rename
  const tmpPath = outputPath + ".tmp";
  try {
    writeFileSync(tmpPath, JSON.stringify(output, null, 2) + "\n");
    renameSync(tmpPath, outputPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Scan artifact directories and generate output.json files.
 *
 * When `scope` is "changed", only processes .md files that git reports as
 * new or modified (staged or unstaged). This prevents stale artifacts
 * inherited from main from generating phantom output.json files.
 *
 * Falls back to scanning everything if git diff fails.
 *
 * Returns the number of files generated/updated.
 */
export function runSessionStop(artifactsDir: string, scope?: "changed" | "all", worktreeSlug?: string): number {
  if (!existsSync(artifactsDir)) return 0;

  if (scope === "changed") {
    return generateChanged(artifactsDir, worktreeSlug);
  }

  let count = 0;
  for (const phase of WORKFLOW_PHASES) {
    const phaseDir = join(artifactsDir, phase);
    if (!existsSync(phaseDir)) continue;

    for (const filename of readdirSync(phaseDir)) {
      if (!filename.endsWith(".md")) continue;
      const filePath = join(phaseDir, filename);
      if (processArtifact(filePath, artifactsDir, worktreeSlug)) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Only generate output.json for .md artifacts that git reports as new or
 * modified. Uses `git diff HEAD --name-only` (committed changes on branch)
 * plus `git diff --name-only` (uncommitted changes).
 */
function generateChanged(artifactsDir: string, worktreeSlug?: string): number {
  const repoRoot = resolve(artifactsDir, "..", "..");
  const artifactsPrefix = ".beastmode/artifacts/";

  let changedFiles: string[];
  try {
    // Committed changes on this branch vs merge-base with main
    const committed = execSync("git diff main...HEAD --name-only --diff-filter=AM", {
      cwd: repoRoot,
      encoding: "utf-8",
    }).trim();
    // Uncommitted changes (staged + unstaged)
    const uncommitted = execSync("git diff HEAD --name-only --diff-filter=AM", {
      cwd: repoRoot,
      encoding: "utf-8",
    }).trim();

    const all = new Set([
      ...committed.split("\n").filter(Boolean),
      ...uncommitted.split("\n").filter(Boolean),
    ]);

    changedFiles = [...all].filter(
      (f) => f.startsWith(artifactsPrefix) && f.endsWith(".md"),
    );
  } catch {
    // git diff failed — fall back to full scan
    return runSessionStop(artifactsDir, "all", worktreeSlug);
  }

  let count = 0;
  for (const relPath of changedFiles) {
    const filePath = resolve(repoRoot, relPath);
    if (existsSync(filePath)) {
      if (processArtifact(filePath, artifactsDir, worktreeSlug)) count++;
    }
  }
  return count;
}
