import { Box, Text } from "ink";
import type { DashboardEvent } from "./App.js";
import { formatLogLine, type LogLevel } from "../shared/log-format.js";

/** Map DashboardEvent type to LogLevel. */
function eventTypeToLevel(type: DashboardEvent["type"]): LogLevel {
  switch (type) {
    case "error":
      return "error";
    case "dispatched":
    case "completed":
    case "scan":
      return "info";
  }
}

export interface ActivityLogProps {
  events: DashboardEvent[];
  maxLines?: number;
}

export default function ActivityLog({ events, maxLines = 10 }: ActivityLogProps) {
  if (events.length === 0) {
    return <Text dimColor>No activity yet.</Text>;
  }

  // Newest first, capped to maxLines
  const visible = events.slice(0, maxLines);

  return (
    <Box flexDirection="column">
      {visible.map((event, i) => {
        const level = eventTypeToLevel(event.type);
        const ctx = { phase: event.phase, epic: event.epic, feature: event.feature };
        const line = formatLogLine(level, ctx, event.detail);
        return (
          <Text key={`${event.timestamp}-${i}`}>{line}</Text>
        );
      })}
    </Box>
  );
}
