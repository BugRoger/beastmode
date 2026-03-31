import type { EpicContext, EpicEvent } from "./types";

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
