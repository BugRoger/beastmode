/**
 * Shared spinner module -- single source of truth for spinner frames,
 * tick interval, tick hook, and phase-based activation logic.
 *
 * Consumers: EpicsPanel, TreeView.
 */

import { useState, useEffect } from "react";

/** Forward-only epic spinner frames (5 frames, 600ms full rotation at 120ms tick). */
export const EPIC_SPINNER = ["○", "◔", "◑", "◕", "●"];

/** Forward-only feature spinner frames (3 frames, 360ms full rotation at 120ms tick). */
export const FEATURE_SPINNER = ["◉", "◎", "○"];

/** Tick interval in milliseconds. */
export const SPINNER_INTERVAL_MS = 120;

/**
 * React hook that returns a monotonically incrementing tick counter.
 * Consumers index into frame arrays with `frames[tick % frames.length]`.
 */
export function useSpinnerTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, SPINNER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);
  return tick;
}

/** Returns true for statuses representing active work. */
export function isActive(status: string): boolean {
  return (
    status === "in-progress" ||
    status === "implement" ||
    status === "design" ||
    status === "plan" ||
    status === "validate" ||
    status === "release"
  );
}
