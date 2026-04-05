import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, join } from "path";
import type { EnrichedEpic } from "../store/index.js";
import {
  computePhaseDistribution,
  formatGitStatus,
  formatActiveSessions,
  type PhaseCount,
  type GitStatus,
} from "./overview-panel.js";
import { resolveArtifactPath } from "../artifacts/reader.js";

/** Selection state for the Details panel. */
export type DetailsPanelSelection =
  | { kind: "all" }
  | { kind: "epic"; slug: string }
  | { kind: "feature"; epicSlug: string; featureSlug: string };

/** Overview content — phase distribution, sessions, git. */
export interface OverviewContent {
  kind: "overview";
  distribution: PhaseCount[];
  sessions: string;
  git: string | null;
}

/** Artifact content — raw markdown text. */
export interface ArtifactContent {
  kind: "artifact";
  text: string;
}

/** Not-found placeholder. */
export interface NotFoundContent {
  kind: "not-found";
  message: string;
}

export type DetailsContentResult = OverviewContent | ArtifactContent | NotFoundContent;

/** Context needed to resolve details content. */
export interface DetailsContentContext {
  epics?: EnrichedEpic[];
  activeSessions?: number;
  gitStatus?: GitStatus | null;
  projectRoot?: string;
}

/**
 * Resolve the details panel content based on the current selection.
 *
 * - "all" → overview content (phase distribution, sessions, git status)
 * - "epic" → PRD artifact from design phase
 * - "feature" → plan artifact matching feature slug
 */
export function resolveDetailsContent(
  selection: DetailsPanelSelection,
  ctx: DetailsContentContext,
): DetailsContentResult {
  if (selection.kind === "all") {
    const epics = ctx.epics ?? [];
    const distribution = computePhaseDistribution(epics);
    const sessions = formatActiveSessions(ctx.activeSessions ?? 0);
    const git = ctx.gitStatus ? formatGitStatus(ctx.gitStatus) : null;
    return { kind: "overview", distribution, sessions, git };
  }

  if (selection.kind === "epic") {
    if (!ctx.projectRoot) {
      return { kind: "not-found", message: `no PRD found for "${selection.slug}"` };
    }
    const artifactRelPath = resolveArtifactPath(ctx.projectRoot, "design", selection.slug);
    if (!artifactRelPath) {
      return { kind: "not-found", message: `no PRD found for "${selection.slug}"` };
    }
    try {
      const content = readFileSync(resolve(ctx.projectRoot, artifactRelPath), "utf-8");
      return { kind: "artifact", text: content };
    } catch {
      return { kind: "not-found", message: `no PRD found for "${selection.slug}"` };
    }
  }

  // feature selection
  if (!ctx.projectRoot) {
    return { kind: "not-found", message: `no plan found for "${selection.featureSlug}"` };
  }

  // Find the feature plan file: *-<epic>-<feature>.md in plan artifacts
  const planDir = resolve(ctx.projectRoot, ".beastmode", "artifacts", "plan");
  if (!existsSync(planDir)) {
    return { kind: "not-found", message: `no plan found for "${selection.featureSlug}"` };
  }

  try {
    const files = readdirSync(planDir);
    const suffix = `-${selection.epicSlug}-${selection.featureSlug}.md`;
    const match = files
      .filter((f) => f.endsWith(suffix) && !f.endsWith(".output.json"))
      .sort()
      .pop();

    if (!match) {
      return { kind: "not-found", message: `no plan found for "${selection.featureSlug}"` };
    }

    const content = readFileSync(join(planDir, match), "utf-8");
    return { kind: "artifact", text: content };
  } catch {
    return { kind: "not-found", message: `no plan found for "${selection.featureSlug}"` };
  }
}
