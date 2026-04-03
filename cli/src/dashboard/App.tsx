import { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useApp } from "ink";
import type { BeastmodeConfig } from "../config.js";
import type { EnrichedManifest } from "../manifest-store.js";
import type { WatchLoopEventMap } from "../watch-types.js";
import type { WatchLoop } from "../watch.js";
import EpicsPanel from "./EpicsPanel.js";
import { getKeyHints } from "./key-hints.js";
import { useDashboardKeyboard } from "./hooks/use-dashboard-keyboard.js";
import { cancelEpicAction } from "./actions/cancel-epic.js";
import { createLogger } from "../logger.js";

/** Activity log event for the dashboard. */
export interface DashboardEvent {
  timestamp: string;
  type: "dispatched" | "completed" | "error" | "scan";
  detail: string;
  phase?: string;
  epic?: string;
  feature?: string;
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

/** Phase ordering for sort — furthest phase first. */
const PHASE_ORDER: Record<string, number> = {
  cancelled: -1,
  design: 0,
  plan: 1,
  implement: 2,
  validate: 3,
  release: 4,
  done: 5,
};

export default function App({ config, verbosity, loop, projectRoot }: AppProps) {
  const { exit } = useApp();
  const [clock, setClock] = useState(formatClock());
  const [epics, setEpics] = useState<EnrichedManifest[]>([]);
  // Events are collected for future detail/log panels — not rendered by this component.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_events, setEvents] = useState<DashboardEvent[]>([]);
  const [watchRunning, setWatchRunning] = useState(false);
  const [activeSessions, setActiveSessions] = useState<Set<string>>(new Set());
  const [filterString, setFilterString] = useState("");
  const loopRef = useRef(loop);
  loopRef.current = loop;

  // --- Ref for filteredEpics (breaks circular dep with slugAtIndex) ---
  const filteredEpicsRef = useRef<EnrichedManifest[]>([]);

  // --- Helper: push event to front of the log ---
  const pushEvent = useCallback(
    (type: DashboardEvent["type"], detail: string, ctx?: { phase?: string; epic?: string; feature?: string }) => {
      setEvents((prev) => [
        { timestamp: ts(), type, detail, ...ctx },
        ...prev.slice(0, MAX_EVENTS - 1),
      ]);
    },
    [],
  );

  // --- slugAtIndex: uses ref to avoid circular dep with filteredEpics ---
  const slugAtIndex = useCallback(
    (index: number): string | undefined => {
      if (index === 0) return undefined; // "(all)" entry
      return filteredEpicsRef.current[index - 1]?.slug;
    },
    [],
  );

  // --- Cancel epic action ---
  const handleCancelEpic = useCallback(
    async (slug: string) => {
      const l = loopRef.current;
      if (!l || !projectRoot) return;
      await cancelEpicAction({
        slug,
        projectRoot,
        tracker: l.getTracker(),
        githubEnabled: config.github.enabled,
        logger: createLogger(verbosity, {}),
      });
      pushEvent("error", `cancelled ${slug}`, { epic: slug });
    },
    [projectRoot, pushEvent],
  );

  // --- Graceful shutdown ---
  const handleShutdown = useCallback(async () => {
    if (loopRef.current) {
      await loopRef.current.stop();
    }
    exit();
  }, [exit]);

  // --- Filter callbacks ---
  const handleFilterApply = useCallback((filter: string) => {
    setFilterString(filter);
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterString("");
  }, []);

  // --- Keyboard hook (approximate itemCount — clamped below) ---
  const keyboard = useDashboardKeyboard({
    itemCount: epics.length + 1, // +1 for "(all)" entry; clamped after filtering
    onCancelEpic: handleCancelEpic,
    onShutdown: handleShutdown,
    slugAtIndex,
    onFilterApply: handleFilterApply,
    onFilterClear: handleFilterClear,
  });

  // --- Compute visible epics ---

  // 1. Filter by done/cancelled toggle
  const visibleByToggle = keyboard.toggleAll.showAll
    ? epics
    : epics.filter((e) => e.phase !== "done" && e.phase !== "cancelled");

  // 2. Sort by phase (furthest first) then alphabetically
  const sorted = [...visibleByToggle].sort((a, b) => {
    const aP = PHASE_ORDER[a.phase] ?? 99;
    const bP = PHASE_ORDER[b.phase] ?? 99;
    if (aP !== bP) return bP - aP;
    return a.slug.localeCompare(b.slug);
  });

  // 3. Apply name filter
  const filteredEpics = filterString
    ? sorted.filter((e) => e.slug.includes(filterString))
    : sorted;

  // Keep ref in sync
  filteredEpicsRef.current = filteredEpics;

  // --- Clamp nav index when list changes ---
  useEffect(() => {
    keyboard.nav.clampToRange(filteredEpics.length + 1); // +1 for "(all)"
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
      pushEvent("dispatched", `${ev.phase} for ${target}`, { phase: ev.phase, epic: ev.epicSlug, feature: ev.featureSlug });
    };

    const onSessionCompleted = (ev: WatchLoopEventMap["session-completed"][0]) => {
      setActiveSessions((prev) => {
        const next = new Set(prev);
        next.delete(ev.epicSlug);
        return next;
      });
      const target = ev.featureSlug ? `${ev.epicSlug}/${ev.featureSlug}` : ev.epicSlug;
      const status = ev.success ? "completed" : "failed";
      const dur = `${(ev.durationMs / 1000).toFixed(0)}s`;
      pushEvent(
        ev.success ? "completed" : "error",
        `${ev.phase} ${status} for ${target} (${dur})`,
        { phase: ev.phase, epic: ev.epicSlug, feature: ev.featureSlug },
      );
    };

    const onScanComplete = (ev: WatchLoopEventMap["scan-complete"][0]) => {
      const activeEpicSlugs = new Set(loop.getTracker().getAll().map((s) => s.epicSlug));
      setActiveSessions(activeEpicSlugs);
      if (ev.dispatched > 0) {
        pushEvent("scan", `scanned ${ev.epicsScanned} epics, dispatched ${ev.dispatched}`);
      }
    };

    const onError = (ev: WatchLoopEventMap["error"][0]) => {
      const prefix = ev.epicSlug ? `${ev.epicSlug}: ` : "";
      pushEvent("error", `${prefix}${ev.message}`, ev.epicSlug ? { epic: ev.epicSlug } : undefined);
    };

    const onEpicCancelled = (ev: WatchLoopEventMap["epic-cancelled"][0]) => {
      pushEvent("error", `${ev.epicSlug} cancelled`, { epic: ev.epicSlug });
    };

    loop.on("started", onStarted);
    loop.on("stopped", onStopped);
    loop.on("session-started", onSessionStarted);
    loop.on("session-completed", onSessionCompleted);
    loop.on("scan-complete", onScanComplete);
    loop.on("error", onError);
    loop.on("epic-cancelled", onEpicCancelled);

    return () => {
      loop.off("started", onStarted);
      loop.off("stopped", onStopped);
      loop.off("session-started", onSessionStarted);
      loop.off("session-completed", onSessionCompleted);
      loop.off("scan-complete", onScanComplete);
      loop.off("error", onError);
      loop.off("epic-cancelled", onEpicCancelled);
    };
  }, [loop, pushEvent]);

  // --- Refresh epics from state scanner ---
  useEffect(() => {
    if (!loop || !projectRoot) return;

    const refreshEpics = async () => {
      try {
        const { listEnriched } = await import("../manifest-store.js");
        const result = listEnriched(projectRoot);
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

  // --- Key hints ---
  const keyHintText = getKeyHints(keyboard.mode, {
    slug: cancelConfirmingSlug,
    filterInput: keyboard.filterInput,
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

      {/* Epics panel */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        <EpicsPanel
          epics={filteredEpics}
          activeSessions={activeSessions}
          selectedIndex={keyboard.nav.selectedIndex}
          cancelConfirmingSlug={cancelConfirmingSlug}
        />
      </Box>

      {/* Separator */}
      <Box paddingX={1}>
        <Text dimColor>{"─".repeat(78)}</Text>
      </Box>

      {/* Footer — mode-sensitive key hints */}
      <Box paddingX={1}>
        {keyboard.shutdown.isShuttingDown ? (
          <Text color="yellow">shutting down...</Text>
        ) : (
          <Text dimColor>{keyHintText}</Text>
        )}
      </Box>
    </Box>
  );
}
