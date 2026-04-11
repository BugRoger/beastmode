/**
 * session-start.ts — SessionStart hook for phase context injection.
 *
 * Reads environment variables, assembles L0 + L1 context, resolves parent
 * artifacts per phase, evaluates gates, and outputs JSON with additionalContext.
 *
 * Pure function core (assembleContext) for testability.
 * CLI entry point (runSessionStart) for hook execution.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./generate-output.js";

// --- Types ---

export interface SessionStartInput {
  phase: string;
  epic: string;
  slug: string;
  feature?: string;
  repoRoot: string;
}

const VALID_PHASES = ["design", "plan", "implement", "validate", "release"];

// --- Core Logic ---

/**
 * Assemble the full context string for a given phase.
 * Throws on missing required inputs, context files, or artifacts.
 */
export function assembleContext(input: SessionStartInput): string {
  const { phase, epic, slug, feature, repoRoot } = input;

  // Validate required inputs
  if (!phase || !VALID_PHASES.includes(phase)) {
    throw new Error(`Missing or invalid phase: "${phase}". Valid phases: ${VALID_PHASES.join(", ")}`);
  }
  if (!epic) throw new Error("Missing required input: epic");
  if (!slug) throw new Error("Missing required input: slug");
  if (phase === "implement" && !feature) {
    throw new Error("Missing required input: feature (required for implement phase)");
  }

  const beastmodeDir = join(repoRoot, ".beastmode");
  const sections: string[] = [];

  // L0 context
  const l0Path = join(beastmodeDir, "BEASTMODE.md");
  if (!existsSync(l0Path)) {
    throw new Error(`L0 context file not found: BEASTMODE.md`);
  }
  sections.push(readFileSync(l0Path, "utf-8"));

  // L1 context
  const l1Filename = `${phase.toUpperCase()}.md`;
  const l1Path = join(beastmodeDir, "context", l1Filename);
  if (!existsSync(l1Path)) {
    throw new Error(`L1 context file not found: ${l1Filename}`);
  }
  sections.push(readFileSync(l1Path, "utf-8"));

  // Phase-specific artifact resolution
  const artifactsDir = join(beastmodeDir, "artifacts");
  const artifacts = resolveArtifacts(phase, epic, feature, artifactsDir);
  if (artifacts.length > 0) {
    sections.push(...artifacts);
  }

  // Gate evaluation (validate phase only)
  if (phase === "validate") {
    const gateSection = evaluateGates(epic, artifactsDir);
    sections.push(gateSection);
  }

  return sections.join("\n\n---\n\n");
}

/**
 * Resolve parent artifacts for the given phase.
 * Returns array of artifact content strings.
 * Throws if a required artifact is missing.
 */
function resolveArtifacts(
  phase: string,
  epic: string,
  feature: string | undefined,
  artifactsDir: string,
): string[] {
  switch (phase) {
    case "design":
      return [];

    case "plan": {
      const designDir = join(artifactsDir, "design");
      const artifact = findLatestArtifact(designDir, epic);
      if (!artifact) {
        throw new Error(`No design artifact found for epic "${epic}". Expected pattern: *-${epic}.md in ${designDir}`);
      }
      return [readFileSync(artifact, "utf-8")];
    }

    case "implement": {
      const planDir = join(artifactsDir, "plan");
      const pattern = `${epic}-${feature}`;
      const artifact = findLatestArtifact(planDir, pattern);
      if (!artifact) {
        throw new Error(`No plan artifact found for feature "${feature}" of epic "${epic}". Expected pattern: *-${pattern}.md in ${planDir}`);
      }
      return [readFileSync(artifact, "utf-8")];
    }

    case "validate": {
      const implDir = join(artifactsDir, "implement");
      return findAllArtifacts(implDir, epic);
    }

    case "release": {
      const results: string[] = [];
      for (const subdir of ["design", "plan", "validate"]) {
        const phaseDir = join(artifactsDir, subdir);
        results.push(...findAllArtifacts(phaseDir, epic));
      }
      return results;
    }

    default:
      return [];
  }
}

/**
 * Find the latest artifact matching *-{suffix}.md in a directory.
 * Files are sorted lexicographically (date prefix ensures chronological order).
 */
function findLatestArtifact(dir: string, suffix: string): string | undefined {
  if (!existsSync(dir)) return undefined;

  const candidates = readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f.endsWith(`-${suffix}.md`))
    .sort();

  if (candidates.length === 0) return undefined;
  return join(dir, candidates[candidates.length - 1]);
}

/**
 * Find all .md artifacts in a directory whose filename contains the epic name.
 * Returns array of file contents.
 */
function findAllArtifacts(dir: string, epic: string): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f.includes(epic))
    .sort()
    .map((f) => readFileSync(join(dir, f), "utf-8"));
}

/**
 * Evaluate gates for the validate phase.
 * Checks implementation artifacts for completion status.
 * Returns a markdown section with gate results.
 */
function evaluateGates(epic: string, artifactsDir: string): string {
  const implDir = join(artifactsDir, "implement");
  if (!existsSync(implDir)) {
    return "## Gate Status\n\nNo implementation artifacts found.";
  }

  const features: Array<{ name: string; status: string }> = [];
  for (const filename of readdirSync(implDir)) {
    if (!filename.endsWith(".md") || !filename.includes(epic)) continue;
    if (filename.endsWith(".tasks.md")) continue;

    const content = readFileSync(join(implDir, filename), "utf-8");
    const fm = parseFrontmatter(content);
    if (fm.feature) {
      features.push({ name: fm.feature, status: fm.status ?? "unknown" });
    }
  }

  if (features.length === 0) {
    return "## Gate Status\n\nNo feature implementation artifacts found.";
  }

  const allCompleted = features.every((f) => f.status === "completed");
  const statusLines = features.map((f) => `- ${f.name}: ${f.status}`).join("\n");

  const summary = allCompleted
    ? "All features completed."
    : `Incomplete: not all features have completed status.`;

  return `## Gate Status\n\n${summary}\n\n${statusLines}`;
}

// --- Output Formatting ---

/**
 * Format the assembled context into the SessionStart hook JSON output.
 */
export function formatOutput(context: string): string {
  return JSON.stringify({
    hookSpecificOutput: {
      "hookEventName": "SessionStart",
      additionalContext: context,
    },
  });
}

// --- CLI Entry Point ---

/**
 * Run the session-start hook from CLI invocation.
 * Reads env vars, calls assembleContext, writes JSON to stdout.
 * Exits non-zero on any error.
 */
export function runSessionStart(repoRoot: string): void {
  const phase = process.env.BEASTMODE_PHASE;
  const epic = process.env.BEASTMODE_EPIC;
  const slug = process.env.BEASTMODE_SLUG;
  const feature = process.env.BEASTMODE_FEATURE;

  if (!phase) throw new Error("Missing environment variable: BEASTMODE_PHASE");
  if (!epic) throw new Error("Missing environment variable: BEASTMODE_EPIC");
  if (!slug) throw new Error("Missing environment variable: BEASTMODE_SLUG");

  const context = assembleContext({ phase, epic, slug, feature, repoRoot });
  process.stdout.write(formatOutput(context));
}
