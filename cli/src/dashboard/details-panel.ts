import { readFileSync } from "fs";
import { resolveArtifactPath } from "../artifacts/reader.js";

/**
 * Details panel selection type: shows different content based on what's selected.
 * - "all": overview mode
 * - "epic": single epic details
 * - "feature": single feature details (within an epic)
 */
export type DetailsPanelSelection =
  | { kind: "all" }
  | { kind: "epic"; slug: string }
  | { kind: "feature"; epicSlug: string; featureSlug: string };

/**
 * Result from resolving details content.
 */
export interface DetailsContentResult {
  title: string;
  content: string;
}

/**
 * Resolve details content based on selection.
 * @param selection What to display
 * @param projectRoot Project root for artifact resolution
 * @returns Title and content to display
 */
export function resolveDetailsContent(
  selection: DetailsPanelSelection,
  projectRoot: string,
): DetailsContentResult {
  if (selection.kind === "all") {
    return {
      title: "OVERVIEW",
      content: "(select an epic to view details)",
    };
  }

  if (selection.kind === "epic") {
    try {
      const prdPath = resolveArtifactPath(
        projectRoot,
        "design",
        selection.slug,
      );
      const content = readFileSync(prdPath, "utf-8");
      return {
        title: `${selection.slug.toUpperCase()} — PRD`,
        content,
      };
    } catch {
      return {
        title: `${selection.slug.toUpperCase()} — PRD`,
        content: "(no PRD available)",
      };
    }
  }

  // feature kind
  try {
    const planPath = resolveArtifactPath(
      projectRoot,
      "plan",
      selection.epicSlug,
      selection.featureSlug,
    );
    const content = readFileSync(planPath, "utf-8");
    return {
      title: `${selection.featureSlug.toUpperCase()} — PLAN`,
      content,
    };
  } catch {
    return {
      title: `${selection.featureSlug.toUpperCase()} — PLAN`,
      content: "(no plan available)",
    };
  }
}

/**
 * Compute visible lines of text given a line count and scroll offset.
 * @param allLines All lines of text
 * @param visibleHeight How many lines fit in the viewport
 * @param scrollOffset How many lines to scroll down (0 = top)
 * @returns Slice of visible lines
 */
export function computeVisibleLines(
  allLines: string[],
  visibleHeight: number,
  scrollOffset: number,
): string[] {
  const startLine = Math.max(0, scrollOffset);
  const endLine = Math.min(allLines.length, startLine + visibleHeight);
  return allLines.slice(startLine, endLine);
}

/**
 * Clamp scroll offset to valid range.
 * @param scrollOffset Current offset
 * @param totalLines Total number of lines
 * @param visibleHeight How many lines fit in viewport
 * @returns Clamped offset (non-negative, doesn't scroll past end)
 */
export function clampScrollOffset(
  scrollOffset: number,
  totalLines: number,
  visibleHeight: number,
): number {
  const maxOffset = Math.max(0, totalLines - visibleHeight);
  return Math.max(0, Math.min(scrollOffset, maxOffset));
}
