import { useState, useEffect, useCallback, useRef } from "react";
import { Text, useApp } from "ink";
import type { BeastmodeConfig } from "../config.js";
import type { EnrichedManifest } from "../manifest/store.js";
import type { WatchLoopEventMap, DispatchedSession } from "../dispatch/types.js";
import type { WatchLoop } from "../commands/watch-loop.js";
import ThreePanelLayout from "./ThreePanelLayout.js";
import EpicsPanel from "./EpicsPanel.js";
import DetailsPanel from "./DetailsPanel.js";
import LogPanel from "./LogPanel.js";
import { useDashboardTreeState } from "./hooks/use-dashboard-tree-state.js";
import { useDashboardKeyboard } from "./hooks/use-dashboard-keyboard.js";
import { getKeyHints } from "./key-hints.js";
import { cancelEpicAction } from "./actions/cancel-epic.js";
import { createLogger } from "../logger.js";

export interface AppProps {
  config: BeastmodeConfig;
  verbosity: number;
  loop?: WatchLoop;
  projectRoot?: string;
}

function formatClock(): string {
  const now = new Date();
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export default function App({ config, verbosity, loop, projectRoot }: AppProps) {
  const { exit } = useApp();
  const [clock, setClock] = useState(formatClock());
  const [epics, setEpics] = useState<EnrichedManifest[]>([]);
  const [watchRunning, setWatchRunning] = useState(false);
  const [activeSessions, setActiveSessions] = useState<Set<string>>(new Set());
  const [trackerSessions, setTrackerSessions] = useState<DispatchedSession[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("");
  const loopRef = useRef(loop);
  loopRef.current = loop;

  // --- Visible epics (filtered by active filter and toggle-all) ---
  const slugAtIndex = useCallback(
    (index: number): string | undefined => {
      // index 0 = "(all)" row, returns undefined
      if (index === 0) return undefined;
      return epics[index - 1]?.slug;
    },
    [epics],
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
    },
    [projectRoot, config.github.enabled, verbosity],
  );

  const handleShutdown = useCallback(async () => {
    if (loopRef.current) {
      await loopRef.current.stop();
    }
    exit();
  }, [exit]);

  const handleFilterApply = useCallback((filter: string) => {
    setActiveFilter(filter);
  }, []);

  const handleFilterClear = useCallback(() => {
    setActiveFilter("");
  }, []);

  // --- Keyboard hook (flat model — no view stack) ---
  const keyboard = useDashboardKeyboard({
    itemCount: epics.length + 1, // +1 for "(all)" row
    onCancelEpic: handleCancelEpic,
    onShutdown: handleShutdown,
    slugAtIndex,
    onFilterApply: handleFilterApply,
    onFilterClear: handleFilterClear,
  });

  // --- Filter + toggle-all ---
  const filteredEpics = epics.filter((e) => {
    if (!keyboard.toggleAll.showAll && (e.phase === "done" || e.phase === "cancelled")) {
      return false;
    }
    if (activeFilter && !e.slug.includes(activeFilter)) {
      return false;
    }
    return true;
  });

  // Clamp nav when list changes
  useEffect(() => {
    keyboard.nav.clampToRange(filteredEpics.length + 1); // +1 for "(all)"
  }, [filteredEpics.length]);

  // --- Tree state for log panel ---
  const selectedEpicSlug = keyboard.nav.selectedIndex === 0
    ? undefined
    : filteredEpics[keyboard.nav.selectedIndex - 1]?.slug;

  const { state: treeState } = useDashboardTreeState({
    sessions: trackerSessions,
    selectedEpicSlug,
  });

  // --- Clock tick every 1s ---
  useEffect(() => {
    const timer = setInterval(() => setClock(formatClock()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- WatchLoop event subscriptions ---
  useEffect(() => {
    if (!loop) return;

    const refreshSessions = () => {
      setTrackerSessions(loop.getTracker().getAll());
    };

    const onStarted = () => setWatchRunning(true);
    const onStopped = () => setWatchRunning(false);

    const onSessionStarted = (ev: WatchLoopEventMap["session-started"][0]) => {
      setActiveSessions((prev) => new Set([...prev, ev.epicSlug]));
      refreshSessions();
    };

    const onSessionCompleted = (ev: WatchLoopEventMap["session-completed"][0]) => {
      setActiveSessions((prev) => {
        const next = new Set(prev);
        next.delete(ev.epicSlug);
        return next;
      });
      refreshSessions();
    };

    const onScanComplete = (_ev: WatchLoopEventMap["scan-complete"][0]) => {
      const activeEpicSlugs = new Set(loop.getTracker().getAll().map((s) => s.epicSlug));
      setActiveSessions(activeEpicSlugs);
      refreshSessions();
    };

    loop.on("started", onStarted);
    loop.on("stopped", onStopped);
    loop.on("session-started", onSessionStarted);
    loop.on("session-completed", onSessionCompleted);
    loop.on("scan-complete", onScanComplete);

    return () => {
      loop.off("started", onStarted);
      loop.off("stopped", onStopped);
      loop.off("session-started", onSessionStarted);
      loop.off("session-completed", onSessionCompleted);
      loop.off("scan-complete", onScanComplete);
    };
  }, [loop]);

  // --- Refresh epics from manifest store ---
  useEffect(() => {
    if (!loop || !projectRoot) return;

    const refreshEpics = async () => {
      try {
        const { listEnriched } = await import("../manifest/store.js");
        const result = listEnriched(projectRoot);
        const epicList = Array.isArray(result) ? result : result.epics;
        setEpics(epicList);
      } catch {
        // Non-fatal — will retry on next scan
      }
    };

    refreshEpics();

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

  // --- Cancel prompt ---
  const cancelPrompt = cancelConfirmingSlug ? (
    <Text color="yellow">Cancel {cancelConfirmingSlug}? (y/n)</Text>
  ) : undefined;

  return (
    <ThreePanelLayout
      watchRunning={watchRunning}
      clock={clock}
      epicsSlot={
        <EpicsPanel
          epics={filteredEpics}
          activeSessions={activeSessions}
          selectedIndex={keyboard.nav.selectedIndex}
          cancelConfirmingSlug={cancelConfirmingSlug}
        />
      }
      detailsSlot={
        <DetailsPanel
          epics={filteredEpics}
          selectedIndex={keyboard.nav.selectedIndex}
          activeSessions={activeSessions}
        />
      }
      logSlot={<LogPanel state={treeState} />}
      keyHints={keyHintText}
      isShuttingDown={keyboard.shutdown.isShuttingDown}
      cancelPrompt={cancelPrompt}
    />
  );
}
