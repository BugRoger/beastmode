import { setup } from "xstate";
import type { FeatureContext, FeatureEvent, DispatchType } from "./types";

export const featureMachine = setup({
  types: {
    context: {} as FeatureContext,
    events: {} as FeatureEvent,
    input: {} as FeatureContext,
  },
}).createMachine({
  id: "feature",
  initial: "pending",
  context: ({ input }) => input,
  states: {
    pending: {
      meta: { dispatchType: "skip" as DispatchType },
      on: {
        START: { target: "in-progress" },
        RESET: { target: "pending" },
      },
    },
    "in-progress": {
      meta: { dispatchType: "skip" as DispatchType },
      on: {
        COMPLETE: { target: "completed" },
        BLOCK: { target: "blocked" },
        RESET: { target: "pending" },
      },
    },
    completed: {
      meta: { dispatchType: "skip" as DispatchType },
      type: "final",
    },
    blocked: {
      meta: { dispatchType: "skip" as DispatchType },
      on: {
        UNBLOCK: { target: "in-progress" },
        RESET: { target: "pending" },
      },
    },
  },
});
