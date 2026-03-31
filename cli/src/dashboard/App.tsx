import { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from "ink";
import type { BeastmodeConfig } from "../config.js";
import type { EnrichedManifest } from "../state-scanner.js";

/** Activity log event for the dashboard. */
export interface DashboardEvent {
  timestamp: string;
  type: "dispatched" | "completed" | "error" | "blocked" | "scan";
  detail: string;
}

export interface AppProps {
  config: BeastmodeConfig;
  verbosity: number;
}

function formatClock(): string {
  const now = new Date();
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(n => String(n).padStart(2, "0"))
    .join(":");
}

export default function App(_props: AppProps) {
  const { exit } = useApp();
  const [clock, setClock] = useState(formatClock());
  const [_epics, _setEpics] = useState<EnrichedManifest[]>([]);
  const [_events, _setEvents] = useState<DashboardEvent[]>([]);
  const [watchRunning, _setWatchRunning] = useState(false);

  // Clock tick every 1s
  useEffect(() => {
    const timer = setInterval(() => setClock(formatClock()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Quit on 'q'
  useInput((input, key) => {
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
    }
  });

  return (
    <Box flexDirection="column" width="100%">
      {/* Header zone */}
      <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
        <Text bold color="green">beastmode dashboard</Text>
        <Box>
          <Text dimColor={!watchRunning} color={watchRunning ? "green" : undefined}>
            {watchRunning ? "watch: running" : "watch: stopped"}
          </Text>
          <Text> </Text>
          <Text dimColor>{clock}</Text>
        </Box>
      </Box>
      <Box paddingX={1}>
        <Text dimColor>{"─".repeat(78)}</Text>
      </Box>

      {/* Epic table zone — placeholder until Task 3 */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        <Text dimColor>Loading epics...</Text>
      </Box>

      {/* Separator */}
      <Box paddingX={1}>
        <Text dimColor>{"─".repeat(78)}</Text>
      </Box>

      {/* Activity log zone — placeholder until Task 4 */}
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>No activity yet.</Text>
      </Box>

      {/* Footer */}
      <Box paddingX={1}>
        <Text dimColor>q quit</Text>
      </Box>
    </Box>
  );
}
