/**
 * useKeyboardController — single useInput handler that delegates to all
 * keyboard hooks based on modal state.
 *
 * Priority:
 * 1. If shutting down → ignore all input
 * 2. If cancel flow is modal → delegate to cancel confirmation only
 * 3. Otherwise → shutdown check, then navigation, toggle, cancel-initiate
 */

import { useCallback } from "react";
import { useInput } from "ink";
import type { Key } from "ink";
import { useKeyboardNav } from "./use-keyboard-nav.js";
import { useCancelFlow } from "./use-cancel-flow.js";
import { useGracefulShutdown } from "./use-graceful-shutdown.js";
import { useToggleAll } from "./use-toggle-all.js";
import type { KeyboardNavState } from "./use-keyboard-nav.js";
import type { CancelFlowResult } from "./use-cancel-flow.js";
import type { GracefulShutdownState } from "./use-graceful-shutdown.js";
import type { ToggleAllState } from "./use-toggle-all.js";
import type { ViewType } from "../view-stack.js";

export interface KeyboardControllerDeps {
  /** Number of visible epic rows (for navigation bounds) */
  itemCount: number;
  /** Callback to cancel an epic by slug */
  onCancelEpic: (slug: string) => Promise<void>;
  /** Callback to initiate graceful shutdown */
  onShutdown: () => Promise<void>;
  /** Resolve the epic slug at a given row index */
  slugAtIndex: (index: number) => string | undefined;
  /** Current active view type from the view stack */
  activeViewType: ViewType["type"];
  /** Callback to push a drill-down view (Enter) */
  onDrillDown: () => void;
  /** Callback to pop back one level (Escape) */
  onDrillUp: () => void;
  /** Callback to toggle follow mode in agent log (f key) */
  onToggleFollow?: () => void;
}

export interface KeyboardControllerState {
  /** Navigation state */
  nav: KeyboardNavState;
  /** Cancel flow state */
  cancelFlow: CancelFlowResult;
  /** Shutdown state */
  shutdown: GracefulShutdownState;
  /** Toggle all (done/cancelled visibility) state */
  toggleAll: ToggleAllState;
}

export function useKeyboardController(
  deps: KeyboardControllerDeps,
): KeyboardControllerState {
  const { itemCount, onCancelEpic, onShutdown, slugAtIndex, activeViewType, onDrillDown, onDrillUp, onToggleFollow } = deps;

  const nav = useKeyboardNav(itemCount);
  const cancelFlow = useCancelFlow();
  const shutdown = useGracefulShutdown();
  const toggleAll = useToggleAll();

  const handleInput = useCallback(
    (input: string, key: Key) => {
      // Priority 1: shutting down — ignore everything
      if (shutdown.isShuttingDown) return;

      // Priority 2: cancel modal — only accept y/n/Escape
      if (cancelFlow.isModal) {
        cancelFlow.handleConfirmInput(input, key, onCancelEpic);
        return;
      }

      // Priority 3: check for shutdown keys (q, Ctrl+C)
      shutdown.handleShutdownInput(input, key, onShutdown);
      if (input === "q" || input === "Q" || (input === "c" && key.ctrl)) return;

      // Priority 4: arrow key navigation
      if (key.upArrow || key.downArrow) {
        nav.handleNavInput(key);
        return;
      }

      // Priority 4.5: Enter → drill down (only in epic-list and feature-list)
      if (key.return) {
        if (activeViewType === "epic-list" || activeViewType === "feature-list") {
          onDrillDown();
        }
        return;
      }

      // Priority 4.6: Escape → drill up (only in feature-list and agent-log)
      if (key.escape) {
        if (activeViewType === "feature-list" || activeViewType === "agent-log") {
          onDrillUp();
        }
        return;
      }

      // Priority 4.7: 'f' → toggle follow (only in agent-log)
      if ((input === "f" || input === "F") && activeViewType === "agent-log") {
        onToggleFollow?.();
        return;
      }

      // Priority 5: toggle all (epic-list only)
      if ((input === "a" || input === "A") && activeViewType === "epic-list") {
        toggleAll.handleToggleInput(input);
        return;
      }

      // Priority 6: cancel initiation (epic-list only)
      if ((input === "x" || input === "X") && activeViewType === "epic-list") {
        const slug = slugAtIndex(nav.selectedIndex);
        if (slug) {
          cancelFlow.requestCancel(slug);
        }
        return;
      }
    },
    [
      shutdown.isShuttingDown,
      cancelFlow.isModal,
      cancelFlow,
      shutdown,
      nav,
      toggleAll,
      onCancelEpic,
      onShutdown,
      slugAtIndex,
      activeViewType,
      onDrillDown,
      onDrillUp,
      onToggleFollow,
    ],
  );

  // Wire up useInput — disabled during shutdown
  useInput(handleInput, { isActive: !shutdown.isShuttingDown });

  return { nav, cancelFlow, shutdown, toggleAll };
}
