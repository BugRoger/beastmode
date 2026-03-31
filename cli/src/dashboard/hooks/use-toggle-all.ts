/**
 * useToggleAll — toggles visibility of done/cancelled epics.
 *
 * Mirrors the `--all` flag behavior from the status command.
 * Pressing 'a' toggles the showAll boolean.
 */

import { useState, useCallback } from "react";

export interface ToggleAllState {
  /** Whether done/cancelled epics are visible */
  showAll: boolean;
  /** Handle key input — toggles on 'a' */
  handleToggleInput: (input: string) => void;
}

export function useToggleAll(initial = false): ToggleAllState {
  const [showAll, setShowAll] = useState(initial);

  const handleToggleInput = useCallback((input: string) => {
    if (input === "a" || input === "A") {
      setShowAll((prev) => !prev);
    }
  }, []);

  return { showAll, handleToggleInput };
}
