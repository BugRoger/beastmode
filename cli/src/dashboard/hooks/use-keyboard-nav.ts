/**
 * useKeyboardNav — arrow key navigation for epic row selection.
 *
 * Manages a selectedIndex state that tracks which epic row is highlighted.
 * Arrow keys move the selection. Boundary behavior: clamp (not wrap).
 */

import { useState, useCallback } from "react";

export interface KeyboardNavState {
  /** Currently selected row index (0-based) */
  selectedIndex: number;
  /** Manually set the selected index (e.g., after list changes) */
  setSelectedIndex: (index: number) => void;
  /** Handle arrow key input — call from a useInput handler */
  handleNavInput: (key: { upArrow: boolean; downArrow: boolean }) => void;
  /** Clamp selected index to valid range after list size changes */
  clampToRange: (itemCount: number) => void;
}

export function useKeyboardNav(itemCount: number): KeyboardNavState {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleNavInput = useCallback(
    (key: { upArrow: boolean; downArrow: boolean }) => {
      if (key.upArrow) {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedIndex((prev) => Math.min(itemCount - 1, prev + 1));
      }
    },
    [itemCount],
  );

  const clampToRange = useCallback(
    (count: number) => {
      setSelectedIndex((prev) => Math.min(Math.max(0, prev), Math.max(0, count - 1)));
    },
    [],
  );

  return { selectedIndex, setSelectedIndex, handleNavInput, clampToRange };
}
