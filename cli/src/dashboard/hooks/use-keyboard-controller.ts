/**
 * useKeyboardController — Drill-down keyboard handler for dashboard.
 *
 * Legacy hook maintaining backward compatibility with the drill-down view model.
 * Combines keyboard navigation with drill-down actions (up/down/enter).
 */

import { useCallback } from "react";
import { useInput } from "ink";
import type { Key } from "ink";
import { useKeyboardNav } from "./use-keyboard-nav.js";
import { useCancelFlow } from "./use-cancel-flow.js";
import { useGracefulShutdown } from "./use-graceful-shutdown.js";
import { useToggleAll } from "./use-toggle-all.js";

export interface UseKeyboardControllerOptions {
  itemCount: number;
  onCancelEpic: (slug: string) => Promise<void>;
  onShutdown: () => Promise<void>;
  slugAtIndex: (index: number) => string | undefined;
  activeViewType: string;
  onDrillDown: () => void;
  onDrillUp: () => void;
  onToggleFollow: () => void;
}

export interface UseKeyboardControllerResult {
  nav: ReturnType<typeof useKeyboardNav>;
  cancelFlow: ReturnType<typeof useCancelFlow>;
  shutdown: ReturnType<typeof useGracefulShutdown>;
  toggleAll: ReturnType<typeof useToggleAll>;
}

export function useKeyboardController(
  options: UseKeyboardControllerOptions,
): UseKeyboardControllerResult {
  const {
    itemCount,
    onCancelEpic,
    onShutdown,
    slugAtIndex,
    activeViewType,
    onDrillDown,
    onDrillUp,
    onToggleFollow,
  } = options;

  const nav = useKeyboardNav(itemCount);
  const cancelFlow = useCancelFlow();
  const shutdown = useGracefulShutdown();
  const toggleAll = useToggleAll();

  const handleInput = useCallback(
    (input: string, key: Key) => {
      // Ignore if shutting down
      if (shutdown.isShuttingDown) return;

      // Cancel confirmation
      if (cancelFlow.state.phase === "confirming") {
        cancelFlow.handleConfirmInput(input, key, onCancelEpic);
        return;
      }

      // Shutdown keys
      if (input === "q" || input === "Q" || (input === "c" && key.ctrl)) {
        shutdown.handleShutdownInput(input, key, onShutdown);
        return;
      }

      // Arrow navigation
      if (key.upArrow || key.downArrow) {
        nav.handleNavInput(key);
        return;
      }

      // Toggle all (done/cancelled visibility)
      if (input === "a" || input === "A") {
        toggleAll.handleToggleInput(input);
        return;
      }

      // Cancel initiation (only on epic-list, not on feature-list or agent-log)
      if (input === "x" || input === "X") {
        if (activeViewType === "epic-list" && nav.selectedIndex > 0) {
          const slug = slugAtIndex(nav.selectedIndex);
          if (slug) {
            cancelFlow.requestCancel(slug);
          }
        }
        return;
      }

      // Drill down (Enter on epic-list or feature-list)
      if (key.return && (activeViewType === "epic-list" || activeViewType === "feature-list")) {
        onDrillDown();
        return;
      }

      // Drill up (Escape or Backspace)
      if (key.escape || key.backspace) {
        onDrillUp();
        return;
      }

      // Toggle follow mode (space on agent-log)
      if (input === " " && activeViewType === "agent-log") {
        onToggleFollow();
        return;
      }
    },
    [
      shutdown.isShuttingDown,
      shutdown,
      cancelFlow,
      nav,
      toggleAll,
      activeViewType,
      onCancelEpic,
      onShutdown,
      slugAtIndex,
      onDrillDown,
      onDrillUp,
      onToggleFollow,
    ],
  );

  // Wire up useInput — disabled during shutdown
  useInput(handleInput, { isActive: !shutdown.isShuttingDown });

  return { nav, cancelFlow, shutdown, toggleAll };
}
