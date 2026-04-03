import { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useApp } from "ink";
import type { BeastmodeConfig } from "../config.js";
import type { EnrichedManifest } from "../manifest-store.js";
import type { WatchLoopEventMap } from "../watch-types.js";
import type { WatchLoop } from "../watch.js";
import EpicTable from "./EpicTable.js";
import ActivityLog from "./ActivityLog.js";
import CrumbBar from "./CrumbBar.js";
import FeatureList from "./FeatureList.js";
import AgentLog from "./AgentLog.js";
import { getKeyHints } from "./key-hints.js";
import * as VS from "./view-stack.js";
import { useKeyboardController, useKeyboardNav } from "./hooks/index.js";
import { cancelEpicAction } from "./actions/cancel-epic.js";
import { createLogger } from "../logger.js";

/** Activity log event for the dashboard. */
export interface DashboardEvent {
  timestamp: string;
  type: "dispatched" | "completed" | "error" | "scan" | "held";
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

export default function App({ config, verbosity, loop, projectRoot }: AppProps) {
  const { exit } = useApp();
  const [clock, setClock] = useState(formatClock());
  const [epics, setEpics] = useState<EnrichedManifest[]>([]);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [watchRunning, setWatchRunning] = useState(false);
  const [activeSessions, setActiveSessions] = useState<Set<string>>(new Set());
  const [heldEpics, setHeldEpics] = useState<Map<string, string>>(new Map());
  const loopRef = useRef(loop);
  loopRef.current = loop;

  // --- View stack for drill-down navigation ---
  const [viewStack, setViewStack] = useState<VS.ViewStack>(VS.createStack);
  const activeView = VS.peek(viewStack);

  // --- Feature-level navigation ---
  const featureNav = useKeyboardNav(0);

  // --- Follow mode for agent log ---
  const [followMode, setFollowMode] = useState(true);

  // --- Refs to break circular dep between drillDown and keyboard ---
  const epicSelectedRef = useRef(0);
  const featureSelectedRef = useRef(0);
  const viewStackRef = useRef(viewStack);
  viewStackRef.current = viewStack;
  const epicsRef = useRef(epics);
  epicsRef.current = epics;
  const activeSessionsRef = useRef(activeSessions);
  activeSessionsRef.current = activeSessions;

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
        logger: createLogger(verbosity, {}),
      });
      pushEvent("error", `cancelled ${slug}`, { epic: slug });
    },
    [projectRoot, pushEvent],
  );

  const handleShutdown = useCallback(async () => {
    if (loopRef.current) {
      await loopRef.current.stop();
    }
    exit();
  }, [exit]);

  // --- Drill-down callbacks (use refs to break circular dep with keyboard) ---
  const handleDrillDown = useCallback(() => {
    setViewStack((prev) => {
      const top = VS.peek(prev);
      if (top.type === "epic-list") {
        const epic = epicsRef.current[epicSelectedRef.current];
        if (!epic) return prev;
        return VS.push(prev, { type: "feature-list", epicSlug: epic.slug });
      }
      if (top.type === "feature-list") {
        const epic = epicsRef.current.find((e) => e.slug === top.epicSlug);
        const feat = epic?.features[featureSelectedRef.current];
        if (!feat) return prev;
        const isActive =
          feat.status === "in-progress" ||
          activeSessionsRef.current.has(feat.slug);
        if (!isActive) return prev;
        return VS.push(prev, {
          type: "agent-log",
          epicSlug: top.epicSlug,
          featureSlug: feat.slug,
        });
      }
      return prev;
    });
  }, []);

  const handleDrillUp = useCallback(() => {
    setViewStack((prev) => VS.pop(prev));
  }, []);

  const handleToggleFollow = useCallback(() => {
    setFollowMode((prev) => !prev);
  }, []);

  const keyboard = useKeyboardController({
    itemCount: visibleEpics.length,
    onCancelEpic: handleCancelEpic,
    onShutdown: handleShutdown,
    slugAtIndex,
    activeViewType: activeView.type,
    onDrillDown: handleDrillDown,
    onDrillUp: handleDrillUp,
    onToggleFollow: handleToggleFollow,
  });

  // --- Keep refs in sync with navigation state ---
  useEffect(() => {
    epicSelectedRef.current = keyboard.nav.selectedIndex;
  }, [keyboard.nav.selectedIndex]);

  useEffect(() => {
    featureSelectedRef.current = featureNav.selectedIndex;
  }, [featureNav.selectedIndex]);

  // --- Filter + clamp ---
  const filteredEpics = keyboard.toggleAll.showAll
    ? visibleEpics
    : visibleEpics.filter((e) => e.phase !== "done" && e.phase !== "cancelled");

  useEffect(() => {
    keyboard.nav.clampToRange(filteredEpics.length);
  }, [filteredEpics.length]);

  // --- Clamp feature nav when drilling into an epic ---
  useEffect(() => {
    if (activeView.type === "feature-list") {
      const epic = epics.find((e) => e.slug === activeView.epicSlug);
      const featCount = epic?.features.length ?? 0;
      featureNav.clampToRange(featCount);
    }
  }, [activeView, epics]);

  // --- Reset feature selection on new feature list; reset follow on agent log ---
  useEffect(() => {
    if (activeView.type === "feature-list") {
      featureNav.setSelectedIndex(0);
    }
    if (activeView.type === "agent-log") {
      setFollowMode(true);
    }
  }, [
    activeView.type,
    activeView.type === "feature-list"
      ? (activeView as VS.FeatureList).epicSlug
      : null,
  ]);

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
      // Clear held indicator when epic actually dispatches
      setHeldEpics((prev) => {
        if (!prev.has(ev.epicSlug)) return prev;
        const next = new Map(prev);
        next.delete(ev.epicSlug);
        return next;
      });
      const target = ev.featureSlug ? `${ev.epicSlug}/${ev.featureSlug}` : ev.epicSlug;
      pushEvent("dispatched", `${ev.phase} for ${target}`, { phase: ev.phase, epic: ev.epicSlug, feature: ev.featureSlug });
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
      pushEvent(
        ev.success ? "completed" : "error",
        `${ev.phase} ${status} for ${target} (${dur})`,
        { phase: ev.phase, epic: ev.epicSlug, feature: ev.featureSlug },
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
      pushEvent("error", `${prefix}${ev.message}`, ev.epicSlug ? { epic: ev.epicSlug } : undefined);
    };

    const onEpicCancelled = (ev: WatchLoopEventMap["epic-cancelled"][0]) => {
      pushEvent("error", `${ev.epicSlug} cancelled`, { epic: ev.epicSlug });
    };

    const onReleaseHeld = (ev: WatchLoopEventMap["release:held"][0]) => {
      setHeldEpics((prev) => {
        const next = new Map(prev);
        next.set(ev.waitingSlug, ev.blockingSlug);
        return next;
      });
      pushEvent("held", `${ev.waitingSlug} queued (waiting for ${ev.blockingSlug})`, {
        epic: ev.waitingSlug,
        phase: "release",
      });
    };

    loop.on("started", onStarted);
    loop.on("stopped", onStopped);
    loop.on("session-started", onSessionStarted);
    loop.on("session-completed", onSessionCompleted);
    loop.on("scan-complete", onScanComplete);
    loop.on("error", onError);
    loop.on("epic-cancelled", onEpicCancelled);
    loop.on("release:held", onReleaseHeld);

    return () => {
      loop.off("started", onStarted);
      loop.off("stopped", onStopped);
      loop.off("session-started", onSessionStarted);
      loop.off("session-completed", onSessionCompleted);
      loop.off("scan-complete", onScanComplete);
      loop.off("error", onError);
      loop.off("epic-cancelled", onEpicCancelled);
      loop.off("release:held", onReleaseHeld);
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

  // --- Derive breadcrumbs and key hints for active view ---
  const crumbs = VS.crumbBar(viewStack);
  const keyHintText = getKeyHints(activeView.type);

  // --- Render the active view content ---
  function renderContent() {
    switch (activeView.type) {
      case "epic-list":
        return (
          <EpicTable
            epics={filteredEpics}
            activeSessions={activeSessions}
            selectedIndex={keyboard.nav.selectedIndex}
            cancelConfirmingSlug={cancelConfirmingSlug}
            heldEpics={heldEpics}
          />
        );
      case "feature-list": {
        const epic = epics.find((e) => e.slug === activeView.epicSlug);
        return (
          <FeatureList
            epicSlug={activeView.epicSlug}
            features={epic?.features ?? []}
            selectedIndex={featureNav.selectedIndex}
            activeSessions={activeSessions}
          />
        );
      }
      case "agent-log":
        // TODO: Wire up emitter from DispatchTracker when SDK streaming is connected
        return (
          <AgentLog
            epicSlug={activeView.epicSlug}
            featureSlug={activeView.featureSlug}
            emitter={null}
            follow={followMode}
          />
        );
    }
  }

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

      {/* Crumb bar — only show when drilled in */}
      {activeView.type !== "epic-list" && <CrumbBar crumbs={crumbs} />}

      <Box paddingX={1}>
        <Text dimColor>{"─".repeat(78)}</Text>
      </Box>

      {/* Content area — view switcher */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {renderContent()}
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

      {/* Footer — context-sensitive key hints */}
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
