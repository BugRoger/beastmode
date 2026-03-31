/**
 * useCancelFlow — inline confirmation state machine for epic cancellation.
 *
 * States: idle → confirming(slug) → executing → idle
 * While confirming, other keybindings should be suppressed (caller checks isModal).
 */

import { useState, useCallback } from "react";

export type CancelFlowState =
  | { phase: "idle" }
  | { phase: "confirming"; slug: string }
  | { phase: "executing"; slug: string };

export interface CancelFlowResult {
  /** Current state of the cancel flow */
  state: CancelFlowState;
  /** Whether the cancel flow is in a modal state (confirming or executing) */
  isModal: boolean;
  /** Initiate cancellation for a slug — transitions idle → confirming */
  requestCancel: (slug: string) => void;
  /** Handle confirmation input — 'y' confirms, 'n'/Escape dismisses */
  handleConfirmInput: (
    input: string,
    key: { escape: boolean },
    onConfirm: (slug: string) => Promise<void>,
  ) => void;
  /** Reset back to idle (e.g., after execution completes or on error) */
  reset: () => void;
}

export function useCancelFlow(): CancelFlowResult {
  const [state, setState] = useState<CancelFlowState>({ phase: "idle" });

  const isModal = state.phase === "confirming" || state.phase === "executing";

  const requestCancel = useCallback((slug: string) => {
    setState({ phase: "confirming", slug });
  }, []);

  const handleConfirmInput = useCallback(
    (
      input: string,
      key: { escape: boolean },
      onConfirm: (slug: string) => Promise<void>,
    ) => {
      if (state.phase !== "confirming") return;

      if (input === "y" || input === "Y") {
        const { slug } = state;
        setState({ phase: "executing", slug });
        onConfirm(slug).finally(() => {
          setState({ phase: "idle" });
        });
      } else if (input === "n" || input === "N" || key.escape) {
        setState({ phase: "idle" });
      }
      // All other input is swallowed while confirming
    },
    [state],
  );

  const reset = useCallback(() => {
    setState({ phase: "idle" });
  }, []);

  return { state, isModal, requestCancel, handleConfirmInput, reset };
}
