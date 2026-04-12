/**
 * Countdown state machine for the dashboard heartbeat timer.
 *
 * Pure functions for state transitions + a React hook that wires
 * them to WatchLoop events and a 1-second decrement interval.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { WatchLoop } from "../commands/watch-loop.js";

export interface CountdownState {
  mode: "counting" | "scanning" | "stopped";
  secondsRemaining: number;
  intervalSeconds: number;
}

export function createCountdownState(intervalSeconds: number): CountdownState {
  return { mode: "stopped", secondsRemaining: 0, intervalSeconds };
}

export function handleStarted(state: CountdownState, intervalSeconds: number): CountdownState {
  return { mode: "counting", secondsRemaining: intervalSeconds, intervalSeconds };
}

export function handleScanStarted(state: CountdownState): CountdownState {
  return { ...state, mode: "scanning" };
}

export function handleScanComplete(state: CountdownState, trigger: "poll" | "event"): CountdownState {
  if (trigger === "poll") {
    return { ...state, mode: "counting", secondsRemaining: state.intervalSeconds };
  }
  // Event-triggered: no change
  return state;
}

export function handleStopped(state: CountdownState): CountdownState {
  return { ...state, mode: "stopped", secondsRemaining: 0 };
}

export function decrementCountdown(state: CountdownState): CountdownState {
  if (state.mode !== "counting") return state;
  return { ...state, secondsRemaining: Math.max(0, state.secondsRemaining - 1) };
}

export function formatCountdown(state: CountdownState): string {
  switch (state.mode) {
    case "counting":
      return `${state.secondsRemaining}s`;
    case "scanning":
      return "scanning...";
    case "stopped":
      return `stopped (${state.intervalSeconds}s)`;
  }
}

export function isCountdownRunning(state: CountdownState): boolean {
  return state.mode !== "stopped";
}

/**
 * React hook that manages countdown state from WatchLoop events.
 */
export function useCountdown(loop: WatchLoop | undefined, intervalSeconds: number) {
  const [state, setState] = useState<CountdownState>(() => createCountdownState(intervalSeconds));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      setState((prev) => decrementCountdown(prev));
    }, 1000);
  }, [clearTimer]);

  useEffect(() => {
    if (!loop) return;

    const onStarted = (ev: { intervalSeconds: number }) => {
      setState((prev) => handleStarted(prev, ev.intervalSeconds));
      startTimer();
    };
    const onScanStarted = () => {
      setState((prev) => handleScanStarted(prev));
      clearTimer();
    };
    const onScanComplete = (ev: { trigger: "poll" | "event" }) => {
      setState((prev) => {
        const next = handleScanComplete(prev, ev.trigger);
        return next;
      });
      // Restart timer if we transitioned back to counting from a poll
      if (ev.trigger === "poll") {
        startTimer();
      }
    };
    const onStopped = () => {
      setState((prev) => handleStopped(prev));
      clearTimer();
    };

    loop.on("started", onStarted);
    loop.on("scan-started", onScanStarted);
    loop.on("scan-complete", onScanComplete);
    loop.on("stopped", onStopped);

    return () => {
      loop.off("started", onStarted);
      loop.off("scan-started", onScanStarted);
      loop.off("scan-complete", onScanComplete);
      loop.off("stopped", onStopped);
      clearTimer();
    };
  }, [loop, startTimer, clearTimer]);

  return {
    state,
    display: formatCountdown(state),
    isRunning: isCountdownRunning(state),
  };
}
