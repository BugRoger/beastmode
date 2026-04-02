import { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useApp } from "ink";
import type { BeastmodeConfig } from "../config.js";
import type { EnrichedManifest } from "../state-scanner.js";
import type { WatchLoopEventMap } from "../watch-types.js";
import type { WatchLoop } from "../watch.js";
import EpicTable from "./EpicTable.js";
import ActivityLog from "./ActivityLog.js";
import { useKeyboardController } from "./hooks/index.js";
import { cancelEpicAction } from "./actions/cancel-epic.js";
import { createLogger } from "../logger.js";

/** Activity log event for the dashboard. */
export interface DashboardEvent {
  timestamp: string;
  type: "dispatched" | "completed" | "error" | "blocked" | "scan";
  detail: string;
}

export interface AppProps {
  config: BeastmodeConfig;
  verbosity: number;
  /** Injected WatchLoop instance (created by the dashboard command). */
  loop?: WatchLoop;
  /** Project root for manifest operations. */
  projectRoot?: string;
}

function formatClock(): string {
  const now = new Date();
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

function ts(): string {
  return formatClock();
}

/** Max events kept in the activity log buffer. */
const MAX_EVENTS = 100;

export default function App({ config, verbosity, loop, projectRoot }: AppProps) {
  const { exit } = useApp();
  const [clock, setClock] = useState(formatClock());
  const [epics, setEpics] = useState<EnrichedManifest[]>([]);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [watchRunning, setWatchRunning] = useState(false);
  const [activeSessions, setActiveSessions] = useState<Set<string>>(new Set());
  const loopRef = useRef(loop);
  loopRef.current = loop;

  // --- Helper: push event to front of the log ---
  const pushEvent = useCallback(
    (type: DashboardEvent["type"], detail: string) => {
      setEvents((prev) => [
        { timestamp: ts(), type, detail },
        ...prev.slice(0, MAX_EVENTS - 1),
      ]);
    },
    [],
  );

  // --- Compute visible epics for the table ---
  const visibleEpics = epics;

  const slugAtIndex = useCallback(
    (index: number): string | undefined => visibleEpics[index]?.slug,
    [visibleEpics],
  );

  const handleCancelEpic = useCallback(
    async (slug: string) => {
      const l = loopRef.current;
      if (!l || !projectRoot) return;
      await cancelEpicAction({
        slug,
        projectRoot,
        tracker: l.getTracker(),
        githubEnabled: config.github.enabled,
        logger: createLogger(verbosity, "dashboard"),
      });
      pushEvent("error", `cancelled ${slug}`);
    },
    [projectRoot, pushEvent],
  );

  const handleShutdown = useCallback(async () => {
    if (loopRef.current) {
      await loopRef.current.stop();
    }
    exit();
  }, [exit]);

  const keyboard = useKeyboardController({
    itemCount: visibleEpics.length,
    onCancelEpic: handleCancelEpic,
    onShutdown: handleShutdown,
    slugAtIndex,
  });

  // --- Filter + clamp ---
  const filteredEpics = keyboard.toggleAll.showAll
    ? visibleEpics
    : visibleEpics.filter((e) => e.phase !== "done" && e.phase !== "cancelled");

  useEffect(() => {
    keyboard.nav.clampToRange(filteredEpics.length);
  }, [filteredEpics.length]);

  // --- Clock tick every 1s ---
  useEffect(() => {
    const timer = setInterval(() => setClock(formatClock()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- WatchLoop event subscriptions ---
  useEffect(() => {
    if (!loop) return;

    const onStarted = () => {
      setWatchRunning(true);
      pushEvent("scan", "watch loop started");
    };

    const onStopped = () => {
      setWatchRunning(false);
    };

    const onSessionStarted = (ev: WatchLoopEventMap["session-started"][0]) => {
      setActiveSessions((prev) => new Set([...prev, ev.epicSlug]));
      const target = ev.featureSlug ? `${ev.epicSlug}/${ev.featureSlug}` : ev.epicSlug;
      pushEvent("dispatched", `${ev.phase} for ${target}`);
    };

    const onSessionCompleted = (ev: WatchLoopEventMap["session-completed"][0]) => {
      // Remove from active set — scan-complete will re-derive the full set
      setActiveSessions((prev) => {
        const next = new Set(prev);
        next.delete(ev.epicSlug);
        return next;
      });
      const target = ev.featureSlug ? `${ev.epicSlug}/${ev.featureSlug}` : ev.epicSlug;
      const status = ev.success ? "completed" : "failed";
      const dur = `${(ev.durationMs / 1000).toFixed(0)}s`;
      const cost = `$${ev.costUsd.toFixed(2)}`;
      pushEvent(
        ev.success ? "completed" : "error",
        `${ev.phase} ${status} for ${target} (${dur}, ${cost})`,
      );
    };

    const onScanComplete = (ev: WatchLoopEventMap["scan-complete"][0]) => {
      // Refresh active sessions from tracker
      const activeEpicSlugs = new Set(loop.getTracker().getAll().map((s) => s.epicSlug));
      setActiveSessions(activeEpicSlugs);
      if (ev.dispatched > 0) {
        pushEvent("scan", `scanned ${ev.epicsScanned} epics, dispatched ${ev.dispatched}`);
      }
    };

    const onError = (ev: WatchLoopEventMap["error"][0]) => {
      const prefix = ev.epicSlug ? `${ev.epicSlug}: ` : "";
      pushEvent("error", `${prefix}${ev.message}`);
    };

    const onEpicBlocked = (ev: WatchLoopEventMap["epic-blocked"][0]) => {
      pushEvent("blocked", `${ev.epicSlug} — ${ev.reason}`);
    };

    const onEpicCancelled = (ev: WatchLoopEventMap["epic-cancelled"][0]) => {
      pushEvent("error", `${ev.epicSlug} cancelled`);
    };

    loop.on("started", onStarted);
    loop.on("stopped", onStopped);
    loop.on("session-started", onSessionStarted);
    loop.on("session-completed", onSessionCompleted);
    loop.on("scan-complete", onScanComplete);
    loop.on("error", onError);
    loop.on("epic-blocked", onEpicBlocked);
    loop.on("epic-cancelled", onEpicCancelled);

    return () => {
      loop.off("started", onStarted);
      loop.off("stopped", onStopped);
      loop.off("session-started", onSessionStarted);
      loop.off("session-completed", onSessionCompleted);
      loop.off("scan-complete", onScanComplete);
      loop.off("error", onError);
      loop.off("epic-blocked", onEpicBlocked);
      loop.off("epic-cancelled", onEpicCancelled);
    };
  }, [loop, pushEvent]);

  // --- Refresh epics from state scanner ---
  useEffect(() => {
    if (!loop || !projectRoot) return;

    const refreshEpics = async () => {
      try {
        const { scanEpics } = await import("../state-scanner.js");
        const result = await scanEpics(projectRoot);
        const epicList = Array.isArray(result) ? result : result.epics;
        setEpics(epicList);
      } catch {
        // Non-fatal — will retry on next scan
      }
    };

    // Initial load
    refreshEpics();

    // Re-scan on relevant events
    loop.on("scan-complete", refreshEpics);
    loop.on("session-completed", refreshEpics);
    loop.on("epic-cancelled", refreshEpics);

    return () => {
      loop.off("scan-complete", refreshEpics);
      loop.off("session-completed", refreshEpics);
      loop.off("epic-cancelled", refreshEpics);
    };
  }, [loop, projectRoot]);

  // --- Cancel confirmation slug ---
  const cancelConfirmingSlug =
    keyboard.cancelFlow.state.phase === "confirming"
      ? keyboard.cancelFlow.state.slug
      : undefined;

  return (
    <Box flexDirection="column" width="100%">
      {/* Header zone */}
      <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
        <Text bold color="green">
          beastmode dashboard
        </Text>
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
          activeSessions={activeSessions}
          selectedIndex={keyboard.nav.selectedIndex}
          cancelConfirmingSlug={cancelConfirmingSlug}
        />
      </Box>

      {/* Cancel confirmation */}
      {cancelConfirmingSlug && (
        <Box paddingX={1}>
          <Text color="yellow">Cancel {cancelConfirmingSlug}? (y/n)</Text>
        </Box>
      )}

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
            q quit ↑↓ navigate x cancel a {keyboard.toggleAll.showAll ? "hide" : "show"} all
          </Text>
        )}
      </Box>
    </Box>
  );
}
