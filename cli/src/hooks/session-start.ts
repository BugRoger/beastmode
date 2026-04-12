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
import { join, basename } from "node:path";
import { parseFrontmatter } from "./session-stop.js";

// --- Types ---

export interface SessionStartInput {
  phase: string;
  epic: string;
  slug: string;
  feature?: string;
  featureName?: string;
  epicId?: string;
  featureId?: string;
  repoRoot: string;
}

interface ResolvedArtifacts {
  paths: string[];
  contents: string[];
}

const VALID_PHASES = ["design", "plan", "implement", "validate", "release"];

// --- Core Logic ---

/**
 * Assemble the full context string for a given phase.
 * Throws on missing required inputs, context files, or artifacts.
 */
export function assembleContext(input: SessionStartInput): string {
  const { phase, epic, slug, feature, featureName, epicId, featureId, repoRoot } = input;

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

  // Phase-specific artifact resolution (before metadata so paths are available)
  const artifactsDir = join(beastmodeDir, "artifacts");
  const resolved = resolveArtifacts(phase, epic, feature, artifactsDir);

  // Build and prepend metadata section
  const parentArtifactFilenames = resolved.paths.map((p) => basename(p));
  const outputTarget = computeOutputTarget(phase, slug, feature);
  const metadata = buildMetadataSection({
    phase,
    epicId,
    epicSlug: slug,
    featureId,
    featureName,
    featureSlug: feature,
    parentArtifacts: parentArtifactFilenames,
    outputTarget,
  });
  sections.push(metadata);

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

  // Artifact contents
  if (resolved.contents.length > 0) {
    sections.push(...resolved.contents);
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
 * Returns paths and contents for metadata and context assembly.
 * Throws if a required artifact is missing.
 */
function resolveArtifacts(
  phase: string,
  epic: string,
  feature: string | undefined,
  artifactsDir: string,
): ResolvedArtifacts {
  switch (phase) {
    case "design":
      return { paths: [], contents: [] };

    case "plan": {
      const designDir = join(artifactsDir, "design");
      const artifact = findLatestArtifact(designDir, epic);
      if (!artifact) {
        throw new Error(`No design artifact found for epic "${epic}". Expected pattern: *-${epic}.md in ${designDir}`);
      }
      return { paths: [artifact], contents: [readFileSync(artifact, "utf-8")] };
    }

    case "implement": {
      const planDir = join(artifactsDir, "plan");
      // Try exact pattern first (epic--feature), then fall back to
      // matching by epic slug + feature name substring. Feature slugs
      // may differ between plan time and implement time (e.g., the hex
      // suffix gets added after plan creation).
      const exactPattern = `${epic}--${feature}`;
      let artifact = findLatestArtifact(planDir, exactPattern);
      if (!artifact) {
        // Strip any trailing hex/id suffix from feature slug for fuzzy match
        const featureBase = feature!.replace(/-[a-f0-9]{4,}(\.\d+)?$/, "");
        artifact = findLatestArtifactContaining(planDir, epic, featureBase);
      }
      if (!artifact) {
        throw new Error(`No plan artifact found for feature "${feature}" of epic "${epic}". Expected pattern: *-${exactPattern}.md in ${planDir}`);
      }
      return { paths: [artifact], contents: [readFileSync(artifact, "utf-8")] };
    }

    case "validate": {
      const implDir = join(artifactsDir, "implement");
      return findAllArtifactsWithPaths(implDir, epic);
    }

    case "release": {
      const allPaths: string[] = [];
      const allContents: string[] = [];
      for (const subdir of ["design", "plan", "validate"]) {
        const phaseDir = join(artifactsDir, subdir);
        const result = findAllArtifactsWithPaths(phaseDir, epic);
        allPaths.push(...result.paths);
        allContents.push(...result.contents);
      }
      return { paths: allPaths, contents: allContents };
    }

    default:
      return { paths: [], contents: [] };
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
 * Find the latest artifact whose filename contains both the epic and a feature base name.
 * Used as a fallback when exact suffix matching fails due to slug drift.
 */
function findLatestArtifactContaining(dir: string, epic: string, featureBase: string): string | undefined {
  if (!existsSync(dir)) return undefined;

  const candidates = readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f.includes(epic) && f.includes(featureBase))
    .sort();

  if (candidates.length === 0) return undefined;
  return join(dir, candidates[candidates.length - 1]);
}

/**
 * Find all .md artifacts in a directory whose filename contains the epic name.
 * Returns both file paths and contents.
 */
function findAllArtifactsWithPaths(dir: string, epic: string): ResolvedArtifacts {
  if (!existsSync(dir)) return { paths: [], contents: [] };

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f.includes(epic))
    .sort();

  return {
    paths: files.map((f) => join(dir, f)),
    contents: files.map((f) => readFileSync(join(dir, f), "utf-8")),
  };
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
    if (fm["feature-name"] || fm["feature-slug"]) {
      features.push({ name: fm["feature-name"] ?? fm["feature-slug"]!, status: fm.status ?? "unknown" });
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

/**
 * Compute the artifact output target path for the current phase.
 * Format: .beastmode/artifacts/<phase>/YYYY-MM-DD-<epicSlug>[-<featureSlug>].md
 */
export function computeOutputTarget(phase: string, epicSlug: string, featureSlug: string | undefined): string {
  const today = new Date().toISOString().split("T")[0];
  const suffix = featureSlug ? `${epicSlug}--${featureSlug}` : epicSlug;
  return `.beastmode/artifacts/${phase}/${today}-${suffix}.md`;
}

export interface MetadataInput {
  phase: string;
  epicId?: string;
  epicSlug: string;
  featureId?: string;
  featureName?: string;
  featureSlug?: string;
  parentArtifacts: string[];
  outputTarget: string;
}

/**
 * Build a YAML-fenced metadata section for prepending to additionalContext.
 * Feature fields are omitted when not provided.
 */
export function buildMetadataSection(input: MetadataInput): string {
  const lines: string[] = ["---"];
  lines.push(`phase: ${input.phase}`);
  if (input.epicId) {
    lines.push(`epic-id: ${input.epicId}`);
  }
  lines.push(`epic-slug: ${input.epicSlug}`);
  if (input.featureId) {
    lines.push(`feature-id: ${input.featureId}`);
  }
  if (input.featureName) {
    lines.push(`feature-name: ${input.featureName}`);
  }
  if (input.featureSlug) {
    lines.push(`feature-slug: ${input.featureSlug}`);
  }
  if (input.parentArtifacts.length > 0) {
    lines.push("parent-artifacts:");
    for (const artifact of input.parentArtifacts) {
      lines.push(`  - ${artifact}`);
    }
  } else {
    lines.push("parent-artifacts: []");
  }
  lines.push(`output-target: ${input.outputTarget}`);
  lines.push("---");
  return lines.join("\n");
}

// --- CLI Entry Point ---

/**
 * Run the session-start hook from CLI invocation.
 * Reads env vars, calls assembleContext, writes JSON to stdout.
 * Exits non-zero on any error.
 */
export function runSessionStart(repoRoot: string): void {
  const phase = process.env.BEASTMODE_PHASE;
  const epic = process.env.BEASTMODE_EPIC_ID;
  const slug = process.env.BEASTMODE_EPIC_SLUG;
  const feature = process.env.BEASTMODE_FEATURE_SLUG;
  const featureName = process.env.BEASTMODE_FEATURE_NAME;
  const epicId = process.env.BEASTMODE_EPIC_ID;
  const featureId = process.env.BEASTMODE_FEATURE_ID;

  if (!phase) throw new Error("Missing environment variable: BEASTMODE_PHASE");
  if (!epic) throw new Error("Missing environment variable: BEASTMODE_EPIC_ID");
  if (!slug) throw new Error("Missing environment variable: BEASTMODE_EPIC_SLUG");

  const context = assembleContext({ phase, epic, slug, feature, featureName, epicId, featureId, repoRoot });
  process.stdout.write(formatOutput(context));
}
