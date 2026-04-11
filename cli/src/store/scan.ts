/**
 * Store-based epic scan — replaces manifest/store.listEnriched().
 *
 * Lists all epics from the store, derives nextAction from dispatch
 * type logic (matching the XState machine state metadata), and returns
 * EnrichedEpic[] for consumption by watch loop and dashboard.
 */

import type { TaskStore, Epic, Feature, EnrichedEpic, NextAction } from "./types.js";

/** Dispatch type per phase — matches epicMachine state metadata. */
const DISPATCH_TYPE: Record<string, "single" | "fan-out" | "skip"> = {
  design: "skip",
  plan: "single",
  implement: "fan-out",
  validate: "single",
  release: "single",
  done: "skip",
  cancelled: "skip",
};

/** Terminal statuses — sorted below active epics. */
const TERMINAL_STATUSES = new Set(["done", "cancelled"]);

/**
 * Compare two epics for sorting:
 * 1. Active epics before terminal (done/cancelled)
 * 2. Within each group, newest first by created_at
 */
export function compareEpics(a: Epic, b: Epic): number {
  const aTerminal = TERMINAL_STATUSES.has(a.status) ? 1 : 0;
  const bTerminal = TERMINAL_STATUSES.has(b.status) ? 1 : 0;
  if (aTerminal !== bTerminal) return aTerminal - bTerminal;
  // Descending by created_at (newest first) — ISO 8601 strings compare lexicographically
  return b.created_at.localeCompare(a.created_at);
}

/**
 * Derive next action from an epic and its features.
 * Pure function — no filesystem, no XState actor hydration needed
 * because the dispatch type is a static property of the phase.
 */
function deriveNextAction(epic: Epic, features: Feature[]): NextAction | null {
  const dt = DISPATCH_TYPE[epic.status];
  if (!dt || dt === "skip") return null;

  if (dt === "fan-out") {
    const incompleteFeatures = features.filter(
      (f) => f.status === "pending" || f.status === "in-progress" || f.status === "blocked",
    );
    if (incompleteFeatures.length === 0) return null;

    // Wave-aware filtering: use stored wave (set during plan reconciliation)
    const featureWaves = incompleteFeatures.map((f) => ({
      feature: f,
      wave: f.wave ?? 1,
    }));

    const lowestWave = Math.min(...featureWaves.map((fw) => fw.wave));
    const lowestWaveFeatures = featureWaves
      .filter((fw) => fw.wave === lowestWave)
      .map((fw) => fw.feature);

    // Only dispatch pending/in-progress features (not blocked)
    const dispatchable = lowestWaveFeatures
      .filter((f) => f.status === "pending" || f.status === "in-progress")
      .map((f) => f.slug);

    if (dispatchable.length === 0) return null;

    return {
      phase: epic.status,
      args: [epic.slug],
      type: "fan-out",
      features: dispatchable,
    };
  }

  return {
    phase: epic.status,
    args: [epic.slug],
    type: "single",
  };
}

/**
 * List all epics enriched with nextAction from the store.
 * Single store read — no manifest files consulted.
 */
export function listEnrichedFromStore(store: TaskStore): EnrichedEpic[] {
  const epics = store.listEpics();

  const enriched = epics.map((epic) => {
    const features = store.listFeatures(epic.id);
    const nextAction = deriveNextAction(epic, features);

    return {
      ...epic,
      nextAction,
      features,
    };
  });

  return enriched.sort(compareEpics);
}
