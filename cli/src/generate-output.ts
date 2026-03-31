#!/usr/bin/env bun
/**
 * generate-output.ts — Stop hook that reads artifact frontmatter and
 * generates output.json completion contracts.
 *
 * Replaces generate-output-json.sh with typed, testable TypeScript.
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
import type { PhaseOutput } from "./types.js";

const WORKFLOW_PHASES: readonly string[] = ["design", "plan", "implement", "validate", "release"];

/** Frontmatter extracted from a markdown artifact. */
export interface ArtifactFrontmatter {
  phase?: string;
  slug?: string;
  epic?: string;
  feature?: string;
  status?: string;
  bump?: string;
  description?: string;
  problem?: string;
  solution?: string;
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
): PhaseOutput | undefined {
  switch (fm.phase) {
    case "design": {
      const summary = fm.problem && fm.solution
        ? { problem: fm.problem, solution: fm.solution }
        : undefined;
      return {
        status: (fm.status as PhaseOutput["status"]) ?? "completed",
        artifacts: { design: artifactPath, slug: fm.slug, summary },
      };
    }

    case "plan": {
      const epic = fm.epic ?? fm.slug;
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
            slug: fm.feature ?? "unknown",
            status: (fm.status ?? "completed") as "completed" | "blocked",
          }],
        },
      };

    case "validate": {
      const passed = fm.status !== "failed";
      return {
        status: passed ? "completed" : "error",
        artifacts: { report: artifactPath, passed },
      };
    }

    case "release":
      return {
        status: (fm.status as PhaseOutput["status"]) ?? "completed",
        artifacts: {
          version: fm.bump ?? "patch",
          changelog: artifactPath,
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
): Array<{ slug: string; plan: string; description?: string }> {
  if (!epic) return [];

  const planDir = join(artifactsDir, "plan");
  if (!existsSync(planDir)) return [];

  const features: Array<{ slug: string; plan: string; description?: string }> = [];

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
    // Strict epic match — the fix for the stale-artifact bug
    if (fm.epic !== epic) continue;

    features.push({
      slug: fm.feature,
      plan: basename(filePath, ".md") + ".md",
      description: fm.description,
    });
  }

  return features;
}

/**
 * Process a single artifact file: parse frontmatter, build output,
 * write output.json if the artifact is newer.
 */
export function processArtifact(artifactPath: string, artifactsDir: string): boolean {
  let content: string;
  try {
    content = readFileSync(artifactPath, "utf-8");
  } catch {
    return false;
  }

  const fm = parseFrontmatter(content);
  if (!fm.phase || !WORKFLOW_PHASES.includes(fm.phase)) return false;

  const artBasename = basename(artifactPath, ".md");
  const outputPath = join(artifactsDir, fm.phase, `${artBasename}.output.json`);

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

  const output = buildOutput(artifactPath, fm, artifactsDir);
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
 * Scan all artifact directories and generate output.json files.
 * Returns the number of files generated/updated.
 */
export function generateAll(artifactsDir: string): number {
  if (!existsSync(artifactsDir)) return 0;

  let count = 0;

  for (const phase of WORKFLOW_PHASES) {
    const phaseDir = join(artifactsDir, phase);
    if (!existsSync(phaseDir)) continue;

    for (const filename of readdirSync(phaseDir)) {
      if (!filename.endsWith(".md")) continue;
      const filePath = join(phaseDir, filename);
      if (processArtifact(filePath, artifactsDir)) {
        count++;
      }
    }
  }

  return count;
}

// --- CLI entry point ---

if (import.meta.main) {
  try {
    const repoRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
    const artifactsDir = resolve(repoRoot, ".beastmode", "artifacts");
    generateAll(artifactsDir);
  } catch {
    // Silent exit — hook failure must never block Claude
  }
  process.exit(0);
}
