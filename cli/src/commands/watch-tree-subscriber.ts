import type { WatchLoop } from "./watch-loop.js";
import type { TreeState } from "../tree-view/types.js";
import { addEntry, openPhase, closePhase } from "../tree-view/tree-state.js";

/**
 * Attach a tree-state subscriber to the WatchLoop.
 *
 * Mirrors attachLoggerSubscriber but routes events to tree state mutations
 * instead of logger calls. The notify callback triggers Ink re-renders.
 */
export function attachTreeSubscriber(
  loop: WatchLoop,
  state: TreeState,
  notify: () => void,
): void {
  loop.on("started", ({ version, pid, intervalSeconds }) => {
    addEntry(state, "info", {}, `Started ${version} (PID ${pid}, poll every ${intervalSeconds}s)`);
    notify();
  });

  loop.on("stopped", () => {
    addEntry(state, "info", {}, "Stopped.");
    notify();
  });

  loop.on("session-started", ({ epicSlug, featureSlug, phase }) => {
    openPhase(state, epicSlug, phase);
    if (featureSlug) {
      addEntry(state, "info", { epic: epicSlug, phase, feature: featureSlug }, "dispatching");
    } else {
      addEntry(state, "info", { epic: epicSlug, phase }, "dispatching");
    }
    notify();
  });

  loop.on("session-completed", ({ epicSlug, featureSlug, phase, success, durationMs, costUsd }) => {
    const status = success ? "completed" : "failed";
    const dur = `${(durationMs / 1000).toFixed(0)}s`;
    const detail = costUsd != null ? `$${costUsd.toFixed(2)}, ${dur}` : dur;
    const level = success ? "info" as const : "error" as const;
    const context = featureSlug
      ? { epic: epicSlug, phase, feature: featureSlug }
      : { epic: epicSlug, phase };
    addEntry(state, level, context, `${status} (${detail})`);
    if (!success) {
      closePhase(state, epicSlug, phase);
    }
    notify();
  });

  loop.on("error", ({ epicSlug, message }) => {
    if (epicSlug) {
      addEntry(state, "error", { epic: epicSlug }, message);
    } else {
      addEntry(state, "error", {}, message);
    }
    notify();
  });

  loop.on("release:held", ({ waitingSlug, blockingSlug }) => {
    addEntry(state, "info", { epic: waitingSlug }, `release held: blocked by ${blockingSlug}`);
    notify();
  });
}
