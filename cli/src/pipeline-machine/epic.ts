import { setup, assign } from "xstate";
import type { EpicContext, EpicEvent, DispatchType } from "./types";
import { hasFeatures, allFeaturesCompleted, outputCompleted } from "./guards";
import {
  computeEnrichFeatures,
  computeRenameSlug,
  computeSetFeatures,
  computeResetFeatures,
  computeMarkFeatureCompleted,
} from "./actions";
import { syncGitHubService } from "./services";

export const epicMachine = setup({
  types: {
    context: {} as EpicContext,
    events: {} as EpicEvent,
    input: {} as EpicContext,
  },
  guards: {
    hasFeatures,
    allFeaturesCompleted,
    outputCompleted,
  },
  actions: {
    enrichManifest: assign({
      features: ({ context, event }) => computeEnrichFeatures(context, event),
      lastUpdated: () => new Date().toISOString(),
    }),
    renameSlug: assign({
      slug: ({ context, event }) => computeRenameSlug(context, event),
      lastUpdated: () => new Date().toISOString(),
    }),
    setFeatures: assign({
      features: ({ event }) => computeSetFeatures(event),
      lastUpdated: () => new Date().toISOString(),
    }),
    resetFeatures: assign({
      features: ({ context }) => computeResetFeatures(context),
      lastUpdated: () => new Date().toISOString(),
    }),
    markCancelled: assign({
      blocked: () => null as EpicContext["blocked"],
      lastUpdated: () => new Date().toISOString(),
    }),
    markFeatureCompleted: assign({
      features: ({ context, event }) => computeMarkFeatureCompleted(context, event),
      lastUpdated: () => new Date().toISOString(),
    }),
    persist: () => {
      // Side-effect stub — consumer provides real implementation
    },
  },
  actors: {
    syncGitHub: syncGitHubService,
  },
}).createMachine({
  id: "epic",
  initial: "design",
  context: ({ input }) => input,
  states: {
    design: {
      meta: { dispatchType: "single" as DispatchType },
      on: {
        DESIGN_COMPLETED: {
          target: "plan",
          actions: ["renameSlug", "persist"],
        },
        CANCEL: {
          target: "cancelled",
          actions: ["markCancelled", "persist"],
        },
      },
    },
    plan: {
      meta: { dispatchType: "single" as DispatchType },
      on: {
        PLAN_COMPLETED: {
          target: "implement",
          guard: "hasFeatures",
          actions: ["setFeatures", "persist"],
        },
        CANCEL: {
          target: "cancelled",
          actions: ["markCancelled", "persist"],
        },
      },
    },
    implement: {
      meta: { dispatchType: "fan-out" as DispatchType },
      on: {
        FEATURE_COMPLETED: {
          actions: ["markFeatureCompleted", "persist"],
        },
        IMPLEMENT_COMPLETED: {
          target: "validate",
          guard: "allFeaturesCompleted",
          actions: ["persist"],
        },
        CANCEL: {
          target: "cancelled",
          actions: ["markCancelled", "persist"],
        },
      },
    },
    validate: {
      meta: { dispatchType: "single" as DispatchType },
      on: {
        VALIDATE_COMPLETED: {
          target: "release",
          actions: ["persist"],
        },
        VALIDATE_FAILED: {
          target: "implement",
          actions: ["resetFeatures", "persist"],
        },
        CANCEL: {
          target: "cancelled",
          actions: ["markCancelled", "persist"],
        },
      },
    },
    release: {
      meta: { dispatchType: "single" as DispatchType },
      on: {
        RELEASE_COMPLETED: {
          target: "done",
          actions: ["persist"],
        },
        CANCEL: {
          target: "cancelled",
          actions: ["markCancelled", "persist"],
        },
      },
    },
    done: {
      meta: { dispatchType: "skip" as DispatchType },
      type: "final",
    },
    cancelled: {
      meta: { dispatchType: "skip" as DispatchType },
      type: "final",
    },
  },
});
