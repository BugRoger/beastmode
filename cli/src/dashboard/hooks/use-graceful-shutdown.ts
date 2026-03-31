/**
 * useGracefulShutdown — handles 'q' and Ctrl+C for graceful exit.
 *
 * Calls a shutdown callback (e.g., loop.stop()) and tracks the shutting-down
 * state so the UI can show "shutting down..." feedback.
 */

import { useState, useCallback, useRef } from "react";

export interface GracefulShutdownState {
  /** Whether shutdown has been initiated */
  isShuttingDown: boolean;
  /** Handle key input — triggers shutdown on 'q' or Ctrl+C */
  handleShutdownInput: (
    input: string,
    key: { ctrl: boolean },
    onShutdown: () => Promise<void>,
  ) => void;
}

export function useGracefulShutdown(): GracefulShutdownState {
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const initiatedRef = useRef(false);

  const handleShutdownInput = useCallback(
    (
      input: string,
      key: { ctrl: boolean },
      onShutdown: () => Promise<void>,
    ) => {
      // Prevent double-initiation
      if (initiatedRef.current) return;

      const isQuit = input === "q" || input === "Q";
      const isCtrlC = input === "c" && key.ctrl;

      if (isQuit || isCtrlC) {
        initiatedRef.current = true;
        setIsShuttingDown(true);
        onShutdown().catch(() => {
          // Shutdown errors are non-fatal — process will exit regardless
        });
      }
    },
    [],
  );

  return { isShuttingDown, handleShutdownInput };
}
