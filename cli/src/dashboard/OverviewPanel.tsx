import { Box, Text } from "ink";
import type { EnrichedManifest } from "../manifest/store.js";
import {
  computePhaseDistribution,
  formatGitStatus,
  formatActiveSessions,
  type GitStatus,
} from "./overview-panel.js";

const PHASE_COLOR: Record<string, string> = {
  design: "magenta",
  plan: "blue",
  implement: "yellow",
  validate: "cyan",
  release: "green",
  done: "green",
  cancelled: "red",
};

export interface OverviewPanelProps {
  epics: EnrichedManifest[];
  activeSessions: Set<string>;
  gitStatus: GitStatus | null;
}

export default function OverviewPanel({
  epics,
  activeSessions,
  gitStatus,
}: OverviewPanelProps) {
  const distribution = computePhaseDistribution(epics);
  const sessionCount = activeSessions.size;

  return (
    <Box flexDirection="column" overflowY="hidden">
      <Text bold>Phase Distribution</Text>
      {distribution.length === 0 ? (
        <Text dimColor>  no epics</Text>
      ) : (
        distribution.map(({ phase, count }) => (
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
      <Text>  {formatActiveSessions(sessionCount)}</Text>

      <Text> </Text>

      <Text bold>Git</Text>
      {gitStatus ? (
        <Text>  {formatGitStatus(gitStatus)}</Text>
      ) : (
        <Text dimColor>  loading...</Text>
      )}
    </Box>
  );
}
