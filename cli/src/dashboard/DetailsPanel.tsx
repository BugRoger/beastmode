import { useMemo } from "react";
import { Box, Text } from "ink";
import type { EnrichedEpic } from "../store/index.js";
import type { GitStatus } from "./overview-panel.js";
import {
  computePhaseDistribution,
  formatGitStatus,
  formatActiveSessions,
} from "./overview-panel.js";
import type { DetailsPanelSelection } from "./details-panel.js";
import { resolveDetailsContent, computeVisibleLines } from "./details-panel.js";
import { CHROME } from "./monokai-palette.js";

export interface DetailsPanelProps {
  /** What to display: all, epic, or feature */
  selection: DetailsPanelSelection;
  /** Project root for artifact resolution */
  projectRoot?: string;
  /** All epics (for overview mode) */
  epics: EnrichedEpic[];
  /** Number of active sessions */
  activeSessions: number;
  /** Git status */
  gitStatus: GitStatus | null;
  /** How many lines to scroll down */
  scrollOffset: number;
  /** Height of viewport in lines */
  visibleHeight: number;
}

export default function DetailsPanel({
  selection,
  projectRoot,
  epics,
  activeSessions,
  gitStatus,
  scrollOffset,
  visibleHeight,
}: DetailsPanelProps) {
  // Resolve content based on selection
  const { title, content } = useMemo(() => {
    if (!projectRoot || selection.kind === "all") {
      // Overview mode
      const phases = computePhaseDistribution(epics);
      const summaryLines = [
        "",
        "OVERVIEW",
        "--------",
        "",
        `Epics: ${epics.length}`,
        `Active: ${activeSessions}`,
        "",
        `Phases:`,
        `  Design:    ${phases.design}`,
        `  Plan:      ${phases.plan}`,
        `  Implement: ${phases.implement}`,
        `  Validate:  ${phases.validate}`,
        `  Release:   ${phases.release}`,
        `  Done:      ${phases.done}`,
        `  Cancelled: ${phases.cancelled}`,
        "",
        `Git: ${formatGitStatus(gitStatus)}`,
        "",
      ].join("\n");

      return {
        title: "OVERVIEW",
        content: summaryLines,
      };
    }

    try {
      return resolveDetailsContent(selection, projectRoot);
    } catch {
      return {
        title: "ERROR",
        content: "Failed to load content",
      };
    }
  }, [selection, projectRoot, epics, activeSessions, gitStatus]);

  // Split content into lines and apply scroll
  const lines = content.split("\n");
  const visibleLines = computeVisibleLines(lines, visibleHeight, scrollOffset);

  // Render visible lines
  return (
    <Box flexDirection="column" width="100%" height={visibleHeight}>
      {visibleLines.map((line, idx) => (
        <Text key={idx} color={CHROME.text}>
          {line}
        </Text>
      ))}
    </Box>
  );
}
