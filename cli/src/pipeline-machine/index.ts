import { createActor } from "xstate";
import { epicMachine } from "./epic";
import type { EpicContext } from "./types";

// ── Machines ───────────────────────────────────────────────────

export { epicMachine } from "./epic";
export { featureMachine } from "./feature";

// ── Types ──────────────────────────────────────────────────────

export type { EpicContext, EpicEvent, FeatureContext, FeatureEvent, DispatchType } from "./types";
export type { SyncGitHubResult } from "./services";

// ── Action overrides ──────────────────────────────────────────

/** Overridable action implementations injected at actor creation. */
export interface EpicActions {
  persist?: ({ context }: { context: EpicContext }) => void;
}

// ── Actor factories ────────────────────────────────────────────

/**
 * Create and start an epic actor from initial context.
 * Pass `actions` to inject real implementations for side-effect stubs.
 */
export function createEpicActor(context: EpicContext, actions?: EpicActions) {
  const machine = actions
    ? epicMachine.provide({ actions })
    : epicMachine;
  const actor = createActor(machine, { input: context });
  actor.start();
  return actor;
}

/**
 * Restore an epic actor from a persisted snapshot.
 * Pass `actions` to inject real implementations for side-effect stubs.
 */
export function loadEpic(snapshot: any, context: EpicContext, actions?: EpicActions) {
  const machine = actions
    ? epicMachine.provide({ actions })
    : epicMachine;
  const actor = createActor(machine, { snapshot, input: context });
  actor.start();
  return actor;
}

// ── Event type constants ───────────────────────────────────────

export const EPIC_EVENTS = {
  DESIGN_COMPLETED: "DESIGN_COMPLETED",
  PLAN_COMPLETED: "PLAN_COMPLETED",
  FEATURE_COMPLETED: "FEATURE_COMPLETED",
  IMPLEMENT_COMPLETED: "IMPLEMENT_COMPLETED",
  VALIDATE_COMPLETED: "VALIDATE_COMPLETED",
  VALIDATE_FAILED: "VALIDATE_FAILED",
  RELEASE_COMPLETED: "RELEASE_COMPLETED",
  CANCEL: "CANCEL",
} as const;

export const FEATURE_EVENTS = {
  START: "START",
  COMPLETE: "COMPLETE",
  BLOCK: "BLOCK",
  UNBLOCK: "UNBLOCK",
  RESET: "RESET",
} as const;
