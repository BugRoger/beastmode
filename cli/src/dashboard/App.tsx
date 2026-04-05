import { useState, useEffect, useCallback, useRef } from "react";
import { Text, useApp } from "ink";
import type { BeastmodeConfig } from "../config.js";
import type { EnrichedEpic } from "../store/index.js";
import type { WatchLoopEventMap, DispatchedSession } from "../dispatch/types.js";
import type { WatchLoop } from "../commands/watch-loop.js";
import type { LogLevel } from "../logger.js";
import ThreePanelLayout from "./ThreePanelLayout.js";
import EpicsPanel from "./EpicsPanel.js";
import OverviewPanel from "./OverviewPanel.js";
import type { GitStatus } from "./overview-panel.js";
import LogPanel from "./LogPanel.js";
import { useDashboardTreeState } from "./hooks/use-dashboard-tree-state.js";
import { useDashboardKeyboard } from "./hooks/use-dashboard-keyboard.js";
import { useTerminalSize } from "./hooks/use-terminal-size.js";
import { getKeyHints } from "./key-hints.js";
import { cancelEpicAction } from "./actions/cancel-epic.js";
import { FallbackEntryStore, lifecycleToLogEntry } from "./lifecycle-entries.js";
import { createLogger } from "../logger.js";
import { DashboardSink } from "./dashboard-sink.js";
import type { SystemEntryRef } from "./dashboard-logger.js";

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

function formatClock(): string {
  const now = new Date();
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export default function App({ config, verbosity, loop, projectRoot, fallbackStore, systemRef }: AppProps) {
  const { exit } = useApp();
  const [clock, setClock] = useState(formatClock());
  const [epics, setEpics] = useState<EnrichedEpic[]>([]);
  const [watchRunning, setWatchRunning] = useState(false);
  const [activeSessions, setActiveSessions] = useState<Set<string>>(new Set());
  const [trackerSessions, setTrackerSessions] = useState<DispatchedSession[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [expandedEpicSlug, setExpandedEpicSlug] = useState<string | undefined>(undefined);
  const { rows } = useTerminalSize();
  const loopRef = useRef(loop);
  loopRef.current = loop;
  // Use shared stores from dashboard command if provided, otherwise create local ones
  const fallbackStoreRef = useRef(fallbackStore ?? new FallbackEntryStore());
  const systemEntriesRef = useRef(systemRef?.entries ?? []);
  const systemSeqRef = useRef(0);

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

  // slugAtIndex reads from a ref so it always sees the latest filteredEpics
  // (computed below the keyboard hook, updated every render).
  const filteredEpicsRef = useRef<EnrichedEpic[]>([]);
  const flatRowsRef = useRef<SelectableRow[]>([]);
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
    logTotalLines: 0,
    detailsContentHeight: 0,
    detailsVisibleHeight: 0,
    onToggleExpand: handleToggleExpand,
  });

  // --- Filter + toggle-all ---
  const filteredEpics = epics.filter((e) => {
    if (!keyboard.toggleAll.showAll && (e.status === "done" || e.status === "cancelled")) {
      return false;
    }
    if (activeFilter && !e.slug.includes(activeFilter)) {
      return false;
    }
    return true;
  });
  filteredEpicsRef.current = filteredEpics;

  const flatRows = buildFlatRows(filteredEpics, expandedEpicSlug);
  flatRowsRef.current = flatRows;

  // Clamp nav when list changes
  useEffect(() => {
    keyboard.nav.clampToRange(flatRows.length);
  }, [flatRows.length]);

  // --- Tree state for log panel ---
  const selectedRowResult = rowSlugAtIndex(flatRows, keyboard.nav.selectedIndex);
  const selectedEpicSlug = !selectedRowResult
    ? undefined
    : typeof selectedRowResult === "string"
      ? selectedRowResult
      : selectedRowResult.epicSlug;

  const { state: treeState } = useDashboardTreeState({
    sessions: trackerSessions,
    selectedEpicSlug,
    fallbackEntries: fallbackStoreRef.current,
    systemEntries: systemEntriesRef.current,
    enrichedEpics: epics,
  });

  // --- Clock tick every 1s ---
  useEffect(() => {
    const timer = setInterval(() => setClock(formatClock()), 1000);
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

    const onStarted = () => {
      setWatchRunning(true);
      pushSystemEntry("watch loop started");
    };
    const onStopped = () => {
      setWatchRunning(false);
      pushSystemEntry("watch loop stopped");
    };

    const onSessionStarted = (ev: WatchLoopEventMap["session-started"][0]) => {
      setActiveSessions((prev) => new Set([...prev, ev.epicSlug]));
      refreshSessions();
      pushSystemEntry(`session started: ${ev.epicSlug} [${ev.phase}]`);
      fallbackStoreRef.current.push(
        ev.epicSlug,
        ev.phase,
        ev.featureSlug,
        lifecycleToLogEntry("session-started", ev),
      );
    };

    const onSessionCompleted = (ev: WatchLoopEventMap["session-completed"][0]) => {
      setActiveSessions((prev) => {
        const next = new Set(prev);
        next.delete(ev.epicSlug);
        return next;
      });
      refreshSessions();
      const status = ev.success ? "completed" : "failed";
      pushSystemEntry(`session ${status}: ${ev.epicSlug} [${ev.phase}]`, ev.success ? "info" : "error");
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
      pushSystemEntry(`scan complete — ${activeEpicSlugs.size} active session(s)`);
    };

    const onError = (ev: WatchLoopEventMap["error"][0]) => {
      pushSystemEntry(`error: ${ev.message}`, "error");
      if (ev.epicSlug) {
        fallbackStoreRef.current.push(
          ev.epicSlug,
          "unknown",
          undefined,
          lifecycleToLogEntry("error", ev),
        );
      }
    };

    const onEpicBlocked = (ev: WatchLoopEventMap["epic-blocked"][0]) => {
      pushSystemEntry(`blocked: ${ev.epicSlug} at ${ev.gate} — ${ev.reason}`);
      fallbackStoreRef.current.push(
        ev.epicSlug,
        "unknown",
        undefined,
        lifecycleToLogEntry("epic-blocked", ev),
      );
    };

    const onReleaseHeld = (ev: WatchLoopEventMap["release:held"][0]) => {
      pushSystemEntry(`release held: ${ev.waitingSlug} blocked by ${ev.blockingSlug}`);
      fallbackStoreRef.current.push(
        ev.waitingSlug,
        "release",
        undefined,
        lifecycleToLogEntry("release:held", ev),
      );
    };

    const onSessionDead = (ev: WatchLoopEventMap["session-dead"][0]) => {
      pushSystemEntry(`session dead: ${ev.epicSlug} [${ev.phase}]`, "error");
      fallbackStoreRef.current.push(
        ev.epicSlug,
        ev.phase,
        ev.featureSlug,
        lifecycleToLogEntry("session-dead", ev),
      );
    };

    const onEpicCancelled = (ev: WatchLoopEventMap["epic-cancelled"][0]) => {
      pushSystemEntry(`cancelled: ${ev.epicSlug}`);
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
  });

  // --- Cancel prompt ---
  const cancelPrompt = cancelConfirmingSlug ? (
    <Text color="yellow">Cancel {cancelConfirmingSlug}? (y/n)</Text>
  ) : undefined;

  return (
    <ThreePanelLayout
      watchRunning={watchRunning}
      clock={clock}
      rows={rows}
      epicsSlot={
        <EpicsPanel
          epics={filteredEpics}
          activeSessions={activeSessions}
          selectedIndex={keyboard.nav.selectedIndex}
          cancelConfirmingSlug={cancelConfirmingSlug}
        />
      }
      detailsSlot={
        <OverviewPanel
          epics={filteredEpics}
          activeSessions={activeSessions}
          gitStatus={gitStatus}
        />
      }
      logSlot={<LogPanel state={treeState} verbosity={keyboard.verbosity} />}
      keyHints={keyHintText}
      isShuttingDown={keyboard.shutdown.isShuttingDown}
      cancelPrompt={cancelPrompt}
    />
  );
}
