import { useState, useEffect, useCallback, useRef } from "react";
import { Text, useApp } from "ink";
import type { BeastmodeConfig } from "../config.js";
import type { EnrichedEpic } from "../store/index.js";
import type { WatchLoopEventMap, DispatchedSession } from "../dispatch/types.js";
import type { WatchLoop } from "../commands/watch-loop.js";
import type { LogLevel } from "../logger.js";
import ThreePanelLayout from "./ThreePanelLayout.js";
import EpicsPanel from "./EpicsPanel.js";
import DetailsPanel from "./DetailsPanel.js";
import type { DetailsPanelSelection } from "./details-panel.js";
import type { GitStatus } from "./overview-panel.js";
import LogPanel, { filterTreeByPhase, filterTreeByViewFilter, filterTreeByVerbosity, stripEmptyNodes, countTreeLines } from "./LogPanel.js";
import { useDashboardTreeState } from "./hooks/use-dashboard-tree-state.js";
import { useDashboardKeyboard } from "./hooks/use-dashboard-keyboard.js";
import { useTerminalSize } from "./hooks/use-terminal-size.js";
import { getKeyHints } from "./key-hints.js";
import { cancelEpicAction } from "./actions/cancel-epic.js";
import { FallbackEntryStore, lifecycleToLogEntry } from "./lifecycle-entries.js";
import { createLogger } from "../logger.js";
import { DashboardSink } from "./dashboard-sink.js";
import type { SystemEntryRef } from "./dashboard-logger.js";
import { TICK_INTERVAL_MS } from "./NyanBanner.js";
import { buildFlatRows, rowSlugAtIndex } from "./epics-tree-model.js";
import type { SelectableRow } from "./epics-tree-model.js";
import { SessionStatsAccumulator } from "./session-stats.js";
import { loadStats, saveStats, mergeSessionCompleted, type PersistedStats } from "./stats-persistence.js";
import { join } from "node:path";

export interface AppProps {
  config: BeastmodeConfig;
  verbosity: number;
  loop?: WatchLoop;
  projectRoot?: string;
  /** Shared fallback entry store — created by dashboard command, fed by DashboardLogger. */
  fallbackStore?: FallbackEntryStore;
  /** Shared system entries ref — created by dashboard command, fed by DashboardLogger. */
  systemRef?: SystemEntryRef;
}

export default function App({ config, verbosity, loop, projectRoot, fallbackStore, systemRef }: AppProps) {
  const { exit } = useApp();
  const [epics, setEpics] = useState<EnrichedEpic[]>([]);
  const [watchRunning, setWatchRunning] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<Set<string>>(new Set());
  const [trackerSessions, setTrackerSessions] = useState<DispatchedSession[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const { rows } = useTerminalSize();
  const [tick, setTick] = useState(0);
  const logTotalLinesRef = useRef(0);
  const maxVisibleLinesRef = useRef(50);
  const detailsVisibleLinesRef = useRef(10);
  const loopRef = useRef(loop);
  loopRef.current = loop;
  // Use shared stores from dashboard command if provided, otherwise create local ones
  const fallbackStoreRef = useRef(fallbackStore ?? new FallbackEntryStore());
  const systemEntriesRef = useRef(systemRef?.entries ?? []);
  const systemSeqRef = useRef(0);
  const [sessionStats, setSessionStats] = useState<ReturnType<SessionStatsAccumulator["getStats"]> | undefined>(undefined);
  const statsAccRef = useRef<SessionStatsAccumulator | null>(null);
  const [allTimeStats, setAllTimeStats] = useState<PersistedStats | undefined>(undefined);

  // Dashboard logger for cancel actions (uses shared stores)
  const dashboardLoggerRef = useRef(
    createLogger(
      new DashboardSink({
        fallbackStore: fallbackStoreRef.current,
        systemRef: systemRef ?? {
          entries: systemEntriesRef.current,
          nextSeq: () => systemSeqRef.current++,
        },
      }),
    ),
  );

  // slugAtIndex reads from a ref so it always sees the latest flatRows
  // (computed below the keyboard hook, updated every render).
  const filteredEpicsRef = useRef<EnrichedEpic[]>([]);
  const flatRowsRef = useRef<SelectableRow[]>([]);
  const [expandedEpicSlug, setExpandedEpicSlug] = useState<string | undefined>(undefined);
  const slugAtIndex = useCallback(
    (index: number): string | undefined => {
      const sel = rowSlugAtIndex(flatRowsRef.current, index);
      if (!sel) return undefined;
      if (typeof sel === "string") return sel;
      return sel.epicSlug; // For cancel flow, use the parent epic slug
    },
    [],
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
        logger: dashboardLoggerRef.current.child({ epic: slug }),
      });
    },
    [projectRoot, config.github.enabled],
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

  const handleToggleExpand = useCallback((slug: string | undefined) => {
    if (!slug) return; // (all) row — no expansion
    setExpandedEpicSlug((prev) => (prev === slug ? undefined : slug));
  }, []);

  // --- Keyboard hook (flat model — no view stack) ---
  // itemCount uses epics.length as upper bound; clamped below after filtering.
  const keyboard = useDashboardKeyboard({
    itemCount: epics.length + 1, // +1 for "(all)" row
    onCancelEpic: handleCancelEpic,
    onShutdown: handleShutdown,
    slugAtIndex,
    onFilterApply: handleFilterApply,
    onFilterClear: handleFilterClear,
    initialVerbosity: verbosity,
    onToggleExpand: handleToggleExpand,
    logTotalLines: logTotalLinesRef.current,
    logVisibleLines: maxVisibleLinesRef.current,
    detailsContentHeight: 0,
    detailsVisibleHeight: detailsVisibleLinesRef.current,
  });

  // --- Phase + view + name filtering (additive) ---
  const terminal = new Set(["done", "cancelled", "blocked"]);
  const filteredEpics = epics.filter((e) => {
    // Phase filter
    if (keyboard.phaseFilter !== "all" && e.status !== keyboard.phaseFilter) {
      return false;
    }
    // View filter
    if (keyboard.viewFilter === "active" && terminal.has(e.status)) {
      return false;
    }
    if (keyboard.viewFilter === "running" && !activeSessions.has(e.slug)) {
      return false;
    }
    // Name filter
    if (activeFilter && !e.slug.includes(activeFilter)) {
      return false;
    }
    return true;
  });
  filteredEpicsRef.current = filteredEpics;

  // Build flat rows (includes expanded feature rows)
  const flatRows = buildFlatRows(filteredEpics, expandedEpicSlug);
  flatRowsRef.current = flatRows;

  // Clamp nav when list changes
  useEffect(() => {
    keyboard.nav.clampToRange(flatRows.length);
  }, [flatRows.length]);

  // Collapse when expanded epic is filtered out
  useEffect(() => {
    if (expandedEpicSlug && !filteredEpics.some((e) => e.slug === expandedEpicSlug)) {
      setExpandedEpicSlug(undefined);
    }
  }, [filteredEpics, expandedEpicSlug]);

  // --- Tree state for log panel ---
  const selectedRowResult = rowSlugAtIndex(flatRows, keyboard.nav.selectedIndex);
  const selectedEpicSlug = !selectedRowResult
    ? undefined
    : typeof selectedRowResult === "string"
      ? selectedRowResult
      : selectedRowResult.epicSlug;

  // --- Details panel selection ---
  const detailsSelection: DetailsPanelSelection =
    selectedRowResult && typeof selectedRowResult !== "string"
      ? { kind: "feature", epicSlug: selectedRowResult.epicSlug, featureSlug: selectedRowResult.featureSlug }
      : selectedEpicSlug
        ? { kind: "epic", slug: selectedEpicSlug }
        : { kind: "all" };

  const detailsKey = detailsSelection.kind === "feature"
    ? detailsSelection.featureSlug
    : detailsSelection.kind === "epic"
      ? detailsSelection.slug
      : "all";

  // Reset details scroll on selection change
  useEffect(() => {
    keyboard.resetDetailsScroll();
  }, [detailsKey]);

  const { state: treeState } = useDashboardTreeState({
    sessions: trackerSessions,
    selectedEpicSlug,
    fallbackEntries: fallbackStoreRef.current,
    systemEntries: systemEntriesRef.current,
    enrichedEpics: epics,
  });

  // --- Filter pipeline for log tree ---
  const phaseFiltered = filterTreeByPhase(treeState, keyboard.phaseFilter);
  // When a specific epic is selected, show all features regardless of view filter
  const effectiveViewFilter = selectedEpicSlug ? "all" : keyboard.viewFilter;
  const filteredTreeState = filterTreeByViewFilter(phaseFiltered, effectiveViewFilter, activeSessions);
  const showSkeleton = !!selectedEpicSlug || keyboard.viewFilter === "all";
  // Count lines after the same filters LogPanel applies (verbosity + empty-node stripping)
  const verbFiltered = filterTreeByVerbosity(filteredTreeState, keyboard.verbosity);
  const logTreeForCount = showSkeleton ? verbFiltered : stripEmptyNodes(verbFiltered);
  const logTotalLines = countTreeLines(logTreeForCount);
  logTotalLinesRef.current = logTotalLines;

  // Compute fixed row heights for all panels from terminal dimensions
  // Layout: header (5 rows) + bottom bar (1)
  // Each PanelBox uses 2 rows of chrome (top border + bottom border)
  const headerHeight = 5;
  const footerHeight = 1;
  const panelBorderHeight = 2;
  const totalContent = Math.max(5, (rows ?? 24) - headerHeight - footerHeight);
  // Left column: EPICS 60%, DETAILS 40%
  const epicsPanelHeight = Math.floor(totalContent * 0.6);
  const detailsPanelHeight = totalContent - epicsPanelHeight;
  const epicsVisibleLines = Math.max(3, epicsPanelHeight - panelBorderHeight);
  const detailsVisibleLines = Math.max(3, detailsPanelHeight - panelBorderHeight);
  // Right column: LOG full height
  const logPanelHeight = totalContent;
  const maxVisibleLines = Math.max(5, logPanelHeight - panelBorderHeight);
  maxVisibleLinesRef.current = maxVisibleLines;
  detailsVisibleLinesRef.current = detailsVisibleLines;

  // --- Nyan tick every 80ms — shared between banner and focus border ---
  useEffect(() => {
    const timer = setInterval(() => setTick((prev) => prev + 1), TICK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // --- Git status refresh ---
  useEffect(() => {
    const fetchGitStatus = async () => {
      try {
        const proc = Bun.spawn(["git", "rev-parse", "--abbrev-ref", "HEAD"], {
          stdout: "pipe",
          stderr: "pipe",
        });
        const branch = (await new Response(proc.stdout).text()).trim();

        const diffProc = Bun.spawn(["git", "diff", "--quiet", "HEAD"], {
          stdout: "pipe",
          stderr: "pipe",
        });
        await diffProc.exited;
        const dirty = diffProc.exitCode !== 0;

        setGitStatus({ branch, dirty });
      } catch {
        // Non-fatal — will retry on next scan
      }
    };

    fetchGitStatus();

    if (loop) {
      loop.on("scan-complete", fetchGitStatus);
      return () => {
        loop.off("scan-complete", fetchGitStatus);
      };
    }
  }, [loop]);

  // --- WatchLoop event subscriptions ---
  useEffect(() => {
    if (!loop) return;

    const refreshSessions = () => {
      setTrackerSessions(loop.getTracker().getAll());
    };

    const pushSystemEntry = (message: string, level: LogLevel = "info") => {
      systemEntriesRef.current.push({
        timestamp: Date.now(),
        level,
        message,
        seq: systemSeqRef.current++,
      });
    };

    const onStarted = (ev: WatchLoopEventMap["started"][0]) => {
      setVersion(ev.version);
      setWatchRunning(true);
      pushSystemEntry("watch loop started", "debug");
    };
    const onStopped = () => {
      setWatchRunning(false);
      pushSystemEntry("watch loop stopped", "debug");
    };

    const onSessionStarted = (ev: WatchLoopEventMap["session-started"][0]) => {
      setActiveSessions((prev) => new Set([...prev, ev.epicSlug]));
      refreshSessions();
      const entries = lifecycleToLogEntry("session-started", ev);
      for (const entry of entries) {
        fallbackStoreRef.current.push(ev.epicSlug, ev.phase, ev.featureSlug, entry);
      }
    };

    const onSessionCompleted = (ev: WatchLoopEventMap["session-completed"][0]) => {
      setActiveSessions((prev) => {
        const next = new Set(prev);
        next.delete(ev.epicSlug);
        return next;
      });
      refreshSessions();
      fallbackStoreRef.current.push(
        ev.epicSlug,
        ev.phase,
        ev.featureSlug,
        lifecycleToLogEntry("session-completed", ev),
      );
    };

    const onScanComplete = (_ev: WatchLoopEventMap["scan-complete"][0]) => {
      const activeEpicSlugs = new Set(loop.getTracker().getAll().map((s) => s.epicSlug));
      setActiveSessions(activeEpicSlugs);
      refreshSessions();
      pushSystemEntry(`scan complete — ${activeEpicSlugs.size} active session(s)`, "debug");
    };

    const onError = (ev: WatchLoopEventMap["error"][0]) => {
      if (ev.epicSlug) {
        fallbackStoreRef.current.push(
          ev.epicSlug,
          "unknown",
          undefined,
          lifecycleToLogEntry("error", ev),
        );
      } else {
        pushSystemEntry(`error: ${ev.message}`, "error");
      }
    };

    const onEpicBlocked = (ev: WatchLoopEventMap["epic-blocked"][0]) => {
      fallbackStoreRef.current.push(
        ev.epicSlug,
        "unknown",
        undefined,
        lifecycleToLogEntry("epic-blocked", ev),
      );
    };

    const onReleaseHeld = (ev: WatchLoopEventMap["release:held"][0]) => {
      fallbackStoreRef.current.push(
        ev.waitingSlug,
        "release",
        undefined,
        lifecycleToLogEntry("release:held", ev),
      );
    };

    const onSessionDead = (ev: WatchLoopEventMap["session-dead"][0]) => {
      fallbackStoreRef.current.push(
        ev.epicSlug,
        ev.phase,
        ev.featureSlug,
        lifecycleToLogEntry("session-dead", ev),
      );
    };

    const onEpicCancelled = (ev: WatchLoopEventMap["epic-cancelled"][0]) => {
      fallbackStoreRef.current.push(
        ev.epicSlug,
        "unknown",
        undefined,
        lifecycleToLogEntry("epic-cancelled", ev),
      );
      refreshSessions();
    };

    loop.on("started", onStarted);
    loop.on("stopped", onStopped);
    loop.on("session-started", onSessionStarted);
    loop.on("session-completed", onSessionCompleted);
    loop.on("scan-complete", onScanComplete);
    loop.on("error", onError);
    loop.on("epic-blocked", onEpicBlocked);
    loop.on("release:held", onReleaseHeld);
    loop.on("session-dead", onSessionDead);
    loop.on("epic-cancelled", onEpicCancelled);

    return () => {
      loop.off("started", onStarted);
      loop.off("stopped", onStopped);
      loop.off("session-started", onSessionStarted);
      loop.off("session-completed", onSessionCompleted);
      loop.off("scan-complete", onScanComplete);
      loop.off("error", onError);
      loop.off("epic-blocked", onEpicBlocked);
      loop.off("release:held", onReleaseHeld);
      loop.off("session-dead", onSessionDead);
      loop.off("epic-cancelled", onEpicCancelled);
    };
  }, [loop]);

  // --- Stats accumulator ---
  useEffect(() => {
    if (!loop) return;

    const acc = new SessionStatsAccumulator(loop);
    statsAccRef.current = acc;

    const refreshStats = () => {
      setSessionStats(acc.getStats());
    };

    loop.on("session-started", refreshStats);
    loop.on("session-completed", refreshStats);
    loop.on("scan-complete", refreshStats);

    return () => {
      loop.off("session-started", refreshStats);
      loop.off("session-completed", refreshStats);
      loop.off("scan-complete", refreshStats);
      acc.dispose();
      statsAccRef.current = null;
    };
  }, [loop]);

  // --- Persisted stats (all-time) ---
  useEffect(() => {
    if (!projectRoot) return;
    const statsPath = join(projectRoot, ".beastmode", "state", "dashboard-stats.json");
    const persisted = loadStats(statsPath);
    setAllTimeStats(persisted);

    if (!loop) return;

    const onSessionCompleted = (ev: WatchLoopEventMap["session-completed"][0]) => {
      setAllTimeStats((prev) => {
        const updated = mergeSessionCompleted(prev ?? persisted, {
          epicSlug: ev.epicSlug,
          phase: ev.phase,
          success: ev.success,
          durationMs: ev.durationMs,
          featureSlug: ev.featureSlug,
        });
        saveStats(statsPath, updated);
        return updated;
      });
    };

    loop.on("session-completed", onSessionCompleted);
    return () => {
      loop.off("session-completed", onSessionCompleted);
    };
  }, [loop, projectRoot]);

  // --- Refresh epics from store ---
  useEffect(() => {
    if (!loop || !projectRoot) return;

    const refreshEpics = async () => {
      try {
        const { listEnrichedFromStore } = await import("../store/scan.js");
        const { JsonFileStore } = await import("../store/json-file-store.js");
        const { join } = await import("node:path");
        const storePath = join(projectRoot!, ".beastmode", "state", "store.json");
        const taskStore = new JsonFileStore(storePath);
        taskStore.load();
        const epicList = listEnrichedFromStore(taskStore);
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
    verbosity: keyboard.verbosity,
    phaseFilter: keyboard.phaseFilter,
    viewFilter: keyboard.viewFilter,
  });

  // --- Cancel prompt ---
  const cancelPrompt = cancelConfirmingSlug ? (
    <Text color="yellow">Cancel {cancelConfirmingSlug}? (y/n)</Text>
  ) : undefined;

  return (
    <ThreePanelLayout
      watchRunning={watchRunning}
      version={version ?? undefined}
      rows={rows}
      focusedPanel={keyboard.focusedPanel}
      nyanTick={tick}
      epicsHeight={epicsPanelHeight}
      detailsHeight={detailsPanelHeight}
      logHeight={logPanelHeight}
      epicsSlot={
        <EpicsPanel
          flatRows={flatRows}
          activeSessions={activeSessions}
          selectedIndex={keyboard.nav.selectedIndex}
          cancelConfirmingSlug={cancelConfirmingSlug}
          visibleHeight={epicsVisibleLines}
        />
      }
      detailsSlot={
        <DetailsPanel
          selection={detailsSelection}
          projectRoot={projectRoot}
          epics={filteredEpics}
          activeSessions={activeSessions.size}
          gitStatus={gitStatus}
          scrollOffset={keyboard.detailsScrollOffset}
          visibleHeight={detailsVisibleLines}
          stats={sessionStats}
        />
      }
      logSlot={
        <LogPanel
          state={filteredTreeState}
          verbosity={keyboard.verbosity}
          scrollOffset={keyboard.logScrollOffset}
          autoFollow={keyboard.logAutoFollow}
          maxVisibleLines={maxVisibleLines}
          showSkeleton={showSkeleton}
        />
      }
      keyHints={keyHintText}
      isShuttingDown={keyboard.shutdown.isShuttingDown}
      cancelPrompt={cancelPrompt}
    />
  );
}
