import { Box, Text } from "ink";
import type { EnrichedEpic } from "../store/index.js";
import type { GitStatus } from "./overview-panel.js";
import {
  type DetailsPanelSelection,
  resolveDetailsContent,
} from "./details-panel.js";
import { PHASE_COLOR, CHROME } from "./monokai-palette.js";
import { formatDuration } from "./format-duration.js";
import type { SessionStats } from "./session-stats.js";

export interface DetailsPanelProps {
  selection: DetailsPanelSelection;
  projectRoot?: string;
  epics: EnrichedEpic[];
  activeSessions: number;
  gitStatus: GitStatus | null;
  scrollOffset: number;
  visibleHeight: number;
  stats?: SessionStats;
}

export default function DetailsPanel({
  selection,
  projectRoot,
  epics,
  activeSessions,
  gitStatus,
  scrollOffset,
  visibleHeight,
  stats,
}: DetailsPanelProps) {
  const result = resolveDetailsContent(selection, {
    epics,
    activeSessions,
    gitStatus,
    projectRoot,
    stats,
  });

  if (result.kind === "overview") {
    return (
      <Box flexDirection="column" overflowY="hidden">
        <Text bold>Phase Distribution</Text>
        {result.distribution.length === 0 ? (
          <Text dimColor>  no epics</Text>
        ) : (
          result.distribution.map(({ phase, count }) => (
            <Text key={phase}>
              {"  "}
              <Text color={PHASE_COLOR[phase] as Parameters<typeof Text>[0]["color"]}>
                {phase}
              </Text>
              {" "}
              {count}
            </Text>
          ))
        )}

        <Text> </Text>

        <Text bold>Sessions</Text>
        <Text>  {result.sessions}</Text>

        <Text> </Text>

        <Text bold>Git</Text>
        {result.git ? (
          <Text>  {result.git}</Text>
        ) : (
          <Text dimColor>  loading...</Text>
        )}
      </Box>
    );
  }

  if (result.kind === "stats") {
    if (result.stats.isEmpty) {
      return (
        <Box flexDirection="column" overflowY="hidden">
          <Text color={CHROME.muted}>waiting for sessions...</Text>
        </Box>
      );
    }

    const s = result.stats;
    const PHASES = ["plan", "implement", "validate", "release"] as const;

    return (
      <Box flexDirection="column" overflowY="hidden">
        <Text bold>Sessions</Text>
        <Text>  total: {s.total}</Text>
        <Text>  active: {s.active}</Text>
        <Text>  success rate: {s.successRate}%</Text>
        <Text>  uptime: {formatDuration(s.uptimeMs)}</Text>
        <Text>  session time: {formatDuration(s.cumulativeMs)}</Text>

        <Text> </Text>

        <Text bold>Phase Duration</Text>
        {PHASES.map((phase) => (
          <Text key={phase}>
            {"  "}
            <Text color={PHASE_COLOR[phase] as Parameters<typeof Text>[0]["color"]}>
              {phase}
            </Text>
            {" "}
            {s.phaseDurations[phase] !== null ? formatDuration(s.phaseDurations[phase]!) : "--"}
          </Text>
        ))}

        <Text> </Text>

        <Text bold>Retries</Text>
        <Text>  re-dispatches: {s.reDispatches}</Text>
        <Text>  failures: {s.failures}</Text>
      </Box>
    );
  }

  if (result.kind === "not-found") {
    return (
      <Box flexDirection="column" overflowY="hidden">
        <Text dimColor>{result.message}</Text>
      </Box>
    );
  }

  // Artifact content — render as scrollable raw text
  const lines = result.text.split("\n");
  const clampedOffset = Math.max(0, Math.min(scrollOffset, Math.max(0, lines.length - visibleHeight)));
  const visibleLines = lines.slice(clampedOffset, clampedOffset + visibleHeight);

  return (
    <Box flexDirection="column" overflowY="hidden">
      {visibleLines.map((line, i) => (
        <Text key={clampedOffset + i}>{line || " "}</Text>
      ))}
    </Box>
  );
}
