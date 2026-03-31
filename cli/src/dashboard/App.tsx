import { useState, useEffect, useCallback } from "react";
import { Box, Text, useApp } from "ink";
import type { BeastmodeConfig } from "../config.js";
import type { EnrichedManifest } from "../state-scanner.js";
import EpicTable from "./EpicTable.js";
import ActivityLog from "./ActivityLog.js";
import { useKeyboardController } from "./hooks/index.js";

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
  const [epics, _setEpics] = useState<EnrichedManifest[]>([]);
  const [events, _setEvents] = useState<DashboardEvent[]>([]);
  const [watchRunning, _setWatchRunning] = useState(false);

  // Clock tick every 1s
  useEffect(() => {
    const timer = setInterval(() => setClock(formatClock()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute visible epic list (filtering done/cancelled based on toggle)
  const visibleEpics = epics;

  // Resolve slug at a given row index in the visible (sorted/filtered) list
  const slugAtIndex = useCallback(
    (index: number): string | undefined => {
      return visibleEpics[index]?.slug;
    },
    [visibleEpics],
  );

  const handleCancelEpic = useCallback(async (_slug: string) => {
    // Will be wired to cancelEpicAction when WatchLoop integration lands
  }, []);

  const handleShutdown = useCallback(async () => {
    // Graceful shutdown — will call loop.stop() when WatchLoop integration lands
    exit();
  }, [exit]);

  const keyboard = useKeyboardController({
    itemCount: visibleEpics.length,
    onCancelEpic: handleCancelEpic,
    onShutdown: handleShutdown,
    slugAtIndex,
  });

  // Filter based on toggle state
  const filteredEpics = keyboard.toggleAll.showAll
    ? visibleEpics
    : visibleEpics.filter((e) => e.phase !== "done" && e.phase !== "cancelled");

  // Clamp selection when filtered list changes
  useEffect(() => {
    keyboard.nav.clampToRange(filteredEpics.length);
  }, [filteredEpics.length]);

  const cancelConfirmingSlug =
    keyboard.cancelFlow.state.phase === "confirming"
      ? keyboard.cancelFlow.state.slug
      : undefined;

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

      {/* Epic table zone */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        <EpicTable
          epics={filteredEpics}
          activeSessions={new Set()}
          selectedIndex={keyboard.nav.selectedIndex}
          cancelConfirmingSlug={cancelConfirmingSlug}
        />
      </Box>

      {/* Separator */}
      <Box paddingX={1}>
        <Text dimColor>{"─".repeat(78)}</Text>
      </Box>

      {/* Activity log zone */}
      <Box flexDirection="column" paddingX={1}>
        <ActivityLog events={events} />
      </Box>

      {/* Footer */}
      <Box paddingX={1}>
        {keyboard.shutdown.isShuttingDown ? (
          <Text color="yellow">shutting down...</Text>
        ) : (
          <Text dimColor>
            q quit  ↑↓ navigate  x cancel  a {keyboard.toggleAll.showAll ? "hide" : "show"} all
          </Text>
        )}
      </Box>
    </Box>
  );
}
