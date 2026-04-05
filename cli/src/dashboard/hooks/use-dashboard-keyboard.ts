/**
 * useDashboardKeyboard — flat interaction model keyboard handler.
 *
 * Replaces the old drill-down useKeyboardController with a single-panel model.
 * Three modes: normal, filter, confirm. No view stack, no drill-down.
 *
 * Priority-based input routing:
 * 1. Shutting down → ignore all input
 * 2. Confirm mode (cancel flow) → y/n/Escape only
 * 3. Filter mode → text input, Enter to apply, Escape to clear/exit
 * 4. Shutdown keys (q, Q, Ctrl+C)
 * 5. Tab → toggle focus panel (epics/log)
 * 6. Arrow keys → navigation
 * 7. 'a'/'A' → toggle done/cancelled visibility
 * 8. 'p'/'P' → cycle phase filter
 * 9. 'b'/'B' → toggle blocked visibility
 * 10. 'x'/'X' → initiate cancel for selected epic (not on "(all)" row)
 * 11. '/' → enter filter mode
 * 12. 'v'/'V' → cycle verbosity level
 */

import { useState, useCallback } from "react";
import { useInput } from "ink";
import type { Key } from "ink";
import { useKeyboardNav } from "./use-keyboard-nav.js";
import { useCancelFlow } from "./use-cancel-flow.js";
import { useGracefulShutdown } from "./use-graceful-shutdown.js";
import { useToggleAll } from "./use-toggle-all.js";
import { cycleVerbosity } from "../verbosity.js";
import type { KeyboardNavState } from "./use-keyboard-nav.js";
import type { CancelFlowResult } from "./use-cancel-flow.js";
import type { GracefulShutdownState } from "./use-graceful-shutdown.js";
import type { ToggleAllState } from "./use-toggle-all.js";

/** Interaction mode for the dashboard keyboard */
export type DashboardMode = "normal" | "filter" | "confirm";

/** Focused panel in flat layout */
export type FocusedPanel = "epics" | "log";

/** Phase filter for dashboard view */
export type PhaseFilter = "all" | "design" | "plan" | "implement" | "validate" | "release";

const PHASE_ORDER: readonly PhaseFilter[] = [
  "all", "design", "plan", "implement", "validate", "release",
];

export function cyclePhaseFilter(current: PhaseFilter): PhaseFilter {
  const idx = PHASE_ORDER.indexOf(current);
  return PHASE_ORDER[(idx + 1) % PHASE_ORDER.length];
}

export interface DashboardKeyboardDeps {
  /** Number of visible rows including (all) entry */
  itemCount: number;
  /** Callback to cancel an epic by slug */
  onCancelEpic: (slug: string) => Promise<void>;
  /** Callback to initiate graceful shutdown */
  onShutdown: () => Promise<void>;
  /** Resolve the epic slug at a given row index (index 0 = "(all)", returns undefined) */
  slugAtIndex: (index: number) => string | undefined;
  /** Callback when filter string changes (Enter to apply, Escape to clear) */
  onFilterApply: (filter: string) => void;
  /** Callback when filter is cleared (Escape) */
  onFilterClear: () => void;
  /** Initial verbosity level from CLI args (0-3) */
  initialVerbosity: number;
  /** Total number of visible lines in the log tree (for scroll clamping) */
  logTotalLines: number;
  /** Total content height of the details panel (for scroll clamping) */
  detailsContentHeight: number;
  /** Visible height of the details panel */
  detailsVisibleHeight: number;
}

export interface DashboardKeyboardState {
  /** Navigation state (selected index) */
  nav: KeyboardNavState;
  /** Cancel flow state */
  cancelFlow: CancelFlowResult;
  /** Shutdown state */
  shutdown: GracefulShutdownState;
  /** Toggle all (done/cancelled visibility) state */
  toggleAll: ToggleAllState;
  /** Current interaction mode */
  mode: DashboardMode;
  /** Current filter input text (while in filter mode) */
  filterInput: string;
  /** Current verbosity level (0=info, 1=detail, 2=debug, 3=trace) */
  verbosity: number;
  /** Currently focused panel */
  focusedPanel: FocusedPanel;
  /** Current phase filter */
  phaseFilter: PhaseFilter;
  /** Whether to show blocked items */
  showBlocked: boolean;
  /** Log scroll offset (line index from top) */
  logScrollOffset: number;
  /** Whether log auto-follows newest entries */
  logAutoFollow: boolean;
  /** Details panel scroll offset */
  detailsScrollOffset: number;
}

export function useDashboardKeyboard(
  deps: DashboardKeyboardDeps,
): DashboardKeyboardState {
  const {
    itemCount,
    onCancelEpic,
    onShutdown,
    slugAtIndex,
    onFilterApply,
    onFilterClear,
    initialVerbosity,
    logTotalLines,
    detailsContentHeight,
    detailsVisibleHeight,
  } = deps;

  const nav = useKeyboardNav(itemCount);
  const cancelFlow = useCancelFlow();
  const shutdown = useGracefulShutdown();
  const toggleAll = useToggleAll();

  const [mode, setMode] = useState<DashboardMode>("normal");
  const [filterInput, setFilterInput] = useState("");
  const [verbosity, setVerbosity] = useState(initialVerbosity);
  const [focusedPanel, setFocusedPanel] = useState<FocusedPanel>("epics");
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("all");
  const [showBlocked, setShowBlocked] = useState(true);
  const [logScrollOffset, setLogScrollOffset] = useState(0);
  const [logAutoFollow, setLogAutoFollow] = useState(true);
  const [detailsScrollOffset, setDetailsScrollOffset] = useState(0);

  const handleInput = useCallback(
    (input: string, key: Key) => {
      // Priority 1: shutting down — ignore everything
      if (shutdown.isShuttingDown) return;

      // Priority 2: cancel confirmation modal
      if (mode === "confirm") {
        cancelFlow.handleConfirmInput(input, key, onCancelEpic);
        // Return to normal mode when the user responds
        if (
          input === "y" ||
          input === "Y" ||
          input === "n" ||
          input === "N" ||
          key.escape
        ) {
          setMode("normal");
        }
        return;
      }

      // Priority 3: filter mode
      if (mode === "filter") {
        if (key.return) {
          onFilterApply(filterInput);
          setMode("normal");
          return;
        }
        if (key.escape) {
          onFilterClear();
          setFilterInput("");
          setMode("normal");
          return;
        }
        if (key.backspace || key.delete) {
          setFilterInput((prev) => prev.slice(0, -1));
          return;
        }
        // Regular character input (not control keys)
        if (input && !key.ctrl && !key.meta && !key.upArrow && !key.downArrow) {
          setFilterInput((prev) => prev + input);
        }
        return;
      }

      // --- Normal mode below ---

      // Priority 4: shutdown keys (q, Q, Ctrl+C)
      shutdown.handleShutdownInput(input, key, onShutdown);
      if (input === "q" || input === "Q" || (input === "c" && key.ctrl)) return;

      // Priority 5: Tab — toggle focus panel
      if (key.tab) {
        setFocusedPanel((prev) => (prev === "epics" ? "log" : "epics"));
        return;
      }

      // Priority 6: arrow key navigation — routed by focused panel
      if (key.upArrow || key.downArrow) {
        if (focusedPanel === "epics") {
          nav.handleNavInput(key);
        } else {
          // Log panel scroll
          if (key.upArrow) {
            setLogAutoFollow(false);
            setLogScrollOffset((prev) => Math.max(0, prev - 1));
          } else {
            setLogScrollOffset((prev) => Math.min(Math.max(0, logTotalLines - 1), prev + 1));
          }
        }
        return;
      }

      // Priority 7: toggle all
      if (input === "a" || input === "A") {
        toggleAll.handleToggleInput(input);
        return;
      }

      // Priority 8: phase filter cycling
      if (input === "p" || input === "P") {
        setPhaseFilter((prev) => cyclePhaseFilter(prev));
        return;
      }

      // Priority 9: blocked toggle
      if (input === "b" || input === "B") {
        setShowBlocked((prev) => !prev);
        return;
      }

      // Priority 10: cancel initiation (not on "(all)" row — index 0)
      if (input === "x" || input === "X") {
        if (nav.selectedIndex > 0) {
          const slug = slugAtIndex(nav.selectedIndex);
          if (slug) {
            cancelFlow.requestCancel(slug);
            setMode("confirm");
          }
        }
        return;
      }

      // Priority 11: enter filter mode
      if (input === "/") {
        setFilterInput("");
        setMode("filter");
        return;
      }

      // Priority 12: verbosity cycling
      if (input === "v" || input === "V") {
        setVerbosity((prev) => cycleVerbosity(prev));
        return;
      }

      // Priority 13: PgUp — details panel scroll up
      if (key.pageUp) {
        setDetailsScrollOffset((prev) => Math.max(0, prev - detailsVisibleHeight));
        return;
      }

      // Priority 14: PgDn — details panel scroll down
      if (key.pageDown) {
        setDetailsScrollOffset((prev) => {
          const maxOffset = Math.max(0, detailsContentHeight - detailsVisibleHeight);
          return Math.min(maxOffset, prev + detailsVisibleHeight);
        });
        return;
      }

      // Priority 15: 'G'/End — resume log auto-follow
      if (input === "G" || key.end) {
        setLogAutoFollow(true);
        setLogScrollOffset(Math.max(0, logTotalLines - 1));
        return;
      }
    },
    [
      shutdown.isShuttingDown,
      mode,
      filterInput,
      verbosity,
      focusedPanel,
      phaseFilter,
      showBlocked,
      logScrollOffset,
      logAutoFollow,
      detailsScrollOffset,
      logTotalLines,
      detailsContentHeight,
      detailsVisibleHeight,
      cancelFlow,
      shutdown,
      nav,
      toggleAll,
      onCancelEpic,
      onShutdown,
      slugAtIndex,
      onFilterApply,
      onFilterClear,
    ],
  );

  // Wire up useInput — disabled during shutdown
  useInput(handleInput, { isActive: !shutdown.isShuttingDown });

  return {
    nav,
    cancelFlow,
    shutdown,
    toggleAll,
    mode,
    filterInput,
    verbosity,
    focusedPanel,
    phaseFilter,
    showBlocked,
    logScrollOffset,
    logAutoFollow,
    detailsScrollOffset,
  };
}
