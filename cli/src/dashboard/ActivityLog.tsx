import { Box, Text } from "ink";
import type { DashboardEvent } from "./App.js";

const EVENT_COLORS: Record<DashboardEvent["type"], string> = {
  dispatched: "blue",
  completed: "green",
  error: "red",
  blocked: "yellow",
  scan: "gray",
};

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
      {visible.map((event, i) => (
        <Box key={`${event.timestamp}-${i}`}>
          <Text dimColor>{event.timestamp} </Text>
          <Text color={EVENT_COLORS[event.type] as any}>{event.type.padEnd(10)} </Text>
          <Text>{event.detail}</Text>
        </Box>
      ))}
    </Box>
  );
}
