import type { EpicContext, EpicEvent } from "./types";
import type { Phase } from "../types";

/**
 * Guard: plan -> implement only if output contains features.
 * Checks the PLAN_COMPLETED event payload for non-empty features list.
 */
export const hasFeatures = ({ event }: { context: EpicContext; event: EpicEvent }) => {
  if (event.type === "PLAN_COMPLETED") {
    return Array.isArray(event.features) && event.features.length > 0;
  }
  return false;
};

/**
 * Guard: implement -> validate only if every feature status is "completed".
 */
export const allFeaturesCompleted = ({ context }: { context: EpicContext }) => {
  return context.features.length > 0 && context.features.every((f) => f.status === "completed");
};

/**
 * Guard: validate -> release and release -> done only if output.status === "completed".
 * Since XState guards don't have access to external output, this checks the event type.
 * VALIDATE_COMPLETED and RELEASE_COMPLETED events are only sent when output.status === "completed".
 */
export const outputCompleted = ({ event }: { context: EpicContext; event: EpicEvent }) => {
  return event.type === "VALIDATE_COMPLETED" || event.type === "RELEASE_COMPLETED";
};

/**
 * Phase ordering for regression comparison.
 * Only linear pipeline phases — terminal states excluded.
 */
const PHASE_ORDER: readonly Phase[] = ["design", "plan", "implement", "validate", "release"];

/**
 * Guard: REGRESS is valid only if targetPhase != "design" and is a known phase.
 *
 * Direction checking (no forward jumps) is handled by the machine structure:
 * each state only lists REGRESS transitions for phases <= itself.
 * This guard serves as the catch-all for same-phase rerun (last entry in each
 * state's REGRESS array).
 *
 * We cannot rely on context.phase for direction — the happy-path transitions
 * don't update context.phase, so it stays at the initial value.
 */
export const canRegress = ({ event }: { context: EpicContext; event: EpicEvent }) => {
  if (event.type !== "REGRESS") return false;
  const { targetPhase } = event;
  if (targetPhase === "design") return false;
  return PHASE_ORDER.indexOf(targetPhase) > 0;
};

/** Guard: REGRESS targets the "plan" phase specifically. */
export const regressTargetsPlan = ({ event }: { context: EpicContext; event: EpicEvent }) =>
  event.type === "REGRESS" && event.targetPhase === "plan";

/** Guard: REGRESS targets the "implement" phase specifically. */
export const regressTargetsImplement = ({ event }: { context: EpicContext; event: EpicEvent }) =>
  event.type === "REGRESS" && event.targetPhase === "implement";

/** Guard: REGRESS targets the "validate" phase specifically. */
export const regressTargetsValidate = ({ event }: { context: EpicContext; event: EpicEvent }) =>
  event.type === "REGRESS" && event.targetPhase === "validate";

/** Guard: REGRESS_FEATURES targets the "release" phase specifically. */
export const regressTargetsRelease = ({ event }: { context: EpicContext; event: EpicEvent }) =>
  event.type === "REGRESS" && event.targetPhase === "release";

/** Guard: REGRESS_FEATURES is valid only if failingFeatures is non-empty. */
export const hasFailingFeatures = ({ event }: { context: EpicContext; event: EpicEvent }) => {
  if (event.type !== "REGRESS_FEATURES") return false;
  return Array.isArray(event.failingFeatures) && event.failingFeatures.length > 0;
};
